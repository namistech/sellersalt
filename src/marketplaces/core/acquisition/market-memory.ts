/**
 * SellerSalt Market Memory & Intelligence Snapshot Layer
 * 
 * Retains, indexes, and retrieves structured domain intelligence snapshots
 * (Product, Keyword, Seller, Category, Niche, Radar) to accumulate a proprietary
 * market intelligence memory over time without re-scraping from scratch on every lookup.
 * 
 * ARCHITECTURAL RULE:
 * - Retains explicit lineage to underlying observation sample and timestamps.
 * - Never returns a stale snapshot as "live" without transparent freshness labeling.
 */

import type { MarketplaceId } from "../types";
import { evaluateFreshness, type FreshnessEvaluation } from "./freshness";

export type MarketSnapshotType = "PRODUCT" | "KEYWORD" | "SELLER" | "CATEGORY" | "NICHE" | "RADAR";

export interface MarketIntelligenceSnapshot<T = any> {
  id: string;
  snapshotType: MarketSnapshotType;
  marketplace: MarketplaceId;
  key: string; // e.g. "ceramic-mug" or "shop:potterystudio"
  sampleSize: number;
  periodStart: Date;
  periodEnd: Date;
  derivedMetrics: T;
  confidence: number;
  freshness: FreshnessEvaluation;
  limitations: string[];
  lineageSummary: {
    liveCount: number;
    historicalCount: number;
    sourcesUsed: string[];
  };
  savedAt: Date;
}

// In-memory fast market memory registry
const inMemoryMarketSnapshots = new Map<string, MarketIntelligenceSnapshot>();

function buildMemoryKey(type: MarketSnapshotType, marketplace: string, key: string): string {
  return `${type}:${marketplace.toLowerCase()}:${key.toLowerCase().trim()}`;
}

export class MarketMemoryEngine {
  /**
   * Saves a derived intelligence snapshot to market memory.
   */
  public static saveSnapshot<T = any>(params: {
    snapshotType: MarketSnapshotType;
    marketplace: MarketplaceId;
    key: string;
    sampleSize: number;
    derivedMetrics: T;
    confidence: number;
    periodStart?: Date;
    periodEnd?: Date;
    limitations?: string[];
    lineageSummary?: {
      liveCount: number;
      historicalCount: number;
      sourcesUsed: string[];
    };
  }): MarketIntelligenceSnapshot<T> {
    const memKey = buildMemoryKey(params.snapshotType, params.marketplace, params.key);
    const now = new Date();
    const id = `mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const snapshot: MarketIntelligenceSnapshot<T> = {
      id,
      snapshotType: params.snapshotType,
      marketplace: params.marketplace,
      key: params.key,
      sampleSize: params.sampleSize,
      periodStart: params.periodStart || now,
      periodEnd: params.periodEnd || now,
      derivedMetrics: params.derivedMetrics,
      confidence: params.confidence,
      freshness: evaluateFreshness(now, "general"),
      limitations: params.limitations || [],
      lineageSummary: params.lineageSummary || {
        liveCount: params.sampleSize,
        historicalCount: 0,
        sourcesUsed: ["PUBLIC_WEB"],
      },
      savedAt: now,
    };

    inMemoryMarketSnapshots.set(memKey, snapshot);
    return snapshot;
  }

  /**
   * Retrieves a cached intelligence snapshot if available.
   */
  public static getSnapshot<T = any>(
    snapshotType: MarketSnapshotType,
    marketplace: MarketplaceId,
    key: string
  ): MarketIntelligenceSnapshot<T> | null {
    const memKey = buildMemoryKey(snapshotType, marketplace, key);
    const item = inMemoryMarketSnapshots.get(memKey);
    if (!item) return null;

    // Refresh evaluated freshness relative to now
    return {
      ...item,
      freshness: evaluateFreshness(item.savedAt, "general"),
    } as MarketIntelligenceSnapshot<T>;
  }

  /**
   * Lists stored snapshots filtered by type and marketplace.
   */
  public static listSnapshots(
    snapshotType?: MarketSnapshotType,
    marketplace?: MarketplaceId,
    limit = 20
  ): MarketIntelligenceSnapshot[] {
    let all = Array.from(inMemoryMarketSnapshots.values());

    if (snapshotType) {
      all = all.filter((s) => s.snapshotType === snapshotType);
    }
    if (marketplace) {
      all = all.filter((s) => s.marketplace === marketplace);
    }

    return all.sort((a, b) => b.savedAt.getTime() - a.savedAt.getTime()).slice(0, limit);
  }

  /**
   * Clears the in-memory market memory (primarily for testing).
   */
  public static clear(): void {
    inMemoryMarketSnapshots.clear();
  }
}
