export interface WinningProductSignal {
  opportunityScore: number;
  demandSignal: "HIGH_VELOCITY" | "EMERGING_DEMAND" | "STEADY_DEMAND" | "LOW_ACTIVITY";
  competitionSignal: "LOW_BARRIER" | "MODERATE" | "HIGH_BARRIER";
  whyItWins: string;
  evidence: string[];
  recommendedAction: "SHORTLIST" | "STUDY_PRICING" | "MONITOR_VELOCITY" | "IGNORE";
}

/**
 * @deprecated Superseded by `evaluateCanonicalOpportunity` in `src/services/intelligence/canonical-opportunity.ts`.
 * Kept only for test compatibility. Production consumers (prospect export, google sheets) now consume canonical scoring.
 */
export function computeProductWinningSignals(params: {
  estDailySales: number | null;
  totalSales: number | null;
  activeListings: number | null;
  reviewCount: number;
  reviewAverage: number | null;
  price: number;
  shopAgeMonths: number;
}): WinningProductSignal {
  const velocity = params.estDailySales ?? 0;
  const reviews = params.reviewCount;
  const price = params.price;
  const ageMonths = params.shopAgeMonths;

  let score = 50;
  const evidence: string[] = [];

  // Velocity bonus
  if (velocity >= 5) {
    score += 30;
    evidence.push(`Exceptional daily sales velocity (${velocity.toFixed(1)} sales/day).`);
  } else if (velocity >= 2) {
    score += 20;
    evidence.push(`Healthy daily sales momentum (${velocity.toFixed(1)} sales/day).`);
  } else if (velocity >= 0.5) {
    score += 10;
    evidence.push(`Observed consistent transactions (${velocity.toFixed(1)} sales/day).`);
  }

  // Low competition / review barrier bonus
  if (reviews < 50) {
    score += 20;
    evidence.push(`Low review barrier (${reviews} reviews) indicates easy ranking opportunity.`);
  } else if (reviews < 200) {
    score += 10;
    evidence.push(`Moderate review threshold (${reviews} reviews).`);
  } else if (reviews > 1000) {
    score -= 15;
    evidence.push(`High review saturation (${reviews.toLocaleString()} reviews).`);
  }

  // Shop freshness
  if (ageMonths > 0 && ageMonths <= 12) {
    score += 10;
    evidence.push(`Young breakout shop (${Math.round(ageMonths)} months old) proves modern demand.`);
  }

  // Price sweet spot ($15 - $60)
  if (price >= 15 && price <= 60) {
    score += 5;
    evidence.push(`Optimal e-commerce impulse price point ($${price.toFixed(2)}).`);
  }

  // Clamp score
  const finalScore = Math.max(10, Math.min(99, score));

  // Determine signals
  const demandSignal =
    velocity >= 3
      ? "HIGH_VELOCITY"
      : velocity >= 1
      ? "EMERGING_DEMAND"
      : velocity >= 0.3
      ? "STEADY_DEMAND"
      : "LOW_ACTIVITY";

  const competitionSignal =
    reviews < 100 ? "LOW_BARRIER" : reviews < 500 ? "MODERATE" : "HIGH_BARRIER";

  let recommendedAction: WinningProductSignal["recommendedAction"] = "IGNORE";
  let whyItWins = "Moderate market activity with steady baseline metrics.";

  if (finalScore >= 80) {
    recommendedAction = "SHORTLIST";
    whyItWins = "High estimated velocity combined with low review barrier. Strong candidate for product creation.";
  } else if (finalScore >= 65) {
    recommendedAction = "STUDY_PRICING";
    whyItWins = "Solid demand signals. Study competitor pricing, imagery, and tag optimization.";
  } else if (finalScore >= 50) {
    recommendedAction = "MONITOR_VELOCITY";
    whyItWins = "Stable observed sales. Add to watchlist to observe longitudinal trajectory.";
  }

  return {
    opportunityScore: finalScore,
    demandSignal,
    competitionSignal,
    whyItWins,
    evidence,
    recommendedAction,
  };
}

export interface WinningShopSignal {
  opportunityScore: number;
  catalogEfficiency: "HIGH_YIELD" | "BALANCED" | "LOW_YIELD";
  recommendation: "SHORTLIST" | "STUDY_PRODUCTS" | "WATCH_SHOP" | "IGNORE";
  whyInteresting: string;
  whatToStudy: string;
  whatToAvoid: string;
}

export function computeShopWinningSignals(params: {
  totalSales: number | null;
  activeListings: number | null;
  estDailySales: number | null;
  shopAgeMonths: number;
  reviewCount: number;
}): WinningShopSignal {
  const totalSales = params.totalSales ?? 0;
  const listings = Math.max(1, params.activeListings ?? 1);
  const yieldRatio = totalSales / listings;
  const velocity = params.estDailySales ?? 0;

  let score = 50;

  if (yieldRatio > 50) score += 25;
  else if (yieldRatio > 20) score += 15;

  if (velocity > 3) score += 20;
  else if (velocity > 1) score += 10;

  if (params.shopAgeMonths > 0 && params.shopAgeMonths <= 18) score += 15;

  const finalScore = Math.max(15, Math.min(99, score));

  const catalogEfficiency =
    yieldRatio >= 30 ? "HIGH_YIELD" : yieldRatio >= 10 ? "BALANCED" : "LOW_YIELD";

  let recommendation: WinningShopSignal["recommendation"] = "WATCH_SHOP";
  let whyInteresting = "Stable shop operations on Etsy.";
  let whatToStudy = "General catalog assortment.";
  let whatToAvoid = "Copying listings directly — differentiate on angle, bundle, or material before entering.";

  if (finalScore >= 80) {
    recommendation = "SHORTLIST";
    whyInteresting = `High catalog efficiency (${yieldRatio.toFixed(1)} sales/listing) and strong daily velocity.`;
    whatToStudy = "Top 5 revenue-driving listings, keyword tags, and primary thumbnail style.";
    whatToAvoid =
      params.shopAgeMonths > 0 && params.shopAgeMonths <= 18
        ? "Underestimating how fast this niche moves — a young shop hitting this velocity signals rising demand and incoming competition."
        : "Assuming this pace is easy to replicate — an established shop's velocity reflects years of review/ranking accumulation, not just product quality.";
  } else if (finalScore >= 65) {
    recommendation = "STUDY_PRODUCTS";
    whyInteresting = "Emerging catalog with promising product traction.";
    whatToStudy = "Discovered product categories and tag overlap.";
    whatToAvoid = "Committing significant catalog investment before the trend proves durable — traction here is early, not yet established.";
  } else if (finalScore < 40) {
    whatToAvoid = "Treating low velocity here as low competition in the niche — this specific shop may simply be underperforming, not the category.";
  }

  return {
    opportunityScore: finalScore,
    catalogEfficiency,
    recommendation,
    whyInteresting,
    whatToStudy,
    whatToAvoid,
  };
}
