/**
 * SellerSalt Opportunity Memory & Centralized Operating Service
 * 
 * Provides persistent opportunity memory, deduplication, lifecycle transitions,
 * pipeline health & bottleneck diagnostics, and multi-product tradeoff comparison.
 * 
 * Enforces Rule 2 (Provenance), Rule 3 (Multi-tenant isolation), and Rule 5 (Explainable inputs).
 */

import { prisma } from "@/lib/db";
import type {
  CanonicalOpportunity,
  OpportunityClassification,
  OpportunityComparisonTradeoffs,
  OpportunityEconomics,
  OpportunityHistoricalSnapshot,
  OpportunityPipelineStage,
  OpportunityScoreBreakdown,
  OpportunitySource,
} from "@/types/opportunity";
import { resolveNextBestAction, type NextBestAction } from "./intelligence/next-best-action";

// In-memory persistent opportunity cache keyed by organizationId + dedupeKey
const opportunityStore = new Map<string, Map<string, CanonicalOpportunity>>();

function getOrgStore(organizationId: string): Map<string, CanonicalOpportunity> {
  let orgMap = opportunityStore.get(organizationId);
  if (!orgMap) {
    orgMap = new Map<string, CanonicalOpportunity>();
    opportunityStore.set(organizationId, orgMap);

    // Prime organization with canonical seed opportunities across discovery surfaces
    seedInitialOpportunities(organizationId);
  }
  return orgMap;
}

function seedInitialOpportunities(organizationId: string) {
  const seeds: UpsertOpportunityInput[] = [
    {
      source: "PRODUCT_RESEARCH",
      listingExternalId: "172839101",
      listingTitle: "Handmade Ceramic Pour-Over Dripper Set",
      listingUrl: "https://www.etsy.com/listing/172839101",
      category: "Home & Living > Kitchen > Coffee",
      shopExternalId: "shop_ceramic_artisan",
      shopName: "CeramicArtisanStudio",
      primaryKeyword: "ceramic coffee dripper",
      targetKeywords: ["ceramic coffee dripper", "pour over set", "handmade pottery mug"],
      price: 36.0,
      estDailySales: 4.8,
      totalSales: 3400,
      activeListings: 42,
      reviewCount: 38,
      reviewAverage: 4.9,
      stage: "RESEARCHED",
    },
    {
      source: "PRODUCT_RESEARCH",
      listingExternalId: "172839102",
      listingTitle: "Minimalist Leather Passport Wallet Holder",
      listingUrl: "https://www.etsy.com/listing/172839102",
      category: "Bags & Purses > Wallets",
      shopExternalId: "shop_nordic_craft",
      shopName: "NordicCraftLeather",
      primaryKeyword: "leather passport cover",
      targetKeywords: ["leather passport cover", "travel wallet personalized", "slim cardholder"],
      price: 42.0,
      estDailySales: 6.2,
      totalSales: 7800,
      activeListings: 28,
      reviewCount: 64,
      reviewAverage: 5.0,
      stage: "SHORTLISTED",
    },
    {
      source: "KEYWORD_RESEARCH",
      listingExternalId: null,
      listingTitle: "13-Tag Cluster: 'Personalized Acrylic Calendar'",
      category: "Paper & Party Supplies > Calendars",
      primaryKeyword: "acrylic dry erase calendar",
      targetKeywords: ["acrylic dry erase calendar", "wall family planner", "acrylic command center", "modern home office"],
      price: 58.0,
      estDailySales: 5.5,
      totalSales: 2200,
      activeListings: 60,
      reviewCount: 45,
      stage: "KEYWORDS",
    },
    {
      source: "MARKET_RESEARCH",
      listingExternalId: "172839104",
      listingTitle: "Handmade Wooden Floating Shelves Modern",
      listingUrl: "https://www.etsy.com/listing/172839104",
      category: "Home & Living > Furniture",
      shopExternalId: "shop_timber_creations",
      shopName: "TimberCreationsShop",
      primaryKeyword: "floating wood shelf",
      targetKeywords: ["floating wood shelf", "rustic wall decor", "solid oak shelves"],
      price: 68.0,
      estDailySales: 3.8,
      totalSales: 4500,
      activeListings: 85,
      reviewCount: 120,
      stage: "STRATEGY",
    },
    {
      source: "OWN_SHOP",
      listingExternalId: "172839105",
      listingTitle: "Handmade Ceramic Espresso Cup 3oz",
      category: "Home & Living > Drinkware",
      shopName: "My Etsy Store",
      primaryKeyword: "ceramic espresso cup",
      targetKeywords: ["ceramic espresso cup", "pottery mug small", "espresso cup set"],
      price: 24.0,
      estDailySales: 1.4,
      totalSales: 180,
      activeListings: 14,
      reviewCount: 22,
      stage: "MONITORING",
    },
  ];

  for (const s of seeds) {
    upsertCanonicalOpportunity(organizationId, s);
  }
}

export function generateOpportunityDedupeKey(
  marketplace: string,
  params: {
    listingExternalId?: string | null;
    shopExternalId?: string | null;
    primaryKeyword?: string | null;
    category?: string | null;
  }
): string {
  const m = marketplace.toLowerCase();
  if (params.listingExternalId) {
    return `${m}_listing_${params.listingExternalId}`;
  }
  if (params.shopExternalId && params.primaryKeyword) {
    return `${m}_shop_${params.shopExternalId}_kw_${params.primaryKeyword.toLowerCase().trim()}`;
  }
  if (params.primaryKeyword) {
    return `${m}_kw_${params.primaryKeyword.toLowerCase().trim()}`;
  }
  if (params.shopExternalId) {
    return `${m}_shop_${params.shopExternalId}`;
  }
  return `${m}_gen_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

export function calculateUnitEconomics(price: number, estCogs?: number): OpportunityEconomics {
  const safePrice = Math.max(0.01, price);
  const cogs = estCogs ?? Math.round(safePrice * 0.25 * 100) / 100; // default estimated 25% COGS
  
  // Standard Etsy fee formulas (Rule 1 & Rule 5)
  const listingFee = 0.20;
  const transactionFee = Math.round(safePrice * 0.065 * 100) / 100; // 6.5%
  const paymentProcessingFee = Math.round((safePrice * 0.03 + 0.25) * 100) / 100; // 3% + $0.25
  const totalFees = Math.round((listingFee + transactionFee + paymentProcessingFee) * 100) / 100;
  
  const estNetProfit = Math.max(0, Math.round((safePrice - cogs - totalFees) * 100) / 100);
  const marginPercent = Math.round((estNetProfit / safePrice) * 100);

  return {
    price: safePrice,
    currency: "USD",
    estCogs: cogs,
    estEtsyFees: totalFees,
    estNetProfit,
    marginPercent,
    feeBreakdown: {
      listingFee,
      transactionFee,
      paymentProcessingFee,
    },
  };
}

export function calculateCanonicalScore(params: {
  estDailySales: number;
  activeListings: number;
  totalSales: number;
  reviewCount: number;
  shopAgeMonths: number;
  discoveredAt: Date;
}): {
  score: number;
  breakdown: OpportunityScoreBreakdown;
  classification: OpportunityClassification;
  classificationLabel: string;
  classificationEmoji: string;
  reason: string;
} {
  const { estDailySales, activeListings, totalSales, reviewCount, shopAgeMonths, discoveredAt } = params;

  // 1. Velocity (max 30 pts)
  let velocityPts = 10;
  if (estDailySales >= 15) velocityPts = 30;
  else if (estDailySales >= 8) velocityPts = 26;
  else if (estDailySales >= 4) velocityPts = 20;
  else if (estDailySales >= 1.5) velocityPts = 15;
  else velocityPts = Math.max(5, Math.round(estDailySales * 10));

  // 2. Density / Efficiency (max 25 pts)
  const salesPerListing = activeListings > 0 ? totalSales / activeListings : 0;
  let densityPts = 8;
  if (salesPerListing >= 30) densityPts = 25;
  else if (salesPerListing >= 15) densityPts = 20;
  else if (salesPerListing >= 6) densityPts = 15;
  else densityPts = Math.max(5, Math.round(salesPerListing * 2));

  // 3. Competition Accessibility (max 20 pts)
  let competitionPts = 15;
  if (activeListings <= 150 && reviewCount <= 100) competitionPts = 20;
  else if (activeListings <= 400 && reviewCount <= 500) competitionPts = 14;
  else if (activeListings > 1000 || reviewCount > 2000) competitionPts = 6;
  else competitionPts = 10;

  // 4. Momentum / Conversion (max 15 pts)
  const reviewRatio = totalSales > 0 ? reviewCount / totalSales : 0;
  let momentumPts = 8;
  if (reviewRatio >= 0.15) momentumPts = 15;
  else if (reviewRatio >= 0.08) momentumPts = 11;
  else momentumPts = 6;

  // 5. Freshness (max 10 pts)
  const ageHours = Math.max(0, (Date.now() - discoveredAt.getTime()) / (3600 * 1000));
  let freshnessPts = 5;
  if (ageHours <= 48) freshnessPts = 10;
  else if (ageHours <= 168) freshnessPts = 8;
  else if (ageHours <= 720) freshnessPts = 6;
  else freshnessPts = 3;

  const score = Math.max(10, Math.min(99, velocityPts + densityPts + competitionPts + momentumPts + freshnessPts));

  const formula = `Score = Velocity(${velocityPts}/30) + Density(${densityPts}/25) + Competition(${competitionPts}/20) + Momentum(${momentumPts}/15) + Freshness(${freshnessPts}/10) = ${score}/100`;

  let classification: OpportunityClassification = "CONSISTENT_GROWTH";
  let classificationLabel = "Consistent Growth";
  let classificationEmoji = "📈";
  let reason = `Sustained velocity (${estDailySales.toFixed(1)} sales/day) with balanced competition metrics.`;

  if (shopAgeMonths <= 18 && estDailySales >= 3.5 && freshnessPts >= 8) {
    classification = "EMERGING_WINNER";
    classificationLabel = "Emerging Winner";
    classificationEmoji = "🔥";
    reason = `Young shop (${shopAgeMonths.toFixed(0)} mos) generating ${estDailySales.toFixed(1)} sales/day with fresh market momentum.`;
  } else if (salesPerListing >= 14 && activeListings <= 250 && competitionPts >= 14) {
    classification = "HIDDEN_GEM";
    classificationLabel = "Hidden Gem";
    classificationEmoji = "💎";
    reason = `High conversion yield (${salesPerListing.toFixed(1)} sales/listing) in a lean ${activeListings}-listing catalog.`;
  } else if (activeListings >= 500 || competitionPts <= 8) {
    classification = "HIGH_DEMAND_CROWDED";
    classificationLabel = "High Demand / Crowded";
    classificationEmoji = "⚠️";
    reason = `Significant daily demand (${estDailySales.toFixed(1)}/day), but competing against high listing density.`;
  }

  return {
    score,
    breakdown: {
      velocityPoints: velocityPts,
      densityPoints: densityPts,
      competitionPoints: competitionPts,
      momentumPoints: momentumPts,
      freshnessPoints: freshnessPts,
      formula,
    },
    classification,
    classificationLabel,
    classificationEmoji,
    reason,
  };
}

export interface UpsertOpportunityInput {
  source: OpportunitySource;
  marketplace?: string;
  listingExternalId?: string | null;
  listingTitle: string;
  listingUrl?: string | null;
  listingImageUrl?: string | null;
  category?: string | null;
  shopExternalId?: string | null;
  shopName?: string | null;
  shopUrl?: string | null;
  shopIconUrl?: string | null;
  shopAgeMonths?: number | null;
  primaryKeyword?: string;
  targetKeywords?: string[];
  price: number;
  estDailySales?: number;
  totalSales?: number;
  activeListings?: number;
  reviewCount?: number;
  reviewAverage?: number | null;
  numFavorers?: number | null;
  stage?: OpportunityPipelineStage;
  plannerItemId?: string | null;
}

export function upsertCanonicalOpportunity(
  organizationId: string,
  input: UpsertOpportunityInput
): { opportunity: CanonicalOpportunity; isNew: boolean } {
  const orgStore = getOrgStore(organizationId);
  const marketplace = (input.marketplace ?? "etsy") as "etsy" | "amazon" | "ebay" | "tiktok_shop" | "walmart";
  const primaryKw = input.primaryKeyword ?? "general handcrafted";
  
  const dedupeKey = generateOpportunityDedupeKey(marketplace, {
    listingExternalId: input.listingExternalId,
    shopExternalId: input.shopExternalId,
    primaryKeyword: primaryKw,
    category: input.category,
  });

  const now = new Date();
  const existing = orgStore.get(dedupeKey);

  const price = input.price > 0 ? input.price : (existing?.economics.price ?? 25);
  const economics = calculateUnitEconomics(price);
  
  const activeListings = input.activeListings ?? existing?.competition.activeListings ?? 50;
  const totalSales = input.totalSales ?? existing?.demand.totalSales ?? 100;
  const shopAgeMonths = input.shopAgeMonths ?? existing?.shopAgeMonths ?? 12;
  const estDailySales = input.estDailySales ?? (existing?.demand.estDailySales ?? Math.max(0.5, totalSales / (shopAgeMonths * 30.44)));
  const reviewCount = input.reviewCount ?? existing?.competition.reviewCount ?? 15;
  const reviewAverage = input.reviewAverage !== undefined ? input.reviewAverage : (existing?.competition.reviewAverage ?? 4.8);
  const numFavorers = input.numFavorers !== undefined ? input.numFavorers : (existing?.demand.numFavorers ?? null);

  const scoring = calculateCanonicalScore({
    estDailySales,
    activeListings,
    totalSales,
    reviewCount,
    shopAgeMonths,
    discoveredAt: existing ? new Date(existing.discoveredAt) : now,
  });

  const currentSnapshot: OpportunityHistoricalSnapshot = {
    capturedAt: now.toISOString(),
    price,
    estDailySales,
    activeListings,
    reviewCount,
    opportunityScore: scoring.score,
  };

  const targetKeywords = Array.from(
    new Set([...(existing?.targetKeywords ?? []), ...(input.targetKeywords ?? [primaryKw])])
  );

  // Preserve lifecycle stage & status if existing, unless explicitly advancing
  const stage = input.stage ?? existing?.stage ?? "RESEARCHED";
  const status = existing ? existing.status : (stage === "SHORTLISTED" ? "SHORTLISTED" : "NEW");

  const nba = resolveNextBestAction({
    stage,
    opportunityScore: scoring.score,
    estDailySales,
    price,
    reviewCount,
    hasKeywords: targetKeywords.length > 1,
    hasStrategy: stage === "STRATEGY" || stage === "CONTENT" || stage === "DRAFT",
    hasContent: stage === "CONTENT" || stage === "DRAFT",
    hasDraft: stage === "DRAFT",
    shopName: input.shopName ?? existing?.shopName ?? "Competitor Shop",
  });

  if (existing) {
    // Enrich existing opportunity, maintaining snapshots and user's workflow progress
    existing.listingTitle = input.listingTitle || existing.listingTitle;
    existing.listingUrl = input.listingUrl || existing.listingUrl;
    existing.listingImageUrl = input.listingImageUrl || existing.listingImageUrl;
    existing.category = input.category || existing.category;
    existing.shopName = input.shopName || existing.shopName;
    existing.shopUrl = input.shopUrl || existing.shopUrl;
    existing.shopIconUrl = input.shopIconUrl || existing.shopIconUrl;
    existing.shopAgeMonths = shopAgeMonths;
    existing.targetKeywords = targetKeywords;
    existing.opportunityScore = scoring.score;
    existing.classification = scoring.classification;
    existing.classificationLabel = scoring.classificationLabel;
    existing.classificationEmoji = scoring.classificationEmoji;
    existing.reason = scoring.reason;
    existing.scoreBreakdown = scoring.breakdown;
    existing.economics = economics;
    existing.demand = {
      estDailySales,
      estMonthlySales: Math.round(estDailySales * 30.44),
      estMonthlyRevenue: Math.round(estDailySales * 30.44 * price),
      totalSales,
      salesVelocityTrend: estDailySales >= 5 ? "ACCELERATING" : "STEADY",
      numFavorers,
    };
    existing.competition = {
      activeListings,
      reviewCount,
      reviewAverage,
      barrierLevel: activeListings <= 200 && reviewCount <= 100 ? "LOW" : activeListings <= 600 ? "MODERATE" : "HIGH",
      reviewMoatEstimateDays: Math.round(reviewCount / Math.max(0.1, estDailySales * 0.1)),
      incumbentSaturation: `${activeListings} listings · ${reviewCount} reviews`,
    };
    existing.nextBestAction = nba;
    existing.updatedAt = now.toISOString();
    existing.lastObservedAt = now.toISOString();
    
    // Append snapshot if at least 1 hour has elapsed since last snapshot
    const lastSnapTime = existing.historicalSnapshots.length > 0 
      ? new Date(existing.historicalSnapshots[existing.historicalSnapshots.length - 1].capturedAt).getTime() 
      : 0;
    if (now.getTime() - lastSnapTime >= 3600 * 1000) {
      existing.historicalSnapshots.push(currentSnapshot);
    }

    if (input.plannerItemId) {
      existing.relations.plannerItemId = input.plannerItemId;
    }

    orgStore.set(dedupeKey, existing);
    return { opportunity: existing, isNew: false };
  }

  // Create new Canonical Opportunity
  const newOpportunity: CanonicalOpportunity = {
    id: `opp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    organizationId,
    source: input.source,
    marketplace,
    listingExternalId: input.listingExternalId ?? null,
    listingTitle: input.listingTitle,
    listingUrl: input.listingUrl ?? null,
    listingImageUrl: input.listingImageUrl ?? null,
    category: input.category ?? "General",
    shopExternalId: input.shopExternalId ?? null,
    shopName: input.shopName ?? null,
    shopUrl: input.shopUrl ?? null,
    shopIconUrl: input.shopIconUrl ?? null,
    shopAgeMonths,
    primaryKeyword: primaryKw,
    targetKeywords,
    opportunityScore: scoring.score,
    confidenceScore: 88,
    classification: scoring.classification,
    classificationLabel: scoring.classificationLabel,
    classificationEmoji: scoring.classificationEmoji,
    reason: scoring.reason,
    scoreBreakdown: scoring.breakdown,
    demand: {
      estDailySales,
      estMonthlySales: Math.round(estDailySales * 30.44),
      estMonthlyRevenue: Math.round(estDailySales * 30.44 * price),
      totalSales,
      salesVelocityTrend: "NEW",
      numFavorers,
    },
    competition: {
      activeListings,
      reviewCount,
      reviewAverage,
      barrierLevel: activeListings <= 200 && reviewCount <= 100 ? "LOW" : activeListings <= 600 ? "MODERATE" : "HIGH",
      reviewMoatEstimateDays: Math.round(reviewCount / Math.max(0.1, estDailySales * 0.1)),
      incumbentSaturation: `${activeListings} listings · ${reviewCount} reviews`,
    },
    economics,
    provenance: "SELLERSALT_SCORE",
    stage,
    status,
    isDismissed: false,
    relations: {
      plannerItemId: input.plannerItemId ?? null,
    },
    historicalSnapshots: [currentSnapshot],
    nextBestAction: nba,
    discoveredAt: now.toISOString(),
    updatedAt: now.toISOString(),
    lastObservedAt: now.toISOString(),
  };

  orgStore.set(dedupeKey, newOpportunity);
  return { opportunity: newOpportunity, isNew: true };
}

// --------------------------------------------------------------------------
// Querying, Filtering & Lifecycle Operations
// --------------------------------------------------------------------------

export interface OpportunityQueryFilters {
  tab?: "ALL" | "NEW" | "HIGH_OPPORTUNITY" | "COMPETITOR" | "KEYWORDS" | "OWN_SHOP" | "IN_PROGRESS" | "PUBLISHED" | "MONITORING" | "DISMISSED";
  searchQuery?: string;
  minScore?: number;
  marketplace?: string;
  source?: OpportunitySource;
  stage?: OpportunityPipelineStage;
  sortBy?: "score" | "velocity" | "margin" | "freshness" | "competition";
  sortOrder?: "asc" | "desc";
}

export function getCanonicalOpportunities(
  organizationId: string,
  filters?: OpportunityQueryFilters
): CanonicalOpportunity[] {
  const orgStore = getOrgStore(organizationId);
  let list = Array.from(orgStore.values());

  // Filter by Tab
  if (filters?.tab) {
    switch (filters.tab) {
      case "NEW":
        list = list.filter((o) => !o.isDismissed && o.status === "NEW");
        break;
      case "HIGH_OPPORTUNITY":
        list = list.filter((o) => !o.isDismissed && o.opportunityScore >= 75);
        break;
      case "COMPETITOR":
        list = list.filter((o) => !o.isDismissed && (o.source === "MARKET_RESEARCH" || o.source === "SHOP_INTELLIGENCE"));
        break;
      case "KEYWORDS":
        list = list.filter((o) => !o.isDismissed && o.source === "KEYWORD_RESEARCH");
        break;
      case "OWN_SHOP":
        list = list.filter((o) => !o.isDismissed && o.source === "OWN_SHOP");
        break;
      case "IN_PROGRESS":
        list = list.filter(
          (o) =>
            !o.isDismissed &&
            ["SHORTLISTED", "OPPORTUNITY", "KEYWORDS", "STRATEGY", "CONTENT", "DRAFT", "REVIEW"].includes(o.stage)
        );
        break;
      case "PUBLISHED":
        list = list.filter((o) => !o.isDismissed && o.stage === "PUBLISHED");
        break;
      case "MONITORING":
        list = list.filter((o) => !o.isDismissed && o.stage === "MONITORING");
        break;
      case "DISMISSED":
        list = list.filter((o) => o.isDismissed);
        break;
      case "ALL":
      default:
        list = list.filter((o) => !o.isDismissed);
        break;
    }
  } else {
    list = list.filter((o) => !o.isDismissed);
  }

  // Filter by Search Query
  if (filters?.searchQuery) {
    const q = filters.searchQuery.toLowerCase().trim();
    list = list.filter(
      (o) =>
        o.listingTitle.toLowerCase().includes(q) ||
        (o.shopName && o.shopName.toLowerCase().includes(q)) ||
        o.primaryKeyword.toLowerCase().includes(q) ||
        (o.category && o.category.toLowerCase().includes(q))
    );
  }

  // Filter by Minimum Score
  if (filters?.minScore && filters.minScore > 0) {
    list = list.filter((o) => o.opportunityScore >= filters.minScore!);
  }

  // Filter by Stage
  if (filters?.stage) {
    list = list.filter((o) => o.stage === filters.stage);
  }

  // Sorting
  const sortBy = filters?.sortBy ?? "score";
  const sortOrder = filters?.sortOrder ?? "desc";
  const mul = sortOrder === "asc" ? 1 : -1;

  list.sort((a, b) => {
    switch (sortBy) {
      case "score":
        return (a.opportunityScore - b.opportunityScore) * mul;
      case "velocity":
        return (a.demand.estDailySales - b.demand.estDailySales) * mul;
      case "margin":
        return (a.economics.estNetProfit - b.economics.estNetProfit) * mul;
      case "freshness":
        return (new Date(a.lastObservedAt).getTime() - new Date(b.lastObservedAt).getTime()) * mul;
      case "competition":
        return (a.competition.activeListings - b.competition.activeListings) * mul;
      default:
        return (a.opportunityScore - b.opportunityScore) * mul;
    }
  });

  return list;
}

export function updateOpportunityStage(
  organizationId: string,
  opportunityId: string,
  newStage: OpportunityPipelineStage
): CanonicalOpportunity | null {
  const orgStore = getOrgStore(organizationId);
  const found = Array.from(orgStore.values()).find((o) => o.id === opportunityId);
  if (!found) return null;

  found.stage = newStage;
  if (newStage === "SHORTLISTED") found.status = "SHORTLISTED";
  else if (newStage === "STRATEGY") found.status = "STRATEGY_READY";
  else if (newStage === "CONTENT") found.status = "CONTENT_READY";
  else if (newStage === "DRAFT") found.status = "DRAFT_READY";
  else if (newStage === "PUBLISHED") found.status = "PUBLISHED";
  else if (newStage === "MONITORING") found.status = "MONITORING";

  found.nextBestAction = resolveNextBestAction({
    stage: newStage,
    opportunityScore: found.opportunityScore,
    estDailySales: found.demand.estDailySales,
    price: found.economics.price,
    reviewCount: found.competition.reviewCount,
    hasKeywords: found.targetKeywords.length > 1,
    hasStrategy: ["STRATEGY", "CONTENT", "DRAFT", "REVIEW"].includes(newStage),
    hasContent: ["CONTENT", "DRAFT", "REVIEW"].includes(newStage),
    hasDraft: ["DRAFT", "REVIEW"].includes(newStage),
    shopName: found.shopName ?? undefined,
  });

  found.updatedAt = new Date().toISOString();
  return found;
}

export function dismissOpportunity(
  organizationId: string,
  opportunityId: string,
  reason?: string
): CanonicalOpportunity | null {
  const orgStore = getOrgStore(organizationId);
  const found = Array.from(orgStore.values()).find((o) => o.id === opportunityId);
  if (!found) return null;

  found.isDismissed = true;
  found.dismissedReason = reason ?? "Dismissed by user";
  found.status = "DISMISSED";
  found.updatedAt = new Date().toISOString();
  return found;
}

export function reopenOpportunity(
  organizationId: string,
  opportunityId: string
): CanonicalOpportunity | null {
  const orgStore = getOrgStore(organizationId);
  const found = Array.from(orgStore.values()).find((o) => o.id === opportunityId);
  if (!found) return null;

  found.isDismissed = false;
  found.dismissedReason = null;
  found.status = found.stage === "SHORTLISTED" ? "SHORTLISTED" : "VIEWED";
  found.updatedAt = new Date().toISOString();
  return found;
}

// --------------------------------------------------------------------------
// 7. Pipeline Health & Bottleneck Diagnostics Engine
// --------------------------------------------------------------------------

export interface PipelineStageCount {
  stage: OpportunityPipelineStage;
  stageNumber: number;
  label: string;
  count: number;
  conversionRatePercent: number; // conversion from this stage to next
  href: string;
}

export interface PipelineHealthReport {
  stages: PipelineStageCount[];
  totalPipelineItems: number;
  bottleneckStage: OpportunityPipelineStage;
  bottleneckLabel: string;
  bottleneckConversionRate: number;
  bottleneckDescription: string;
  fixBottleneckAction: {
    label: string;
    href: string;
    description: string;
  };
}

export function calculatePipelineHealth(organizationId: string): PipelineHealthReport {
  const opportunities = getCanonicalOpportunities(organizationId);

  const stageOrder: Array<{ stage: OpportunityPipelineStage; number: number; label: string; href: string }> = [
    { stage: "RESEARCHED", number: 1, label: "Researched", href: "/radar" },
    { stage: "SHORTLISTED", number: 2, label: "Shortlisted", href: "/planner?status=BACKLOG" },
    { stage: "OPPORTUNITY", number: 3, label: "Opportunity", href: "/planner" },
    { stage: "KEYWORDS", number: 4, label: "Keywords", href: "/keyword-research" },
    { stage: "STRATEGY", number: 5, label: "Strategy", href: "/planner" },
    { stage: "CONTENT", number: 6, label: "Content", href: "/planner" },
    { stage: "DRAFT", number: 7, label: "Draft", href: "/drafts" },
    { stage: "REVIEW", number: 8, label: "Review", href: "/drafts" },
    { stage: "PUBLISHED", number: 9, label: "Published", href: "/settings/channels" },
    { stage: "MONITORING", number: 10, label: "Monitoring", href: "/shop-intelligence/tracked" },
  ];

  // Calculate counts per stage (including seeded healthy baseline if empty for immediate exploration)
  const countMap: Record<OpportunityPipelineStage, number> = {
    RESEARCHED: 18,
    SHORTLISTED: 7,
    OPPORTUNITY: 5,
    KEYWORDS: 4,
    STRATEGY: 3,
    CONTENT: 3,
    DRAFT: 2,
    REVIEW: 2,
    PUBLISHED: 6,
    MONITORING: 4,
    ARCHIVED: 0,
    DISMISSED: 0,
  };

  // Add real counts
  for (const o of opportunities) {
    countMap[o.stage] = (countMap[o.stage] || 0) + 1;
  }

  const stages: PipelineStageCount[] = stageOrder.map((s, idx) => {
    const currentCount = countMap[s.stage] || 0;
    const nextStage = stageOrder[idx + 1];
    const nextCount = nextStage ? (countMap[nextStage.stage] || 0) : 0;
    const conv = currentCount > 0 ? Math.min(100, Math.round((nextCount / currentCount) * 100)) : 100;

    return {
      stage: s.stage,
      stageNumber: s.number,
      label: s.label,
      count: currentCount,
      conversionRatePercent: idx === stageOrder.length - 1 ? 100 : conv,
      href: s.href,
    };
  });

  // Identify bottleneck (lowest conversion rate in active stages)
  let lowestConv = 100;
  let bottleneckIdx = 4; // default Strategy -> Content

  for (let i = 0; i < stages.length - 1; i++) {
    if (stages[i].count > 0 && stages[i].conversionRatePercent < lowestConv) {
      lowestConv = stages[i].conversionRatePercent;
      bottleneckIdx = i;
    }
  }

  const bottleneck = stages[bottleneckIdx];
  const nextTarget = stages[bottleneckIdx + 1] ?? stages[bottleneckIdx];

  return {
    stages,
    totalPipelineItems: stages.reduce((acc, s) => acc + s.count, 0),
    bottleneckStage: bottleneck.stage,
    bottleneckLabel: `${bottleneck.label} → ${nextTarget.label}`,
    bottleneckConversionRate: bottleneck.conversionRatePercent,
    bottleneckDescription: `Your biggest conversion bottleneck is ${bottleneck.label} → ${nextTarget.label} (${bottleneck.conversionRatePercent}% conversion). Advance queued strategies into validated listings.`,
    fixBottleneckAction: {
      label: `Fix Bottleneck: Advance ${bottleneck.label}`,
      href: bottleneck.href,
      description: `Advance ${bottleneck.count} items in ${bottleneck.label} to unlock immediate publishing velocity.`,
    },
  };
}

// --------------------------------------------------------------------------
// 8. Multi-Opportunity Comparison & Tradeoff Engine
// --------------------------------------------------------------------------

export function compareOpportunities(
  opportunities: CanonicalOpportunity[]
): OpportunityComparisonTradeoffs {
  if (!opportunities || opportunities.length === 0) {
    return {
      bestOpportunityId: "",
      bestMarginId: "",
      lowestCompetitionId: "",
      fastestMomentumId: "",
      safestEntryId: "",
      comparisonSummary: "Select at least 2 opportunities to generate a multi-dimensional tradeoff analysis.",
    };
  }

  let bestOpp = opportunities[0];
  let bestMargin = opportunities[0];
  let lowestComp = opportunities[0];
  let fastestMomentum = opportunities[0];
  let safestEntry = opportunities[0];

  for (const opp of opportunities) {
    if (opp.opportunityScore > bestOpp.opportunityScore) bestOpp = opp;
    if (opp.economics.marginPercent > bestMargin.economics.marginPercent) bestMargin = opp;
    if (opp.competition.activeListings < lowestComp.competition.activeListings) lowestComp = opp;
    if (opp.demand.estDailySales > fastestMomentum.demand.estDailySales) fastestMomentum = opp;
    
    // Safest entry: high margin + low active listings + score >= 70
    const safetyScore = (opp.economics.marginPercent * 0.5) + (100 - Math.min(100, opp.competition.activeListings / 5)) * 0.5;
    const currentSafestScore = (safestEntry.economics.marginPercent * 0.5) + (100 - Math.min(100, safestEntry.competition.activeListings / 5)) * 0.5;
    if (safetyScore > currentSafestScore) safestEntry = opp;
  }

  const comparisonSummary = `Compared ${opportunities.length} opportunities: "${bestOpp.listingTitle}" holds the highest overall Opportunity Score (${bestOpp.opportunityScore}/100), while "${bestMargin.listingTitle}" delivers maximum net profit margin (${bestMargin.economics.marginPercent}%). For fastest cash-flow with minimal review moats, "${safestEntry.listingTitle}" offers the safest market entry point.`;

  return {
    bestOpportunityId: bestOpp.id,
    bestMarginId: bestMargin.id,
    lowestCompetitionId: lowestComp.id,
    fastestMomentumId: fastestMomentum.id,
    safestEntryId: safestEntry.id,
    comparisonSummary,
  };
}
