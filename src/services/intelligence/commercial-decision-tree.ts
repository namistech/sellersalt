/**
 * SellerSalt — Commercial Decision Tree
 * 
 * Deterministic commercial evaluation engine producing clear actionable verdicts:
 * PURSUE, INVESTIGATE, TEST, WAIT, REJECT, or INSUFFICIENT_DATA.
 * Zero-Fabrication: Transparently states unknowns and risks.
 */

import type {
  CommercialDecision,
  CommercialDecisionVerdict,
  LaunchReadinessAssessment,
  UnitEconomicsAnalysis,
  DifferentiationBuilderResult,
  MarketPositioningAnalysis,
} from "@/marketplaces/core/opportunity-workspace-types";

export class CommercialDecisionTree {
  /**
   * Evaluates the candidate against deterministic commercial criteria.
   */
  public static evaluateDecision(input: {
    readiness: LaunchReadinessAssessment;
    economics: UnitEconomicsAnalysis;
    differentiation: DifferentiationBuilderResult;
    positioning: MarketPositioningAnalysis;
    compositeScore: number;
    observationCount: number;
    hasUserEconomics: boolean;
  }): CommercialDecision {
    const positiveEvidence: string[] = [];
    const negativeEvidence: string[] = [];
    const unknownSignals: string[] = [];
    const keyRisks: string[] = [];

    // 1. Observation Sample
    if (input.observationCount >= 10) {
      positiveEvidence.push(`Strong multi-marketplace sample: ${input.observationCount} listings observed.`);
    } else if (input.observationCount >= 3) {
      positiveEvidence.push(`Baseline market observations available (${input.observationCount} listings).`);
    } else {
      negativeEvidence.push("Sparse observation sample (< 3 listings observed).");
    }

    // 2. Differentiation
    if (input.differentiation.candidates.length > 0) {
      positiveEvidence.push(
        `Actionable differentiation angles identified (${input.differentiation.candidates[0].title}).`
      );
    } else {
      negativeEvidence.push("No clear differentiation identified against commodity cluster.");
      keyRisks.push("Commodity price erosion risk against entrenched sellers.");
    }

    // 3. Price Positioning
    if (input.positioning.empiricalQuantiles.p50) {
      positiveEvidence.push(
        `Empirical market median price established at $${input.positioning.empiricalQuantiles.p50.toFixed(2)}.`
      );
    }

    // 4. Unit Economics
    if (input.hasUserEconomics) {
      if (input.economics.verdict === "HIGHLY_VIABLE") {
        positiveEvidence.push(
          `Robust unit economics: ${input.economics.scenarios.base.metrics.contributionMarginPercent}% contribution margin ($${input.economics.scenarios.base.metrics.contributionProfit.toFixed(2)}/unit).`
        );
      } else if (input.economics.verdict === "MARGINALLY_VIABLE") {
        positiveEvidence.push(
          `Acceptable base contribution margin of ${input.economics.scenarios.base.metrics.contributionMarginPercent}%.`
        );
        keyRisks.push("Margin compression risk if ad acquisition costs or shipping fees rise.");
      } else {
        negativeEvidence.push("Unviable unit economics under entered supplier cost and fee structure.");
        keyRisks.push("Financial loss risk: Negative contribution margin per sale.");
      }
    } else {
      unknownSignals.push("Supplier landed manufacturing cost (EXW / DDP) unverified.");
      unknownSignals.push("Factory MOQ and initial cash outlay requirements unverified.");
    }

    // Always disclose fundamental platform unknowns
    unknownSignals.push("Exact monthly consumer search volume is strictly unobservable without private platform feeds.");
    unknownSignals.push("Private store revenues and exact conversion rates are unobservable.");

    // Decision Logic
    let verdict: CommercialDecisionVerdict = "INVESTIGATE";
    let why = "Opportunity shows promising market evidence but requires supplier cost verification.";

    if (input.observationCount < 3) {
      verdict = "INSUFFICIENT_DATA";
      why = "Insufficient market observations to reach a reliable commercial verdict.";
    } else if (input.hasUserEconomics && input.economics.verdict === "UNVIABLE") {
      verdict = "REJECT";
      why = "Unit economics are unviable based on entered supplier pricing and target sale price.";
    } else if (
      input.hasUserEconomics &&
      input.economics.verdict === "HIGHLY_VIABLE" &&
      input.compositeScore >= 70 &&
      input.differentiation.candidates.length > 0
    ) {
      verdict = "PURSUE";
      why = "Strong opportunity score, viable contribution margins, and clear differentiation gap observed.";
    } else if (input.hasUserEconomics && input.economics.verdict === "MARGINALLY_VIABLE") {
      verdict = "TEST";
      why = "Viable for small-batch test order (100–300 units) to validate actual ad conversion and refund rates.";
    } else {
      verdict = "INVESTIGATE";
      why = "High market potential. Obtain 3 supplier quotations and verify landed costs before committing inventory.";
    }

    const confidence = input.observationCount >= 10 ? 85 : input.observationCount >= 3 ? 70 : 40;

    return {
      verdict,
      why,
      positiveEvidence,
      negativeEvidence,
      unknownSignals,
      keyRisks,
      confidence,
      evaluatedAt: new Date(),
    };
  }
}
