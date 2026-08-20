/**
 * SellerSalt — Retention Governance Service
 * 
 * Enforces policy-aware retention boundaries across snapshots, observations, and cached data.
 * Prevents indefinite storage of marketplace data and executes safe cleanup.
 */

import { prisma } from "@/lib/db";
import type { MarketplaceId } from "../types";
import { MarketplaceGovernanceRegistry } from "./registry";
import { getSnapshotRetentionCutoff } from "@/lib/data-retention";

export interface PruneResult {
  shopSnapshotsPruned: number;
  listingSnapshotsPruned: number;
  cutoffDate: Date;
  durationMs: number;
}

export class RetentionGovernanceService {
  /**
   * Calculates the maximum retention cutoff date for a given marketplace.
   */
  public static async getRetentionCutoff(marketplace: MarketplaceId | string): Promise<Date> {
    const policy = MarketplaceGovernanceRegistry.getPolicy(marketplace);
    const maxDays = policy.retentionRules.maxSnapshotRetentionDays;

    if (maxDays && maxDays > 0) {
      return new Date(Date.now() - maxDays * 24 * 60 * 60 * 1000);
    }

    return getSnapshotRetentionCutoff();
  }

  /**
   * Evaluates if a given observation date is past retention expiry.
   */
  public static async isExpired(
    marketplace: MarketplaceId | string,
    observedAt: Date
  ): Promise<boolean> {
    const cutoff = await this.getRetentionCutoff(marketplace);
    return observedAt.getTime() < cutoff.getTime();
  }

  /**
   * Prunes obsolete shop and listing snapshots older than the active retention cutoff.
   */
  public static async pruneExpiredSnapshots(): Promise<PruneResult> {
    const start = Date.now();
    const cutoff = await getSnapshotRetentionCutoff();

    let shopCount = 0;
    let listingCount = 0;

    try {
      const shopRes = await prisma.shopSnapshot.deleteMany({
        where: {
          capturedAt: { lt: cutoff },
        },
      });
      shopCount = shopRes.count;
    } catch {
      // Degrade cleanly if table or DB unavailable
    }

    try {
      const listingRes = await prisma.listingSnapshot.deleteMany({
        where: {
          capturedAt: { lt: cutoff },
        },
      });
      listingCount = listingRes.count;
    } catch {
      // Degrade cleanly
    }

    return {
      shopSnapshotsPruned: shopCount,
      listingSnapshotsPruned: listingCount,
      cutoffDate: cutoff,
      durationMs: Date.now() - start,
    };
  }
}
