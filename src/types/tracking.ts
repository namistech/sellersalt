/**
 * SellerSalt — Tracking Engine & Historical Intelligence Domain Contracts
 */

export type TrackingHealthState = "HEALTHY" | "STALE" | "COLD";

export interface ShopSnapshotData {
  id: string;
  totalSales: number | null;
  reviewCount: number;
  reviewAverage: number | null;
  activeListings: number;
  numFavorers: number | null;
  capturedAt: string;
}

export interface ShopDeltas {
  salesDelta6h?: number | null;
  salesDelta24h?: number | null;
  salesDeltaToday: number | null;
  salesDelta7d: number | null;
  salesDelta30d: number | null;
  listingDelta: number | null;
  reviewDelta: number | null;
}

export interface ShopVelocity {
  estDailySales: number;           // [ESTIMATED] Deterministic sales per day
  velocityGrowthRate: number;      // % acceleration vs prior window
  isSpike: boolean;                // [SELLERSALT SCORE] >300% historical baseline
}

export interface TrackedShopSummary {
  id: string;
  shopExternalId: string;
  shopName: string;
  trackingSince: string;
  isActive: boolean;
  latestSnapshot: ShopSnapshotData | null;
  deltas: ShopDeltas;
  velocity: ShopVelocity;
  health: TrackingHealthState;
  snapshotCount: number;
}

export interface ListingSnapshotData {
  id: string;
  price: number | null;
  currency: string | null;
  quantity: number | null;
  numFavorers: number | null;
  state: string | null;
  capturedAt: string;
}

export interface TrackedListingSummary {
  id: string;
  listingExternalId: string;
  title: string;
  shopExternalId?: string | null;
  shopName?: string | null;
  url?: string | null;
  imageUrl?: string | null;
  currentPrice: number | null;
  currency: string | null;
  quantity: number | null;
  numFavorers: number | null;
  state: string | null;
  trackingSince: string;
  isActive: boolean;
  latestSnapshot: ListingSnapshotData | null;
  priceDelta: number | null;
  favorersDelta: number | null;
  snapshotCount: number;
  health: TrackingHealthState;
}

export type TrackingEventType =
  | "SALES_SPIKE"
  | "VELOCITY_ACCELERATION"
  | "PRICE_DROP"
  | "CATALOG_SURGE"
  | "INVENTORY_DEPLETED";

export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface TrackingAlertItem {
  id: string;
  organizationId: string;
  targetType: "SHOP" | "LISTING";
  targetId: string;
  targetTitle: string;
  eventType: TrackingEventType;
  severity: AlertSeverity;
  message: string;
  previousValue: number | null;
  currentValue: number | null;
  delta: number | null;
  createdAt: string;
}

export interface TrackingQuotaInfo {
  trackedShopsCount: number;
  maxTrackedShops: number;
  trackedListingsCount: number;
  maxTrackedListings: number;
  isShopsQuotaReached: boolean;
  isListingsQuotaReached: boolean;
  planName: string;
}
