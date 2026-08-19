import { fetchJson } from "./http";
import type {
  CategoryIntelligenceProfile,
  CategorySearchResponse,
} from "@/types/category-hunting";
import type { EtsyRawTaxonomyNode, FlattenedTaxonomyNode } from "@/connectors/etsy/taxonomy";
import type { CapabilityUnavailable } from "@/marketplaces/core/availability";

interface MarketplaceFanOutResult<T> {
  marketplace: string;
  status: "AVAILABLE" | "PARTIAL" | "UNAVAILABLE" | "NOT_IMPLEMENTED";
  data?: T;
  message?: string;
}

/** Single-marketplace category tree. Defaults to "etsy" server-side when
 * `marketplace` is omitted. When the marketplace/capability isn't wired up
 * yet, the API returns a structured CapabilityUnavailable instead of an
 * empty tree — callers must check for that shape. */
export async function fetchCategoryRoots(marketplace?: string): Promise<
  | { roots: EtsyRawTaxonomyNode[]; totalNodes: number }
  | CapabilityUnavailable
> {
  const qs = marketplace ? `?marketplace=${encodeURIComponent(marketplace)}` : "";
  return fetchJson(`/api/categories${qs}`);
}

/** "All Marketplaces" fan-out — one status-tagged category tree per
 * registered connector, via the same /api/categories route
 * (marketplace=all branches server-side into fetchAllMarketplaceCategoryTree). */
export async function fetchAllMarketplaceCategoryRoots(): Promise<{
  results: MarketplaceFanOutResult<{ roots: EtsyRawTaxonomyNode[]; totalNodes: number }>[];
}> {
  return fetchJson("/api/categories?marketplace=all");
}

export async function searchCategoryTaxonomy(
  query: string
): Promise<CategorySearchResponse> {
  return fetchJson(`/api/categories?search=${encodeURIComponent(query)}`);
}

export async function fetchCategoryDetail(
  taxonomyId: number
): Promise<{ profile: CategoryIntelligenceProfile }> {
  return fetchJson(`/api/categories/${taxonomyId}`);
}

export async function addCategoryToPlanner(
  profile: CategoryIntelligenceProfile
): Promise<{ item: any; isExisting: boolean; message: string }> {
  return fetchJson<{ item: any; isExisting: boolean; message: string }>("/api/planner/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: `Category: ${profile.name}`,
      type: "PRODUCT_RESEARCH",
      targetCategory: profile.fullPath,
      targetPrice: profile.benchmarks.medianPrice,
      targetKeywords: profile.extractedKeywords.slice(0, 5).map((k) => k.tag),
      sourceType: "TAXONOMY_CATEGORY",
      sourceId: String(profile.taxonomyId),
      researchSnapshot: {
        taxonomyId: profile.taxonomyId,
        categoryName: profile.name,
        fullPath: profile.fullPath,
        medianPrice: profile.benchmarks.medianPrice,
        price10thPercentile: profile.benchmarks.price10thPercentile,
        price90thPercentile: profile.benchmarks.price90thPercentile,
        avgDailySalesProxy: profile.benchmarks.avgDailySalesProxy,
        catalogYieldProxy: profile.benchmarks.catalogYieldProxy,
        nicheSaturationIndex: profile.benchmarks.nicheSaturationIndex,
        opportunityScore: profile.benchmarks.opportunityScore,
        observedListingsCount: profile.benchmarks.observedListingsCount,
        capturedAt: new Date().toISOString(),
      },
    }),
  });
}
