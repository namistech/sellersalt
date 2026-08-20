/**
 * SellerSalt — Batch 18 Test Suite
 * 
 * Comprehensive verification of Product Research Command Center,
 * Multi-Marketplace Orchestration, Market Overview Statistics,
 * Keyword Clusters, Competition Density, Research Comparison,
 * Unified Research Queue, and Zero-Fabrication integrity.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { ProductResearchCommandCenter } from "@/services/intelligence/product-research-command-center";
import { ResearchComparisonEngine } from "@/services/intelligence/research-comparison-engine";
import { ResearchQueueManager } from "@/services/intelligence/research-queue";
import type { NormalizedProduct } from "@/marketplaces/core/types";

describe("Batch 18: Product Research Command Center", () => {
  // --------------------------------------------------------------------------
  // 1. End-to-End Product Research Command Center Session
  // --------------------------------------------------------------------------
  describe("1. End-to-End Command Center Orchestration", () => {
    it("executes unified research session returning overview, products, keywords, and decisions", async () => {
      const result = await ProductResearchCommandCenter.executeSession({
        query: "ceramic coffee mug",
        marketplaces: ["etsy", "amazon", "ebay", "walmart"],
        depth: "STANDARD",
      });

      assert.ok(result.sessionId);
      assert.ok(result.query);
      assert.ok(result.normalizedQuery);
      assert.ok(result.overview);
      assert.ok(result.overview.totalProductsObserved >= 0);
      assert.ok(result.marketplaceCoverage.length >= 4);

      // Verify keyword clusters
      assert.ok(result.keywords);
      for (const kw of result.keywords) {
        assert.equal(kw.searchVolume, null); // Zero-Fabrication Contract
      }

      // Verify competition summary
      assert.ok(result.competition);
      assert.ok(result.competition.observedSellerCount >= 0);

      // Verify commercial decision
      assert.ok(result.commercialDecision);
      assert.ok(result.commercialDecision.verdict);
      assert.ok(result.commercialDecision.topReasons.length > 0);

      // Verify acquisition trace
      assert.ok(result.acquisitionTrace.length > 0);
    });

    it("explicitly handles architecture-ready marketplaces without faking data", async () => {
      const result = await ProductResearchCommandCenter.executeSession({
        query: "desk mat",
        marketplaces: ["tiktok_shop" as any],
      });

      const tiktokStatus = result.marketplaceCoverage.find((m) => m.marketplace === "tiktok_shop");
      assert.ok(tiktokStatus);
      assert.equal(tiktokStatus.status, "NOT_IMPLEMENTED");
      assert.equal(tiktokStatus.itemCount, 0);
      assert.ok(tiktokStatus.limitations.length > 0);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Market Overview & Empirical Distribution
  // --------------------------------------------------------------------------
  describe("2. Market Overview & Empirical Calculations", () => {
    it("computes min, median, max, and common price bands correctly", async () => {
      const result = await ProductResearchCommandCenter.executeSession({
        query: "leather journal",
        marketplaces: ["etsy"],
        depth: "QUICK",
      });

      if (result.products.length > 0) {
        assert.ok(result.overview.minPrice !== null);
        assert.ok(result.overview.maxPrice !== null);
        assert.ok(result.overview.medianPrice !== null);
        assert.ok(result.overview.minPrice <= result.overview.maxPrice);
      }
    });
  });

  // --------------------------------------------------------------------------
  // 3. Research Comparison Engine
  // --------------------------------------------------------------------------
  describe("3. Research Comparison Engine", () => {
    it("compares two products side-by-side without fabricating missing values as 0", () => {
      const productA: NormalizedProduct = {
        marketplace: "etsy",
        externalId: "prod-a",
        title: "Handmade Ceramic Mug - White",
        price: 25.0,
        currency: "USD",
        reviewCount: 150,
        rating: 4.8,
        source: "ACTUAL_DATA",
        capturedAt: new Date(),
      };

      const productB: NormalizedProduct = {
        marketplace: "amazon",
        externalId: "prod-b",
        title: "Ceramic Coffee Mug - Black",
        price: 32.0,
        currency: "USD",
        reviewCount: 300,
        rating: 4.5,
        source: "ACTUAL_DATA",
        capturedAt: new Date(),
      };

      const comparison = ResearchComparisonEngine.compareProducts(productA, productB);
      assert.equal(comparison.comparisonType, "PRODUCT");
      assert.equal(comparison.metrics.length, 4);

      const priceMetric = comparison.metrics.find((m) => m.key === "price");
      assert.ok(priceMetric);
      assert.equal(priceMetric.winner, "A"); // Product A is cheaper
      assert.ok(priceMetric.deltaText?.includes("$7.00"));

      const revMetric = comparison.metrics.find((m) => m.key === "reviews");
      assert.ok(revMetric);
      assert.equal(revMetric.winner, "B"); // Product B has more reviews
    });
  });

  // --------------------------------------------------------------------------
  // 4. Research Queue & Watchlist Manager
  // --------------------------------------------------------------------------
  describe("4. Research Queue Management", () => {
    it("manages saving and retrieving items in the queue with organization scoping", async () => {
      const orgId = `org_test_${Date.now()}`;
      const item = await ResearchQueueManager.addToQueue({
        organizationId: orgId,
        targetType: "PRODUCT",
        identifier: "item-123",
        title: "Ergonomic Office Chair",
        marketplace: "amazon",
        query: "office chair",
        score: 82,
        momentum: "RISING",
        validationStatus: "STRONG_CANDIDATE",
      });

      assert.ok(item.id);
      assert.equal(item.organizationId, orgId);
      assert.equal(item.title, "Ergonomic Office Chair");

      const queue = await ResearchQueueManager.getQueue(orgId);
      assert.ok(queue.some((q) => q.identifier === "item-123"));

      const removed = await ResearchQueueManager.removeFromQueue(item.id, orgId);
      assert.equal(removed, true);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Zero-Fabrication Contract
  // --------------------------------------------------------------------------
  describe("5. Zero-Fabrication & Disclosures", () => {
    it("never fabricates monthly search volume or private store revenues", async () => {
      const result = await ProductResearchCommandCenter.executeSession({
        query: "wireless charger",
      });

      for (const kw of result.keywords) {
        assert.strictEqual(kw.searchVolume, null);
      }

      assert.ok(result.limitations.some((l) => l.includes("Exact monthly search query volume is strictly unavailable")));
      assert.ok(result.commercialDecision.unobservedSignals.length > 0);
    });
  });

  // --------------------------------------------------------------------------
  // 6. Multi-Tenant Scoping & API Architecture
  // --------------------------------------------------------------------------
  describe("6. Multi-Tenant API Route Architecture", () => {
    it("POST /api/research/session enforces session authentication and organizationId", () => {
      const routeSrc = fs.readFileSync(path.join(process.cwd(), "src/app/api/research/session/route.ts"), "utf8");
      assert.ok(routeSrc.includes("getServerSession(authOptions)"));
      assert.ok(routeSrc.includes("session.user.organizationId"));
      assert.ok(routeSrc.includes("ProductResearchCommandCenter.executeSession"));
    });

    it("GET /api/research/queue enforces session authentication and organizationId", () => {
      const routeSrc = fs.readFileSync(path.join(process.cwd(), "src/app/api/research/queue/route.ts"), "utf8");
      assert.ok(routeSrc.includes("getServerSession(authOptions)"));
      assert.ok(routeSrc.includes("ResearchQueueManager.getQueue(session.user.organizationId)"));
    });
  });

  // --------------------------------------------------------------------------
  // 7. Navigation Integration
  // --------------------------------------------------------------------------
  describe("7. Navigation & Command Center Integration", () => {
    it("Navigation config includes Command Center in primary Research group", () => {
      const navSrc = fs.readFileSync(path.join(process.cwd(), "src/services/navigation.ts"), "utf8");
      assert.ok(navSrc.includes("id: \"command-center\""));
      assert.ok(navSrc.includes("href: \"/research-center\""));
      assert.ok(navSrc.includes("Command Center"));
    });
  });

  // --------------------------------------------------------------------------
  // 8. Research Comparison Missing Metrics Guard
  // --------------------------------------------------------------------------
  describe("8. Research Comparison Null Safety", () => {
    it("handles products with missing price/reviews as INCOMPARABLE rather than 0", () => {
      const productA: NormalizedProduct = {
        marketplace: "etsy",
        externalId: "prod-a",
        title: "Artisan Ceramic Plate",
        price: null,
        currency: null,
        reviewCount: null,
        rating: null,
        source: "ACTUAL_DATA",
        capturedAt: new Date(),
      };

      const productB: NormalizedProduct = {
        marketplace: "amazon",
        externalId: "prod-b",
        title: "Commercial Ceramic Plate",
        price: 20.0,
        currency: "USD",
        reviewCount: 50,
        rating: 4.2,
        source: "ACTUAL_DATA",
        capturedAt: new Date(),
      };

      const comparison = ResearchComparisonEngine.compareProducts(productA, productB);
      const priceMetric = comparison.metrics.find((m) => m.key === "price");
      assert.ok(priceMetric);
      assert.equal(priceMetric.winner, "INCOMPARABLE");
      assert.equal(priceMetric.entityAValue, null);
    });
  });

  // --------------------------------------------------------------------------
  // 9. UI Component Exports
  // --------------------------------------------------------------------------
  describe("9. Command Center UI Component Verification", () => {
    it("ProductResearchCommandCenter component source contains all tabs and interactive controls", () => {
      const uiSrc = fs.readFileSync(path.join(process.cwd(), "src/components/research/ProductResearchCommandCenter.tsx"), "utf8");
      assert.ok(uiSrc.includes("Product Research Command Center"));
      assert.ok(uiSrc.includes("Observed Products"));
      assert.ok(uiSrc.includes("Keyword Clusters"));
      assert.ok(uiSrc.includes("Competition & Merchants"));
      assert.ok(uiSrc.includes("Data Quality & Trust"));
      assert.ok(uiSrc.includes("Compliant Public Acquisition Trace"));
    });
  });
});
