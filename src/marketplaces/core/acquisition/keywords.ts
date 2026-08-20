/**
 * SellerSalt Public Keyword Observation & Harvesting Engine
 * 
 * Performs empirical, marketplace-independent keyword research without relying on official keyword APIs.
 * Analyzes live search listing titles, category breadcrumbs, public tags, and frequency distributions.
 * 
 * Rules:
 * 1. NEVER label observed frequency as "monthly search volume" unless backed by a licensed provider.
 * 2. Missing exact search volume is explicitly searchVolume: null with provenance: "UNAVAILABLE".
 * 3. Use precise terminology: "Observed Listing Frequency", "Marketplace Result Density", "SellerSalt Demand Proxy".
 */

import { MarketplaceRegistry, registerAllConnectors } from "../registry";
import { evaluateFreshness, type FreshnessEvaluation } from "./freshness";
import type { MarketplaceId, SignalProvenance } from "../types";
import type { PublicSearchQuery } from "./contracts";

export interface KeywordCluster {
  theme: string;
  keywords: string[];
  totalOccurrences: number;
}

export interface CanonicalKeywordObservation {
  keyword: string;
  marketplace: MarketplaceId;
  occurrenceCount: number;
  listingFrequencyPercent: number;
  observedAveragePrice: number | null;
  demandProxyScore: number;
  competitionProxy: "LOW" | "MODERATE" | "HIGH" | "UNAVAILABLE";
  searchVolume: null;
  searchVolumeProvenance: "UNAVAILABLE";
  freshness: FreshnessEvaluation;
  provenance: SignalProvenance;
  observedAt: Date;
}

export interface KeywordResearchSummary {
  query: string;
  marketplace: MarketplaceId;
  totalListingsObserved: number;
  averageObservedPrice: number | null;
  demandProxyScore: number;
  topKeywords: CanonicalKeywordObservation[];
  clusters: KeywordCluster[];
  tags: Array<{ tag: string; count: number }>;
  freshness: FreshnessEvaluation;
  provenance: SignalProvenance;
  limitations: string[];
}

/**
 * Harvests keyword signals, n-grams, and clusters from marketplace public search results.
 */
export async function harvestPublicMarketplaceKeywords(
  query: PublicSearchQuery & { marketplace: MarketplaceId }
): Promise<KeywordResearchSummary> {
  registerAllConnectors();
  const fetchedAt = new Date();
  const queryTerm = query.query.trim().toLowerCase();

  const publicAdapter = MarketplaceRegistry.tryGetPublicWebAdapter(query.marketplace);
  if (!publicAdapter) {
    const freshness = evaluateFreshness(fetchedAt, "general");
    return {
      query: query.query,
      marketplace: query.marketplace,
      totalListingsObserved: 0,
      averageObservedPrice: null,
      demandProxyScore: 0,
      topKeywords: [],
      clusters: [],
      tags: [],
      freshness,
      provenance: "UNAVAILABLE",
      limitations: [`No public web acquisition adapter available for ${query.marketplace}`],
    };
  }

  // 1. If adapter provides dedicated harvester, invoke it
  if (publicAdapter.harvestPublicKeywords) {
    try {
      const res = await publicAdapter.harvestPublicKeywords(query);
      if (res.success && res.items.length > 0) {
        const harvest = res.items[0];
        const freshness = evaluateFreshness(harvest.fetchedAt, "general");

        const topKeywords: CanonicalKeywordObservation[] = harvest.relatedKeywords.map((k) => ({
          keyword: k.keyword,
          marketplace: query.marketplace,
          occurrenceCount: k.occurrenceCount,
          listingFrequencyPercent: k.listingFrequency,
          observedAveragePrice: harvest.averagePrice,
          demandProxyScore: k.demandProxy,
          competitionProxy:
            k.listingFrequency > 60 ? "HIGH" : k.listingFrequency > 25 ? "MODERATE" : "LOW",
          searchVolume: null,
          searchVolumeProvenance: "UNAVAILABLE",
          freshness,
          provenance: "ACTUAL_DATA",
          observedAt: harvest.fetchedAt,
        }));

        return {
          query: query.query,
          marketplace: query.marketplace,
          totalListingsObserved: harvest.observedListingsCount,
          averageObservedPrice: harvest.averagePrice,
          demandProxyScore: harvest.demandProxyScore,
          topKeywords,
          clusters: buildKeywordClusters(topKeywords.map((k) => k.keyword)),
          tags: harvest.topTags,
          freshness,
          provenance: "ACTUAL_DATA",
          limitations: [
            "Exact monthly search volume is unavailable without licensed third-party volume feeds.",
          ],
        };
      }
    } catch {
      // Fall back to manual search extraction
    }
  }

  // 2. Fallback: Search products and extract n-grams from titles
  const searchRes = await publicAdapter.searchPublicProducts({ ...query, limit: 30 });
  const items = searchRes.items || [];
  const freshness = evaluateFreshness(searchRes.fetchedAt || fetchedAt, "general");

  if (items.length === 0) {
    return {
      query: query.query,
      marketplace: query.marketplace,
      totalListingsObserved: 0,
      averageObservedPrice: null,
      demandProxyScore: 0,
      topKeywords: [],
      clusters: [],
      tags: [],
      freshness,
      provenance: "UNAVAILABLE",
      limitations: [
        `No public listing observations found for "${query.query}" on ${query.marketplace}.`,
      ],
    };
  }

  const wordCounts = new Map<string, number>();
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
    clusters: buildKeywordClusters(topKeywords.map((k) => k.keyword)),
    tags: [],
    freshness,
    provenance: "ACTUAL_DATA",
    limitations: [
      "Exact monthly search volume is unavailable without licensed third-party volume feeds.",
    ],
  };
}

function buildKeywordClusters(keywords: string[]): KeywordCluster[] {
  const clusters: KeywordCluster[] = [];
  const visited = new Set<string>();

  for (const kw of keywords) {
    if (visited.has(kw)) continue;
    const group = keywords.filter((k) => k.includes(kw) || kw.includes(k));
    for (const g of group) visited.add(g);

    clusters.push({
      theme: kw,
      keywords: group,
      totalOccurrences: group.length,
    });
  }

  return clusters.slice(0, 5);
}
