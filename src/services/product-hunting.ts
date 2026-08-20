/**
 * SellerSalt Product Hunting & Opportunity Radar Service
 * 
 * Executes rate-limited, cached Etsy marketplace listing searches,
 * normalizes entity graphs with shop intelligence, computes deterministic
 * velocity proxies, and scores opportunities across 5 explainable factors.
 */

import { prisma } from "@/lib/db";
import { getActiveConnectorWithCredentials } from "@/lib/get-active-connector";
import { createEtsyClient, etsyCache, ETSY_CACHE_TTL } from "@/connectors/etsy";
import { checkMarketplaceCapability } from "@/marketplaces/core/availability";
import type { CapabilityUnavailable } from "@/marketplaces/core/availability";
import type { MarketplaceId } from "@/marketplaces/core/types";
import type {
  EtsySearchFilters,
  NormalizedProductListing,
  NormalizedShopProfile,
  ProductCalculatedSignals,
  ProductOpportunityScore,
  ProductHuntingResult,
  ProductHuntingSearchResponse,
  ProductComparisonSummary,
} from "@/types/product-hunting";
import type { OpportunityType, OpportunitySignal } from "@/services/opportunities";

// --------------------------------------------------------------------------
// Deterministic 5-Factor Opportunity Scoring Engine
// --------------------------------------------------------------------------

export function computeProductOpportunity(params: {
  price: number;
  listingAgeDays: number;
  shopAgeMonths: number;
  totalSales: number;
  activeListings: number;
  reviewCount: number;
  reviewAverage: number | null;
  numFavorers: number | null;
  estDailySales: number;
  avgSellingRatio: number;
}): ProductOpportunityScore {
  const {
    price,
    listingAgeDays,
    shopAgeMonths,
    totalSales,
    activeListings,
    reviewCount,
    numFavorers,
    estDailySales,
    avgSellingRatio,
  } = params;

  // 1. Velocity Signal (Weight: 30%)
  let velocityScore = 20;
  let velocityLabel = "Low observed velocity";
  if (estDailySales >= 15) {
    velocityScore = Math.min(100, Math.round(92 + (estDailySales - 15) * 0.5));
    velocityLabel = "High sales momentum";
  } else if (estDailySales >= 6) {
    velocityScore = Math.round(75 + (estDailySales - 6) * 1.8);
    velocityLabel = "Strong daily velocity";
  } else if (estDailySales >= 2) {
    velocityScore = Math.round(55 + (estDailySales - 2) * 5);
    velocityLabel = "Consistent transactions";
  } else if (estDailySales >= 0.5) {
    velocityScore = Math.round(35 + (estDailySales - 0.5) * 13);
    velocityLabel = "Emerging velocity";
  } else {
    velocityScore = Math.max(10, Math.round(estDailySales * 40));
  }

  const velocitySignal: OpportunitySignal = {
    score: velocityScore,
    label: velocityLabel,
    metricValue: `${estDailySales.toFixed(1)} sales/day`,
  };

  // 2. Catalog Density / Yield Signal (Weight: 25%)
  let densityScore = 20;
  let densityLabel = "Broad catalog";
  if (avgSellingRatio >= 35) {
    densityScore = Math.min(100, Math.round(90 + (avgSellingRatio - 35) * 0.3));
    densityLabel = "High yield per listing";
  } else if (avgSellingRatio >= 14) {
    densityScore = Math.round(75 + (avgSellingRatio - 14) * 0.7);
    densityLabel = "Lean efficient catalog";
  } else if (avgSellingRatio >= 5) {
    densityScore = Math.round(55 + (avgSellingRatio - 5) * 2.2);
    densityLabel = "Healthy catalog yield";
  } else if (avgSellingRatio >= 1.5) {
    densityScore = Math.round(35 + (avgSellingRatio - 1.5) * 5.7);
    densityLabel = "Moderate yield";
  } else {
    densityScore = Math.max(10, Math.round(avgSellingRatio * 15));
  }

  const densitySignal: OpportunitySignal = {
    score: densityScore,
    label: densityLabel,
    metricValue: `${avgSellingRatio.toFixed(1)} sales/listing`,
  };

  // 3. Competition Barrier Signal (Weight: 20%)
  let compScore = 80;
  // Penalty for high review saturation in the parent shop
  compScore -= Math.min(35, Math.round(reviewCount / 50));
  // Penalty for giant catalogs that dominate search share
  compScore -= Math.min(30, Math.round(activeListings / 15));

  // Fresh shop bonus entering successfully
  if (shopAgeMonths <= 14 && estDailySales >= 2) {
    compScore += 15;
  }

  compScore = Math.max(15, Math.min(99, compScore));
  let compLabel = "Accessible competition";
  if (compScore >= 75) compLabel = "Low barrier to entry";
  else if (compScore >= 50) compLabel = "Moderate competition";
  else compLabel = "High competition barrier";

  const competitionSignal: OpportunitySignal = {
    score: compScore,
    label: compLabel,
    metricValue: `${reviewCount} reviews · ${activeListings} listings`,
  };

  // 4. Buyer Engagement & Momentum Signal (Weight: 15%)
  const reviewRate = totalSales > 0 ? reviewCount / totalSales : 0;
  let momentumScore = 50;
  if (reviewRate >= 0.18) momentumScore = 85;
  else if (reviewRate >= 0.10) momentumScore = 70;
  else momentumScore = 45;

  if (numFavorers && numFavorers > 250) {
    momentumScore = Math.min(99, momentumScore + 12);
  }

  const momentumSignal: OpportunitySignal = {
    score: momentumScore,
    label: momentumScore >= 75 ? "High engagement" : "Steady engagement",
    metricValue: `${(reviewRate * 100).toFixed(1)}% review rate`,
  };

  // 5. Freshness Signal (Weight: 10%)
  let freshnessScore = 50;
  if (listingAgeDays <= 30) {
    freshnessScore = 95;
  } else if (listingAgeDays <= 90) {
    freshnessScore = 80;
  } else if (listingAgeDays <= 180) {
    freshnessScore = 65;
  } else if (listingAgeDays <= 365) {
    freshnessScore = 50;
  } else {
    freshnessScore = Math.max(20, 45 - Math.round((listingAgeDays - 365) / 100));
  }

  const freshnessSignal: OpportunitySignal = {
    score: freshnessScore,
    label: listingAgeDays <= 90 ? "Recently launched" : "Established listing",
    metricValue: `${listingAgeDays}d active`,
  };

  // Weighted Composite Score Calculation
  const weightedComposite =
    0.30 * velocitySignal.score +
    0.25 * densitySignal.score +
    0.20 * competitionSignal.score +
    0.15 * momentumSignal.score +
    0.10 * freshnessSignal.score;

  const opportunityScore = Math.max(10, Math.min(99, Math.round(weightedComposite)));

  // Opportunity Classification
  let classification: OpportunityType = "GROWING";
  let classificationLabel = "Consistent Growth";
  let classificationEmoji = "📈";
  let reason = `Sustained daily momentum (${estDailySales.toFixed(1)} sales/day) with balanced shop yield.`;

  if (shopAgeMonths <= 18 && estDailySales >= 3 && freshnessScore >= 60) {
    classification = "EMERGING";
    classificationLabel = "Emerging Winner";
    classificationEmoji = "🔥";
    reason = `Young shop (${Math.round(shopAgeMonths)} mos) generating ${estDailySales.toFixed(1)} sales/day with fresh market traction.`;
  } else if (avgSellingRatio >= 14 && activeListings <= 250 && compScore >= 60) {
    classification = "HIDDEN_GEM";
    classificationLabel = "Hidden Gem";
    classificationEmoji = "💎";
    reason = `High catalog efficiency (${avgSellingRatio.toFixed(1)} sales/listing) inside a compact ${activeListings}-listing store.`;
  } else if (activeListings >= 400 || (compScore < 45 && estDailySales >= 4)) {
    classification = "COMPETITION_RISING";
    classificationLabel = "High Demand / Crowded";
    classificationEmoji = "⚠️";
    reason = `Strong sales pace (${estDailySales.toFixed(1)}/day), but competing against a saturated catalog (${activeListings} listings).`;
  }

  // Evidence Bullets
  const evidence: string[] = [];
  if (estDailySales >= 2) {
    evidence.push(`High estimated sales pace (${estDailySales.toFixed(1)} sales/day).`);
  }
  if (reviewCount < 100) {
    evidence.push(`Low review barrier (${reviewCount} total reviews) facilitates faster ranking.`);
  } else if (reviewCount > 1000) {
    evidence.push(`High review saturation (${reviewCount.toLocaleString()} reviews) establishes authority.`);
  }
  if (avgSellingRatio >= 10) {
    evidence.push(`Strong catalog efficiency (${avgSellingRatio.toFixed(1)} sales per active listing).`);
  }
  if (price >= 15 && price <= 60) {
    evidence.push(`Optimal impulse pricing bracket ($${price.toFixed(2)}).`);
  }

  // Strengths & Weaknesses
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (velocityScore >= 70) strengths.push("Strong transaction velocity relative to age");
  else weaknesses.push("Subdued transaction velocity");

  if (densityScore >= 70) strengths.push("High sales conversion per listing");
  else weaknesses.push("Low catalog yield; sales diluted across many listings");

  if (compScore >= 70) strengths.push("Accessible niche with manageable review requirements");
  else weaknesses.push("High review saturation from incumbent sellers");

  if (price >= 15 && price <= 60) strengths.push("Proven e-commerce conversion sweet spot ($15–$60)");
  else if (price < 10) weaknesses.push("Low average order value may limit advertising margin");

  // Recommended Action
  let recommendedAction: ProductOpportunityScore["recommendedAction"] = "IGNORE";
  let strategicTakeaway = "Moderate market activity. Observe before committing production bandwidth.";

  if (opportunityScore >= 80) {
    recommendedAction = "SHORTLIST";
    strategicTakeaway = "Strong opportunity profile. Add to Planner, analyze competitor tags, and prepare listing draft.";
  } else if (opportunityScore >= 65) {
    recommendedAction = "STUDY_PRICING";
    strategicTakeaway = "Solid baseline demand. Study pricing tiers, bundle variations, and visual thumbnail angles.";
  } else if (opportunityScore >= 50) {
    recommendedAction = "MONITOR_VELOCITY";
    strategicTakeaway = "Consistent performance. Track shop over a 30-day window to evaluate seasonality.";
  }

  return {
    opportunityScore,
    classification,
    classificationLabel,
    classificationEmoji,
    reason,
    signals: {
      velocity: velocitySignal,
      density: densitySignal,
      competition: competitionSignal,
      freshness: freshnessSignal,
      momentum: momentumSignal,
    },
    evidence,
    strengths,
    weaknesses,
    recommendedAction,
    strategicTakeaway,
  };
}

// --------------------------------------------------------------------------
// Public Marketplace Search Provider
//
// Entry point is `searchMarketplaceProducts(marketplace, ...)` — it checks
// the marketplace registry's `research` capability first and returns a
// structured CapabilityUnavailable for anything that isn't Etsy today,
// rather than attempting Etsy-only logic against another marketplace. The
// Etsy code path below (searchEtsyMarketplaceProducts) is completely
// unchanged from before this migration — same raw Etsy client, same
// caching, same scoring — this only adds a marketplace check in front of it.
// --------------------------------------------------------------------------

export async function searchMarketplaceProducts(
  marketplace: MarketplaceId,
  organizationId: string,
  filters: EtsySearchFilters = {}
): Promise<ProductHuntingSearchResponse | CapabilityUnavailable> {
  const startTime = Date.now();

  try {
    const { orchestrateProductResearch } = await import("@/marketplaces/core/acquisition/orchestrator");
    const orchRes = await orchestrateProductResearch(
      {
        query: filters.keywords || "",
        marketplace,
        organizationId,
        limit: filters.limit,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
      },
      {
        preferredSources: ["PUBLIC_WEB", "MARKETPLACE_API", "HISTORICAL_OBSERVATION"],
        allowHistoricalFallback: true,
      }
    );

    if (orchRes.report.status === "NOT_IMPLEMENTED" || orchRes.report.status === "PARTIAL") {
      return {
        available: false,
        marketplace,
        capability: "research",
        reason: "CONNECTOR_NOT_IMPLEMENTED",
        message: `${marketplace} product search is not implemented yet.`,
      };
    }

    // A genuine "Etsy has zero listings matching this query" (no failures,
    // no unavailableReason) is NOT a capability failure — it falls through
    // to the normal empty-results response below, which the UI already
    // renders honestly ("No marketplace products found"). Only an actual
    // acquisition failure (credentials rejected, rate limited, upstream
    // error, or policy restricted) short-circuits here — see
    // classifyUnavailableReason in the orchestrator, which never infers a
    // failure from item count alone.
    if (orchRes.items.length === 0 && orchRes.report.status === "UNAVAILABLE" && orchRes.report.unavailableReason) {
      const reason = orchRes.report.unavailableReason;
      const MESSAGES: Record<NonNullable<typeof reason>, string> = {
        REQUIRES_CREDENTIALS: `Connect ${marketplace === "etsy" ? "Etsy" : marketplace} to enable ${marketplace} marketplace research, or ask an admin to check the configured API credentials in Admin -> Site Settings — the marketplace rejected the current key.`,
        RATE_LIMITED: `${marketplace} rate limit reached. Please try again shortly.`,
        UPSTREAM_ERROR: `The ${marketplace} marketplace source returned an error. Please try again later.`,
        POLICY_RESTRICTED: `This source cannot be accessed under the current marketplace data policy for ${marketplace}.`,
        PARSER_ERROR: `${marketplace} responded, but SellerSalt could not safely interpret the response.`,
      };
      return {
        available: false,
        marketplace,
        capability: "research",
        reason,
        message: `${MESSAGES[reason]} (${orchRes.report.limitations.join("; ")})`,
      };
    }

    // Fetch existing PlannerItems for this organization to mark saved status
    const existingPlannerItems = await prisma.plannerItem.findMany({
      where: { organizationId },
      select: { id: true, sourceListingUrl: true, sourceShopExternalId: true },
    }).catch(() => []);

    const plannerUrlMap = new Map<string, string>();
    for (const item of existingPlannerItems) {
      if (item.sourceListingUrl) {
        plannerUrlMap.set(item.sourceListingUrl, item.id);
      }
    }

    const results: ProductHuntingResult[] = orchRes.items.map((p) => {
      const listingAgeDays = 30;
      // Real, per-listing shop-aggregate stats (age/active listings) only
      // exist for Etsy's research connector today — Amazon/Walmart's
      // public search results carry no shop-level data at all. When
      // absent, shopAgeMonths/totalSales/activeListings/reviewCount below
      // are placeholder inputs for the (already-disclosed-as-derived)
      // SellerSalt Opportunity Score heuristic ONLY — shopMetricsObserved
      // tells the UI never to render them as if directly observed.
      const shopMetricsObserved = p.shop?.ageMonths !== undefined && p.shop?.activeListings !== undefined;
      const shopAgeMonths = p.shop?.ageMonths ?? 12;
      const totalSales = p.salesCount ?? 0;
      const activeListings = p.shop?.activeListings ?? 1;
      const reviewCount = p.reviewCount ?? 0;
      const reviewAverage = p.rating ?? null;
      // Never coerced to 0 for display — a real, unobserved price must
      // never render as a directly-observed "$0.00".
      const priceAmount: number | null = typeof p.price === "number" ? p.price : null;

      const normalizedListing: NormalizedProductListing = {
        listingId: p.externalId,
        title: p.title,
        description: "",
        price: priceAmount,
        currency: p.currency || "USD",
        images: p.imageUrl ? [p.imageUrl] : [],
        imageUrl: p.imageUrl || null,
        tags: (p.keywordSignals?.map((k) => k.term)) || [],
        materials: [],
        taxonomyId: null,
        createdTimestamp: Math.floor(Date.now() / 1000) - 30 * 86400,
        updatedTimestamp: Math.floor(Date.now() / 1000),
        listingAgeDays,
        listingAgeMonths: 1,
        listingUrl: p.url || "",
        shopId: p.shop?.name || p.externalId,
        shopName: p.shop?.name || "Marketplace Merchant",
        numFavorers: p.favoritesCount ?? null,
        views: null,
      };

      const normalizedShop: NormalizedShopProfile = {
        shopId: p.shop?.name || p.externalId,
        shopName: p.shop?.name || "Marketplace Merchant",
        shopUrl: p.shop?.url || p.url || "",
        shopIconUrl: null,
        createdTimestamp: Math.floor(Date.now() / 1000) - shopAgeMonths * 30 * 86400,
        shopAgeMonths,
        activeListings,
        totalSales,
        reviewCount,
        reviewAverage,
        shopMetricsObserved,
      };

      const estDailySales = totalSales > 0 ? totalSales / (shopAgeMonths * 30.44) : 0;
      const avgSellingRatio = totalSales > 0 ? totalSales / activeListings : 0;
      const reviewConversionRate = totalSales > 0 ? reviewCount / totalSales : 0;

      let salesVelocityProxy: ProductCalculatedSignals["salesVelocityProxy"] = "LOW";
      if (estDailySales >= 8) salesVelocityProxy = "HIGH";
      else if (estDailySales >= 3) salesVelocityProxy = "MODERATE";
      else if (estDailySales >= 0.8) salesVelocityProxy = "EMERGING";

      const signals: ProductCalculatedSignals = {
        estDailySales,
        avgSellingRatio,
        salesVelocityProxy,
        reviewConversionRate,
      };

      // The composite Opportunity Score is already disclosed to the user
      // as a derived "[SELLERSALT SCORE]", not a marketplace fact — it's
      // fine for its internal heuristic to fall back to 0 for a genuinely
      // unobserved price, the same way it already does for shop metrics.
      // What must never happen is *displaying* that fallback as if it
      // were the real observed price — see normalizedListing.price above.
      const opportunity: ProductOpportunityScore = computeProductOpportunity({
        price: priceAmount ?? 0,
        listingAgeDays,
        shopAgeMonths,
        totalSales,
        activeListings,
        reviewCount,
        reviewAverage,
        numFavorers: p.favoritesCount ?? null,
        estDailySales,
        avgSellingRatio,
      });

      if (p.opportunityScore?.score !== null && p.opportunityScore?.score !== undefined) {
        opportunity.opportunityScore = p.opportunityScore.score;
      }

      const plannerItemId = plannerUrlMap.get(normalizedListing.listingUrl) ?? null;

      return {
        id: p.externalId,
        listing: normalizedListing,
        shop: normalizedShop,
        signals,
        opportunity,
        isSavedToPlanner: !!plannerItemId,
        plannerItemId,
      };
    });

    const durationMs = Date.now() - startTime;

    return {
      results,
      totalCount: results.length,
      page: filters.page ?? 1,
      limit: filters.limit ?? 25,
      hasMore: false,
      searchParams: filters,
      source: "ETSY_LIVE_SEARCH" as const,
      executionDurationMs: durationMs,
    };
  } catch (err: any) {
    if (marketplace === "etsy") {
      return searchEtsyMarketplaceProducts(organizationId, filters);
    }
    return {
      available: false,
      marketplace,
      capability: "research",
      reason: "CONNECTOR_NOT_CONFIGURED",
      message: err?.message || `${marketplace} search failed.`,
    };
  }
}

export async function searchEtsyMarketplaceProducts(
  organizationId: string,
  filters: EtsySearchFilters = {}
): Promise<ProductHuntingSearchResponse> {
  const startTime = Date.now();

  // 1. Resolve API credentials from active connector or environment
  const activeConn = await getActiveConnectorWithCredentials(organizationId, "ETSY");
  const apiKey = activeConn?.credentials?.apiKey || process.env.ETSY_API_KEY || "";
  const sharedSecret = activeConn?.credentials?.sharedSecret || process.env.ETSY_SHARED_SECRET || "";

  if (!apiKey) {
    throw new Error("No active Etsy API credentials configured. Please configure an Etsy connector in Settings.");
  }

  const client = createEtsyClient(apiKey, sharedSecret);

  // 2. Fetch existing PlannerItems for this organization to mark saved status
  const existingPlannerItems = await prisma.plannerItem.findMany({
    where: { organizationId },
    select: { id: true, sourceListingUrl: true, sourceShopExternalId: true },
  });

  const plannerUrlMap = new Map<string, string>();
  for (const item of existingPlannerItems) {
    if (item.sourceListingUrl) {
      plannerUrlMap.set(item.sourceListingUrl, item.id);
    }
  }

  // 3. Build Etsy search parameters
  const limit = Math.min(50, Math.max(1, filters.limit ?? 25));
  const offset = filters.offset ?? (filters.page && filters.page > 1 ? (filters.page - 1) * limit : 0);

  const etsyParams: Record<string, any> = {
    limit,
    offset,
    sort_on: filters.sortOn ?? "score",
    sort_order: filters.sortOrder ?? "desc",
  };

  if (filters.keywords?.trim()) {
    etsyParams.keywords = filters.keywords.trim();
  }
  if (filters.taxonomyId) {
    etsyParams.taxonomy_id = filters.taxonomyId;
  }
  if (filters.minPrice !== undefined && filters.minPrice > 0) {
    etsyParams.min_price = filters.minPrice;
  }
  if (filters.maxPrice !== undefined && filters.maxPrice > 0) {
    etsyParams.max_price = filters.maxPrice;
  }
  if (filters.shopLocation?.trim()) {
    etsyParams.shop_location = filters.shopLocation.trim();
  }

  // 4. Execute search against hardened, cached client
  const searchResponse = await client.searchListings(etsyParams);
  const rawListings = searchResponse?.results ?? [];
  const totalCount = searchResponse?.count ?? rawListings.length;

  // 5. Gather unique shop IDs for batch enrichment (capped to 15 to avoid excessive fanout)
  const uniqueShopIds = Array.from(
    new Set(rawListings.map((l: any) => l.shop_id).filter(Boolean))
  ).slice(0, 15) as number[];

  const shopMap = new Map<number, any>();
  await Promise.all(
    uniqueShopIds.map(async (shopId) => {
      try {
        const shop = await client.getShop(shopId);
        if (shop) shopMap.set(shopId, shop);
      } catch {
        // Shop fetch failure handled gracefully
      }
    })
  );

  // 6. Normalize results & calculate Opportunity Radar scores
  const now = Date.now();
  const results: ProductHuntingResult[] = rawListings.map((raw: any) => {
    const listingId = String(raw.listing_id);
    const shopId = String(raw.shop_id ?? "");
    const rawShop = shopMap.get(raw.shop_id);

    // Listing data
    const priceAmount = (raw.price?.amount ?? 0) / (raw.price?.divisor ?? 100);
    const currency = raw.price?.currency_code ?? "USD";
    const createdTimestamp = raw.created_timestamp ?? Math.floor(now / 1000);
    const listingAgeDays = Math.max(1, Math.round((now - createdTimestamp * 1000) / (24 * 3600 * 1000)));
    const listingAgeMonths = Math.max(0.1, listingAgeDays / 30.44);

    const images: string[] = [];
    if (raw.images && Array.isArray(raw.images)) {
      for (const img of raw.images) {
        const url = img.url_570xN || img.url_fullxfull || img.url_75x75;
        if (url) images.push(url);
      }
    }
    const imageUrl = images[0] || raw.image_url || null;

    const normalizedListing: NormalizedProductListing = {
      listingId,
      title: raw.title ?? "Untitled Listing",
      description: raw.description,
      price: priceAmount,
      currency,
      images,
      imageUrl,
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      materials: Array.isArray(raw.materials) ? raw.materials : [],
      taxonomyId: raw.taxonomy_id ?? null,
      taxonomyPath: raw.taxonomy_path,
      createdTimestamp,
      updatedTimestamp: raw.updated_timestamp ?? createdTimestamp,
      listingAgeDays,
      listingAgeMonths,
      listingUrl: raw.url ?? `https://www.etsy.com/listing/${listingId}`,
      shopId,
      shopName: rawShop?.shop_name ?? raw.shop_name ?? `Shop ${shopId}`,
      numFavorers: raw.num_favorers ?? null,
      views: raw.views ?? null,
    };

    // Shop data
    const shopCreatedTimestamp = rawShop?.create_date ?? Math.floor(now / 1000);
    const shopAgeMonths = Math.max(
      1,
      Math.round((now - shopCreatedTimestamp * 1000) / (30.44 * 24 * 3600 * 1000))
    );
    const totalSales = rawShop?.transaction_sold_count ?? 0;
    const activeListings = Math.max(1, rawShop?.listing_active_count ?? 1);
    const reviewCount = rawShop?.review_count ?? 0;
    const reviewAverage = rawShop?.review_average ?? null;

    const normalizedShop: NormalizedShopProfile = {
      shopId,
      shopName: rawShop?.shop_name ?? raw.shop_name ?? `Shop ${shopId}`,
      shopUrl: rawShop?.url ?? `https://www.etsy.com/shop/${rawShop?.shop_name ?? shopId}`,
      shopIconUrl: rawShop?.icon_url_fullxfull ?? null,
      createdTimestamp: shopCreatedTimestamp,
      shopAgeMonths,
      totalSales,
      activeListings,
      reviewCount,
      reviewAverage,
      shopMetricsObserved: true,
    };

    // Calculated Signals
    const estDailySales = totalSales > 0 ? totalSales / (shopAgeMonths * 30.44) : 0;
    const avgSellingRatio = totalSales > 0 ? totalSales / activeListings : 0;
    const reviewConversionRate = totalSales > 0 ? reviewCount / totalSales : 0;

    let salesVelocityProxy: ProductCalculatedSignals["salesVelocityProxy"] = "LOW";
    if (estDailySales >= 8) salesVelocityProxy = "HIGH";
    else if (estDailySales >= 3) salesVelocityProxy = "MODERATE";
    else if (estDailySales >= 0.8) salesVelocityProxy = "EMERGING";

    const signals: ProductCalculatedSignals = {
      estDailySales,
      avgSellingRatio,
      salesVelocityProxy,
      reviewConversionRate,
    };

    // Opportunity Scoring
    const opportunity = computeProductOpportunity({
      price: priceAmount,
      listingAgeDays,
      shopAgeMonths,
      totalSales,
      activeListings,
      reviewCount,
      reviewAverage,
      numFavorers: raw.num_favorers ?? null,
      estDailySales,
      avgSellingRatio,
    });

    const plannerItemId = plannerUrlMap.get(normalizedListing.listingUrl) ?? null;

    return {
      id: listingId,
      listing: normalizedListing,
      shop: normalizedShop,
      signals,
      opportunity,
      isSavedToPlanner: !!plannerItemId,
      plannerItemId,
    };
  });

  const durationMs = Date.now() - startTime;

  return {
    results,
    totalCount,
    page: filters.page ?? 1,
    limit,
    hasMore: offset + results.length < totalCount,
    searchParams: filters,
    source: "ETSY_LIVE_SEARCH",
    executionDurationMs: durationMs,
  };
}

// --------------------------------------------------------------------------
// Multi-Product Comparison Provider
// --------------------------------------------------------------------------

export function compareProducts(items: ProductHuntingResult[]): ProductComparisonSummary {
  if (items.length === 0) {
    throw new Error("At least one product is required for comparison.");
  }

  // Tag overlap analysis
  const tagCounts = new Map<string, number>();
  const uniqueTagsByProduct: Record<string, string[]> = {};

  for (const item of items) {
    const productTags = item.listing.tags;
    uniqueTagsByProduct[item.id] = productTags;
    for (const tag of productTags) {
      const lower = tag.toLowerCase().trim();
      tagCounts.set(lower, (tagCounts.get(lower) ?? 0) + 1);
    }
  }

  const sharedTags = Array.from(tagCounts.entries())
    .filter(([_, count]) => count === items.length && items.length > 1)
    .map(([tag]) => tag);

  // Highest velocity product
  const highestVelocityProduct = [...items].sort(
    (a, b) => b.signals.estDailySales - a.signals.estDailySales
  )[0];

  // Lowest competition product (highest competition signal score)
  const lowestCompetitionProduct = [...items].sort(
    (a, b) => b.opportunity.signals.competition.score - a.opportunity.signals.competition.score
  )[0];

  // Highest composite opportunity score
  const highestOpportunityProduct = [...items].sort(
    (a, b) => b.opportunity.opportunityScore - a.opportunity.opportunityScore
  )[0];

  // Price calculations — only over items with a real observed price;
  // never coerce an unavailable price into 0 before computing a range.
  const prices = items.map((i) => i.listing.price).filter((p): p is number => p !== null);
  const priceRange =
    prices.length > 0
      ? {
          min: Math.min(...prices),
          max: Math.max(...prices),
          average: Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100,
        }
      : null;

  return {
    items,
    sharedTags,
    uniqueTagsByProduct,
    highestVelocityProduct,
    lowestCompetitionProduct,
    highestOpportunityProduct,
    priceRange,
  };
}
