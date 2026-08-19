/**
 * SellerSalt Listing Strategy & Opportunity Package Engine
 * 
 * Synthesizes research evidence into an actionable strategic plan before content generation.
 * Moves from "data -> decision -> content" rather than raw AI text generation.
 */

import {
  ETSY_OPTIMIZATION_RULES,
  type MarketplaceOptimizationRules,
} from "@/marketplaces/core/optimization-rules";

export interface OpportunityPackageParams {
  productTitle: string;
  price: number;
  category?: string;
  shopName?: string;
  shopTotalSales?: number;
  shopReviewCount?: number;
  estDailySales?: number;
  opportunityScore?: number;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  estimatedCogs?: number;
}

export interface OpportunityEconomics {
  sellingPrice: number;
  etsyFees: number;
  estimatedCogs: number;
  netProfit: number;
  profitMarginPercent: number;
  breakEvenMonthlyUnits: number;
}

export interface ListingStrategyPlan {
  positioning: string;
  primaryBuyerIntent: string;
  keywordStrategy: string;
  pricingStrategy: string;
  differentiation: string;
  contentStrategy: string;
  competitiveRisk: string;
  recommendationVerdict: "STRONG_OPPORTUNITY" | "GOOD_OPPORTUNITY" | "MODERATE_OPPORTUNITY" | "WEAK_OPPORTUNITY" | "AVOID";
  verdictLabel: string;
}

export interface OpportunityPackage {
  product: {
    title: string;
    price: number;
    category: string;
    shopName: string;
    shopTotalSales: number;
    shopReviewCount: number;
    estDailySales: number;
    opportunityScore: number;
  };
  keywords: {
    primary: string;
    secondaries: string[];
    clusterCount: number;
  };
  economics: OpportunityEconomics;
  strategy: ListingStrategyPlan;
}

export function buildOpportunityPackage(
  params: OpportunityPackageParams,
  rules: MarketplaceOptimizationRules = ETSY_OPTIMIZATION_RULES
): OpportunityPackage {
  const price = params.price || 28.0;
  const cogs = params.estimatedCogs || price * 0.25;
  const percentageFee = rules.feeSchedule?.percentageFee ?? 0.095;
  const flatFee = rules.feeSchedule?.flatFee ?? 0.20;
  const etsyFees = Math.round((price * percentageFee + flatFee) * 100) / 100;
  const netProfit = Math.round(Math.max(0, price - cogs - etsyFees) * 100) / 100;
  const profitMarginPercent = price > 0 ? Math.round((netProfit / price) * 1000) / 10 : 0;
  const score = params.opportunityScore ?? 75;

  const primary = params.primaryKeyword || params.productTitle.split(" ").slice(0, 3).join(" ");
  const secondaries = params.secondaryKeywords || [];

  // Determine Recommendation Verdict
  let verdict: ListingStrategyPlan["recommendationVerdict"] = "GOOD_OPPORTUNITY";
  let verdictLabel = "Good Opportunity — High Feasibility";

  if (score >= 80 && profitMarginPercent >= 50) {
    verdict = "STRONG_OPPORTUNITY";
    verdictLabel = "Strong Opportunity — Prime Target for Listing Creation";
  } else if (score < 50 || profitMarginPercent < 25) {
    verdict = "WEAK_OPPORTUNITY";
    verdictLabel = "Weak Opportunity — Low Margin or Saturated Barrier";
  } else if (score >= 60) {
    verdict = "MODERATE_OPPORTUNITY";
    verdictLabel = "Moderate Opportunity — Differentiation Required";
  }

  const strategy: ListingStrategyPlan = {
    positioning: `Compete on premium artisan craftsmanship and personalized gifting options in ${params.category || "Handmade Goods"}.`,
    primaryBuyerIntent: `Buyers seeking '${primary}' with custom personalization and fast dispatch times.`,
    keywordStrategy: `Lock '${primary}' in the first 40 title characters with long-tail secondary phrases in tags.`,
    pricingStrategy: `Target $${price.toFixed(2)} with estimated $${netProfit.toFixed(2)} net profit per order (${profitMarginPercent}% margin).`,
    differentiation: `Emphasize custom options, superior photography, and transparent care instructions.`,
    contentStrategy: `Lead with emotional buyer hook, detailed dimensions, and step-by-step custom order guidelines.`,
    competitiveRisk: `Incumbent stores have accumulated reviews; focus on long-tail search intent to bypass broad keyword competition.`,
    recommendationVerdict: verdict,
    verdictLabel,
  };

  return {
    product: {
      title: params.productTitle,
      price,
      category: params.category || "Handmade Goods",
      shopName: params.shopName || "Competitor Store",
      shopTotalSales: params.shopTotalSales ?? 0,
      shopReviewCount: params.shopReviewCount ?? 0,
      estDailySales: params.estDailySales ?? 0,
      opportunityScore: score,
    },
    keywords: {
      primary,
      secondaries,
      clusterCount: 1 + secondaries.length,
    },
    economics: {
      sellingPrice: price,
      etsyFees,
      estimatedCogs: cogs,
      netProfit,
      profitMarginPercent,
      breakEvenMonthlyUnits: netProfit > 0 ? Math.ceil(50 / netProfit) : 10,
    },
    strategy,
  };
}
