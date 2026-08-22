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
import { SourcePolicyEnforcer } from "../governance/source-policy-enforcer";
import { SourceBoundary } from "../governance/source-boundary";
import { StructuredLogger } from "@/lib/observability/structured-logger";
import { CorrelationManager } from "@/lib/observability/correlation";

const acquisitionLogger = new StructuredLogger("acquisition-orchestrator");

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

/** Why a marketplace produced zero observations, distinct from a genuine
 * empty result — lets callers (API routes, UI) show an honest, actionable
 * message instead of an indistinguishable "no results found". Only set
 * when status is UNAVAILABLE/PARTIAL and at least one source actually
 * failed with a classifiable cause; a search that ran cleanly and simply
 * matched nothing leaves this undefined (see NO_RESULTS handling in
 * src/services/product-hunting.ts). */
export type AcquisitionUnavailableReason =
  | "REQUIRES_CREDENTIALS"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR"
  | "POLICY_RESTRICTED"
  | "PARSER_ERROR";

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
  unavailableReason?: AcquisitionUnavailableReason;
}

/** Classifies why acquisition failed from the raw HTTP status codes and
 * limitation strings collected while attempting each source — never from
 * item count alone, so a genuine zero-match search is never mistaken for
 * a credential/upstream/policy failure. `apiStatusCodes` (official,
 * credentialed connector calls) and `publicWebStatusCodes` (unauthenticated
 * public HTML fetches) are classified separately: a 401/403 from the
 * official API means our credentials were rejected, but the same status
 * from an anonymous public-web fetch means bot/anti-scraping protection
 * blocked the request — there are no "credentials" to fix there. */
function classifyUnavailableReason(
  apiStatusCodes: number[],
  publicWebStatusCodes: number[],
  limitations: string[],
  publicWebFailureReasons: string[] = []
): AcquisitionUnavailableReason | undefined {
  if (
    apiStatusCodes.some((c) => c === 401 || c === 403) ||
    limitations.some((l) => /REQUIRES_CREDENTIALS|credentials|App ID|Cert ID/i.test(l))
  ) {
    return "REQUIRES_CREDENTIALS";
  }
  if (
    apiStatusCodes.some((c) => c === 429) ||
    publicWebStatusCodes.some((c) => c === 429) ||
    publicWebFailureReasons.includes("RATE_LIMITED")
  ) {
    return "RATE_LIMITED";
  }
  if (apiStatusCodes.some((c) => c >= 500)) return "UPSTREAM_ERROR";
  // Matches SourcePolicyEnforcer's own generated wording ("... is
  // PROHIBITED/RESTRICTED by policy for <marketplace>") — deliberately not
  // a bare RESTRICTED/PROHIBITED substring match, since failure-reason
  // enum values like ACCESS_RESTRICTED also contain "RESTRICTED" without
  // meaning a SellerSalt governance policy decision.
  if (limitations.some((l) => /\bby policy\b/i.test(l))) {
    return "POLICY_RESTRICTED";
  }
  if (publicWebStatusCodes.some((c) => c === 403 || c >= 500)) return "UPSTREAM_ERROR";
  // The adapter got a real (usually 200) response but couldn't extract
  // recognizable listing data from it — e.g. the site served a page shape
  // its HTML/JSON-LD parser doesn't recognize. That's a parser failure,
  // not proof the marketplace genuinely has zero matching listings.
  if (
    publicWebFailureReasons.some((r) =>
      ["PARSE_FAILURE", "MALFORMED_RESPONSE", "UNSUPPORTED_PAGE", "NO_DATA"].includes(r)
    )
  ) {
    return "PARSER_ERROR";
  }
  // ACCESS_RESTRICTED means the target site itself blocked the request
  // (bot/CAPTCHA protection) — an upstream condition, not a SellerSalt
  // governance policy decision (that's already handled above via the
  // "policy"/PROHIBITED/RESTRICTED limitations check).
  if (publicWebFailureReasons.some((r) => ["ACCESS_RESTRICTED", "NETWORK_ERROR", "TIMEOUT"].includes(r))) {
    return "UPSTREAM_ERROR";
  }
  return undefined;
}

export interface OrchestratedProductResult {
  items: NormalizedProduct[];
  report: AcquisitionReport;
}

/** Multi-keyword search fans out at most this many keywords, one public-web
 * request each, to keep acquisition bounded and rate-limit-respectful — see
 * docs/PRODUCT-RESEARCH-DATA-CONTRACT.md §Multi-keyword semantics. */
export const MAX_FANOUT_KEYWORDS = 5;

/** Multi-keyword request field, threaded alongside the existing single
 * `query`. Semantics (documented, not silently changed): logical OR — each
 * keyword is searched independently and results are merged/deduplicated by
 * (marketplace, externalId), keeping the FIRST keyword that produced a
 * given item as its `keyword` provenance field. `query` alone (no
 * `keywords`, or a single-entry `keywords`) behaves exactly as before this
 * batch — this is strictly additive. */
export interface MultiKeywordSearchQuery extends PublicSearchQuery {
  keywords?: string[];
}

/** Resolves the ordered, deduplicated, bounded list of keywords a request
 * should search — `request.keywords` when it has real entries, else the
 * single `request.query`. Never silently drops the primary `query`.
 * Exported (Batch 40) so Keyword Research's own multi-keyword fanout
 * (src/services/keyword-research.ts) reuses this exact bounding/dedup
 * logic instead of a second implementation. */
export function resolveSearchKeywords(request: { query?: string; keywords?: string[] }): string[] {
  const fromArray = (request.keywords || [])
    .map((k) => (k || "").trim())
    .filter((k) => k.length > 0);

  if (fromArray.length === 0) {
    const single = (request.query || "").trim();
    return single ? [single] : [];
  }

  const deduped = Array.from(new Set(fromArray.map((k) => k.toLowerCase()))).map(
    (lower) => fromArray.find((k) => k.toLowerCase() === lower)!
  );
  return deduped.slice(0, MAX_FANOUT_KEYWORDS);
}

/**
 * Orchestrates product search across public web, official API, and historical observations.
 */
export async function orchestrateProductResearch(
  request: MultiKeywordSearchQuery & { marketplace: MarketplaceId },
  customPolicy?: Partial<ResearchSourcePolicy>
): Promise<OrchestratedProductResult> {
  const acquisitionStartedAt = Date.now();
  const correlationId = CorrelationManager.generateId("acq");
  registerAllConnectors();
  const policy: ResearchSourcePolicy = { ...DEFAULT_SOURCE_POLICY, ...customPolicy };
  const preferredSources = policy.preferredSources || DEFAULT_SOURCE_POLICY.preferredSources!;

  const sourcesAttempted: DataSourceType[] = [];
  const sourcesSucceeded: DataSourceType[] = [];
  const sourcesFailed: DataSourceType[] = [];
  const limitations: string[] = [];
  // Tracked separately from publicWebStatusCodes: a 401/403 from an
  // official, credentialed API call means "our credentials were rejected"
  // (REQUIRES_CREDENTIALS). A 403 from an unauthenticated public web fetch
  // means "the site's bot protection blocked us" — not a credentials
  // problem, since public HTML has no credentials to begin with.
  const apiStatusCodes: number[] = [];
  const publicWebStatusCodes: number[] = [];
  const publicWebFailureReasons: string[] = [];

  let publicObservations: NormalizedProduct[] = [];
  let apiObservations: NormalizedProduct[] = [];
  let historicalObservations: NormalizedProduct[] = [];

  // 1. Attempt PUBLIC_WEB if preferred and allowed by data policy
  if (preferredSources.includes("PUBLIC_WEB")) {
    const policyDecision = SourcePolicyEnforcer.evaluateRequest({
      organizationId: request.organizationId,
      marketplace: request.marketplace,
      sourceType: "PUBLIC_WEB",
      purpose: "PRODUCT_SEARCH",
    });

    if (policyDecision.allowed) {
      sourcesAttempted.push("PUBLIC_WEB");
      const publicAdapter = MarketplaceRegistry.tryGetPublicWebAdapter(request.marketplace);

      if (publicAdapter) {
        // Multi-keyword OR fanout: bounded, one request per keyword,
        // merged/deduped by externalId. A single-keyword request (the
        // common case, and every pre-Batch-38 caller) makes exactly the
        // same one request it always did.
        const keywords = resolveSearchKeywords(request);
        const seenExternalIds = new Set<string>();
        const fannedOutItems: NormalizedProduct[] = [];
        let anySucceeded = false;
        let lastFailure: PublicAcquisitionResult<NormalizedProduct> | null = null;

        try {
          for (const kw of keywords) {
            const res = await publicAdapter.searchPublicProducts({ ...request, query: kw });
            if (res.success && res.items.length > 0) {
              anySucceeded = true;
              for (const item of res.items) {
                if (seenExternalIds.has(item.externalId)) continue;
                seenExternalIds.add(item.externalId);
                fannedOutItems.push({ ...item, keyword: item.keyword ?? kw });
              }
            } else {
              lastFailure = res;
            }
          }

          if (anySucceeded) {
            sourcesSucceeded.push("PUBLIC_WEB");
            publicObservations = fannedOutItems;
          } else {
            sourcesFailed.push("PUBLIC_WEB");
            if (lastFailure?.error) limitations.push(lastFailure.error);
            if (typeof lastFailure?.statusCode === "number") publicWebStatusCodes.push(lastFailure.statusCode);
            if (lastFailure?.failureReason) {
              publicWebFailureReasons.push(lastFailure.failureReason);
              limitations.push(`Public web response could not be used (${lastFailure.failureReason}).`);
            }
          }
        } catch (err: any) {
          sourcesFailed.push("PUBLIC_WEB");
          limitations.push(`Public web fetch error: ${err.message}`);
          if (typeof err.statusCode === "number") publicWebStatusCodes.push(err.statusCode);
        }
      } else {
        sourcesFailed.push("PUBLIC_WEB");
      }
    } else {
      limitations.push(`Public web research is ${policyDecision.status} by policy for ${request.marketplace}.`);
    }
  }

  // 2. Attempt MARKETPLACE_API if preferred or public web yielded no items
  if (
    preferredSources.includes("MARKETPLACE_API") &&
    (publicObservations.length === 0 || policy.enableMultiSourceEnrichment)
  ) {
    sourcesAttempted.push("MARKETPLACE_API");

    if (request.marketplace === "ebay") {
      try {
        const { searchEbayBrowseProducts } = await import("@/services/ebay-browse-api");
        const browseRes = await searchEbayBrowseProducts({
          query: request.query,
          keywords: resolveSearchKeywords(request),
          limit: request.limit,
          minPrice: request.minPrice,
          maxPrice: request.maxPrice,
          organizationId: request.organizationId,
        });

        if (browseRes.available && browseRes.items.length > 0) {
          sourcesSucceeded.push("MARKETPLACE_API");
          apiObservations = browseRes.items;
        } else if (!browseRes.available) {
          sourcesFailed.push("MARKETPLACE_API");
          limitations.push(browseRes.message || "eBay Browse API is unavailable.");
          if (browseRes.reason === "REQUIRES_CREDENTIALS") {
            apiStatusCodes.push(401);
          }
        } else {
          sourcesFailed.push("MARKETPLACE_API");
        }
      } catch (err: any) {
        sourcesFailed.push("MARKETPLACE_API");
        limitations.push(`eBay Browse API error: ${err.message}`);
        if (typeof err.statusCode === "number") apiStatusCodes.push(err.statusCode);
      }
    } else {
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
          if (typeof err.statusCode === "number") apiStatusCodes.push(err.statusCode);
        }
      } else {
        sourcesFailed.push("MARKETPLACE_API");
      }
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
      const connectorType = request.marketplace.toUpperCase();
      const validConnectorTypes = ["ETSY", "AMAZON", "EBAY", "SHOPIFY", "WOOCOMMERCE"];

      if (validConnectorTypes.includes(connectorType) && request.organizationId) {
        // Same OR semantics as the live PUBLIC_WEB fanout (§ Multi-keyword
        // semantics) — a historical fallback match against any requested
        // keyword counts, not just the first.
        const historicalKeywords = resolveSearchKeywords(request);
        const historicalRecords = await prisma.prospect.findMany({
          where: {
            organizationId: request.organizationId,
            marketplace: connectorType as any,
            ...(historicalKeywords.length > 0
              ? {
                  OR: historicalKeywords.map((kw) => ({
                    listingTitle: { contains: kw, mode: "insensitive" as const },
                  })),
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
      } else {
        sourcesFailed.push("HISTORICAL_OBSERVATION");
      }
    } catch {
      sourcesFailed.push("HISTORICAL_OBSERVATION");
    }
  }

  // 3.5. Price filtering — request.minPrice/maxPrice were already accepted
  // by the API contract and threaded all the way here, but nothing ever
  // actually applied them (confirmed during Batch 37: a search with
  // minPrice/maxPrice set returned an unfiltered result set, HTTP 200,
  // with no indication the filter had been silently ignored). Only
  // excludes items with a real OBSERVED price outside the range — an
  // item whose price is genuinely UNAVAILABLE (`null`) is never treated
  // as if it were $0 or excluded by a min/max bound it was never actually
  // measured against.
  if (typeof request.minPrice === "number" || typeof request.maxPrice === "number") {
    const beforeCount = mergedProducts.length;
    mergedProducts = mergedProducts.filter((p) => {
      if (p.price === null || p.price === undefined) return true;
      if (typeof request.minPrice === "number" && p.price < request.minPrice) return false;
      if (typeof request.maxPrice === "number" && p.price > request.maxPrice) return false;
      return true;
    });
    const excluded = beforeCount - mergedProducts.length;
    if (excluded > 0) {
      limitations.push(`${excluded} observation(s) excluded outside the requested price range.`);
    }
  }

  // 3.6. Review-count filtering (Batch 38) — same unavailable-safe policy
  // as price above: a genuinely unobserved reviewCount is never excluded
  // and never treated as 0.
  if (typeof request.minReviews === "number" || typeof request.maxReviews === "number") {
    const beforeCount = mergedProducts.length;
    mergedProducts = mergedProducts.filter((p) => {
      if (p.reviewCount === null || p.reviewCount === undefined) return true;
      if (typeof request.minReviews === "number" && p.reviewCount < request.minReviews) return false;
      if (typeof request.maxReviews === "number" && p.reviewCount > request.maxReviews) return false;
      return true;
    });
    const excluded = beforeCount - mergedProducts.length;
    if (excluded > 0) {
      limitations.push(`${excluded} observation(s) excluded outside the requested review-count range.`);
    }
  }

  // 3.7. Rating filtering (Batch 38) — same unavailable-safe policy.
  if (typeof request.minRating === "number" || typeof request.maxRating === "number") {
    const beforeCount = mergedProducts.length;
    mergedProducts = mergedProducts.filter((p) => {
      if (p.rating === null || p.rating === undefined) return true;
      if (typeof request.minRating === "number" && p.rating < request.minRating) return false;
      if (typeof request.maxRating === "number" && p.rating > request.maxRating) return false;
      return true;
    });
    const excluded = beforeCount - mergedProducts.length;
    if (excluded > 0) {
      limitations.push(`${excluded} observation(s) excluded outside the requested rating range.`);
    }
  }

  // 4.5. Compute Canonical Opportunity Scores for all observations
  for (const prod of mergedProducts) {
    if (!prod.opportunityScore) {
      try {
        const oppInput = extractOpportunityInputFromNormalizedProduct(prod);
        const report = evaluateCanonicalOpportunity(oppInput);
        if (report.overallScore !== null) {
          prod.opportunityScore = {
            score: report.overallScore,
            confidence: report.confidenceScore,
            tier: report.tier,
            verdict: report.verdictLabel,
            verdictVariant: report.verdictVariant,
            availableSignals: report.signals.available.map((s) => s.id),
            unavailableSignals: report.signals.unavailable.map((s) => s.id),
          };
        }
      } catch {
        // Non-blocking scoring
      }
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

  const unavailableReason =
    mergedProducts.length === 0
      ? classifyUnavailableReason(apiStatusCodes, publicWebStatusCodes, limitations, publicWebFailureReasons)
      : undefined;

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
    unavailableReason,
  };

  // Safe, structured acquisition telemetry — never logs credentials/tokens
  // (StructuredLogger.redactSensitive strips anything under a
  // secret/token/key-shaped key), only counts and classifications. This is
  // the "first zero" trace: which source(s) were attempted, which
  // succeeded/failed, and why — so a real failure never has to be
  // re-diagnosed by hand the way this batch's investigation started.
  acquisitionLogger.info("product_research_acquisition", {
    correlationId,
    organizationId: request.organizationId,
    durationMs: Date.now() - acquisitionStartedAt,
    metadata: {
      marketplace: request.marketplace,
      queryLength: request.query?.length ?? 0,
      status: report.status,
      unavailableReason: report.unavailableReason,
      sourcesAttempted: report.sourcesAttempted,
      sourcesSucceeded: report.sourcesSucceeded,
      sourcesFailed: report.sourcesFailed,
      requestedLimit: request.limit,
      itemCount: report.itemCount,
    },
  });

  return {
    items: SourceBoundary.sanitizeProducts(mergedProducts),
    report,
  };
}

/**
 * Orchestrates individual product detail resolution across Public Web, Official API,
 * and Historical Database records.
 */
export async function orchestrateProductDetail(
  externalIdOrUrl: string,
  marketplace: MarketplaceId,
  customPolicy?: Partial<ResearchSourcePolicy>,
  organizationId?: string
): Promise<{ product: NormalizedProduct | null; report: AcquisitionReport }> {
  registerAllConnectors();
  const policy: ResearchSourcePolicy = { ...DEFAULT_SOURCE_POLICY, ...customPolicy };
  const preferredSources = policy.preferredSources || DEFAULT_SOURCE_POLICY.preferredSources!;

  const sourcesAttempted: DataSourceType[] = [];
  const sourcesSucceeded: DataSourceType[] = [];
  const sourcesFailed: DataSourceType[] = [];
  const limitations: string[] = [];
  const apiStatusCodes: number[] = [];
  const publicWebStatusCodes: number[] = [];
  const publicWebFailureReasons: string[] = [];

  let publicObservation: NormalizedProduct | null = null;
  let apiObservation: NormalizedProduct | null = null;
  let historicalObservation: NormalizedProduct | null = null;

  // 1. Attempt PUBLIC_WEB
  if (preferredSources.includes("PUBLIC_WEB")) {
    sourcesAttempted.push("PUBLIC_WEB");
    const publicAdapter = MarketplaceRegistry.tryGetPublicWebAdapter(marketplace);

    if (publicAdapter && publicAdapter.capabilities.productDetail) {
      try {
        const res = await publicAdapter.fetchPublicProduct(externalIdOrUrl);
        if (res.success && res.items.length > 0) {
          sourcesSucceeded.push("PUBLIC_WEB");
          publicObservation = res.items[0];
        } else {
          sourcesFailed.push("PUBLIC_WEB");
          if (res.error) limitations.push(res.error);
          if (typeof res.statusCode === "number") publicWebStatusCodes.push(res.statusCode);
          if (res.failureReason) publicWebFailureReasons.push(res.failureReason);
        }
      } catch (err: any) {
        sourcesFailed.push("PUBLIC_WEB");
        limitations.push(`Public web product detail error: ${err.message}`);
        if (typeof err.statusCode === "number") publicWebStatusCodes.push(err.statusCode);
      }
    } else {
      sourcesFailed.push("PUBLIC_WEB");
    }
  }

  // 2. Attempt MARKETPLACE_API if preferred or public web yielded no item
  if (
    preferredSources.includes("MARKETPLACE_API") &&
    (!publicObservation || policy.enableMultiSourceEnrichment)
  ) {
    sourcesAttempted.push("MARKETPLACE_API");
    const connector = MarketplaceRegistry.tryGetConnector(marketplace);

    if (connector && connector.capabilities.research && connector.searchProducts) {
      try {
        const results = await connector.searchProducts({
          keywords: [externalIdOrUrl],
          limit: 1,
        });
        if (results && results.length > 0) {
          sourcesSucceeded.push("MARKETPLACE_API");
          apiObservation = results[0];
        } else {
          sourcesFailed.push("MARKETPLACE_API");
        }
      } catch (err: any) {
        sourcesFailed.push("MARKETPLACE_API");
        limitations.push(`Official API connector error: ${err.message}`);
        if (typeof err.statusCode === "number") apiStatusCodes.push(err.statusCode);
      }
    } else {
      sourcesFailed.push("MARKETPLACE_API");
    }
  }

  // 3. Merge or fallback
  let finalProduct: NormalizedProduct | null = null;
  if (publicObservation && apiObservation) {
    const merged = mergeProductObservations(publicObservation, apiObservation);
    finalProduct = merged.product;
  } else if (publicObservation) {
    finalProduct = publicObservation;
  } else if (apiObservation) {
    finalProduct = apiObservation;
  }

  // 4. Tertiary Fallback: HISTORICAL_OBSERVATION
  if (!finalProduct && policy.allowHistoricalFallback && organizationId) {
    sourcesAttempted.push("HISTORICAL_OBSERVATION");
    try {
      const connectorType = marketplace.toUpperCase() as any;
      const rec = await prisma.prospect.findFirst({
        where: {
          organizationId,
          marketplace: connectorType,
          OR: [
            { listingExternalId: externalIdOrUrl },
            { listingUrl: externalIdOrUrl },
          ],
        },
        orderBy: { createdAt: "desc" },
      });

      if (rec) {
        sourcesSucceeded.push("HISTORICAL_OBSERVATION");
        historicalObservation = {
          marketplace,
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

        const oppInput = extractOpportunityInputFromNormalizedProduct(historicalObservation);
        const report = evaluateCanonicalOpportunity(oppInput);
        if (report.overallScore !== null) {
          historicalObservation.opportunityScore = {
            score: report.overallScore,
            confidence: report.confidenceScore,
            tier: report.tier,
            verdict: report.verdictLabel,
            verdictVariant: report.verdictVariant,
            availableSignals: report.signals.available.map((s) => s.id),
            unavailableSignals: report.signals.unavailable.map((s) => s.id),
          };
        }

        finalProduct = historicalObservation;
      } else {
        sourcesFailed.push("HISTORICAL_OBSERVATION");
      }
    } catch {
      sourcesFailed.push("HISTORICAL_OBSERVATION");
    }
  }

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

  const observationTimestamp = finalProduct?.capturedAt || new Date();
  const freshness = evaluateFreshness(
    observationTimestamp,
    "general",
    primarySourceUsed === "HISTORICAL_OBSERVATION"
  );

  if (finalProduct?.opportunityScore && freshness.confidencePenalty > 0) {
    finalProduct.opportunityScore.confidence = Math.max(
      10,
      finalProduct.opportunityScore.confidence - freshness.confidencePenalty
    );
  }

  const connector = MarketplaceRegistry.tryGetConnector(marketplace);
  const publicAdapter = MarketplaceRegistry.tryGetPublicWebAdapter(marketplace);

  let status: "AVAILABLE" | "PARTIAL" | "UNAVAILABLE" | "NOT_IMPLEMENTED";
  if (finalProduct) {
    status = "AVAILABLE";
  } else if (connector?.capabilities.research || connector?.capabilities.readListings || publicAdapter?.capabilities.productDetail) {
    status = "UNAVAILABLE";
  } else if (connector && Object.values(connector.capabilities).some(Boolean)) {
    status = "PARTIAL";
  } else {
    status = "NOT_IMPLEMENTED";
  }

  const report: AcquisitionReport = {
    marketplace,
    status,
    sourcesAttempted,
    sourcesSucceeded,
    sourcesFailed,
    primarySourceUsed,
    fallbackUsed,
    observationTimestamp,
    freshness,
    confidenceScore: finalProduct?.opportunityScore?.confidence ?? 0,
    itemCount: finalProduct ? 1 : 0,
    message: finalProduct
      ? `Successfully acquired product detail from ${sourcesSucceeded.join(" + ")} (${freshness.status}).`
      : `Product detail unavailable for "${externalIdOrUrl}" on ${marketplace}.`,
    limitations,
    unavailableReason: finalProduct
      ? undefined
      : classifyUnavailableReason(apiStatusCodes, publicWebStatusCodes, limitations, publicWebFailureReasons),
  };

  return {
    product: finalProduct,
    report,
  };
}

