/**
 * SellerSalt Deterministic Intelligence Confidence Engine
 * 
 * Computes calibrated, explainable confidence metrics for graph entities,
 * market snapshots, and opportunity ratings based on empirical observation parameters.
 * 
 * ZERO-FABRICATION RULE:
 * - Confidence is derived deterministically from sample size, source diversity,
 *   freshness, field completeness, and longitudinal depth.
 * - Missing signals are explicitly exposed in unknownSignals.
 */

export interface GraphConfidenceReport {
  confidenceScore: number; // 0-100
  confidenceTier: "VERY_HIGH" | "HIGH" | "MODERATE" | "LOW" | "INSUFFICIENT";
  factors: {
    observationSampleScore: number; // 0-25
    sourceDiversityScore: number;   // 0-20
    freshnessScore: number;         // 0-20
    fieldCompletenessScore: number; // 0-20
    longitudinalDepthScore: number; // 0-15
  };
  supportingEvidence: string[];
  unknownSignals: string[];
  dataLimitations: string[];
  evaluatedAt: Date;
}

export class GraphConfidenceEngine {
  /**
   * Computes a calibrated confidence score for a market intelligence record.
   */
  public static evaluateConfidence(params: {
    observationCount: number;
    sourceCount?: number;
    daysObserved?: number;
    isLive?: boolean;
    hasPrice?: boolean;
    hasRating?: boolean;
    hasReviews?: boolean;
    hasSeller?: boolean;
    hasCategory?: boolean;
    hasCrossMarketplaceMatch?: boolean;
  }): GraphConfidenceReport {
    const {
      observationCount,
      sourceCount = 1,
      daysObserved = 0,
      isLive = true,
      hasPrice = true,
      hasRating = false,
      hasReviews = false,
      hasSeller = false,
      hasCategory = false,
      hasCrossMarketplaceMatch = false,
    } = params;

    const supportingEvidence: string[] = [];
    const unknownSignals: string[] = [];
    const dataLimitations: string[] = [];

    // 1. Observation Sample Score (0-25)
    let sampleScore = 0;
    if (observationCount >= 20) {
      sampleScore = 25;
      supportingEvidence.push(`Robust observation sample (n = ${observationCount}).`);
    } else if (observationCount >= 8) {
      sampleScore = 18;
      supportingEvidence.push(`Moderate observation sample (n = ${observationCount}).`);
    } else if (observationCount >= 3) {
      sampleScore = 10;
    } else if (observationCount >= 1) {
      sampleScore = 5;
    } else {
      sampleScore = 0;
      dataLimitations.push("Zero observation sample collected.");
    }

    // 2. Source Diversity Score (0-20)
    let sourceScore = 0;
    if (sourceCount >= 3 || hasCrossMarketplaceMatch) {
      sourceScore = 20;
      supportingEvidence.push(`Multi-marketplace corroboration across ${sourceCount} sources.`);
    } else if (sourceCount === 2) {
      sourceScore = 14;
      supportingEvidence.push(`Corroborated across 2 distinct acquisition sources.`);
    } else {
      sourceScore = 8;
      dataLimitations.push("Single-source marketplace observation.");
    }

    // 3. Freshness Score (0-20)
    let freshnessScore = 0;
    if (isLive) {
      freshnessScore = 20;
      supportingEvidence.push("Live, current public web observation.");
    } else {
      freshnessScore = 10;
      dataLimitations.push("Historical observation record.");
    }

    // 4. Field Completeness Score (0-20)
    let fieldScore = 0;
    if (hasPrice) fieldScore += 5;
    else unknownSignals.push("Observed price is unavailable.");

    if (hasRating) fieldScore += 4;
    else unknownSignals.push("Rating metrics are unobserved.");

    if (hasReviews) fieldScore += 4;
    else unknownSignals.push("Review counts are unobserved.");

    if (hasSeller) fieldScore += 4;
    else unknownSignals.push("Seller identity is unobserved.");

    if (hasCategory) fieldScore += 3;
    else unknownSignals.push("Taxonomy category path is unobserved.");

    // 5. Longitudinal Depth Score (0-15)
    let depthScore = 0;
    if (daysObserved >= 14) {
      depthScore = 15;
      supportingEvidence.push(`Multi-week longitudinal history (${daysObserved} days).`);
    } else if (daysObserved >= 3) {
      depthScore = 10;
      supportingEvidence.push(`Multi-day longitudinal history (${daysObserved} days).`);
    } else {
      depthScore = 2;
      unknownSignals.push("Historical longitudinal delta requires multi-snapshot depth.");
    }

    unknownSignals.push("Exact monthly search query volume is strictly unavailable without licensed feeds.");
    unknownSignals.push("Private store unit revenues are unobserved.");

    const totalScore = Math.min(100, Math.max(10, sampleScore + sourceScore + freshnessScore + fieldScore + depthScore));

    let tier: GraphConfidenceReport["confidenceTier"] = "LOW";
    if (totalScore >= 80) tier = "VERY_HIGH";
    else if (totalScore >= 65) tier = "HIGH";
    else if (totalScore >= 45) tier = "MODERATE";
    else if (totalScore >= 25) tier = "LOW";
    else tier = "INSUFFICIENT";

    return {
      confidenceScore: totalScore,
      confidenceTier: tier,
      factors: {
        observationSampleScore: sampleScore,
        sourceDiversityScore: sourceScore,
        freshnessScore,
        fieldCompletenessScore: fieldScore,
        longitudinalDepthScore: depthScore,
      },
      supportingEvidence,
      unknownSignals,
      dataLimitations,
      evaluatedAt: new Date(),
    };
  }
}
