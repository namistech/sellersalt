/**
 * SellerSalt — Market Positioning Engine
 * 
 * Analyzes empirical price distributions (P10, P25, P50, P75, P90) and builds
 * strategic price positioning scenarios (Value, Lower-Mid, Mid-Market, Upper-Mid, Premium).
 * Zero-Fabrication: Never invents numbers if price samples are insufficient.
 */

import type { NormalizedProduct } from "@/marketplaces/core/types";
import type {
  MarketPositioningAnalysis,
  PricePositioningScenario,
  MarketPriceTier,
} from "@/marketplaces/core/opportunity-workspace-types";

export class MarketPositioningEngine {
  /**
   * Evaluates empirical price distributions and constructs pricing scenarios.
   */
  public static analyzePositioning(products: NormalizedProduct[]): MarketPositioningAnalysis {
    const validPrices = products
      .map((p) => p.price)
      .filter((p): p is number => typeof p === "number" && !isNaN(p) && p > 0)
      .sort((a, b) => a - b);

    const n = validPrices.length;

    if (n < 3) {
      return {
        empiricalQuantiles: {
          p10: null,
          p25: null,
          p50: null,
          p75: null,
          p90: null,
          min: null,
          max: null,
          sampleSize: n,
        },
        scenarios: [],
        recommendedScenario: "INSUFFICIENT_DATA",
        recommendationExplanation:
          "Insufficient observed listing prices to construct empirical pricing scenarios. At least 3 valid price observations are required.",
      };
    }

    const getQuantile = (q: number) => {
      const pos = (n - 1) * q;
      const base = Math.floor(pos);
      const rest = pos - base;
      if (validPrices[base + 1] !== undefined) {
        return Math.round((validPrices[base] + rest * (validPrices[base + 1] - validPrices[base])) * 100) / 100;
      } else {
        return Math.round(validPrices[base] * 100) / 100;
      }
    };

    const min = validPrices[0];
    const max = validPrices[n - 1];
    const p10 = getQuantile(0.1);
    const p25 = getQuantile(0.25);
    const p50 = getQuantile(0.5);
    const p75 = getQuantile(0.75);
    const p90 = getQuantile(0.9);

    const scenarios: PricePositioningScenario[] = [
      {
        tier: "VALUE",
        label: "Value / Budget Leader",
        priceRange: { min, max: p25 },
        candidateTargetPrice: Math.round(((min + p25) / 2) * 100) / 100,
        percentileRange: "0th - 25th percentile",
        competitorListingCount: validPrices.filter((p) => p <= p25).length,
        attributeContext: ["Standard baseline materials", "Single-piece packaging", "High volume commodity"],
        strategicRationale:
          "Lowest price barrier for rapid initial velocity, but requires ultra-lean supplier landed cost and higher unit volume.",
        confidence: n >= 15 ? 85 : 65,
        evidenceDepth: n >= 15 ? "HIGH" : "MODERATE",
      },
      {
        tier: "LOWER_MID",
        label: "Competitive Lower-Mid",
        priceRange: { min: p25, max: p50 },
        candidateTargetPrice: Math.round(((p25 + p50) / 2) * 100) / 100,
        percentileRange: "25th - 50th percentile",
        competitorListingCount: validPrices.filter((p) => p > p25 && p <= p50).length,
        attributeContext: ["Popular market baseline", "Direct incumbent alternatives"],
        strategicRationale:
          "Balances velocity with healthy gross margin; directly competes with median volume leaders.",
        confidence: n >= 15 ? 90 : 70,
        evidenceDepth: n >= 15 ? "HIGH" : "MODERATE",
      },
      {
        tier: "MID_MARKET",
        label: "Core Mid-Market Median",
        priceRange: { min: p25, max: p75 },
        candidateTargetPrice: p50,
        percentileRange: "50th percentile (Market Median)",
        competitorListingCount: validPrices.filter((p) => p >= p25 && p <= p75).length,
        attributeContext: ["Balanced quality features", "Standard branded packaging"],
        strategicRationale:
          "Captures the highest density of current customer transactions with predictable price tolerance.",
        confidence: 90,
        evidenceDepth: "HIGH",
      },
      {
        tier: "UPPER_MID",
        label: "Differentiated Upper-Mid",
        priceRange: { min: p50, max: p75 },
        candidateTargetPrice: Math.round(((p50 + p75) / 2) * 100) / 100,
        percentileRange: "50th - 75th percentile",
        competitorListingCount: validPrices.filter((p) => p > p50 && p <= p75).length,
        attributeContext: ["Upgraded finish/material", "Curated accessories / bundle", "Gift presentation"],
        strategicRationale:
          "Recommended sweet spot: Supports higher contribution margin and ad allowance with minor perceived upgrades.",
        confidence: n >= 15 ? 85 : 70,
        evidenceDepth: n >= 15 ? "HIGH" : "MODERATE",
      },
      {
        tier: "PREMIUM",
        label: "Premium Artisan / Luxury",
        priceRange: { min: p75, max },
        candidateTargetPrice: Math.round(((p75 + max) / 2) * 100) / 100,
        percentileRange: "75th - 100th percentile",
        competitorListingCount: validPrices.filter((p) => p > p75).length,
        attributeContext: ["Artisan / solid materials", "Deluxe bespoke packaging", "Custom engraving"],
        strategicRationale:
          "Maximum profit per order with lowest unit volume demands; requires premium photography and established brand trust.",
        confidence: n >= 15 ? 80 : 60,
        evidenceDepth: n >= 15 ? "HIGH" : "MODERATE",
      },
    ];

    const recommendedScenario: MarketPriceTier = "UPPER_MID";
    const recommendationExplanation = `Targeting UPPER_MID ($${((p50 + p75) / 2).toFixed(2)}) captures superior contribution margins above the crowded $${p50.toFixed(2)} median while avoiding luxury volume drops.`;

    return {
      empiricalQuantiles: {
        p10,
        p25,
        p50,
        p75,
        p90,
        min,
        max,
        sampleSize: n,
      },
      scenarios,
      recommendedScenario,
      recommendationExplanation,
    };
  }
}
