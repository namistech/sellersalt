/**
 * SellerSalt Etsy Public Web Acquisition Adapter
 * 
 * Acquires legitimate public commerce observations from public Etsy pages,
 * JSON-LD structured metadata, and OpenGraph schemas without requiring official API keys.
 */

import {
  globalPageFetcher,
  PublicPageFetcher,
  extractJsonLdBlocks,
  parseProductFromJsonLd,
  parseCategoryBreadcrumbsFromJsonLd,
  parseOpenGraphData,
  parseEtsyListingCardsFromHtml,
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
  MarketplaceShopStats,
  SignalProvenance,
} from "../core/types";

export const ETSY_PUBLIC_WEB_CAPABILITIES: PublicWebCapabilities = {
  productSearch: true,
  productDetail: true,
  shopResearch: true,
  keywordDiscovery: true,
  categoryDiscovery: true,
  reviews: true,
  ratings: true,
  pricing: true,
  images: true,
  taxonomy: true,
  engagement: true,
  salesEstimation: true,
};

export class EtsyPublicWebAdapter implements PublicWebAcquisitionAdapter {
  readonly marketplace = "etsy" as const;
  readonly displayName = "Etsy";
  readonly domain = "etsy.com";
  readonly capabilities = ETSY_PUBLIC_WEB_CAPABILITIES;

  private pageFetcher: PublicPageFetcher;

  constructor(pageFetcher: PublicPageFetcher = globalPageFetcher) {
    this.pageFetcher = pageFetcher;
  }

  /**
   * Searches public Etsy listings via search results page HTML and JSON-LD.
   */
  async searchPublicProducts(
    query: PublicSearchQuery
  ): Promise<PublicAcquisitionResult<NormalizedProduct>> {
    const fetchedAt = new Date();
    const queryTerm = query.query.trim();

    if (!queryTerm) {
      return {
        success: true,
        marketplace: "etsy",
        items: [],
        sourceType: "PUBLIC_WEB",
        provenance: "ACTUAL_DATA",
        fetchedAt,
      };
    }

    const searchUrl = `https://www.etsy.com/search?q=${encodeURIComponent(queryTerm)}`;
    const page = await this.pageFetcher.fetchPage(searchUrl);

    if (page.statusCode !== 200 || !page.html) {
      return {
        success: false,
        marketplace: "etsy",
        items: [],
        sourceUrl: searchUrl,
        sourceType: "PUBLIC_WEB",
        provenance: "ACTUAL_DATA",
        statusCode: page.statusCode,
        error: page.statusCode === 429 ? "Etsy rate limit reached" : `HTTP error ${page.statusCode}`,
        fetchedAt,
      };
    }

    const cards = parseEtsyListingCardsFromHtml(page.html);
    const limit = query.limit ?? 25;
    const selectedCards = cards.slice(0, limit);

    const products: NormalizedProduct[] = selectedCards.map((c) => {
      const normalized: NormalizedProduct = {
        marketplace: "etsy",
        externalId: c.externalId,
        title: c.title,
        url: c.url,
        imageUrl: c.imageUrl,
        price: c.price !== undefined ? c.price : null,
        currency: c.currency || "USD",
        source: "ACTUAL_DATA" as SignalProvenance,
        acquisitionMethod: "PUBLIC_WEB",
        isHistorical: false,
        capturedAt: fetchedAt,
        shop: c.shopName
          ? {
              name: c.shopName,
              url: `https://www.etsy.com/shop/${c.shopName}`,
            }
          : undefined,
        rating: c.rating ?? null,
        reviewCount: c.reviewCount ?? null,
        favoritesCount: c.favoritesCount ?? null,
      };

      // Score canonical opportunity
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

      return normalized;
    });

    return {
      success: true,
      marketplace: "etsy",
      items: products,
      sourceUrl: searchUrl,
      sourceType: "PUBLIC_WEB",
      provenance: "ACTUAL_DATA",
      statusCode: page.statusCode,
      fetchedAt,
    };
  }

  /**
   * Fetches a specific public Etsy listing page and extracts JSON-LD Product metadata.
   */
  async fetchPublicProduct(
    externalIdOrUrl: string
  ): Promise<PublicAcquisitionResult<NormalizedProduct>> {
    const fetchedAt = new Date();
    let url: string;
    let externalId: string;

    if (externalIdOrUrl.startsWith("http://") || externalIdOrUrl.startsWith("https://")) {
      url = externalIdOrUrl;
      const extractedId = extractListingIdFromUrl(url);
      externalId = extractedId || "unknown";
    } else {
      externalId = externalIdOrUrl;
      url = `https://www.etsy.com/listing/${externalId}`;
    }

    const page = await this.pageFetcher.fetchPage(url);

    if (page.statusCode !== 200 || !page.html) {
      return {
        success: false,
        marketplace: "etsy",
        items: [],
        sourceUrl: url,
        sourceType: "PUBLIC_WEB",
        provenance: "ACTUAL_DATA",
        statusCode: page.statusCode,
        error: page.statusCode === 429 ? "Etsy rate limit reached" : `HTTP error ${page.statusCode}`,
        fetchedAt,
      };
    }

    const jsonLdBlocks = extractJsonLdBlocks(page.html);
    const parsedProduct = parseProductFromJsonLd(jsonLdBlocks);
    const breadcrumbs = parseCategoryBreadcrumbsFromJsonLd(jsonLdBlocks);
    const og = parseOpenGraphData(page.html);

    const title = parsedProduct?.name || og.title || "";
    const price = parsedProduct?.price ?? og.priceAmount ?? null;
    const currency = parsedProduct?.currency || og.priceCurrency || "USD";
    const imageUrl =
      (typeof parsedProduct?.image === "string" ? parsedProduct.image : undefined) ||
      og.image ||
      undefined;

    const normalized: NormalizedProduct = {
      marketplace: "etsy",
      externalId,
      title,
      url,
      imageUrl,
      price,
      currency,
      categoryPath: breadcrumbs.length > 0 ? breadcrumbs : undefined,
      rating: parsedProduct?.ratingValue ?? null,
      reviewCount: parsedProduct?.reviewCount ?? null,
      source: "ACTUAL_DATA",
      acquisitionMethod: "PUBLIC_WEB",
      isHistorical: false,
      capturedAt: fetchedAt,
      shop: parsedProduct?.sellerName
        ? {
            name: parsedProduct.sellerName,
            url: parsedProduct.sellerUrl,
          }
        : undefined,
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
      marketplace: "etsy",
      items: [normalized],
      sourceUrl: url,
      sourceType: "PUBLIC_WEB",
      provenance: "ACTUAL_DATA",
      statusCode: page.statusCode,
      fetchedAt,
    };
  }

  /**
   * Fetches public shop profile stats from public Etsy storefront.
   */
  async fetchPublicShop(
    shopExternalIdOrUrl: string
  ): Promise<PublicAcquisitionResult<MarketplaceShopStats>> {
    const fetchedAt = new Date();
    let shopName: string;
    let shopUrl: string;

    if (shopExternalIdOrUrl.startsWith("http://") || shopExternalIdOrUrl.startsWith("https://")) {
      shopUrl = shopExternalIdOrUrl;
      const match = shopUrl.match(/\/shop\/([A-Za-z0-9_-]+)/i);
      shopName = match?.[1] || "unknown";
    } else {
      shopName = shopExternalIdOrUrl;
      shopUrl = `https://www.etsy.com/shop/${shopName}`;
    }

    const page = await this.pageFetcher.fetchPage(shopUrl);

    if (page.statusCode !== 200 || !page.html) {
      return {
        success: false,
        marketplace: "etsy",
        items: [],
        sourceUrl: shopUrl,
        sourceType: "PUBLIC_WEB",
        provenance: "ACTUAL_DATA",
        statusCode: page.statusCode,
        error: `HTTP error ${page.statusCode}`,
        fetchedAt,
      };
    }

    const stats: MarketplaceShopStats = {
      marketplace: "etsy",
      externalId: shopName,
      name: shopName,
      url: shopUrl,
      activeListings: 0,
      reviewCount: 0,
      totalSales: 0,
      ageMonths: 12,
    };

    // Extract total sales if publicly visible (e.g. "1,234 Sales")
    const salesMatch = page.html.match(/([0-9,]+)\s+Sales/i);
    if (salesMatch?.[1]) {
      const parsedSales = parseInt(salesMatch[1].replace(/,/g, ""), 10);
      if (!isNaN(parsedSales)) stats.totalSales = parsedSales;
    }

    // Extract review count (e.g. "(385) reviews" or "385 reviews")
    const reviewMatch = page.html.match(/\(?([0-9,]+)\)?\s*(?:<\/span>)?\s*reviews/i);
    if (reviewMatch?.[1]) {
      const parsedReviews = parseInt(reviewMatch[1].replace(/,/g, ""), 10);
      if (!isNaN(parsedReviews)) stats.reviewCount = parsedReviews;
    }

    // Extract active items count (e.g. "89 Items")
    const itemsMatch = page.html.match(/([0-9,]+)\s+Items/i);
    if (itemsMatch?.[1]) {
      const parsedItems = parseInt(itemsMatch[1].replace(/,/g, ""), 10);
      if (!isNaN(parsedItems)) stats.activeListings = parsedItems;
    }

    return {
      success: true,
      marketplace: "etsy",
      items: [stats],
      sourceUrl: shopUrl,
      sourceType: "PUBLIC_WEB",
      provenance: "ACTUAL_DATA",
      statusCode: page.statusCode,
      fetchedAt,
    };
  }

  /**
   * Harvests keyword signals, co-occurring phrases, and tags from public Etsy search results.
   */
  async harvestPublicKeywords(
    query: PublicSearchQuery
  ): Promise<PublicAcquisitionResult<import("../core/acquisition/contracts").PublicKeywordHarvestResult>> {
    const fetchedAt = new Date();
    const queryTerm = query.query.trim();

    if (!queryTerm) {
      return {
        success: true,
        marketplace: "etsy",
        items: [
          {
            query: "",
            marketplace: "etsy",
            relatedKeywords: [],
            topTags: [],
            observedListingsCount: 0,
            averagePrice: null,
            demandProxyScore: 0,
            fetchedAt,
          },
        ],
        sourceType: "PUBLIC_WEB",
        provenance: "ACTUAL_DATA",
        fetchedAt,
      };
    }

    const searchUrl = `https://www.etsy.com/search?q=${encodeURIComponent(queryTerm)}`;
    const page = await this.pageFetcher.fetchPage(searchUrl);

    if (page.statusCode !== 200 || !page.html) {
      return {
        success: false,
        marketplace: "etsy",
        items: [],
        sourceUrl: searchUrl,
        sourceType: "PUBLIC_WEB",
        provenance: "ACTUAL_DATA",
        statusCode: page.statusCode,
        error: `HTTP error ${page.statusCode}`,
        fetchedAt,
      };
    }

    const cards = parseEtsyListingCardsFromHtml(page.html);
    const stopWords = new Set(["and", "the", "for", "with", "in", "of", "a", "an", "to", "by", "is", "on", "at", "or"]);
    const wordCounts = new Map<string, number>();
    const tagCounts = new Map<string, number>();

    let totalPrice = 0;
    let priceCount = 0;

    for (const card of cards) {
      if (card.price !== undefined && card.price > 0) {
        totalPrice += card.price;
        priceCount++;
      }

      // Tokenize title
      const words = card.title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stopWords.has(w));

      // 1-grams
      for (const w of words) {
        wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
      }

      // 2-grams
      for (let i = 0; i < words.length - 1; i++) {
        const bigram = `${words[i]} ${words[i + 1]}`;
        wordCounts.set(bigram, (wordCounts.get(bigram) || 0) + 1);
      }
    }

    const totalObserved = cards.length || 1;
    const relatedKeywords = Array.from(wordCounts.entries())
      .filter(([kw, count]) => kw !== queryTerm.toLowerCase() && count >= 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([keyword, count]) => {
        const listingFrequency = Math.round((count / totalObserved) * 100);
        return {
          keyword,
          occurrenceCount: count,
          listingFrequency,
          demandProxy: Math.min(100, Math.round((count / totalObserved) * 100 * 1.5)),
          demandTier: (count > 3 ? "HIGH" : count > 1 ? "MEDIUM" : "LOW") as "HIGH" | "MEDIUM" | "LOW",
        };
      });

    const harvestResult: import("../core/acquisition/contracts").PublicKeywordHarvestResult = {
      query: queryTerm,
      marketplace: "etsy",
      relatedKeywords,
      topTags: Array.from(tagCounts.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count),
      observedListingsCount: cards.length,
      averagePrice: priceCount > 0 ? parseFloat((totalPrice / priceCount).toFixed(2)) : null,
      demandProxyScore: Math.min(100, Math.round(cards.length * 4)),
      fetchedAt,
    };

    return {
      success: true,
      marketplace: "etsy",
      items: [harvestResult],
      sourceUrl: searchUrl,
      sourceType: "PUBLIC_WEB",
      provenance: "ACTUAL_DATA",
      statusCode: page.statusCode,
      fetchedAt,
    };
  }
}

export const etsyPublicWebAdapter = new EtsyPublicWebAdapter();

