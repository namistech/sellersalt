/**
 * SellerSalt Real-Data Acquisition Smoke Test Framework
 * 
 * Bounded, non-aggressive diagnostic harness that verifies acquisition boundaries,
 * anti-circumvention guards, provenance tracking, and Data Trust calculations without
 * performing prohibited crawling or hammering third-party marketplace endpoints.
 */

import { prisma } from "@/lib/db";
import { isAllowedMarketplaceUrl, isSafeRedirect } from "@/marketplaces/core/acquisition/compliance";
import { DataTrustEngine } from "@/services/intelligence/data-trust-engine";
import type { NormalizedProduct } from "@/marketplaces/core/types";

export interface SmokeTestCheckResult {
  name: string;
  status: "PASSED" | "FAILED" | "SKIPPED";
  durationMs: number;
  message?: string;
  details?: Record<string, any>;
}

export interface SmokeTestReport {
  executedAt: string;
  overallStatus: "HEALTHY" | "DEGRADED" | "FAILED";
  checks: SmokeTestCheckResult[];
}

export class AcquisitionSmokeTestRunner {
  /**
   * Executes the non-aggressive acquisition sanity check suite.
   */
  public static async runSuite(organizationId: string): Promise<SmokeTestReport> {
    const checks: SmokeTestCheckResult[] = [];

    // Check 1: Domain Whitelist & Boundary Security
    const startD = Date.now();
    try {
      const allowedEtsy = isAllowedMarketplaceUrl("https://www.etsy.com/search?q=planner", "etsy");
      const allowedAmazon = isAllowedMarketplaceUrl("https://www.amazon.com/s?k=planner", "amazon");
      const blockedEvil = isAllowedMarketplaceUrl("https://evil-circumvention-proxy.com", "etsy");
      const safeRedirect = isSafeRedirect("https://www.etsy.com/listing/123", "https://www.etsy.com/c/home-and-living", "etsy");
      const unsafeRedirect = isSafeRedirect("https://www.etsy.com/listing/123", "https://malicious-external-site.com", "etsy");

      const passed = allowedEtsy && allowedAmazon && !blockedEvil && safeRedirect && !unsafeRedirect;
      checks.push({
        name: "Source Boundary & SSRF Protection",
        status: passed ? "PASSED" : "FAILED",
        durationMs: Date.now() - startD,
        message: passed ? "Domain whitelisting and redirect validation functional." : "Domain safety validation failed.",
      });
    } catch (err: any) {
      checks.push({
        name: "Source Boundary & SSRF Protection",
        status: "FAILED",
        durationMs: Date.now() - startD,
        message: err.message,
      });
    }

    // Check 2: Data Trust Engine Evaluation
    const startT = Date.now();
    try {
      const mockItems: NormalizedProduct[] = [
        {
          externalId: "etsy_listing_smoke_1",
          marketplace: "etsy",
          title: "Minimalist Daily Planner",
          price: 18.5,
          currency: "USD",
          url: "https://www.etsy.com/listing/smoke1",
          reviewCount: 120,
          rating: 4.8,
          shop: {
            externalId: "shop_1",
            name: "PaperCraftStudio",
            url: "https://www.etsy.com/shop/papercraft",
            ageMonths: 24,
            activeListings: 50,
          },
          source: "ACTUAL_DATA",
          capturedAt: new Date(),
        },
      ];

      const trust = DataTrustEngine.evaluateTrust({
        products: mockItems,
        marketplaces: ["etsy"],
        observationAgeDays: 0,
      });

      const passed = trust.overallTrustScore >= 40 && trust.observedMetricCount > 0;
      checks.push({
        name: "Data Trust Engine Evaluation",
        status: passed ? "PASSED" : "FAILED",
        durationMs: Date.now() - startT,
        details: { overallTrustScore: trust.overallTrustScore, policyComplianceStatus: trust.policyComplianceStatus },
      });
    } catch (err: any) {
      checks.push({
        name: "Data Trust Engine Evaluation",
        status: "FAILED",
        durationMs: Date.now() - startT,
        message: err.message,
      });
    }

    // Check 3: Research Run Persistence & Longitudinal Integrity
    const startP = Date.now();
    try {
      const testRun = await prisma.researchRun.create({
        data: {
          organizationId,
          type: "PRODUCT",
          query: "smoke test query",
          marketplaces: ["etsy"],
          status: "COMPLETED",
          itemCount: 1,
          durationMs: 150,
        },
      });

      const readBack = await prisma.researchRun.findUnique({ where: { id: testRun.id } });
      const passed = readBack !== null && readBack.status === "COMPLETED";

      // Cleanup smoke test record
      await prisma.researchRun.delete({ where: { id: testRun.id } });

      checks.push({
        name: "Research Run Persistence & Database Lifecycle",
        status: passed ? "PASSED" : "FAILED",
        durationMs: Date.now() - startP,
      });
    } catch (err: any) {
      checks.push({
        name: "Research Run Persistence & Database Lifecycle",
        status: "FAILED",
        durationMs: Date.now() - startP,
        message: err.message,
      });
    }

    const failedCount = checks.filter((c) => c.status === "FAILED").length;
    const overallStatus: SmokeTestReport["overallStatus"] =
      failedCount === 0 ? "HEALTHY" : failedCount === checks.length ? "FAILED" : "DEGRADED";

    return {
      executedAt: new Date().toISOString(),
      overallStatus,
      checks,
    };
  }
}
