/**
 * SellerSalt Cross-Marketplace Intelligence & Comparison Engine
 * 
 * Provides unified, multi-channel opportunity evaluations, rankings, and
 * comparative insights across all registered marketplaces.
 * 
 * Strict architectural rules:
 * 1. Never rank unavailable marketplaces.
 * 2. Never assign a score of 0 to an unavailable marketplace.
 * 3. Never fabricate products, scores, or confidence for stub connectors.
 * 4. Maintain explicit metric and capability provenance throughout.
 */

import { MarketplaceRegistry, registerAllConnectors } from "@/marketplaces/core/registry";
import { runAllMarketplaceProductResearch, type ProductResearchResult, type ResearchRequest } from "@/marketplaces/core/research-pipeline";
import type {
  MarketplaceId,
  MarketplaceEvaluation,
  CrossMarketplaceRanking,
  CrossMarketplaceComparison,
  SignalProvenance,
} from "@/marketplaces/core/types";

const MARKETPLACE_DISPLAY_NAMES: Record<MarketplaceId, string> = {
  etsy: "Etsy",
  amazon: "Amazon",
  ebay: "eBay",
  tiktok_shop: "TikTok Shop",
  shopify: "Shopify",
  woocommerce: "WooCommerce",
};

function getTierFromScore(score: number | null): string | undefined {
  if (score === null) return undefined;
  if (score >= 80) return "High Opportunity";
  if (score >= 65) return "Moderate Opportunity";
  if (score >= 45) return "Competitive / Low Margin";
  return "High Risk / Low Demand";
}

function getVerdictFromScore(score: number | null): { verdict: string; verdictVariant: "success" | "warning" | "danger" | "info" | "neutral" } {
  if (score === null) {
    return { verdict: "Evaluation Unavailable", verdictVariant: "neutral" };
  }
  if (score >= 80) {
    return { verdict: "Strong Opportunity", verdictVariant: "success" };
  }
  if (score >= 65) {
    return { verdict: "Viable with Differentiation", verdictVariant: "warning" };
  }
  if (score >= 45) {
    return { verdict: "Crowded / Low Margin", verdictVariant: "neutral" };
  }
  return { verdict: "Unfavorable Unit Economics", verdictVariant: "danger" };
}

/**
 * Transforms an array of ProductResearchResult objects into a standardized
 * CrossMarketplaceComparison model.
 */
export function buildCrossMarketplaceComparison(
  query: string | undefined,
  results: ProductResearchResult[]
): CrossMarketplaceComparison {
  registerAllConnectors();
  const comparedAt = new Date();

  const evaluations: MarketplaceEvaluation[] = results.map((res): MarketplaceEvaluation => {
    const connector = MarketplaceRegistry.tryGetConnector(res.marketplace);
    const displayName = connector?.displayName ?? MARKETPLACE_DISPLAY_NAMES[res.marketplace] ?? res.marketplace;

    if (res.status === "AVAILABLE" && res.products.length > 0) {
      const oppScore = res.summary?.averageOpportunityScore ?? null;
      const confidence = res.summary?.averageConfidence ?? null;
      const { verdict, verdictVariant } = getVerdictFromScore(oppScore);

      return {
        marketplace: res.marketplace,
        displayName,
        status: "AVAILABLE",
        products: res.products,
        totalProductsCount: res.products.length,
        scoredProductsCount: res.summary?.scoredProductsCount ?? 0,
        opportunityScore: oppScore,
        confidence,
        tier: getTierFromScore(oppScore),
        verdict,
        verdictVariant,
        availableSignals: res.summary?.availableSignalGroups ?? [],
        unavailableSignals: res.summary?.unavailableSignalGroups ?? [],
        provenance: "ACTUAL_DATA" as SignalProvenance,
        message: res.message,
        evaluatedAt: res.generatedAt,
      };
    }

    // For PARTIAL, UNAVAILABLE, or NOT_IMPLEMENTED states:
    // Strictly zero fabrication — scores and confidence remain null.
    let provenance: SignalProvenance = "UNAVAILABLE";
    if (res.status === "PARTIAL") {
      provenance = "ACTUAL_DATA";
    }

    return {
      marketplace: res.marketplace,
      displayName,
      status: res.status,
      products: [],
      totalProductsCount: 0,
      scoredProductsCount: 0,
      opportunityScore: null,
      confidence: null,
      availableSignals: [],
      unavailableSignals: [],
      provenance,
      message: res.message || (res.status === "NOT_IMPLEMENTED" ? `${displayName} API integration required.` : `${displayName} data is currently unavailable.`),
      evaluatedAt: res.generatedAt,
    };
  });

  const availableMarketplaces: MarketplaceId[] = [];
  const unavailableMarketplaces: MarketplaceId[] = [];

  for (const evalItem of evaluations) {
    if (evalItem.status === "AVAILABLE" && evalItem.opportunityScore !== null) {
      availableMarketplaces.push(evalItem.marketplace);
    } else {
      unavailableMarketplaces.push(evalItem.marketplace);
    }
  }

  // Rank ONLY available marketplaces with real opportunity scores.
  // Never include unavailable marketplaces in the ranking table or assign them 0!
  const availableEvaluations = evaluations.filter(
    (e) => e.status === "AVAILABLE" && typeof e.opportunityScore === "number"
  );

  availableEvaluations.sort((a, b) => {
    const scoreDiff = (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return (b.confidence ?? 0) - (a.confidence ?? 0);
  });

  const rankings: CrossMarketplaceRanking[] = availableEvaluations.map((item, index) => {
    const totalSignals = item.availableSignals.length + item.unavailableSignals.length;
    return {
      rank: index + 1,
      marketplace: item.marketplace,
      displayName: item.displayName,
      opportunityScore: item.opportunityScore as number,
      confidence: item.confidence ?? 0,
      tier: item.tier,
      verdict: item.verdict,
      verdictVariant: item.verdictVariant,
      evaluatedSignalsCount: item.availableSignals.length,
      totalSignalsCount: totalSignals > 0 ? totalSignals : 4,
    };
  });

  const bestAvailable = rankings.length > 0
    ? {
        marketplace: rankings[0].marketplace,
        displayName: rankings[0].displayName,
        opportunityScore: rankings[0].opportunityScore,
        confidence: rankings[0].confidence,
        verdict: rankings[0].verdict,
        verdictVariant: rankings[0].verdictVariant,
      }
    : undefined;

  const highestConfidence = rankings.length > 0
    ? [...rankings].sort((a, b) => b.confidence - a.confidence)[0]
    : undefined;

  const highestConfidenceMarketplace = highestConfidence
    ? {
        marketplace: highestConfidence.marketplace,
        displayName: highestConfidence.displayName,
        confidence: highestConfidence.confidence,
        opportunityScore: highestConfidence.opportunityScore,
      }
    : undefined;

  let comparisonConfidence: number | null = null;
  if (rankings.length === 1) {
    comparisonConfidence = rankings[0].confidence;
  } else if (rankings.length > 1) {
    const totalConf = rankings.reduce((acc, curr) => acc + curr.confidence, 0);
    comparisonConfidence = Math.round(totalConf / rankings.length);
  }

  // Construct honest, transparent system limitations
  const limitations: string[] = [];
  if (availableMarketplaces.length === 1 && availableMarketplaces[0] === "etsy") {
    limitations.push("Etsy is currently the only active public market research integration. Comparative rankings reflect single-channel availability.");
  }
  if (unavailableMarketplaces.includes("amazon") || unavailableMarketplaces.includes("ebay") || unavailableMarketplaces.includes("tiktok_shop")) {
    limitations.push("Amazon, eBay, and TikTok Shop connectors are architecture-ready and require official developer credentials before public signals can be ingested.");
  }
  if (unavailableMarketplaces.includes("shopify") || unavailableMarketplaces.includes("woocommerce")) {
    limitations.push("Shopify and WooCommerce connectors support authenticated seller order synchronization, not public marketplace catalog research.");
  }
  limitations.push("Search volumes and daily sales velocities are deterministic estimates derived from active listings, sales yield, and favorer engagement proxies.");

  return {
    query,
    evaluations,
    availableMarketplaces,
    unavailableMarketplaces,
    rankings,
    bestAvailableMarketplace: bestAvailable,
    highestConfidenceMarketplace,
    comparisonConfidence,
    limitations,
    comparedAt,
  };
}

/**
 * Orchestrates multi-marketplace product research and produces a unified
 * comparison and ranking envelope.
 */
export async function compareAllMarketplaceProducts(
  marketplaces: MarketplaceId[],
  request: Omit<ResearchRequest, "marketplace">
): Promise<{
  results: ProductResearchResult[];
  comparison: CrossMarketplaceComparison;
}> {
  const results = await runAllMarketplaceProductResearch(marketplaces, request);
  const query = request.keywords?.[0];
  const comparison = buildCrossMarketplaceComparison(query, results);

  return {
    results,
    comparison,
  };
}
