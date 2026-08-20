/**
 * SellerSalt Operational Diagnostics & Reliability Engine
 * 
 * Provides production health metrics, acquisition telemetry aggregation,
 * stale research run recovery, and sanitized log introspection for operations & support.
 */

import { prisma } from "@/lib/db";
import { StructuredLogger, LogEntry } from "@/lib/observability/structured-logger";
import { SourceHealthTracker } from "@/marketplaces/core/acquisition/source-health";
import { ParserHealthEngine } from "@/marketplaces/core/acquisition/parser-health";

export interface SystemHealthOverview {
  status: "HEALTHY" | "DEGRADED" | "CRITICAL";
  timestamp: string;
  uptimeSeconds: number;
  memoryUsageMb: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
  };
  counts: {
    totalOrganizations: number;
    activeSubscriptions: number;
    totalResearchRuns: number;
    totalObservations: number;
  };
  databaseLatencyMs: number;
}

export interface StaleRunRecoveryReport {
  scannedAt: Date;
  staleCount: number;
  recoveredCount: number;
  recoveredRunIds: string[];
}

export class OperationalDiagnosticsService {
  /**
   * Retrieves high-level operational system health without exposing sensitive credentials.
   */
  public static async getSystemHealthOverview(): Promise<SystemHealthOverview> {
    const startDb = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const databaseLatencyMs = Date.now() - startDb;

    const [totalOrgs, activeSubs, totalRuns, totalObservations] = await Promise.all([
      prisma.organization.count(),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.researchRun.count(),
      prisma.productObservation.count(),
    ]);

    const mem = process.memoryUsage();
    const memoryUsageMb = {
      rss: Math.round(mem.rss / (1024 * 1024)),
      heapTotal: Math.round(mem.heapTotal / (1024 * 1024)),
      heapUsed: Math.round(mem.heapUsed / (1024 * 1024)),
    };

    const status: SystemHealthOverview["status"] =
      databaseLatencyMs > 1000 ? "DEGRADED" : "HEALTHY";

    return {
      status,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsageMb,
      counts: {
        totalOrganizations: totalOrgs,
        activeSubscriptions: activeSubs,
        totalResearchRuns: totalRuns,
        totalObservations,
      },
      databaseLatencyMs,
    };
  }

  /**
   * Finds and recovers research runs stuck in RUNNING state older than maxRunningAgeMinutes.
   */
  public static async recoverStaleResearchRuns(
    maxRunningAgeMinutes: number = 10
  ): Promise<StaleRunRecoveryReport> {
    const cutoff = new Date(Date.now() - maxRunningAgeMinutes * 60 * 1000);

    const staleRuns = await prisma.researchRun.findMany({
      where: {
        status: { in: ["RUNNING", "QUEUED"] },
        createdAt: { lt: cutoff },
      },
      select: { id: true, organizationId: true },
    });

    const recoveredRunIds: string[] = [];

    for (const run of staleRuns) {
      await prisma.researchRun.update({
        where: { id: run.id },
        data: {
          status: "TIMED_OUT",
          error: "Research run timed out after exceeding max execution window.",
          updatedAt: new Date(),
        },
      });
      recoveredRunIds.push(run.id);
    }

    return {
      scannedAt: new Date(),
      staleCount: staleRuns.length,
      recoveredCount: recoveredRunIds.length,
      recoveredRunIds,
    };
  }

  /**
   * Aggregates recent operational log telemetry.
   */
  public static getRecentLogs(limit: number = 50): LogEntry[] {
    return StructuredLogger.getRecentLogs({ limit });
  }
}
