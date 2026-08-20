/**
 * SellerSalt — Sourcing Requirements Intelligence Engine
 * 
 * Generates structured, evidence-grounded sourcing specifications and RFQ checklists.
 * Zero-Fabrication Contract: Never invents supplier names, fake factory costs, or imaginary MOQs.
 */

import type {
  SourcingSpecification,
  ProductConfiguration,
  ProductAttributeIntelligenceSummary,
} from "@/marketplaces/core/opportunity-workspace-types";

export class SourcingRequirementsEngine {
  /**
   * Builds a sourcing requirements specification from product configuration and observed attributes.
   */
  public static generateSpecification(
    configuration: ProductConfiguration,
    attributes: ProductAttributeIntelligenceSummary,
    userInputs?: { landCost?: number; moq?: number; leadTimeDays?: number }
  ): SourcingSpecification {
    const observedMarketRequirements: string[] = [];
    const inferredProductRequirements: string[] = [];
    const userSuppliedRequirements: string[] = [];

    // Observed requirements
    for (const dom of attributes.dominantAttributes.slice(0, 4)) {
      observedMarketRequirements.push(
        `${dom.type}: ${dom.value} (prevalent in ${dom.listingPrevalencePercent}% of sampled listings)`
      );
    }

    // Inferred requirements
    inferredProductRequirements.push(
      `Finish: ${configuration.finishSpecification}`,
      `Packaging: ${configuration.packagingRequirement}`,
      `Bundle Configuration: ${configuration.bundleContents.join(", ")}`
    );

    // Required Materials
    const requiredMaterials = configuration.materialsRequired.map((mat) => ({
      name: mat,
      status: "OBSERVED" as const,
    }));

    const sourcingQuestionsForSuppliers = [
      "What is your unit pricing breakdown at 100, 300, 500, and 1,000 unit tiers?",
      "What is the sample production cost and lead time (including air express to our address)?",
      "Do you provide custom logo engraving/stamping and customized box printing in-house?",
      "What safety, material, or environmental certifications (e.g., FDA food-contact, REACH, RoHS, FSC) does this factory hold for this material?",
      "What are the individual packaged dimensions (L x W x H in cm) and gross weight (in grams)?",
      "What is your standard production lead time from PO deposit to freight handover?",
    ];

    const requiredSupplierDataPoints = [
      "Landed manufacturing cost per unit (EXW / FOB / DDP)",
      "Standard factory MOQ (Minimum Order Quantity)",
      "Sample lead time and full production lead time",
      "Packaged carton dimensions and Master Carton unit capacity",
      "Defect / return replacement policy",
    ];

    const unknownSourcingInputs = [
      "Exact factory landed unit cost at your target test volume.",
      "Inbound freight shipping quote (Air express vs. Ocean freight).",
      "Supplier quality consistency across repeat production runs.",
    ];

    return {
      id: `sourcing_${Date.now()}`,
      baseProductName: configuration.name,
      observedMarketRequirements,
      inferredProductRequirements,
      userSuppliedRequirements,
      requiredMaterials,
      requiredComponents: configuration.bundleContents,
      dimensionsAndWeight: {
        dimensionsSummary: "Standard parcel envelope / shoe-box form factor (to be verified with sample)",
        targetWeightGrams: null,
      },
      finishRequirements: [configuration.finishSpecification],
      packagingRequirements: [configuration.packagingRequirement],
      qualityAndCompliance: {
        safetyStandards: ["Material safety data sheet (MSDS) if chemical/cosmetic", "Consumer Product Safety standards"],
        certificationsToVerify: ["Factory ISO 9001 / BSCI audit report", "Material origin certificate"],
        testingRequirements: ["Pre-shipment drop test (1.2m)", "Moisture barrier seal inspection"],
      },
      likelyManufacturingProcess: "Standard CNC / Injection Molding / Ceramic Kiln / Cut & Sew assembly (dependent on material)",
      sourcingQuestionsForSuppliers,
      requiredSupplierDataPoints,
      unknownSourcingInputs,
      userLandCostInput: userInputs?.landCost ?? null,
      userMoqInput: userInputs?.moq ?? null,
      userLeadTimeDaysInput: userInputs?.leadTimeDays ?? null,
    };
  }
}
