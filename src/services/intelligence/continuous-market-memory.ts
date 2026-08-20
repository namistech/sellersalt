/**
 * SellerSalt Continuous Market Memory & Longitudinal Snapshot Engine
 * 
 * Captures, indexes, and maintains immutable longitudinal market state snapshots
 * across queries, categories, niches, and marketplaces.
 * 
 * ARCHITECTURAL RULE:
 * - Append-only time-series memory: historical records are never overwritten.
 * - Minimum observation requirement: n >= 2 snapshots required for historical deltas.
 * - Single snapshot returns INSUFFICIENT_DATA with null deltas.
 */

import type { MarketplaceId, SignalProvenance } from "@/marketplaces/core/types";
import { evaluateFreshness, type FreshnessEvaluation } from "@/marketplaces/core/acquisition/freshness";

export interface MarketPriceDistribution {
  min: number | null;
  p10: number | null;
  p25: number | null;
  median: number | null;
  p75: number | null;
  p90: number | null;
  max: number | null;
  average: number | null;
}

export interface DetailedMarketSnapshot {
  id: string;
  snapshotKey: string; // e.g. "query:ceramic-mug" or "cat:etsy:home-living"
  marketplace: MarketplaceId | "all";
  query?: string;
  category?: string;
  observedProductCount: number;
  observedSellerCount: number;
  priceDistribution: MarketPriceDistribution;
  reviewDistribution: {
    medianReviews: number | null;
    p75Reviews: number | null;
    maxReviews: number | null;
  };
  ratingDistribution: {
    averageRating: number | null;
    medianRating: number | null;
  };
  sellerConcentrationHHI: number | null; // Herfindahl-Hirschman Index
  topKeywords: Array<{ term: string; prevalencePercent: number }>;
  topSellers: Array<{ sellerName: string; catalogSharePercent: number }>;
  opportunitySummary: {
    averageOpportunityScore: number | null;
    highOpportunityCount: number;
    strongCandidateCount: number;
  };
  fieldCompletenessPercent: number;
  freshness: FreshnessEvaluation;
  confidence: number;
  provenance: SignalProvenance;
  sourceObservationIds?: string[];
  organizationId?: string;
  capturedAt: Date;
}

// In-memory append-only time-series store for market snapshots
const snapshotStore = new Map<string, DetailedMarketSnapshot[]>();

export class ContinuousMarketMemoryEngine {
  /**
   * Captures and appends a new immutable market intelligence snapshot.
   */
  public static captureSnapshot(params: Omit<DetailedMarketSnapshot, "id" | "capturedAt" | "freshness">): DetailedMarketSnapshot {
    const now = new Date();
    const id = `snap:${Date.now()}:${Math.random().toString(36).substring(2, 7)}`;
    const freshness = evaluateFreshness(now, "general");

    const fullSnapshot: DetailedMarketSnapshot = {
      ...params,
      id,
      freshness,
      capturedAt: now,
    };

    const key = `${params.marketplace}:${params.snapshotKey.toLowerCase().trim()}`;
    if (!snapshotStore.has(key)) {
      snapshotStore.set(key, []);
    }

    const list = snapshotStore.get(key)!;
    list.push(fullSnapshot);
    list.sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime());

    return fullSnapshot;
  }

  /**
   * Retrieves the historical snapshot time-series for a given key and marketplace.
   */
  public static getSnapshotHistory(
    snapshotKey: string,
    marketplace: MarketplaceId | "all" = "all",
    limit = 20
  ): DetailedMarketSnapshot[] {
    const key = `${marketplace}:${snapshotKey.toLowerCase().trim()}`;
    const list = snapshotStore.get(key) || [];
    return list.slice(0, limit);
  }

  /**
   * Retrieves the latest snapshot for a given key and marketplace.
   */
  public static getLatestSnapshot(
    snapshotKey: string,
    marketplace: MarketplaceId | "all" = "all"
  ): DetailedMarketSnapshot | null {
    const history = this.getSnapshotHistory(snapshotKey, marketplace, 1);
    return history.length > 0 ? history[0] : null;
  }

  /**
   * Calculates empirical price percentiles from an array of observed prices.
   */
  public static computePriceDistribution(prices: number[]): MarketPriceDistribution {
    const valid = prices.filter((p) => typeof p === "number" && !isNaN(p) && p > 0).sort((a, b) => a - b);
    if (valid.length === 0) {
      return {
        min: null,
        p10: null,
        p25: null,
        median: null,
        p75: null,
        p90: null,
        max: null,
        average: null,
      };
    }

    const min = valid[0];
    const max = valid[valid.length - 1];
    const average = parseFloat((valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(2));

    const getPercentile = (p: number) => {
      const idx = Math.floor((p / 100) * (valid.length - 1));
      return parseFloat(valid[idx].toFixed(2));
    };

    return {
      min: parseFloat(min.toFixed(2)),
      p10: getPercentile(10),
      p25: getPercentile(25),
      median: getPercentile(50),
      p75: getPercentile(75),
      p90: getPercentile(90),
      max: parseFloat(max.toFixed(2)),
      average,
    };
  }

  /**
   * Clears in-memory snapshot store (for test suite isolation).
   */
  public static clearStore(): void {
    snapshotStore.clear();
  }
}
