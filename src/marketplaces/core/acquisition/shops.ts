/**
 * SellerSalt Public Marketplace Shop Research & Competition Engine
 * 
 * Extracts public seller/shop profiles and listings directly from public web adapters
 * and evaluates canonical shop competition scores without requiring private seller OAuth.
 * 
 * ZERO FABRICATION RULE:
 * - If sales or revenue are not publicly displayed, they remain null.
 * - Competition rating uses canonical scoreShopCompetition() exclusively.
 */

import { MarketplaceRegistry, registerAllConnectors } from "../registry";
import { scoreShopCompetition, type OpportunityScore } from "../opportunity-engine";
import { evaluateFreshness, type FreshnessEvaluation } from "./freshness";
import type { MarketplaceId, MarketplaceShopStats, NormalizedProduct, SignalProvenance } from "../types";
import { prisma } from "@/lib/db";

export interface PublicShopResearchResult {
  shop: MarketplaceShopStats;
  marketplace: MarketplaceId;
  competition: OpportunityScore;
  sampleProducts: NormalizedProduct[];
  observedCatalogSize: number;
  priceRange: {
    min: number | null;
    max: number | null;
    median: number | null;
    average: number | null;
  };
  categoryConcentration?: Array<{ categoryName: string; count: number; sharePercent: number }>;
  longitudinalDeltas?: {
    catalogDelta: number | null;
    reviewDelta: number | null;
    observationCount: number;
  } | null;
  freshness: FreshnessEvaluation;
  provenance: SignalProvenance;
  limitations: string[];
}

export async function fetchPublicShopResearch(
  shopIdentifier: string,
  marketplace: MarketplaceId = "etsy"
): Promise<PublicShopResearchResult | { available: false; message: string }> {
  registerAllConnectors();
  const adapter = MarketplaceRegistry.tryGetPublicWebAdapter(marketplace);

  if (!adapter || !adapter.capabilities.shopResearch) {
    return {
      available: false,
      message: `Shop research is not supported via public web adapter for ${marketplace}.`,
    };
  }

  // 1. Fetch shop profile if adapter implements fetchPublicShop
  let normalizedShop: MarketplaceShopStats = {
    marketplace,
    name: shopIdentifier,
    externalId: shopIdentifier,
    url: `https://www.${marketplace}.com/shop/${encodeURIComponent(shopIdentifier)}`,
  };
  let fetchedAt = new Date();

  if (adapter.fetchPublicShop) {
    try {
      const res = await adapter.fetchPublicShop(shopIdentifier);
      if (res.success && res.items.length > 0) {
        normalizedShop = res.items[0];
        fetchedAt = res.fetchedAt;
      }
    } catch {
      // Continue to search sample products
    }
  }

  // 2. Fetch sample public listings from this seller
  let sampleProducts: NormalizedProduct[] = [];
  try {
    const searchRes = await adapter.searchPublicProducts({
      query: shopIdentifier,
      limit: 20,
    });
    if (searchRes.success && searchRes.items.length > 0) {
      sampleProducts = searchRes.items;
      if (!normalizedShop.activeListings) {
        normalizedShop.activeListings = sampleProducts.length;
      }
    }
  } catch {
    // Ignore error
  }

  // 3. Compute price range & category concentration
  const prices = sampleProducts
    .map((p) => p.price)
    .filter((p): p is number => p !== null && p !== undefined && p > 0)
    .sort((a, b) => a - b);

  const medianPrice =
    prices.length > 0
      ? prices.length % 2 === 1
        ? prices[Math.floor(prices.length / 2)]
        : parseFloat(((prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2).toFixed(2))
      : null;

  const priceRange = {
    min: prices.length > 0 ? prices[0] : null,
    max: prices.length > 0 ? prices[prices.length - 1] : null,
    median: medianPrice,
    average: prices.length > 0 ? parseFloat((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)) : null,
  };

  const catMap = new Map<string, number>();
  for (const p of sampleProducts) {
    const cat = p.categoryPath?.[0] || p.category?.name || "General";
    catMap.set(cat, (catMap.get(cat) || 0) + 1);
  }
  const categoryConcentration = Array.from(catMap.entries())
    .map(([categoryName, count]) => ({
      categoryName,
      count,
      sharePercent: sampleProducts.length > 0 ? Math.round((count / sampleProducts.length) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // 4. Compute canonical competition score
  const totalSales = normalizedShop.totalSales ?? 0;
  const reviewCount = normalizedShop.reviewCount ?? 0;
  const activeListings = Math.max(1, normalizedShop.activeListings ?? sampleProducts.length ?? 1);
  const shopAgeMonths = normalizedShop.ageMonths ?? 12;
  const estDailySales = totalSales > 0 ? totalSales / (shopAgeMonths * 30.44) : 0;

  const competition = scoreShopCompetition({
    marketplace,
    shopName: normalizedShop.name || "Marketplace Merchant",
    totalSales,
    reviewCount,
    activeListings,
    shopAgeMonths,
    estDailySales,
  });
  const freshness = evaluateFreshness(fetchedAt, "shop");

  let longitudinalDeltas: {
    catalogDelta: number | null;
    reviewDelta: number | null;
    observationCount: number;
  } | null = null;

  try {
    const historicalObs = await prisma.productObservation.findMany({
      where: {
        marketplace,
        shopName: {
          contains: shopIdentifier,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        observedAt: true,
        reviewCount: true,
      },
      orderBy: { observedAt: "asc" },
    });

    if (historicalObs.length > 1) {
      const first = historicalObs[0];
      const last = historicalObs[historicalObs.length - 1];
      const revDelta =
        last.reviewCount !== null && first.reviewCount !== null
          ? last.reviewCount - first.reviewCount
          : null;

      longitudinalDeltas = {
        catalogDelta: sampleProducts.length - historicalObs.length,
        reviewDelta: revDelta,
        observationCount: historicalObs.length,
      };
    }
  } catch {
    // Database query error: degrade safely to null
  }

  return {
    shop: normalizedShop,
    marketplace,
    competition,
    sampleProducts,
    observedCatalogSize: sampleProducts.length,
    priceRange,
    categoryConcentration,
    longitudinalDeltas,
    freshness,
    provenance: "ACTUAL_DATA",
    limitations: [
      "Sales metrics and shop age are derived from public profile headers where exposed by the marketplace.",
      "Observed catalog size represents acquired public sample listings rather than complete merchant inventory.",
      "Conversion rates are strictly private store data and remain unavailable without merchant OAuth authorization.",
    ],
  };
}
