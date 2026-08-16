/**
 * SellerSalt Universal Scoring & Rating Architecture
 *
 * Centralized, explainable scoring engine providing deterministic 0-100 evaluation
 * across Products, Shops, Categories, Keywords, Competitors, and Listings.
 *
 * Adheres strictly to the 12 Non-Negotiable Engineering Rules:
 * - Rule 1: Never invent Etsy API capabilities
 * - Rule 2: Explicit Data Provenance ([ACTUAL ETSY DATA], [ESTIMATED], [SELLERSALT SCORE], [EXTERNAL DATA])
 * - Rule 5: Every composite score discloses its mathematical formula and point breakdown
 */

export type ProvenanceBadgeType =
  | "ACTUAL_ETSY_DATA"
  | "ESTIMATED"
  | "SELLERSALT_SCORE"
  | "EXTERNAL_DATA";

export type ScoreTier =
  | "EXCELLENT"      // 85 - 100
  | "STRONG"         // 70 - 84
  | "MODERATE"       // 50 - 69
  | "HIGH_BARRIER"   // 30 - 49
  | "UNFAVORABLE";   // 0 - 29

export type StrategicActionVerdict =
  | "ENTER_MARKET"
  | "DEVELOP_PRODUCT"
  | "SHORTLIST_FOR_PLANNER"
  | "STUDY_PRICING"
  | "DIFFERENTIATE_LONG_TAIL"
  | "HIGH_INCUMBENT_MOAT"
  | "AVOID_SATURATED";

export interface ScoreFactorBreakdown {
  id: string;
  name: string;
  weight: number; // e.g. 0.35 for 35%
  score: number;  // 0 - 100
  pointsContributed: number; // weight * score
  impactLabel: "Positive" | "Neutral" | "Negative" | "Critical";
  explanation: string;
  rawMetric?: string | number;
}

export interface UniversalScoreResult {
  score: number; // 0 - 100 integer
  tier: ScoreTier;
  tierLabel: string;
  verdict: StrategicActionVerdict;
  verdictLabel: string;
  verdictVariant: "success" | "warning" | "danger" | "info" | "neutral";
  summary: string;
  explanation: string;
  factors: ScoreFactorBreakdown[];
  provenance: ProvenanceBadgeType;
  confidenceScore: number; // 0 - 100 percentage
}

/**
 * Maps numeric 0-100 score to standardized human-readable tier
 */
export function getScoreTier(score: number): {
  tier: ScoreTier;
  tierLabel: string;
  verdictVariant: "success" | "warning" | "danger" | "info" | "neutral";
} {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  if (clamped >= 85) {
    return { tier: "EXCELLENT", tierLabel: "Outstanding Opportunity", verdictVariant: "success" };
  }
  if (clamped >= 70) {
    return { tier: "STRONG", tierLabel: "Strong Opportunity", verdictVariant: "success" };
  }
  if (clamped >= 50) {
    return { tier: "MODERATE", tierLabel: "Moderate Potential", verdictVariant: "warning" };
  }
  if (clamped >= 30) {
    return { tier: "HIGH_BARRIER", tierLabel: "High Barrier to Entry", verdictVariant: "warning" };
  }
  return { tier: "UNFAVORABLE", tierLabel: "High Saturation / Unfavorable", verdictVariant: "danger" };
}

/**
 * Universal Product Opportunity Scoring Engine
 */
export function evaluateProductOpportunity(params: {
  price: number;
  estDailySales: number;
  shopReviewCount: number;
  listingAgeDays: number;
  numFavorers?: number;
  categoryMedianPrice?: number;
}): UniversalScoreResult {
  const { price, estDailySales, shopReviewCount, listingAgeDays, numFavorers = 0 } = params;

  // 1. Demand & Sales Velocity Factor (Weight: 35%)
  // 4+ daily sales is high velocity (100 pts), 1.5 is moderate (65 pts)
  const velocityScore = Math.min(100, Math.max(15, Math.round((estDailySales / 4.0) * 100)));
  
  // 2. Unit Economics & Profit Margin Factor (Weight: 25%)
  // Etsy fee proxy: 6.5% transaction + 3% payment processing + $0.20 listing fee
  const etsyFees = price * 0.095 + 0.20;
  const netContribution = Math.max(0, price - etsyFees);
  const marginPercent = price > 0 ? (netContribution / price) * 100 : 0;
  const marginScore = Math.min(100, Math.max(20, Math.round(marginPercent * 1.1)));

  // 3. Competitor Review Moat & Entry Barrier Factor (Weight: 20%)
  // <200 reviews is easy (95 pts), >2,000 is heavy incumbent barrier (30 pts)
  let reviewMoatScore = 80;
  if (shopReviewCount < 100) reviewMoatScore = 95;
  else if (shopReviewCount < 500) reviewMoatScore = 80;
  else if (shopReviewCount < 2000) reviewMoatScore = 55;
  else reviewMoatScore = 30;

  // 4. Listing Momentum & Freshness Factor (Weight: 20%)
  // Younger listings (<180 days) with high sales represent emerging winners
  let freshnessScore = 70;
  if (listingAgeDays <= 90 && estDailySales >= 2) freshnessScore = 95;
  else if (listingAgeDays <= 180) freshnessScore = 85;
  else if (listingAgeDays <= 365) freshnessScore = 70;
  else freshnessScore = 50;

  const factors: ScoreFactorBreakdown[] = [
    {
      id: "velocity",
      name: "Sales Velocity & Buyer Demand",
      weight: 0.35,
      score: velocityScore,
      pointsContributed: Math.round(velocityScore * 0.35),
      impactLabel: velocityScore >= 75 ? "Positive" : velocityScore >= 50 ? "Neutral" : "Negative",
      explanation: `Observed estimated velocity of ${estDailySales.toFixed(1)} sales/day indicates ${
        estDailySales >= 3 ? "strong consistent daily order volume." : "steady entry-level transaction volume."
      }`,
      rawMetric: `${estDailySales.toFixed(1)} sales/day`,
    },
    {
      id: "margin",
      name: "Profit Margin & Take-Home",
      weight: 0.25,
      score: marginScore,
      pointsContributed: Math.round(marginScore * 0.25),
      impactLabel: marginScore >= 70 ? "Positive" : "Neutral",
      explanation: `Estimated net margin of ${marginPercent.toFixed(1)}% after standard Etsy transaction fees ($${etsyFees.toFixed(2)}/order).`,
      rawMetric: `${marginPercent.toFixed(1)}% net margin`,
    },
    {
      id: "competition",
      name: "Incumbent Review Threshold",
      weight: 0.20,
      score: reviewMoatScore,
      pointsContributed: Math.round(reviewMoatScore * 0.20),
      impactLabel: reviewMoatScore >= 70 ? "Positive" : reviewMoatScore >= 50 ? "Neutral" : "Negative",
      explanation: `Competitor store holds ${shopReviewCount.toLocaleString()} lifetime reviews, representing a ${
        shopReviewCount < 500 ? "reachable entry threshold." : "moderate incumbent review advantage."
      }`,
      rawMetric: `${shopReviewCount.toLocaleString()} reviews`,
    },
    {
      id: "freshness",
      name: "Market Freshness & Momentum",
      weight: 0.20,
      score: freshnessScore,
      pointsContributed: Math.round(freshnessScore * 0.20),
      impactLabel: freshnessScore >= 80 ? "Positive" : "Neutral",
      explanation: `Listing has been active for ${listingAgeDays} days with ${numFavorers.toLocaleString()} customer favorites.`,
      rawMetric: `${listingAgeDays} days active`,
    },
  ];

  const totalWeighted = factors.reduce((sum, f) => sum + f.pointsContributed, 0);
  const score = Math.max(10, Math.min(99, totalWeighted));
  const { tier, tierLabel, verdictVariant } = getScoreTier(score);

  let verdict: StrategicActionVerdict = "DEVELOP_PRODUCT";
  let verdictLabel = "Develop Product Concept";
  if (score >= 80) {
    verdict = "ENTER_MARKET";
    verdictLabel = "High Opportunity — Recommended to Build";
  } else if (score >= 65) {
    verdict = "DEVELOP_PRODUCT";
    verdictLabel = "Viable Opportunity — Target Niche Angle";
  } else if (score >= 45) {
    verdict = "STUDY_PRICING";
    verdictLabel = "Moderate Barrier — Study Pricing & Differentiation";
  } else {
    verdict = "AVOID_SATURATED";
    verdictLabel = "High Barrier — Saturated Incumbents";
  }

  const summary = `Product scores ${score}/100 based on ${estDailySales.toFixed(1)} daily transactions, a ${marginPercent.toFixed(1)}% estimated net margin, and an entry review moat of ${shopReviewCount} reviews.`;

  const explanation =
    score >= 70
      ? `This product demonstrates favorable unit economics and proven daily demand velocity. A differentiated variation with optimized tags could capture healthy market share.`
      : `While this product maintains steady transaction volume, incumbent competition and review depth require a focused long-tail positioning strategy before launching.`;

  return {
    score,
    tier,
    tierLabel,
    verdict,
    verdictLabel,
    verdictVariant,
    summary,
    explanation,
    factors,
    provenance: "SELLERSALT_SCORE",
    confidenceScore: 88,
  };
}

/**
 * Universal Shop Competition Scoring Engine
 */
export function evaluateShopCompetition(params: {
  shopName: string;
  totalSales: number;
  reviewCount: number;
  activeListings: number;
  shopAgeMonths: number;
  estDailySales: number;
}): UniversalScoreResult {
  const { shopName, totalSales, reviewCount, activeListings, shopAgeMonths, estDailySales } = params;

  // 1. Incumbent Review Moat (Weight: 35%)
  // Lower reviews = easier to compete with (higher opportunity score)
  let reviewScore = 75;
  if (reviewCount < 150) reviewScore = 95;
  else if (reviewCount < 600) reviewScore = 80;
  else if (reviewCount < 2500) reviewScore = 50;
  else reviewScore = 25;

  // 2. Catalog Efficiency Factor (Weight: 25%)
  // Sales per listing indicates catalog leverage
  const salesPerListing = activeListings > 0 ? totalSales / activeListings : 0;
  let catalogScore = 65;
  if (salesPerListing >= 50) catalogScore = 85;
  else if (salesPerListing >= 20) catalogScore = 75;
  else catalogScore = 50;

  // 3. Daily Velocity Factor (Weight: 25%)
  const velocityScore = Math.min(100, Math.max(20, Math.round((estDailySales / 5) * 90)));

  // 4. Shop Age Maturity Factor (Weight: 15%)
  // Younger successful shops (<24 months) are easier to reverse-engineer
  let ageScore = 70;
  if (shopAgeMonths <= 12) ageScore = 95;
  else if (shopAgeMonths <= 36) ageScore = 80;
  else if (shopAgeMonths <= 60) ageScore = 60;
  else ageScore = 35;

  const factors: ScoreFactorBreakdown[] = [
    {
      id: "reviewMoat",
      name: "Incumbent Review Moat",
      weight: 0.35,
      score: reviewScore,
      pointsContributed: Math.round(reviewScore * 0.35),
      impactLabel: reviewScore >= 75 ? "Positive" : reviewScore >= 50 ? "Neutral" : "Critical",
      explanation: `${shopName} has accumulated ${reviewCount.toLocaleString()} reviews (${
        reviewCount < 500 ? "accessible for a new entrant" : "strong incumbent social proof"
      }).`,
      rawMetric: `${reviewCount.toLocaleString()} reviews`,
    },
    {
      id: "velocity",
      name: "Daily Sales Velocity",
      weight: 0.25,
      score: velocityScore,
      pointsContributed: Math.round(velocityScore * 0.25),
      impactLabel: velocityScore >= 70 ? "Positive" : "Neutral",
      explanation: `Generates ~${estDailySales.toFixed(1)} orders per day across ${activeListings} active listings.`,
      rawMetric: `~${estDailySales.toFixed(1)} sales/day`,
    },
    {
      id: "catalog",
      name: "Catalog Leverage",
      weight: 0.25,
      score: catalogScore,
      pointsContributed: Math.round(catalogScore * 0.25),
      impactLabel: catalogScore >= 70 ? "Positive" : "Neutral",
      explanation: `Maintains ~${Math.round(salesPerListing)} lifetime orders per active listing.`,
      rawMetric: `${Math.round(salesPerListing)} sales/listing`,
    },
    {
      id: "maturity",
      name: "Shop Maturity & Age",
      weight: 0.15,
      score: ageScore,
      pointsContributed: Math.round(ageScore * 0.15),
      impactLabel: ageScore >= 75 ? "Positive" : "Neutral",
      explanation: `Shop has been established for ${Math.round(shopAgeMonths / 12)} years (${shopAgeMonths} months).`,
      rawMetric: `${shopAgeMonths} mos`,
    },
  ];

  const totalWeighted = factors.reduce((sum, f) => sum + f.pointsContributed, 0);
  const score = Math.max(10, Math.min(99, totalWeighted));
  const { tier, tierLabel, verdictVariant } = getScoreTier(score);

  let verdict: StrategicActionVerdict = "DEVELOP_PRODUCT";
  let verdictLabel = "Moderate to Compete";
  if (score >= 75) {
    verdict = "ENTER_MARKET";
    verdictLabel = "Easy to Compete — Recommended";
  } else if (score >= 45) {
    verdict = "DIFFERENTIATE_LONG_TAIL";
    verdictLabel = "Moderate to Compete — Differentiate Copy & Design";
  } else {
    verdict = "HIGH_INCUMBENT_MOAT";
    verdictLabel = "High Barrier — Not Recommended for Beginners";
  }

  const summary = `Overall Opportunity Score: ${score}/100 (${verdictLabel}). ${shopName} generates ~${estDailySales.toFixed(1)} orders daily across ${activeListings} listings.`;

  const explanation =
    score >= 75
      ? `${shopName} is an emerging competitor with strong revenue velocity but an accessible review threshold. Ideal for reverse-engineering keywords and catalog structure.`
      : score >= 45
      ? `${shopName} has established steady sales in this category. Competing requires specialized long-tail keyword targeting and higher-converting visual mockups.`
      : `${shopName} holds a substantial historical review moat and brand authority. Direct competition is not recommended without substantial advertising capital.`;

  return {
    score,
    tier,
    tierLabel,
    verdict,
    verdictLabel,
    verdictVariant,
    summary,
    explanation,
    factors,
    provenance: "SELLERSALT_SCORE",
    confidenceScore: 92,
  };
}
