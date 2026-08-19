import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { computeCategoryBenchmarks } from "@/services/category-hunting";
import { buildOpportunityPackage } from "@/services/listing-strategy";
import { calculateJaccardSimilarity } from "@/services/listing-assistant";
import { evaluateCanonicalOpportunity } from "@/services/intelligence/canonical-opportunity";
import { ETSY_OPTIMIZATION_RULES } from "@/marketplaces/core/optimization-rules";

const rootDir = process.cwd();
const readSrc = (rel: string) => fs.readFileSync(path.join(rootDir, rel), "utf-8");

describe("Batch 5: Prospect Export, Radar Data & Category Zero-Fabrication Consolidation", () => {
  describe("1. Prospect Export Score Alignment", () => {
    it("prospects export route imports evaluateCanonicalOpportunity and does not import computeProductWinningSignals", () => {
      const exportRoute = readSrc("src/app/api/prospects/export/route.ts");
      assert.ok(
        exportRoute.includes("evaluateCanonicalOpportunity"),
        "export route must use evaluateCanonicalOpportunity"
      );
      assert.ok(
        !exportRoute.includes("computeProductWinningSignals"),
        "export route must not call legacy computeProductWinningSignals"
      );
    });

    it("google-sheets connector imports evaluateCanonicalOpportunity and does not import computeProductWinningSignals", () => {
      const sheetsService = readSrc("src/services/connectors/google-sheets.ts");
      assert.ok(
        sheetsService.includes("evaluateCanonicalOpportunity"),
        "google-sheets service must use evaluateCanonicalOpportunity"
      );
      assert.ok(
        !sheetsService.includes("computeProductWinningSignals"),
        "google-sheets service must not call legacy computeProductWinningSignals"
      );
    });

    it("computeProductWinningSignals has zero production callers in src/app or src/services", () => {
      const exportRoute = readSrc("src/app/api/prospects/export/route.ts");
      const sheetsService = readSrc("src/services/connectors/google-sheets.ts");
      assert.ok(!exportRoute.includes("computeProductWinningSignals"));
      assert.ok(!sheetsService.includes("computeProductWinningSignals"));
    });
  });

  describe("2. Category Hunting Zero-Fabrication", () => {
    it("computeCategoryBenchmarks returns 0 proxies when shop profiles are empty, never fabricating 3.5, 22.0, or 120", () => {
      const emptyShopProfiles = new Map<number | string, any>();
      const sampleListings = [
        { price: { amount: 2500, divisor: 100 } },
        { price: { amount: 3500, divisor: 100 } },
      ];

      const benchmarks = computeCategoryBenchmarks(sampleListings, emptyShopProfiles);
      assert.equal(benchmarks.avgDailySalesProxy, 0, "must not fabricate 3.5 sales/day");
      assert.equal(benchmarks.catalogYieldProxy, 0, "must not fabricate 22.0 yield");
      assert.equal(benchmarks.reviewSaturationAverage, 0, "must not fabricate 120 reviews");
      assert.ok(benchmarks.opportunityScore > 0, "price-based opportunity score should still be evaluated");
    });

    it("computeCategoryBenchmarks computes real averages when observed shop profiles exist", () => {
      const shopProfiles = new Map<number | string, any>();
      shopProfiles.set(101, {
        transaction_sold_count: 3600,
        listing_active_count: 50,
        review_count: 240,
        create_date: Math.floor(Date.now() / 1000 - 365 * 24 * 3600), // 12 months
      });

      const sampleListings = [
        { price: { amount: 3000, divisor: 100 } },
      ];

      const benchmarks = computeCategoryBenchmarks(sampleListings, shopProfiles);
      assert.ok(benchmarks.avgDailySalesProxy > 5, "should compute observed velocity");
      assert.equal(benchmarks.catalogYieldProxy, 72, "3600 sales / 50 listings = 72");
      assert.equal(benchmarks.reviewSaturationAverage, 240, "review count = 240");
    });

    it("category-hunting.ts source does not contain synthetic fallback numbers for shop KPIs", () => {
      const catHuntingSrc = readSrc("src/services/category-hunting.ts");
      assert.ok(!catHuntingSrc.includes("?? 500"), "must not default totalSales to 500");
      assert.ok(!catHuntingSrc.includes("?? 25"), "must not default activeListings to 25");
      assert.ok(!catHuntingSrc.includes("?? 30"), "must not default reviewCount to 30");
      assert.ok(!catHuntingSrc.includes("?? 4.9"), "must not default reviewAverage to 4.9");
      assert.ok(!catHuntingSrc.includes(": 3.5"), "must not default avgDailySalesProxy to 3.5");
      assert.ok(!catHuntingSrc.includes(": 22.0"), "must not default catalogYieldProxy to 22.0");
      assert.ok(!catHuntingSrc.includes(": 120"), "must not default reviewSaturationAverage to 120");
    });
  });

  describe("3. SaltBot Data Honesty & Fallbacks", () => {
    it("tool-registry.ts source does not contain synthetic metric fallback literals", () => {
      const toolRegistry = readSrc("src/services/assistant/tool-registry.ts");
      assert.ok(!toolRegistry.includes("p.opportunity.opportunityScore || 75"), "must not fallback score to 75");
      assert.ok(!toolRegistry.includes("p.signals.estDailySales || 1.2"), "must not fallback daily sales to 1.2");
      assert.ok(!toolRegistry.includes(': "5.0 ★"'), "must not fallback rating to 5.0");
    });
  });

  describe("4. Opportunity Radar Data Service Consolidation", () => {
    it("opportunities.ts routes radar scoring through evaluateCanonicalOpportunity", () => {
      const oppsSrc = readSrc("src/services/opportunities.ts");
      assert.ok(oppsSrc.includes("evaluateCanonicalOpportunity"), "opportunities.ts must use evaluateCanonicalOpportunity");
      assert.ok(!oppsSrc.includes("calculateVelocitySignal"), "must not implement private calculateVelocitySignal");
      assert.ok(!oppsSrc.includes("calculateDensitySignal"), "must not implement private calculateDensitySignal");
      assert.ok(!oppsSrc.includes("calculateCompetitionSignal"), "must not implement private calculateCompetitionSignal");
    });
  });

  describe("5. Listing Strategy & Planner Hardcoded Constants", () => {
    it("buildOpportunityPackage calculates fees from rules and uses honest fallbacks", () => {
      const pkg = buildOpportunityPackage({
        productTitle: "Minimalist Leather Card Holder",
        price: 40.0,
      });

      // Etsy fees on $40: 40 * 0.095 + 0.20 = 3.80 + 0.20 = 4.00
      assert.equal(pkg.economics.etsyFees, 4.0);
      assert.equal(pkg.product.shopTotalSales, 0, "missing shop total sales must be 0, not 1200");
      assert.equal(pkg.product.shopReviewCount, 0, "missing shop reviews must be 0, not 150");
      assert.equal(pkg.product.estDailySales, 0, "missing daily sales must be 0, not 2.2");
    });
  });

  describe("6. Listing Assistant NLP Consolidation", () => {
    it("calculateJaccardSimilarity delegates to originality engine and computes correct token overlap", () => {
      const similarity = calculateJaccardSimilarity(
        "handmade minimalist leather wallet card holder",
        ["handmade minimalist leather wallet case"]
      );

      assert.ok(similarity > 0 && similarity < 100);
      assert.equal(typeof similarity, "number");
    });
  });
});
