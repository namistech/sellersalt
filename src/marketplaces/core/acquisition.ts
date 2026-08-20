/**
 * SellerSalt Marketplace-Independent Data Acquisition Foundation
 * 
 * Orchestrates multi-source commerce data acquisition:
 *   1. Official Marketplace API (Etsy Open API v3, Amazon SP-API when configured)
 *   2. Legitimate Public Web Ingestion (JSON-LD / microdata parsers)
 *   3. User-Provided Data / Imports (CSV / manual listing uploads)
 *   4. Connected Seller Store Data (OAuth SellerChannels)
 *   5. Historical SellerSalt Observations (Persisted Prospects / Snapshots in PostgreSQL)
 *   6. Third-Party Licensed Data Providers (Future DataForSEO / Rainforest integrations)
 *   7. Offline Development / Test Fixtures
 * 
 * Ensures the intelligence layer downstream consumes only normalized data with explicit
 * provenance, eliminating hard runtime coupling to any single external API.
 */

export * from "./acquisition/index";

import { prisma } from "@/lib/db";
import { MarketplaceRegistry, registerAllConnectors } from "./registry";
import {
  evaluateCanonicalOpportunity,
  extractOpportunityInputFromNormalizedProduct,
} from "@/services/intelligence/canonical-opportunity";
import { normalizeEtsyProspectToNormalizedProduct } from "./normalizers/etsy";
import type {
  MarketplaceId,
  NormalizedProduct,
  DataSourceType,
  NormalizedObservation,
  ObservationMetadata,
  SignalProvenance,
} from "./types";
import type { MarketplaceResearchQuery } from "./interfaces";

export interface AcquisitionRequest {
  marketplace: MarketplaceId;
  organizationId?: string;
  query?: string;
  keywords?: string[];
  categoryTaxonomyId?: number;
  minPrice?: number;
  maxPrice?: number;
  preferredSources?: DataSourceType[];
  allowHistoricalFallback?: boolean;
  limit?: number;
}

export interface AcquisitionResult<T> {
  marketplace: MarketplaceId;
  status: "AVAILABLE" | "PARTIAL" | "UNAVAILABLE" | "NOT_IMPLEMENTED";
  observations: Array<NormalizedObservation<T>>;
  products: T[];
  sourcesAttempted: DataSourceType[];
  sourcesSucceeded: DataSourceType[];
  hasLiveCoverage: boolean;
  hasHistoricalCoverage: boolean;
  message?: string;
  generatedAt: Date;
}

/**
 * Deduplicates product observations by marketplace and external ID,
 * preferring the freshest observation or live data over older historical records.
 */
export function deduplicateProductObservations(
  observations: Array<NormalizedObservation<NormalizedProduct>>
): Array<NormalizedObservation<NormalizedProduct>> {
  const map = new Map<string, NormalizedObservation<NormalizedProduct>>();

  for (const obs of observations) {
    const key = `${obs.data.marketplace}:${obs.data.externalId}`;
    const existing = map.get(key);

    if (!existing) {
      map.set(key, obs);
      continue;
    }

    // If existing is historical and new is live, prefer new
    if (existing.metadata.sourceType === "HISTORICAL_OBSERVATION" && obs.metadata.sourceType !== "HISTORICAL_OBSERVATION") {
      map.set(key, obs);
    } else if (obs.metadata.observedAt > existing.metadata.observedAt) {
      map.set(key, obs);
    }
  }

  return Array.from(map.values());
}

/**
 * Queries stored historical observations from PostgreSQL (Prospect table)
 * matching the search query or marketplace.
 */
export async function acquireHistoricalProductObservations(
  request: AcquisitionRequest
): Promise<Array<NormalizedObservation<NormalizedProduct>>> {
  const limit = Math.min(100, Math.max(1, request.limit ?? 25));
  const queryTerm = request.query?.trim() || request.keywords?.[0]?.trim() || "";

  const whereClause: any = {};
  if (request.organizationId) {
    whereClause.organizationId = request.organizationId;
  }

  // Filter by query term in listingTitle or keyword if specified
  if (queryTerm) {
    whereClause.OR = [
      { listingTitle: { contains: queryTerm, mode: "insensitive" } },
      { keyword: { contains: queryTerm, mode: "insensitive" } },
    ];
  }

  try {
    const prospects = await prisma.prospect.findMany({
      where: whereClause,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    return prospects.map((p): NormalizedObservation<NormalizedProduct> => {
      const normalized = normalizeEtsyProspectToNormalizedProduct(p as any);
      normalized.marketplace = request.marketplace;
      normalized.acquisitionMethod = "HISTORICAL_OBSERVATION";
      normalized.isHistorical = true;
      normalized.observedAt = p.createdAt;

      // Evaluate canonical opportunity
      const oppInput = extractOpportunityInputFromNormalizedProduct(normalized);
      const report = evaluateCanonicalOpportunity(oppInput);
      if (report.overallScore !== null) {
        normalized.opportunityScore = {
          score: report.overallScore,
          confidence: report.confidenceScore,
          tier: report.tier,
          verdict: report.verdictLabel,
          verdictVariant: report.verdictVariant,
          availableSignals: report.signals.available.map((s) => s.id),
          unavailableSignals: report.signals.unavailable.map((s) => s.id),
        };
      }

      return {
        id: `obs:${request.marketplace}:${p.listingExternalId}:${p.createdAt.toISOString()}`,
        data: normalized,
        metadata: {
          sourceType: "HISTORICAL_OBSERVATION",
          sourceIdentifier: "sellersalt:db:prospect",
          marketplace: request.marketplace,
          observedAt: p.createdAt,
          provenance: "ACTUAL_DATA" as SignalProvenance,
          confidenceScore: report.confidenceScore,
          isHistorical: true,
        },
      };
    });
  } catch {
    // If DB read fails (e.g. disconnected in unit test without DB mock), degrade cleanly
    return [];
  }
}

/**
 * Main Source-Agnostic Product Research Acquisition Orchestrator.
 * 
 * Attempts live acquisition via registered connectors, and automatically
 * falls back to verified historical SellerSalt observations when live APIs
 * are unconfigured or unavailable.
 */
export async function acquireProductObservations(
  request: AcquisitionRequest
): Promise<AcquisitionResult<NormalizedProduct>> {
  registerAllConnectors();
  const generatedAt = new Date();
  const sourcesAttempted: DataSourceType[] = [];
  const sourcesSucceeded: DataSourceType[] = [];

  const connector = MarketplaceRegistry.tryGetConnector(request.marketplace);

  if (!connector) {
    return {
      marketplace: request.marketplace,
      status: "NOT_IMPLEMENTED",
      observations: [],
      products: [],
      sourcesAttempted,
      sourcesSucceeded,
      hasLiveCoverage: false,
      hasHistoricalCoverage: false,
      message: `Unknown marketplace '${request.marketplace}'.`,
      generatedAt,
    };
  }

  const preferredSources = request.preferredSources || ["PUBLIC_WEB", "MARKETPLACE_API", "HISTORICAL_OBSERVATION"];

  let publicObservations: NormalizedProduct[] = [];
  let apiObservations: NormalizedProduct[] = [];

  // 1. Attempt PUBLIC_WEB acquisition if preferred
  if (preferredSources.includes("PUBLIC_WEB")) {
    sourcesAttempted.push("PUBLIC_WEB");
    try {
      const publicAdapter = MarketplaceRegistry.tryGetPublicWebAdapter(request.marketplace);

      if (publicAdapter) {
        const publicRes = await publicAdapter.searchPublicProducts({
          query: request.query || request.keywords?.[0] || "",
          limit: request.limit,
          organizationId: request.organizationId,
        });

        if (publicRes.success && publicRes.items.length > 0) {
          sourcesSucceeded.push("PUBLIC_WEB");
          publicObservations = publicRes.items;
        }
      }
    } catch {
      // Fall through to secondary acquisition strategies
    }
  }

  // 2. Attempt OFFICIAL MARKETPLACE API if preferred and connector claims research capability
  if (preferredSources.includes("MARKETPLACE_API") && connector.capabilities.research && connector.searchProducts) {
    sourcesAttempted.push("MARKETPLACE_API");

    try {
      const researchQuery: MarketplaceResearchQuery = {
        keywords: request.keywords ?? (request.query ? [request.query] : []),
        limit: request.limit ?? 25,
        minPrice: request.minPrice,
        maxPrice: request.maxPrice,
        organizationId: request.organizationId,
      };

      const liveProducts = await connector.searchProducts(researchQuery);
      if (liveProducts && liveProducts.length > 0) {
        sourcesSucceeded.push("MARKETPLACE_API");
        apiObservations = liveProducts.map((p) => {
          p.acquisitionMethod = "MARKETPLACE_API";
          p.observedAt = generatedAt;
          p.isHistorical = false;
          return p;
        });
      }
    } catch {
      // Live API failed, continue to fallback or use public observations
    }
  }

  // 3. Merge observations if both sources returned data
  let finalProducts: NormalizedProduct[] = [];
  if (publicObservations.length > 0 && apiObservations.length > 0) {
    const { mergeProductObservations } = await import("./acquisition/merger");
    const apiMap = new Map<string, NormalizedProduct>();
    for (const ap of apiObservations) {
      apiMap.set(ap.externalId, ap);
    }

    finalProducts = publicObservations.map((pub) => {
      const matchingApi = apiMap.get(pub.externalId);
      const merged = mergeProductObservations(pub, matchingApi);
      return merged.product;
    });
  } else if (publicObservations.length > 0) {
    finalProducts = publicObservations;
  } else if (apiObservations.length > 0) {
    finalProducts = apiObservations;
  }

  // If live products were acquired, format and return them
  if (finalProducts.length > 0) {
    // Asynchronously record into postgres historical observations without blocking response
    const { persistPublicProductObservations } = await import("./acquisition/persistence");
    persistPublicProductObservations(finalProducts, {
      organizationId: request.organizationId,
      searchQuery: request.query || request.keywords?.[0],
      marketplace: request.marketplace,
    }).catch(() => {});

    const observations: Array<NormalizedObservation<NormalizedProduct>> = finalProducts.map((p) => {
      const oppInput = extractOpportunityInputFromNormalizedProduct(p);
      const report = evaluateCanonicalOpportunity(oppInput);
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

      return {
        id: `obs:${p.marketplace}:${p.externalId}:${generatedAt.toISOString()}`,
        data: p,
        metadata: {
          sourceType: p.acquisitionMethod || "PUBLIC_WEB",
          sourceIdentifier: `${p.marketplace}:${p.acquisitionMethod === "MARKETPLACE_API" ? "api" : "public_web"}`,
          marketplace: p.marketplace,
          observedAt: generatedAt,
          provenance: p.source || "ACTUAL_DATA",
          confidenceScore: p.opportunityScore?.confidence ?? report.confidenceScore,
          isHistorical: false,
        },
      };
    });

    return {
      marketplace: request.marketplace,
      status: "AVAILABLE",
      observations,
      products: observations.map((o) => o.data),
      sourcesAttempted,
      sourcesSucceeded,
      hasLiveCoverage: true,
      hasHistoricalCoverage: false,
      generatedAt,
    };
  }

  // 4. Attempt HISTORICAL OBSERVATIONS from database
  if (preferredSources.includes("HISTORICAL_OBSERVATION") && request.allowHistoricalFallback !== false) {
    sourcesAttempted.push("HISTORICAL_OBSERVATION");
    const historical = await acquireHistoricalProductObservations(request);

    if (historical.length > 0) {
      sourcesSucceeded.push("HISTORICAL_OBSERVATION");
      return {
        marketplace: request.marketplace,
        status: "AVAILABLE",
        observations: historical,
        products: historical.map((o) => o.data),
        sourcesAttempted,
        sourcesSucceeded,
        hasLiveCoverage: false,
        hasHistoricalCoverage: true,
        message: `Live ${connector.displayName} acquisition unavailable; serving verified historical SellerSalt observations.`,
        generatedAt,
      };
    }
  }

  // If connector is purely architecture-ready (e.g. Amazon, eBay, Walmart, TikTok Shop)
  if (!connector.capabilities.research) {
    const isPartial = Object.values(connector.capabilities).some(Boolean);
    return {
      marketplace: request.marketplace,
      status: isPartial ? "PARTIAL" : "NOT_IMPLEMENTED",
      observations: [],
      products: [],
      sourcesAttempted,
      sourcesSucceeded,
      hasLiveCoverage: false,
      hasHistoricalCoverage: false,
      message: `${connector.displayName} public research is not available yet.`,
      generatedAt,
    };
  }

  // All acquisition strategies failed
  return {
    marketplace: request.marketplace,
    status: "UNAVAILABLE",
    observations: [],
    products: [],
    sourcesAttempted,
    sourcesSucceeded,
    hasLiveCoverage: false,
    hasHistoricalCoverage: false,
    message: `${connector.displayName} research failed across all available acquisition channels.`,
    generatedAt,
  };
}
