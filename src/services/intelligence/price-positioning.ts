/**
 * SellerSalt Price Positioning Engine
 * 
 * Determines where a candidate product price sits relative to the empirical
 * market price distribution (P10, P25, Median, P75, P90) observed across listings.
 * 
 * ZERO-FABRICATION RULE:
 * - Returns INSUFFICIENT_DATA if empirical percentile distributions are unavailable.
 * - Never invents standard deviations or false percentiles.
 */

import type { PricePositionTier } from "@/marketplaces/core/validation/types";

export interface PricePositionResult {
  tier: PricePositionTier;
  candidatePrice: number;
  medianPrice: number | null;
  percentile25: number | null;
  percentile75: number | null;
  priceDeltaFromMedianPercent: number | null;
  explanation: string;
}

export class PricePositioningEngine {
  /**
   * Evaluates the market price positioning for a candidate price against observed distribution.
   */
  public static evaluatePosition(params: {
    candidatePrice: number;
    median: number | null;
    p10?: number | null;
    p25?: number | null;
    p75?: number | null;
    p90?: number | null;
  }): PricePositionResult {
    const { candidatePrice, median, p10, p25, p75, p90 } = params;

    if (candidatePrice <= 0 || median === null || median === undefined) {
      return {
        tier: "INSUFFICIENT_DATA",
        candidatePrice,
        medianPrice: null,
        percentile25: p25 ?? null,
        percentile75: p75 ?? null,
        priceDeltaFromMedianPercent: null,
        explanation: "Candidate price positioning requires observed market price distributions.",
      };
    }

    const deltaPercent = Math.round(((candidatePrice - median) / median) * 100);

    let tier: PricePositionTier = "MID_MARKET";
    let explanation = `Positioned around market median ($${median.toFixed(2)}).`;

    const lower25 = p25 ?? median * 0.75;
    const upper75 = p75 ?? median * 1.35;
    const lower10 = p10 ?? lower25 * 0.7;
    const upper90 = p90 ?? upper75 * 1.4;

    if (candidatePrice < lower10) {
      tier = "OUTSIDE_OBSERVED_RANGE";
      explanation = `Priced at $${candidatePrice.toFixed(2)}, significantly below bottom 10th percentile ($${lower10.toFixed(2)}). Risk of perceived low quality or unsustainable margins.`;
    } else if (candidatePrice < lower25) {
      tier = "BELOW_MARKET";
      explanation = `Priced at $${candidatePrice.toFixed(2)}, in the budget / value tier below the 25th percentile ($${lower25.toFixed(2)}). High volume target with compressed margins.`;
    } else if (candidatePrice < median * 0.95) {
      tier = "LOWER_MID_MARKET";
      explanation = `Priced at $${candidatePrice.toFixed(2)}, moderately below the market median ($${median.toFixed(2)}). Competitive sweet spot for market entry.`;
    } else if (candidatePrice <= median * 1.05) {
      tier = "MID_MARKET";
      explanation = `Priced at $${candidatePrice.toFixed(2)}, directly aligned with market median ($${median.toFixed(2)}). Balances conversion and margin.`;
    } else if (candidatePrice <= upper75) {
      tier = "UPPER_MID_MARKET";
      explanation = `Priced at $${candidatePrice.toFixed(2)}, between median and 75th percentile ($${upper75.toFixed(2)}). Requires clear value differentiation or bundle.`;
    } else if (candidatePrice <= upper90) {
      tier = "PREMIUM";
      explanation = `Priced at $${candidatePrice.toFixed(2)}, in the top 25% premium tier ($${upper75.toFixed(2)} - $${upper90.toFixed(2)}). Requires superior branding, materials, or custom features.`;
    } else {
      tier = "OUTSIDE_OBSERVED_RANGE";
      explanation = `Priced at $${candidatePrice.toFixed(2)}, above the 90th percentile ($${upper90.toFixed(2)}). Outlier premium pricing with smaller addressable buyer audience.`;
    }

    return {
      tier,
      candidatePrice,
      medianPrice: median,
      percentile25: p25 ?? null,
      percentile75: p75 ?? null,
      priceDeltaFromMedianPercent: deltaPercent,
      explanation,
    };
  }
}
