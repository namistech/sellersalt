/**
 * SellerSalt Data Quality & Acquisition Diagnostics Service
 * 
 * Provides empirical data quality telemetry, acquisition success/failure metrics,
 * and observable signal coverage analysis without fabricated estimates.
 */

import { prisma } from "@/lib/db";

export interface MarketplaceQualityStats {
  marketplace: string;
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  successRatePct: number | "INSUFFICIENT_DATA";
}

export interface DataQualityReport {
  timestamp: string;
  totalResearchRuns: number;
  completedRuns: number;
  failedRuns: number;
  timedOutRuns: number;
  overallSuccessRatePct: number | "INSUFFICIENT_DATA";
  overallFailureRatePct: number | "INSUFFICIENT_DATA";
  averageDurationMs: number | "INSUFFICIENT_DATA";
  totalObservedProducts: number;
  marketplaceBreakdown: MarketplaceQualityStats[];
}

export class DataQualityService {
  /**
   * Generates a comprehensive Data Quality & Acquisition Diagnostics Report.
   */
  public static async generateReport(organizationId?: string): Promise<DataQualityReport> {
    const whereClause = organizationId ? { organizationId } : {};

    const [totalRuns, completedRuns, failedRuns, timedOutRuns, totalObservations, runs] = await Promise.all([
      prisma.researchRun.count({ where: whereClause }),
      prisma.researchRun.count({ where: { ...whereClause, status: "COMPLETED" } }),
      prisma.researchRun.count({ where: { ...whereClause, status: "FAILED" } }),
      prisma.researchRun.count({ where: { ...whereClause, status: "TIMED_OUT" } }),
      prisma.productObservation.count({ where: whereClause }),
      prisma.researchRun.findMany({
        where: whereClause,
        select: {
          marketplaces: true,
          status: true,
          durationMs: true,
        },
        take: 500,
      }),
    ]);

    if (totalRuns === 0) {
      return {
        timestamp: new Date().toISOString(),
        totalResearchRuns: 0,
        completedRuns: 0,
        failedRuns: 0,
        timedOutRuns: 0,
        overallSuccessRatePct: "INSUFFICIENT_DATA",
        overallFailureRatePct: "INSUFFICIENT_DATA",
        averageDurationMs: "INSUFFICIENT_DATA",
        totalObservedProducts: totalObservations,
        marketplaceBreakdown: [],
      };
    }

    const overallSuccessRatePct = Math.round((completedRuns / totalRuns) * 100);
    const overallFailureRatePct = Math.round(((failedRuns + timedOutRuns) / totalRuns) * 100);

    const completedWithDuration = runs.filter((r) => r.status === "COMPLETED" && r.durationMs !== null);
    const avgDuration =
      completedWithDuration.length > 0
        ? Math.round(
            completedWithDuration.reduce((acc, curr) => acc + (curr.durationMs || 0), 0) /
              completedWithDuration.length
          )
        : "INSUFFICIENT_DATA";

    // Marketplace breakdown
    const mpMap: Record<string, { total: number; completed: number; failed: number }> = {};
    for (const r of runs) {
      for (const mp of r.marketplaces) {
        if (!mpMap[mp]) {
          mpMap[mp] = { total: 0, completed: 0, failed: 0 };
        }
        mpMap[mp].total++;
        if (r.status === "COMPLETED") mpMap[mp].completed++;
        if (r.status === "FAILED" || r.status === "TIMED_OUT") mpMap[mp].failed++;
      }
    }

    const marketplaceBreakdown: MarketplaceQualityStats[] = Object.entries(mpMap).map(([mp, stats]) => ({
      marketplace: mp,
      totalRuns: stats.total,
      completedRuns: stats.completed,
      failedRuns: stats.failed,
      successRatePct: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : "INSUFFICIENT_DATA",
    }));

    return {
      timestamp: new Date().toISOString(),
      totalResearchRuns: totalRuns,
      completedRuns,
      failedRuns,
      timedOutRuns,
      overallSuccessRatePct,
      overallFailureRatePct,
      averageDurationMs: avgDuration,
      totalObservedProducts: totalObservations,
      marketplaceBreakdown,
    };
  }
}
