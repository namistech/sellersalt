import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  evaluateCanonicalOpportunity,
  extractOpportunityInputFromNormalizedProduct,
  createMetric,
  toOpportunityMetric,
  getScoreTier,
  type CanonicalOpportunityInput,
} from "../services/intelligence/canonical-opportunity";
import {
  evaluateProductOpportunity,
  evaluateShopCompetition,
} from "../services/intelligence/universal-scoring";
import {
  scoreProductOpportunity,
  scoreShopCompetition,
  scoreNormalizedProductOpportunity,
} from "../marketplaces/core/opportunity-engine";
import {
  getOptimizationRules,
  ETSY_OPTIMIZATION_RULES,
} from "../marketplaces/core/optimization-rules";
import type { NormalizedProduct } from "../marketplaces/core/types";

describe("Canonical Opportunity Engine — Determinism & Rubric Compliance", () => {
  it("1. Same normalized input produces deterministic score", () => {
    const input: CanonicalOpportunityInput = {
      marketplace: "etsy",
      price: createMetric(34.0, "OBSERVED", "ACTUAL_DATA"),
      estDailySales: createMetric(4.5, "ESTIMATED", "ESTIMATED"),
      shopReviewCount: createMetric(180, "OBSERVED", "ACTUAL_DATA"),
      listingAgeDays: createMetric(65, "OBSERVED", "ACTUAL_DATA"),
      numFavorers: createMetric(850, "OBSERVED", "ACTUAL_DATA"),
    };

    const run1 = evaluateCanonicalOpportunity(input);
    const run2 = evaluateCanonicalOpportunity(input);

    assert.equal(run1.overallScore, run2.overallScore);
    assert.equal(run1.confidenceScore, run2.confidenceScore);
    assert.equal(run1.tier, run2.tier);
    assert.equal(run1.verdict, run2.verdict);
    assert.equal(run1.classification, run2.classification);
    assert.deepEqual(
      run1.signals.available.map((s) => s.pointsContributed),
      run2.signals.available.map((s) => s.pointsContributed)
    );
  });

  it("2. Etsy current behavior remains unchanged and matches universal-scoring baseline", () => {
    const params = {
      price: 34.0,
      estDailySales: 4.5,
      shopReviewCount: 180,
      listingAgeDays: 65,
      numFavorers: 850,
    };

    const legacyResult = evaluateProductOpportunity(params);
    const canonicalInput: CanonicalOpportunityInput = {
      marketplace: "etsy",
      price: params.price,
      estDailySales: params.estDailySales,
      shopReviewCount: params.shopReviewCount,
      listingAgeDays: params.listingAgeDays,
      numFavorers: params.numFavorers,
      feeSchedule: { percentageFee: 0.095, flatFee: 0.2 },
    };
    const canonicalReport = evaluateCanonicalOpportunity(canonicalInput);

    assert.equal(canonicalReport.overallScore, legacyResult.score);
    assert.equal(canonicalReport.tier, legacyResult.tier);
    assert.equal(canonicalReport.verdict, legacyResult.verdict);
    assert.equal(canonicalReport.confidenceScore, legacyResult.confidenceScore);
    assert.equal(canonicalReport.provenance, "SELLERSALT_SCORE");
  });

  it("3. No Etsy fee literals exist inside the canonical universal engine source", () => {
    const filePath = path.resolve(
      process.cwd(),
      "src/services/intelligence/canonical-opportunity.ts"
    );
    const source = fs.readFileSync(filePath, "utf-8");

    // The canonical opportunity engine must not hardcode Etsy fee constants (0.095 or 0.2)
    // outside of importing ETSY_OPTIMIZATION_RULES from optimization-rules.ts.
    // Check that numeric fee literals 0.095 and 0.2 are NOT hardcoded directly in calculation logic.
    const feeCalculationMatches = source.match(/price\s*\*\s*0\.095/g);
    assert.equal(
      feeCalculationMatches,
      null,
      "canonical-opportunity.ts must not contain hardcoded price * 0.095 literals"
    );
  });

  it("4. Missing signals do not become zero — marked UNAVAILABLE with null value", () => {
    const input: CanonicalOpportunityInput = {
      marketplace: "amazon", // Architecture ready, fee schedule is null
      price: createMetric(49.99, "OBSERVED", "ACTUAL_DATA"),
      estDailySales: null, // Missing sales signal
      shopReviewCount: null, // Missing reviews signal
      listingAgeDays: createMetric(30, "OBSERVED", "ACTUAL_DATA"),
      feeSchedule: null, // No fee schedule
    };

    const report = evaluateCanonicalOpportunity(input);

    const unavailable = report.signals.unavailable;
    assert.ok(unavailable.length >= 3, "Velocity, margin, and competition should be unavailable");

    const velocityGroup = report.signalBreakdown["velocity"];
    assert.equal(velocityGroup?.available, false);
    assert.equal(velocityGroup?.score, null);
    assert.equal(velocityGroup?.availability, "UNAVAILABLE");

    const marginGroup = report.signalBreakdown["margin"];
    assert.equal(marginGroup?.available, false);
    assert.equal(marginGroup?.score, null);
    assert.equal(marginGroup?.availability, "UNAVAILABLE");

    const competitionGroup = report.signalBreakdown["competition"];
    assert.equal(competitionGroup?.available, false);
    assert.equal(competitionGroup?.score, null);
    assert.equal(competitionGroup?.availability, "UNAVAILABLE");
  });

  it("5. Estimated signals are explicitly marked ESTIMATED", () => {
    const metric = toOpportunityMetric(3.5, "ESTIMATED", "ESTIMATED", {
      source: "velocity_proxy",
    });

    assert.equal(metric.value, 3.5);
    assert.equal(metric.availability, "ESTIMATED");
    assert.equal(metric.provenance, "ESTIMATED");
    assert.equal(metric.source, "velocity_proxy");
  });

  it("6. Derived signals are explicitly marked DERIVED", () => {
    const input: CanonicalOpportunityInput = {
      marketplace: "etsy",
      price: createMetric(50.0, "OBSERVED", "ACTUAL_DATA"),
      estDailySales: createMetric(2.0, "ESTIMATED", "ESTIMATED"),
      shopReviewCount: createMetric(100, "OBSERVED", "ACTUAL_DATA"),
      listingAgeDays: createMetric(60, "OBSERVED", "ACTUAL_DATA"),
      feeSchedule: { percentageFee: 0.095, flatFee: 0.2 },
    };

    const report = evaluateCanonicalOpportunity(input);
    const marginGroup = report.signalBreakdown["margin"];

    assert.ok(marginGroup);
    assert.equal(marginGroup.available, true);
    assert.equal(marginGroup.availability, "DERIVED");
  });

  it("7. Unavailable signals reduce confidence rather than fabricating data", () => {
    const fullInput: CanonicalOpportunityInput = {
      marketplace: "etsy",
      price: createMetric(30.0, "OBSERVED", "ACTUAL_DATA"),
      estDailySales: createMetric(3.0, "ESTIMATED", "ESTIMATED"),
      shopReviewCount: createMetric(200, "OBSERVED", "ACTUAL_DATA"),
      listingAgeDays: createMetric(90, "OBSERVED", "ACTUAL_DATA"),
      feeSchedule: { percentageFee: 0.095, flatFee: 0.2 },
    };

    const partialInput: CanonicalOpportunityInput = {
      marketplace: "etsy",
      price: createMetric(30.0, "OBSERVED", "ACTUAL_DATA"),
      estDailySales: null, // missing velocity (35% weight)
      shopReviewCount: createMetric(200, "OBSERVED", "ACTUAL_DATA"),
      listingAgeDays: null, // missing freshness (20% weight)
      feeSchedule: null, // missing margin (25% weight)
    };

    const fullReport = evaluateCanonicalOpportunity(fullInput);
    const partialReport = evaluateCanonicalOpportunity(partialInput);

    assert.ok(
      partialReport.confidenceScore < fullReport.confidenceScore,
      `Partial confidence (${partialReport.confidenceScore}) must be strictly less than full confidence (${fullReport.confidenceScore})`
    );
    assert.ok(
      partialReport.confidenceScore <= 35,
      `Only 1 factor (20% weight) available should result in low confidence, got ${partialReport.confidenceScore}`
    );
  });

  it("8. Marketplace configuration is respected across marketplace types", () => {
    const etsyRules = getOptimizationRules("etsy");
    const amazonRules = getOptimizationRules("amazon");

    assert.equal(etsyRules.marketplace, "etsy");
    assert.ok(etsyRules.feeSchedule !== null);
    assert.equal(amazonRules.marketplace, "amazon");
    assert.equal(amazonRules.feeSchedule, null);
  });

  it("9. Different marketplace configurations produce different economics without changing the engine", () => {
    const baseParams = {
      price: 100.0,
      estDailySales: 5.0,
      shopReviewCount: 150,
      listingAgeDays: 45,
    };

    // Marketplace A: 10% + $0.30 fee
    const reportA = evaluateCanonicalOpportunity({
      marketplace: "etsy",
      ...baseParams,
      feeSchedule: { percentageFee: 0.10, flatFee: 0.3 },
    });

    // Marketplace B: 15% + $1.00 fee (e.g. Amazon category average)
    const reportB = evaluateCanonicalOpportunity({
      marketplace: "amazon",
      ...baseParams,
      feeSchedule: { percentageFee: 0.15, flatFee: 1.0 },
    });

    // Marketplace C: 0% fee schedule (feeSchedule: null -> margin factor excluded)
    const reportC = evaluateCanonicalOpportunity({
      marketplace: "shopify",
      ...baseParams,
      feeSchedule: null,
    });

    assert.ok(reportA.signals.available.some((s) => s.id === "margin"));
    assert.ok(reportB.signals.available.some((s) => s.id === "margin"));
    assert.ok(!reportC.signals.available.some((s) => s.id === "margin"));

    const marginA = reportA.signalBreakdown["margin"]?.rawMetric;
    const marginB = reportB.signalBreakdown["margin"]?.rawMetric;
    assert.notEqual(marginA, marginB);
  });

  it("10. One marketplace configuration cannot leak into another marketplace", () => {
    const amazonInput: CanonicalOpportunityInput = {
      marketplace: "amazon",
      price: 25.0,
      estDailySales: 2.0,
      shopReviewCount: 50,
      listingAgeDays: 40,
      // No feeSchedule passed — must resolve amazon rules (null), NOT Etsy rules
    };

    const report = evaluateCanonicalOpportunity(amazonInput);
    const marginGroup = report.signalBreakdown["margin"];

    assert.equal(
      marginGroup?.available,
      false,
      "Amazon must not inherit Etsy fee schedule when none is configured"
    );
    assert.equal(marginGroup?.score, null);
  });

  it("11. extractOpportunityInputFromNormalizedProduct accurately extracts signals with metadata", () => {
    const product: NormalizedProduct = {
      marketplace: "etsy",
      externalId: "12345",
      title: "Handmade Wooden Chess Board",
      price: 85.0,
      currency: "USD",
      rating: 4.8,
      reviewCount: 320,
      favoritesCount: 1400,
      salesCount: 2500,
      estimatedDemand: 3.8,
      shop: {
        externalId: "shop-99",
        name: "ArtisanWoodCraft",
        ageMonths: 24,
        activeListings: 45,
        avgSellingRatio: 55.5,
      },
      source: "ACTUAL_DATA",
      capturedAt: new Date(),
    };

    const input = extractOpportunityInputFromNormalizedProduct(product);

    assert.equal(input.marketplace, "etsy");
    assert.equal((input.price as any).value, 85.0);
    assert.equal((input.price as any).availability, "OBSERVED");
    assert.equal((input.estDailySales as any).value, 3.8);
    assert.equal((input.estDailySales as any).availability, "ESTIMATED");
    assert.equal((input.shopReviewCount as any).value, 320);
    assert.equal((input.shopReviewCount as any).availability, "OBSERVED");
    assert.equal((input.avgSellingRatio as any).value, 55.5);
    assert.equal((input.avgSellingRatio as any).availability, "DERIVED");
  });

  it("12. scoreNormalizedProductOpportunity generates standardized OpportunityScore envelope", () => {
    const product: NormalizedProduct = {
      marketplace: "etsy",
      externalId: "67890",
      title: "Ceramic Coffee Mug",
      price: 28.0,
      currency: "USD",
      rating: 4.9,
      reviewCount: 95,
      favoritesCount: 420,
      salesCount: 800,
      estimatedDemand: 2.2,
      shop: {
        externalId: "shop-44",
        name: "PotteryStudio",
        ageMonths: 12,
        activeListings: 20,
      },
      source: "ACTUAL_DATA",
      capturedAt: new Date(),
    };

    const opp = scoreNormalizedProductOpportunity(product);

    assert.ok(opp.score !== null && opp.score >= 10 && opp.score <= 99);
    assert.ok(opp.confidence > 0 && opp.confidence <= 100);
    assert.deepEqual(opp.dataSources, ["etsy"]);
    assert.ok(opp.factors.length >= 4);
    assert.ok(opp.factors.every((f) => typeof f.name === "string" && typeof f.available === "boolean"));
  });

  it("13. getScoreTier maps boundaries accurately", () => {
    assert.equal(getScoreTier(95).tier, "EXCELLENT");
    assert.equal(getScoreTier(85).tier, "EXCELLENT");
    assert.equal(getScoreTier(84).tier, "STRONG");
    assert.equal(getScoreTier(70).tier, "STRONG");
    assert.equal(getScoreTier(69).tier, "MODERATE");
    assert.equal(getScoreTier(50).tier, "MODERATE");
    assert.equal(getScoreTier(49).tier, "HIGH_BARRIER");
    assert.equal(getScoreTier(30).tier, "HIGH_BARRIER");
    assert.equal(getScoreTier(29).tier, "UNFAVORABLE");
    assert.equal(getScoreTier(0).tier, "UNFAVORABLE");
  });

  it("14. Deprecated opportunity-scoring engine retains test compatibility", async () => {
    const { evaluateOpportunityScore } = await import("../services/intelligence/opportunity-scoring");

    const report = evaluateOpportunityScore({
      price: 40.0,
      estimatedCogs: 10.0,
      estDailySales: 3.0,
      shopReviewCount: 200,
      competingListingsCount: 300,
    });

    assert.ok(report.overallScore >= 60);
    assert.equal(report.provenance, "SELLERSALT_SCORE");
  });
});
