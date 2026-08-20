/**
 * SellerSalt Longitudinal Intelligence Engine
 * 
 * Computes deterministic multi-snapshot historical intelligence, price deltas,
 * review velocities, catalog growth, and keyword momentum from persistent observation series.
 * 
 * ZERO-FABRICATION RULE:
 * - Minimum observation count requirement: n >= 2 separated snapshots required for deltas.
 * - For n <= 1 observations, deltas and velocity remain strictly null.
 * - Never converts absence of historical records into 0% change.
 */

import { prisma } from "@/lib/db";
import type { MarketplaceId } from "../types";

export interface ProductLongitudinalIntelligence {
  externalId: string;
  marketplace: MarketplaceId;
  hasLongitudinalData: boolean;
  observationCount: number;
  firstObservedAt: Date;
  lastObservedAt: Date;
  daysObserved: number;
  priceDelta: number | null;
  priceDeltaPercent: number | null;
  reviewVelocityDaily: number | null; // delta reviews / days
  reviewCountDelta: number | null;
  ratingDrift: number | null;
  persistenceTier: "NEW" | "PERSISTENT" | "VOLATILE" | "STALE";
  snapshotsSummary: Array<{
    observedAt: Date;
    price: number | null;
    rating: number | null;
    reviewCount: number | null;
  }>;
}

export interface SellerLongitudinalIntelligence {
  sellerName: string;
  marketplace: MarketplaceId;
  hasLongitudinalData: boolean;
  observationCount: number;
  firstObservedAt: Date;
  lastObservedAt: Date;
  catalogDelta: number | null;
  reviewGrowthDelta: number | null;
  newProductsCount: number;
  disappearedProductsCount: number;
}

export interface CategoryLongitudinalIntelligence {
  categoryPath: string[];
  marketplace: MarketplaceId;
  hasLongitudinalData: boolean;
  observationCount: number;
  medianPriceShift: number | null;
  sampleCountDelta: number | null;
}

export type KeywordMomentumStatus = "RISING" | "STABLE" | "DECLINING" | "INSUFFICIENT_DATA";

export class LongitudinalIntelligenceEngine {
  /**
   * Computes longitudinal intelligence for a specific product from persistent observation snapshots.
   */
  public static async evaluateProduct(
    externalId: string,
    marketplace: MarketplaceId,
    organizationId?: string
  ): Promise<ProductLongitudinalIntelligence> {
    const now = new Date();

    try {
      const observation = await prisma.productObservation.findFirst({
        where: {
          marketplace,
          externalId,
          ...(organizationId ? { organizationId } : {}),
        },
        include: {
          snapshots: {
            orderBy: { observedAt: "asc" },
          },
        },
      });

      if (!observation || observation.snapshots.length <= 1) {
        return {
          externalId,
          marketplace,
          hasLongitudinalData: false,
          observationCount: observation?.snapshots.length ?? 0,
          firstObservedAt: observation?.observedAt ?? now,
          lastObservedAt: observation?.observedAt ?? now,
          daysObserved: 0,
          priceDelta: null,
          priceDeltaPercent: null,
          reviewVelocityDaily: null,
          reviewCountDelta: null,
          ratingDrift: null,
          persistenceTier: "NEW",
          snapshotsSummary: (observation?.snapshots || []).map((s) => ({
            observedAt: s.observedAt,
            price: s.price,
            rating: s.rating,
            reviewCount: s.reviewCount,
          })),
        };
      }

      const snapshots = observation.snapshots;
      const first = snapshots[0];
      const last = snapshots[snapshots.length - 1];

      const durationMs = last.observedAt.getTime() - first.observedAt.getTime();
      const daysObserved = Math.max(0.01, durationMs / (1000 * 60 * 60 * 24));

      // Calculate price delta
      let priceDelta: number | null = null;
      let priceDeltaPercent: number | null = null;
      if (first.price !== null && last.price !== null) {
        priceDelta = parseFloat((last.price - first.price).toFixed(2));
        if (first.price > 0) {
          priceDeltaPercent = parseFloat(((priceDelta / first.price) * 100).toFixed(1));
        }
      }

      // Calculate review velocity
      let reviewCountDelta: number | null = null;
      let reviewVelocityDaily: number | null = null;
      if (first.reviewCount !== null && last.reviewCount !== null) {
        reviewCountDelta = last.reviewCount - first.reviewCount;
        if (daysObserved >= 1) {
          reviewVelocityDaily = parseFloat((reviewCountDelta / daysObserved).toFixed(2));
        }
      }

      // Calculate rating drift
      let ratingDrift: number | null = null;
      if (first.rating !== null && last.rating !== null) {
        ratingDrift = parseFloat((last.rating - first.rating).toFixed(2));
      }

      // Determine persistence tier
      let persistenceTier: "NEW" | "PERSISTENT" | "VOLATILE" | "STALE" = "PERSISTENT";
      const daysSinceLast = (now.getTime() - last.observedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLast > 30) {
        persistenceTier = "STALE";
      } else if (priceDeltaPercent !== null && Math.abs(priceDeltaPercent) >= 20) {
        persistenceTier = "VOLATILE";
      } else if (daysObserved < 3) {
        persistenceTier = "NEW";
      }

      return {
        externalId,
        marketplace,
        hasLongitudinalData: true,
        observationCount: snapshots.length,
        firstObservedAt: first.observedAt,
        lastObservedAt: last.observedAt,
        daysObserved: parseFloat(daysObserved.toFixed(1)),
        priceDelta,
        priceDeltaPercent,
        reviewVelocityDaily,
        reviewCountDelta,
        ratingDrift,
        persistenceTier,
        snapshotsSummary: snapshots.map((s) => ({
          observedAt: s.observedAt,
          price: s.price,
          rating: s.rating,
          reviewCount: s.reviewCount,
        })),
      };
    } catch {
      return {
        externalId,
        marketplace,
        hasLongitudinalData: false,
        observationCount: 0,
        firstObservedAt: now,
        lastObservedAt: now,
        daysObserved: 0,
        priceDelta: null,
        priceDeltaPercent: null,
        reviewVelocityDaily: null,
        reviewCountDelta: null,
        ratingDrift: null,
        persistenceTier: "NEW",
        snapshotsSummary: [],
      };
    }
  }

  /**
   * Evaluates longitudinal momentum for a keyword across historical observations.
   */
  public static async evaluateKeywordMomentum(
    keyword: string,
    marketplace: MarketplaceId,
    organizationId?: string
  ): Promise<{
    keyword: string;
    marketplace: MarketplaceId;
    momentum: KeywordMomentumStatus;
    hasLongitudinalData: boolean;
    observationsCount: number;
    deltaPrevalencePercent: number | null;
  }> {
    const cleanKw = keyword.toLowerCase().trim();

    try {
      const records = await prisma.keywordObservation.findMany({
        where: {
          marketplace,
          keyword: cleanKw,
          ...(organizationId ? { organizationId } : {}),
        },
        orderBy: { observedAt: "asc" },
      });

      if (records.length <= 1) {
        return {
          keyword: cleanKw,
          marketplace,
          momentum: "INSUFFICIENT_DATA",
          hasLongitudinalData: false,
          observationsCount: records.length,
          deltaPrevalencePercent: null,
        };
      }

      const first = records[0];
      const last = records[records.length - 1];
      const deltaPrevalencePercent = parseFloat((last.listingFrequencyPercent - first.listingFrequencyPercent).toFixed(1));

      let momentum: KeywordMomentumStatus = "STABLE";
      if (deltaPrevalencePercent >= 5.0) {
        momentum = "RISING";
      } else if (deltaPrevalencePercent <= -5.0) {
        momentum = "DECLINING";
      }

      return {
        keyword: cleanKw,
        marketplace,
        momentum,
        hasLongitudinalData: true,
        observationsCount: records.length,
        deltaPrevalencePercent,
      };
    } catch {
      return {
        keyword: cleanKw,
        marketplace,
        momentum: "INSUFFICIENT_DATA",
        hasLongitudinalData: false,
        observationsCount: 0,
        deltaPrevalencePercent: null,
      };
    }
  }
}
