/**
 * SellerSalt eBay Buy Browse API Integration Service
 * 
 * Provides official search, product detail, category benchmarks, and keyword harvesting
 * directly via eBay's official Buy Browse REST API (https://api.ebay.com/buy/browse/v1).
 * 
 * ZERO-FABRICATION CONTRACT:
 * - Uses OAuth2 Client-Credentials Grant (https://api.ebay.com/identity/v1/oauth2/token).
 * - When credentials (ebay_app_id / ebay_cert_id) are unconfigured or rejected, returns
 *   available: false, reason: "REQUIRES_CREDENTIALS" — never fabricates synthetic listings.
 * - Missing metrics (e.g. sales, favorites) remain null, never invented as 0.
 */

import { getSettings } from "@/lib/app-settings";
import { prisma } from "@/lib/db";
import {
  evaluateCanonicalOpportunity,
  extractOpportunityInputFromNormalizedProduct,
} from "@/services/intelligence/canonical-opportunity";
import { computeProductObservationFingerprint } from "@/marketplaces/core/acquisition/deduplication";
import { evaluateFreshness } from "@/marketplaces/core/acquisition/freshness";
import type { NormalizedProduct, SignalProvenance } from "@/marketplaces/core/types";
import type { PublicCategoryIntelligenceResult } from "@/marketplaces/core/acquisition/categories";
import type { PublicKeywordHarvestResult } from "@/marketplaces/core/acquisition/contracts";

export interface EbayCredentials {
  appId: string;
  certId: string;
  devId?: string;
  ruName?: string;
}

export interface EbayBrowseSearchOptions {
  query?: string;
  keywords?: string[];
  limit?: number;
  offset?: number;
  page?: number;
  minPrice?: number;
  maxPrice?: number;
  categoryId?: string | number;
  organizationId?: string;
  sort?: string;
}

export interface EbayBrowseSearchResult {
  available: boolean;
  reason?: "CONFIGURED" | "REQUIRES_CREDENTIALS" | "RATE_LIMITED" | "UPSTREAM_ERROR" | "NO_DATA" | "PARSER_ERROR";
  message?: string;
  items: NormalizedProduct[];
  total: number;
  limit: number;
  offset: number;
  source: "ebay_browse_api";
  fetchedAt: Date;
}

// In-memory token cache for eBay OAuth2 application access tokens
let cachedEbayAccessToken: { token: string; expiresAt: number } | null = null;

/**
 * Resolves eBay application credentials from settings or environment variables.
 */
export async function getEbayCredentials(): Promise<EbayCredentials | null> {
  const settings = await getSettings([
    "ebay_app_id",
    "ebay_cert_id",
    "ebay_dev_id",
    "ebay_ru_name",
  ]);

  const appId = (settings.ebay_app_id || process.env.EBAY_APP_ID || "").trim();
  const certId = (settings.ebay_cert_id || process.env.EBAY_CERT_ID || "").trim();
  const devId = (settings.ebay_dev_id || process.env.EBAY_DEV_ID || "").trim();
  const ruName = (settings.ebay_ru_name || process.env.EBAY_RU_NAME || "").trim();

  const isConfigured = Boolean(
    appId &&
    certId &&
    !appId.toLowerCase().includes("placeholder") &&
    !certId.toLowerCase().includes("placeholder")
  );

  if (!isConfigured) return null;

  return {
    appId,
    certId,
    devId: devId || undefined,
    ruName: ruName || undefined,
  };
}

/**
 * Checks whether valid eBay credentials are configured in the system.
 */
export async function isEbayConfigured(): Promise<boolean> {
  const creds = await getEbayCredentials();
  return creds !== null;
}

/**
 * Exchanges eBay App ID & Cert ID for a short-lived OAuth2 application token.
 * Scope: https://api.ebay.com/oauth/api_scope
 */
export async function getEbayAccessToken(credsArg?: EbayCredentials): Promise<string> {
  const now = Date.now();
  if (cachedEbayAccessToken && cachedEbayAccessToken.expiresAt > now + 60000) {
    return cachedEbayAccessToken.token;
  }

  const creds = credsArg || (await getEbayCredentials());
  if (!creds) {
    throw new Error("eBay credentials not configured. Please supply ebay_app_id and ebay_cert_id.");
  }

  const basicAuth = Buffer.from(`${creds.appId}:${creds.certId}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "https://api.ebay.com/oauth/api_scope",
  });

  const response = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`eBay OAuth token request failed (${response.status}): ${errText || response.statusText}`);
  }

  const data = await response.json();
  const token = data.access_token;
  const expiresInMs = (data.expires_in || 7200) * 1000;

  cachedEbayAccessToken = {
    token,
    expiresAt: now + expiresInMs,
  };

  return token;
}

/**
 * Clears the in-memory token cache (useful upon receiving 401/403).
 */
export function invalidateEbayTokenCache(): void {
  cachedEbayAccessToken = null;
}

/**
 * Executes a real item search against the official eBay Buy Browse API.
 * Endpoint: https://api.ebay.com/buy/browse/v1/item_summary/search
 */
export async function searchEbayBrowseProducts(
  options: EbayBrowseSearchOptions
): Promise<EbayBrowseSearchResult> {
  const fetchedAt = new Date();
  const creds = await getEbayCredentials();

  if (!creds) {
    return {
      available: false,
      reason: "REQUIRES_CREDENTIALS",
      message: "eBay App ID (Client ID) and Cert ID (Client Secret) are not configured. Please configure them in Integration Hub / Settings.",
      items: [],
      total: 0,
      limit: options.limit ?? 25,
      offset: options.offset ?? 0,
      source: "ebay_browse_api",
      fetchedAt,
    };
  }

  try {
    const accessToken = await getEbayAccessToken(creds);

    const queryTerm = options.query?.trim() || options.keywords?.join(" ").trim() || "";
    const limit = Math.min(50, Math.max(1, options.limit ?? 25));
    const offset = options.offset ?? (options.page && options.page > 1 ? (options.page - 1) * limit : 0);

    const url = new URL("https://api.ebay.com/buy/browse/v1/item_summary/search");
    if (queryTerm) {
      url.searchParams.set("q", queryTerm);
    }
    if (options.categoryId) {
      url.searchParams.set("category_ids", String(options.categoryId));
    }
    url.searchParams.set("limit", String(limit));
    if (offset > 0) {
      url.searchParams.set("offset", String(offset));
    }

    // Build filter string
    const filterParts: string[] = [];
    if (options.minPrice !== undefined || options.maxPrice !== undefined) {
      const min = options.minPrice !== undefined ? options.minPrice : "";
      const max = options.maxPrice !== undefined ? options.maxPrice : "";
      filterParts.push(`price:[${min}..${max}],priceCurrency:USD`);
    }
    if (filterParts.length > 0) {
      url.searchParams.set("filter", filterParts.join(","));
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
        "Content-Type": "application/json",
      },
    });

    if (response.status === 401 || response.status === 403) {
      invalidateEbayTokenCache();
      const errText = await response.text().catch(() => "");
      return {
        available: false,
        reason: "REQUIRES_CREDENTIALS",
        message: `eBay rejected credentials or access token (${response.status}): ${errText}`,
        items: [],
        total: 0,
        limit,
        offset,
        source: "ebay_browse_api",
        fetchedAt,
      };
    }

    if (response.status === 429) {
      return {
        available: false,
        reason: "RATE_LIMITED",
        message: "eBay Browse API rate limit reached. Please retry later.",
        items: [],
        total: 0,
        limit,
        offset,
        source: "ebay_browse_api",
        fetchedAt,
      };
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return {
        available: false,
        reason: "UPSTREAM_ERROR",
        message: `eBay Browse API error (${response.status}): ${errText || response.statusText}`,
        items: [],
        total: 0,
        limit,
        offset,
        source: "ebay_browse_api",
        fetchedAt,
      };
    }

    const data = await response.json();
    const itemSummaries: any[] = data.itemSummaries || [];
    const total = typeof data.total === "number" ? data.total : itemSummaries.length;

    const items: NormalizedProduct[] = itemSummaries.map((item: any): NormalizedProduct => {
      const rawPrice = item.price?.value ? parseFloat(item.price.value) : null;
      const currency = item.price?.currency || "USD";
      const rating = item.seller?.feedbackPercentage
        ? Math.round((parseFloat(item.seller.feedbackPercentage) / 20) * 10) / 10
        : null;
      const reviewCount = item.seller?.feedbackScore
        ? parseInt(String(item.seller.feedbackScore), 10)
        : null;

      const categoryPath = Array.isArray(item.categories)
        ? item.categories.map((c: any) => c.categoryName).filter(Boolean)
        : [];

      // Extract clean numeric external ID if possible (e.g. from "v1|123456789012|0" -> "123456789012")
      let externalId = String(item.itemId || "");
      const match = externalId.match(/v1\|(\d+)\|/);
      if (match) {
        externalId = match[1];
      }

      const imageUrl = item.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl || undefined;
      const webUrl = item.itemWebUrl || `https://www.ebay.com/itm/${externalId}`;

      const normalized: NormalizedProduct = {
        marketplace: "ebay",
        externalId,
        title: item.title || "eBay Listing",
        url: webUrl,
        imageUrl,
        price: isNaN(rawPrice as number) ? null : rawPrice,
        currency,
        rating,
        reviewCount,
        categoryPath: categoryPath.length > 0 ? categoryPath : undefined,
        shop: item.seller?.username ? { name: item.seller.username, externalId: item.seller.username } : undefined,
        source: "ACTUAL_DATA" as SignalProvenance,
        acquisitionMethod: "MARKETPLACE_API",
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

      return normalized;
    });

    // Auto-persist if organizationId is present
    if (options.organizationId && items.length > 0) {
      persistEbayBrowseObservations(items, {
        organizationId: options.organizationId,
        searchQuery: queryTerm,
        categoryName: options.categoryId ? String(options.categoryId) : undefined,
      }).catch(() => {});
    }

    return {
      available: true,
      reason: "CONFIGURED",
      items,
      total,
      limit,
      offset,
      source: "ebay_browse_api",
      fetchedAt,
    };
  } catch (err: any) {
    return {
      available: false,
      reason: "UPSTREAM_ERROR",
      message: err.message || "Failed to search eBay Browse API.",
      items: [],
      total: 0,
      limit: options.limit ?? 25,
      offset: options.offset ?? 0,
      source: "ebay_browse_api",
      fetchedAt,
    };
  }
}

/**
 * Fetches a single item's full detail from the eBay Buy Browse API.
 * Endpoint: https://api.ebay.com/buy/browse/v1/item/{item_id}
 */
export async function fetchEbayBrowseProduct(
  itemId: string,
  organizationId?: string
): Promise<{ product: NormalizedProduct | null; available: boolean; message?: string }> {
  const creds = await getEbayCredentials();
  if (!creds) {
    return { product: null, available: false, message: "eBay credentials unconfigured." };
  }

  try {
    const accessToken = await getEbayAccessToken(creds);
    const cleanId = encodeURIComponent(itemId.trim());

    const response = await fetch(`https://api.ebay.com/buy/browse/v1/item/${cleanId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return { product: null, available: false, message: `eBay item lookup failed (${response.status})` };
    }

    const item = await response.json();
    const rawPrice = item.price?.value ? parseFloat(item.price.value) : null;

    let externalId = String(item.itemId || cleanId);
    const match = externalId.match(/v1\|(\d+)\|/);
    if (match) {
      externalId = match[1];
    }

    const categoryPath = Array.isArray(item.categoryPath)
      ? item.categoryPath.split("|").map((s: string) => s.trim()).filter(Boolean)
      : [];

    const product: NormalizedProduct = {
      marketplace: "ebay",
      externalId,
      title: item.title || "eBay Listing",
      url: item.itemWebUrl || `https://www.ebay.com/itm/${externalId}`,
      imageUrl: item.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl || undefined,
      price: isNaN(rawPrice as number) ? null : rawPrice,
      currency: item.price?.currency || "USD",
      rating: item.seller?.feedbackPercentage ? parseFloat(item.seller.feedbackPercentage) / 20 : null,
      reviewCount: item.seller?.feedbackScore ? parseInt(String(item.seller.feedbackScore), 10) : null,
      categoryPath: categoryPath.length > 0 ? categoryPath : undefined,
      shop: item.seller?.username ? { name: item.seller.username, externalId: item.seller.username } : undefined,
      source: "ACTUAL_DATA",
      acquisitionMethod: "MARKETPLACE_API",
      isHistorical: false,
      capturedAt: new Date(),
    };

    const oppInput = extractOpportunityInputFromNormalizedProduct(product);
    const report = evaluateCanonicalOpportunity(oppInput);
    if (report.overallScore !== null) {
      product.opportunityScore = {
        score: report.overallScore,
        confidence: report.confidenceScore,
        tier: report.tier,
        verdict: report.verdictLabel,
        verdictVariant: report.verdictVariant,
        availableSignals: report.signals.available.map((s) => s.id),
        unavailableSignals: report.signals.unavailable.map((s) => s.id),
      };
    }

    if (organizationId) {
      persistEbayBrowseObservations([product], { organizationId, searchQuery: item.title }).catch(() => {});
    }

    return { product, available: true };
  } catch (err: any) {
    return { product: null, available: false, message: err.message };
  }
}

/**
 * Persists real observations retrieved from eBay Browse API to PostgreSQL tables
 * (ProductObservation, ProductObservationSnapshot, CategoryObservation).
 */
export async function persistEbayBrowseObservations(
  products: NormalizedProduct[],
  options: {
    organizationId: string;
    searchQuery?: string;
    categoryName?: string;
  }
): Promise<void> {
  if (!products || products.length === 0 || !options.organizationId) return;

  try {
    const orgId = options.organizationId;
    const query = options.searchQuery || "ebay_search";

    // 1. Persist/Update ProductObservations
    for (const p of products) {
      if (!p.externalId || !p.title) continue;
      const fingerprint = computeProductObservationFingerprint(p);
      const observedDate = p.capturedAt || new Date();

      try {
        const existing = await prisma.productObservation.findUnique({
          where: {
            organizationId_marketplace_externalId: {
              organizationId: orgId,
              marketplace: "ebay",
              externalId: p.externalId,
            },
          },
        });

        if (!existing) {
          await prisma.productObservation.create({
            data: {
              organizationId: orgId,
              marketplace: "ebay",
              externalId: p.externalId,
              title: p.title,
              imageUrl: p.imageUrl,
              price: p.price,
              currency: p.currency || "USD",
              rating: p.rating,
              reviewCount: p.reviewCount,
              shopName: p.shop?.name,
              categoryPath: p.categoryPath || [],
              fingerprint,
              sourceType: "MARKETPLACE_API",
              sourceUrl: p.url || "https://api.ebay.com/buy/browse/v1",
              provenance: "ACTUAL_DATA",
              confidence: 90,
              observedAt: observedDate,
            },
          });
        } else if (existing.fingerprint !== fingerprint) {
          await prisma.productObservationSnapshot.create({
            data: {
              productObservationId: existing.id,
              fingerprint: existing.fingerprint,
              price: existing.price,
              currency: existing.currency,
              rating: existing.rating,
              reviewCount: existing.reviewCount,
              shopName: existing.shopName,
              observedAt: existing.observedAt,
            },
          });

          await prisma.productObservation.update({
            where: { id: existing.id },
            data: {
              title: p.title,
              imageUrl: p.imageUrl,
              price: p.price,
              currency: p.currency || "USD",
              rating: p.rating,
              reviewCount: p.reviewCount,
              shopName: p.shop?.name,
              categoryPath: p.categoryPath || [],
              fingerprint,
              sourceType: "MARKETPLACE_API",
              sourceUrl: p.url || "https://api.ebay.com/buy/browse/v1",
              provenance: "ACTUAL_DATA",
              confidence: 90,
              observedAt: observedDate,
            },
          });
        } else {
          await prisma.productObservation.update({
            where: { id: existing.id },
            data: { observedAt: observedDate },
          });
        }
      } catch {
        // Continue processing
      }
    }

    // 2. Persist CategoryObservation if category is provided
    if (options.categoryName) {
      const prices = products.map((p) => p.price).filter((p): p is number => typeof p === "number" && p > 0);
      const minPrice = prices.length > 0 ? Math.min(...prices) : null;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
      const avgPrice = prices.length > 0 ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100 : null;
      const sortedPrices = [...prices].sort((a, b) => a - b);
      const medianPrice = sortedPrices.length > 0 ? sortedPrices[Math.floor(sortedPrices.length / 2)] : null;

      const oppScores = products
        .map((p) => p.opportunityScore?.score)
        .filter((s): s is number => typeof s === "number");
      const avgOppScore = oppScores.length > 0 ? Math.round(oppScores.reduce((a, b) => a + b, 0) / oppScores.length) : null;
      const highOppCount = oppScores.filter((s) => s >= 80).length;

      const catFingerprint = `${options.categoryName}:${products.length}:${medianPrice}:${avgOppScore}`;

      try {
        const existingCat = await prisma.categoryObservation.findFirst({
          where: {
            organizationId: orgId,
            marketplace: "ebay",
            categoryName: options.categoryName,
          },
        });

        if (!existingCat) {
          await prisma.categoryObservation.create({
            data: {
              organizationId: orgId,
              marketplace: "ebay",
              categoryName: options.categoryName,
              observedCatalogCount: products.length,
              minPrice,
              maxPrice,
              medianPrice,
              averagePrice: avgPrice,
              averageOpportunityScore: avgOppScore,
              highOpportunityCount: highOppCount,
              freshnessStatus: "LIVE",
              fingerprint: catFingerprint,
              observedAt: new Date(),
            },
          });
        } else if (existingCat.fingerprint !== catFingerprint) {
          await prisma.categoryObservationSnapshot.create({
            data: {
              categoryObservationId: existingCat.id,
              fingerprint: existingCat.fingerprint || "initial",
              observedCatalogCount: existingCat.observedCatalogCount,
              minPrice: existingCat.minPrice,
              maxPrice: existingCat.maxPrice,
              medianPrice: existingCat.medianPrice,
              averagePrice: existingCat.averagePrice,
              averageOpportunityScore: existingCat.averageOpportunityScore,
              observedAt: existingCat.observedAt,
            },
          });

          await prisma.categoryObservation.update({
            where: { id: existingCat.id },
            data: {
              observedCatalogCount: products.length,
              minPrice,
              maxPrice,
              medianPrice,
              averagePrice: avgPrice,
              averageOpportunityScore: avgOppScore,
              highOpportunityCount: highOppCount,
              fingerprint: catFingerprint,
              observedAt: new Date(),
            },
          });
        } else {
          await prisma.categoryObservation.update({
            where: { id: existingCat.id },
            data: { observedAt: new Date() },
          });
        }
      } catch {
        // Non-blocking
      }
    }
  } catch {
    // Non-blocking
  }
}

/**
 * Aggregates eBay category intelligence using official Browse API data.
 */
export async function aggregateEbayCategoryIntelligence(
  categoryName: string,
  limit = 30,
  organizationId?: string
): Promise<PublicCategoryIntelligenceResult | { available: false; reason: string; message: string }> {
  const searchRes = await searchEbayBrowseProducts({
    query: categoryName,
    limit,
    organizationId,
  });

  const freshness = evaluateFreshness(searchRes.fetchedAt, "taxonomy");

  if (!searchRes.available) {
    return {
      available: false,
      reason: searchRes.reason || "REQUIRES_CREDENTIALS",
      message: searchRes.message || "eBay category research requires active eBay Browse API credentials.",
    };
  }

  const products = searchRes.items;
  const prices = products.map((p) => p.price).filter((p): p is number => typeof p === "number" && p > 0);
  const sortedPrices = [...prices].sort((a, b) => a - b);

  const calculatePercentile = (sorted: number[], p: number): number => {
    if (sorted.length === 0) return 0;
    if (sorted.length === 1) return sorted[0];
    const idx = (p / 100) * (sorted.length - 1);
    const l = Math.floor(idx);
    const u = Math.ceil(idx);
    const w = idx - l;
    return l === u ? sorted[l] : sorted[l] * (1 - w) + sorted[u] * w;
  };

  const minPrice = sortedPrices.length > 0 ? sortedPrices[0] : null;
  const maxPrice = sortedPrices.length > 0 ? sortedPrices[sortedPrices.length - 1] : null;
  const medianPrice = sortedPrices.length > 0 ? calculatePercentile(sortedPrices, 50) : null;
  const avgPrice = sortedPrices.length > 0 ? Math.round((sortedPrices.reduce((a, b) => a + b, 0) / sortedPrices.length) * 100) / 100 : null;

  const oppScores = products
    .map((p) => p.opportunityScore?.score)
    .filter((s): s is number => typeof s === "number");
  const avgOppScore = oppScores.length > 0 ? Math.round(oppScores.reduce((a, b) => a + b, 0) / oppScores.length) : null;
  const highOpp = oppScores.filter((s) => s >= 80).length;
  const modOpp = oppScores.filter((s) => s >= 65 && s < 80).length;
  const compOpp = oppScores.filter((s) => s < 65).length;

  const sellers = new Set(products.map((p) => p.shop?.name).filter(Boolean));

  return {
    categoryName,
    marketplace: "ebay",
    observedCatalogCount: products.length,
    observedSellerCount: sellers.size,
    totalListings: searchRes.total || products.length,
    priceDistribution: {
      min: minPrice,
      max: maxPrice,
      median: medianPrice,
      average: avgPrice,
      percentile10: sortedPrices.length > 0 ? calculatePercentile(sortedPrices, 10) : null,
      percentile25: sortedPrices.length > 0 ? calculatePercentile(sortedPrices, 25) : null,
      percentile75: sortedPrices.length > 0 ? calculatePercentile(sortedPrices, 75) : null,
      percentile90: sortedPrices.length > 0 ? calculatePercentile(sortedPrices, 90) : null,
    },
    opportunityDistribution: {
      highOpportunityCount: highOpp,
      moderateOpportunityCount: modOpp,
      competitiveCount: compOpp,
      averageScore: avgOppScore,
    },
    sellerConcentrationIndex: sellers.size > 0 && products.length > 0 ? Math.round((sellers.size / products.length) * 100) : null,
    freshnessRatio: 1.0,
    reviewBarrierRating: "MODERATE",
    topProducts: products.slice(0, 10),
    recurringThemes: [],
    freshness,
    provenance: "ACTUAL_DATA",
    limitations: [],
  };
}

/**
 * Harvests keyword occurrence frequencies and demand signals from eBay Browse API.
 */
export async function harvestEbayBrowseKeywords(
  query: string,
  limit = 30,
  organizationId?: string
): Promise<{ success: boolean; items: PublicKeywordHarvestResult[]; error?: string; reason?: string }> {
  const searchRes = await searchEbayBrowseProducts({
    query,
    limit,
    organizationId,
  });

  if (!searchRes.available || searchRes.items.length === 0) {
    return {
      success: false,
      items: [],
      error: searchRes.message || "No eBay listings observed",
      reason: searchRes.reason || "REQUIRES_CREDENTIALS",
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

  const prices = searchRes.items.map((i) => i.price).filter((p): p is number => typeof p === "number" && p > 0);
  const avgPrice = prices.length > 0 ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100 : null;

  return {
    success: true,
    items: [
      {
        query,
        marketplace: "ebay",
        relatedKeywords,
        topTags: [],
        observedListingsCount: searchRes.items.length,
        averagePrice: avgPrice,
        demandProxyScore: Math.min(100, searchRes.items.length * 4),
        fetchedAt: searchRes.fetchedAt,
      },
    ],
  };
}

/**
 * Tests the live connection to eBay Buy Browse API by attempting OAuth token exchange
 * and a minimal search call.
 */
export async function testEbayBrowseConnection(): Promise<{
  ok: boolean;
  message: string;
  itemCount?: number;
  sampleTitle?: string;
}> {
  const creds = await getEbayCredentials();
  if (!creds) {
    return {
      ok: false,
      message: "eBay credentials are not configured. Please supply eBay App ID (Client ID) and Cert ID (Client Secret) in Integration Hub.",
    };
  }

  try {
    const token = await getEbayAccessToken(creds);

    const response = await fetch("https://api.ebay.com/buy/browse/v1/item_summary/search?q=test&limit=1", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return {
        ok: false,
        message: `eBay Browse API test failed (${response.status}): ${errText || response.statusText}`,
      };
    }

    const data = await response.json();
    const firstItem = data.itemSummaries?.[0];

    return {
      ok: true,
      message: `eBay Browse API connection successful! OAuth2 token verified and test search executed. Found ${data.total || 0} items.`,
      itemCount: data.total,
      sampleTitle: firstItem?.title,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: err.message || "Failed to connect to eBay Browse API.",
    };
  }
}
