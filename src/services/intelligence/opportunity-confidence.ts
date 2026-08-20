/**
 * SellerSalt Opportunity Confidence Evaluation Engine
 * 
 * Computes calibrated, transparent confidence metrics for autonomous opportunity items.
 * 
 * ZERO-FABRICATION CONTRACT:
 * - Missing marketplace signals are explicitly surfaced in unknownSignals.
 * - Confidence is directly derived from empirical observation properties.
 */

import type {
  OpportunityConfidenceReport,
  OpportunitySignalTaxonomy,
} from "@/marketplaces/core/autonomous-discovery-types";

export class OpportunityConfidenceEngine {
  /**
   * Evaluates calibrated confidence for an opportunity item.
   */
  public static evaluate(
    signals: OpportunitySignalTaxonomy,
    options: {
      observationCount?: number;
      isLive?: boolean;
      daysObserved?: number;
      marketplaceCount?: number;
    } = {}
  ): OpportunityConfidenceReport {
    const {
      observationCount = 1,
      isLive = true,
      daysObserved = 0,
      marketplaceCount = 1,
    } = options;

    const confidenceDrivers: string[] = [];
    const unknownSignals: string[] = [];
    const limitations: string[] = [];

    let score = 30; // Baseline base score

    // 1. Observation Sample
    if (observationCount >= 15) {
      score += 25;
      confidenceDrivers.push(`Large observation sample (n = ${observationCount}).`);
    } else if (observationCount >= 5) {
      score += 15;
      confidenceDrivers.push(`Moderate observation sample (n = ${observationCount}).`);
    } else {
      score += 5;
      limitations.push("Limited listing sample observed.");
    }

    // 2. Source Diversity
    if (marketplaceCount >= 3) {
      score += 20;
      confidenceDrivers.push(`Multi-marketplace corroboration across ${marketplaceCount} platforms.`);
    } else if (marketplaceCount === 2) {
      score += 12;
      confidenceDrivers.push("Corroborated across 2 marketplaces.");
    } else {
      limitations.push("Single marketplace observation.");
    }

    // 3. Signal Completeness
    if (signals.demand.observedReviewCount.isAvailable) {
      score += 5;
    } else {
      unknownSignals.push("Listing review counts unobserved.");
    }

    if (signals.competition.sellerConcentrationHHI.isAvailable) {
      score += 5;
      confidenceDrivers.push("Empirical seller concentration HHI calculated.");
    } else {
      unknownSignals.push("Seller concentration HHI uncomputed.");
    }

    if (signals.market.observedPriceMedian.isAvailable) {
      score += 5;
    } else {
      unknownSignals.push("Median price unobserved.");
    }

    // 4. Longitudinal Depth
    if (daysObserved >= 14) {
      score += 10;
      confidenceDrivers.push(`Longitudinal observation depth (${daysObserved} days).`);
    } else if (daysObserved >= 3) {
      score += 5;
    } else {
      unknownSignals.push("Historical trajectory delta requires multi-snapshot depth.");
    }

    // Always disclose non-observable private metrics
    unknownSignals.push("Exact monthly search query volume is strictly unavailable without licensed volume feeds.");
    unknownSignals.push("Private store revenues and conversion rates are unobserved.");

    const finalScore = Math.min(100, Math.max(10, score));

    let tier: OpportunityConfidenceReport["confidenceTier"] = "LOW";
    if (finalScore >= 80) tier = "VERY_HIGH";
    else if (finalScore >= 65) tier = "HIGH";
    else if (finalScore >= 45) tier = "MODERATE";
    else if (finalScore >= 25) tier = "LOW";
    else tier = "INSUFFICIENT";

    return {
      confidenceScore: finalScore,
      confidenceTier: tier,
      confidenceDrivers,
      unknownSignals,
      limitations,
    };
  }
}
