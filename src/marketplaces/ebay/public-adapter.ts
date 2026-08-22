/**
 * SellerSalt eBay Public Web Acquisition Adapter
 * 
 * DEPRECATED / UNUSED: Superseded by official eBay Buy Browse REST API in src/services/ebay-browse-api.ts.
 * Flagged for removal in subsequent cleanup.
 * 
 * Extracts structured commerce observations from eBay search and listing pages
 * (JSON-LD, OpenGraph, semantic search cards).
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

export const EBAY_PUBLIC_WEB_CAPABILITIES: PublicWebCapabilities = {
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
 * Extracts eBay search cards from search HTML.
 */
export function parseEbayListingCardsFromHtml(html: string): NormalizedProduct[] {
  if (!html || typeof html !== "string") return [];

  const products: NormalizedProduct[] = [];
  const cardRegex = /<li[^>]*class=["'][^"']*s-item[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi;
  const matches = Array.from(html.matchAll(cardRegex));

  for (const match of matches) {
    const cardHtml = match[1];

    // URL & External ID
    const urlMatch = cardHtml.match(/href=["'](https:\/\/(?:www\.)?ebay\.com\/itm\/([0-9]+)[^"']*)["']/i);
    if (!urlMatch) continue;
    const url = urlMatch[1];
    const externalId = urlMatch[2];

    // Title
    const titleMatch =
      cardHtml.match(/<div[^>]*class=["'][^"']*s-item__title[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) ||
      cardHtml.match(/<h3[^>]*class=["'][^"']*s-item__title[^"']*["'][^>]*>([\s\S]*?)<\/h3>/i);
    const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "";
    if (!rawTitle || rawTitle.toLowerCase().includes("shop on ebay")) continue;

    // Price
    const priceMatch = cardHtml.match(/class=["'][^"']*s-item__price[^"']*["'][^>]*>\$([0-9,.]+)<\/span>/i);
    let price: number | null = null;
    if (priceMatch) {
      price = parseFloat(priceMatch[1].replace(/,/g, ""));
      if (isNaN(price)) price = null;
    }

    // Image URL
    const imgMatch = cardHtml.match(/<img[^>]*src=["']([^"']+)["']/i);
    const imageUrl = imgMatch ? imgMatch[1] : undefined;

    // Seller
    const sellerMatch = cardHtml.match(/class=["'][^"']*s-item__seller-info-text[^"']*["'][^>]*>([^<]+)<\/span>/i);
    const sellerName = sellerMatch ? sellerMatch[1].trim() : undefined;

    const normalized: NormalizedProduct = {
      marketplace: "ebay",
      externalId,
      title: rawTitle,
      url,
      imageUrl,
      price,
      currency: "USD",
      rating: null,
      reviewCount: null,
      shop: sellerName ? { name: sellerName } : undefined,
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

export class EbayPublicWebAdapter implements PublicWebAcquisitionAdapter {
  readonly marketplace = "ebay" as const;
  readonly displayName = "eBay";
  readonly domain = "ebay.com";
  readonly capabilities = EBAY_PUBLIC_WEB_CAPABILITIES;

  private pageFetcher: PublicPageFetcher;

  constructor(pageFetcher: PublicPageFetcher = globalPageFetcher) {
    this.pageFetcher = pageFetcher;
  }

  async searchPublicProducts(
    query: PublicSearchQuery
  ): Promise<PublicAcquisitionResult<NormalizedProduct>> {
    const fetchedAt = new Date();
    const queryTerm = (query.query || "").trim();

    if (!queryTerm) {
      return {
        success: true,
        marketplace: "ebay",
        items: [],
        sourceType: "PUBLIC_WEB",
        provenance: "UNAVAILABLE",
        fetchedAt,
      };
    }

    const pageParam = query.page && query.page > 1 ? `&_pgn=${query.page}` : "";
    const searchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(queryTerm)}${pageParam}`;

    try {
      const page = await this.pageFetcher.fetchPage(searchUrl);

      if (page.statusCode !== 200 || !page.html) {
        return {
          success: false,
          marketplace: "ebay",
          items: [],
          sourceUrl: searchUrl,
          sourceType: "PUBLIC_WEB",
          provenance: "UNAVAILABLE",
          statusCode: page.statusCode,
          failureReason: page.statusCode === 429 ? "RATE_LIMITED" : "ACCESS_RESTRICTED",
          error: "eBay public search is unavailable.",
          fetchedAt,
        };
      }

      // 1. Try semantic search card parser
      const cardProducts = parseEbayListingCardsFromHtml(page.html);
      if (cardProducts.length > 0) {
        const limit = query.limit ?? 20;
        return {
          success: true,
          marketplace: "ebay",
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
        const externalId = extractListingIdFromUrl(page.url) || "ebay-1";
        const normalized: NormalizedProduct = {
          marketplace: "ebay",
          externalId,
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
        marketplace: "ebay",
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
        marketplace: "ebay",
        items: [],
        sourceUrl: searchUrl,
        sourceType: "PUBLIC_WEB",
        provenance: "UNAVAILABLE",
        error: err.message || "Failed to fetch eBay search results",
        failureReason: "NETWORK_ERROR",
        fetchedAt,
      };
    }
  }

  async fetchPublicProduct(
    externalIdOrUrl: string
  ): Promise<PublicAcquisitionResult<NormalizedProduct>> {
    const fetchedAt = new Date();
    const listingId = extractListingIdFromUrl(externalIdOrUrl) || externalIdOrUrl.trim();
    const productUrl = externalIdOrUrl.startsWith("http")
      ? externalIdOrUrl
      : `https://www.ebay.com/itm/${listingId}`;

    try {
      const page = await this.pageFetcher.fetchPage(productUrl);

      if (page.statusCode !== 200 || !page.html) {
        return {
          success: false,
          marketplace: "ebay",
          items: [],
          sourceUrl: productUrl,
          sourceType: "PUBLIC_WEB",
          provenance: "UNAVAILABLE",
          statusCode: page.statusCode,
          failureReason: "ACCESS_RESTRICTED",
          error: "eBay product page is unavailable.",
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
          marketplace: "ebay",
          items: [],
          sourceUrl: productUrl,
          sourceType: "PUBLIC_WEB",
          provenance: "UNAVAILABLE",
          failureReason: "NO_DATA",
          error: "No product metadata found on eBay page",
          fetchedAt,
        };
      }

      const imageUrl =
        (typeof parsedJsonLd?.image === "string" ? parsedJsonLd.image : undefined) ||
        openGraph.image;

      const normalized: NormalizedProduct = {
        marketplace: "ebay",
        externalId: listingId,
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
        marketplace: "ebay",
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
        marketplace: "ebay",
        items: [],
        sourceUrl: productUrl,
        sourceType: "PUBLIC_WEB",
        provenance: "UNAVAILABLE",
        error: err.message || "Failed to fetch eBay product page",
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
        marketplace: "ebay",
        items: [],
        sourceType: "PUBLIC_WEB",
        provenance: "UNAVAILABLE",
        error: searchRes.error || "No search listings observed on eBay to harvest keywords from",
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
      marketplace: "ebay",
      items: [
        {
          query: queryTerm,
          marketplace: "ebay",
          relatedKeywords,
          topTags: [],
          observedListingsCount: searchRes.items.length,
          averagePrice: null,
          demandProxyScore: 60,
          fetchedAt,
        },
      ],
      sourceType: "PUBLIC_WEB",
      provenance: "ACTUAL_DATA",
      fetchedAt,
    };
  }
}

export const ebayPublicWebAdapter = new EbayPublicWebAdapter();
