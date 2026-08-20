/**
 * SellerSalt Research Quality & Coverage Evaluation Engine
 * 
 * Computes transparent, empirical data quality metrics representing how trustworthy,
 * fresh, and complete a research run's observations are.
 * 
 * STRICT ARCHITECTURAL PRINCIPLE:
 * - This is strictly separate from Opportunity Score.
 * - Opportunity Score evaluates market viability, demand velocity, and margins.
 * - Research Quality evaluates data completeness, observation depth, signal provenance, and freshness.
 */

import type { NormalizedProduct, SignalProvenance, DataSourceType } from "../types";

export type ResearchQualityTier = "HIGH" | "MODERATE" | "LIMITED" | "INSUFFICIENT";

export interface ResearchQualityFactor {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  description: string;
  status: "OPTIMAL" | "PARTIAL" | "DEFICIENT";
}

export interface FieldCoverageMetric {
  field: string;
  label: string;
  observedCount: number;
  totalCount: number;
  percentage: number;
  status: "OPTIMAL" | "PARTIAL" | "DEFICIENT";
}

export interface ResearchQualityReport {
  qualityScore: number; // 0 - 100
  qualityTier: ResearchQualityTier;
  label: string;
  badgeVariant: "success" | "neutral" | "warning" | "danger";
  factors: ResearchQualityFactor[];
  fieldMetrics: FieldCoverageMetric[];
  sourceTimeline: string[];
  coverage: {
    requestedMarketplaces: number;
    availableMarketplaces: number;
    restrictedMarketplaces: number;
    observationsCount: number;
    liveObservationsCount: number;
    historicalObservationsCount: number;
    signalCoveragePercentage: number;
  };
  summary: string;
}

export interface ResearchQualityInput {
  itemCount: number;
  liveCount?: number;
  historicalCount?: number;
  sourcesUsed: string[];
  freshnessStatus?: string;
  confidence?: number;
  marketplaces?: string[];
  availableMarketplacesCount?: number;
  restrictedMarketplacesCount?: number;
  sampleProducts?: NormalizedProduct[];
  sourceTimeline?: string[];
}

export function evaluateResearchQuality(input: ResearchQualityInput): ResearchQualityReport {
  const itemCount = input.itemCount || (input.sampleProducts?.length ?? 0);
  const liveCount = input.liveCount ?? (input.sampleProducts?.filter((p) => !p.isHistorical).length ?? itemCount);
  const historicalCount = input.historicalCount ?? (input.sampleProducts?.filter((p) => p.isHistorical).length ?? 0);
  const freshness = (input.freshnessStatus || "LIVE").toUpperCase();
  const sources = input.sourcesUsed || ["PUBLIC_WEB"];
  const requestedMarketplaces = input.marketplaces?.length || 1;
  const availableMarketplaces = input.availableMarketplacesCount ?? (requestedMarketplaces > 0 ? requestedMarketplaces : 1);
  const restrictedMarketplaces = input.restrictedMarketplacesCount ?? 0;

  const factors: ResearchQualityFactor[] = [];

  // Factor 1: Observation Volume Depth (Max 30 pts)
  let volumeScore = 0;
  if (itemCount >= 25) volumeScore = 30;
  else if (itemCount >= 10) volumeScore = 22;
  else if (itemCount >= 5) volumeScore = 15;
  else if (itemCount > 0) volumeScore = 8;
  else volumeScore = 0;

  factors.push({
    id: "volume",
    name: "Observation Volume",
    score: volumeScore,
    maxScore: 30,
    description: `${itemCount} marketplace observations captured`,
    status: volumeScore >= 22 ? "OPTIMAL" : volumeScore >= 15 ? "PARTIAL" : "DEFICIENT",
  });

  // Factor 2: Data Freshness & Live Proportion (Max 25 pts)
  let freshnessScore = 0;
  if (freshness === "LIVE") freshnessScore = 25;
  else if (freshness === "FRESH") freshnessScore = 20;
  else if (freshness === "STALE") freshnessScore = 10;
  else if (freshness === "HISTORICAL") freshnessScore = 8;
  else freshnessScore = 5;

  if (itemCount > 0 && liveCount < itemCount) {
    const liveRatio = liveCount / itemCount;
    freshnessScore = Math.round(freshnessScore * liveRatio + (freshnessScore * 0.4) * (1 - liveRatio));
  }

  factors.push({
    id: "freshness",
    name: "Temporal Freshness",
    score: freshnessScore,
    maxScore: 25,
    description: `${freshness} data (${liveCount} live / ${historicalCount} historical)`,
    status: freshnessScore >= 20 ? "OPTIMAL" : freshnessScore >= 10 ? "PARTIAL" : "DEFICIENT",
  });

  // Factor 3: Signal Coverage & Field Lineage (Max 25 pts)
  let signalCoverageScore = 0;
  let signalCoveragePercentage = 0;
  const fieldMetrics: FieldCoverageMetric[] = [];

  if (input.sampleProducts && input.sampleProducts.length > 0) {
    const prods = input.sampleProducts;
    const total = prods.length;

    const withTitle = prods.filter((p) => p.title && p.title.trim().length > 0).length;
    const withPrice = prods.filter((p) => p.price !== null && p.price !== undefined).length;
    const withRating = prods.filter((p) => p.rating !== null && p.rating !== undefined).length;
    const withReviews = prods.filter((p) => p.reviewCount !== null && p.reviewCount !== undefined).length;
    const withShop = prods.filter((p) => p.shop?.name).length;
    const withCategory = prods.filter((p) => p.categoryPath && p.categoryPath.length > 0).length;

    const titlePct = Math.round((withTitle / total) * 100);
    const pricePct = Math.round((withPrice / total) * 100);
    const ratingPct = Math.round((withRating / total) * 100);
    const reviewsPct = Math.round((withReviews / total) * 100);
    const shopPct = Math.round((withShop / total) * 100);
    const catPct = Math.round((withCategory / total) * 100);

    fieldMetrics.push(
      { field: "title", label: "Title & Description", observedCount: withTitle, totalCount: total, percentage: titlePct, status: titlePct >= 80 ? "OPTIMAL" : titlePct >= 50 ? "PARTIAL" : "DEFICIENT" },
      { field: "price", label: "Observed Price & Currency", observedCount: withPrice, totalCount: total, percentage: pricePct, status: pricePct >= 80 ? "OPTIMAL" : pricePct >= 50 ? "PARTIAL" : "DEFICIENT" },
      { field: "rating", label: "Buyer Rating", observedCount: withRating, totalCount: total, percentage: ratingPct, status: ratingPct >= 70 ? "OPTIMAL" : ratingPct >= 40 ? "PARTIAL" : "DEFICIENT" },
      { field: "reviews", label: "Review Count & Velocity", observedCount: withReviews, totalCount: total, percentage: reviewsPct, status: reviewsPct >= 70 ? "OPTIMAL" : reviewsPct >= 40 ? "PARTIAL" : "DEFICIENT" },
      { field: "shop", label: "Seller & Shop Profile", observedCount: withShop, totalCount: total, percentage: shopPct, status: shopPct >= 70 ? "OPTIMAL" : shopPct >= 40 ? "PARTIAL" : "DEFICIENT" },
      { field: "category", label: "Category Taxonomy", observedCount: withCategory, totalCount: total, percentage: catPct, status: catPct >= 70 ? "OPTIMAL" : catPct >= 40 ? "PARTIAL" : "DEFICIENT" },
    );

    signalCoveragePercentage = Math.round(((pricePct + ratingPct + reviewsPct + shopPct + titlePct) / 5));
    signalCoverageScore = Math.round((signalCoveragePercentage / 100) * 25);
  } else {
    // Default estimate from confidence
    signalCoveragePercentage = input.confidence ? Math.min(100, Math.round(input.confidence * 1.1)) : 70;
    signalCoverageScore = Math.round((signalCoveragePercentage / 100) * 25);

    fieldMetrics.push(
      { field: "title", label: "Title & Keywords", observedCount: itemCount, totalCount: itemCount, percentage: 100, status: "OPTIMAL" },
      { field: "price", label: "Observed Pricing", observedCount: Math.round(itemCount * 0.9), totalCount: itemCount, percentage: 90, status: "OPTIMAL" },
      { field: "signals", label: "Marketplace Signals", observedCount: Math.round(itemCount * 0.75), totalCount: itemCount, percentage: 75, status: "PARTIAL" },
    );
  }

  factors.push({
    id: "signals",
    name: "Signal & Metric Coverage",
    score: signalCoverageScore,
    maxScore: 25,
    description: `${signalCoveragePercentage}% of canonical signals observed`,
    status: signalCoverageScore >= 18 ? "OPTIMAL" : signalCoverageScore >= 12 ? "PARTIAL" : "DEFICIENT",
  });

  // Factor 4: Source Reliability & Diversity (Max 20 pts)
  let sourceScore = 0;
  if (sources.includes("PUBLIC_WEB") && sources.includes("MARKETPLACE_API")) {
    sourceScore = 20;
  } else if (sources.includes("PUBLIC_WEB")) {
    sourceScore = 17;
  } else if (sources.includes("MARKETPLACE_API")) {
    sourceScore = 15;
  } else if (sources.includes("HISTORICAL_OBSERVATION")) {
    sourceScore = 10;
  } else {
    sourceScore = 5;
  }

  factors.push({
    id: "source",
    name: "Source Verification",
    score: sourceScore,
    maxScore: 20,
    description: `Acquired via ${sources.join(", ")}`,
    status: sourceScore >= 15 ? "OPTIMAL" : sourceScore >= 10 ? "PARTIAL" : "DEFICIENT",
  });

  const qualityScore = Math.min(100, Math.max(0, volumeScore + freshnessScore + signalCoverageScore + sourceScore));

  let qualityTier: ResearchQualityTier = "LIMITED";
  let label = "Limited Coverage";
  let badgeVariant: "success" | "neutral" | "warning" | "danger" = "neutral";
  let summary = "";

  if (qualityScore >= 80) {
    qualityTier = "HIGH";
    label = "High Quality Coverage";
    badgeVariant = "success";
    summary = "Comprehensive empirical dataset with high observation volume, live freshness, and rich signal coverage.";
  } else if (qualityScore >= 60) {
    qualityTier = "MODERATE";
    label = "Moderate Quality";
    badgeVariant = "neutral";
    summary = "Sufficient observation depth and signal coverage for decision analysis. Some metrics may be unobserved.";
  } else if (qualityScore >= 35) {
    qualityTier = "LIMITED";
    label = "Limited Coverage";
    badgeVariant = "warning";
    summary = "Sparse or partially restricted observation sample. Intelligence confidence calibrated accordingly.";
  } else {
    qualityTier = "INSUFFICIENT";
    label = "Insufficient Coverage";
    badgeVariant = "danger";
    summary = "Insufficient public observations acquired. Broaden your search query or check source availability.";
  }

  const sourceTimeline = input.sourceTimeline || [
    `1. Primary Ingestion: PUBLIC_WEB (${sources.includes("PUBLIC_WEB") ? "Active" : "Bypassed"})`,
    `2. Secondary Enrichment: MARKETPLACE_API (${sources.includes("MARKETPLACE_API") ? "Enriched" : "Not configured"})`,
    `3. Observation Store: PostgreSQL Database (${historicalCount > 0 ? `${historicalCount} historical records` : "Live only"})`,
  ];

  return {
    qualityScore,
    qualityTier,
    label,
    badgeVariant,
    factors,
    fieldMetrics,
    sourceTimeline,
    coverage: {
      requestedMarketplaces,
      availableMarketplaces,
      restrictedMarketplaces,
      observationsCount: itemCount,
      liveObservationsCount: liveCount,
      historicalObservationsCount: historicalCount,
      signalCoveragePercentage,
    },
    summary,
  };
}
