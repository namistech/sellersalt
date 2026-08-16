import type {
  ShopSnapshotData,
  ShopDeltas,
  ShopVelocity,
  TrackingHealthState,
  ListingSnapshotData,
  TrackingAlertItem,
  TrackingEventType,
  AlertSeverity,
} from "@/types/tracking";

export interface SnapshotLike {
  totalSales: number | null;
  reviewCount: number;
  activeListings: number;
  numFavorers?: number | null;
  capturedAt: Date | string;
}

export interface ListingSnapshotLike {
  price: number | null;
  currency?: string | null;
  quantity?: number | null;
  numFavorers?: number | null;
  state?: string | null;
  capturedAt: Date | string;
}

/**
 * Calculates deterministic deltas across time windows from stored shop snapshots.
 */
export function calculateShopDeltas(snapshots: SnapshotLike[]): ShopDeltas {
  if (snapshots.length < 2) {
    return {
      salesDeltaToday: null,
      salesDelta7d: null,
      salesDelta30d: null,
      listingDelta: null,
      reviewDelta: null,
    };
  }

  // Sort ascending by capturedAt
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime()
  );

  const latest = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2];

  // Latest single delta
  const salesDeltaToday =
    latest.totalSales !== null && previous.totalSales !== null
      ? Math.max(0, latest.totalSales - previous.totalSales)
      : null;

  const listingDelta = latest.activeListings - previous.activeListings;
  const reviewDelta = latest.reviewCount - previous.reviewCount;

  // 7-day delta
  const sevenDaysAgo = new Date(new Date(latest.capturedAt).getTime() - 7 * 24 * 60 * 60 * 1000);
  const snap7d = sorted.find((s) => new Date(s.capturedAt) >= sevenDaysAgo) || sorted[0];
  const salesDelta7d =
    latest.totalSales !== null && snap7d.totalSales !== null
      ? Math.max(0, latest.totalSales - snap7d.totalSales)
      : null;

  // 30-day delta
  const thirtyDaysAgo = new Date(new Date(latest.capturedAt).getTime() - 30 * 24 * 60 * 60 * 1000);
  const snap30d = sorted.find((s) => new Date(s.capturedAt) >= thirtyDaysAgo) || sorted[0];
  const salesDelta30d =
    latest.totalSales !== null && snap30d.totalSales !== null
      ? Math.max(0, latest.totalSales - snap30d.totalSales)
      : null;

  return {
    salesDeltaToday,
    salesDelta7d,
    salesDelta30d,
    listingDelta,
    reviewDelta,
  };
}

/**
 * Calculates deterministic estimated daily sales velocity from historical snapshots.
 * Provenance: [ESTIMATED]
 */
export function calculateShopVelocity(snapshots: SnapshotLike[]): ShopVelocity {
  if (snapshots.length < 2) {
    return {
      estDailySales: 0,
      velocityGrowthRate: 0,
      isSpike: false,
    };
  }

  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime()
  );

  const oldest = sorted[0];
  const latest = sorted[sorted.length - 1];

  const timeDiffMs = new Date(latest.capturedAt).getTime() - new Date(oldest.capturedAt).getTime();
  const daysDiff = Math.max(1, timeDiffMs / (1000 * 60 * 60 * 24));

  const totalSalesGain =
    latest.totalSales !== null && oldest.totalSales !== null
      ? Math.max(0, latest.totalSales - oldest.totalSales)
      : 0;

  const estDailySales = Number((totalSalesGain / daysDiff).toFixed(1));

  // Check recent 7-day velocity acceleration vs total historical baseline
  let velocityGrowthRate = 0;
  let isSpike = false;

  const previous = sorted[sorted.length - 2];
  const recentDaysDiff = Math.max(
    1,
    (new Date(latest.capturedAt).getTime() - new Date(previous.capturedAt).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  const recentDailySales =
    latest.totalSales !== null && previous.totalSales !== null
      ? Math.max(0, (latest.totalSales - previous.totalSales) / recentDaysDiff)
      : 0;

  if (estDailySales > 0) {
    velocityGrowthRate = Number((((recentDailySales - estDailySales) / estDailySales) * 100).toFixed(1));
    // Spike: >300% historical baseline with at least 5 units
    if (recentDailySales >= estDailySales * 3.0 && recentDailySales >= 5) {
      isSpike = true;
    }
  } else if (recentDailySales >= 10) {
    isSpike = true;
  }

  return {
    estDailySales,
    velocityGrowthRate,
    isSpike,
  };
}

/**
 * Evaluates snapshot tracking health.
 */
export function evaluateTrackingHealth(
  latestSnapshot: { capturedAt: Date | string } | null,
  snapshotCount: number
): TrackingHealthState {
  if (!latestSnapshot || snapshotCount < 2) {
    return "COLD";
  }

  const ageMs = Date.now() - new Date(latestSnapshot.capturedAt).getTime();
  const hoursOld = ageMs / (1000 * 60 * 60);

  if (hoursOld <= 26) {
    return "HEALTHY";
  }
  return "STALE";
}

/**
 * Calculates listing price and favorite deltas from listing snapshots.
 */
export function calculateListingDeltas(snapshots: ListingSnapshotLike[]) {
  if (snapshots.length < 2) {
    return {
      priceDelta: null,
      favorersDelta: null,
    };
  }

  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime()
  );

  const latest = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2];

  const priceDelta =
    latest.price !== null && previous.price !== null
      ? Number((latest.price - previous.price).toFixed(2))
      : null;

  const favorersDelta =
    latest.numFavorers !== null && previous.numFavorers !== null
      ? (latest.numFavorers || 0) - (previous.numFavorers || 0)
      : null;

  return {
    priceDelta,
    favorersDelta,
  };
}

/**
 * Evaluates alert conditions for shop surveillance.
 */
export function evaluateShopAlerts(
  shopExternalId: string,
  shopName: string,
  organizationId: string,
  snapshots: SnapshotLike[],
  recentAlertTimestamps: Map<string, number> = new Map()
): Partial<TrackingAlertItem>[] {
  const alerts: Partial<TrackingAlertItem>[] = [];
  if (snapshots.length < 2) return alerts;

  const deltas = calculateShopDeltas(snapshots);
  const velocity = calculateShopVelocity(snapshots);

  const cooldownMs = 24 * 60 * 60 * 1000; // 24-hour alert deduplication cooldown

  // 1. Breakout Sales Spike Alert
  if (velocity.isSpike && (deltas.salesDeltaToday || 0) >= 5) {
    const dedupKey = `${shopExternalId}_SALES_SPIKE`;
    const lastAlert = recentAlertTimestamps.get(dedupKey) || 0;
    if (Date.now() - lastAlert > cooldownMs) {
      alerts.push({
        organizationId,
        targetType: "SHOP",
        targetId: shopExternalId,
        targetTitle: shopName,
        eventType: "SALES_SPIKE",
        severity: "CRITICAL",
        message: `Competitor ${shopName} experienced a breakout sales spike (+${deltas.salesDeltaToday} sales today, ${velocity.velocityGrowthRate}% above historical average).`,
        previousValue: velocity.estDailySales,
        currentValue: deltas.salesDeltaToday || 0,
        delta: (deltas.salesDeltaToday || 0) - velocity.estDailySales,
      });
    }
  }

  // 2. Rapid Catalog Expansion Alert
  if ((deltas.listingDelta || 0) >= 15) {
    const dedupKey = `${shopExternalId}_CATALOG_SURGE`;
    const lastAlert = recentAlertTimestamps.get(dedupKey) || 0;
    if (Date.now() - lastAlert > cooldownMs) {
      alerts.push({
        organizationId,
        targetType: "SHOP",
        targetId: shopExternalId,
        targetTitle: shopName,
        eventType: "CATALOG_SURGE",
        severity: "WARNING",
        message: `Competitor ${shopName} rapidly added ${deltas.listingDelta} new active listings to their catalog.`,
        currentValue: deltas.listingDelta || 0,
        delta: deltas.listingDelta || 0,
      });
    }
  }

  return alerts;
}
