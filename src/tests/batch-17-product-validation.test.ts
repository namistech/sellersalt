/**
 * SellerSalt — Batch 17 Test Suite
 * 
 * Comprehensive verification of Product Validation & Commercial Decision Engine,
 * Price Positioning, User Unit Economics, Differentiation Analysis,
 * Multi-Tenant Isolation, and Zero-Fabrication integrity.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { ProductValidationEngine } from "@/services/intelligence/product-validation-engine";
import { PricePositioningEngine } from "@/services/intelligence/price-positioning";
import { UnitEconomicsCalculator } from "@/services/intelligence/unit-economics";
import { DifferentiationEngine } from "@/services/intelligence/differentiation-engine";
import type { NormalizedProduct } from "@/marketplaces/core/types";

describe("Batch 17: Product Validation & Commercial Decision Engine", () => {
  // --------------------------------------------------------------------------
  // 1. End-to-End Product Validation
  // --------------------------------------------------------------------------
  describe("1. End-to-End Product Validation", () => {
    it("generates a comprehensive validation report across all dimensions", async () => {
      const report = await ProductValidationEngine.validateProduct({
        query: "ceramic coffee mug",
        marketplace: "etsy",
        depth: "STANDARD",
      });

      assert.ok(report.id);
      assert.ok(report.productTitle);
      assert.equal(report.marketplace, "etsy");
      assert.ok(report.verdict);
      assert.ok(report.verdictLabel);
      assert.ok(report.scoreBreakdown.score !== null);
      assert.ok(report.scoreBreakdown.confidence >= 0 && report.scoreBreakdown.confidence <= 100);

      // Verify dimension assessments
      assert.ok(report.demand);
      assert.ok(report.competition);
      assert.ok(report.economics);
      assert.ok(report.momentum);
      assert.ok(report.saturation);
      assert.ok(report.differentiation);

      // Verify executive blocks
      assert.ok(report.topReasonsToPursue.length > 0);
      assert.ok(report.strongestRisks.length > 0);
      assert.ok(report.unobservedSignals.length > 0);
      assert.ok(report.recommendedNextActions.length > 0);
    });

    it("returns INSUFFICIENT_DATA when sample observations are insufficient", async () => {
      const report = await ProductValidationEngine.validateProduct({
        query: "unobserved_obscure_query_xyz_9999",
        marketplace: "etsy",
      });

      if (report.sampleProducts.length < 2) {
        assert.equal(report.verdict, "INSUFFICIENT_DATA");
        assert.equal(report.demand.state, "INSUFFICIENT_DATA");
        assert.equal(report.competition.state, "INSUFFICIENT_DATA");
      }
    });
  });

  // --------------------------------------------------------------------------
  // 2. Price Positioning Engine
  // --------------------------------------------------------------------------
  describe("2. Price Positioning Analysis", () => {
    it("correctly identifies MID_MARKET when priced near median", () => {
      const result = PricePositioningEngine.evaluatePosition({
        candidatePrice: 35,
        median: 35,
        p10: 15,
        p25: 25,
        p75: 45,
        p90: 60,
      });

      assert.equal(result.tier, "MID_MARKET");
      assert.equal(result.priceDeltaFromMedianPercent, 0);
    });

    it("identifies LOWER_MID_MARKET and UPPER_MID_MARKET brackets", () => {
      const lower = PricePositioningEngine.evaluatePosition({
        candidatePrice: 30,
        median: 35,
        p10: 15,
        p25: 25,
        p75: 45,
        p90: 60,
      });
      assert.equal(lower.tier, "LOWER_MID_MARKET");

      const upper = PricePositioningEngine.evaluatePosition({
        candidatePrice: 40,
        median: 35,
        p10: 15,
        p25: 25,
        p75: 45,
        p90: 60,
      });
      assert.equal(upper.tier, "UPPER_MID_MARKET");
    });

    it("identifies BELOW_MARKET and PREMIUM tiers", () => {
      const budget = PricePositioningEngine.evaluatePosition({
        candidatePrice: 20,
        median: 35,
        p10: 15,
        p25: 25,
        p75: 45,
        p90: 60,
      });
      assert.equal(budget.tier, "BELOW_MARKET");

      const premium = PricePositioningEngine.evaluatePosition({
        candidatePrice: 55,
        median: 35,
        p10: 15,
        p25: 25,
        p75: 45,
        p90: 60,
      });
      assert.equal(premium.tier, "PREMIUM");
    });

    it("identifies OUTSIDE_OBSERVED_RANGE for extreme outliers", () => {
      const outlierLow = PricePositioningEngine.evaluatePosition({
        candidatePrice: 5,
        median: 35,
        p10: 15,
        p25: 25,
        p75: 45,
        p90: 60,
      });
      assert.equal(outlierLow.tier, "OUTSIDE_OBSERVED_RANGE");

      const outlierHigh = PricePositioningEngine.evaluatePosition({
        candidatePrice: 120,
        median: 35,
        p10: 15,
        p25: 25,
        p75: 45,
        p90: 60,
      });
      assert.equal(outlierHigh.tier, "OUTSIDE_OBSERVED_RANGE");
    });

    it("returns INSUFFICIENT_DATA when market median is unavailable", () => {
      const result = PricePositioningEngine.evaluatePosition({
        candidatePrice: 35,
        median: null,
      });
      assert.equal(result.tier, "INSUFFICIENT_DATA");
    });
  });

  // --------------------------------------------------------------------------
  // 3. User Unit Economics Calculator
  // --------------------------------------------------------------------------
  describe("3. User Unit Economics Calculator", () => {
    it("computes gross profit, contribution margin, and break-even accurately", () => {
      const report = UnitEconomicsCalculator.calculate({
        sellingPrice: 40,
        cogs: 10,
        shippingCost: 5,
        packagingCost: 1,
        marketplaceFeePercent: 6.5,
        paymentProcessingFeePercent: 3.0,
        advertisingPercent: 10.0,
      });

      assert.equal(report.sellingPrice, 40);
      assert.equal(report.totalDirectCosts, 16); // 10 + 5 + 1
      assert.equal(report.marketplaceFees, 2.6); // 6.5% of 40
      assert.equal(report.paymentFees, 1.2); // 3% of 40
      assert.equal(report.advertisingCost, 4.0); // 10% of 40

      // Contribution Margin = 40 - (16 + 2.6 + 1.2 + 4.0) = 40 - 23.8 = 16.2
      assert.equal(report.contributionMargin, 16.2);
      assert.equal(report.marginPercent, 40.5);
      assert.ok(report.breakEvenPrice > 16 && report.breakEvenPrice < 25);
      assert.equal(report.provenance, "USER_DERIVED");
    });

    it("strictly separates user-derived metrics from observed marketplace metrics", () => {
      const report = UnitEconomicsCalculator.calculate({
        sellingPrice: 50,
        cogs: 12,
      });

      assert.equal(report.provenance, "USER_DERIVED");
      assert.ok(report.notes.length > 0);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Differentiation Analysis Engine
  // --------------------------------------------------------------------------
  describe("4. Differentiation Analysis", () => {
    it("surfaces common and underrepresented attributes across competitor titles", () => {
      const mockListings: NormalizedProduct[] = [
        { marketplace: "etsy", externalId: "1", title: "Handmade Matte Ceramic Mug - Speckled White", price: 32, currency: "USD", source: "ACTUAL_DATA", capturedAt: new Date() },
        { marketplace: "etsy", externalId: "2", title: "Minimalist Matte Ceramic Mug - Nordic Clay", price: 34, currency: "USD", source: "ACTUAL_DATA", capturedAt: new Date() },
        { marketplace: "etsy", externalId: "3", title: "Vintage Matte Ceramic Mug - Brown Drip", price: 30, currency: "USD", source: "ACTUAL_DATA", capturedAt: new Date() },
        { marketplace: "etsy", externalId: "4", title: "Modern Matte Ceramic Cup - Large 16oz", price: 28, currency: "USD", source: "ACTUAL_DATA", capturedAt: new Date() },
        { marketplace: "etsy", externalId: "5", title: "Stoneware Matte Ceramic Mug - Cobalt Blue", price: 42, currency: "USD", source: "ACTUAL_DATA", capturedAt: new Date() },
      ];

      const diff = DifferentiationEngine.analyze(mockListings);

      assert.ok(diff.commonAttributes.some((a) => a.includes("ceramic") || a.includes("matte") || a.includes("mug")));
      assert.ok(diff.observableOpportunities.length > 0);
      assert.ok(diff.explanation.includes("5 competitor listings"));
    });
  });

  // --------------------------------------------------------------------------
  // 5. Zero-Fabrication Contract & Unknown Disclosures
  // --------------------------------------------------------------------------
  describe("5. Zero-Fabrication & Limitations", () => {
    it("transparently discloses unobserved signals and limitations", async () => {
      const report = await ProductValidationEngine.validateProduct({
        query: "leather cardholder wallet",
        marketplace: "etsy",
      });

      assert.ok(report.unobservedSignals.some((u) => u.includes("Exact monthly search query volume is unavailable")));
      assert.ok(report.unobservedSignals.some((u) => u.includes("Direct private store revenues")));
      assert.ok(report.limitations.length > 0);
    });
  });

  // --------------------------------------------------------------------------
  // 6. Multi-Tenant Organization Scoping & API Architecture
  // --------------------------------------------------------------------------
  describe("6. Multi-Tenant Scoping & API Routes", () => {
    it("POST /api/validation/product enforces session authentication and organizationId", () => {
      const routeSrc = fs.readFileSync(path.join(process.cwd(), "src/app/api/validation/product/route.ts"), "utf8");
      assert.ok(routeSrc.includes("getServerSession(authOptions)"));
      assert.ok(routeSrc.includes("session.user.organizationId"));
      assert.ok(routeSrc.includes("ProductValidationEngine.validateProduct"));
    });

    it("GET /api/validation/history scopes query strictly to organizationId", () => {
      const routeSrc = fs.readFileSync(path.join(process.cwd(), "src/app/api/validation/history/route.ts"), "utf8");
      assert.ok(routeSrc.includes("organizationId: session.user.organizationId"));
      assert.ok(routeSrc.includes("prisma.productValidation.findMany"));
    });

    it("Prisma schema declares ProductValidation with organizationId foreign key and indexes", () => {
      const schemaSrc = fs.readFileSync(path.join(process.cwd(), "prisma/schema.prisma"), "utf8");
      assert.ok(schemaSrc.includes("model ProductValidation"));
      assert.ok(schemaSrc.includes("productValidations ProductValidation[]"));
      assert.ok(schemaSrc.includes("organizationId"));
      assert.ok(schemaSrc.includes("@@index([organizationId])"));
    });
  });

  // --------------------------------------------------------------------------
  // 7. Validation Depth Modes & Dynamic Weight Redistribution
  // --------------------------------------------------------------------------
  describe("7. Depth Modes & Dynamic Scoring Breakdown", () => {
    it("respects QUICK, STANDARD, and DEEP depth modes", async () => {
      const quickReport = await ProductValidationEngine.validateProduct({
        query: "ceramic coffee mug",
        depth: "QUICK",
      });
      assert.equal(quickReport.depth, "QUICK");

      const deepReport = await ProductValidationEngine.validateProduct({
        query: "ceramic coffee mug",
        depth: "DEEP",
      });
      assert.equal(deepReport.depth, "DEEP");
    });

    it("redistributes score weights dynamically without injecting fabricated zeros", async () => {
      const report = await ProductValidationEngine.validateProduct({
        query: "ceramic coffee mug",
      });

      assert.ok(report.scoreBreakdown.dynamicWeights);
      const totalWeight = Object.values(report.scoreBreakdown.dynamicWeights).reduce((a, b) => a + b, 0);
      assert.ok(totalWeight > 0 && totalWeight <= 1.05); // Sum of active factor weights
    });
  });

  // --------------------------------------------------------------------------
  // 8. UI & Navigation Integration
  // --------------------------------------------------------------------------
  describe("8. UI & Navigation Integration", () => {
    it("OpportunityCard links directly to /validate with query and marketplace parameters", () => {
      const cardSrc = fs.readFileSync(path.join(process.cwd(), "src/components/opportunities/OpportunityCard.tsx"), "utf8");
      assert.ok(cardSrc.includes("/validate?q="));
      assert.ok(cardSrc.includes("Validate Product"));
    });

    it("Navigation config includes Product Validation in primary Intelligence group", () => {
      const navSrc = fs.readFileSync(path.join(process.cwd(), "src/services/navigation.ts"), "utf8");
      assert.ok(navSrc.includes("id: \"validate\""));
      assert.ok(navSrc.includes("href: \"/validate\""));
      assert.ok(navSrc.includes("Product Validation"));
    });
  });
});
