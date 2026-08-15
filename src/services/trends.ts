import { fetchJson } from "./http";

// Adapter for the real Trends backend (/api/trends) — shops seen across
// 2+ scheduled runs of the same search, first-seen vs. most-recent.

export interface TrendRow {
  shopExternalId: string;
  shopName: string;
  shopUrl: string;
  shopIconUrl: string | null;
  firstTotalSales: number | null;
  lastTotalSales: number | null;
  firstReviewCount: number;
  lastReviewCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  snapshotCount: number;
  salesGrowth: number | null;
  reviewGrowth: number;
}

export async function fetchTrends(): Promise<TrendRow[]> {
  const data = await fetchJson<{ trends: TrendRow[] }>("/api/trends");
  return data.trends ?? [];
}
