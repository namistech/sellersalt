import { prisma } from "@/lib/db";
import type { ProspectStatus } from "@prisma/client";
import { evaluateCanonicalOpportunity } from "@/services/intelligence/canonical-opportunity";
import type { MarketplaceId } from "@/marketplaces/core/types";

// Server-only Frontend Data/Service Adapter for SellerSalt Opportunity Radar.
// Translates raw Etsy research data (Prospect, SearchConfig, ShopWatch, ShopSnapshot)
// into deterministic, explainable Opportunity Intelligence via the canonical engine.
//
// Import only from Server Components or API route handlers.

export type OpportunityType = "EMERGING" | "HIDDEN_GEM" | "GROWING" | "COMPETITION_RISING";

export interface OpportunitySignal {
  score: number; // 0–100
  label: string; // e.g. "High velocity", "Lean catalog"
  metricValue: string; // formatted raw value, e.g. "14.2 sales/day"
}

export interface OpportunityItem {
  id: string;
  prospectId: string;
  keyword: string;
  searchConfigId: string;
  searchConfigName: string;
  shopExternalId: string;
  shopName: string;
  shopUrl: string;
  shopIconUrl: string | null;
  listingTitle: string;
  listingUrl: string;
  listingImageUrl: string | null;
  // Batch 40: null when genuinely unobserved — never a fabricated 0/$0.00.
  price: number | null;
  totalSales: number;
  activeListings: number;
  shopAgeMonths: number;
  estDailySales: number;
  avgSellingRatio: number;
  reviewCount: number | null;
  reviewAverage: number | null;
  numFavorers: number | null;
  score: number; // 0–100 composite
  type: OpportunityType;
  typeLabel: string;
  typeEmoji: string;
  reason: string;
  signals: {
    velocity: OpportunitySignal;
    density: OpportunitySignal;
    competition: OpportunitySignal;
    freshness: OpportunitySignal;
    momentum: OpportunitySignal;
  };
  status: ProspectStatus;
  isFavorite: boolean;
  isShortlisted: boolean;
  isTracked: boolean;
  discoveredAt: string;
}

export interface OpportunityRadarPulse {
  totalOpportunities: number;
  highPotentialCount: number; // score >= 75
  emergingCount: number;
  hiddenGemCount: number;
  growingCount: number;
  averageScore: number;
  topNiches: Array<{ keyword: string; count: number; avgScore: number }>;
}

export interface OpportunityRadarData {
  pulse: OpportunityRadarPulse;
  spotlightOpportunities: OpportunityItem[];
  allOpportunities: OpportunityItem[];
  searchConfigs: Array<{ id: string; name: string }>;
  availableNiches: string[];
}

export interface OpportunityFilters {
  searchQuery?: string;
  searchConfigId?: string;
  type?: OpportunityType | "ALL";
  minScore?: number;
  sortBy?: "score" | "velocity" | "density" | "freshness" | "sales" | "price";
  sortOrder?: "asc" | "desc";
}

// --------------------------------------------------------------------------
// Opportunity Signals & Classification Helpers
// --------------------------------------------------------------------------

function calculateFreshnessSignal(discoveredAt: Date): OpportunitySignal {
  const ageHours = Math.max(0, (Date.now() - discoveredAt.getTime()) / (3600 * 1000));
  const ageDays = ageHours / 24;

  let score = 50;
  let label = "Monitored";

  if (ageDays <= 2) {
    score = 98;
    label = "Discovered recently";
  } else if (ageDays <= 7) {
    score = Math.round(85 - (ageDays - 2) * 2);
    label = "Fresh (this week)";
  } else if (ageDays <= 14) {
    score = Math.round(75 - (ageDays - 7) * 2);
    label = "Past 2 weeks";
  } else if (ageDays <= 30) {
    score = Math.round(60 - (ageDays - 14) * 0.8);
    label = "This month";
  } else {
    score = Math.max(25, Math.round(45 - (ageDays - 30) * 0.3));
    label = "Older discovery";
  }

  const timeLabel =
    ageHours < 24
      ? `${Math.max(1, Math.round(ageHours))}h ago`
      : `${Math.max(1, Math.round(ageDays))}d ago`;

  return {
    score,
    label,
    metricValue: timeLabel,
  };
}

function calculateMomentumSignal(
  reviewCount: number,
  totalSales: number,
  numFavorers: number | null
): OpportunitySignal {
  const reviewRatio = totalSales > 0 ? (reviewCount / totalSales) : 0;
  let score = 50;
  let label = "Steady interest";

  if (reviewRatio >= 0.18) {
    score = 88;
    label = "High review conversion";
  } else if (reviewRatio >= 0.10) {
    score = 70;
    label = "Healthy review conversion";
  } else {
    score = 45;
  }

  if (numFavorers && numFavorers > 200) {
    score = Math.min(98, score + 10);
  }

  return {
    score,
    label,
    metricValue: `${(reviewRatio * 100).toFixed(1)}% review rate`,
  };
}

function classifyOpportunity(
  compositeScore: number,
  shopAgeMonths: number,
  estDailySales: number,
  avgSellingRatio: number,
  activeListings: number,
  freshnessScore: number,
  competitionScore: number
): { type: OpportunityType; typeLabel: string; typeEmoji: string; reason: string } {
  // 1. Emerging: young shop + rapid velocity + recent discovery
  if (shopAgeMonths <= 18 && estDailySales >= 3.5 && freshnessScore >= 65) {
    return {
      type: "EMERGING",
      typeLabel: "Emerging Winner",
      typeEmoji: "🔥",
      reason: `Young shop (${Math.round(shopAgeMonths)} mos) generating ${estDailySales.toFixed(1)} sales/day with fresh discovery momentum.`,
    };
  }

  // 2. Hidden Gem: high sales per listing + compact catalog + low competition
  if (avgSellingRatio >= 14 && activeListings <= 250 && competitionScore >= 60) {
    return {
      type: "HIDDEN_GEM",
      typeLabel: "Hidden Gem",
      typeEmoji: "💎",
      reason: `High conversion density (${avgSellingRatio.toFixed(1)} sales/listing) with a compact ${activeListings}-listing catalog.`,
    };
  }

  // 3. Competition Rising: high sales but saturated listing volume
  if (activeListings >= 400 || (competitionScore < 45 && estDailySales >= 5)) {
    return {
      type: "COMPETITION_RISING",
      typeLabel: "High Demand / Crowded",
      typeEmoji: "⚠️",
      reason: `Significant volume (${estDailySales.toFixed(1)} sales/day), but competing against a dense ${activeListings}-listing catalog.`,
    };
  }

  // 4. Growing (Default healthy path)
  return {
    type: "GROWING",
    typeLabel: "Consistent Growth",
    typeEmoji: "📈",
    reason: `Sustained sales velocity (${estDailySales.toFixed(1)}/day) with balanced catalog yield in the ${shopAgeMonths.toFixed(0)}-month lifecycle.`,
  };
}

// --------------------------------------------------------------------------
// Public Service Provider
// --------------------------------------------------------------------------

export async function getOpportunityRadarData(
  organizationId: string,
  filters?: OpportunityFilters
): Promise<OpportunityRadarData> {
  const [rawProspects, searchConfigs, trackedShops] = await Promise.all([
    prisma.prospect.findMany({
      where: {
        organizationId,
        ...(filters?.searchConfigId && filters.searchConfigId !== "ALL"
          ? { searchConfigId: filters.searchConfigId }
          : {}),
      },
      include: {
        searchConfig: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 200,
    }),
    prisma.searchConfig.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.shopWatch.findMany({
      where: { organizationId, isActive: true },
      select: { shopExternalId: true },
    }),
  ]);

  const trackedSet = new Set(trackedShops.map((t: { shopExternalId: string }) => t.shopExternalId));

  // Transform raw prospects into scored Opportunities using canonical evaluation
  const opportunities: OpportunityItem[] = rawProspects.map((p: typeof rawProspects[number]) => {
    const totalSales = p.totalSales ?? 0;
    // Math.max(1, ...) below is a heuristic-internal denominator floor for
    // the derived SellerSalt score only — Prospect.activeListings/
    // shopAgeMonths are real, nullable fields (Batch 40); a missing value
    // safely floors to 1 here without ever being displayed as if it were
    // an observed "1 listing"/"1 month old" fact (see OpportunityItem's
    // returned activeListings/shopAgeMonths below, which are these same
    // heuristic-floored numbers, not the raw nullable Prospect columns).
    const activeListings = Math.max(1, p.activeListings ?? 1);
    const shopAgeMonths = Math.max(1, p.shopAgeMonths ?? 1);
    const estDailySales = p.estDailySales ?? (totalSales > 0 ? totalSales / (shopAgeMonths * 30.44) : 0);
    const avgSellingRatio = p.avgSellingRatio ?? (totalSales > 0 ? totalSales / activeListings : 0);
    const reviewCount = p.reviewCount;
    const discoveredAt = p.createdAt;
    const marketplace = (p.marketplace?.toLowerCase() as MarketplaceId) || "etsy";

    const canonicalReport = evaluateCanonicalOpportunity({
      marketplace,
      price: {
        value: p.price,
        availability: p.price !== null ? "OBSERVED" : "UNAVAILABLE",
        provenance: p.price !== null ? "ACTUAL_DATA" : "UNAVAILABLE",
        source: "etsy_listing_price",
      },
      estDailySales: {
        value: estDailySales > 0 ? estDailySales : null,
        availability: estDailySales > 0 ? "ESTIMATED" : "UNAVAILABLE",
        provenance: estDailySales > 0 ? "ESTIMATED" : "UNAVAILABLE",
        source: "etsy_transaction_velocity",
      },
      shopReviewCount: {
        value: reviewCount,
        availability: reviewCount !== null ? "OBSERVED" : "UNAVAILABLE",
        provenance: reviewCount !== null ? "ACTUAL_DATA" : "UNAVAILABLE",
        source: "etsy_shop_review_count",
      },
      listingAgeDays: {
        value: Math.max(1, Math.round((Date.now() - discoveredAt.getTime()) / (24 * 3600 * 1000))),
        availability: "OBSERVED",
        provenance: "ACTUAL_DATA",
        source: "prospect_created_at",
      },
      numFavorers: {
        value: p.numFavorers,
        availability: p.numFavorers !== null ? "OBSERVED" : "UNAVAILABLE",
        provenance: p.numFavorers !== null ? "ACTUAL_DATA" : "UNAVAILABLE",
        source: "etsy_num_favorers",
      },
    });

    const score = canonicalReport.overallScore ?? 50;

    const velocitySignal: OpportunitySignal = {
      score: canonicalReport.signalBreakdown.velocity?.score ?? 50,
      label: canonicalReport.signalBreakdown.velocity?.name || "Velocity",
      metricValue: canonicalReport.signalBreakdown.velocity?.rawMetric || `${estDailySales.toFixed(1)} sales/day`,
    };

    const densitySignal: OpportunitySignal = {
      score: canonicalReport.signalBreakdown.margin?.score ?? 50,
      label: canonicalReport.signalBreakdown.margin?.name || "Catalog Density",
      metricValue: canonicalReport.signalBreakdown.margin?.rawMetric || `${avgSellingRatio.toFixed(1)} sales/listing`,
    };

    const competitionSignal: OpportunitySignal = {
      score: canonicalReport.signalBreakdown.competition?.score ?? 50,
      label: canonicalReport.signalBreakdown.competition?.name || "Competition",
      metricValue: canonicalReport.signalBreakdown.competition?.rawMetric || `${activeListings} listings · ${reviewCount ?? "unavailable"} reviews`,
    };

    const freshnessSignal = calculateFreshnessSignal(discoveredAt);
    const momentumSignal = calculateMomentumSignal(reviewCount ?? 0, totalSales, p.numFavorers);

    const classification = classifyOpportunity(
      score,
      shopAgeMonths,
      estDailySales,
      avgSellingRatio,
      activeListings,
      freshnessSignal.score,
      competitionSignal.score
    );

    return {
      id: `opp_${p.id}`,
      prospectId: p.id,
      keyword: p.keyword,
      searchConfigId: p.searchConfigId,
      searchConfigName: p.searchConfig.name,
      shopExternalId: p.shopExternalId,
      shopName: p.shopName,
      shopUrl: p.shopUrl,
      shopIconUrl: p.shopIconUrl,
      listingTitle: p.listingTitle,
      listingUrl: p.listingUrl,
      listingImageUrl: p.listingImageUrl,
      price: p.price,
      totalSales,
      activeListings,
      shopAgeMonths,
      estDailySales,
      avgSellingRatio,
      reviewCount,
      reviewAverage: p.reviewAverage,
      numFavorers: p.numFavorers,
      score,
      type: classification.type,
      typeLabel: classification.typeLabel,
      typeEmoji: classification.typeEmoji,
      reason: classification.reason,
      signals: {
        velocity: velocitySignal,
        density: densitySignal,
        competition: competitionSignal,
        freshness: freshnessSignal,
        momentum: momentumSignal,
      },
      status: p.status,
      isFavorite: p.isFavorite,
      isShortlisted: p.status === "SHORTLISTED",
      isTracked: trackedSet.has(p.shopExternalId),
      discoveredAt: p.createdAt.toISOString(),
    };
  });

  // Calculate Pulse Metrics
  const totalOpportunities = opportunities.length;
  const highPotentialCount = opportunities.filter((o) => o.score >= 75).length;
  const emergingCount = opportunities.filter((o) => o.type === "EMERGING").length;
  const hiddenGemCount = opportunities.filter((o) => o.type === "HIDDEN_GEM").length;
  const growingCount = opportunities.filter((o) => o.type === "GROWING").length;

  const totalScoreSum = opportunities.reduce((acc, o) => acc + o.score, 0);
  const averageScore = totalOpportunities > 0 ? Math.round(totalScoreSum / totalOpportunities) : 0;

  // Niche frequency & avg score
  const nicheMap = new Map<string, { count: number; totalScore: number }>();
  for (const o of opportunities) {
    const existing = nicheMap.get(o.keyword) ?? { count: 0, totalScore: 0 };
    existing.count += 1;
    existing.totalScore += o.score;
    nicheMap.set(o.keyword, existing);
  }

  const topNiches = Array.from(nicheMap.entries())
    .map(([keyword, data]) => ({
      keyword,
      count: data.count,
      avgScore: Math.round(data.totalScore / data.count),
    }))
    .sort((a, b) => b.count - a.count || b.avgScore - a.avgScore)
    .slice(0, 5);

  const availableNiches = Array.from(nicheMap.keys()).sort();

  // Filter opportunities per user criteria
  let filteredOpportunities = [...opportunities];

  if (filters?.searchQuery) {
    const q = filters.searchQuery.toLowerCase().trim();
    filteredOpportunities = filteredOpportunities.filter(
      (o) =>
        o.shopName.toLowerCase().includes(q) ||
        o.listingTitle.toLowerCase().includes(q) ||
        o.keyword.toLowerCase().includes(q)
    );
  }

  if (filters?.type && filters.type !== "ALL") {
    filteredOpportunities = filteredOpportunities.filter((o) => o.type === filters.type);
  }

  if (filters?.minScore !== undefined && filters.minScore > 0) {
    filteredOpportunities = filteredOpportunities.filter((o) => o.score >= filters.minScore!);
  }

  // Sort opportunities
  const sortBy = filters?.sortBy ?? "score";
  const sortOrder = filters?.sortOrder ?? "desc";
  const multiplier = sortOrder === "asc" ? 1 : -1;

  filteredOpportunities.sort((a, b) => {
    switch (sortBy) {
      case "score":
        return (a.score - b.score) * multiplier;
      case "velocity":
        return (a.estDailySales - b.estDailySales) * multiplier;
      case "density":
        return (a.avgSellingRatio - b.avgSellingRatio) * multiplier;
      case "freshness":
        return (new Date(a.discoveredAt).getTime() - new Date(b.discoveredAt).getTime()) * multiplier;
      case "sales":
        return (a.totalSales - b.totalSales) * multiplier;
      case "price":
        // Null (genuinely unobserved) always sorts last regardless of
        // direction — same policy as sortProductHuntingResults (Batch 38).
        if (a.price === null && b.price === null) return 0;
        if (a.price === null) return 1;
        if (b.price === null) return -1;
        return (a.price - b.price) * multiplier;
      default:
        return (a.score - b.score) * multiplier;
    }
  });

  // Spotlight top 3 highest scoring
  const spotlightOpportunities = [...opportunities]
    .sort((a, b) => b.score - a.score || b.estDailySales - a.estDailySales)
    .slice(0, 3);

  return {
    pulse: {
      totalOpportunities,
      highPotentialCount,
      emergingCount,
      hiddenGemCount,
      growingCount,
      averageScore,
      topNiches,
    },
    spotlightOpportunities,
    allOpportunities: filteredOpportunities,
    searchConfigs,
    availableNiches,
  };
}
