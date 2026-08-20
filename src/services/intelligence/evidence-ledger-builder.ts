/**
 * SellerSalt — Evidence Ledger Builder
 * 
 * Compiles a comprehensive, traceable Evidence Ledger for an opportunity workspace.
 * Ensures every conclusion, score, and recommendation is anchored in observable evidence.
 */

import type { NormalizedProduct } from "@/marketplaces/core/types";
import type {
  EvidenceLedger,
  EvidenceRecord,
  ProductAttributeIntelligenceSummary,
  MarketPositioningAnalysis,
  DifferentiationBuilderResult,
  UnitEconomicsAnalysis,
} from "@/marketplaces/core/opportunity-workspace-types";

export class EvidenceLedgerBuilder {
  /**
   * Constructs the Evidence Ledger from workspace components and observed products.
   */
  public static buildLedger(input: {
    products: NormalizedProduct[];
    attributes: ProductAttributeIntelligenceSummary;
    positioning: MarketPositioningAnalysis;
    differentiation: DifferentiationBuilderResult;
    economics?: UnitEconomicsAnalysis;
  }): EvidenceLedger {
    const records: EvidenceRecord[] = [];
    const now = new Date();

    // 1. Product Observations
    for (const p of input.products.slice(0, 10)) {
      records.push({
        id: `ev_prod_${p.externalId}`,
        category: "PRODUCT_OBSERVATION",
        title: p.title,
        statement: `Observed product on ${p.marketplace} listed at $${p.price?.toFixed(2) || "N/A"} (${p.reviewCount || 0} reviews).`,
        source: p.source || "PUBLIC_WEB",
        marketplace: p.marketplace,
        entityId: `prod:${p.marketplace}:${p.externalId}`,
        exactMetric: {
          label: "Price",
          value: p.price,
          unit: p.currency || "USD",
        },
        impact: "POSITIVE",
        provenance: "ACTUAL_DATA",
        confidence: 90,
        freshness: "LIVE",
        observedAt: p.capturedAt || now,
      });
    }

    // 2. Attribute Observations
    for (const attr of input.attributes.dominantAttributes.slice(0, 5)) {
      records.push({
        id: `ev_attr_${attr.type}_${attr.value.replace(/\s+/g, "_")}`,
        category: "PRODUCT_OBSERVATION",
        title: `Dominant Attribute: ${attr.value}`,
        statement: `Observed in ${attr.listingPrevalencePercent}% of sampled listings across ${attr.observedSellerCount} sellers.`,
        source: "PUBLIC_WEB",
        exactMetric: {
          label: "Listing Prevalence",
          value: `${attr.listingPrevalencePercent}%`,
        },
        impact: "POSITIVE",
        provenance: "ACTUAL_DATA",
        confidence: 85,
        freshness: "LIVE",
        observedAt: now,
      });
    }

    // 3. Price Quantile Observations
    if (input.positioning.empiricalQuantiles.p50 !== null) {
      records.push({
        id: "ev_price_median",
        category: "PRICE_OBSERVATION",
        title: "Empirical Market Median Price",
        statement: `Calculated from ${input.positioning.empiricalQuantiles.sampleSize} valid price observations across the competitive cluster.`,
        source: "HISTORICAL_MEMORY",
        exactMetric: {
          label: "P50 Median",
          value: input.positioning.empiricalQuantiles.p50,
          unit: "USD",
        },
        derivationMethod: "Empirical Quantile Distribution (P50)",
        impact: "POSITIVE",
        provenance: "ACTUAL_DATA",
        confidence: 95,
        freshness: "LIVE",
        observedAt: now,
      });
    }

    // 4. Differentiation Signals
    for (const diff of input.differentiation.candidates) {
      records.push({
        id: `ev_diff_${diff.id}`,
        category: "DERIVED_SIGNAL",
        title: `Differentiation Opportunity: ${diff.title}`,
        statement: diff.description,
        source: "SELLERSALT_INTELLIGENCE",
        derivationMethod: "Attribute Gap & Market Concentration Analysis",
        impact: "POSITIVE",
        provenance: "ESTIMATED",
        confidence: diff.confidence,
        freshness: "LIVE",
        observedAt: now,
      });
    }

    // 5. Unknown Signals Disclosures
    records.push({
      id: "ev_unknown_search_vol",
      category: "UNKNOWN_SIGNAL",
      title: "Monthly Consumer Search Volume",
      statement: "Exact search volume is unobservable without private platform query feeds. Market presence corroborated via listing prevalence.",
      source: "UNAVAILABLE",
      impact: "NEUTRAL",
      provenance: "UNAVAILABLE",
      confidence: 0,
      freshness: "UNKNOWN",
      observedAt: now,
    });

    records.push({
      id: "ev_unknown_supplier_cost",
      category: "UNKNOWN_SIGNAL",
      title: "Supplier Manufacturing Landed Cost",
      statement: "Actual supplier quote unverified until user enters RFQ quotes into Unit Economics.",
      source: "UNAVAILABLE",
      impact: "HIGH_RISK",
      provenance: "UNAVAILABLE",
      confidence: 0,
      freshness: "UNKNOWN",
      observedAt: now,
    });

    const totalObservedRecords = records.filter((r) => r.category.includes("OBSERVATION")).length;
    const totalDerivedRecords = records.filter((r) => r.category === "DERIVED_SIGNAL").length;
    const totalUserInputRecords = records.filter((r) => r.category === "USER_INPUT").length;
    const totalUnknownRecords = records.filter((r) => r.category === "UNKNOWN_SIGNAL").length;

    const overallConfidence =
      input.products.length >= 10 ? 85 : input.products.length >= 3 ? 70 : 45;

    return {
      records,
      totalObservedRecords,
      totalDerivedRecords,
      totalUserInputRecords,
      totalUnknownRecords,
      overallConfidence,
      generatedAt: now,
    };
  }
}
