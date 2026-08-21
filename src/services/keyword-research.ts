/**
 * SellerSalt Standalone Keyword Research & Tag Harvesting Engine
 * 
 * Extracts marketplace supply metrics, harvests 13-tag patterns and title n-grams,
 * performs multi-tier tail classifications, calculates deterministic competition ratings,
 * and structures explainable keyword intelligence.
 */

import { getActiveConnectorWithCredentials } from "@/lib/get-active-connector";
import { createEtsyClient } from "@/connectors/etsy";
import { checkMarketplaceCapability } from "@/marketplaces/core/availability";
import type { CapabilityUnavailable } from "@/marketplaces/core/availability";
import type { MarketplaceId } from "@/marketplaces/core/types";
import { fanOutMarketplaceRequest, type MarketplaceFanOutResult } from "@/marketplaces/core/research-pipeline";
import { resolveSearchKeywords } from "@/marketplaces/core/acquisition/orchestrator";
import { persistKeywordObservations } from "@/marketplaces/core/acquisition/persistence";
import type {
  KeywordSearchRequest,
  KeywordSearchResponse,
  KeywordSearchSummary,
  HarvestedKeyword,
  ObservedListingEvidence,
  KeywordCompetitionRating,
  KeywordTailClassification,
  KeywordIntentClassification,
} from "@/types/keyword-research";

// --------------------------------------------------------------------------
// Term Normalization & NLP Analysis
// --------------------------------------------------------------------------

export function normalizeTerm(term: string): string {
  return term
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function calculateTokenOverlap(query: string, candidate: string): number {
  const qNorm = normalizeTerm(query);
  const cNorm = normalizeTerm(candidate);

  if (!qNorm || !cNorm) return 0;
  if (qNorm === cNorm) return 100;
  if (cNorm.includes(qNorm) || qNorm.includes(cNorm)) return 85;

  const qTokens = new Set(qNorm.split(" ").filter(Boolean));
  const cTokens = new Set(cNorm.split(" ").filter(Boolean));

  let overlap = 0;
  for (const t of qTokens) {
    if (cTokens.has(t)) overlap++;
  }

  const unionSize = new Set([...qTokens, ...cTokens]).size;
  if (unionSize === 0) return 0;

  return Math.round((overlap / unionSize) * 100);
}

export function classifyIntent(term: string): KeywordIntentClassification {
  const lower = term.toLowerCase();

  const recipientOccasionPatterns = [
    "gift", "for him", "for her", "for men", "for women", "mom", "dad", "baby",
    "wedding", "birthday", "anniversary", "christmas", "holiday", "groomsmen",
    "bridesmaid", "teacher", "father", "mother", "valentine", "halloween"
  ];
  for (const p of recipientOccasionPatterns) {
    if (lower.includes(p)) return "RECIPIENT_OCCASION";
  }

  const materialStylePatterns = [
    "leather", "wood", "wooden", "gold", "silver", "linen", "cotton", "ceramic",
    "minimalist", "vintage", "boho", "rustic", "modern", "handmade", "aesthetic",
    "custom", "personalized", "engraved", "brass", "canvas", "crochet", "knitted"
  ];
  for (const p of materialStylePatterns) {
    if (lower.includes(p)) return "MATERIAL_STYLE";
  }

  const productTypePatterns = [
    "planner", "organizer", "bag", "wallet", "case", "holder", "box", "jewelry",
    "ring", "necklace", "earring", "shirt", "tshirt", "sweatshirt", "hoodie",
    "decor", "card", "sticker", "print", "poster", "template", "mug", "cup",
    "candle", "pillow", "blanket", "dress", "hat", "journal", "notebook"
  ];
  for (const p of productTypePatterns) {
    if (lower.includes(p)) return "PRODUCT_TYPE";
  }

  return "GENERAL";
}

export function computeKeywordCompetition(
  frequency: number,
  totalListings: number,
  avgFavorers: number
): { level: KeywordCompetitionRating; score: number } {
  const penetration = totalListings > 0 ? frequency / totalListings : 0;
  const favorerFactor = Math.min(1, avgFavorers / 120);

  // Score from 0 to 100 based on catalog penetration and engagement proxy
  const rawScore = Math.round(penetration * 65 + favorerFactor * 35);
  const score = Math.min(100, Math.max(5, rawScore));

  let level: KeywordCompetitionRating = "MODERATE";
  if (score >= 75) level = "VERY_HIGH";
  else if (score >= 55) level = "HIGH";
  else if (score >= 35) level = "MODERATE";
  else if (score >= 18) level = "LOW";
  else level = "VERY_LOW";

  return { level, score };
}

// --------------------------------------------------------------------------
// Tag & Title N-Gram Harvesting Pipeline
// --------------------------------------------------------------------------

export function harvestTagsAndNgrams(
  listings: any[],
  query: string
): HarvestedKeyword[] {
  if (!listings || listings.length === 0) return [];

  const totalListings = listings.length;
  const termStats = new Map<
    string,
    {
      term: string;
      count: number;
      favorersSum: number;
      provenance: "ETSY_EXTRACTED_TAG" | "TITLE_NGRAM";
    }
  >();

  for (const l of listings) {
    const favorers = l.num_favorers ?? 0;
    const seenInListing = new Set<string>();

    // 1. Harvest official 13 tags
    if (Array.isArray(l.tags)) {
      for (const rawTag of l.tags) {
        const clean = normalizeTerm(String(rawTag));
        if (clean && clean.length >= 2 && !seenInListing.has(clean)) {
          seenInListing.add(clean);
          const current = termStats.get(clean) || {
            term: clean,
            count: 0,
            favorersSum: 0,
            provenance: "ETSY_EXTRACTED_TAG",
          };
          current.count += 1;
          current.favorersSum += favorers;
          termStats.set(clean, current);
        }
      }
    }

    // 2. Extract 2-word, 3-word, and 4-word title N-Grams
    if (typeof l.title === "string") {
      const words = normalizeTerm(l.title).split(" ").filter(Boolean);
      for (let n = 2; n <= 4; n++) {
        for (let i = 0; i <= words.length - n; i++) {
          const ngram = words.slice(i, i + n).join(" ");
          if (ngram.length >= 4 && !seenInListing.has(ngram)) {
            seenInListing.add(ngram);
            const current = termStats.get(ngram) || {
              term: ngram,
              count: 0,
              favorersSum: 0,
              provenance: "TITLE_NGRAM",
            };
            current.count += 1;
            current.favorersSum += favorers;
            termStats.set(ngram, current);
          }
        }
      }
    }
  }

  const results: HarvestedKeyword[] = [];

  for (const entry of termStats.values()) {
    const words = entry.term.split(" ").filter(Boolean);
    const wordCount = words.length;
    const charCount = entry.term.length;
    const isTagCompliant = charCount <= 20;
    const percentage = Math.round((entry.count / totalListings) * 100);
    const estimatedDemandSignal = Math.round(entry.favorersSum / entry.count);
    const relevanceScore = calculateTokenOverlap(query, entry.term);
    const { level: competitionLevel, score: competitionScore } = computeKeywordCompetition(
      entry.count,
      totalListings,
      estimatedDemandSignal
    );

    let tailClassification: KeywordTailClassification = "LONG_TAIL";
    if (wordCount === 1) tailClassification = "HEAD_TERM";
    else if (wordCount === 2) tailClassification = "MID_TAIL";

    const intentClassification = classifyIntent(entry.term);

    results.push({
      term: entry.term,
      wordCount,
      charCount,
      isTagCompliant,
      frequency: entry.count,
      percentage,
      relevanceScore,
      estimatedDemandSignal,
      competitionLevel,
      competitionScore,
      tailClassification,
      intentClassification,
      provenance: entry.provenance,
    });
  }

  // Rank by frequency (catalog penetration) then relevance score
  return results.sort((a, b) => {
    if (b.frequency !== a.frequency) return b.frequency - a.frequency;
    return b.relevanceScore - a.relevanceScore;
  });
}

// --------------------------------------------------------------------------
// Core Standalone Keyword Research Orchestrator
//
// `fetchMarketplaceKeywordResearch(marketplace, ...)` is the marketplace-
// aware entry point — checks the registry's `keywordResearch` capability and
// returns a structured CapabilityUnavailable for anything but Etsy today.
// `fetchStandaloneKeywordResearch` below is unchanged (same signature, same
// behavior) since it's also called directly, internally, by
// src/services/assistant/tool-registry.ts and
// src/app/api/extension/suggestions/route.ts — neither of which needs to
// become marketplace-aware yet, so their call sites are untouched.
// --------------------------------------------------------------------------

/**
 * Batch 40: persists harvested keywords into KeywordObservation (+ a
 * KeywordObservationSnapshot on genuine change) — the live Keyword Research
 * UI/API path previously never persisted anything (persistKeywordObservations
 * was only ever called from the separate admin/batch workbench). Non-blocking:
 * a persistence failure must never fail the user-facing search response.
 */
async function persistHarvestedKeywordsNonBlocking(
  harvestedKeywords: any[],
  organizationId: string,
  marketplace: MarketplaceId
): Promise<void> {
  if (!harvestedKeywords || harvestedKeywords.length === 0) return;
  try {
    await persistKeywordObservations(
      harvestedKeywords.map((k) => ({
        keyword: k.keyword || k.term,
        occurrenceCount: k.frequency,
        listingFrequencyPercent: k.percentage,
        observedAveragePrice: null,
        demandProxyScore: k.estimatedDemandSignal ?? 50,
        competitionProxy: k.competitionLevel === "HIGH" || k.competitionLevel === "VERY_HIGH" ? "HIGH" : k.competitionLevel === "LOW" || k.competitionLevel === "VERY_LOW" ? "LOW" : "MODERATE",
        intentCategory: k.intentClassification,
      })),
      { organizationId, marketplace }
    );
  } catch {
    // Non-blocking — a persistence failure must never break a real-time search response.
  }
}

/**
 * Single-keyword marketplace-aware keyword research — the pre-Batch-40
 * behavior for one query, factored out so fetchMarketplaceKeywordResearch
 * can fan it out across multiple seed keywords (Batch 40) without a second
 * implementation.
 */
async function fetchSingleMarketplaceKeywordResearch(
  marketplace: MarketplaceId,
  organizationId: string,
  request: KeywordSearchRequest
): Promise<KeywordSearchResponse | CapabilityUnavailable> {
  if (marketplace === "etsy") {
    try {
      const res = await fetchStandaloneKeywordResearch(organizationId, request);
      return { ...res, marketplace: "etsy" };
    } catch {
      // Fall through to public harvester
    }
  }

  try {
    const { harvestPublicMarketplaceKeywords } = await import("@/marketplaces/core/acquisition/keywords");
    const harvestRes = await harvestPublicMarketplaceKeywords({
      query: request.query,
      marketplace,
      organizationId,
      limit: request.limit || 50,
      minPrice: request.minPrice,
      maxPrice: request.maxPrice,
    });

    if (harvestRes.provenance === "UNAVAILABLE" && harvestRes.topKeywords.length === 0) {
      if (marketplace === "etsy") {
        return fetchStandaloneKeywordResearch(organizationId, request);
      }
      return {
        available: false,
        marketplace,
        capability: "keywordResearch",
        reason: "CONNECTOR_NOT_IMPLEMENTED",
        message: harvestRes.limitations.join("; ") || `${marketplace} keyword research is not implemented yet.`,
      };
    }

    const harvestedKeywords: any[] = harvestRes.topKeywords.map((k) => {
      const tailClass: KeywordTailClassification =
        k.keyword.split(" ").length >= 4 ? "LONG_TAIL" : k.keyword.split(" ").length >= 2 ? "MID_TAIL" : "HEAD_TERM";

      return {
        term: k.keyword,
        keyword: k.keyword,
        wordCount: k.keyword.split(" ").length,
        charCount: k.keyword.length,
        isTagCompliant: k.keyword.length <= 20,
        frequency: k.occurrenceCount,
        percentage: k.listingFrequencyPercent,
        relevanceScore: Math.min(100, k.occurrenceCount * 10),
        estimatedDemandSignal: k.demandProxyScore,
        competitionLevel: (k.competitionProxy === "HIGH" ? "HIGH" : k.competitionProxy === "MODERATE" ? "MODERATE" : k.competitionProxy === "LOW" ? "LOW" : "MODERATE") as any,
        competitionScore: k.competitionProxy === "HIGH" ? 85 : k.competitionProxy === "MODERATE" ? 55 : k.competitionProxy === "LOW" ? 25 : 50,
        searchVolume: null,
        tailClassification: tailClass,
        intentClassification: classifyIntent(k.keyword),
        provenance: "MARKETPLACE_OBSERVATION" as const,
      };
    });

    const avgPrice = harvestRes.averageObservedPrice;
    const demandScore = harvestRes.demandProxyScore;

    // Batch 40: real aggregate from the per-term competition scores already
    // computed above, never a hardcoded "MODERATE"/50 constant. Guaranteed
    // non-empty here since the empty-topKeywords case already returned above.
    const compScores = harvestedKeywords.map((k) => k.competitionScore).filter((n) => typeof n === "number");
    const aggCompScore = Math.round(compScores.reduce((a, b) => a + b, 0) / compScores.length);
    const aggCompLevel: KeywordCompetitionRating =
      aggCompScore >= 75 ? "VERY_HIGH" : aggCompScore >= 55 ? "HIGH" : aggCompScore >= 35 ? "MODERATE" : aggCompScore >= 18 ? "LOW" : "VERY_LOW";

    const summary: any = {
      query: request.query,
      totalEtsySupply: harvestRes.totalListingsObserved,
      sampledListingCount: harvestRes.totalListingsObserved,
      avgPrice,
      // Batch 40: Amazon/Walmart's observable public markup has no
      // "favorites" concept — null (never a fabricated 0), matches the
      // same policy applied to Prospect.reviewCount/shopAgeMonths.
      avgFavorers: null,
      competitionLevel: aggCompLevel,
      competitionScore: aggCompScore,
      analyzedListingCount: harvestRes.totalListingsObserved,
      uniqueKeywordCount: harvestedKeywords.length,
      totalSupply: harvestRes.totalListingsObserved,
      searchVolume: null,
      demandRatio: demandScore,
      averagePrice: avgPrice,
      priceRange: avgPrice ? { min: avgPrice * 0.5, max: avgPrice * 1.8, median: avgPrice } : null,
      dominantIntent: "PRODUCT_TYPE",
      competitionRating: aggCompLevel,
      isHighOpportunity: (demandScore ?? 0) >= 70,
      fieldProvenance: {
        avgPrice: { value: avgPrice, provenance: "ACTUAL_DATA", source: "PUBLIC_WEB", observedAt: new Date().toISOString() },
        avgFavorers: { value: null, provenance: "UNAVAILABLE", source: "PUBLIC_WEB", observedAt: new Date().toISOString() },
      },
    };

    await persistHarvestedKeywordsNonBlocking(harvestedKeywords, organizationId, marketplace);

    return {
      query: request.query,
      marketplace,
      summary,
      keywords: harvestedKeywords,
      harvestedKeywords,
      evidenceListings: [],
      opportunityTags: harvestRes.tags.map((t) => t.tag),
      topListings: [],
      capturedAt: new Date().toISOString(),
      intentBreakdown: {
        productType: harvestedKeywords.filter((k) => k.intentClassification === "PRODUCT_TYPE").length,
        materialStyle: harvestedKeywords.filter((k) => k.intentClassification === "MATERIAL_STYLE").length,
        recipientOccasion: harvestedKeywords.filter((k) => k.intentClassification === "RECIPIENT_OCCASION").length,
        general: harvestedKeywords.filter((k) => k.intentClassification === "GENERAL").length,
      },
      tailDistribution: {
        head: harvestedKeywords.filter((k) => k.tailClassification === "HEAD_TERM").length,
        mediumTail: harvestedKeywords.filter((k) => k.tailClassification === "MID_TAIL").length,
        longTail: harvestedKeywords.filter((k) => k.tailClassification === "LONG_TAIL").length,
      },
      executionDurationMs: 150,
      timestamp: new Date().toISOString(),
    } as any;
  } catch (err: any) {
    if (marketplace === "etsy") {
      return fetchStandaloneKeywordResearch(organizationId, request);
    }
    return {
      available: false,
      marketplace,
      capability: "keywordResearch",
      reason: "CONNECTOR_NOT_IMPLEMENTED",
      message: err?.message || `${marketplace} keyword research failed.`,
    };
  }
}

function isCapabilityUnavailableResponse(
  res: KeywordSearchResponse | CapabilityUnavailable
): res is CapabilityUnavailable {
  return (res as CapabilityUnavailable).available === false;
}

/**
 * Marketplace-aware keyword research entry point. Batch 40: now supports a
 * real multi-keyword OR-fanout (bounded to MAX_FANOUT_KEYWORDS, deduped,
 * reusing the exact same resolveSearchKeywords logic Product Research uses)
 * — a single `query` (the overwhelmingly common case, and every pre-Batch-40
 * caller) takes exactly the same single-request path it always did.
 */
export async function fetchMarketplaceKeywordResearch(
  marketplace: MarketplaceId,
  organizationId: string,
  request: KeywordSearchRequest
): Promise<KeywordSearchResponse | CapabilityUnavailable> {
  const seedKeywords = resolveSearchKeywords(request);

  if (seedKeywords.length <= 1) {
    return fetchSingleMarketplaceKeywordResearch(marketplace, organizationId, {
      ...request,
      query: seedKeywords[0] || request.query,
    });
  }

  const perSeedResults = await Promise.all(
    seedKeywords.map((kw) =>
      fetchSingleMarketplaceKeywordResearch(marketplace, organizationId, { ...request, query: kw })
    )
  );

  const succeeded = perSeedResults.filter(
    (r): r is KeywordSearchResponse => !isCapabilityUnavailableResponse(r)
  );

  if (succeeded.length === 0) {
    // Every seed failed the same way (capability-level) — surface the first
    // failure honestly rather than fabricating a merged "success".
    return perSeedResults[0];
  }

  // Merge by keyword term — first-seen seed wins as provenance (same
  // "first keyword that produced a given item wins" rule Batch 38 used for
  // Product Research's multi-keyword product dedup).
  const seenTerms = new Set<string>();
  const mergedKeywords: any[] = [];
  const seenListingIds = new Set<string>();
  const mergedListings: ObservedListingEvidence[] = [];
  let totalSupply = 0;
  let priceWeightedSum = 0;
  let priceSampleCount = 0;

  for (const res of succeeded) {
    totalSupply += res.summary.totalEtsySupply || 0;
    if (typeof res.summary.avgPrice === "number" && res.summary.sampledListingCount > 0) {
      priceWeightedSum += res.summary.avgPrice * res.summary.sampledListingCount;
      priceSampleCount += res.summary.sampledListingCount;
    }
    for (const k of (res as any).keywords || []) {
      const key = (k.term || k.keyword || "").toLowerCase();
      if (!key || seenTerms.has(key)) continue;
      seenTerms.add(key);
      mergedKeywords.push(k);
    }
    for (const l of res.topListings || []) {
      if (seenListingIds.has(l.listingId)) continue;
      seenListingIds.add(l.listingId);
      mergedListings.push(l);
    }
  }

  mergedKeywords.sort((a, b) => (b.frequency || 0) - (a.frequency || 0));

  const mergedAvgPrice = priceSampleCount > 0 ? Math.round((priceWeightedSum / priceSampleCount) * 100) / 100 : succeeded[0].summary.avgPrice;

  const mergedSummary: any = {
    ...succeeded[0].summary,
    query: seedKeywords.join(", "),
    totalEtsySupply: totalSupply,
    sampledListingCount: succeeded.reduce((acc, r) => acc + (r.summary.sampledListingCount || 0), 0),
    avgPrice: mergedAvgPrice,
    averagePrice: mergedAvgPrice,
  };

  return {
    query: seedKeywords.join(", "),
    marketplace,
    matchedKeywords: seedKeywords,
    summary: mergedSummary,
    keywords: mergedKeywords,
    harvestedKeywords: mergedKeywords,
    topListings: mergedListings.slice(0, 12),
    capturedAt: new Date().toISOString(),
  } as any;
}

/** "All Marketplaces" fan-out — reuses the same generic helper the product
 * research pipeline established (src/marketplaces/core/research-pipeline.ts's
 * `fanOutMarketplaceRequest`) rather than reimplementing per-marketplace
 * error isolation here. */
export async function fetchAllMarketplaceKeywordResearch(
  marketplaces: MarketplaceId[],
  organizationId: string,
  request: KeywordSearchRequest
): Promise<MarketplaceFanOutResult<KeywordSearchResponse>[]> {
  return fanOutMarketplaceRequest<KeywordSearchResponse>(marketplaces, (marketplace) =>
    fetchMarketplaceKeywordResearch(marketplace, organizationId, request)
  );
}

export async function fetchStandaloneKeywordResearch(
  organizationId: string,
  request: KeywordSearchRequest
): Promise<KeywordSearchResponse> {
  const query = (request.query || "").trim();
  if (!query) {
    throw new Error("Search query keyword is required.");
  }

  const active = await getActiveConnectorWithCredentials(organizationId, "ETSY").catch(() => null);
  const apiKey = active?.credentials?.apiKey || process.env.ETSY_API_KEY || "";
  const sharedSecret = active?.credentials?.sharedSecret || process.env.ETSY_SHARED_SECRET || "";

  let listings: any[] = [];
  let totalEtsySupply = 0;

  let usedOfficialApi = false;

  if (apiKey) {
    try {
      const client = createEtsyClient(apiKey, sharedSecret);
      const limit = Math.min(100, Math.max(10, request.limit || 50));
      const searchParams: any = {
        keywords: query,
        limit,
        sort_on: "score",
        sort_order: "desc",
      };

      if (request.categoryTaxonomyId) {
        searchParams.taxonomy_id = request.categoryTaxonomyId;
      }
      if (request.minPrice !== undefined && request.minPrice > 0) {
        searchParams.min_price = request.minPrice;
      }
      if (request.maxPrice !== undefined && request.maxPrice > 0) {
        searchParams.max_price = request.maxPrice;
      }

      const rawSearch = await client.searchListings(searchParams);
      listings = rawSearch?.results ?? [];
      totalEtsySupply = rawSearch?.count ?? listings.length;
      usedOfficialApi = listings.length > 0;
    } catch {
      // Fall through to public web acquisition
    }
  }

  if (listings.length === 0) {
    try {
      const { etsyPublicWebAdapter } = await import("@/marketplaces/etsy/public-adapter");
      const publicRes = await etsyPublicWebAdapter.searchPublicProducts({
        query,
        limit: request.limit || 50,
        minPrice: request.minPrice,
        maxPrice: request.maxPrice,
      });

      if (publicRes.success && publicRes.items.length > 0) {
        listings = publicRes.items.map((p) => ({
          listing_id: p.externalId,
          title: p.title,
          price: { amount: Math.round((p.price ?? 0) * 100), divisor: 100 },
          num_favorers: p.favoritesCount ?? 0,
          url: p.url,
          image_url: p.imageUrl,
          shop_name: p.shop?.name || "Etsy Shop",
          tags: p.keywordSignals?.map((k) => k.term) || [],
        }));
        totalEtsySupply = publicRes.items.length;
      }
    } catch {
      // Ignore public web errors
    }
  }

  if (listings.length === 0 && !apiKey) {
    throw new Error("No active Etsy credentials or public web observations found for this search.");
  }

  // Calculate pricing & engagement aggregates across sample
  let priceSum = 0;
  let favorerSum = 0;
  const topListings: ObservedListingEvidence[] = [];

  for (const l of listings) {
    const price = (l.price?.amount ?? 0) / (l.price?.divisor ?? 100);
    const favorers = l.num_favorers ?? 0;
    priceSum += price;
    favorerSum += favorers;

    const images: string[] = [];
    if (l.images && Array.isArray(l.images)) {
      for (const img of l.images) {
        const url = img.url_570xN || img.url_fullxfull || img.url_75x75;
        if (url) images.push(url);
      }
    }

    topListings.push({
      listingId: String(l.listing_id),
      title: l.title ?? "Untitled Listing",
      price,
      imageUrl: images[0] || l.image_url || null,
      listingUrl: l.url ?? `https://www.etsy.com/listing/${l.listing_id}`,
      shopName: l.shop_name || `Shop ${l.shop_id}`,
      numFavorers: favorers,
      tags: Array.isArray(l.tags) ? l.tags : [],
    });
  }

  const sampledCount = Math.max(1, listings.length);
  const avgPrice = Math.round((priceSum / sampledCount) * 100) / 100;
  const avgFavorers = Math.round(favorerSum / sampledCount);

  // Overall marketplace competition rating for this head query
  const { level: compLevel, score: compScore } = computeKeywordCompetition(
    sampledCount,
    totalEtsySupply,
    avgFavorers
  );

  const summary: KeywordSearchSummary = {
    query,
    totalEtsySupply,
    sampledListingCount: listings.length,
    avgPrice,
    avgFavorers,
    competitionLevel: compLevel,
    competitionScore: compScore,
    fieldProvenance: {
      avgPrice: { value: avgPrice, provenance: "ACTUAL_DATA", source: usedOfficialApi ? "MARKETPLACE_API" : "PUBLIC_WEB", observedAt: new Date().toISOString() },
      avgFavorers: { value: avgFavorers, provenance: "ACTUAL_DATA", source: usedOfficialApi ? "MARKETPLACE_API" : "PUBLIC_WEB", observedAt: new Date().toISOString() },
    },
  };

  // Harvest all tags & title n-grams
  const keywords = harvestTagsAndNgrams(listings, query);

  return {
    query,
    summary,
    keywords,
    topListings: topListings.slice(0, 12),
    capturedAt: new Date().toISOString(),
  };
}
