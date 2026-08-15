import { fetchJson } from "./http";

// Adapter for the real Dropped-shops backend (/api/inactive) — shops
// that matched a search's previous scheduled run but not its most
// recent one.

export interface DroppedShopRow {
  searchConfigName: string;
  shopExternalId: string;
  shopName: string;
  shopUrl: string;
  shopIconUrl: string | null;
  lastSeenAt: string;
  lastKnownTotalSales: number | null;
  lastKnownReviewCount: number;
}

export async function fetchDroppedShops(): Promise<DroppedShopRow[]> {
  const data = await fetchJson<{ dropped: DroppedShopRow[] }>("/api/inactive");
  return data.dropped ?? [];
}
