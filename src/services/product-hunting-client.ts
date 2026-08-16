import { fetchJson } from "./http";
import type {
  EtsySearchFilters,
  ProductHuntingResult,
  ProductHuntingSearchResponse,
  ProductComparisonSummary,
} from "@/types/product-hunting";

export async function searchMarketplaceProducts(
  filters: EtsySearchFilters
): Promise<ProductHuntingSearchResponse> {
  return fetchJson<ProductHuntingSearchResponse>("/api/products/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(filters),
  });
}

export async function compareMarketplaceProducts(
  items: ProductHuntingResult[]
): Promise<ProductComparisonSummary> {
  const data = await fetchJson<{ comparison: ProductComparisonSummary }>("/api/products/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  return data.comparison;
}

export async function addProductToPlanner(
  product: ProductHuntingResult
): Promise<{ item: any; isExisting: boolean; message: string }> {
  return fetchJson<{ item: any; isExisting: boolean; message: string }>("/api/planner/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: product.listing.title,
      type: "PRODUCT_RESEARCH",
      status: "BACKLOG",
      sourceType: "PRODUCT_HUNTING",
      sourceListingUrl: product.listing.listingUrl,
      sourceListingTitle: product.listing.title,
      sourceShopExternalId: product.shop.shopId,
      sourceShopName: product.shop.shopName,
      targetPrice: product.listing.price,
      targetCategory: product.listing.taxonomyPath || undefined,
      targetKeywords: product.listing.tags.slice(0, 8),
      researchSnapshot: {
        price: product.listing.price,
        currency: product.listing.currency,
        imageUrl: product.listing.imageUrl,
        estDailySales: product.signals.estDailySales,
        avgSellingRatio: product.signals.avgSellingRatio,
        totalSales: product.shop.totalSales,
        reviewCount: product.shop.reviewCount,
        activeListings: product.shop.activeListings,
        shopAgeMonths: product.shop.shopAgeMonths,
        opportunityScore: product.opportunity.opportunityScore,
        opportunityClassification: product.opportunity.classification,
        extractedTags: product.listing.tags,
        capturedAt: new Date().toISOString(),
      },
    }),
  });
}
