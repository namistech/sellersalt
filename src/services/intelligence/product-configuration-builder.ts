/**
 * SellerSalt — Product Configuration Builder
 * 
 * Transforms observed market attributes and differentiation candidates into
 * viable product configurations, strictly distinguishing OBSERVED COMBINATIONS
 * from DERIVED PRODUCT CONCEPTS.
 */

import type {
  ProductConfiguration,
  ProductAttributeIntelligenceSummary,
  DifferentiationCandidate,
  MarketPositioningAnalysis,
} from "@/marketplaces/core/opportunity-workspace-types";

export class ProductConfigurationBuilder {
  /**
   * Constructs a structured product configuration from observed and derived market intelligence.
   */
  public static buildConfiguration(
    baseTitle: string,
    attributes: ProductAttributeIntelligenceSummary,
    differentiation: DifferentiationCandidate | null,
    positioning: MarketPositioningAnalysis
  ): ProductConfiguration {
    const observedCombinations = attributes.dominantAttributes.slice(0, 4).map((attr) => ({
      type: attr.type,
      value: attr.value,
      prevalencePercent: attr.listingPrevalencePercent,
    }));

    const derivedConceptAngles: Array<{
      type: any;
      value: string;
      rationale: string;
    }> = [];

    if (differentiation) {
      derivedConceptAngles.push({
        type: "FEATURE",
        value: differentiation.title,
        rationale: differentiation.competitiveAdvantage,
      });
    }

    const targetScenario = positioning.scenarios.find((s) => s.tier === positioning.recommendedScenario) ||
      positioning.scenarios[0];

    const targetPrice = targetScenario?.candidateTargetPrice || null;

    const materialsRequired = attributes.dominantAttributes
      .filter((a) => a.type === "MATERIAL")
      .map((a) => a.value);

    if (materialsRequired.length === 0) {
      materialsRequired.push("Observed market baseline material");
    }

    const bundleContents = [
      `Primary ${baseTitle}`,
      "Protective eco-friendly packaging insert",
      "Product care instruction card",
    ];

    if (differentiation?.differentiationAngle.includes("BUNDLE")) {
      bundleContents.push("Matching accessory / complementary companion piece");
    }

    const finishSpecification = attributes.dominantAttributes.find((a) => a.type === "FINISH")?.value ||
      "Standard commercial finish";

    const packagingRequirement =
      targetScenario?.tier === "UPPER_MID" || targetScenario?.tier === "PREMIUM"
        ? "Custom rigid unboxing gift box with branded tissue wrap"
        : "Standard mailer box with padded interior";

    const unknownInputs = [
      "Exact factory tooling / mold setup fee for custom dimensions.",
      "Landed per-unit manufacturing cost at supplier MOQ tiers (100 / 500 / 1000 pcs).",
      "Actual packaged gross weight for carrier rate validation.",
    ];

    return {
      id: `config_${Date.now()}`,
      name: `${baseTitle} — Differentiated Launch Edition`,
      targetPositioning: positioning.recommendedScenario === "INSUFFICIENT_DATA" ? "MID_MARKET" : positioning.recommendedScenario,
      targetPrice,
      observedCombinations,
      derivedConceptAngles,
      materialsRequired,
      bundleContents,
      finishSpecification,
      packagingRequirement,
      differentiationRationale: differentiation?.description || "Optimized baseline market configuration.",
      unknownInputs,
      confidence: positioning.empiricalQuantiles.sampleSize >= 10 ? 85 : 65,
    };
  }
}
