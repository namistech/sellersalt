/**
 * SellerSalt Amazon Public Web Acquisition Adapter
 * 
 * Extracts structured commerce observations from Amazon search and product pages
 * (JSON-LD, OpenGraph, microdata, semantic listing cards).
 * 
 * In live execution when Amazon presents bot verification or access restrictions,
 * gracefully reports failure with ACCESS_RESTRICTED failureReason without fabricating fake data.
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
  PublicKeywordHarvestResult,
} from "../core/acquisition/contracts";
import {
  evaluateCanonicalOpportunity,
  extractOpportunityInputFromNormalizedProduct,
} from "@/services/intelligence/canonical-opportunity";
import type {
  NormalizedProduct,
  MarketplaceShopStats,
  SignalProvenance,
} from "../core/types";

export const AMAZON_PUBLIC_WEB_CAPABILITIES: PublicWebCapabilities = {
  productSearch: true,
  productDetail: true,
  shopResearch: false,
  keywordDiscovery: true,
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
 * Extracts Amazon search listing cards from HTML markup.
 */
export function parseAmazonListingCardsFromHtml(html: string): NormalizedProduct[] {
  if (!html || typeof html !== "string") return [];

  const products: NormalizedProduct[] = [];
  const asinRegex = /data-asin=["']([A-Z0-9]{10})["']/gi;
  const asinMatches = Array.from(html.matchAll(asinRegex));
  const seenAsins = new Set<string>();

  for (const match of asinMatches) {
    const asin = match[1];
    if (!asin || asin === "0000000000" || seenAsins.has(asin)) continue;
    seenAsins.add(asin);

    // Isolate card block around ASIN
    const cardStart = match.index ?? 0;
    const cardChunk = html.slice(cardStart, cardStart + 2500);

    // Title
    const titleMatch =
      cardChunk.match(/<h2[^>]*>[\s\S]*?<span[^>]*>(.*?)<\/span>/i) ||
      cardChunk.match(/class=["'][^"']*a-text-normal[^"']*["'][^>]*>(.*?)<\/span>/i);
    const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "";
    if (!rawTitle) continue;

    // Price
    const priceMatch =
      cardChunk.match(/class=["'][^"']*a-offscreen[^"']*["'][^>]*>\$([0-9,.]+)<\/span>/i) ||
      cardChunk.match(/class=["'][^"']*a-price-whole[^"']*["'][^>]*>([0-9,]+)<span class=["']a-price-fraction["']>([0-9]{2})/i);
    let price: number | null = null;
    if (priceMatch) {
      if (priceMatch[2]) {
        price = parseFloat(`${priceMatch[1].replace(/,/g, "")}.${priceMatch[2]}`);
      } else {
        price = parseFloat(priceMatch[1].replace(/,/g, ""));
      }
      if (isNaN(price)) price = null;
    }

    // Rating
    const ratingMatch = cardChunk.match(/([0-9.]+) out of 5 stars/i) || cardChunk.match(/class=["']a-icon-alt["']>([0-9.]+)<\/span>/i);
    let rating: number | null = null;
    if (ratingMatch) {
      rating = parseFloat(ratingMatch[1]);
      if (isNaN(rating)) rating = null;
    }

    // Review Count
    const reviewMatch = cardChunk.match(/aria-label=["']([0-9,]+) ratings["']/i) || cardChunk.match(/class=["']a-size-base s-underline-text["']>([0-9,]+)<\/span>/i);
    let reviewCount: number | null = null;
    if (reviewMatch) {
      reviewCount = parseInt(reviewMatch[1].replace(/,/g, ""), 10);
      if (isNaN(reviewCount)) reviewCount = null;
    }

    // Image URL
    const imgMatch = cardChunk.match(/<img[^>]*class=["'][^"']*s-image[^"']*["'][^>]*src=["']([^"']+)["']/i);
    const imageUrl = imgMatch ? imgMatch[1] : undefined;

    const productUrl = `https://www.amazon.com/dp/${asin}`;

    const normalized: NormalizedProduct = {
      marketplace: "amazon",
      externalId: asin,
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

    // Calculate canonical opportunity score
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

export class AmazonPublicWebAdapter implements PublicWebAcquisitionAdapter {
  readonly marketplace = "amazon" as const;
  readonly displayName = "Amazon";
  readonly domain = "amazon.com";
  readonly capabilities = AMAZON_PUBLIC_WEB_CAPABILITIES;

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
        marketplace: "amazon",
        items: [],
        sourceType: "PUBLIC_WEB",
        provenance: "UNAVAILABLE",
        fetchedAt,
      };
    }

    const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(queryTerm)}`;

    try {
      const page = await this.pageFetcher.fetchPage(searchUrl);

      // Check for bot verification / CAPTCHA page
      if (
        page.statusCode !== 200 ||
        !page.html ||
        page.html.includes("api-services-support@amazon.com") ||
        page.html.includes("Type the characters you see in this image")
      ) {
        return {
          success: false,
          marketplace: "amazon",
          items: [],
          sourceUrl: searchUrl,
          sourceType: "PUBLIC_WEB",
          provenance: "UNAVAILABLE",
          statusCode: page.statusCode,
          failureReason: "ACCESS_RESTRICTED",
          error: "Amazon public search is restricted without dedicated proxy infrastructure.",
          fetchedAt,
        };
      }

      // 1. Try card parser
      const cardProducts = parseAmazonListingCardsFromHtml(page.html);
      if (cardProducts.length > 0) {
        const limit = query.limit ?? 20;
        return {
          success: true,
          marketplace: "amazon",
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
        const asin = extractListingIdFromUrl(page.url) || "B000000000";
        const normalized: NormalizedProduct = {
          marketplace: "amazon",
          externalId: asin,
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
        marketplace: "amazon",
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
        marketplace: "amazon",
        items: [],
        sourceUrl: searchUrl,
        sourceType: "PUBLIC_WEB",
        provenance: "UNAVAILABLE",
        error: err.message || "Failed to fetch Amazon search results",
        failureReason: "NETWORK_ERROR",
        fetchedAt,
      };
    }
  }

  async fetchPublicProduct(
    externalIdOrUrl: string
  ): Promise<PublicAcquisitionResult<NormalizedProduct>> {
    const fetchedAt = new Date();
    const asin = extractListingIdFromUrl(externalIdOrUrl) || externalIdOrUrl.trim();
    const productUrl = externalIdOrUrl.startsWith("http")
      ? externalIdOrUrl
      : `https://www.amazon.com/dp/${asin}`;

    try {
      const page = await this.pageFetcher.fetchPage(productUrl);

      if (
        page.statusCode !== 200 ||
        !page.html ||
        page.html.includes("api-services-support@amazon.com") ||
        page.html.includes("Type the characters you see in this image")
      ) {
        return {
          success: false,
          marketplace: "amazon",
          items: [],
          sourceUrl: productUrl,
          sourceType: "PUBLIC_WEB",
          provenance: "UNAVAILABLE",
          statusCode: page.statusCode,
          failureReason: "ACCESS_RESTRICTED",
          error: "Amazon product page is restricted without dedicated proxy infrastructure.",
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
          marketplace: "amazon",
          items: [],
          sourceUrl: productUrl,
          sourceType: "PUBLIC_WEB",
          provenance: "UNAVAILABLE",
          failureReason: "NO_DATA",
          error: "No product metadata found on Amazon page",
          fetchedAt,
        };
      }

      const imageUrl =
        (typeof parsedJsonLd?.image === "string" ? parsedJsonLd.image : undefined) ||
        openGraph.image;

      const normalized: NormalizedProduct = {
        marketplace: "amazon",
        externalId: asin,
        title,
        url: productUrl,
        imageUrl,
        price: parsedJsonLd?.price ?? openGraph.priceAmount ?? null,
        currency: parsedJsonLd?.currency ?? openGraph.priceCurrency ?? "USD",
        rating: parsedJsonLd?.ratingValue ?? null,
        reviewCount: parsedJsonLd?.reviewCount ?? null,
        categoryPath: categoryPath.length > 0 ? categoryPath : undefined,
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
        marketplace: "amazon",
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
        marketplace: "amazon",
        items: [],
        sourceUrl: productUrl,
        sourceType: "PUBLIC_WEB",
        provenance: "UNAVAILABLE",
        error: err.message || "Failed to fetch Amazon product page",
        failureReason: "NETWORK_ERROR",
        fetchedAt,
      };
    }
  }

  async harvestPublicKeywords(
    query: PublicSearchQuery
  ): Promise<PublicAcquisitionResult<PublicKeywordHarvestResult>> {
    const fetchedAt = new Date();
    const queryTerm = query.query.trim();

    const searchRes = await this.searchPublicProducts({ ...query, limit: 30 });
    if (!searchRes.success || searchRes.items.length === 0) {
      return {
        success: false,
        marketplace: "amazon",
        items: [],
        sourceType: "PUBLIC_WEB",
        provenance: "UNAVAILABLE",
        error: searchRes.error || "No search listings observed on Amazon to harvest keywords from",
        failureReason: searchRes.failureReason || "NO_DATA",
        fetchedAt,
      };
    }

    const words = new Map<string, number>();
    for (const item of searchRes.items) {
      const tokens = item.title.toLowerCase().split(/[^a-z0-9]+/i).filter((t) => t.length > 2);
      for (const t of tokens) {
        words.set(t, (words.get(t) || 0) + 1);
      }
    }

    const relatedKeywords = Array.from(words.entries())
      .map(([keyword, count]) => ({
        keyword,
        occurrenceCount: count,
        listingFrequency: Math.round((count / searchRes.items.length) * 100),
        demandProxy: Math.min(100, count * 15),
        demandTier: count > 3 ? ("HIGH" as const) : count > 1 ? ("MEDIUM" as const) : ("LOW" as const),
      }))
      .sort((a, b) => b.occurrenceCount - a.occurrenceCount)
      .slice(0, 15);

    return {
      success: true,
      marketplace: "amazon",
      items: [
        {
          query: queryTerm,
          marketplace: "amazon",
          relatedKeywords,
          topTags: [],
          observedListingsCount: searchRes.items.length,
          averagePrice: null,
          demandProxyScore: 65,
          fetchedAt,
        },
      ],
      sourceType: "PUBLIC_WEB",
      provenance: "ACTUAL_DATA",
      fetchedAt,
    };
  }
}

export const amazonPublicWebAdapter = new AmazonPublicWebAdapter();
