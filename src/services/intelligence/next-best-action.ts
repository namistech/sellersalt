/**
 * SellerSalt Universal Next Best Action Engine 2.0
 * 
 * Provides deterministic, explainable data-backed recommendations answering:
 * "What is the highest-value action this seller should take now?"
 * 
 * Complies with Rule 2 (Preserve data provenance), Rule 5 (Explainable inputs),
 * and Rule 9 (Never silently publish).
 */

import type { DataProvenanceType } from "@/types/provenance";

export type ActionContextType =
  | "PRODUCT"
  | "SHORTLISTED"
  | "KEYWORD"
  | "CATEGORY"
  | "SHOP"
  | "COMPETITOR"
  | "STRATEGY"
  | "CONTENT"
  | "DRAFT"
  | "PUBLISHED"
  | "PLANNER"
  | "OWN_SHOP";

export interface NextBestAction {
  id: string;
  context: ActionContextType;
  headline: string;
  
  // Rule 5 & Batch 18 Section 5: "Why This Matters" 4-part structure
  signal: string;             // What happened
  interpretation: string;     // Why it matters
  whyYouShouldCare: string;   // Impact on seller catalog & revenue
  rationale: string;          // Combined compact narrative summary
  
  actionLabel: string;
  actionHref?: string;
  actionType: "NAVIGATE" | "API_CALL" | "MODAL";
  urgency: "HIGH" | "MEDIUM" | "LOW";
  scoreImpactEstimated: string;
  icon: string;
  provenance: DataProvenanceType;
  confidence: number; // 0-100
}

// --------------------------------------------------------------------------
// 1. Product Discovery Actions
// --------------------------------------------------------------------------

export interface ProductActionInputs {
  opportunityScore: number;
  estDailySales: number;
  shopReviewCount: number;
  price: number;
  isShortlisted?: boolean;
  hasKeywords?: boolean;
  listingTitle?: string;
  shopName?: string;
}

export function getProductNextAction(inputs: ProductActionInputs): NextBestAction {
  const { opportunityScore, estDailySales, shopReviewCount, price, isShortlisted, listingTitle } = inputs;

  if (!isShortlisted && opportunityScore >= 75) {
    const signal = `High composite Opportunity Score (${opportunityScore}/100) with ${estDailySales.toFixed(1)} est. daily sales.`;
    const interpretation = `This item shows top-tier market velocity with an accessible review barrier (${shopReviewCount} reviews).`;
    const whyYouShouldCare = `Shortlisting this product lets you immediately harvest competitor keyword clusters and model target margins.`;
    
    return {
      id: "shortlist-opportunity",
      context: "PRODUCT",
      headline: "Strong Opportunity — Shortlist Product",
      signal,
      interpretation,
      whyYouShouldCare,
      rationale: `${signal} ${interpretation}`,
      actionLabel: "Shortlist Product",
      actionHref: "/planner",
      actionType: "NAVIGATE",
      urgency: "HIGH",
      scoreImpactEstimated: "+15% Catalog Yield",
      icon: "🔥",
      provenance: "SELLERSALT_SCORE",
      confidence: 90,
    };
  }

  if (isShortlisted && !inputs.hasKeywords) {
    const signal = `Product is shortlisted in your pipeline but has no mapped keyword cluster.`;
    const interpretation = `Without a validated 13-tag keyword cluster, your listing cannot achieve first-page organic indexation.`;
    const whyYouShouldCare = `Mining competitor organic search tags secures first-page organic indexation and buyer traffic from launch day.`;

    return {
      id: "research-product-keywords",
      context: "SHORTLISTED",
      headline: "Shortlisted — Research Keywords",
      signal,
      interpretation,
      whyYouShouldCare,
      rationale: `${signal} ${interpretation}`,
      actionLabel: "Research Keywords",
      actionHref: "/keyword-research",
      actionType: "NAVIGATE",
      urgency: "HIGH",
      scoreImpactEstimated: "13 SEO Tags",
      icon: "#",
      provenance: "SELLERSALT_SCORE",
      confidence: 95,
    };
  }

  if (price > 45) {
    const signal = `Premium unit price ($${price.toFixed(2)}) identified in catalog.`;
    const interpretation = `High average order value accommodates healthy ad margin and custom personalization add-ons.`;
    const whyYouShouldCare = `Capturing premium buyer intent delivers higher net profit per order than competing commodity listings.`;

    return {
      id: "analyze-pricing-corridor",
      context: "PRODUCT",
      headline: "Premium Price Corridor — Build Cluster",
      signal,
      interpretation,
      whyYouShouldCare,
      rationale: `${signal} ${interpretation}`,
      actionLabel: "Build Keyword Cluster",
      actionHref: "/keyword-research",
      actionType: "NAVIGATE",
      urgency: "MEDIUM",
      scoreImpactEstimated: "+$12.50 Net Margin",
      icon: "💎",
      provenance: "ESTIMATED",
      confidence: 85,
    };
  }

  const signal = `Organic product opportunity identified with steady discovery signals.`;
  const interpretation = `Analyzing competitor title tags reveals untapped search long-tail sub-niches.`;
  const whyYouShouldCare = `Long-tail keywords offer lower click competition and higher immediate conversion rates.`;

  return {
    id: "explore-keyword-cluster",
    context: "PRODUCT",
    headline: "Mine Long-Tail Keyword Cluster",
    signal,
    interpretation,
    whyYouShouldCare,
    rationale: `${signal} ${interpretation}`,
    actionLabel: "Mine Keywords",
    actionHref: "/keyword-research",
    actionType: "NAVIGATE",
    urgency: "MEDIUM",
    scoreImpactEstimated: "13 SEO Tags",
    icon: "#",
    provenance: "SELLERSALT_SCORE",
    confidence: 80,
  };
}

// --------------------------------------------------------------------------
// 2. Keyword Intelligence Actions
// --------------------------------------------------------------------------

export interface KeywordActionInputs {
  keyword: string;
  opportunityScore: number;
  competitionLevel: "LOW" | "MODERATE" | "HIGH";
  searchVolumeEstimated?: number;
  hasAssociatedProduct?: boolean;
}

export function getKeywordNextAction(inputs: KeywordActionInputs): NextBestAction {
  const { keyword, opportunityScore, competitionLevel, hasAssociatedProduct } = inputs;

  if (opportunityScore >= 70 && competitionLevel === "LOW") {
    const signal = `High opportunity score (${opportunityScore}/100) with low competing listing saturation for "${keyword}".`;
    const interpretation = `This search phrase has strong buyer purchase intent with few optimized seller storefronts.`;
    const whyYouShouldCare = `Placing this keyword in your title's first 40 characters gives you the fastest path to page-one ranking.`;

    return {
      id: "add-keywords-to-planner",
      context: "KEYWORD",
      headline: `High Opportunity / Low Competition: "${keyword}"`,
      signal,
      interpretation,
      whyYouShouldCare,
      rationale: `${signal} ${interpretation}`,
      actionLabel: "Add to Planner",
      actionHref: "/planner",
      actionType: "NAVIGATE",
      urgency: "HIGH",
      scoreImpactEstimated: "First-Page Feasibility",
      icon: "⚡",
      provenance: "SELLERSALT_SCORE",
      confidence: 92,
    };
  }

  const signal = `Keyword "${keyword}" exhibits moderate competition across top marketplace listings.`;
  const interpretation = `Validating category sub-niches allows you to find narrower leaf categories with lower seller review barriers.`;
  const whyYouShouldCare = `Proper leaf category placement boosts Etsy search relevance score without extra ad spend.`;

  return {
    id: "explore-category-hunting",
    context: "KEYWORD",
    headline: "Explore Category Sub-Niches",
    signal,
    interpretation,
    whyYouShouldCare,
    rationale: `${signal} ${interpretation}`,
    actionLabel: "Explore Categories",
    actionHref: "/categories",
    actionType: "NAVIGATE",
    urgency: "MEDIUM",
    scoreImpactEstimated: "Category Fit",
    icon: "📁",
    provenance: "SELLERSALT_SCORE",
    confidence: 78,
  };
}

// --------------------------------------------------------------------------
// 3. Planner & Strategy Actions
// --------------------------------------------------------------------------

export interface PlannerActionInputs {
  status: string;
  hasStrategy: boolean;
  hasContent: boolean;
  hasDraft: boolean;
  listingScore?: number;
  title?: string;
}

export function getPlannerNextAction(inputs: PlannerActionInputs): NextBestAction {
  const { status, hasStrategy, hasContent, hasDraft } = inputs;

  if (!hasStrategy) {
    const signal = `Target product is shortlisted in Planner but lacks a structured listing strategy.`;
    const interpretation = `Strategy defines target price corridor, COGS margin, and core 13-tag keyword blueprint.`;
    const whyYouShouldCare = `A complete strategy ensures your listing copy directly answers search algorithms and buyer questions.`;

    return {
      id: "build-listing-strategy",
      context: "STRATEGY",
      headline: "Build Listing Strategy",
      signal,
      interpretation,
      whyYouShouldCare,
      rationale: `${signal} ${interpretation}`,
      actionLabel: "Build Listing Strategy",
      actionHref: "/planner",
      actionType: "MODAL",
      urgency: "HIGH",
      scoreImpactEstimated: "Strategy Blueprint",
      icon: "🎯",
      provenance: "SELLERSALT_SCORE",
      confidence: 90,
    };
  }

  if (hasStrategy && !hasContent) {
    const signal = `Strategy blueprint is complete, but listing title, tags, and description are not generated.`;
    const interpretation = `Original AI synthesis converts your keyword cluster into 140-char title and 13 distinct tags (<15% overlap).`;
    const whyYouShouldCare = `Generating SEO copy with originality guarantees compliance and maximizes search indexing.`;

    return {
      id: "generate-listing-content",
      context: "CONTENT",
      headline: "Generate Listing Content",
      signal,
      interpretation,
      whyYouShouldCare,
      rationale: `${signal} ${interpretation}`,
      actionLabel: "Generate Listing Content",
      actionHref: "/planner",
      actionType: "MODAL",
      urgency: "HIGH",
      scoreImpactEstimated: "100% Content Ready",
      icon: "✍️",
      provenance: "SELLERSALT_SCORE",
      confidence: 95,
    };
  }

  if (hasContent && !hasDraft) {
    const signal = `Listing content has passed originality checks and is ready for draft preparation.`;
    const interpretation = `Draft preparation validates Etsy character limits, tag counts (13/13), and taxonomy assignment.`;
    const whyYouShouldCare = `Creating an Etsy draft preserves draft state for human photo and shipping review before publishing.`;

    return {
      id: "run-preflight-draft",
      context: "DRAFT",
      headline: "Content Ready — Run Pre-Flight Validation",
      signal,
      interpretation,
      whyYouShouldCare,
      rationale: `${signal} ${interpretation}`,
      actionLabel: "Prepare Etsy Draft",
      actionHref: "/drafts",
      actionType: "MODAL",
      urgency: "HIGH",
      scoreImpactEstimated: "Draft Ready",
      icon: "📦",
      provenance: "SELLERSALT_SCORE",
      confidence: 96,
    };
  }

  const signal = `Draft is created on Etsy in draft state and awaiting mandatory human review.`;
  const interpretation = `Per Rule 9, SellerSalt never silently publishes. Review your final mockups, dimensions, and postage.`;
  const whyYouShouldCare = `Final human inspection ensures zero compliance errors and protects your seller store rating.`;

  return {
    id: "review-draft-human-gate",
    context: "DRAFT",
    headline: "Review Draft on Etsy",
    signal,
    interpretation,
    whyYouShouldCare,
    rationale: `${signal} ${interpretation}`,
    actionLabel: "Review Draft",
    actionHref: "/drafts",
    actionType: "NAVIGATE",
    urgency: "HIGH",
    scoreImpactEstimated: "Marketplace Ready",
    icon: "👁️",
    provenance: "ACTUAL_ETSY_DATA",
    confidence: 100,
  };
}

// --------------------------------------------------------------------------
// 4. Competitor Surveillance Actions
// --------------------------------------------------------------------------

export interface CompetitorActionInputs {
  shopName: string;
  salesGrowth7dPercent: number;
  newListingCount?: number;
  priceDropsDetected?: number;
}

export function getCompetitorNextAction(inputs: CompetitorActionInputs): NextBestAction {
  const { shopName, salesGrowth7dPercent, newListingCount } = inputs;

  if (salesGrowth7dPercent >= 15) {
    const signal = `Competitor '${shopName}' sales velocity increased +${salesGrowth7dPercent.toFixed(1)}% over 7 days.`;
    const interpretation = `This shop is gaining sales momentum significantly faster than the category baseline.`;
    const whyYouShouldCare = `Their winning listings reveal emerging buyer demand and hot search tags before the niche becomes saturated.`;

    return {
      id: "analyze-winning-listings",
      context: "COMPETITOR",
      headline: "Competitor Surge — Analyze Winning Listings",
      signal,
      interpretation,
      whyYouShouldCare,
      rationale: `${signal} ${interpretation}`,
      actionLabel: "Analyze Winning Listings",
      actionHref: `/spy?shop=${encodeURIComponent(shopName)}`,
      actionType: "NAVIGATE",
      urgency: "HIGH",
      scoreImpactEstimated: "Emerging Demand Tags",
      icon: "🔥",
      provenance: "ESTIMATED",
      confidence: 88,
    };
  }

  const signal = `Competitor '${shopName}' tracking active with stable catalog metrics.`;
  const interpretation = `Periodic inspection of competitor tags reveals subtle catalog optimizations.`;
  const whyYouShouldCare = `Staying synchronized with leading competitors prevents market share erosion in key search tags.`;

  return {
    id: "monitor-competitor-catalog",
    context: "COMPETITOR",
    headline: "Inspect Competitor Tags",
    signal,
    interpretation,
    whyYouShouldCare,
    rationale: `${signal} ${interpretation}`,
    actionLabel: "Inspect Shop Tags",
    actionHref: `/spy?shop=${encodeURIComponent(shopName)}`,
    actionType: "NAVIGATE",
    urgency: "MEDIUM",
    scoreImpactEstimated: "Tag Benchmark",
    icon: "👁️",
    provenance: "ESTIMATED",
    confidence: 82,
  };
}

// --------------------------------------------------------------------------
// 5. Published Listing / Post-Publish Monitoring Actions
// --------------------------------------------------------------------------

export interface PublishedListingActionInputs {
  listingTitle: string;
  daysLive: number;
  actualDailySales: number;
  forecastDailySales: number;
  seoScore: number;
}

export function getPublishedListingNextAction(inputs: PublishedListingActionInputs): NextBestAction {
  const { listingTitle, daysLive, actualDailySales, forecastDailySales, seoScore } = inputs;
  const underperformance = forecastDailySales > 0 ? (forecastDailySales - actualDailySales) / forecastDailySales : 0;

  if (daysLive >= 14 && underperformance >= 0.25) {
    const signal = `Listing has been live for ${daysLive} days with actual velocity (${actualDailySales.toFixed(1)}/day) below forecast (${forecastDailySales.toFixed(1)}/day).`;
    const interpretation = `Early traffic conversion is lagging behind category benchmarks, likely due to tag competition or photo CTR.`;
    const whyYouShouldCare = `Updating secondary tags and front-loading high-relevance search terms can recover organic search rank.`;

    return {
      id: "optimize-underperforming-listing",
      context: "PUBLISHED",
      headline: "Performance Below Forecast — Optimize Listing",
      signal,
      interpretation,
      whyYouShouldCare,
      rationale: `${signal} ${interpretation}`,
      actionLabel: "Optimize Listing SEO",
      actionHref: "/seo",
      actionType: "NAVIGATE",
      urgency: "HIGH",
      scoreImpactEstimated: "+35% Organic Reach",
      icon: "⚡",
      provenance: "SELLERSALT_SCORE",
      confidence: 86,
    };
  }

  const signal = `Published listing performing within projected velocity parameters.`;
  const interpretation = `Search placement is healthy with steady organic impression retention.`;
  const whyYouShouldCare = `Ongoing surveillance ensures immediate notification if competitor price shifts threaten listing rank.`;

  return {
    id: "maintain-listing-monitoring",
    context: "PUBLISHED",
    headline: "Listing Healthy — Monitor Velocity",
    signal,
    interpretation,
    whyYouShouldCare,
    rationale: `${signal} ${interpretation}`,
    actionLabel: "View Surveillance",
    actionHref: "/spy/tracked",
    actionType: "NAVIGATE",
    urgency: "LOW",
    scoreImpactEstimated: "Velocity Stability",
    icon: "📈",
    provenance: "SELLERSALT_SCORE",
    confidence: 90,
  };
}

// --------------------------------------------------------------------------
// 6. Universal Opportunity Action Dispatcher
// --------------------------------------------------------------------------

export function resolveNextBestAction(context: {
  stage: string;
  opportunityScore: number;
  estDailySales?: number;
  price?: number;
  reviewCount?: number;
  hasKeywords?: boolean;
  hasStrategy?: boolean;
  hasContent?: boolean;
  hasDraft?: boolean;
  isPublished?: boolean;
  competitorSalesGrowth?: number;
  shopName?: string;
  daysLive?: number;
  actualSales?: number;
  forecastSales?: number;
  seoScore?: number;
}): NextBestAction {
  if (context.competitorSalesGrowth !== undefined && context.competitorSalesGrowth >= 15 && context.shopName) {
    return getCompetitorNextAction({
      shopName: context.shopName,
      salesGrowth7dPercent: context.competitorSalesGrowth,
    });
  }

  if (context.isPublished && context.daysLive !== undefined) {
    return getPublishedListingNextAction({
      listingTitle: context.shopName ?? "Listing",
      daysLive: context.daysLive,
      actualDailySales: context.actualSales ?? 0,
      forecastDailySales: context.forecastSales ?? 2,
      seoScore: context.seoScore ?? 80,
    });
  }

  switch (context.stage) {
    case "RESEARCHED":
      return getProductNextAction({
        opportunityScore: context.opportunityScore,
        estDailySales: context.estDailySales ?? 3,
        shopReviewCount: context.reviewCount ?? 50,
        price: context.price ?? 25,
        isShortlisted: false,
      });

    case "SHORTLISTED":
    case "OPPORTUNITY":
      return getProductNextAction({
        opportunityScore: context.opportunityScore,
        estDailySales: context.estDailySales ?? 3,
        shopReviewCount: context.reviewCount ?? 50,
        price: context.price ?? 25,
        isShortlisted: true,
        hasKeywords: context.hasKeywords,
      });

    case "KEYWORDS":
      return getKeywordNextAction({
        keyword: context.shopName ?? "target keyword",
        opportunityScore: context.opportunityScore,
        competitionLevel: "LOW",
      });

    case "STRATEGY":
    case "CONTENT":
    case "DRAFT":
    case "REVIEW":
      return getPlannerNextAction({
        status: context.stage,
        hasStrategy: Boolean(context.hasStrategy),
        hasContent: Boolean(context.hasContent),
        hasDraft: Boolean(context.hasDraft),
      });

    default:
      return getProductNextAction({
        opportunityScore: context.opportunityScore,
        estDailySales: context.estDailySales ?? 3,
        shopReviewCount: context.reviewCount ?? 50,
        price: context.price ?? 25,
        isShortlisted: false,
      });
  }
}
