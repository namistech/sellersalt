/**
 * SellerSalt Post-Publish Listing Intelligence Engine
 * 
 * Analyzes live published Etsy listings against category benchmarks and initial opportunity forecasts.
 * Evaluates performance drift, early velocity, and provides actionable optimization recommendations.
 * Strict compliance with Rule 2 (Provenance) and Rule 9 (Human Approval for Changes).
 */

import { NextBestAction } from "./next-best-action";

export interface PublishedListingMetrics {
  etsyListingId: string;
  title: string;
  price: number;
  publishedDaysAgo: number;
  totalSales: number;
  dailyVelocity: number;
  categoryBenchmarkVelocity: number;
  forecastOpportunityVelocity: number;
  viewsCount?: number;
  favoritesCount?: number;
  tagComplianceCount: number; // e.g. 13/13
  first40CharsKeywordMatch: boolean;
}

export interface PostPublishDiagnosis {
  listingId: string;
  status: "OUTPERFORMING" | "ON_TRACK" | "NEEDS_OPTIMIZATION" | "EARLY_DATA";
  statusLabel: string;
  velocityIndex: number; // e.g. 1.25 = 125% of forecast
  engagementHealth: "HIGH" | "MODERATE" | "LOW";
  recommendedAction: NextBestAction;
  provenance: "SELLERSALT_SCORE";
}

export function evaluatePublishedListing(metrics: PublishedListingMetrics): PostPublishDiagnosis {
  const {
    etsyListingId,
    publishedDaysAgo,
    totalSales,
    dailyVelocity,
    categoryBenchmarkVelocity,
    forecastOpportunityVelocity,
    tagComplianceCount,
    first40CharsKeywordMatch,
    favoritesCount = 0,
  } = metrics;

  const targetVelocity = Math.max(0.5, forecastOpportunityVelocity || categoryBenchmarkVelocity || 1.5);
  const velocityIndex = Math.round((dailyVelocity / targetVelocity) * 100) / 100;

  // Early sample guard (<5 days)
  if (publishedDaysAgo < 5) {
    return {
      listingId: etsyListingId,
      status: "EARLY_DATA",
      statusLabel: "Collecting Early Indexation Signals (<5 days)",
      velocityIndex,
      engagementHealth: "MODERATE",
      recommendedAction: {
        id: "monitor-early-indexation",
        context: "DRAFT",
        headline: "Allow Organic Indexation Period",
        signal: "Listing was published less than 5 days ago.",
        interpretation: "Etsy search ranking algorithms sample new listings over their first 7-14 days.",
        whyYouShouldCare: "Allowing early traffic accumulation before altering tags prevents resetting search relevance scores.",
        rationale: "Etsy search ranking algorithms sample new listings over their first 7-14 days. Maintain current tags.",
        actionLabel: "Monitor in Shop Intelligence",
        actionHref: "/shop-intelligence/tracked",
        actionType: "NAVIGATE",
        urgency: "LOW",
        scoreImpactEstimated: "Baseline Accumulation",
        icon: "⏳",
        provenance: "SELLERSALT_SCORE",
        confidence: 90,
      },
      provenance: "SELLERSALT_SCORE",
    };
  }

  // Outperforming forecast
  if (velocityIndex >= 1.2) {
    return {
      listingId: etsyListingId,
      status: "OUTPERFORMING",
      statusLabel: "Outperforming Forecast (+20% above benchmark)",
      velocityIndex,
      engagementHealth: "HIGH",
      recommendedAction: {
        id: "expand-product-variations",
        context: "PRODUCT",
        headline: "High Velocity Detected — Create Product Variation",
        signal: `Sales velocity (${dailyVelocity.toFixed(1)}/day) is outperforming forecast (${targetVelocity.toFixed(1)}/day) by +${Math.round((velocityIndex - 1) * 100)}%.`,
        interpretation: "Strong organic conversion confirms buyer intent fit in this category.",
        whyYouShouldCare: "Creating color/size variations allows you to dominate category search without starting from zero authority.",
        rationale: "Strong organic conversion confirms buyer intent fit. Create color/size variations to dominate category search.",
        actionLabel: "Create Variation in Planner",
        actionHref: "/planner",
        actionType: "NAVIGATE",
        urgency: "MEDIUM",
        scoreImpactEstimated: "+35% Catalog Revenue",
        icon: "🚀",
        provenance: "SELLERSALT_SCORE",
        confidence: 92,
      },
      provenance: "SELLERSALT_SCORE",
    };
  }

  // Needs optimization (trailing forecast or missing tags/keywords)
  if (velocityIndex < 0.7 || tagComplianceCount < 13 || !first40CharsKeywordMatch) {
    let rationale = "Listing sales velocity is trailing opportunity projection.";
    let signal = `Listing velocity (${dailyVelocity.toFixed(1)}/day) is trailing projected target (${targetVelocity.toFixed(1)}/day).`;
    let interpretation = "Traffic conversion is lagging behind category baseline.";
    let whyYouShouldCare = "Updating secondary tags and front-loading high-relevance search terms can recover search rank.";

    if (tagComplianceCount < 13) {
      signal = `Only ${tagComplianceCount}/13 tags utilized on active listing.`;
      interpretation = `Unused tag slots limit discoverability across secondary search terms.`;
      whyYouShouldCare = `Adding ${13 - tagComplianceCount} missing tags unlocks immediate organic search reach.`;
      rationale = `Only ${tagComplianceCount}/13 tags utilized. Adding missing tag slots unlocks immediate organic search reach.`;
    } else if (!first40CharsKeywordMatch) {
      signal = `Primary keyword is not placed in the first 40 title characters.`;
      interpretation = `Mobile buyer search cards truncate titles beyond 40 characters.`;
      whyYouShouldCare = `Front-loading the exact search query ensures instant recognition by browsing shoppers.`;
      rationale = "Primary high-intent keyword is not front-loaded in the first 40 title characters for mobile buyers.";
    }

    return {
      listingId: etsyListingId,
      status: "NEEDS_OPTIMIZATION",
      statusLabel: "Optimization Opportunity Identified",
      velocityIndex,
      engagementHealth: "LOW",
      recommendedAction: {
        id: "optimize-live-listing-seo",
        context: "CONTENT",
        headline: "Optimize Listing Tags & Front-Loaded Title",
        signal,
        interpretation,
        whyYouShouldCare,
        rationale,
        actionLabel: "Audit & Optimize in Studio",
        actionHref: "/studio",
        actionType: "NAVIGATE",
        urgency: "HIGH",
        scoreImpactEstimated: "+28% Search Impressions",
        icon: "⚡",
        provenance: "SELLERSALT_SCORE",
        confidence: 88,
      },
      provenance: "SELLERSALT_SCORE",
    };
  }

  // On track
  return {
    listingId: etsyListingId,
    status: "ON_TRACK",
    statusLabel: "On Track with Category Forecast",
    velocityIndex,
    engagementHealth: "MODERATE",
    recommendedAction: {
      id: "monitor-competitor-price-movement",
      context: "SHOP",
      headline: "Monitor Competitor Pricing Corridor",
      signal: `Listing velocity (${dailyVelocity.toFixed(1)}/day) is on track with category baseline (${targetVelocity.toFixed(1)}/day).`,
      interpretation: "Search placement is stable with healthy click-through retention.",
      whyYouShouldCare: "Tracking market price shifts ensures your profit margin remains protected.",
      rationale: "Performance is consistent with expectation. Track market price shifts to preserve margin superiority.",
      actionLabel: "View Shop Intelligence",
      actionHref: "/shop-intelligence",
      actionType: "NAVIGATE",
      urgency: "LOW",
      scoreImpactEstimated: "Stable Yield",
      icon: "📊",
      provenance: "SELLERSALT_SCORE",
      confidence: 85,
    },
    provenance: "SELLERSALT_SCORE",
  };
}
