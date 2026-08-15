import { fetchJson } from "./http";

// Frontend Data/Service Adapter for the real Prospect backend
// (prisma.Prospect via /api/prospects, /api/prospects/[id]) — see
// docs/architecture/system.md "Service layer terminology" and this
// project's Wave 4 conventions: no mock data here, this wraps the
// already-real, already-shipped Discover backend.

export type ProspectStatus = "PENDING_REVIEW" | "SHORTLISTED" | "CONTACTED" | "REJECTED";

export interface ProspectRow {
  id: string;
  searchConfigId: string;
  keyword: string;
  shopExternalId: string;
  shopName: string;
  shopUrl: string;
  shopIconUrl: string | null;
  shopAgeMonths: number;
  reviewCount: number;
  activeListings: number;
  reviewRatio: number;
  reviewVelocity: number;
  totalSales: number | null;
  reviewAverage: number | null;
  numFavorers: number | null;
  avgSellingRatio: number | null;
  estDailySales: number | null;
  listingTitle: string;
  listingUrl: string;
  listingImageUrl: string | null;
  price: number;
  status: ProspectStatus;
  isFavorite: boolean;
  createdAt: string;
}

export async function fetchProspects(opts?: { favoriteOnly?: boolean }): Promise<ProspectRow[]> {
  const qs = opts?.favoriteOnly ? "?favorite=true" : "";
  const data = await fetchJson<{ prospects: ProspectRow[] }>(`/api/prospects${qs}`);
  return data.prospects ?? [];
}

export async function updateProspect(id: string, patch: { isFavorite?: boolean; status?: ProspectStatus }): Promise<void> {
  await fetchJson<{ ok: true }>(`/api/prospects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}
