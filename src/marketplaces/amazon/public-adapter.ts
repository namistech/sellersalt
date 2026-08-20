/**
 * SellerSalt Amazon Public Web Acquisition Adapter
 * 
 * Extracts structured commerce observations from Amazon product and search pages
 * (JSON-LD, OpenGraph, microdata). In live execution without dedicated residential proxies,
 * gracefully reports UNAVAILABLE without fabricating fake data.
 */

import {
  globalPageFetcher,
  PublicPageFetcher,
  extractJsonLdBlocks,
  parseProductFromJsonLd,
  parseOpenGraphData,
  extractListingIdFromUrl,
} from "../core/acquisition";
import type {
  PublicWebAcquisitionAdapter,
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

export class AmazonPublicWebAdapter implements PublicWebAcquisitionAdapter {
  readonly marketplace = "amazon" as const;
  readonly displayName = "Amazon";
  readonly domain = "amazon.com";

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
    const page = await this.pageFetcher.fetchPage(searchUrl);

    if (page.statusCode !== 200 || !page.html) {
      return {
        success: false,
        marketplace: "amazon",
        items: [],
        sourceUrl: searchUrl,
        sourceType: "PUBLIC_WEB",
        provenance: "UNAVAILABLE",
        statusCode: page.statusCode,
        error: "Amazon public search is restricted without dedicated proxy infrastructure.",
        fetchedAt,
      };
    }

    // Extract JSON-LD or structured data if present
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
      fetchedAt,
    };
  }

  async fetchPublicProduct(
    externalIdOrUrl: string
  ): Promise<PublicAcquisitionResult<NormalizedProduct>> {
    const fetchedAt = new Date();
    let url: string;
    let externalId: string;

    if (externalIdOrUrl.startsWith("http://") || externalIdOrUrl.startsWith("https://")) {
      url = externalIdOrUrl;
      externalId = extractListingIdFromUrl(url) || "unknown-asin";
    } else {
      externalId = externalIdOrUrl;
      url = `https://www.amazon.com/dp/${externalId}`;
    }

    const page = await this.pageFetcher.fetchPage(url);

    if (page.statusCode !== 200 || !page.html) {
      return {
        success: false,
        marketplace: "amazon",
        items: [],
        sourceUrl: url,
        sourceType: "PUBLIC_WEB",
        provenance: "UNAVAILABLE",
        statusCode: page.statusCode,
        error: "Amazon public product page is unavailable.",
        fetchedAt,
      };
    }

    const jsonLdBlocks = extractJsonLdBlocks(page.html);
    const parsed = parseProductFromJsonLd(jsonLdBlocks);
    const og = parseOpenGraphData(page.html);

    if (!parsed && !og.title) {
      return {
        success: false,
        marketplace: "amazon",
        items: [],
        sourceUrl: url,
        sourceType: "PUBLIC_WEB",
        provenance: "UNAVAILABLE",
        error: "Failed to parse structured product data from Amazon page.",
        fetchedAt,
      };
    }

    const normalized: NormalizedProduct = {
      marketplace: "amazon",
      externalId,
      title: parsed?.name || og.title || "",
      url,
      imageUrl: (typeof parsed?.image === "string" ? parsed.image : undefined) || og.image,
      price: parsed?.price ?? og.priceAmount ?? null,
      currency: parsed?.currency || og.priceCurrency || "USD",
      rating: parsed?.ratingValue ?? null,
      reviewCount: parsed?.reviewCount ?? null,
      source: "ACTUAL_DATA",
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
      sourceUrl: url,
      sourceType: "PUBLIC_WEB",
      provenance: "ACTUAL_DATA",
      statusCode: page.statusCode,
      fetchedAt,
    };
  }

  async fetchPublicShop(
    shopExternalIdOrUrl: string
  ): Promise<PublicAcquisitionResult<MarketplaceShopStats>> {
    return {
      success: false,
      marketplace: "amazon",
      items: [],
      sourceUrl: shopExternalIdOrUrl,
      sourceType: "PUBLIC_WEB",
      provenance: "UNAVAILABLE",
      error: "Amazon seller lookup is not activated yet.",
      fetchedAt: new Date(),
    };
  }
}

export const amazonPublicWebAdapter = new AmazonPublicWebAdapter();
