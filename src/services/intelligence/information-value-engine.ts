/**
 * SellerSalt — Uncertainty / Information Value Engine
 * 
 * Evaluates and ranks information gaps by their potential impact on commercial decisions.
 * Directs merchant attention to the highest-leverage verification tasks.
 */

import type {
  InformationValueReport,
  InformationGap,
  LaunchReadinessAssessment,
} from "@/marketplaces/core/opportunity-workspace-types";

export class InformationValueEngine {
  /**
   * Identifies and ranks information gaps for a product workspace.
   */
  public static evaluateInformationGaps(input: {
    hasUserEconomics: boolean;
    observationCount: number;
    hasDifferentiation: boolean;
    readiness: LaunchReadinessAssessment;
  }): InformationValueReport {
    const gaps: InformationGap[] = [];

    // 1. Landed Supplier Cost
    if (!input.hasUserEconomics) {
      gaps.push({
        id: "gap_supplier_landed_cost",
        unknownSignal: "Supplier Landed Manufacturing Cost (EXW + Freight)",
        decisionImpact: "CRITICAL",
        reason: "Without true landed unit cost, net contribution profit and break-even pricing cannot be validated.",
        recommendedAction: "Send RFQ to 3 verified suppliers for 100, 300, and 500 unit tiers.",
        estimatedEffort: "MEDIUM",
        status: "OPEN",
      });
    }

    // 2. Factory MOQ
    if (!input.hasUserEconomics) {
      gaps.push({
        id: "gap_factory_moq",
        unknownSignal: "Minimum Order Quantity & Tooling Investment",
        decisionImpact: "HIGH",
        reason: "High initial MOQs increase capital commitment and upfront inventory exposure.",
        recommendedAction: "Confirm if factory allows sample test runs of 100–200 units with custom packaging.",
        estimatedEffort: "LOW",
        status: "OPEN",
      });
    }

    // 3. Sample Quality & Dimensions
    gaps.push({
      id: "gap_sample_quality",
      unknownSignal: "Physical Sample Quality & Packaging Finish",
      decisionImpact: "HIGH",
      reason: "Defects or cheap packaging lead to immediate negative reviews that destroy listing velocity.",
      recommendedAction: "Order physical production sample to test finish, unboxing, and shipping durability.",
      estimatedEffort: "HIGH",
      status: "OPEN",
    });

    // 4. Market Observation Sample Size
    if (input.observationCount < 10) {
      gaps.push({
        id: "gap_market_sample_size",
        unknownSignal: "Longitudinal Competitor Review Velocity",
        decisionImpact: "MEDIUM",
        reason: "Fewer than 10 listings sampled leaves broader category price variance unmapped.",
        recommendedAction: "Run deep research across Etsy, Amazon, and Walmart to capture more product records.",
        estimatedEffort: "LOW",
        status: "OPEN",
      });
    }

    // 5. Private Search Volume
    gaps.push({
      id: "gap_exact_search_volume",
      unknownSignal: "Exact Private Search Volume & Conversion Rate",
      decisionImpact: "LOW",
      reason: "Public listing prevalence and review velocity already corroborate active market demand.",
      recommendedAction: "Do not block initial sourcing outreach on search volume; use listing prevalence as proxy.",
      estimatedEffort: "LOW",
      status: "DEFERRED",
    });

    // Sort by decision impact
    const impactWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    gaps.sort((a, b) => impactWeight[b.decisionImpact] - impactWeight[a.decisionImpact]);

    const criticalGaps = gaps.filter((g) => g.decisionImpact === "CRITICAL" && g.status === "OPEN");
    const highGaps = gaps.filter((g) => g.decisionImpact === "HIGH" && g.status === "OPEN");

    let uncertaintyRating: InformationValueReport["uncertaintyRating"] = "LOW_UNCERTAINTY";
    if (criticalGaps.length > 0) {
      uncertaintyRating = "CRITICAL_UNCERTAINTY";
    } else if (highGaps.length > 0) {
      uncertaintyRating = "HIGH_UNCERTAINTY";
    } else if (gaps.length > 2) {
      uncertaintyRating = "MODERATE_UNCERTAINTY";
    }

    const mostCriticalVerificationNext =
      criticalGaps.length > 0
        ? criticalGaps[0].recommendedAction
        : highGaps.length > 0
        ? highGaps[0].recommendedAction
        : "Order physical sample and prepare listing assets.";

    return {
      gaps,
      mostCriticalVerificationNext,
      uncertaintyRating,
    };
  }
}
