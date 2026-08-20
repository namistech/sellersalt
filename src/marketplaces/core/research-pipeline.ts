// Marketplace-neutral research orchestration:
//   Research Request -> Marketplace Provider -> Raw Data -> Normalizer
//   -> Research Dataset -> Intelligence Engine -> Opportunity/Insight
//
// This is the new, marketplace-agnostic entry point for "run research on a
// keyword/category against a marketplace." It does not replace the existing
// product-hunting/keyword-research services (src/services/product-hunting.ts,
// src/services/keyword-research.ts) — those keep working for their current
// Etsy-only callers unchanged. This is what a new UI surface (or a future
// second research marketplace) should call instead of reaching for the Etsy
// connector directly, so the intelligence layer downstream of it never has
// to know which marketplace the data came from.

import { MarketplaceRegistry, assertCapability, registerAllConnectors } from "./registry";
import { scoreProductOpportunity, scoreNormalizedProductOpportunity } from "./opportunity-engine";
import {
  evaluateCanonicalOpportunity,
  extractOpportunityInputFromNormalizedProduct,
} from "@/services/intelligence/canonical-opportunity";
import { acquireHistoricalProductObservations } from "./acquisition";
import { orchestrateProductResearch } from "./acquisition/orchestrator";
import type { MarketplaceId, SearchResult, NormalizedProduct, DataSourceType } from "./types";
import type { OpportunityScore } from "./opportunity-engine";

/** Explicit status for a single marketplace's contribution to a research
 * result — never collapsed into a bare boolean, since "no live connector"
 * (NOT_IMPLEMENTED) and "connector exists but errored this call"
 * (UNAVAILABLE) are different situations a caller should be able to show
 * differently. */
export type MarketplaceResultStatus = "AVAILABLE" | "PARTIAL" | "UNAVAILABLE" | "NOT_IMPLEMENTED";

export interface MarketplaceOpportunitySummary {
  totalProducts: number;
  scoredProductsCount: number;
  averageOpportunityScore: number | null;
  averageConfidence: number | null;
  availableSignalGroups: string[];
  unavailableSignalGroups: string[];
}

export interface ProductResearchResult {
  marketplace: MarketplaceId;
  status: MarketplaceResultStatus;
  products: NormalizedProduct[];
  message?: string;
  generatedAt: Date;
  summary?: MarketplaceOpportunitySummary;
}

export type ResearchType = "products" | "categories" | "opportunities";

/** Generic per-marketplace fan-out result — used by anything that needs
 * the same "AVAILABLE/PARTIAL/UNAVAILABLE/NOT_IMPLEMENTED, one entry per
 * marketplace, one connector's failure never removes another's result"
 * shape that `runAllMarketplaceProductResearch` established for products,
 * but for a payload other than `NormalizedProduct[]` (e.g. keyword or
 * category research — see src/services/keyword-research.ts's
 * `fetchAllMarketplaceKeywordResearch` and
 * src/services/category-hunting.ts's `fetchAllMarketplaceCategoryTree`). */
export interface MarketplaceFanOutResult<T> {
  marketplace: MarketplaceId;
  status: MarketplaceResultStatus;
  data?: T;
  message?: string;
}

/**
 * Runs `fn(marketplace)` against every given marketplace in parallel.
 * `fn` should return whatever its `CapabilityUnavailable`-aware
 * marketplace-aware entry point returns (e.g.
 * `fetchMarketplaceKeywordResearch`) — this helper does the
 * classification (unavailable-reason -> NOT_IMPLEMENTED/UNAVAILABLE) and
 * the error isolation (a thrown exception becomes UNAVAILABLE for that
 * one marketplace, never a rejected batch) so every "All Marketplaces"
 * surface shares one implementation of that logic instead of
 * reimplementing it per feature.
 */
export async function fanOutMarketplaceRequest<T>(
  marketplaces: MarketplaceId[],
  fn: (marketplace: MarketplaceId) => Promise<T | { available: false; reason: string; message: string }>
): Promise<MarketplaceFanOutResult<T>[]> {
  return Promise.all(
    marketplaces.map(async (marketplace): Promise<MarketplaceFanOutResult<T>> => {
      try {
        const result = await fn(marketplace);
        if (result && typeof result === "object" && "available" in result && (result as any).available === false) {
          const unavailable = result as { available: false; reason: string; message: string };
          return {
            marketplace,
            status: unavailable.reason === "CONNECTOR_NOT_IMPLEMENTED" || unavailable.reason === "UNKNOWN_MARKETPLACE" ? "NOT_IMPLEMENTED" : "UNAVAILABLE",
            message: unavailable.message,
          };
        }
        return { marketplace, status: "AVAILABLE", data: result as T };
      } catch (err: any) {
        return { marketplace, status: "UNAVAILABLE", message: err?.message || `${marketplace} research failed.` };
      }
    })
  );
}

export interface ResearchRequest {
  marketplace: MarketplaceId;
  type: ResearchType;
  /** Required for marketplaces whose research connector resolves
   * per-organization credentials (Etsy does — see
   * src/marketplaces/etsy/connector.ts's resolveResearchCredentials).
   * Omit only for a genuinely anonymous/public lookup. */
  organizationId?: string;
  keywords?: string[];
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  minShopAgeMonths?: number;
  maxShopAgeMonths?: number;
  minReviewCount?: number;
  allowHistoricalFallback?: boolean;
  preferredSources?: DataSourceType[];
}

export interface ResearchDatasetItem {
  result: SearchResult;
  opportunity?: OpportunityScore;
}

export interface ResearchDataset {
  marketplace: MarketplaceId;
  request: ResearchRequest;
  items: ResearchDatasetItem[];
  /** True when the requested marketplace's connector doesn't support
   * research at all — callers should render "not available for this
   * marketplace" rather than an empty-results state, which would look like
   * a real zero-match search. */
  unavailable: boolean;
  generatedAt: Date;
}

/**
 * Runs a research request against whichever marketplace connector is
 * registered for `request.marketplace`. Throws
 * MarketplaceCapabilityUnavailableError (via assertCapability) only for
 * programming errors that bypassed a UI-level capability check; the normal
 * "this marketplace can't do research yet" case is represented as
 * `{ unavailable: true }` so a route can render it, not crash on it.
 */
export async function runMarketResearch(request: ResearchRequest): Promise<ResearchDataset> {
  registerAllConnectors();
  const connector = MarketplaceRegistry.getConnector(request.marketplace);

  if (!connector.capabilities.research || !connector.searchPublicListings) {
    return {
      marketplace: request.marketplace,
      request,
      items: [],
      unavailable: true,
      generatedAt: new Date(),
    };
  }

  assertCapability(connector, "research");

  const results = await connector.searchPublicListings({
    organizationId: request.organizationId,
    keywords: request.keywords,
    categoryId: request.categoryId,
    minPrice: request.minPrice,
    maxPrice: request.maxPrice,
    limit: request.limit,
    minShopAgeMonths: request.minShopAgeMonths,
    maxShopAgeMonths: request.maxShopAgeMonths,
    minReviewCount: request.minReviewCount,
  });

  const items: ResearchDatasetItem[] = results.map((result) => ({ result }));

  return {
    marketplace: request.marketplace,
    request,
    items,
    unavailable: false,
    generatedAt: new Date(),
  };
}

/**
 * Runs the same research request against several marketplaces at once —
 * the foundation for a future "All Marketplaces" / multi-select research
 * UI. Each marketplace's dataset is independent and honestly marked
 * `unavailable: true` when that marketplace's connector doesn't support
 * research yet; this NEVER fabricates a result for an unavailable
 * marketplace to fill out a comparison table.
 */
export async function runMultiMarketResearch(
  marketplaces: MarketplaceId[],
  request: Omit<ResearchRequest, "marketplace">
): Promise<ResearchDataset[]> {
  return Promise.all(marketplaces.map((marketplace) => runMarketResearch({ ...request, marketplace })));
}

/**
 * Rich product-research call — used by anything that needs shop/seller
 * metrics (reviews, sales, shop age), not just a title/price/url preview.
 * This is what the scheduled Prospects pipeline (src/workers/index.ts) and
 * the "ALL MARKETPLACES" fan-out (runAllMarketplaceProductResearch below)
 * use. Never throws for an unsupported/erroring marketplace — always
 * returns a status-tagged result so a UI or job handler can branch on it.
 */
export async function runProductResearch(request: ResearchRequest): Promise<ProductResearchResult> {
  registerAllConnectors();
  const connector = MarketplaceRegistry.tryGetConnector(request.marketplace);
  const generatedAt = new Date();

  if (!connector) {
    return {
      marketplace: request.marketplace,
      status: "NOT_IMPLEMENTED",
      products: [],
      message: `Unknown marketplace "${request.marketplace}".`,
      generatedAt,
    };
  }

  if (!connector.capabilities.research || !connector.searchProducts) {
    const hasAnyCapability = Object.values(connector.capabilities).some(Boolean);
    return {
      marketplace: request.marketplace,
      status: hasAnyCapability ? "PARTIAL" : "NOT_IMPLEMENTED",
      products: [],
      message: `${connector.displayName} product research is not available yet.`,
      generatedAt,
    };
  }

  if (!request.keywords || request.keywords.length === 0) {
    return {
      marketplace: request.marketplace,
      status: "AVAILABLE",
      products: [],
      generatedAt,
    };
  }

  try {
    const query = request.keywords.join(" ");
    const orchRes = await orchestrateProductResearch(
      {
        query,
        marketplace: request.marketplace,
        organizationId: request.organizationId,
        limit: request.limit,
        minPrice: request.minPrice,
        maxPrice: request.maxPrice,
      },
      {
        preferredSources: request.preferredSources || ["PUBLIC_WEB", "MARKETPLACE_API", "HISTORICAL_OBSERVATION"],
        allowHistoricalFallback: request.allowHistoricalFallback !== false,
      }
    );

    const products = orchRes.items;
    const availableGroupsSet = new Set<string>();
    const unavailableGroupsSet = new Set<string>();
    let totalScore = 0;
    let scoredCount = 0;
    let totalConfidence = 0;

    for (const prod of products) {
      if (prod.opportunityScore?.score !== null && prod.opportunityScore?.score !== undefined) {
        totalScore += prod.opportunityScore.score;
        scoredCount++;
        totalConfidence += prod.opportunityScore.confidence;
        (prod.opportunityScore.availableSignals || []).forEach((s: string) => availableGroupsSet.add(s));
        (prod.opportunityScore.unavailableSignals || []).forEach((s: string) => unavailableGroupsSet.add(s));
      }
    }

    const summary: MarketplaceOpportunitySummary | undefined =
      products.length > 0
        ? {
            totalProducts: products.length,
            scoredProductsCount: scoredCount,
            averageOpportunityScore: scoredCount > 0 ? Math.round(totalScore / scoredCount) : null,
            averageConfidence: scoredCount > 0 ? Math.round(totalConfidence / scoredCount) : null,
            availableSignalGroups: Array.from(availableGroupsSet),
            unavailableSignalGroups: Array.from(unavailableGroupsSet),
          }
        : undefined;

    return {
      marketplace: request.marketplace,
      status: orchRes.report.status,
      products,
      summary,
      message: orchRes.report.limitations.join("; ") || undefined,
      generatedAt,
    };
  } catch (err: any) {
    return {
      marketplace: request.marketplace,
      status: "UNAVAILABLE",
      products: [],
      message: err?.message || `${connector.displayName} research failed.`,
      generatedAt,
    };
  }
}

/**
 * "ALL MARKETPLACES" mode — fans the same research intent out across every
 * given marketplace in parallel, each with its own independent status.
 * Never fabricates a result for a marketplace whose connector can't serve
 * it; a caller renders each marketplace's card/row from its own `status`.
 */
export async function runAllMarketplaceProductResearch(
  marketplaces: MarketplaceId[],
  request: Omit<ResearchRequest, "marketplace">
): Promise<ProductResearchResult[]> {
  return Promise.all(marketplaces.map((marketplace) => runProductResearch({ ...request, marketplace })));
}

/** Convenience wrapper for the "opportunities" research type — runs the
 * search, then scores each result that has enough data to score. Results
 * without enough fields to compute a real score are returned with
 * `opportunity: undefined` rather than a fabricated one. */
export async function runOpportunityResearch(
  request: ResearchRequest & {
    shopReviewCount?: number;
    listingAgeDays?: number;
  }
): Promise<ResearchDataset> {
  const dataset = await runMarketResearch(request);
  if (dataset.unavailable) return dataset;

  const scored = dataset.items.map((item): ResearchDatasetItem => {
    if (
      typeof item.result.price !== "number" ||
      request.shopReviewCount === undefined ||
      request.listingAgeDays === undefined
    ) {
      return item; // not enough data to score — leave opportunity undefined
    }
    return {
      ...item,
      opportunity: scoreProductOpportunity({
        marketplace: request.marketplace,
        price: item.result.price,
        estDailySales: 0,
        shopReviewCount: request.shopReviewCount,
        listingAgeDays: request.listingAgeDays,
      }),
    };
  });

  return { ...dataset, items: scored };
}
