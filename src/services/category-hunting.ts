/**
 * SellerSalt Category Hunting & Taxonomy Service
 * 
 * Provides hierarchical Etsy buyer taxonomy exploration, deterministic
 * market benchmarks (price distribution percentiles, catalog yields,
 * niche saturation indices), and category opportunity profiling.
 */

import { getActiveConnectorWithCredentials } from "@/lib/get-active-connector";
import { createEtsyClient, etsyCache, ETSY_CACHE_TTL } from "@/connectors/etsy";
import { checkMarketplaceCapability } from "@/marketplaces/core/availability";
import type { CapabilityUnavailable } from "@/marketplaces/core/availability";
import type { MarketplaceId } from "@/marketplaces/core/types";
import { fanOutMarketplaceRequest, type MarketplaceFanOutResult } from "@/marketplaces/core/research-pipeline";
import {
  type EtsyRawTaxonomyNode,
  type FlattenedTaxonomyNode,
  flattenTaxonomyTree,
  searchTaxonomyNodes,
} from "@/connectors/etsy/taxonomy";
import { computeProductOpportunity } from "@/services/product-hunting";
import { extractLongTailTagFrequencies } from "@/services/shop-intelligence";
import type {
  CategoryIntelligenceProfile,
  CategoryMarketBenchmarks,
  CategoryPriceDistribution,
  CategoryStrategicAdvice,
  CategoryTaxonomyChild,
} from "@/types/category-hunting";
import type { ProductHuntingResult } from "@/types/product-hunting";

// --------------------------------------------------------------------------
// Category Benchmark & Price Percentile Calculator
// --------------------------------------------------------------------------

export function calculatePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];

  const index = (percentile / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (lower === upper) return sortedValues[lower];
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

export function computeCategoryBenchmarks(
  listings: any[],
  shopProfiles: Map<number | string, any>
): CategoryMarketBenchmarks {
  const prices: number[] = [];

  for (const l of listings) {
    const rawPrice = (l.price?.amount ?? 0) / (l.price?.divisor ?? 100);
    if (rawPrice > 0) prices.push(rawPrice);
  }

  const sortedPrices = [...prices].sort((a, b) => a - b);
  const minPrice = sortedPrices.length > 0 ? sortedPrices[0] : 0;
  const maxPrice = sortedPrices.length > 0 ? sortedPrices[sortedPrices.length - 1] : 0;
  const medianPrice = Math.round(calculatePercentile(sortedPrices, 50) * 100) / 100 || 18.5;
  const price10thPercentile = Math.round(calculatePercentile(sortedPrices, 10) * 100) / 100 || minPrice;
  const price90thPercentile = Math.round(calculatePercentile(sortedPrices, 90) * 100) / 100 || maxPrice;
  const priceSpread = Math.round((maxPrice - minPrice) * 100) / 100;

  const priceDistribution: CategoryPriceDistribution = {
    medianPrice,
    minPrice,
    maxPrice,
    price10thPercentile,
    price90thPercentile,
    priceSpread,
  };

  // Compute average velocity and yield across sampled shops
  const velocities: number[] = [];
  const yields: number[] = [];
  const reviews: number[] = [];

  for (const shop of shopProfiles.values()) {
    if (!shop) continue;
    const sales = shop.transaction_sold_count ?? 0;
    const active = Math.max(1, shop.listing_active_count ?? 1);
    const created = shop.create_date ?? Math.floor(Date.now() / 1000 - 365 * 24 * 3600);
    const ageMonths = Math.max(1, (Date.now() - created * 1000) / (30.44 * 24 * 3600 * 1000));

    velocities.push(sales / (ageMonths * 30.44));
    yields.push(sales / active);
    reviews.push(shop.review_count ?? 0);
  }

  const avgDailySalesProxy =
    velocities.length > 0
      ? Math.round((velocities.reduce((a, b) => a + b, 0) / velocities.length) * 100) / 100
      : 0;

  const catalogYieldProxy =
    yields.length > 0
      ? Math.round((yields.reduce((a, b) => a + b, 0) / yields.length) * 100) / 100
      : 0;

  const reviewSaturationAverage =
    reviews.length > 0
      ? Math.round(reviews.reduce((a, b) => a + b, 0) / reviews.length)
      : 0;

  // Niche Saturation Index
  let nicheSaturationIndex: CategoryMarketBenchmarks["nicheSaturationIndex"] = "MODERATE";
  if (reviews.length > 0) {
    if (reviewSaturationAverage < 100 && catalogYieldProxy >= 25) {
      nicheSaturationIndex = "LOW";
    } else if (reviewSaturationAverage >= 1200) {
      nicheSaturationIndex = "SATURATED";
    } else if (reviewSaturationAverage >= 500) {
      nicheSaturationIndex = "HIGH";
    }
  }

  // Composite Category Opportunity Score (0 - 100)
  // When shop-level metrics exist, compute balanced 4-factor score:
  // Velocity (35%) + Yield (30%) + Low Saturation (25%) + Price Health (10%)
  // When shop metrics are not available, evaluate purely on observed listing price health
  let opportunityScore = 50;
  if (velocities.length > 0 || yields.length > 0) {
    const velocityScore = Math.min(100, Math.max(20, (avgDailySalesProxy / 8) * 85));
    const yieldScore = Math.min(100, Math.max(20, (catalogYieldProxy / 35) * 85));
    const saturationScore =
      nicheSaturationIndex === "LOW"
        ? 95
        : nicheSaturationIndex === "MODERATE"
        ? 75
        : nicheSaturationIndex === "HIGH"
        ? 50
        : 30;
    const priceScore = medianPrice >= 20 ? 90 : medianPrice >= 12 ? 75 : 55;

    const rawOpp = Math.round(
      0.35 * velocityScore + 0.30 * yieldScore + 0.25 * saturationScore + 0.10 * priceScore
    );
    opportunityScore = Math.min(95, Math.max(15, rawOpp));
  } else {
    const priceScore = medianPrice >= 20 ? 80 : medianPrice >= 12 ? 65 : 50;
    opportunityScore = priceScore;
  }

  let verdictBadge: CategoryMarketBenchmarks["verdictBadge"] = "BALANCED NICHE";
  let verdictColor = "text-[#B37800] bg-[#FFF8E6] border-[#FFB020]/30";
  let verdictSummary = `Category demonstrates steady buyer transactions with an observed median price of $${medianPrice.toFixed(2)}.`;

  if (opportunityScore >= 80) {
    verdictBadge = "PRIME OPPORTUNITY";
    verdictColor = "text-[#0E8F5D] bg-[#E7FAF1] border-[#16C784]/30";
    verdictSummary = avgDailySalesProxy > 0
      ? `High-yield niche with strong daily velocity (${avgDailySalesProxy.toFixed(1)} sales/day) and low review barrier. Outstanding category for new product launches.`
      : `High-yield niche with favorable median pricing ($${medianPrice.toFixed(2)}). Outstanding category for product discovery.`;
  } else if (nicheSaturationIndex === "SATURATED" || opportunityScore < 45) {
    verdictBadge = "HIGH SATURATION";
    verdictColor = "text-[#E02424] bg-[#FDF2F2] border-[#F98080]/30";
    verdictSummary = reviewSaturationAverage > 0
      ? `Heavily saturated category with high incumbent review barriers (${reviewSaturationAverage.toLocaleString()} avg reviews). Requires high-ticket bundling or specialized sub-niche targeting.`
      : `Heavily competitive category segment. Requires high-ticket bundling or specialized sub-niche targeting.`;
  } else if (opportunityScore < 60) {
    verdictBadge = "COMPETITIVE SEGMENT";
    verdictColor = "text-[#525B55] bg-[#F4F3EF] border-[#E3E6E0]";
    verdictSummary = `Active category with established competitor catalogs. Differentiate on premium lifestyle mockups and long-tail SEO.`;
  }

  return {
    observedListingsCount: listings.length,
    medianPrice,
    price10thPercentile,
    price90thPercentile,
    priceDistribution,
    avgDailySalesProxy,
    catalogYieldProxy,
    reviewSaturationAverage,
    nicheSaturationIndex,
    opportunityScore,
    verdictBadge,
    verdictColor,
    verdictSummary,
  };
}

export function computeCategoryStrategicAdvice(
  benchmarks: CategoryMarketBenchmarks,
  categoryName: string
): CategoryStrategicAdvice {
  if (benchmarks.opportunityScore >= 80) {
    return {
      whyInteresting: `Exceptional velocity proxy (${benchmarks.avgDailySalesProxy.toFixed(1)} sales/day) combined with moderate catalog yield (${benchmarks.catalogYieldProxy.toFixed(1)} sales/listing).`,
      whatToStudy: `Analyze top-ranking listings in ${categoryName} priced between $${benchmarks.price10thPercentile.toFixed(2)} and $${benchmarks.price90thPercentile.toFixed(2)}.`,
      whatToAvoid: "Avoid undercutting the market below $10.00; healthy price tolerance is observed.",
      whatToDoNext: `Launch a 3-item product concept in ${categoryName}, tag it with long-tail keywords, and export to Planner.`,
    };
  }

  if (benchmarks.nicheSaturationIndex === "SATURATED") {
    return {
      whyInteresting: `High transaction volume but dominated by legacy stores with heavy review counts (${benchmarks.reviewSaturationAverage.toLocaleString()} avg reviews).`,
      whatToStudy: "Identify weak secondary tags in competitor listings where top sellers are not optimized.",
      whatToAvoid: "Avoid broad generic head terms (e.g. 'digital planner'); target deep 4-word long-tail keywords.",
      whatToDoNext: "Navigate deeper into child leaf nodes to find lower-competition sub-branches.",
    };
  }

  return {
    whyInteresting: `Consistent demand with an established median price of $${benchmarks.medianPrice.toFixed(2)}.`,
    whatToStudy: "Examine bundle pricing strategies and video thumbnail usage among top performers.",
    whatToAvoid: "Avoid launching single-item variations without distinct design differentiation.",
    whatToDoNext: "Shortlist the top 3 product concepts and add high-frequency tags into your Planner.",
  };
}

// --------------------------------------------------------------------------
// Core Taxonomy Traversal & Intelligence Engine
// --------------------------------------------------------------------------

/** Marketplace-aware entry point — checks the registry's `categoryTaxonomy`
 * capability first. `fetchCategoryTree`/`searchCategories` below keep their
 * original signatures unchanged since they're also called directly by
 * src/app/(dashboard)/categories/page.tsx and
 * src/services/assistant/tool-registry.ts. */
export async function fetchMarketplaceCategoryTree(
  marketplace: MarketplaceId,
  organizationId: string
): Promise<
  | { roots: EtsyRawTaxonomyNode[]; totalNodes: number; flattenedMap: Map<number, FlattenedTaxonomyNode> }
  | CapabilityUnavailable
> {
  const unavailable = checkMarketplaceCapability(marketplace, "categoryTaxonomy");
  if (unavailable) return unavailable;

  if (marketplace !== "etsy") {
    return {
      available: false,
      marketplace,
      capability: "categoryTaxonomy",
      reason: "CONNECTOR_NOT_IMPLEMENTED",
      message: `${marketplace} category taxonomy has no implementation wired up yet.`,
    };
  }

  return fetchCategoryTree(organizationId);
}

/** "All Marketplaces" fan-out — reuses the same generic helper the product
 * research pipeline established
 * (src/marketplaces/core/research-pipeline.ts's `fanOutMarketplaceRequest`).
 * Strips `flattenedMap` (a `Map`, not JSON-serializable) down to a plain
 * `{ roots, totalNodes }` payload — the same shape the single-marketplace
 * `/api/categories` route already returns to the client. */
export async function fetchAllMarketplaceCategoryTree(
  marketplaces: MarketplaceId[],
  organizationId: string
): Promise<MarketplaceFanOutResult<{ roots: EtsyRawTaxonomyNode[]; totalNodes: number }>[]> {
  return fanOutMarketplaceRequest<{ roots: EtsyRawTaxonomyNode[]; totalNodes: number }>(
    marketplaces,
    async (marketplace) => {
      const result = await fetchMarketplaceCategoryTree(marketplace, organizationId);
      if (!("roots" in result)) return result;
      return { roots: result.roots, totalNodes: result.totalNodes };
    }
  );
}

export async function fetchCategoryTree(organizationId: string): Promise<{
  roots: EtsyRawTaxonomyNode[];
  totalNodes: number;
  flattenedMap: Map<number, FlattenedTaxonomyNode>;
}> {
  const active = await getActiveConnectorWithCredentials(organizationId, "ETSY");
  const apiKey = active?.credentials?.apiKey || process.env.ETSY_API_KEY || "";
  const sharedSecret = active?.credentials?.sharedSecret || process.env.ETSY_SHARED_SECRET || "";

  if (!apiKey) {
    throw new Error("No active Etsy API credentials configured. Please configure an Etsy connector in Settings.");
  }

  const client = createEtsyClient(apiKey, sharedSecret);
  const rawResponse = await client.getBuyerTaxonomyNodes();
  const roots: EtsyRawTaxonomyNode[] = rawResponse?.results ?? [];
  const flattenedMap = flattenTaxonomyTree(roots);

  return {
    roots,
    totalNodes: flattenedMap.size,
    flattenedMap,
  };
}

export async function searchCategories(
  organizationId: string,
  query: string,
  limit = 25
): Promise<FlattenedTaxonomyNode[]> {
  const { flattenedMap } = await fetchCategoryTree(organizationId);
  return searchTaxonomyNodes(flattenedMap.values(), query, limit);
}

export async function fetchCategoryIntelligence(
  organizationId: string,
  taxonomyId: number
): Promise<CategoryIntelligenceProfile> {
  const active = await getActiveConnectorWithCredentials(organizationId, "ETSY");
  const apiKey = active?.credentials?.apiKey || process.env.ETSY_API_KEY || "";
  const sharedSecret = active?.credentials?.sharedSecret || process.env.ETSY_SHARED_SECRET || "";

  if (!apiKey) {
    throw new Error("No active Etsy API credentials configured. Please configure an Etsy connector in Settings.");
  }

  const client = createEtsyClient(apiKey, sharedSecret);

  // 1. Fetch Taxonomy Tree to locate node, ancestors, and children
  const { flattenedMap, roots } = await fetchCategoryTree(organizationId);
  const targetNode = flattenedMap.get(taxonomyId);

  if (!targetNode) {
    throw new Error(`Etsy taxonomy category ID ${taxonomyId} could not be found.`);
  }

  // 2. Build breadcrumb trail
  const breadcrumb: Array<{ id: number; name: string }> = [];
  for (const pathId of targetNode.pathIds) {
    const ancestor = flattenedMap.get(pathId);
    if (ancestor) {
      breadcrumb.push({ id: ancestor.id, name: ancestor.name });
    }
  }

  // 3. Resolve direct children
  const children: CategoryTaxonomyChild[] = [];
  for (const childId of targetNode.childIds) {
    const child = flattenedMap.get(childId);
    if (child) {
      children.push({
        id: child.id,
        name: child.name,
        level: child.level,
        childCount: child.childIds.length,
        fullPath: child.fullPath,
      });
    }
  }

  // 4. Fetch category properties (attributes/materials/scales)
  let properties: any[] = [];
  try {
    const propsRes = await client.getPropertiesByBuyerTaxonomyId(taxonomyId);
    properties = propsRes?.results ?? [];
  } catch {
    properties = [];
  }

  // 5. Ingest active listings sample in this taxonomy category (cached 6h)
  let rawListings: any[] = [];
  try {
    const listingRes = await client.searchListings({
      taxonomy_id: taxonomyId,
      limit: 30,
      sort_on: "score",
      sort_order: "desc",
    });
    rawListings = listingRes?.results ?? [];
  } catch {
    rawListings = [];
  }

  // 6. Enrich parent shops for sample listings (cached 24h)
  const shopProfiles = new Map<number | string, any>();
  const shopIdsToFetch = Array.from(
    new Set(rawListings.map((l) => l.shop_id).filter(Boolean))
  ).slice(0, 10);

  await Promise.all(
    shopIdsToFetch.map(async (sid) => {
      try {
        const s = await client.getShop(sid);
        if (s) shopProfiles.set(sid, s);
      } catch {
        // ignore transient shop fetch failure
      }
    })
  );

  // 7. Calculate category market benchmarks
  const benchmarks = computeCategoryBenchmarks(rawListings, shopProfiles);

  // 8. Extract long-tail tag frequency patterns
  const extractedKeywords = extractLongTailTagFrequencies(rawListings, 24);

  // 9. Generate strategic advice
  const strategicAdvice = computeCategoryStrategicAdvice(benchmarks, targetNode.name);

  // 10. Normalize product samples with Opportunity Radar scores
  const now = Date.now();
  const productSamples: ProductHuntingResult[] = rawListings.map((l: any) => {
    const listingId = String(l.listing_id);
    const price = (l.price?.amount ?? 0) / (l.price?.divisor ?? 100);
    const shop = shopProfiles.get(l.shop_id) || null;
    const totalSales = shop?.transaction_sold_count ?? 0;
    const activeListings = Math.max(1, shop?.listing_active_count ?? 1);
    const reviewCount = shop?.review_count ?? 0;
    const reviewAverage = shop?.review_average ?? null;
    const shopAgeMonths = shop?.create_date
      ? Math.max(1, Math.round((now - shop.create_date * 1000) / (30.44 * 24 * 3600 * 1000)))
      : 12;

    const estDailySales = totalSales > 0 ? totalSales / (shopAgeMonths * 30.44) : 0;
    const avgSellingRatio = totalSales > 0 ? totalSales / activeListings : 0;
    const listingAgeDays = Math.max(
      1,
      Math.round((now - (l.created_timestamp ?? Math.floor(now / 1000)) * 1000) / (24 * 3600 * 1000))
    );

    const images: string[] = [];
    if (l.images && Array.isArray(l.images)) {
      for (const img of l.images) {
        const url = img.url_570xN || img.url_fullxfull || img.url_75x75;
        if (url) images.push(url);
      }
    }
    const imageUrl = images[0] || l.image_url || null;

    const opp = computeProductOpportunity({
      price,
      listingAgeDays,
      shopAgeMonths,
      totalSales,
      activeListings,
      reviewCount,
      reviewAverage,
      numFavorers: l.num_favorers ?? null,
      estDailySales,
      avgSellingRatio,
    });

    return {
      id: listingId,
      listing: {
        listingId,
        title: l.title ?? "Untitled Listing",
        price,
        currency: l.price?.currency_code ?? "USD",
        images,
        imageUrl,
        tags: Array.isArray(l.tags) ? l.tags : [],
        materials: Array.isArray(l.materials) ? l.materials : [],
        taxonomyId: l.taxonomy_id ?? taxonomyId,
        createdTimestamp: l.created_timestamp ?? Math.floor(now / 1000),
        updatedTimestamp: l.updated_timestamp ?? Math.floor(now / 1000),
        listingAgeDays,
        listingAgeMonths: Math.round(listingAgeDays / 30),
        listingUrl: l.url ?? `https://www.etsy.com/listing/${listingId}`,
        shopId: String(l.shop_id),
        shopName: shop.shop_name ?? `Shop ${l.shop_id}`,
        numFavorers: l.num_favorers ?? null,
        views: l.views ?? null,
      },
      shop: {
        shopId: String(l.shop_id),
        shopName: shop.shop_name ?? `Shop ${l.shop_id}`,
        shopUrl: shop.url ?? `https://www.etsy.com/shop/${shop.shop_name ?? l.shop_id}`,
        shopIconUrl: shop.icon_url_fullxfull ?? null,
        createdTimestamp: shop.create_date ?? Math.floor(now / 1000),
        shopAgeMonths,
        totalSales,
        activeListings,
        reviewCount,
        reviewAverage,
        shopMetricsObserved: true,
      },
      signals: {
        estDailySales,
        avgSellingRatio,
        salesVelocityProxy: estDailySales >= 6 ? "HIGH" : "MODERATE",
        reviewConversionRate: totalSales > 0 ? reviewCount / totalSales : 0,
      },
      opportunity: opp,
    };
  });

  const parentNode = targetNode.parentId ? flattenedMap.get(targetNode.parentId) : null;

  return {
    taxonomyId: targetNode.id,
    name: targetNode.name,
    level: targetNode.level,
    fullPath: targetNode.fullPath,
    pathIds: targetNode.pathIds,
    parentId: targetNode.parentId,
    parentName: parentNode?.name ?? null,
    breadcrumb,
    childCount: children.length,
    children,
    properties,
    benchmarks,
    productSamples,
    extractedKeywords,
    strategicAdvice,
  };
}
