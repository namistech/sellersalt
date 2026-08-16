/**
 * SellerSalt Universal Next Best Action Engine
 * 
 * Provides deterministic, data-backed guidance answering "What should I do next?"
 * across every analytical and planning surface (Rule 5: Explainable inputs).
 */

export type ActionContextType =
  | "PRODUCT"
  | "KEYWORD"
  | "SHOP"
  | "CATEGORY"
  | "PLANNER"
  | "CONTENT"
  | "DRAFT";

export interface NextBestAction {
  id: string;
  context: ActionContextType;
  headline: string;
  rationale: string;
  actionLabel: string;
  actionHref?: string;
  actionType: "NAVIGATE" | "API_CALL" | "MODAL";
  urgency: "HIGH" | "MEDIUM" | "LOW";
  scoreImpactEstimated: string;
  icon: string;
}

export interface ProductActionInputs {
  opportunityScore: number;
  estDailySales: number;
  shopReviewCount: number;
  price: number;
  isShortlisted?: boolean;
  hasKeywords?: boolean;
}

export function getProductNextAction(inputs: ProductActionInputs): NextBestAction {
  const { opportunityScore, estDailySales, shopReviewCount, price, isShortlisted } = inputs;

  if (!isShortlisted && opportunityScore >= 75) {
    return {
      id: "shortlist-opportunity",
      context: "PRODUCT",
      headline: "High Opportunity Score detected",
      rationale: `With ${estDailySales.toFixed(1)} est. daily sales and moderate shop reviews (${shopReviewCount}), this item represents a prime candidate for your catalog.`,
      actionLabel: "Add to Planner & Build Cluster",
      actionHref: "/planner",
      actionType: "NAVIGATE",
      urgency: "HIGH",
      scoreImpactEstimated: "+15% Catalog Yield",
      icon: "🔥",
    };
  }

  if (price > 45) {
    return {
      id: "analyze-pricing-corridor",
      context: "PRODUCT",
      headline: "Premium Price Corridor Opportunity",
      rationale: "High unit revenue allows higher ad margins and customizable differentiation.",
      actionLabel: "Build Keyword Cluster",
      actionHref: "/keyword-research",
      actionType: "NAVIGATE",
      urgency: "MEDIUM",
      scoreImpactEstimated: "+$12.50 Net Margin",
      icon: "💎",
    };
  }

  return {
    id: "explore-keyword-cluster",
    context: "PRODUCT",
    headline: "Mine Long-Tail Keyword Cluster",
    rationale: "Extract high-intent search tags from competing organic listings to dominate search ranking.",
    actionLabel: "Mine Keywords",
    actionHref: "/keyword-research",
    actionType: "NAVIGATE",
    urgency: "MEDIUM",
    scoreImpactEstimated: "13 SEO Tags",
    icon: "#",
  };
}

export interface KeywordActionInputs {
  keyword: string;
  opportunityScore: number;
  competitionLevel: "LOW" | "MODERATE" | "HIGH";
  searchVolumeEstimated: number;
}

export function getKeywordNextAction(inputs: KeywordActionInputs): NextBestAction {
  const { keyword, opportunityScore, competitionLevel } = inputs;

  if (opportunityScore >= 70 && competitionLevel === "LOW") {
    return {
      id: "add-keywords-to-planner",
      context: "KEYWORD",
      headline: `High Opportunity / Low Competition: "${keyword}"`,
      rationale: "Low competing listing saturation means faster organic indexation in the first 40 title characters.",
      actionLabel: "Add to Planner",
      actionHref: "/planner",
      actionType: "NAVIGATE",
      urgency: "HIGH",
      scoreImpactEstimated: "First-Page Feasibility",
      icon: "⚡",
    };
  }

  return {
    id: "explore-category-hunting",
    context: "KEYWORD",
    headline: "Verify Category Saturation",
    rationale: "Inspect leaf buyer categories to determine which sub-branch has the lowest seller review moat.",
    actionLabel: "Explore Categories",
    actionHref: "/categories",
    actionType: "NAVIGATE",
    urgency: "MEDIUM",
    scoreImpactEstimated: "Category Fit",
    icon: "📁",
  };
}

export interface PlannerActionInputs {
  status: string;
  hasStrategy: boolean;
  hasContent: boolean;
  hasDraft: boolean;
  listingScore?: number;
}

export function getPlannerNextAction(inputs: PlannerActionInputs): NextBestAction {
  const { status, hasContent, hasDraft, listingScore } = inputs;

  if (status === "BACKLOG" || !hasContent) {
    return {
      id: "generate-listing-strategy",
      context: "PLANNER",
      headline: "Opportunity Ready for Strategy & Content",
      rationale: "Synthesize an optimized title, 13 tags, and structured 10-part description from your keyword cluster.",
      actionLabel: "Generate Listing Content",
      actionType: "MODAL",
      urgency: "HIGH",
      scoreImpactEstimated: "100% Content Ready",
      icon: "✍️",
    };
  }

  if (hasContent && !hasDraft) {
    return {
      id: "run-preflight-draft",
      context: "PLANNER",
      headline: "Content Ready — Run Pre-Flight Validation",
      rationale: "Review tag count (13/13), title limits (<=140), and prepare Etsy draft with human approval gate.",
      actionLabel: "Prepare Etsy Draft",
      actionType: "MODAL",
      urgency: "HIGH",
      scoreImpactEstimated: "Draft Ready",
      icon: "📦",
    };
  }

  return {
    id: "review-and-publish",
    context: "PLANNER",
    headline: "Draft Created — Ready for Review on Etsy",
    rationale: "Your draft is saved in draft state. Review final photos and postage on Etsy before going live.",
    actionLabel: "Open Etsy Listing Manager",
    actionType: "NAVIGATE",
    urgency: "MEDIUM",
    scoreImpactEstimated: "Live Marketplace Sync",
    icon: "🚀",
  };
}
