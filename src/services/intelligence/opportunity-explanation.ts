/**
 * SellerSalt Opportunity Explanation Engine
 * 
 * Deterministically generates clear, evidence-based rationales, positive drivers,
 * negative risk factors, unknown signal disclosures, and recommended next actions
 * for any discovered opportunity.
 * 
 * ZERO-FABRICATION RULE:
 * - Transparently lists unknown signals instead of concealing data gaps.
 * - Never states certainty when underlying signals are estimated or derived.
 */

import type {
  OpportunityType,
  OpportunityExplanation,
  OpportunityEvidenceGraph,
  MomentumState,
} from "@/marketplaces/core/discovery-types";
import type { MarketplaceId } from "@/marketplaces/core/types";

export class OpportunityExplanationEngine {
  /**
   * Generates a deterministic, explainable rationale for an opportunity.
   */
  public static generateExplanation(params: {
    type: OpportunityType;
    title: string;
    marketplace: MarketplaceId;
    score: number | null;
    confidence: number;
    evidence: OpportunityEvidenceGraph;
    momentum: MomentumState;
    sampleSize: number;
  }): OpportunityExplanation {
    const { type, score, confidence, evidence, momentum } = params;

    const whyPositive: string[] = [];
    const watchNegative: string[] = [];
    const unknownSignals: string[] = [];

    // 1. Demand analysis
    if (evidence.demand.status === "STRONG") {
      whyPositive.push("Robust buyer demand indicated by active reviews, favorites, or sales yield.");
    } else if (evidence.demand.status === "WEAK") {
      watchNegative.push("Low observable demand engagement on source marketplace listing.");
    } else if (evidence.demand.status === "UNAVAILABLE") {
      unknownSignals.push("Direct buyer demand signals unobserved on source page.");
    }

    // 2. Competition analysis
    if (evidence.competition.status === "WEAK" || evidence.competition.score && evidence.competition.score < 40) {
      whyPositive.push("Low competition barrier — fragmented seller landscape allows new entrant penetration.");
    } else if (evidence.competition.status === "STRONG" || evidence.competition.score && evidence.competition.score >= 70) {
      watchNegative.push("High incumbent competition — established sellers dominate market share.");
    }

    // 3. Economics analysis
    if (evidence.economics.status === "STRONG") {
      whyPositive.push("Healthy price positioning supports viable margin economics.");
    } else if (evidence.economics.status === "WEAK") {
      watchNegative.push("Low or compressed price band creates tight margin constraints.");
    }

    // 4. Freshness analysis
    if (evidence.freshness.status === "STRONG") {
      whyPositive.push("Fresh, recently observed marketplace listing data (<24h).");
    } else if (evidence.freshness.status === "WEAK") {
      watchNegative.push("Data staleness: observations captured over 7 days ago.");
    }

    // 5. Momentum analysis
    if (momentum === "RISING" || momentum === "ACCELERATING") {
      whyPositive.push(`Upward momentum (${momentum.toLowerCase()}) detected across observation windows.`);
    } else if (momentum === "DECLINING" || momentum === "COOLING") {
      watchNegative.push(`Cooling trajectory (${momentum.toLowerCase()}) observed in recent windows.`);
    } else if (momentum === "INSUFFICIENT_DATA") {
      unknownSignals.push("Longitudinal multi-snapshot trajectory unavailable from single observation.");
    }

    // Always disclose universal ecommerce unknowns
    unknownSignals.push("Exact monthly search query volume is unavailable without licensed provider feeds.");
    unknownSignals.push("Internal seller conversion rate is private and unavailable without merchant OAuth.");

    // Determine Headline Verdict
    let headline = "Viable Opportunity";
    if (score !== null) {
      if (score >= 80) {
        headline = `High-Yield ${type} Opportunity`;
      } else if (score >= 65) {
        headline = `Promising ${type} Opportunity with Moderate Competition`;
      } else {
        headline = `Competitive ${type} with Margin Constraints`;
      }
    } else {
      headline = `Exploratory ${type} Profile (Insufficient Signals)`;
    }

    // Confidence & Freshness Reasoning
    const confidenceReasoning =
      confidence >= 80
        ? `High signal completeness (${confidence}%): multiple independent signals verified.`
        : confidence >= 50
        ? `Moderate confidence (${confidence}%): key metrics observed with partial secondary signals.`
        : `Limited confidence (${confidence}%): preliminary public observation with missing signal groups.`;

    const freshnessReasoning =
      evidence.freshness.status === "STRONG"
        ? "Live real-time public observation captured recently."
        : "Historical observation snapshot from SellerSalt repository.";

    // Action Recommendation
    let recommendedAction = "Run deeper keyword research to explore long-tail variants.";
    if (type === "PRODUCT") {
      recommendedAction =
        score && score >= 75
          ? "Create listing draft in AI Studio and benchmark against top competitor listings."
          : "Monitor listing price and review velocity across the next 14 days.";
    } else if (type === "KEYWORD") {
      recommendedAction = "Harvest related long-tail tags and evaluate synergy with existing catalog.";
    } else if (type === "NICHE") {
      recommendedAction = "Inspect top 5 products in this niche and identify underserved price bands.";
    } else if (type === "CATEGORY") {
      recommendedAction = "Compare this category against adjacent taxonomies to discover higher yield niches.";
    } else if (type === "SELLER") {
      recommendedAction = "Analyze seller catalog concentration and review velocity to spot gap opportunities.";
    }

    return {
      headline,
      whyPositive: whyPositive.length > 0 ? whyPositive : ["Standard market listing presence."],
      watchNegative: watchNegative.length > 0 ? watchNegative : ["Monitor for emerging competitors."],
      unknownSignals,
      confidenceReasoning,
      freshnessReasoning,
      recommendedAction,
    };
  }
}
