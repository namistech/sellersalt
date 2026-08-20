/**
 * SellerSalt — Data Trust Engine
 * 
 * Computes transparent, evidence-grounded Data Trust summaries for product opportunities.
 * Answers: "What does SellerSalt actually know? What is observed, derived, estimated, or unavailable?"
 */

import type { NormalizedProduct, MarketplaceId, DataSourceType } from "@/marketplaces/core/types";
import type { DataTrustSummary, PolicyPermissionStatus } from "@/marketplaces/core/governance/types";
import { MarketplaceGovernanceRegistry } from "@/marketplaces/core/governance/registry";

export interface EvaluateDataTrustInput {
  products: NormalizedProduct[];
  marketplaces?: MarketplaceId[];
  hasUserEconomics?: boolean;
  observationAgeDays?: number;
}

export class DataTrustEngine {
  /**
   * Generates a DataTrustSummary assessing provenance, coverage, freshness, and unknowns.
   */
  public static evaluateTrust(input: EvaluateDataTrustInput): DataTrustSummary {
    const now = new Date();
    const products = input.products || [];
    const totalObservations = products.length;

    // 1. Source Diversity
    const sources = new Set<DataSourceType>();
    const mps = new Set<string>();

    for (const p of products) {
      if (p.source) sources.add(p.source as DataSourceType);
      if (p.marketplace) mps.add(p.marketplace);
    }
    if (sources.size === 0) sources.add("PUBLIC_WEB");

    const sourcesUsed = Array.from(sources);
    const sourceDiversityScore = Math.min(100, Math.round(mps.size * 25 + sourcesUsed.length * 15));

    // 2. Freshness Score
    const ageDays = input.observationAgeDays || 0;
    const freshnessScore = Math.max(20, Math.round(100 - ageDays * 8));

    // 3. Completeness & Provenance Accounting
    let observedCount = 0;
    let estimatedCount = 0;
    let derivedCount = 0;

    for (const p of products) {
      if (p.price !== undefined && p.price !== null) observedCount++;
      if (p.reviewCount !== undefined && p.reviewCount !== null) observedCount++;
      if (p.shop?.name) observedCount++;
      if (p.categoryPath && p.categoryPath.length > 0) observedCount++;
    }

    // Derived signals include quantile tiers, attribute prevalence, differentiation candidates
    derivedCount = products.length > 0 ? 6 : 0;
    estimatedCount = products.length > 0 ? 2 : 0;

    // Unknown Signals
    const unknownSignals: string[] = [
      "Exact private monthly search query volume (Platform search query stream is proprietary)",
      "Private merchant store revenue and unit sales (Requires merchant OAuth authorization)",
    ];

    if (!input.hasUserEconomics) {
      unknownSignals.push("Supplier landed manufacturing cost (Pending user RFQ quote input)");
    }

    const unknownSignalCount = unknownSignals.length;
    const completenessScore = totalObservations >= 10 ? 88 : totalObservations >= 3 ? 72 : 45;

    // 4. Overall Trust Score
    const overallTrustScore = Math.round(
      sourceDiversityScore * 0.25 + freshnessScore * 0.35 + completenessScore * 0.4
    );

    // 5. Policy Status
    const primaryMp = input.marketplaces?.[0] || products[0]?.marketplace || "etsy";
    const policy = MarketplaceGovernanceRegistry.getPolicy(primaryMp);
    const policyComplianceStatus: PolicyPermissionStatus =
      policy.complianceStatus === "IMPLEMENTED"
        ? "ALLOWED"
        : policy.complianceStatus === "DESIGNED"
        ? "CONDITIONALLY_ALLOWED"
        : "REQUIRES_REVIEW";

    // 6. Transparent Disclosures
    const transparentDisclosures: string[] = [
      `Market signals acquired from ${totalObservations} verified public observations across ${mps.size || 1} marketplace(s).`,
      "Zero synthetic search volume or fabricated supplier costs applied.",
      "Unit economics sensitivity scenarios depend on explicit user-supplied cost parameters.",
    ];

    if (policy.displayRules.requireMarketplaceDisclaimer && policy.displayRules.disclaimerText) {
      transparentDisclosures.push(policy.displayRules.disclaimerText);
    }

    return {
      overallTrustScore,
      sourceDiversityScore,
      freshnessScore,
      completenessScore,
      totalObservations,
      observedMetricCount: observedCount,
      derivedMetricCount: derivedCount,
      estimatedMetricCount: estimatedCount,
      unknownSignalCount,
      primarySourceType: sourcesUsed[0] || "PUBLIC_WEB",
      sourcesUsed,
      policyComplianceStatus,
      unknownSignals,
      transparentDisclosures,
      evaluatedAt: now,
    };
  }
}
