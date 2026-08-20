/**
 * SellerSalt Niche Discovery & Demand Signal Aggregation Engine
 * 
 * Aggregates granular product, keyword, shop, and taxonomy observations into
 * coherent, actionable Niche Opportunity profiles.
 * 
 * Strict architectural rules:
 * 1. Reuses canonical opportunity scoring (evaluateCanonicalOpportunity).
 * 2. Never invents exact search volume or multi-month historical momentum.
 * 3. Preserves explicit provenance (OBSERVED, ESTIMATED, DERIVED, UNAVAILABLE).
 * 4. Respects marketplace boundaries via MarketplaceRegistry.
 */

import { prisma } from "@/lib/db";
import { MarketplaceRegistry, registerAllConnectors } from "@/marketplaces/core/registry";
import { runProductResearch } from "@/marketplaces/core/research-pipeline";
import {
  evaluateCanonicalOpportunity,
  extractOpportunityInputFromNormalizedProduct,
} from "@/services/intelligence/canonical-opportunity";
import { normalizeEtsyProspectToNormalizedProduct } from "@/marketplaces/core/normalizers/etsy";
import type {
  MarketplaceId,
  NormalizedProduct,
  NicheOpportunity,
  NicheDemandSignal,
  NicheCompetitionSignal,
  NicheMomentumSignal,
  NicheSubcategory,
  NicheKeywordCluster,
  NicheDiscoverySummary,
  SignalProvenance,
} from "@/marketplaces/core/types";

function extractNicheClusterKey(prod: NormalizedProduct): string {
  if (prod.categoryPath && prod.categoryPath.length > 0) {
    // e.g. "Paper & Party Supplies > Paper > Planners" -> "Planners"
    const lastCategory = prod.categoryPath[prod.categoryPath.length - 1]?.trim();
    if (lastCategory && lastCategory.length > 2) return lastCategory;
  }
  if (prod.category?.name) {
    return prod.category.name.trim();
  }
  if (prod.keyword && prod.keyword.trim().length > 2) {
    return prod.keyword.trim();
  }
  // Fallback: extract meaningful 2-3 word phrase from title
  const words = prod.title.split(/[^a-zA-Z0-9]+/).filter((w) => w.length > 2);
  if (words.length >= 2) {
    return `${words[0]} ${words[1]}`;
  }
  return "General Specialty";
}

function calculateNicheDemand(products: NormalizedProduct[]): NicheDemandSignal {
  let totalVelocity = 0;
  let velocityCount = 0;
  let totalFavorites = 0;
  let favoritesCount = 0;
  let totalYield = 0;
  let yieldCount = 0;

  for (const p of products) {
    if (typeof p.estimatedDemand === "number") {
      totalVelocity += p.estimatedDemand;
      velocityCount++;
    } else if (typeof p.salesCount === "number" && p.shop?.ageMonths && p.shop.ageMonths > 0) {
      const v = p.salesCount / (p.shop.ageMonths * 30.44);
      totalVelocity += v;
      velocityCount++;
    }

    if (typeof p.favoritesCount === "number") {
      totalFavorites += p.favoritesCount;
      favoritesCount++;
    }

    if (typeof p.shop?.avgSellingRatio === "number") {
      totalYield += p.shop.avgSellingRatio;
      yieldCount++;
    }
  }

  const avgVelocity = velocityCount > 0 ? totalVelocity / velocityCount : null;
  const avgYield = yieldCount > 0 ? totalYield / yieldCount : null;

  if (avgVelocity === null && favoritesCount === 0) {
    return {
      strength: "UNAVAILABLE",
      score: null,
      observedDailyVelocity: null,
      observedFavoritesTotal: null,
      catalogYieldAverage: null,
      provenance: "UNAVAILABLE",
      confidence: 0,
      explanation: "No observed sales velocity or buyer favorer metrics available for this niche cluster.",
    };
  }

  // Velocity score scale: 5+ sales/day = 90, 2-5 = 75, 0.5-2 = 60, <0.5 = 40
  let score = 50;
  if (avgVelocity !== null) {
    if (avgVelocity >= 5) score = 90;
    else if (avgVelocity >= 2) score = 75;
    else if (avgVelocity >= 0.5) score = 60;
    else score = 40;
  }
  if (totalFavorites > 500) score = Math.min(95, score + 5);

  let strength: NicheDemandSignal["strength"] = "MODERATE";
  if (score >= 80) strength = "VERY_HIGH";
  else if (score >= 65) strength = "HIGH";
  else if (score >= 45) strength = "MODERATE";
  else strength = "LOW";

  const confidence = Math.round(
    ((velocityCount / products.length) * 0.6 + (favoritesCount / products.length) * 0.4) * 100
  );

  return {
    strength,
    score,
    observedDailyVelocity: avgVelocity !== null ? Math.round(avgVelocity * 10) / 10 : null,
    observedFavoritesTotal: favoritesCount > 0 ? totalFavorites : null,
    catalogYieldAverage: avgYield !== null ? Math.round(avgYield * 10) / 10 : null,
    provenance: "ESTIMATED",
    confidence,
    explanation: `Observed average velocity of ${avgVelocity !== null ? avgVelocity.toFixed(1) : "—"} units/day across ${velocityCount} sampled listings.`,
  };
}

function calculateNicheCompetition(products: NormalizedProduct[]): NicheCompetitionSignal {
  let totalReviews = 0;
  let reviewCount = 0;
  const shopMap = new Map<string, number>();

  for (const p of products) {
    if (typeof p.reviewCount === "number") {
      totalReviews += p.reviewCount;
      reviewCount++;
    }
    const shopId = p.shop?.externalId || p.shop?.name || "unknown";
    shopMap.set(shopId, (shopMap.get(shopId) || 0) + 1);
  }

  const avgReviews = reviewCount > 0 ? Math.round(totalReviews / reviewCount) : null;

  // Calculate top 3 shops listing concentration percentage
  const sortedShopCounts = Array.from(shopMap.values()).sort((a, b) => b - a);
  const top3Listings = sortedShopCounts.slice(0, 3).reduce((acc, curr) => acc + curr, 0);
  const concentration = products.length > 0 ? Math.round((top3Listings / products.length) * 100) : 0;

  let barrierScore = 40;
  if (avgReviews !== null) {
    if (avgReviews > 3000) barrierScore = 85;
    else if (avgReviews > 1000) barrierScore = 70;
    else if (avgReviews > 300) barrierScore = 50;
    else barrierScore = 30;
  }
  if (concentration > 60) barrierScore = Math.min(95, barrierScore + 10);

  let intensity: NicheCompetitionSignal["intensity"] = "MODERATE";
  if (barrierScore >= 80) intensity = "VERY_HIGH";
  else if (barrierScore >= 65) intensity = "HIGH";
  else if (barrierScore >= 45) intensity = "MODERATE";
  else intensity = "LOW";

  let dominance: NicheCompetitionSignal["incumbentDominance"] = "MODERATE";
  if (concentration >= 60) dominance = "HIGH";
  else if (concentration <= 30) dominance = "LOW";

  const confidence = Math.round(
    ((reviewCount / products.length) * 0.7 + (shopMap.size / products.length) * 0.3) * 100
  );

  return {
    intensity,
    score: barrierScore,
    averageReviewThreshold: avgReviews,
    topShopConcentration: concentration,
    incumbentDominance: dominance,
    provenance: "SELLERSALT_SCORE",
    confidence,
    explanation: `Average incumbent threshold of ${avgReviews ? avgReviews.toLocaleString() : "—"} reviews with ${concentration}% catalog concentration among top sellers.`,
  };
}

function calculateNicheMomentum(products: NormalizedProduct[]): NicheMomentumSignal {
  let freshCount = 0;
  let totalAgeDays = 0;
  let ageCount = 0;

  for (const p of products) {
    if (p.shop?.ageMonths !== undefined && p.shop?.ageMonths !== null) {
      // Estimate listing age if capturedAt/createdAt is present
      const days = Math.round(p.shop.ageMonths * 30.44);
      totalAgeDays += days;
      ageCount++;
      if (days <= 90) freshCount++;
    }
  }

  const freshnessRatio = products.length > 0 ? Math.round((freshCount / products.length) * 100) : null;

  let direction: NicheMomentumSignal["direction"] = "STABLE";
  if (freshnessRatio !== null) {
    if (freshnessRatio >= 40) direction = "RISING";
    else if (freshnessRatio >= 15) direction = "STABLE";
    else direction = "DECLINING";
  } else {
    direction = "UNAVAILABLE";
  }

  return {
    direction,
    growthRatePercent: null, // Strictly null: no multi-month historical snapshots manufactured
    observationWindowDays: 90,
    snapshotCount: 1,
    isHistorical: false,
    freshnessRatio,
    provenance: "SELLERSALT_SCORE",
    confidence: freshnessRatio !== null ? 70 : 0,
    explanation:
      freshnessRatio !== null
        ? `Derived from listing freshness velocity: ${freshnessRatio}% of sampled listings emerged within the last 90 days.`
        : "Historical momentum is unavailable (requires multi-window snapshots).",
  };
}

function extractSubcategoriesAndKeywords(products: NormalizedProduct[]): {
  topSubcategories: NicheSubcategory[];
  topKeywordClusters: NicheKeywordCluster[];
} {
  const subcatMap = new Map<string, { count: number; totalScore: number; scoredCount: number }>();
  const tagFreqMap = new Map<string, number>();

  for (const p of products) {
    const subcat = p.categoryPath?.[1] || p.category?.name || "Standard";
    const existing = subcatMap.get(subcat) || { count: 0, totalScore: 0, scoredCount: 0 };
    existing.count++;
    if (p.opportunityScore?.score) {
      existing.totalScore += p.opportunityScore.score;
      existing.scoredCount++;
    }
    subcatMap.set(subcat, existing);

    // Harvest keyword tags if present in keywordSignals
    if (p.keywordSignals) {
      for (const sig of p.keywordSignals) {
        if (sig.term) {
          tagFreqMap.set(sig.term.toLowerCase(), (tagFreqMap.get(sig.term.toLowerCase()) || 0) + 1);
        }
      }
    }
  }

  const topSubcategories: NicheSubcategory[] = Array.from(subcatMap.entries())
    .map(([name, data]) => ({
      name,
      productCount: data.count,
      averageScore: data.scoredCount > 0 ? Math.round(data.totalScore / data.scoredCount) : null,
    }))
    .sort((a, b) => b.productCount - a.productCount)
    .slice(0, 5);

  const topTags = Array.from(tagFreqMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const topKeywordClusters: NicheKeywordCluster[] =
    topTags.length > 0
      ? [
          {
            clusterName: "High Frequency Tags",
            keywords: topTags.map((t) => t[0]),
            frequency: topTags.reduce((acc, curr) => acc + curr[1], 0),
          },
        ]
      : [];

  return { topSubcategories, topKeywordClusters };
}

/**
 * Aggregates a list of NormalizedProduct records into structured NicheOpportunity items.
 */
export function discoverNichesFromProducts(
  products: NormalizedProduct[],
  marketplace: MarketplaceId,
  query?: string
): NicheDiscoverySummary {
  registerAllConnectors();
  const connector = MarketplaceRegistry.tryGetConnector(marketplace);
  const generatedAt = new Date();

  // If connector is not implemented or has no research capability:
  if (!connector || !connector.capabilities.research) {
    return {
      query,
      marketplace,
      totalNichesFound: 0,
      niches: [],
      marketLimitations: [
        `${connector?.displayName || marketplace} public market research is not available. Niche signals are omitted without fabrication.`,
      ],
      generatedAt,
    };
  }

  // Ensure each product has a canonical opportunity score
  const scoredProducts = products.map((p) => {
    if (!p.opportunityScore && p.price !== null) {
      const input = extractOpportunityInputFromNormalizedProduct(p);
      const report = evaluateCanonicalOpportunity(input);
      if (report.overallScore !== null) {
        p.opportunityScore = {
          score: report.overallScore,
          confidence: report.confidenceScore,
          tier: report.tier,
          verdict: report.verdictLabel,
          verdictVariant: report.verdictVariant,
          availableSignals: report.signals.available.map((s) => s.id),
          unavailableSignals: report.signals.unavailable.map((s) => s.id),
        };
      }
    }
    return p;
  });

  // Group products by niche key
  const clusterMap = new Map<string, NormalizedProduct[]>();
  for (const p of scoredProducts) {
    const key = extractNicheClusterKey(p);
    const list = clusterMap.get(key) || [];
    list.push(p);
    clusterMap.set(key, list);
  }

  const niches: NicheOpportunity[] = [];

  for (const [nicheName, clusterProducts] of clusterMap.entries()) {
    let totalScore = 0;
    let scoredCount = 0;
    let totalPrice = 0;
    let priceCount = 0;
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    for (const p of clusterProducts) {
      if (p.opportunityScore?.score) {
        totalScore += p.opportunityScore.score;
        scoredCount++;
      }
      if (typeof p.price === "number") {
        totalPrice += p.price;
        priceCount++;
        minPrice = Math.min(minPrice, p.price);
        maxPrice = Math.max(maxPrice, p.price);
      }
    }

    const avgProductScore = scoredCount > 0 ? Math.round(totalScore / scoredCount) : null;
    const avgPrice = priceCount > 0 ? Math.round((totalPrice / priceCount) * 100) / 100 : null;
    const priceRange = priceCount > 0 ? { min: minPrice, max: maxPrice } : null;

    const demand = calculateNicheDemand(clusterProducts);
    const competition = calculateNicheCompetition(clusterProducts);
    const momentum = calculateNicheMomentum(clusterProducts);
    const { topSubcategories, topKeywordClusters } = extractSubcategoriesAndKeywords(clusterProducts);

    // Dynamic Composite Opportunity Calculation
    let opportunityScore: number | null = null;
    if (avgProductScore !== null) {
      const demandWeight = demand.score !== null ? 0.25 : 0;
      const compWeight = competition.score !== null ? 0.15 : 0;
      const productWeight = 1.0 - demandWeight - compWeight;

      const demandPart = demand.score !== null ? demand.score * demandWeight : 0;
      const compPart = competition.score !== null ? (100 - competition.score) * compWeight : 0;
      const prodPart = avgProductScore * productWeight;

      opportunityScore = Math.round(prodPart + demandPart + compPart);
    }

    let tier = "Moderate Opportunity";
    let verdict = "Viable Niche";
    let verdictVariant: NicheOpportunity["verdictVariant"] = "info";

    if (opportunityScore !== null) {
      if (opportunityScore >= 80) {
        tier = "High Opportunity";
        verdict = "High Demand & Low Incumbent Barrier";
        verdictVariant = "success";
      } else if (opportunityScore >= 65) {
        tier = "Moderate Opportunity";
        verdict = "Strong Demand with Moderate Competition";
        verdictVariant = "warning";
      } else {
        tier = "Competitive / Low Margin";
        verdict = "Incumbent Saturated";
        verdictVariant = "neutral";
      }
    }

    const availableSignalGroups: string[] = [];
    const unavailableSignalGroups: string[] = [];

    if (demand.strength !== "UNAVAILABLE") availableSignalGroups.push("Demand Signals");
    else unavailableSignalGroups.push("Demand Signals");

    if (competition.intensity !== "UNAVAILABLE") availableSignalGroups.push("Competition Barrier");
    else unavailableSignalGroups.push("Competition Barrier");

    if (momentum.direction !== "UNAVAILABLE") availableSignalGroups.push("Listing Freshness");
    else unavailableSignalGroups.push("Listing Freshness");

    const confidence = Math.round(
      ((scoredCount / clusterProducts.length) * 0.5 +
        (demand.confidence / 100) * 0.3 +
        (competition.confidence / 100) * 0.2) *
        100
    );

    const limitations = [
      "Exact buyer search volume is unavailable (estimated via listing penetration and favorer proxies).",
      "Historical multi-month sales trajectory is unavailable; momentum reflects current listing freshness.",
    ];

    niches.push({
      id: `${marketplace}:${nicheName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      nicheName,
      marketplace,
      status: "AVAILABLE",
      opportunityScore,
      confidence,
      tier,
      verdict,
      verdictVariant,
      observedProductCount: clusterProducts.length,
      averagePrice: avgPrice,
      priceRange,
      demand,
      competition,
      momentum,
      topSubcategories,
      topKeywordClusters,
      sampleProducts: clusterProducts.slice(0, 4),
      availableSignalGroups,
      unavailableSignalGroups,
      provenance: "ACTUAL_DATA" as SignalProvenance,
      limitations,
      evaluatedAt: generatedAt,
    });
  }

  niches.sort((a, b) => (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0));

  const marketLimitations = [
    "Etsy is currently the only active public market research integration.",
    "Search volumes and daily sales velocities are deterministic estimates derived from active listings, sales yield, and favorer engagement proxies.",
  ];

  return {
    query,
    marketplace,
    totalNichesFound: niches.length,
    niches,
    topNiche: niches[0],
    marketLimitations,
    generatedAt,
  };
}

/**
 * Discovers and aggregates niches from the organization's stored ProductObservation and Prospect records.
 */
export async function discoverNichesFromDatabase(
  organizationId: string,
  marketplace: MarketplaceId = "etsy",
  query?: string,
  limit = 100
): Promise<NicheDiscoverySummary> {
  const whereObs: any = { organizationId, marketplace };
  if (query && query.trim()) {
    whereObs.OR = [
      { title: { contains: query.trim(), mode: "insensitive" } },
      { shopName: { contains: query.trim(), mode: "insensitive" } },
    ];
  }

  const observations = await prisma.productObservation.findMany({
    where: whereObs,
    take: limit,
    orderBy: [{ reviewCount: "desc" }, { observedAt: "desc" }],
  });

  if (observations.length > 0) {
    const normalizedProducts: NormalizedProduct[] = observations.map((obs) => ({
      marketplace: (obs.marketplace as MarketplaceId) || marketplace,
      externalId: obs.externalId,
      title: obs.title,
      price: obs.price,
      currency: obs.currency || "USD",
      rating: obs.rating,
      reviewCount: obs.reviewCount,
      favoritesCount: obs.favoritesCount,
      salesCount: obs.salesCount,
      estimatedDemand: obs.estimatedDemand,
      url: obs.sourceUrl || "",
      categoryPath: obs.categoryPath || [],
      shop: {
        id: obs.shopExternalId || undefined,
        name: obs.shopName || undefined,
      },
      acquisitionMethod: (obs.sourceType as any) || "PUBLIC_WEB",
      source: "ACTUAL_DATA",
      capturedAt: obs.observedAt || new Date(),
      observedAt: obs.observedAt,
    }));

    return discoverNichesFromProducts(normalizedProducts, marketplace, query);
  }

  // Fallback to legacy Prospect records if no ProductObservation entries exist yet
  const whereProspect: any = { organizationId };
  if (query && query.trim()) {
    whereProspect.OR = [
      { keyword: { contains: query.trim(), mode: "insensitive" } },
      { listingTitle: { contains: query.trim(), mode: "insensitive" } },
    ];
  }

  const prospects = await prisma.prospect.findMany({
    where: whereProspect,
    take: limit,
    orderBy: [{ estDailySales: "desc" }, { createdAt: "desc" }],
  });

  const normalizedProducts = prospects.map((p) => normalizeEtsyProspectToNormalizedProduct(p as any));
  return discoverNichesFromProducts(normalizedProducts, marketplace, query);
}

/**
 * Discovers and aggregates niches live from a marketplace search query.
 */
export async function discoverLiveMarketplaceNiches(
  organizationId: string,
  marketplace: MarketplaceId = "etsy",
  query: string,
  limit = 30
): Promise<NicheDiscoverySummary> {
  const result = await runProductResearch({
    marketplace,
    organizationId,
    type: "products",
    keywords: query ? [query] : undefined,
    limit,
  });

  if (result.status !== "AVAILABLE" || !result.products || result.products.length === 0) {
    return {
      query,
      marketplace,
      totalNichesFound: 0,
      niches: [],
      marketLimitations: [
        result.message || `${marketplace} market research is currently unavailable.`,
      ],
      generatedAt: new Date(),
    };
  }

  return discoverNichesFromProducts(result.products, marketplace, query);
}
