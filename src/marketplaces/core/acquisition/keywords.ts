/**
 * SellerSalt Marketplace-Independent Empirical Keyword Harvester
 * 
 * Harvests keyword occurrence frequencies, co-occurrences, tags, and price distributions
 * directly from public search cards and listings without official API dependencies.
 * 
 * ZERO-FABRICATION CONTRACT:
 * - exactSearchVolume is ALWAYS null unless backed by a licensed keyword search provider.
 * - Mislabeled "monthly search volume" from listing counts is strictly prohibited.
 * - Exposes observed listing prevalence percentage and SellerSalt demand proxy score.
 */

import { MarketplaceRegistry, registerAllConnectors } from "../registry";
import { evaluateFreshness, type FreshnessEvaluation } from "./freshness";
import type { MarketplaceId, SignalProvenance } from "../types";

export interface PublicKeywordQuery {
  query: string;
  marketplace: MarketplaceId;
  organizationId?: string;
  limit?: number;
}

export interface CanonicalKeywordObservation {
  keyword: string;
  marketplace: MarketplaceId;
  occurrenceCount: number;
  listingFrequencyPercent: number; // 0-100% of analyzed listings containing this term
  observedAveragePrice: number | null;
  demandProxyScore: number; // 0-100 derived from listing prevalence and engagement
  competitionProxy: "LOW" | "MODERATE" | "HIGH" | "UNAVAILABLE";
  searchVolume: null;
  searchVolumeProvenance: "UNAVAILABLE";
  freshness: FreshnessEvaluation;
  provenance: SignalProvenance;
  observedAt: Date;
}

export interface KeywordCluster {
  theme: string;
  intentCategory?: "MATERIAL_STYLE" | "RECIPIENT_OCCASION" | "PRODUCT_MODIFIER" | "GENERAL";
  keywords: string[];
  totalOccurrences: number;
  averagePrice?: number | null;
}

export interface KeywordResearchSummary {
  query: string;
  marketplace: MarketplaceId;
  totalListingsObserved: number;
  averageObservedPrice: number | null;
  demandProxyScore: number | null;
  topKeywords: CanonicalKeywordObservation[];
  clusters: KeywordCluster[];
  tags: Array<{ tag: string; count: number }>;
  freshness: FreshnessEvaluation;
  provenance: SignalProvenance;
  limitations: string[];
}

const MATERIAL_PATTERNS = [
  "ceramic", "wood", "wooden", "leather", "linen", "cotton", "gold", "silver",
  "clay", "stoneware", "porcelain", "brass", "canvas", "glass", "metal", "resin",
];

const OCCASION_PATTERNS = [
  "gift", "wedding", "birthday", "anniversary", "christmas", "holiday", "mom",
  "dad", "for him", "for her", "baby", "teacher", "bridesmaid", "groomsmen",
];

const MODIFIER_PATTERNS = [
  "handmade", "personalized", "custom", "vintage", "rustic", "minimalist",
  "modern", "boho", "aesthetic", "large", "small", "cute", "funny",
];

function classifyKeywordIntent(keyword: string): KeywordCluster["intentCategory"] {
  const lower = keyword.toLowerCase();
  for (const m of MATERIAL_PATTERNS) {
    if (lower.includes(m)) return "MATERIAL_STYLE";
  }
  for (const o of OCCASION_PATTERNS) {
    if (lower.includes(o)) return "RECIPIENT_OCCASION";
  }
  for (const mod of MODIFIER_PATTERNS) {
    if (lower.includes(mod)) return "PRODUCT_MODIFIER";
  }
  return "GENERAL";
}

export function buildDeterministicKeywordClusters(
  keywords: CanonicalKeywordObservation[]
): KeywordCluster[] {
  if (!keywords || keywords.length === 0) return [];

  const clusters: KeywordCluster[] = [];
  const intentBuckets: Record<string, CanonicalKeywordObservation[]> = {
    MATERIAL_STYLE: [],
    RECIPIENT_OCCASION: [],
    PRODUCT_MODIFIER: [],
    GENERAL: [],
  };

  for (const kw of keywords) {
    const intent = classifyKeywordIntent(kw.keyword) || "GENERAL";
    intentBuckets[intent].push(kw);
  }

  // 1. Material & Style Cluster
  if (intentBuckets.MATERIAL_STYLE.length > 0) {
    const items = intentBuckets.MATERIAL_STYLE;
    clusters.push({
      theme: "Materials & Craft Styles",
      intentCategory: "MATERIAL_STYLE",
      keywords: items.map((i) => i.keyword),
      totalOccurrences: items.reduce((acc, curr) => acc + curr.occurrenceCount, 0),
      averagePrice: items[0]?.observedAveragePrice ?? null,
    });
  }

  // 2. Occasion & Recipient Cluster
  if (intentBuckets.RECIPIENT_OCCASION.length > 0) {
    const items = intentBuckets.RECIPIENT_OCCASION;
    clusters.push({
      theme: "Gifts & Occasions",
      intentCategory: "RECIPIENT_OCCASION",
      keywords: items.map((i) => i.keyword),
      totalOccurrences: items.reduce((acc, curr) => acc + curr.occurrenceCount, 0),
      averagePrice: items[0]?.observedAveragePrice ?? null,
    });
  }

  // 3. Modifier & Attributes Cluster
  if (intentBuckets.PRODUCT_MODIFIER.length > 0) {
    const items = intentBuckets.PRODUCT_MODIFIER;
    clusters.push({
      theme: "Product Customization & Attributes",
      intentCategory: "PRODUCT_MODIFIER",
      keywords: items.map((i) => i.keyword),
      totalOccurrences: items.reduce((acc, curr) => acc + curr.occurrenceCount, 0),
      averagePrice: items[0]?.observedAveragePrice ?? null,
    });
  }

  // 4. General / Long-Tail Cluster
  if (intentBuckets.GENERAL.length > 0) {
    const items = intentBuckets.GENERAL.slice(0, 10);
    clusters.push({
      theme: "Trending Search Variations",
      intentCategory: "GENERAL",
      keywords: items.map((i) => i.keyword),
      totalOccurrences: items.reduce((acc, curr) => acc + curr.occurrenceCount, 0),
      averagePrice: items[0]?.observedAveragePrice ?? null,
    });
  }

  return clusters;
}

/**
 * Harvests keyword research from public web adapters.
 */
export async function harvestPublicMarketplaceKeywords(
  query: PublicKeywordQuery
): Promise<KeywordResearchSummary> {
  registerAllConnectors();
  const adapter = MarketplaceRegistry.tryGetPublicWebAdapter(query.marketplace);

  if (!adapter || !adapter.capabilities.keywordDiscovery) {
    const freshness = evaluateFreshness(null, "general");
    return {
      query: query.query,
      marketplace: query.marketplace,
      totalListingsObserved: 0,
      averageObservedPrice: null,
      demandProxyScore: null,
      topKeywords: [],
      clusters: [],
      tags: [],
      freshness,
      provenance: "UNAVAILABLE",
      limitations: [
        `${query.marketplace} public keyword discovery adapter is not available yet.`,
      ],
    };
  }

  // If adapter has dedicated keyword harvester:
  if (adapter.harvestPublicKeywords) {
    try {
      const harvestRes = await adapter.harvestPublicKeywords({
        query: query.query,
        limit: query.limit || 50,
      });

      if (harvestRes.success && harvestRes.items.length > 0) {
        const h = harvestRes.items[0];
        const freshness = evaluateFreshness(harvestRes.fetchedAt, "general");

        const topKeywords: CanonicalKeywordObservation[] = (h.relatedKeywords || []).map((k) => ({
          keyword: k.keyword,
          marketplace: query.marketplace,
          occurrenceCount: k.occurrenceCount,
          listingFrequencyPercent: k.listingFrequency,
          observedAveragePrice: h.averagePrice,
          demandProxyScore: k.demandProxy,
          competitionProxy: (k.listingFrequency > 60 ? "HIGH" : k.listingFrequency > 25 ? "MODERATE" : "LOW") as "HIGH" | "MODERATE" | "LOW",
          searchVolume: null,
          searchVolumeProvenance: "UNAVAILABLE" as const,
          freshness,
          provenance: "ACTUAL_DATA" as SignalProvenance,
          observedAt: harvestRes.fetchedAt,
        }));

        return {
          query: h.query,
          marketplace: query.marketplace,
          totalListingsObserved: h.observedListingsCount,
          averageObservedPrice: h.averagePrice,
          demandProxyScore: h.demandProxyScore,
          topKeywords,
          clusters: buildDeterministicKeywordClusters(topKeywords),
          tags: (h.topTags || []).map((t) => ({ tag: t.tag, count: t.count })),
          freshness,
          provenance: "ACTUAL_DATA",
          limitations: [
            "Exact monthly search volume is unavailable without licensed third-party volume feeds. SellerSalt uses observed listing prevalence percentage.",
          ],
        };
      }
    } catch {
      // Fall through to search listing analysis
    }
  }

  // Fallback: analyze search listings directly
  const searchRes = await adapter.searchPublicProducts({
    query: query.query,
    limit: query.limit || 50,
  });

  const freshness = evaluateFreshness(searchRes.fetchedAt, "general");

  if (!searchRes.success || searchRes.items.length === 0) {
    return {
      query: query.query,
      marketplace: query.marketplace,
      totalListingsObserved: 0,
      averageObservedPrice: null,
      demandProxyScore: null,
      topKeywords: [],
      clusters: [],
      tags: [],
      freshness,
      provenance: searchRes.provenance || "UNAVAILABLE",
      limitations: [
        searchRes.error || `${query.marketplace} public search cards could not be analyzed.`,
      ],
    };
  }

  const items = searchRes.items;
  const wordCounts = new Map<string, number>();
  const queryTerm = query.query.toLowerCase().trim();

  let priceSum = 0;
  let priceCount = 0;

  for (const item of items) {
    if (item.price !== null && item.price !== undefined) {
      priceSum += item.price;
      priceCount++;
    }

    const tokens = item.title
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .filter((t) => t.length > 2 && t !== queryTerm);

    for (const t of tokens) {
      wordCounts.set(t, (wordCounts.get(t) || 0) + 1);
    }
  }

  const averagePrice = priceCount > 0 ? parseFloat((priceSum / priceCount).toFixed(2)) : null;

  const topKeywords: CanonicalKeywordObservation[] = Array.from(wordCounts.entries())
    .map(([keyword, count]) => {
      const freq = Math.round((count / items.length) * 100);
      return {
        keyword,
        marketplace: query.marketplace,
        occurrenceCount: count,
        listingFrequencyPercent: freq,
        observedAveragePrice: averagePrice,
        demandProxyScore: Math.min(100, count * 15),
        competitionProxy: (freq > 60 ? "HIGH" : freq > 25 ? "MODERATE" : "LOW") as "HIGH" | "MODERATE" | "LOW",
        searchVolume: null,
        searchVolumeProvenance: "UNAVAILABLE" as const,
        freshness,
        provenance: "ACTUAL_DATA" as SignalProvenance,
        observedAt: searchRes.fetchedAt,
      };
    })
    .sort((a, b) => b.occurrenceCount - a.occurrenceCount)
    .slice(0, 20);

  return {
    query: query.query,
    marketplace: query.marketplace,
    totalListingsObserved: items.length,
    averageObservedPrice: averagePrice,
    demandProxyScore: Math.min(95, Math.round(items.length * 4)),
    topKeywords,
    clusters: buildDeterministicKeywordClusters(topKeywords),
    tags: [],
    freshness,
    provenance: "ACTUAL_DATA",
    limitations: [
      "Exact monthly search volume is unavailable without licensed third-party volume feeds. SellerSalt uses observed marketplace listing prevalence.",
    ],
  };
}
