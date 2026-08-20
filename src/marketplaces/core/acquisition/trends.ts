/**
 * SellerSalt Longitudinal Observation & Trend Intelligence Foundation
 * 
 * Computes deterministic time-series trends (price deltas, review acceleration,
 * persistence, catalog movements) exclusively from genuine repeated observations.
 * 
 * ZERO FABRICATION RULE:
 * - If only 1 observation exists, historical growth is strictly null.
 * - Never synthesizes a timeline or manufactures historical data points.
 */

import { prisma } from "@/lib/db";
import type { MarketplaceId, SignalProvenance } from "../types";

export interface ProductObservationPoint {
  price: number | null;
  reviewCount: number | null;
  rating: number | null;
  favoritesCount: number | null;
  observedAt: Date;
}

export interface LongitudinalProductTrend {
  externalId: string;
  marketplace: MarketplaceId;
  observationCount: number;
  firstObservedAt: Date | null;
  lastObservedAt: Date | null;
  observationSpanDays: number | null;
  priceTrend: {
    initialPrice: number | null;
    currentPrice: number | null;
    priceDelta: number | null; // current - initial
    priceDeltaPercent: number | null; // ((current - initial) / initial) * 100
    isPriceDrop: boolean;
    provenance: SignalProvenance;
  };
  reviewTrend: {
    initialReviews: number | null;
    currentReviews: number | null;
    reviewDelta: number | null;
    monthlyVelocity: number | null; // estimated reviews added per 30 days
    provenance: SignalProvenance;
  };
  persistenceStatus: "NEW" | "PERSISTENT" | "STALE" | "INSUFFICIENT_DATA";
  confidence: number;
}

/**
 * Calculates longitudinal trends from an array of historical observation snapshots.
 */
export function calculateObservationTrendsFromPoints(
  externalId: string,
  marketplace: MarketplaceId,
  observations: ProductObservationPoint[]
): LongitudinalProductTrend {
  if (!observations || observations.length === 0) {
    return {
      externalId,
      marketplace,
      observationCount: 0,
      firstObservedAt: null,
      lastObservedAt: null,
      observationSpanDays: null,
      priceTrend: {
        initialPrice: null,
        currentPrice: null,
        priceDelta: null,
        priceDeltaPercent: null,
        isPriceDrop: false,
        provenance: "UNAVAILABLE",
      },
      reviewTrend: {
        initialReviews: null,
        currentReviews: null,
        reviewDelta: null,
        monthlyVelocity: null,
        provenance: "UNAVAILABLE",
      },
      persistenceStatus: "INSUFFICIENT_DATA",
      confidence: 0,
    };
  }

  // Sort chronologically ascending
  const sorted = [...observations].sort(
    (a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime()
  );

  const first = sorted[0];
  const latest = sorted[sorted.length - 1];
  const firstTime = new Date(first.observedAt).getTime();
  const latestTime = new Date(latest.observedAt).getTime();
  const spanDays = Math.max(0, (latestTime - firstTime) / (86400 * 1000));

  // Single observation: zero fabrication of delta
  if (sorted.length === 1 || spanDays === 0) {
    return {
      externalId,
      marketplace,
      observationCount: 1,
      firstObservedAt: first.observedAt,
      lastObservedAt: latest.observedAt,
      observationSpanDays: 0,
      priceTrend: {
        initialPrice: latest.price,
        currentPrice: latest.price,
        priceDelta: null,
        priceDeltaPercent: null,
        isPriceDrop: false,
        provenance: "ACTUAL_DATA",
      },
      reviewTrend: {
        initialReviews: latest.reviewCount,
        currentReviews: latest.reviewCount,
        reviewDelta: null,
        monthlyVelocity: null,
        provenance: "ACTUAL_DATA",
      },
      persistenceStatus: "NEW",
      confidence: 50,
    };
  }

  // Multiple observations: calculate genuine empirical deltas
  let priceDelta: number | null = null;
  let priceDeltaPercent: number | null = null;
  let isPriceDrop = false;

  if (first.price !== null && latest.price !== null && first.price > 0) {
    priceDelta = parseFloat((latest.price - first.price).toFixed(2));
    priceDeltaPercent = parseFloat((((latest.price - first.price) / first.price) * 100).toFixed(1));
    isPriceDrop = priceDelta < 0;
  }

  let reviewDelta: number | null = null;
  let monthlyVelocity: number | null = null;

  if (first.reviewCount !== null && latest.reviewCount !== null) {
    reviewDelta = Math.max(0, latest.reviewCount - first.reviewCount);
    if (spanDays > 0) {
      monthlyVelocity = parseFloat(((reviewDelta / spanDays) * 30.44).toFixed(1));
    }
  }

  const ageDaysSinceLatest = (Date.now() - latestTime) / (86400 * 1000);
  const persistenceStatus: LongitudinalProductTrend["persistenceStatus"] =
    ageDaysSinceLatest > 30 ? "STALE" : spanDays >= 7 ? "PERSISTENT" : "NEW";

  const confidence = Math.min(95, Math.round(50 + sorted.length * 10 + Math.min(30, spanDays * 2)));

  return {
    externalId,
    marketplace,
    observationCount: sorted.length,
    firstObservedAt: first.observedAt,
    lastObservedAt: latest.observedAt,
    observationSpanDays: parseFloat(spanDays.toFixed(1)),
    priceTrend: {
      initialPrice: first.price,
      currentPrice: latest.price,
      priceDelta,
      priceDeltaPercent,
      isPriceDrop,
      provenance: "ACTUAL_DATA",
    },
    reviewTrend: {
      initialReviews: first.reviewCount,
      currentReviews: latest.reviewCount,
      reviewDelta,
      monthlyVelocity,
      provenance: "ACTUAL_DATA",
    },
    persistenceStatus,
    confidence,
  };
}

/**
 * Loads historical observations from PostgreSQL for a given listing and calculates trends.
 */
export async function computeListingTrendsFromDatabase(
  externalId: string,
  marketplace: MarketplaceId,
  organizationId?: string
): Promise<LongitudinalProductTrend> {
  try {
    const listingWatch = organizationId
      ? await prisma.listingWatch.findUnique({
          where: {
            organizationId_listingExternalId: {
              organizationId,
              listingExternalId: externalId,
            },
          },
          include: {
            snapshots: {
              orderBy: { capturedAt: "asc" },
            },
          },
        })
      : await prisma.listingWatch.findFirst({
          where: { listingExternalId: externalId },
          include: {
            snapshots: {
              orderBy: { capturedAt: "asc" },
            },
          },
        });

    if (listingWatch && listingWatch.snapshots.length > 0) {
      const points: ProductObservationPoint[] = listingWatch.snapshots.map((s) => ({
        price: s.price,
        reviewCount: null,
        rating: null,
        favoritesCount: s.numFavorers,
        observedAt: s.capturedAt,
      }));
      return calculateObservationTrendsFromPoints(externalId, marketplace, points);
    }

    // Fall back to Prospects records
    const prospects = await prisma.prospect.findMany({
      where: {
        listingExternalId: externalId,
        ...(organizationId ? { organizationId } : {}),
      },
      orderBy: { createdAt: "asc" },
    });

    if (prospects.length > 0) {
      const points: ProductObservationPoint[] = prospects.map((p) => ({
        price: p.price,
        reviewCount: p.reviewCount,
        rating: p.reviewAverage,
        favoritesCount: p.numFavorers,
        observedAt: p.createdAt,
      }));
      return calculateObservationTrendsFromPoints(externalId, marketplace, points);
    }

    return calculateObservationTrendsFromPoints(externalId, marketplace, []);
  } catch (err) {
    return calculateObservationTrendsFromPoints(externalId, marketplace, []);
  }
}
