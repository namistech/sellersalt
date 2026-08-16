import { fetchJson } from "./http";
import type {
  CategoryIntelligenceProfile,
  CategorySearchResponse,
} from "@/types/category-hunting";
import type { EtsyRawTaxonomyNode, FlattenedTaxonomyNode } from "@/connectors/etsy/taxonomy";

export async function fetchCategoryRoots(): Promise<{
  roots: EtsyRawTaxonomyNode[];
  totalNodes: number;
}> {
  return fetchJson("/api/categories");
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
