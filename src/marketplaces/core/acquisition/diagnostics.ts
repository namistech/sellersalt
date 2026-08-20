/**
 * SellerSalt Public Acquisition Diagnostics Engine
 * 
 * Provides end-to-end diagnostic tracing for public marketplace acquisition runs,
 * parser execution, normalization steps, cache state, and source health without leaking credentials.
 */

import type { MarketplaceId } from "../types";
import { MarketplaceRegistry, registerAllConnectors } from "../registry";
import { globalPageFetcher } from "./index";
import { SourceHealthTracker } from "./source-health";
import { ResearchCache } from "./research-cache";

export interface DiagnosticStep {
  step: string;
  status: "OK" | "WARNING" | "FAILED" | "SKIPPED";
  durationMs: number;
  details?: Record<string, any>;
  message?: string;
}

export interface AcquisitionDiagnosticsReport {
  marketplace: MarketplaceId;
  query: string;
  timestamp: Date;
  overallStatus: "HEALTHY" | "DEGRADED" | "RESTRICTED" | "UNAVAILABLE";
  steps: DiagnosticStep[];
  sourceHealth: any;
  cacheStatus: "HIT" | "MISS" | "BYPASSED";
  totalDurationMs: number;
}

export async function runAcquisitionDiagnostics(params: {
  marketplace: MarketplaceId;
  query: string;
  type?: "PRODUCT" | "KEYWORD" | "SHOP" | "CATEGORY";
}): Promise<AcquisitionDiagnosticsReport> {
  registerAllConnectors();
  const startTime = Date.now();
  const steps: DiagnosticStep[] = [];
  const { marketplace, query } = params;

  // Step 1: Adapter Resolution
  const s1Start = Date.now();
  const publicAdapter = MarketplaceRegistry.tryGetPublicWebAdapter(marketplace);
  const connector = MarketplaceRegistry.tryGetConnector(marketplace);

  if (!publicAdapter) {
    steps.push({
      step: "ADAPTER_RESOLUTION",
      status: "FAILED",
      durationMs: Date.now() - s1Start,
      message: `No public web adapter registered for ${marketplace}`,
    });
    return {
      marketplace,
      query,
      timestamp: new Date(),
      overallStatus: "UNAVAILABLE",
      steps,
      sourceHealth: null,
      cacheStatus: "MISS",
      totalDurationMs: Date.now() - startTime,
    };
  }

  steps.push({
    step: "ADAPTER_RESOLUTION",
    status: "OK",
    durationMs: Date.now() - s1Start,
    details: {
      adapter: publicAdapter.displayName,
      capabilities: publicAdapter.capabilities,
      officialConnectorAvailable: !!connector,
    },
  });

  // Step 2: Cache Inspection
  const s2Start = Date.now();
  const cacheKey = ResearchCache.buildKey({ marketplace, type: params.type || "PRODUCT", query });
  const cached = ResearchCache.get({ marketplace, type: params.type || "PRODUCT", query });
  const cacheStatus = cached ? "HIT" : "MISS";

  steps.push({
    step: "CACHE_INSPECTION",
    status: "OK",
    durationMs: Date.now() - s2Start,
    details: {
      cacheKey,
      cacheStatus,
      isCached: !!cached,
    },
  });

  // Step 3: Source Health Check
  const s3Start = Date.now();
  const health = await SourceHealthTracker.getHealth(marketplace, "PUBLIC_WEB");

  steps.push({
    step: "SOURCE_HEALTH",
    status: health?.status === "LIVE" ? "OK" : health?.status === "RATE_LIMITED" ? "WARNING" : "FAILED",
    durationMs: Date.now() - s3Start,
    details: {
      operationalStatus: health?.status || "UNKNOWN",
      successRate: health?.successRate ?? 100,
      avgLatencyMs: health?.avgLatencyMs ?? 0,
      failureCount: health?.failureCount ?? 0,
    },
  });

  // Step 4: Live Public Search Execution (Controlled)
  const s4Start = Date.now();
  let searchRes: any = null;
  try {
    searchRes = await publicAdapter.searchPublicProducts({ query, limit: 5 });
    steps.push({
      step: "PUBLIC_SEARCH_EXECUTION",
      status: searchRes.success ? "OK" : searchRes.failureReason === "ACCESS_RESTRICTED" ? "WARNING" : "FAILED",
      durationMs: Date.now() - s4Start,
      details: {
        success: searchRes.success,
        itemsFound: searchRes.items.length,
        sourceType: searchRes.sourceType,
        provenance: searchRes.provenance,
        statusCode: searchRes.statusCode,
        failureReason: searchRes.failureReason,
        error: searchRes.error,
      },
    });
  } catch (err: any) {
    steps.push({
      step: "PUBLIC_SEARCH_EXECUTION",
      status: "FAILED",
      durationMs: Date.now() - s4Start,
      message: err.message,
    });
  }

  // Step 5: Normalization & Lineage Verification
  const s5Start = Date.now();
  const items = searchRes?.items || [];
  const normalizedValid = items.every((p: any) => p.title && p.externalId && p.marketplace === marketplace);

  steps.push({
    step: "NORMALIZATION_LINEAGE",
    status: normalizedValid ? "OK" : "WARNING",
    durationMs: Date.now() - s5Start,
    details: {
      itemsEvaluated: items.length,
      allNormalizedValid: normalizedValid,
      hasOpportunityScores: items.some((p: any) => p.opportunityScore?.score !== null),
    },
  });

  const overallStatus = steps.some((s) => s.status === "FAILED")
    ? "UNAVAILABLE"
    : steps.some((s) => s.details?.failureReason === "ACCESS_RESTRICTED")
    ? "RESTRICTED"
    : steps.some((s) => s.status === "WARNING")
    ? "DEGRADED"
    : "HEALTHY";

  return {
    marketplace,
    query,
    timestamp: new Date(),
    overallStatus,
    steps,
    sourceHealth: health,
    cacheStatus,
    totalDurationMs: Date.now() - startTime,
  };
}
