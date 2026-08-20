/**
 * SellerSalt Public Category & Taxonomy Aggregation Engine
 * 
 * Aggregates category intelligence, price distribution percentiles, catalog yield,
 * and canonical opportunity distributions from legitimate public marketplace observations.
 */

import { MarketplaceRegistry, registerAllConnectors } from "../registry";
import { evaluateFreshness, type FreshnessEvaluation } from "./freshness";
import {
  evaluateCanonicalOpportunity,
  extractOpportunityInputFromNormalizedProduct,
} from "@/services/intelligence/canonical-opportunity";
import type { MarketplaceId, NormalizedProduct, SignalProvenance } from "../types";

export interface CategoryPriceDistribution {
  min: number | null;
  max: number | null;
  median: number | null;
  average: number | null;
  percentile10: number | null;
  percentile90: number | null;
}

export interface CategoryOpportunityDistribution {
  highOpportunityCount: number; // score >= 80
  moderateOpportunityCount: number; // score 65-79
  competitiveCount: number; // score < 65
  averageScore: number | null;
}

export interface PublicCategoryIntelligenceResult {
  categoryName: string;
  marketplace: MarketplaceId;
  observedCatalogCount: number;
  totalListings: number;
  priceDistribution: CategoryPriceDistribution;
  opportunityDistribution: CategoryOpportunityDistribution;
  topProducts: NormalizedProduct[];
  recurringThemes: string[];
  freshness: FreshnessEvaluation;
  provenance: SignalProvenance;
  limitations: string[];
}

function calculatePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];
  const index = (percentile / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  if (lower === upper) return sortedValues[lower];
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

export async function aggregatePublicCategoryIntelligence(
  paramsOrName: { categoryName: string; marketplace: MarketplaceId; limit?: number; products?: NormalizedProduct[] } | string,
  marketplaceArg?: MarketplaceId,
  productsArg?: NormalizedProduct[]
): Promise<PublicCategoryIntelligenceResult | { available: false; message: string }> {
  let categoryName: string;
  let marketplace: MarketplaceId;
  let limit: number = 30;
  let directProducts: NormalizedProduct[] | undefined;

  if (typeof paramsOrName === "string") {
    categoryName = paramsOrName;
    marketplace = marketplaceArg || "etsy";
    directProducts = productsArg;
  } else {
    categoryName = paramsOrName.categoryName;
    marketplace = paramsOrName.marketplace;
    limit = paramsOrName.limit ?? 30;
    directProducts = paramsOrName.products;
  }

  let products: NormalizedProduct[] = [];
  let freshness: FreshnessEvaluation = evaluateFreshness(new Date(), "taxonomy");
  let provenance: SignalProvenance = "ACTUAL_DATA";

  if (directProducts && directProducts.length > 0) {
    products = directProducts;
  } else {
    registerAllConnectors();
    const adapter = MarketplaceRegistry.tryGetPublicWebAdapter(marketplace);

    if (!adapter || !adapter.capabilities.productSearch) {
      return {
        available: false,
        message: `${marketplace} category research adapter is not available yet.`,
      };
    }

    const searchRes = await adapter.searchPublicProducts({
      query: categoryName,
      limit,
    });

    freshness = evaluateFreshness(searchRes.fetchedAt, "taxonomy");
    provenance = searchRes.provenance || "UNAVAILABLE";

    if (!searchRes.success || searchRes.items.length === 0) {
      return {
        categoryName,
        marketplace,
        observedCatalogCount: 0,
        totalListings: 0,
        priceDistribution: {
          min: null,
          max: null,
          median: null,
          average: null,
          percentile10: null,
          percentile90: null,
        },
        opportunityDistribution: {
          highOpportunityCount: 0,
          moderateOpportunityCount: 0,
          competitiveCount: 0,
          averageScore: null,
        },
        topProducts: [],
        recurringThemes: [],
        freshness,
        provenance,
        limitations: [
          searchRes.error || `No public observations found for category "${categoryName}".`,
        ],
      };
    }

    products = searchRes.items;
  }

  // Price calculations
  const prices = products
    .map((p) => p.price)
    .filter((p): p is number => p !== null && p !== undefined && p > 0)
    .sort((a, b) => a - b);

  const min = prices.length > 0 ? prices[0] : null;
  const max = prices.length > 0 ? prices[prices.length - 1] : null;
  const average =
    prices.length > 0
      ? parseFloat((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2))
      : null;
  const median = prices.length > 0 ? calculatePercentile(prices, 50) : null;
  const percentile10 = prices.length > 0 ? calculatePercentile(prices, 10) : null;
  const percentile90 = prices.length > 0 ? calculatePercentile(prices, 90) : null;

  // Opportunity scoring distribution
  let highCount = 0;
  let modCount = 0;
  let compCount = 0;
  let scoreSum = 0;
  let scoredCount = 0;

  const scoredProducts = products.map((p) => {
    if (!p.opportunityScore && p.price !== null) {
      const input = extractOpportunityInputFromNormalizedProduct(p);
      const report = evaluateCanonicalOpportunity(input);
      if (report.overallScore !== null) {
        p.opportunityScore = {
          score: report.overallScore,
          confidence: report.confidenceScore,
          tier: report.tier,
          verdict: report.verdictLabel,
          verdictVariant: report.verdictVariant,
          availableSignals: report.signals.available.map((s) => s.id),
          unavailableSignals: report.signals.unavailable.map((s) => s.id),
        };
      }
    }

    if (p.opportunityScore?.score !== null && p.opportunityScore?.score !== undefined) {
      const s = p.opportunityScore.score;
      scoreSum += s;
      scoredCount++;
      if (s >= 80) highCount++;
      else if (s >= 65) modCount++;
      else compCount++;
    }

    return p;
  });

  const avgScore = scoredCount > 0 ? Math.round(scoreSum / scoredCount) : null;

  // Extract recurring keywords
  const wordCounts = new Map<string, number>();
  const catTokens = new Set(categoryName.toLowerCase().split(/\s+/));

  for (const p of products) {
    const tokens = p.title.toLowerCase().split(/[^a-z0-9]+/i).filter((t) => t.length > 2 && !catTokens.has(t));
    for (const t of tokens) {
      wordCounts.set(t, (wordCounts.get(t) || 0) + 1);
    }
  }

  const recurringThemes = Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map((e) => e[0]);

  return {
    categoryName,
    marketplace,
    observedCatalogCount: products.length,
    totalListings: products.length,
    priceDistribution: {
      min,
      max,
      median,
      average,
      percentile10,
      percentile90,
    },
    opportunityDistribution: {
      highOpportunityCount: highCount,
      moderateOpportunityCount: modCount,
      competitiveCount: compCount,
      averageScore: avgScore,
    },
    topProducts: scoredProducts.slice(0, 10),
    recurringThemes,
    freshness,
    provenance: "ACTUAL_DATA",
    limitations: [
      "Total category catalog size represents observed public sample volume rather than complete marketplace index.",
    ],
  };
}
