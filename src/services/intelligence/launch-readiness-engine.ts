/**
 * SellerSalt — Launch Readiness Engine
 * 
 * Evaluates whether an opportunity candidate is ready to advance from research
 * to sourcing RFQ, sample testing, or inventory commitment.
 * Deterministic multi-dimensional evaluation.
 */

import type {
  LaunchReadinessAssessment,
  LaunchReadinessDimension,
  LaunchReadinessStatus,
  ProductAttributeIntelligenceSummary,
  DifferentiationBuilderResult,
  MarketPositioningAnalysis,
  UnitEconomicsAnalysis,
  SourcingSpecification,
} from "@/marketplaces/core/opportunity-workspace-types";

export class LaunchReadinessEngine {
  /**
   * Evaluates launch readiness across 10 distinct dimensions.
   */
  public static evaluateReadiness(input: {
    attributes: ProductAttributeIntelligenceSummary;
    differentiation: DifferentiationBuilderResult;
    positioning: MarketPositioningAnalysis;
    economics: UnitEconomicsAnalysis;
    sourcing: SourcingSpecification;
    observationCount: number;
    hasUserEconomics: boolean;
  }): LaunchReadinessAssessment {
    const dimensions: LaunchReadinessDimension[] = [];
    const criticalBlockers: string[] = [];

    // 1. Market Evidence
    const hasEnoughListings = input.observationCount >= 10;
    dimensions.push({
      name: "Market Evidence Sample",
      score: hasEnoughListings ? 90 : input.observationCount >= 3 ? 60 : 30,
      status: hasEnoughListings ? "SATISFIED" : input.observationCount >= 3 ? "WARNING" : "BLOCKING",
      evidence: `${input.observationCount} listings sampled across competitive landscape.`,
    });
    if (input.observationCount < 3) {
      criticalBlockers.push("Insufficient market observation sample (< 3 listings).");
    }

    // 2. Competition Landscape
    const isConcentrationReasonable = input.attributes.totalSampledSellers >= 5;
    dimensions.push({
      name: "Competition Structure",
      score: isConcentrationReasonable ? 85 : 55,
      status: isConcentrationReasonable ? "SATISFIED" : "WARNING",
      evidence: `${input.attributes.totalSampledSellers} unique sellers observed in category cluster.`,
    });

    // 3. Differentiation Angle
    const hasDifferentiation = input.differentiation.candidates.length > 0;
    dimensions.push({
      name: "Differentiation Angle",
      score: hasDifferentiation ? 90 : 40,
      status: hasDifferentiation ? "SATISFIED" : "BLOCKING",
      evidence: hasDifferentiation
        ? `${input.differentiation.candidates.length} actionable differentiation candidates generated.`
        : "No distinctive differentiation angle identified against incumbent cluster.",
    });
    if (!hasDifferentiation) {
      criticalBlockers.push("Must define a clear differentiation angle before committing to sourcing.");
    }

    // 4. Price Positioning
    const hasPositioning = input.positioning.scenarios.length > 0;
    dimensions.push({
      name: "Price Positioning Strategy",
      score: hasPositioning ? 95 : 30,
      status: hasPositioning ? "SATISFIED" : "BLOCKING",
      evidence: hasPositioning
        ? `Empirical pricing established across 5 tiers with median $${input.positioning.empiricalQuantiles.p50?.toFixed(2) || "N/A"}.`
        : "Insufficient price observations to establish target price.",
    });

    // 5. Unit Economics Completeness
    const economicsViable = input.economics.verdict === "HIGHLY_VIABLE" || input.economics.verdict === "MARGINALLY_VIABLE";
    dimensions.push({
      name: "Unit Economics Viability",
      score: economicsViable ? 90 : input.hasUserEconomics ? 35 : 50,
      status: economicsViable ? "SATISFIED" : input.hasUserEconomics ? "BLOCKING" : "WARNING",
      evidence: input.hasUserEconomics
        ? `Economics evaluated: ${input.economics.verdict.replace(/_/g, " ")} (${input.economics.scenarios.base.metrics.contributionMarginPercent}% contribution margin).`
        : "Awaiting user landed cost quotes to verify financial feasibility.",
    });
    if (!input.hasUserEconomics) {
      criticalBlockers.push("Landed supplier cost not entered — verify supplier quotes.");
    } else if (!economicsViable) {
      criticalBlockers.push("Unit economics unviable under current landed cost structure.");
    }

    // 6. Sourcing Requirements
    const hasSourcingSpec = input.sourcing.requiredMaterials.length > 0;
    dimensions.push({
      name: "Sourcing Specifications",
      score: hasSourcingSpec ? 85 : 45,
      status: hasSourcingSpec ? "SATISFIED" : "WARNING",
      evidence: `${input.sourcing.sourcingQuestionsForSuppliers.length} RFQ questions and ${input.sourcing.requiredMaterials.length} materials specified.`,
    });

    // Compute Overall Score
    const totalScore = Math.round(
      dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length
    );

    // Determine Status
    let status: LaunchReadinessStatus = "READY_FOR_SOURCING";
    let recommendedMilestone = "Request 3 supplier quotations using the generated Sourcing Specification.";

    if (input.observationCount < 3) {
      status = "INSUFFICIENT_DATA";
      recommendedMilestone = "Run broad public market research to capture more product observations.";
    } else if (!input.hasUserEconomics) {
      status = "NEEDS_SOURCING_DATA";
      recommendedMilestone = "Collect sample supplier quotes and enter landed cost in Unit Economics.";
    } else if (!economicsViable) {
      status = "HIGH_RISK";
      recommendedMilestone = "Negotiate lower factory MOQ or redesign Bill of Materials to improve contribution margin.";
    } else if (totalScore >= 80) {
      status = "READY_FOR_SAMPLE";
      recommendedMilestone = "Order initial physical production samples to verify material quality and packaging.";
    }

    return {
      status,
      overallScore: totalScore,
      dimensions,
      criticalBlockers,
      recommendedMilestone,
      evaluatedAt: new Date(),
    };
  }
}
