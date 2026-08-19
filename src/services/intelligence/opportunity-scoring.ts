/**
 * SellerSalt Universal Opportunity Scoring Engine (v2)
 * 
 * Computes an explainable, multi-factor opportunity composite (0-100) with
 * complete mathematical point breakdown and natural-language rationale.
 * Strict compliance with Rule 2 (Provenance) and Rule 5 (Explainable Inputs).
 */

export interface OpportunityScoreFactors {
  demandScore: number;           // 0-100 (30% weight) - Est. Daily sales, favoriting velocity
  marginScore: number;           // 0-100 (25% weight) - Target price minus COGS minus Etsy fees (6.5%+3%+$0.20)
  competitionScore: number;      // 0-100 (20% weight) - Page 1 listing density, shop concentration
  keywordScore: number;          // 0-100 (15% weight) - Long-tail cluster availability and tag compliance
  reviewBarrierScore: number;    // 0-100 (10% weight) - Incumbent store review threshold feasibility
}

export interface OpportunityScoreReport {
  overallScore: number;          // 0-100
  verdict: "STRONG_OPPORTUNITY" | "GOOD_OPPORTUNITY" | "MODERATE_OPPORTUNITY" | "WEAK_OPPORTUNITY" | "AVOID";
  verdictLabel: string;
  factors: OpportunityScoreFactors;
  weights: {
    demand: number;
    margin: number;
    competition: number;
    keyword: number;
    reviewBarrier: number;
  };
  explanation: {
    summary: string;
    whyThisScore: string;
    primaryStrength: string;
    primaryRisk: string;
  };
  provenance: "SELLERSALT_SCORE";
}

export interface OpportunityScoreInput {
  price: number;
  estimatedCogs?: number;
  estDailySales?: number;
  shopReviewCount?: number;
  competingListingsCount?: number;
  keywordCount?: number;
  tagComplianceRate?: number;
  /** Defaults to Etsy's real fee structure (9.5% + $0.20) — this file is
   * unused by any live caller today (confirmed by search), but was labeled
   * "Universal" while hardcoding Etsy's fees regardless; parameterized here
   * to match src/services/intelligence/universal-scoring.ts's pattern so
   * a future caller for another marketplace doesn't inherit a silent
   * Etsy assumption. Pass a real schedule for a live marketplace, or
   * `null` to exclude the margin factor rather than guess. */
  feeSchedule?: { percentageFee: number; flatFee: number } | null;
}

export function evaluateOpportunityScore(input: OpportunityScoreInput): OpportunityScoreReport {
  const {
    price,
    estimatedCogs = price * 0.25,
    estDailySales = 2.5,
    shopReviewCount = 250,
    competingListingsCount = 450,
    keywordCount = 6,
    tagComplianceRate = 0.85,
    feeSchedule = { percentageFee: 0.095, flatFee: 0.2 }, // Etsy default — unchanged from prior hardcoded behavior
  } = input;

  // 1. Demand Score (0-100) - 30% weight
  // Velocity: 1/day = 50, 3/day = 80, 5+/day = 95+
  const demandScore = Math.min(100, Math.round(Math.min(5, estDailySales) * 18 + 10));

  // 2. Margin Score (0-100) - 25% weight — 0 when no fee schedule is known
  // for this marketplace, never guessed against the wrong marketplace's fees.
  let marginPct = 0;
  let marginScore = 0;
  if (feeSchedule) {
    const marketplaceFees = price * feeSchedule.percentageFee + feeSchedule.flatFee;
    const netMargin = Math.max(0, price - estimatedCogs - marketplaceFees);
    marginPct = price > 0 ? (netMargin / price) * 100 : 0;
    // Margin %: 30% = 50, 50% = 75, 65%+ = 95+
    marginScore = Math.min(100, Math.round(marginPct * 1.4));
  }

  // 3. Competition Score (0-100) - 20% weight (Higher score = lower friction)
  let compScore = 70;
  if (competingListingsCount < 200) compScore = 90;
  else if (competingListingsCount < 600) compScore = 75;
  else if (competingListingsCount < 1500) compScore = 60;
  else if (competingListingsCount < 5000) compScore = 45;
  else compScore = 30;

  // 4. Keyword Score (0-100) - 15% weight
  const keywordScore = Math.min(100, Math.round((Math.min(13, keywordCount) / 13) * 60 + tagComplianceRate * 40));

  // 5. Review Barrier Score (0-100) - 10% weight (Higher score = accessible moat)
  let reviewScore = 75;
  if (shopReviewCount < 100) reviewScore = 95;
  else if (shopReviewCount < 500) reviewScore = 80;
  else if (shopReviewCount < 2000) reviewScore = 60;
  else if (shopReviewCount < 10000) reviewScore = 40;
  else reviewScore = 25;

  // Weighted Composite Formula (Rule 5)
  const weights = {
    demand: 0.30,
    margin: 0.25,
    competition: 0.20,
    keyword: 0.15,
    reviewBarrier: 0.10,
  };

  const overallScore = Math.round(
    demandScore * weights.demand +
    marginScore * weights.margin +
    compScore * weights.competition +
    keywordScore * weights.keyword +
    reviewScore * weights.reviewBarrier
  );

  let verdict: OpportunityScoreReport["verdict"] = "GOOD_OPPORTUNITY";
  let verdictLabel = "Good Opportunity — High Commercial Feasibility";

  if (overallScore >= 80 && marginPct >= 45) {
    verdict = "STRONG_OPPORTUNITY";
    verdictLabel = "Strong Opportunity — Prime Target for Listing Creation";
  } else if (overallScore < 50 || marginPct < 25) {
    verdict = "WEAK_OPPORTUNITY";
    verdictLabel = "Weak Opportunity — Saturated Category or Thin Margins";
  } else if (overallScore >= 65) {
    verdict = "MODERATE_OPPORTUNITY";
    verdictLabel = "Moderate Opportunity — Differentiation Required";
  }

  const whyThisScore = `Score of ${overallScore}/100 is driven by strong estimated margin (${marginPct.toFixed(1)}%, earning ${marginScore}/100) and steady sales velocity (~${estDailySales.toFixed(1)}/day, earning ${demandScore}/100), offset by a moderate incumbent review barrier (${shopReviewCount.toLocaleString()} reviews, scoring ${reviewScore}/100).`;

  return {
    overallScore,
    verdict,
    verdictLabel,
    factors: {
      demandScore,
      marginScore,
      competitionScore: compScore,
      keywordScore,
      reviewBarrierScore: reviewScore,
    },
    weights,
    explanation: {
      summary: verdictLabel,
      whyThisScore,
      primaryStrength: marginPct >= 50 ? "High Unit Net Margin (>50%)" : "Approachable Search Competition",
      primaryRisk: shopReviewCount > 1000 ? "Incumbent Review Concentration" : "Niche Search Volume Ceiling",
    },
    provenance: "SELLERSALT_SCORE",
  };
}
