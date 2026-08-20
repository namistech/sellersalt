/**
 * SellerSalt Research Source Orchestrator
 * 
 * Orchestrates multi-source ecommerce research across Public Web, Official APIs,
 * Historical Database records, and External Providers according to explicit precedence policies.
 */

import { MarketplaceRegistry, registerAllConnectors } from "../registry";
import { evaluateFreshness, type FreshnessStatus, type FreshnessEvaluation } from "./freshness";
import { mergeProductObservations } from "./merger";
import { persistPublicProductObservations } from "./persistence";
import {
  evaluateCanonicalOpportunity,
  extractOpportunityInputFromNormalizedProduct,
} from "@/services/intelligence/canonical-opportunity";
import type {
  MarketplaceId,
  NormalizedProduct,
  DataSourceType,
  SignalProvenance,
  MarketplaceShopStats,
} from "../types";
import type {
  PublicSearchQuery,
  PublicWebCapabilities,
  PublicAcquisitionResult,
} from "./contracts";
import { prisma } from "@/lib/db";

export interface ResearchSourcePolicy {
  preferredSources?: DataSourceType[];
  allowHistoricalFallback?: boolean;
  allowExternalProvider?: boolean;
  minimumFreshness?: FreshnessStatus;
  maxStalenessHours?: number;
  requiredCapabilities?: Array<keyof PublicWebCapabilities>;
  enableMultiSourceEnrichment?: boolean;
  persistObservations?: boolean;
}

export const DEFAULT_SOURCE_POLICY: ResearchSourcePolicy = {
  preferredSources: ["PUBLIC_WEB", "MARKETPLACE_API", "HISTORICAL_OBSERVATION"],
  allowHistoricalFallback: true,
  allowExternalProvider: false,
  minimumFreshness: "HISTORICAL",
  maxStalenessHours: 168, // 7 days
  enableMultiSourceEnrichment: true,
  persistObservations: true,
};

export interface AcquisitionReport {
  marketplace: MarketplaceId;
  status: "AVAILABLE" | "PARTIAL" | "UNAVAILABLE" | "NOT_IMPLEMENTED";
  sourcesAttempted: DataSourceType[];
  sourcesSucceeded: DataSourceType[];
  sourcesFailed: DataSourceType[];
  primarySourceUsed?: DataSourceType;
  fallbackUsed?: DataSourceType;
  observationTimestamp: Date;
  freshness: FreshnessEvaluation;
  confidenceScore: number;
  itemCount: number;
  message?: string;
  limitations: string[];
}

export interface OrchestratedProductResult {
  items: NormalizedProduct[];
  report: AcquisitionReport;
}

/**
 * Orchestrates product search across public web, official API, and historical observations.
 */
export async function orchestrateProductResearch(
  request: PublicSearchQuery & { marketplace: MarketplaceId },
  customPolicy?: Partial<ResearchSourcePolicy>
): Promise<OrchestratedProductResult> {
  registerAllConnectors();
  const policy: ResearchSourcePolicy = { ...DEFAULT_SOURCE_POLICY, ...customPolicy };
  const preferredSources = policy.preferredSources || DEFAULT_SOURCE_POLICY.preferredSources!;

  const sourcesAttempted: DataSourceType[] = [];
  const sourcesSucceeded: DataSourceType[] = [];
  const sourcesFailed: DataSourceType[] = [];
  const limitations: string[] = [];

  let publicObservations: NormalizedProduct[] = [];
  let apiObservations: NormalizedProduct[] = [];
  let historicalObservations: NormalizedProduct[] = [];

  // 1. Attempt PUBLIC_WEB if preferred
  if (preferredSources.includes("PUBLIC_WEB")) {
    sourcesAttempted.push("PUBLIC_WEB");
    const publicAdapter = MarketplaceRegistry.tryGetPublicWebAdapter(request.marketplace);

    if (publicAdapter) {
      try {
        const res = await publicAdapter.searchPublicProducts(request);
        if (res.success && res.items.length > 0) {
          sourcesSucceeded.push("PUBLIC_WEB");
          publicObservations = res.items;
        } else {
          sourcesFailed.push("PUBLIC_WEB");
          if (res.error) limitations.push(res.error);
        }
      } catch (err: any) {
        sourcesFailed.push("PUBLIC_WEB");
        limitations.push(`Public web fetch error: ${err.message}`);
      }
    } else {
      sourcesFailed.push("PUBLIC_WEB");
    }
  }

  // 2. Attempt MARKETPLACE_API if preferred or public web yielded no items
  if (
    preferredSources.includes("MARKETPLACE_API") &&
    (publicObservations.length === 0 || policy.enableMultiSourceEnrichment)
  ) {
    sourcesAttempted.push("MARKETPLACE_API");
    const connector = MarketplaceRegistry.tryGetConnector(request.marketplace);

    if (connector && connector.capabilities.research && connector.searchProducts) {
      try {
        const products = await connector.searchProducts({
          keywords: request.query ? [request.query] : [],
          limit: request.limit,
          organizationId: request.organizationId,
        });

        if (products && products.length > 0) {
          sourcesSucceeded.push("MARKETPLACE_API");
          apiObservations = products;
        } else {
          sourcesFailed.push("MARKETPLACE_API");
        }
      } catch (err: any) {
        sourcesFailed.push("MARKETPLACE_API");
        limitations.push(`Official API connector error: ${err.message}`);
      }
    } else {
      sourcesFailed.push("MARKETPLACE_API");
    }
  }

  // 3. Multi-source Observation Merging
  let mergedProducts: NormalizedProduct[] = [];

  if (publicObservations.length > 0 && apiObservations.length > 0) {
    // Merge overlapping items by externalId
    const apiMap = new Map(apiObservations.map((p) => [p.externalId, p]));
    for (const pub of publicObservations) {
      const apiItem = apiMap.get(pub.externalId);
      const merged = mergeProductObservations(pub, apiItem);
      mergedProducts.push(merged.product);
      apiMap.delete(pub.externalId);
    }
    // Append remaining non-overlapping API items
    for (const apiItem of apiMap.values()) {
      mergedProducts.push(apiItem);
    }
  } else if (publicObservations.length > 0) {
    mergedProducts = publicObservations;
  } else if (apiObservations.length > 0) {
    mergedProducts = apiObservations;
  }

  // 4. Tertiary Fallback: HISTORICAL_OBSERVATION from Database
  if (mergedProducts.length === 0 && policy.allowHistoricalFallback) {
    sourcesAttempted.push("HISTORICAL_OBSERVATION");
    try {
      const connectorType = request.marketplace.toUpperCase() as any;
      const historicalRecords = await prisma.prospect.findMany({
        where: {
          marketplace: connectorType,
          ...(request.query
            ? {
                listingTitle: {
                  contains: request.query,
                  mode: "insensitive",
                },
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        take: request.limit ?? 20,
      });

      if (historicalRecords.length > 0) {
        sourcesSucceeded.push("HISTORICAL_OBSERVATION");
        historicalObservations = historicalRecords.map((rec) => {
          const norm: NormalizedProduct = {
            marketplace: request.marketplace,
            externalId: rec.listingExternalId,
            title: rec.listingTitle,
            url: rec.listingUrl,
            imageUrl: rec.listingImageUrl ?? undefined,
            price: rec.price,
            currency: "USD",
            rating: rec.reviewAverage ?? null,
            reviewCount: rec.totalSales ?? null,
            favoritesCount: rec.numFavorers ?? null,
            shop: {
              name: rec.shopName,
              activeListings: rec.activeListings,
              ageMonths: rec.shopAgeMonths,
              reviewRatio: rec.reviewRatio,
              reviewVelocity: rec.reviewVelocity,
            },
            source: "ACTUAL_DATA" as SignalProvenance,
            acquisitionMethod: "HISTORICAL_OBSERVATION",
            isHistorical: true,
            capturedAt: rec.createdAt,
          };

          const oppInput = extractOpportunityInputFromNormalizedProduct(norm);
          const report = evaluateCanonicalOpportunity(oppInput);
          if (report.overallScore !== null) {
            norm.opportunityScore = {
              score: report.overallScore,
              confidence: report.confidenceScore,
              tier: report.tier,
              verdict: report.verdictLabel,
              verdictVariant: report.verdictVariant,
              availableSignals: report.signals.available.map((s) => s.id),
              unavailableSignals: report.signals.unavailable.map((s) => s.id),
            };
          }

          return norm;
        });

        mergedProducts = historicalObservations;
      } else {
        sourcesFailed.push("HISTORICAL_OBSERVATION");
      }
    } catch {
      sourcesFailed.push("HISTORICAL_OBSERVATION");
    }
  }

  // 5. Freshness & Confidence Evaluation
  const primarySourceUsed: DataSourceType | undefined =
    sourcesSucceeded.includes("PUBLIC_WEB")
      ? "PUBLIC_WEB"
      : sourcesSucceeded.includes("MARKETPLACE_API")
      ? "MARKETPLACE_API"
      : sourcesSucceeded.includes("HISTORICAL_OBSERVATION")
      ? "HISTORICAL_OBSERVATION"
      : undefined;

  const fallbackUsed: DataSourceType | undefined =
    primarySourceUsed === "HISTORICAL_OBSERVATION" ? "HISTORICAL_OBSERVATION" : undefined;

  const mostRecentTimestamp = mergedProducts.reduce<Date>(
    (latest, item) => (item.capturedAt && item.capturedAt > latest ? item.capturedAt : latest),
    new Date(0)
  );

  const freshness = evaluateFreshness(
    mostRecentTimestamp.getTime() > 0 ? mostRecentTimestamp : new Date(),
    "general",
    primarySourceUsed === "HISTORICAL_OBSERVATION"
  );

  // Apply freshness confidence penalty across results
  for (const item of mergedProducts) {
    if (item.opportunityScore && freshness.confidencePenalty > 0) {
      item.opportunityScore.confidence = Math.max(
        10,
        item.opportunityScore.confidence - freshness.confidencePenalty
      );
    }
  }

  // 6. Background Persistence
  if (policy.persistObservations && request.organizationId && mergedProducts.length > 0) {
    persistPublicProductObservations(mergedProducts, {
      organizationId: request.organizationId,
    }).catch(() => {});
  }

  // 7. Status Classification
  const connector = MarketplaceRegistry.tryGetConnector(request.marketplace);
  const publicAdapter = MarketplaceRegistry.tryGetPublicWebAdapter(request.marketplace);

  let status: "AVAILABLE" | "PARTIAL" | "UNAVAILABLE" | "NOT_IMPLEMENTED";
  if (mergedProducts.length > 0) {
    status = sourcesSucceeded.includes("PUBLIC_WEB") || sourcesSucceeded.includes("MARKETPLACE_API")
      ? "AVAILABLE"
      : "PARTIAL";
  } else if (!request.query || request.query.trim().length === 0) {
    if (connector?.capabilities.research || publicAdapter?.capabilities.productSearch) {
      status = "AVAILABLE";
    } else if (connector && Object.values(connector.capabilities).some(Boolean)) {
      status = "PARTIAL";
    } else {
      status = "NOT_IMPLEMENTED";
    }
  } else if (connector?.capabilities.research || publicAdapter?.capabilities.productSearch) {
    status = "UNAVAILABLE";
  } else if (connector && Object.values(connector.capabilities).some(Boolean)) {
    status = "PARTIAL";
  } else {
    status = "NOT_IMPLEMENTED";
  }

  const avgConfidence =
    mergedProducts.length > 0
      ? Math.round(
          mergedProducts.reduce((acc, p) => acc + (p.opportunityScore?.confidence ?? 40), 0) /
            mergedProducts.length
        )
      : 0;

  const report: AcquisitionReport = {
    marketplace: request.marketplace,
    status,
    sourcesAttempted,
    sourcesSucceeded,
    sourcesFailed,
    primarySourceUsed,
    fallbackUsed,
    observationTimestamp: mostRecentTimestamp.getTime() > 0 ? mostRecentTimestamp : new Date(),
    freshness,
    confidenceScore: avgConfidence,
    itemCount: mergedProducts.length,
    message:
      mergedProducts.length > 0
        ? `Successfully acquired ${mergedProducts.length} observations from ${sourcesSucceeded.join(" + ")} (${freshness.status}).`
        : `No observations available for "${request.query}" on ${request.marketplace}.`,
    limitations,
  };

  return {
    items: mergedProducts,
    report,
  };
}
