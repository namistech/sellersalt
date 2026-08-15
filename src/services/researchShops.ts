import { fetchJson } from "./http";

// Adapter for RESEARCH Shops only — a competitor/discovered marketplace
// entity, explorable cold without connecting the user's own store
// (backed by Prisma's ShopWatch/ShopSnapshot + live connector calls via
// /api/shops/*). This is deliberately NOT named `shops.ts`: a future
// Connected Shop adapter (the user's own authenticated
// SellerChannel — OAuth, write scope, belongs to the org) is a
// structurally different concept and must never share this module or a
// generic "Shop" type. See docs/design/information-architecture-v1.md
// "Critical Shop Distinction."

export interface ResearchShopTopListing {
  listingExternalId: string;
  title: string;
  price: number;
  url: string;
  imageUrl?: string;
}

export interface ResearchShopSnapshot {
  capturedAt: string;
  totalSales: number | null;
  reviewCount: number;
  activeListings: number;
}

export interface ResearchShopDetail {
  shop: {
    shopExternalId: string;
    shopName: string;
    shopUrl: string;
    shopIconUrl: string | null;
    shopBannerUrl?: string;
    shopAgeMonths: number;
    reviewCount: number;
    reviewAverage: number | null;
    activeListings: number;
    totalSales: number | null;
    numFavorers: number | null;
    avgSellingRatio: number;
    estDailySales: number;
    badges: string[];
  };
  keywords: Array<{ term: string; count: number }>;
  topListings: ResearchShopTopListing[];
  watch: { isActive: boolean; startedAt: string; snapshots: ResearchShopSnapshot[] } | null;
}

export interface TrackedResearchShop {
  shopExternalId: string;
  shopName: string;
  trackingSince: string;
  latestSnapshot: {
    capturedAt: string;
    totalSales: number | null;
    reviewCount: number;
    activeListings: number;
  } | null;
}

/** Wraps POST /api/shops/resolve — pastes a shop URL, resolves it to a shopExternalId via the live connector. */
export async function resolveResearchShopUrl(url: string): Promise<{ shopExternalId: string; shopName: string }> {
  return fetchJson("/api/shops/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
}

/** Wraps GET /api/shops/[shopExternalId] — live stats + extractLongTailTerms() keywords + historical snapshots, untouched. */
export async function fetchResearchShop(shopExternalId: string): Promise<ResearchShopDetail> {
  return fetchJson(`/api/shops/${shopExternalId}`);
}

export async function fetchTrackedResearchShops(): Promise<TrackedResearchShop[]> {
  const data = await fetchJson<{ shops: TrackedResearchShop[] }>("/api/shops/tracked");
  return data.shops ?? [];
}

export async function startTrackingResearchShop(shopExternalId: string): Promise<void> {
  await fetchJson(`/api/shops/${shopExternalId}/track`, { method: "POST" });
}

export async function stopTrackingResearchShop(shopExternalId: string): Promise<void> {
  await fetchJson(`/api/shops/${shopExternalId}/track`, { method: "DELETE" });
}
