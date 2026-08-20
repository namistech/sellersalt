/**
 * SellerSalt Walmart Public Web Acquisition Adapter
 * 
 * Extracts structured commerce observations from Walmart search and item pages
 * (JSON-LD, OpenGraph, structured product schemas).
 */

import {
  globalPageFetcher,
  PublicPageFetcher,
  extractJsonLdBlocks,
  parseProductFromJsonLd,
  parseCategoryBreadcrumbsFromJsonLd,
  parseOpenGraphData,
  extractListingIdFromUrl,
} from "../core/acquisition";
import type {
  PublicWebAcquisitionAdapter,
  PublicWebCapabilities,
  PublicSearchQuery,
  PublicAcquisitionResult,
} from "../core/acquisition/contracts";
import {
  evaluateCanonicalOpportunity,
  extractOpportunityInputFromNormalizedProduct,
} from "@/services/intelligence/canonical-opportunity";
import type {
  NormalizedProduct,
  SignalProvenance,
} from "../core/types";

export const WALMART_PUBLIC_WEB_CAPABILITIES: PublicWebCapabilities = {
  productSearch: true,
  productDetail: true,
  shopResearch: false,
  keywordDiscovery: false,
  categoryDiscovery: false,
  reviews: true,
  ratings: true,
  pricing: true,
  images: true,
  taxonomy: true,
  engagement: false,
  salesEstimation: false,
};

/**
 * Extracts Walmart search cards from search HTML.
 */
export function parseWalmartListingCardsFromHtml(html: string): NormalizedProduct[] {
  if (!html || typeof html !== "string") return [];

  const products: NormalizedProduct[] = [];
  const cardRegex = /<div[^>]*data-item-id=["']([0-9]+)["'][^>]*>([\s\S]*?)<\/div>/gi;
  const matches = Array.from(html.matchAll(cardRegex));

  for (const match of matches) {
    const itemId = match[1];
    const cardChunk = match[2];

    // Title
    const titleMatch = cardChunk.match(/<span[^>]*class=["'][^"']*w_iUH7[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
    const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "";
    if (!rawTitle) continue;

    // Price
    const priceMatch = cardChunk.match(/class=["'][^"']*w_iUH7[^"']*["'][^>]*>\$([0-9,.]+)<\/span>/i) || cardChunk.match(/\$([0-9]+\.[0-9]{2})/);
    let price: number | null = null;
    if (priceMatch) {
      price = parseFloat(priceMatch[1].replace(/,/g, ""));
      if (isNaN(price)) price = null;
    }

    // Rating
    const ratingMatch = cardChunk.match(/([0-9.]+) out of 5 Stars/i);
    let rating: number | null = null;
    if (ratingMatch) {
      rating = parseFloat(ratingMatch[1]);
      if (isNaN(rating)) rating = null;
    }

    // Review Count
    const reviewMatch = cardChunk.match(/\(([0-9,]+)\s*(?:reviews|ratings)\)/i);
    let reviewCount: number | null = null;
    if (reviewMatch) {
      reviewCount = parseInt(reviewMatch[1].replace(/,/g, ""), 10);
      if (isNaN(reviewCount)) reviewCount = null;
    }

    // Image URL
    const imgMatch = cardChunk.match(/<img[^>]*src=["']([^"']+)["']/i);
    const imageUrl = imgMatch ? imgMatch[1] : undefined;

    const productUrl = `https://www.walmart.com/ip/${itemId}`;

    const normalized: NormalizedProduct = {
      marketplace: "walmart",
      externalId: itemId,
      title: rawTitle,
      url: productUrl,
      imageUrl,
      price,
      currency: "USD",
      rating,
      reviewCount,
      source: "ACTUAL_DATA" as SignalProvenance,
      acquisitionMethod: "PUBLIC_WEB",
      isHistorical: false,
      capturedAt: new Date(),
    };

    const oppInput = extractOpportunityInputFromNormalizedProduct(normalized);
    const report = evaluateCanonicalOpportunity(oppInput);
    if (report.overallScore !== null) {
      normalized.opportunityScore = {
        score: report.overallScore,
        confidence: report.confidenceScore,
        tier: report.tier,
        verdict: report.verdictLabel,
        verdictVariant: report.verdictVariant,
        availableSignals: report.signals.available.map((s) => s.id),
        unavailableSignals: report.signals.unavailable.map((s) => s.id),
      };
    }

    products.push(normalized);
  }

  return products;
}

export class WalmartPublicWebAdapter implements PublicWebAcquisitionAdapter {
  readonly marketplace = "walmart" as const;
  readonly displayName = "Walmart";
  readonly domain = "walmart.com";
  readonly capabilities = WALMART_PUBLIC_WEB_CAPABILITIES;

  private pageFetcher: PublicPageFetcher;

  constructor(pageFetcher: PublicPageFetcher = globalPageFetcher) {
    this.pageFetcher = pageFetcher;
  }

  async searchPublicProducts(
    query: PublicSearchQuery
  ): Promise<PublicAcquisitionResult<NormalizedProduct>> {
    const fetchedAt = new Date();
    const queryTerm = query.query.trim();

    if (!queryTerm) {
      return {
        success: true,
        marketplace: "walmart",
        items: [],
        sourceType: "PUBLIC_WEB",
        provenance: "UNAVAILABLE",
        fetchedAt,
      };
    }

    const searchUrl = `https://www.walmart.com/search?q=${encodeURIComponent(queryTerm)}`;

    try {
      const page = await this.pageFetcher.fetchPage(searchUrl);

      if (
        page.statusCode !== 200 ||
        !page.html ||
        page.html.includes("Robot or human?") ||
        page.html.includes("Verify your identity")
      ) {
        return {
          success: false,
          marketplace: "walmart",
          items: [],
          sourceUrl: searchUrl,
          sourceType: "PUBLIC_WEB",
          provenance: "UNAVAILABLE",
          statusCode: page.statusCode,
          failureReason: "ACCESS_RESTRICTED",
          error: "Walmart public search is restricted without dedicated proxy infrastructure.",
          fetchedAt,
        };
      }

      // 1. Try card parser
      const cardProducts = parseWalmartListingCardsFromHtml(page.html);
      if (cardProducts.length > 0) {
        const limit = query.limit ?? 20;
        return {
          success: true,
          marketplace: "walmart",
          items: cardProducts.slice(0, limit),
          sourceUrl: searchUrl,
          sourceType: "PUBLIC_WEB",
          provenance: "ACTUAL_DATA",
          statusCode: 200,
          fetchedAt,
        };
      }

      // 2. Try JSON-LD structured data
      const jsonLdBlocks = extractJsonLdBlocks(page.html);
      const parsed = parseProductFromJsonLd(jsonLdBlocks);
      const items: NormalizedProduct[] = [];

      if (parsed && parsed.name) {
        const itemId = extractListingIdFromUrl(page.url) || "walmart-1";
        const normalized: NormalizedProduct = {
          marketplace: "walmart",
          externalId: itemId,
          title: parsed.name,
          url: page.url,
          imageUrl: typeof parsed.image === "string" ? parsed.image : undefined,
          price: parsed.price ?? null,
          currency: parsed.currency || "USD",
          rating: parsed.ratingValue ?? null,
          reviewCount: parsed.reviewCount ?? null,
          source: "ACTUAL_DATA" as SignalProvenance,
          acquisitionMethod: "PUBLIC_WEB",
          isHistorical: false,
          capturedAt: fetchedAt,
        };

        const oppInput = extractOpportunityInputFromNormalizedProduct(normalized);
        const report = evaluateCanonicalOpportunity(oppInput);
        if (report.overallScore !== null) {
          normalized.opportunityScore = {
            score: report.overallScore,
            confidence: report.confidenceScore,
            tier: report.tier,
            verdict: report.verdictLabel,
            verdictVariant: report.verdictVariant,
            availableSignals: report.signals.available.map((s) => s.id),
            unavailableSignals: report.signals.unavailable.map((s) => s.id),
          };
        }

        items.push(normalized);
      }

      return {
        success: items.length > 0,
        marketplace: "walmart",
        items,
        sourceUrl: searchUrl,
        sourceType: "PUBLIC_WEB",
        provenance: items.length > 0 ? "ACTUAL_DATA" : "UNAVAILABLE",
        statusCode: page.statusCode,
        failureReason: items.length === 0 ? "NO_DATA" : undefined,
        fetchedAt,
      };
    } catch (err: any) {
      return {
        success: false,
        marketplace: "walmart",
        items: [],
        sourceUrl: searchUrl,
        sourceType: "PUBLIC_WEB",
        provenance: "UNAVAILABLE",
        error: err.message || "Failed to fetch Walmart search results",
        failureReason: "NETWORK_ERROR",
        fetchedAt,
      };
    }
  }

  async fetchPublicProduct(
    externalIdOrUrl: string
  ): Promise<PublicAcquisitionResult<NormalizedProduct>> {
    const fetchedAt = new Date();
    const itemId = extractListingIdFromUrl(externalIdOrUrl) || externalIdOrUrl.trim();
    const productUrl = externalIdOrUrl.startsWith("http")
      ? externalIdOrUrl
      : `https://www.walmart.com/ip/${itemId}`;

    try {
      const page = await this.pageFetcher.fetchPage(productUrl);

      if (
        page.statusCode !== 200 ||
        !page.html ||
        page.html.includes("Robot or human?") ||
        page.html.includes("Verify your identity")
      ) {
        return {
          success: false,
          marketplace: "walmart",
          items: [],
          sourceUrl: productUrl,
          sourceType: "PUBLIC_WEB",
          provenance: "UNAVAILABLE",
          statusCode: page.statusCode,
          failureReason: "ACCESS_RESTRICTED",
          error: "Walmart product page is restricted without dedicated proxy infrastructure.",
          fetchedAt,
        };
      }

      const jsonLdBlocks = extractJsonLdBlocks(page.html);
      const parsedJsonLd = parseProductFromJsonLd(jsonLdBlocks);
      const categoryPath = parseCategoryBreadcrumbsFromJsonLd(jsonLdBlocks);
      const openGraph = parseOpenGraphData(page.html);

      const title = parsedJsonLd?.name || openGraph.title || "";
      if (!title) {
        return {
          success: false,
          marketplace: "walmart",
          items: [],
          sourceUrl: productUrl,
          sourceType: "PUBLIC_WEB",
          provenance: "UNAVAILABLE",
          failureReason: "NO_DATA",
          error: "No product metadata found on Walmart page",
          fetchedAt,
        };
      }

      const imageUrl =
        (typeof parsedJsonLd?.image === "string" ? parsedJsonLd.image : undefined) ||
        openGraph.image;

      const normalized: NormalizedProduct = {
        marketplace: "walmart",
        externalId: itemId,
        title,
        url: productUrl,
        imageUrl,
        price: parsedJsonLd?.price ?? openGraph.priceAmount ?? null,
        currency: parsedJsonLd?.currency ?? openGraph.priceCurrency ?? "USD",
        rating: parsedJsonLd?.ratingValue ?? null,
        reviewCount: parsedJsonLd?.reviewCount ?? null,
        categoryPath: categoryPath.length > 0 ? categoryPath : undefined,
        shop: parsedJsonLd?.sellerName ? { name: parsedJsonLd.sellerName } : undefined,
        source: "ACTUAL_DATA" as SignalProvenance,
        acquisitionMethod: "PUBLIC_WEB",
        isHistorical: false,
        capturedAt: fetchedAt,
      };

      const oppInput = extractOpportunityInputFromNormalizedProduct(normalized);
      const report = evaluateCanonicalOpportunity(oppInput);
      if (report.overallScore !== null) {
        normalized.opportunityScore = {
          score: report.overallScore,
          confidence: report.confidenceScore,
          tier: report.tier,
          verdict: report.verdictLabel,
          verdictVariant: report.verdictVariant,
          availableSignals: report.signals.available.map((s) => s.id),
          unavailableSignals: report.signals.unavailable.map((s) => s.id),
        };
      }

      return {
        success: true,
        marketplace: "walmart",
        items: [normalized],
        sourceUrl: productUrl,
        sourceType: "PUBLIC_WEB",
        provenance: "ACTUAL_DATA",
        statusCode: 200,
        fetchedAt,
      };
    } catch (err: any) {
      return {
        success: false,
        marketplace: "walmart",
        items: [],
        sourceUrl: productUrl,
        sourceType: "PUBLIC_WEB",
        provenance: "UNAVAILABLE",
        error: err.message || "Failed to fetch Walmart product page",
        failureReason: "NETWORK_ERROR",
        fetchedAt,
      };
    }
  }
}

export const walmartPublicWebAdapter = new WalmartPublicWebAdapter();
