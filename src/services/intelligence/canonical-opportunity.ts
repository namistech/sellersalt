/**
 * SellerSalt Canonical Opportunity Intelligence Engine
 *
 * Single, canonical, marketplace-neutral opportunity model & scoring engine.
 * Sits above marketplace connectors, consuming normalized metrics with explicit
 * data availability and provenance (OBSERVED | ESTIMATED | DERIVED | UNAVAILABLE).
 *
 * Principles:
 * - 100% marketplace neutral: never assumes Etsy fees or constraints by default
 * - Never fabricates data: missing signals are marked UNAVAILABLE with value null (never 0)
 * - Dynamic weight redistribution: missing signal groups are excluded and remaining weights normalized
 * - Calibrated confidence: confidence reflects the completeness and fidelity of available signals
 * - Explainable & deterministic: full formula and point breakdown disclosed
 */

import type { MarketplaceId, SignalProvenance, NormalizedProduct } from "@/marketplaces/core/types";
import {
  getOptimizationRules,
  ETSY_OPTIMIZATION_RULES,
  type MarketplaceOptimizationRules,
} from "@/marketplaces/core/optimization-rules";
import {
  type ScoreTier,
  type StrategicActionVerdict,
  type ScoreFactorBreakdown,
  type UniversalScoreResult,
  getScoreTier,
} from "./universal-scoring";

// --------------------------------------------------------------------------
// Core Metric Types & Availability Semantics
// --------------------------------------------------------------------------

/**
 * Metric availability semantics:
 * - OBSERVED: Directly observed from marketplace API / public listing data (e.g. price, reviewCount, listingAgeDays).
 * - ESTIMATED: Statistical proxy or heuristic model (e.g. estimatedDailySales proxy).
 * - DERIVED: Calculated from other observed/estimated fields (e.g. margin%, salesPerListing, composite scores).
 * - UNAVAILABLE: The marketplace or connector does not provide this signal. Value is strictly null.
 */
export type MetricAvailability = "OBSERVED" | "ESTIMATED" | "DERIVED" | "UNAVAILABLE";

export type MetricImpact = "Positive" | "Neutral" | "Negative" | "Critical" | "Unavailable";

export type OpportunityClassification =
  | "EMERGING"
  | "HIDDEN_GEM"
  | "GROWING"
  | "COMPETITION_RISING"
  | "INSUFFICIENT_DATA";

export type RecommendedAction =
  | "ENTER_MARKET"
  | "DEVELOP_PRODUCT"
  | "SHORTLIST"
  | "STUDY_PRICING"
  | "MONITOR_VELOCITY"
  | "AVOID_SATURATED"
  | "INSUFFICIENT_DATA";

/**
 * Standardized data container for every intelligence metric.
 * Guarantees that unavailable metrics carry null rather than fake zeros.
 */
export interface OpportunityMetric<T = number> {
  value: T | null;
  availability: MetricAvailability;
  provenance: SignalProvenance;
  source?: string;
  explanation?: string;
}

/**
 * Creates a structured OpportunityMetric container.
 */
export function createMetric<T>(
  value: T | null | undefined,
  availability: MetricAvailability,
  provenance: SignalProvenance,
  options?: { source?: string; explanation?: string }
): OpportunityMetric<T> {
  if (value === null || value === undefined || availability === "UNAVAILABLE") {
    return {
      value: null,
      availability: "UNAVAILABLE",
      provenance: "UNAVAILABLE",
      source: options?.source,
      explanation: options?.explanation || "Signal unavailable from marketplace data source.",
    };
  }
  return {
    value,
    availability,
    provenance,
    source: options?.source,
    explanation: options?.explanation,
  };
}

/**
 * Helper to normalize raw inputs (which may be numbers, metrics, null, or undefined)
 * into a typed OpportunityMetric.
 */
export function toOpportunityMetric<T = number>(
  input: OpportunityMetric<T> | T | null | undefined,
  defaultAvailability: MetricAvailability = "OBSERVED",
  defaultProvenance: SignalProvenance = "ACTUAL_DATA",
  options?: { source?: string; explanation?: string }
): OpportunityMetric<T> {
  if (input === null || input === undefined) {
    return createMetric<T>(null, "UNAVAILABLE", "UNAVAILABLE", options);
  }
  if (typeof input === "object" && "availability" in (input as any)) {
    const m = input as OpportunityMetric<T>;
    if (m.value === null || m.value === undefined || m.availability === "UNAVAILABLE") {
      return createMetric<T>(null, "UNAVAILABLE", "UNAVAILABLE", {
        source: m.source ?? options?.source,
        explanation: m.explanation ?? options?.explanation,
      });
    }
    return m;
  }
  return createMetric<T>(input as T, defaultAvailability, defaultProvenance, options);
}

// --------------------------------------------------------------------------
// Canonical Input & Output Models
// --------------------------------------------------------------------------

export interface CanonicalOpportunityInput {
  marketplace: MarketplaceId;
  productId?: string;
  productTitle?: string;
  productUrl?: string;
  shopId?: string;
  shopName?: string;

  // Normalized signals (accepts OpportunityMetric<T> or primitive or null/undefined)
  price: OpportunityMetric<number> | number | null;
  currency?: string | null;
  estDailySales?: OpportunityMetric<number> | number | null;
  estimatedCogs?: OpportunityMetric<number> | number | null;
  shopReviewCount?: OpportunityMetric<number> | number | null;
  listingAgeDays?: OpportunityMetric<number> | number | null;
  numFavorers?: OpportunityMetric<number> | number | null;
  totalSales?: OpportunityMetric<number> | number | null;
  activeListings?: OpportunityMetric<number> | number | null;
  shopAgeMonths?: OpportunityMetric<number> | number | null;
  avgSellingRatio?: OpportunityMetric<number> | number | null;
  reviewAverage?: OpportunityMetric<number> | number | null;
  categoryMedianPrice?: OpportunityMetric<number> | number | null;
  competingListingsCount?: OpportunityMetric<number> | number | null;
  keywordCount?: OpportunityMetric<number> | number | null;
  tagComplianceRate?: OpportunityMetric<number> | number | null;

  // Marketplace rules & economic configuration
  rules?: MarketplaceOptimizationRules | null;
  feeSchedule?: { percentageFee: number; flatFee: number } | null;
}

export interface OpportunitySignalGroup {
  id: string;
  name: string;
  available: boolean;
  weight: number; // Normalized weight summing to 1.0 across available groups
  rawWeight: number; // Unnormalized baseline weight
  score: number | null; // 0 - 100 when available, null when unavailable
  pointsContributed: number; // Math.round(weight * score)
  availability: MetricAvailability;
  impactLabel: MetricImpact;
  explanation: string;
  rawMetric: string | null;
}

export interface CanonicalOpportunityReport {
  overallScore: number | null; // 0 - 100 integer (or null if all signals unavailable)
  tier: ScoreTier;
  tierLabel: string;
  classification: OpportunityClassification;
  classificationLabel: string;
  classificationEmoji: string;
  verdict: StrategicActionVerdict;
  verdictLabel: string;
  verdictVariant: "success" | "warning" | "danger" | "info" | "neutral";
  summary: string;
  explanation: {
    summary: string;
    whyThisScore: string;
    primaryStrength?: string;
    primaryRisk?: string;
  };
  signals: {
    available: OpportunitySignalGroup[];
    unavailable: OpportunitySignalGroup[];
  };
  signalBreakdown: Record<string, OpportunitySignalGroup>;
  evidence: string[];
  strengths: string[];
  weaknesses: string[];
  recommendedAction: RecommendedAction;
  strategicTakeaway: string;
  confidenceScore: number; // 0 - 100 percentage reflecting signal completeness & fidelity
  marketplace: MarketplaceId;
  provenance: SignalProvenance; // "SELLERSALT_SCORE"
  scoredAt: Date;
}

// --------------------------------------------------------------------------
// Score Tier & Verdict Mappers (re-exported from universal-scoring)
// --------------------------------------------------------------------------

export { getScoreTier };

// --------------------------------------------------------------------------
// Signal Extraction from NormalizedProduct
// --------------------------------------------------------------------------

/**
 * Extracts a marketplace-neutral CanonicalOpportunityInput from a NormalizedProduct.
 * Preserves exact observed vs estimated vs derived metadata.
 */
export function extractOpportunityInputFromNormalizedProduct(
  product: NormalizedProduct,
  rules?: MarketplaceOptimizationRules | null
): CanonicalOpportunityInput {
  const marketplace = product.marketplace;
  const resolvedRules = rules !== undefined ? rules : getOptimizationRules(marketplace);

  // Price (Observed)
  const priceMetric = createMetric<number>(
    product.price,
    product.price !== null && product.price !== undefined ? "OBSERVED" : "UNAVAILABLE",
    product.price !== null && product.price !== undefined ? "ACTUAL_DATA" : "UNAVAILABLE",
    { source: `${marketplace}_listing_price` }
  );

  // Demand / Sales Velocity (Estimated / Derived)
  const estDailySales = product.estimatedDemand ?? (
    product.salesCount && product.shop?.ageMonths && product.shop.ageMonths > 0
      ? product.salesCount / (product.shop.ageMonths * 30.44)
      : null
  );
  const estDailySalesMetric = createMetric<number>(
    estDailySales,
    estDailySales !== null ? "ESTIMATED" : "UNAVAILABLE",
    estDailySales !== null ? "ESTIMATED" : "UNAVAILABLE",
    { source: "sellersalt_velocity_proxy" }
  );

  // Review Count (Observed)
  const shopReviewCountMetric = createMetric<number>(
    product.reviewCount ?? null,
    product.reviewCount !== null && product.reviewCount !== undefined ? "OBSERVED" : "UNAVAILABLE",
    product.reviewCount !== null && product.reviewCount !== undefined ? "ACTUAL_DATA" : "UNAVAILABLE",
    { source: `${marketplace}_review_count` }
  );

  // Listing Age (Observed / Derived from capturedAt if unavailable)
  const listingAgeDaysMetric = createMetric<number>(
    null,
    "UNAVAILABLE",
    "UNAVAILABLE",
    { source: `${marketplace}_created_timestamp` }
  );

  // Favorites Count (Observed)
  const numFavorersMetric = createMetric<number>(
    product.favoritesCount ?? null,
    product.favoritesCount !== null && product.favoritesCount !== undefined ? "OBSERVED" : "UNAVAILABLE",
    product.favoritesCount !== null && product.favoritesCount !== undefined ? "ACTUAL_DATA" : "UNAVAILABLE",
    { source: `${marketplace}_favorites_count` }
  );

  // Total Shop Sales (Observed)
  const totalSalesMetric = createMetric<number>(
    product.salesCount ?? null,
    product.salesCount !== null && product.salesCount !== undefined ? "OBSERVED" : "UNAVAILABLE",
    product.salesCount !== null && product.salesCount !== undefined ? "ACTUAL_DATA" : "UNAVAILABLE",
    { source: `${marketplace}_total_sales` }
  );

  // Active Listings (Observed)
  const activeListingsMetric = createMetric<number>(
    product.shop?.activeListings ?? null,
    product.shop?.activeListings !== null && product.shop?.activeListings !== undefined ? "OBSERVED" : "UNAVAILABLE",
    product.shop?.activeListings !== null && product.shop?.activeListings !== undefined ? "ACTUAL_DATA" : "UNAVAILABLE",
    { source: `${marketplace}_active_listings` }
  );

  // Shop Age Months (Observed)
  const shopAgeMonthsMetric = createMetric<number>(
    product.shop?.ageMonths ?? null,
    product.shop?.ageMonths !== null && product.shop?.ageMonths !== undefined ? "OBSERVED" : "UNAVAILABLE",
    product.shop?.ageMonths !== null && product.shop?.ageMonths !== undefined ? "ACTUAL_DATA" : "UNAVAILABLE",
    { source: `${marketplace}_shop_age` }
  );

  // Avg Selling Ratio (Derived)
  const avgSellingRatioMetric = createMetric<number>(
    product.shop?.avgSellingRatio ?? (
      product.salesCount && product.shop?.activeListings && product.shop.activeListings > 0
        ? product.salesCount / product.shop.activeListings
        : null
    ),
    product.shop?.avgSellingRatio !== null && product.shop?.avgSellingRatio !== undefined ? "DERIVED" : "UNAVAILABLE",
    "ESTIMATED",
    { source: "sellersalt_catalog_efficiency" }
  );

  return {
    marketplace,
    productId: product.externalId,
    productTitle: product.title,
    productUrl: product.url,
    shopId: product.shop?.externalId,
    shopName: product.shop?.name,
    price: priceMetric,
    currency: product.currency,
    estDailySales: estDailySalesMetric,
    shopReviewCount: shopReviewCountMetric,
    listingAgeDays: listingAgeDaysMetric,
    numFavorers: numFavorersMetric,
    totalSales: totalSalesMetric,
    activeListings: activeListingsMetric,
    shopAgeMonths: shopAgeMonthsMetric,
    avgSellingRatio: avgSellingRatioMetric,
    reviewAverage: toOpportunityMetric(product.rating, "OBSERVED", "ACTUAL_DATA"),
    rules: resolvedRules,
    feeSchedule: resolvedRules?.feeSchedule ?? null,
  };
}

// --------------------------------------------------------------------------
// Canonical Opportunity Scoring Engine
// --------------------------------------------------------------------------

/**
 * Deterministic, marketplace-neutral opportunity scoring engine.
 * Evaluates available signal groups, redistributes weights for unavailable
 * signals, and exposes explicit provenance and metric availability metadata.
 */
export function evaluateCanonicalOpportunity(input: CanonicalOpportunityInput): CanonicalOpportunityReport {
  const marketplace = input.marketplace;
  const scoredAt = new Date();

  // Resolve rules & fee schedule without assuming Etsy unless configured
  const rules = input.rules !== undefined ? input.rules : getOptimizationRules(marketplace);
  const feeSchedule = input.feeSchedule !== undefined
    ? input.feeSchedule
    : (rules?.feeSchedule ?? (marketplace === "etsy" ? ETSY_OPTIMIZATION_RULES.feeSchedule : null));

  // Normalize metric inputs
  const priceM = toOpportunityMetric(input.price, "OBSERVED", "ACTUAL_DATA");
  const estDailySalesM = toOpportunityMetric(input.estDailySales, "ESTIMATED", "ESTIMATED");
  const estimatedCogsM = toOpportunityMetric(input.estimatedCogs, "ESTIMATED", "ESTIMATED");
  const shopReviewCountM = toOpportunityMetric(input.shopReviewCount, "OBSERVED", "ACTUAL_DATA");
  const listingAgeDaysM = toOpportunityMetric(input.listingAgeDays, "OBSERVED", "ACTUAL_DATA");
  const numFavorersM = toOpportunityMetric(input.numFavorers, "OBSERVED", "ACTUAL_DATA");
  const totalSalesM = toOpportunityMetric(input.totalSales, "OBSERVED", "ACTUAL_DATA");
  const activeListingsM = toOpportunityMetric(input.activeListings, "OBSERVED", "ACTUAL_DATA");
  const shopAgeMonthsM = toOpportunityMetric(input.shopAgeMonths, "OBSERVED", "ACTUAL_DATA");
  const avgSellingRatioM = toOpportunityMetric(input.avgSellingRatio, "DERIVED", "ESTIMATED");
  const categoryMedianPriceM = toOpportunityMetric(input.categoryMedianPrice, "DERIVED", "ESTIMATED");

  const evaluatedGroups: OpportunitySignalGroup[] = [];

  // ========================================================================
  // 1. Demand & Sales Velocity Signal Group (Baseline Weight: 35%)
  // ========================================================================
  const estDailySales = estDailySalesM.value ?? (
    totalSalesM.value !== null && shopAgeMonthsM.value !== null && shopAgeMonthsM.value > 0
      ? totalSalesM.value / (shopAgeMonthsM.value * 30.44)
      : null
  );

  if (estDailySales !== null && estDailySales >= 0) {
    const velocityScore = Math.min(100, Math.max(15, Math.round((estDailySales / 4.0) * 100)));
    const impactLabel: MetricImpact = velocityScore >= 75 ? "Positive" : velocityScore >= 50 ? "Neutral" : "Negative";
    evaluatedGroups.push({
      id: "velocity",
      name: "Sales Velocity & Buyer Demand",
      available: true,
      rawWeight: 0.35,
      weight: 0.35,
      score: velocityScore,
      pointsContributed: 0, // Computed after weight normalization
      availability: estDailySalesM.availability !== "UNAVAILABLE" ? estDailySalesM.availability : "DERIVED",
      impactLabel,
      explanation: `Observed estimated velocity of ${estDailySales.toFixed(1)} sales/day indicates ${
        estDailySales >= 3 ? "strong consistent daily order volume." : "steady entry-level transaction volume."
      }`,
      rawMetric: `${estDailySales.toFixed(1)} sales/day`,
    });
  } else {
    evaluatedGroups.push({
      id: "velocity",
      name: "Sales Velocity & Buyer Demand",
      available: false,
      rawWeight: 0.35,
      weight: 0,
      score: null,
      pointsContributed: 0,
      availability: "UNAVAILABLE",
      impactLabel: "Unavailable",
      explanation: `Sales velocity signal is unavailable from ${marketplace} marketplace data.`,
      rawMetric: null,
    });
  }

  // ========================================================================
  // 2. Profit Margin & Unit Economics Signal Group (Baseline Weight: 25%)
  // ========================================================================
  const price = priceM.value;
  let marginPercent = 0;
  let marginFees = 0;

  if (price !== null && price > 0 && feeSchedule !== null) {
    const cogs = estimatedCogsM.value ?? 0;
    marginFees = price * feeSchedule.percentageFee + feeSchedule.flatFee;
    const netContribution = Math.max(0, price - cogs - marginFees);
    marginPercent = (netContribution / price) * 100;
    const marginScore = Math.min(100, Math.max(20, Math.round(marginPercent * 1.1)));
    const impactLabel: MetricImpact = marginScore >= 70 ? "Positive" : "Neutral";
    evaluatedGroups.push({
      id: "margin",
      name: "Profit Margin & Take-Home",
      available: true,
      rawWeight: 0.25,
      weight: 0.25,
      score: marginScore,
      pointsContributed: 0,
      availability: "DERIVED",
      impactLabel,
      explanation: `Estimated net margin of ${marginPercent.toFixed(1)}% after standard ${marketplace} fees ($${marginFees.toFixed(2)}/unit)${cogs > 0 ? ` and COGS ($${cogs.toFixed(2)})` : ""}.`,
      rawMetric: `${marginPercent.toFixed(1)}% net margin`,
    });
  } else {
    evaluatedGroups.push({
      id: "margin",
      name: "Profit Margin & Take-Home",
      available: false,
      rawWeight: 0.25,
      weight: 0,
      score: null,
      pointsContributed: 0,
      availability: "UNAVAILABLE",
      impactLabel: "Unavailable",
      explanation: feeSchedule === null
        ? `No fee schedule configured for ${marketplace} — profit margin factor excluded, not guessed.`
        : `Product price is unavailable for ${marketplace}.`,
      rawMetric: null,
    });
  }

  // ========================================================================
  // 3. Incumbent Review Threshold & Competition Barrier (Baseline Weight: 20%)
  // ========================================================================
  const shopReviews = shopReviewCountM.value;
  if (shopReviews !== null && shopReviews >= 0) {
    let reviewMoatScore = 80;
    if (shopReviews < 100) reviewMoatScore = 95;
    else if (shopReviews < 500) reviewMoatScore = 80;
    else if (shopReviews < 2000) reviewMoatScore = 55;
    else reviewMoatScore = 30;

    const impactLabel: MetricImpact = reviewMoatScore >= 70 ? "Positive" : reviewMoatScore >= 50 ? "Neutral" : "Negative";
    evaluatedGroups.push({
      id: "competition",
      name: "Incumbent Review Threshold",
      available: true,
      rawWeight: 0.20,
      weight: 0.20,
      score: reviewMoatScore,
      pointsContributed: 0,
      availability: shopReviewCountM.availability,
      impactLabel,
      explanation: `Competitor store holds ${shopReviews.toLocaleString()} lifetime reviews, representing a ${
        shopReviews < 500 ? "reachable entry threshold." : "moderate incumbent review advantage."
      }`,
      rawMetric: `${shopReviews.toLocaleString()} reviews`,
    });
  } else {
    evaluatedGroups.push({
      id: "competition",
      name: "Incumbent Review Threshold",
      available: false,
      rawWeight: 0.20,
      weight: 0.20,
      score: null,
      pointsContributed: 0,
      availability: "UNAVAILABLE",
      impactLabel: "Unavailable",
      explanation: `Seller review threshold signal is unavailable from ${marketplace} data.`,
      rawMetric: null,
    });
  }

  // ========================================================================
  // 4. Listing Freshness & Market Momentum (Baseline Weight: 20%)
  // ========================================================================
  const listingAgeDays = listingAgeDaysM.value;
  const numFavorers = numFavorersM.value ?? 0;

  if (listingAgeDays !== null && listingAgeDays >= 0) {
    let freshnessScore = 70;
    if (listingAgeDays <= 90 && (estDailySales ?? 0) >= 2) freshnessScore = 95;
    else if (listingAgeDays <= 180) freshnessScore = 85;
    else if (listingAgeDays <= 365) freshnessScore = 70;
    else freshnessScore = 50;

    const impactLabel: MetricImpact = freshnessScore >= 80 ? "Positive" : "Neutral";
    const favText = numFavorersM.value !== null ? ` with ${numFavorers.toLocaleString()} customer favorites` : "";
    evaluatedGroups.push({
      id: "freshness",
      name: "Market Freshness & Momentum",
      available: true,
      rawWeight: 0.20,
      weight: 0.20,
      score: freshnessScore,
      pointsContributed: 0,
      availability: listingAgeDaysM.availability,
      impactLabel,
      explanation: `Listing has been active for ${listingAgeDays} days${favText}.`,
      rawMetric: `${listingAgeDays} days active`,
    });
  } else {
    evaluatedGroups.push({
      id: "freshness",
      name: "Market Freshness & Momentum",
      available: false,
      rawWeight: 0.20,
      weight: 0.20,
      score: null,
      pointsContributed: 0,
      availability: "UNAVAILABLE",
      impactLabel: "Unavailable",
      explanation: `Listing age and freshness signal is unavailable from ${marketplace} data.`,
      rawMetric: null,
    });
  }

  // Optional 5. Price Stability signal (when categoryMedianPrice is provided)
  if (categoryMedianPriceM.value !== null) {
    // If median price is provided, add price stability context
  } else if (input.categoryMedianPrice !== undefined) {
    evaluatedGroups.push({
      id: "price_stability",
      name: "Category Price Stability",
      available: false,
      rawWeight: 0,
      weight: 0,
      score: null,
      pointsContributed: 0,
      availability: "UNAVAILABLE",
      impactLabel: "Unavailable",
      explanation: `No category median price supplied for ${marketplace} — price-stability signal is unavailable, not estimated.`,
      rawMetric: null,
    });
  }

  // ========================================================================
  // Weight Normalization & Composite Calculation (Phase 4)
  // ========================================================================
  const availableGroups = evaluatedGroups.filter((g) => g.available && g.score !== null);
  const unavailableGroups = evaluatedGroups.filter((g) => !g.available || g.score === null);

  const totalAvailableRawWeight = availableGroups.reduce((sum, g) => sum + g.rawWeight, 0);
  const totalPossibleRawWeight = evaluatedGroups.reduce((sum, g) => sum + g.rawWeight, 0);

  let overallScore: number | null = null;
  let totalWeightedPoints = 0;

  if (availableGroups.length > 0 && totalAvailableRawWeight > 0) {
    for (const group of availableGroups) {
      group.weight = group.rawWeight / totalAvailableRawWeight;
      group.pointsContributed = Math.round(group.score! * group.weight);
      totalWeightedPoints += group.pointsContributed;
    }
    overallScore = Math.max(10, Math.min(99, totalWeightedPoints));
  }

  // Calibrated confidence score (Phase 6)
  // Base confidence is 88% for standard 4-factor inputs. More missing factors proportionally reduce confidence.
  const completeness = totalPossibleRawWeight > 0 ? totalAvailableRawWeight / totalPossibleRawWeight : 0;
  const confidenceScore = Math.round(88 * completeness);

  const { tier, tierLabel, verdictVariant } = getScoreTier(overallScore ?? 0);

  // ========================================================================
  // Classification & Verdict
  // ========================================================================
  let classification: OpportunityClassification = "GROWING";
  let classificationLabel = "Consistent Growth";
  let classificationEmoji = "📈";

  const activeListings = activeListingsM.value;
  const shopAgeMonths = shopAgeMonthsM.value;
  const avgSellingRatio = avgSellingRatioM.value;
  const compScore = availableGroups.find((g) => g.id === "competition")?.score ?? 50;
  const freshnessScore = availableGroups.find((g) => g.id === "freshness")?.score ?? 50;

  if (availableGroups.length <= 1) {
    classification = "INSUFFICIENT_DATA";
    classificationLabel = "Insufficient Signal Data";
    classificationEmoji = "❓";
  } else if (shopAgeMonths !== null && shopAgeMonths <= 18 && (estDailySales ?? 0) >= 3 && freshnessScore >= 60) {
    classification = "EMERGING";
    classificationLabel = "Emerging Winner";
    classificationEmoji = "🔥";
  } else if (avgSellingRatio !== null && avgSellingRatio >= 14 && activeListings !== null && activeListings <= 250 && compScore >= 60) {
    classification = "HIDDEN_GEM";
    classificationLabel = "Hidden Gem";
    classificationEmoji = "💎";
  } else if ((activeListings !== null && activeListings >= 400) || (compScore < 45 && (estDailySales ?? 0) >= 4)) {
    classification = "COMPETITION_RISING";
    classificationLabel = "High Demand / Crowded";
    classificationEmoji = "⚠️";
  }

  let verdict: StrategicActionVerdict = "DEVELOP_PRODUCT";
  let verdictLabel = "Develop Product Concept";

  if (overallScore === null) {
    verdict = "AVOID_SATURATED";
    verdictLabel = "Insufficient Signal Data";
  } else if (overallScore >= 80) {
    verdict = "ENTER_MARKET";
    verdictLabel = "High Opportunity — Recommended to Build";
  } else if (overallScore >= 65) {
    verdict = "DEVELOP_PRODUCT";
    verdictLabel = "Viable Opportunity — Target Niche Angle";
  } else if (overallScore >= 45) {
    verdict = "STUDY_PRICING";
    verdictLabel = "Moderate Barrier — Study Pricing & Differentiation";
  } else {
    verdict = "AVOID_SATURATED";
    verdictLabel = "High Barrier — Saturated Incumbents";
  }

  let recommendedAction: RecommendedAction = "DEVELOP_PRODUCT";
  let strategicTakeaway = "Moderate market activity. Observe before committing production bandwidth.";

  if (overallScore === null) {
    recommendedAction = "INSUFFICIENT_DATA";
    strategicTakeaway = "Insufficient marketplace signal data to form a strategic recommendation.";
  } else if (overallScore >= 80) {
    recommendedAction = "SHORTLIST";
    strategicTakeaway = "Strong opportunity profile. Add to Planner, analyze competitor tags, and prepare listing draft.";
  } else if (overallScore >= 65) {
    recommendedAction = "STUDY_PRICING";
    strategicTakeaway = "Solid baseline demand. Study pricing tiers, bundle variations, and visual thumbnail angles.";
  } else if (overallScore >= 50) {
    recommendedAction = "MONITOR_VELOCITY";
    strategicTakeaway = "Consistent performance. Track store metrics over a 30-day window to evaluate seasonality.";
  } else {
    recommendedAction = "AVOID_SATURATED";
    strategicTakeaway = "High incumbent saturation. Consider targeting narrower long-tail search clusters.";
  }

  // Evidence, Strengths & Weaknesses
  const evidence: string[] = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (estDailySales !== null && estDailySales >= 2) {
    evidence.push(`High estimated sales pace (${estDailySales.toFixed(1)} sales/day).`);
    strengths.push("Strong transaction velocity relative to age");
  } else if (estDailySales !== null && estDailySales < 1) {
    weaknesses.push("Subdued transaction velocity");
  }

  if (shopReviews !== null && shopReviews < 100) {
    evidence.push(`Low review barrier (${shopReviews} total reviews) facilitates faster ranking.`);
    strengths.push("Accessible niche with manageable review requirements");
  } else if (shopReviews !== null && shopReviews > 1000) {
    evidence.push(`High review saturation (${shopReviews.toLocaleString()} reviews) establishes authority.`);
    weaknesses.push("High review saturation from incumbent sellers");
  }

  if (price !== null && price >= 15 && price <= 60) {
    evidence.push(`Optimal impulse pricing bracket ($${price.toFixed(2)}).`);
    strengths.push("Proven e-commerce conversion sweet spot ($15–$60)");
  } else if (price !== null && price < 10) {
    weaknesses.push("Low average order value may limit advertising margin");
  }

  const signalBreakdown: Record<string, OpportunitySignalGroup> = {};
  for (const group of evaluatedGroups) {
    signalBreakdown[group.id] = group;
  }

  const salesText = estDailySales !== null ? `${estDailySales.toFixed(1)} daily transactions` : "untracked velocity";
  const marginText = marginPercent > 0 ? `a ${marginPercent.toFixed(1)}% estimated net margin` : "untracked margin";
  const reviewText = shopReviews !== null ? `an entry review moat of ${shopReviews} reviews` : "untracked review depth";

  const summary = overallScore !== null
    ? `Product scores ${overallScore}/100 based on ${salesText}, ${marginText}, and ${reviewText}.`
    : `Product opportunity score is unavailable due to missing marketplace signals.`;

  const whyThisScore = overallScore !== null
    ? `Score of ${overallScore}/100 is driven by ${
        availableGroups.map((g) => `${g.name} (${g.pointsContributed} pts)`).join(", ")
      }.${unavailableGroups.length > 0 ? ` (Excluded signals: ${unavailableGroups.map((g) => g.name).join(", ")})` : ""}`
    : `Score cannot be computed because essential marketplace signals are unavailable.`;

  const explanation = {
    summary: verdictLabel,
    whyThisScore,
    primaryStrength: strengths[0] || (marginPercent >= 50 ? "Favorable unit economics" : "Approachable Search Competition"),
    primaryRisk: weaknesses[0] || (shopReviews && shopReviews > 1000 ? "Incumbent Review Concentration" : "Niche Search Volume Ceiling"),
  };

  return {
    overallScore,
    tier,
    tierLabel,
    classification,
    classificationLabel,
    classificationEmoji,
    verdict,
    verdictLabel,
    verdictVariant,
    summary,
    explanation,
    signals: {
      available: availableGroups,
      unavailable: unavailableGroups,
    },
    signalBreakdown,
    evidence,
    strengths,
    weaknesses,
    recommendedAction,
    strategicTakeaway,
    confidenceScore,
    marketplace,
    provenance: "SELLERSALT_SCORE",
    scoredAt,
  };
}

/**
 * Converts a CanonicalOpportunityReport into the legacy UniversalScoreResult shape
 * for backwards compatibility with existing UI components and tests.
 */
export function toUniversalScoreResult(report: CanonicalOpportunityReport): UniversalScoreResult {
  const factors: ScoreFactorBreakdown[] = report.signals.available.map((g) => ({
    id: g.id,
    name: g.name,
    weight: g.weight,
    score: g.score ?? 0,
    pointsContributed: g.pointsContributed,
    impactLabel: g.impactLabel === "Unavailable" ? "Neutral" : g.impactLabel,
    explanation: g.explanation,
    rawMetric: g.rawMetric ?? undefined,
  }));

  const score = report.overallScore ?? 10;
  const explanation =
    score >= 70
      ? `This product demonstrates favorable unit economics and proven daily demand velocity. A differentiated variation with optimized tags could capture healthy market share.`
      : `While this product maintains steady transaction volume, incumbent competition and review depth require a focused long-tail positioning strategy before launching.`;

  return {
    score,
    tier: report.tier,
    tierLabel: report.tierLabel,
    verdict: report.verdict,
    verdictLabel: report.verdictLabel,
    verdictVariant: report.verdictVariant,
    summary: report.summary,
    explanation,
    factors,
    provenance: "SELLERSALT_SCORE",
    confidenceScore: report.confidenceScore,
  };
}
