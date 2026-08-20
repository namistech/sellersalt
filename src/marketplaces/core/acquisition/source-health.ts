/**
 * SellerSalt Acquisition Source Health Engine
 * 
 * Tracks real-time availability, latency, rate limits, and access restrictions
 * per marketplace and data source to feed intelligent source orchestration.
 */

import { prisma } from "@/lib/db";
import type { MarketplaceId } from "../types";
import type { DataSourceType } from "./contracts";

export interface SourceHealthStatus {
  marketplace: string;
  sourceType: string;
  status: "LIVE" | "ACCESS_RESTRICTED" | "RATE_LIMITED" | "UNAVAILABLE";
  successCount: number;
  failureCount: number;
  successRate: number;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  lastFailureReason: string | null;
  avgLatencyMs: number;
}

// In-memory fast cache for active tracking
const inMemoryHealth = new Map<string, SourceHealthStatus>();

function getHealthKey(marketplace: string, sourceType: string): string {
  return `${marketplace.toLowerCase()}:${sourceType.toUpperCase()}`;
}

export class SourceHealthTracker {
  /**
   * Records a data acquisition attempt (success or failure) with latency and error reason.
   */
  public static async recordAttempt(params: {
    marketplace: MarketplaceId | string;
    sourceType: DataSourceType | string;
    success: boolean;
    latencyMs: number;
    failureReason?: string;
  }): Promise<SourceHealthStatus> {
    const key = getHealthKey(params.marketplace, params.sourceType);
    const now = new Date();

    let entry = inMemoryHealth.get(key);
    if (!entry) {
      entry = {
        marketplace: params.marketplace.toLowerCase(),
        sourceType: params.sourceType.toUpperCase(),
        status: "LIVE",
        successCount: 0,
        failureCount: 0,
        successRate: 100,
        lastSuccessAt: null,
        lastFailureAt: null,
        lastFailureReason: null,
        avgLatencyMs: 0,
      };
    }

    if (params.success) {
      entry.successCount++;
      entry.lastSuccessAt = now;
      entry.status = "LIVE";
    } else {
      entry.failureCount++;
      entry.lastFailureAt = now;
      entry.lastFailureReason = params.failureReason || "UNKNOWN_ERROR";

      if (params.failureReason === "ACCESS_RESTRICTED" || params.failureReason?.includes("403")) {
        entry.status = "ACCESS_RESTRICTED";
      } else if (params.failureReason === "RATE_LIMITED" || params.failureReason?.includes("429")) {
        entry.status = "RATE_LIMITED";
      } else {
        entry.status = "UNAVAILABLE";
      }
    }

    const total = entry.successCount + entry.failureCount;
    entry.successRate = total > 0 ? Math.round((entry.successCount / total) * 100) : 100;
    entry.avgLatencyMs = Math.round(
      (entry.avgLatencyMs * (total - 1) + params.latencyMs) / total
    );

    inMemoryHealth.set(key, entry);

    // Asynchronously persist to database if available
    try {
      await prisma.acquisitionSourceHealth.upsert({
        where: {
          marketplace_sourceType: {
            marketplace: entry.marketplace,
            sourceType: entry.sourceType,
          },
        },
        update: {
          status: entry.status,
          successCount: entry.successCount,
          failureCount: entry.failureCount,
          lastSuccessAt: entry.lastSuccessAt,
          lastFailureAt: entry.lastFailureAt,
          lastFailureReason: entry.lastFailureReason,
          avgLatencyMs: entry.avgLatencyMs,
        },
        create: {
          marketplace: entry.marketplace,
          sourceType: entry.sourceType,
          status: entry.status,
          successCount: entry.successCount,
          failureCount: entry.failureCount,
          lastSuccessAt: entry.lastSuccessAt,
          lastFailureAt: entry.lastFailureAt,
          lastFailureReason: entry.lastFailureReason,
          avgLatencyMs: entry.avgLatencyMs,
        },
      });
    } catch {
      // Non-blocking in case DB is offline/testing
    }

    return entry;
  }

  /**
   * Retrieves health status for a specific marketplace and source type.
   */
  public static async getHealth(
    marketplace: MarketplaceId | string,
    sourceType: DataSourceType | string
  ): Promise<SourceHealthStatus> {
    const key = getHealthKey(marketplace, sourceType);
    const cached = inMemoryHealth.get(key);
    if (cached) return cached;

    try {
      const dbRow = await prisma.acquisitionSourceHealth.findUnique({
        where: {
          marketplace_sourceType: {
            marketplace: marketplace.toLowerCase(),
            sourceType: sourceType.toUpperCase(),
          },
        },
      });

      if (dbRow) {
        const total = dbRow.successCount + dbRow.failureCount;
        const entry: SourceHealthStatus = {
          marketplace: dbRow.marketplace,
          sourceType: dbRow.sourceType,
          status: dbRow.status as any,
          successCount: dbRow.successCount,
          failureCount: dbRow.failureCount,
          successRate: total > 0 ? Math.round((dbRow.successCount / total) * 100) : 100,
          lastSuccessAt: dbRow.lastSuccessAt,
          lastFailureAt: dbRow.lastFailureAt,
          lastFailureReason: dbRow.lastFailureReason,
          avgLatencyMs: dbRow.avgLatencyMs,
        };
        inMemoryHealth.set(key, entry);
        return entry;
      }
    } catch {
      // Return default
    }

    return {
      marketplace: marketplace.toLowerCase(),
      sourceType: sourceType.toUpperCase(),
      status: "LIVE",
      successCount: 0,
      failureCount: 0,
      successRate: 100,
      lastSuccessAt: null,
      lastFailureAt: null,
      lastFailureReason: null,
      avgLatencyMs: 0,
    };
  }

  /**
   * Retrieves health status across all registered sources.
   */
  public static async getAllHealth(): Promise<SourceHealthStatus[]> {
    const knownMarketplaces = ["etsy", "amazon", "ebay", "walmart", "tiktok_shop"];
    const knownSources = ["PUBLIC_WEB", "MARKETPLACE_API", "HISTORICAL_OBSERVATION"];

    const results: SourceHealthStatus[] = [];
    for (const m of knownMarketplaces) {
      for (const s of knownSources) {
        results.push(await this.getHealth(m, s));
      }
    }
    return results;
  }
}
