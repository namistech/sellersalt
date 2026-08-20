/**
 * SellerSalt Batch 11 Test Suite
 * Production Research Workbench & Persistent Observation Intelligence
 */

import { describe, it, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { computeProductObservationFingerprint, evaluateObservationChange } from "@/marketplaces/core/acquisition/deduplication";
import { calculateProductObservationDiff, compareResearchRuns } from "@/marketplaces/core/acquisition/diff-engine";
import { ResearchCache, RESEARCH_CACHE_TTLS } from "@/marketplaces/core/acquisition/research-cache";
import { ResearchBudgetTracker, DEFAULT_RESEARCH_BUDGET } from "@/marketplaces/core/acquisition/research-budgets";
import { SourceHealthTracker } from "@/marketplaces/core/acquisition/source-health";
import { executeResearchRun } from "@/marketplaces/core/acquisition/workbench";
import { validateAcquisitionCompliance, isAllowedMarketplaceUrl } from "@/marketplaces/core/acquisition/compliance";
import { evaluateCanonicalOpportunity } from "@/services/intelligence/canonical-opportunity";
import { discoverNichesFromProducts } from "@/services/intelligence/niche-discovery";
import { registerAllConnectors } from "@/marketplaces/core/registry";
import type { NormalizedProduct } from "@/marketplaces/core/types";

describe("Batch 11: Production Research Workbench & Persistent Observation Intelligence", () => {
  before(() => {
    registerAllConnectors();
  });

  beforeEach(() => {
    ResearchCache.clear();
  });

  // --------------------------------------------------------------------------
  // 1. Observation Identity & Deduplication
  // --------------------------------------------------------------------------
  describe("Observation Identity & Deduplication", () => {
    it("generates deterministic fingerprints for identical product observations", () => {
      const p1 = {
        price: 24.99,
        currency: "USD",
        rating: 4.8,
        reviewCount: 150,
        favoritesCount: 320,
        salesCount: 800,
        title: "Handmade Ceramic Mug - Matte White",
        shopName: "PotteryCo",
      };

      const p2 = {
        price: 24.99,
        currency: "usd",
        rating: 4.8,
        reviewCount: 150,
        favoritesCount: 320,
        salesCount: 800,
        title: "Handmade Ceramic Mug - Matte White ",
        shopName: "potteryco",
      };

      const fp1 = computeProductObservationFingerprint(p1);
      const fp2 = computeProductObservationFingerprint(p2);

      assert.equal(fp1, fp2);
      assert.equal(typeof fp1, "string");
      assert.equal(fp1.length, 32);
    });

    it("detects when an observation is unchanged vs changed", () => {
      const original = {
        price: 29.99,
        rating: 4.5,
        reviewCount: 50,
        title: "Leather Journal",
        shopName: "LeatherCraft",
      };

      const fpOriginal = computeProductObservationFingerprint(original);
      const existing = { ...original, fingerprint: fpOriginal };

      // Case A: Unchanged
      const evalUnchanged = evaluateObservationChange(existing, original);
      assert.equal(evalUnchanged.hasChanged, false);
      assert.equal(evalUnchanged.changedFields.length, 0);

      // Case B: Price Drop
      const priceDrop = { ...original, price: 24.99 };
      const evalPriceDrop = evaluateObservationChange(existing, priceDrop);
      assert.equal(evalPriceDrop.hasChanged, true);
      assert.ok(evalPriceDrop.changedFields.includes("price"));

      // Case C: Review & Rating Increase
      const reviewGain = { ...original, reviewCount: 65, rating: 4.7 };
      const evalReviews = evaluateObservationChange(existing, reviewGain);
      assert.equal(evalReviews.hasChanged, true);
      assert.ok(evalReviews.changedFields.includes("reviewCount"));
      assert.ok(evalReviews.changedFields.includes("rating"));
    });
  });

  // --------------------------------------------------------------------------
  // 2. Product & Query Change Detection Engine (Diff Engine)
  // --------------------------------------------------------------------------
  describe("Product & Query Change Detection Engine", () => {
    it("calculates accurate price drop, review gain, and monthly velocity on repeated observation", () => {
      const prevDate = new Date("2026-08-01T00:00:00Z");
      const currDate = new Date("2026-08-16T00:00:00Z"); // 15 days later

      const prev = {
        externalId: "item-123",
        marketplace: "etsy",
        price: 40.0,
        reviewCount: 100,
        rating: 4.6,
        opportunityScore: 70,
        observedAt: prevDate,
      };

      const curr = {
        externalId: "item-123",
        marketplace: "etsy",
        price: 32.0, // $8 drop (-20%)
        reviewCount: 130, // +30 reviews in 15 days -> ~60.9/mo
        rating: 4.8,
        opportunityScore: 78,
        observedAt: currDate,
      };

      const diff = calculateProductObservationDiff(prev, curr);

      assert.equal(diff.hasChanged, true);
      assert.equal(diff.price?.delta, -8.0);
      assert.equal(diff.price?.percentage, -20.0);
      assert.equal(diff.price?.isPriceDrop, true);

      assert.equal(diff.reviews?.delta, 30);
      assert.ok(diff.reviews?.velocityPerMonth && diff.reviews.velocityPerMonth > 55);

      assert.equal(diff.rating?.delta, 0.2);
      assert.equal(diff.opportunityScore?.delta, 8);
    });

    it("strictly returns null deltas for first-time product observations (Zero-Fabrication)", () => {
      const curr = {
        externalId: "new-item-456",
        marketplace: "amazon",
        price: 19.99,
        reviewCount: 25,
        rating: 4.3,
        opportunityScore: 65,
      };

      const diff = calculateProductObservationDiff(null, curr);

      assert.equal(diff.hasChanged, false);
      assert.equal(diff.price?.delta, null);
      assert.equal(diff.reviews?.delta, null);
      assert.equal(diff.rating?.delta, null);
      assert.equal(diff.opportunityScore?.delta, null);
    });

    it("compares two distinct research runs detecting appearing, disappearing, and persisting listings", () => {
      const runA = {
        id: "run-A",
        query: "planner",
        marketplace: "etsy",
        products: [
          { externalId: "prod-1", marketplace: "etsy", price: 20, rating: 4.5, reviewCount: 10 },
          { externalId: "prod-2", marketplace: "etsy", price: 30, rating: 4.0, reviewCount: 20 },
        ],
      };

      const runB = {
        id: "run-B",
        query: "planner",
        marketplace: "etsy",
        products: [
          { externalId: "prod-2", marketplace: "etsy", price: 25, rating: 4.2, reviewCount: 25 }, // Persisting, price drop
          { externalId: "prod-3", marketplace: "etsy", price: 15, rating: 5.0, reviewCount: 5 },  // Appearing
        ],
      };

      const diffSummary = compareResearchRuns(runA, runB);

      assert.equal(diffSummary.appearingCount, 1);
      assert.ok(diffSummary.appearingListings.includes("prod-3"));
      assert.equal(diffSummary.disappearingCount, 1);
      assert.ok(diffSummary.disappearingListings.includes("prod-1"));
      assert.equal(diffSummary.persistingCount, 1);
      assert.equal(diffSummary.priceDropsCount, 1);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Multi-Dimensional Research Cache & TTLs
  // --------------------------------------------------------------------------
  describe("Research Cache & TTL Management", () => {
    it("caches research responses and respects domain TTLs", () => {
      const req = { marketplace: "etsy", type: "PRODUCT", query: "leather bag", page: 1, limit: 25 };
      const sampleData = { items: [{ id: "1", title: "Bag" }] };

      assert.equal(ResearchCache.get(req), null);

      ResearchCache.set(req, sampleData, 5000); // 5 sec TTL
      const hit = ResearchCache.get(req);
      assert.deepEqual(hit, sampleData);

      const stats = ResearchCache.getStats();
      assert.equal(stats.hits, 1);
      assert.equal(stats.misses, 1);
    });

    it("correctly invalidates cache entries by marketplace or query", () => {
      ResearchCache.set({ marketplace: "etsy", type: "PRODUCT", query: "mug" }, { a: 1 });
      ResearchCache.set({ marketplace: "amazon", type: "PRODUCT", query: "mug" }, { b: 2 });
      ResearchCache.set({ marketplace: "etsy", type: "KEYWORD", query: "mug" }, { c: 3 });

      const invalidated = ResearchCache.invalidate({ marketplace: "etsy" });
      assert.equal(invalidated, 2);

      assert.equal(ResearchCache.get({ marketplace: "etsy", type: "PRODUCT", query: "mug" }), null);
      assert.ok(ResearchCache.get({ marketplace: "amazon", type: "PRODUCT", query: "mug" }) !== null);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Research Budgets & Execution Bounds
  // --------------------------------------------------------------------------
  describe("Research Budgets & Safety Bounds", () => {
    it("enforces pagination limits and listing quotas to prevent runaway crawling", () => {
      const budget = new ResearchBudgetTracker({ maxPages: 2, maxListings: 20 });

      assert.equal(budget.recordPageFetch(), true);
      assert.equal(budget.recordListings(15), true);
      assert.equal(budget.canContinue(), true);

      assert.equal(budget.recordPageFetch(), true); // Reached maxPages (2)
      assert.equal(budget.recordListings(10), false); // Exceeded maxListings (25 > 20)
      assert.equal(budget.canContinue(), false);

      const summary = budget.getSummary();
      assert.equal(summary.pagesFetched, 2);
      assert.equal(summary.listingsAcquired, 25);
      assert.equal(summary.isBudgetExhausted, true);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Acquisition Source Health Tracking
  // --------------------------------------------------------------------------
  describe("Acquisition Source Health Tracking", () => {
    it("records success, rate-limit, and access restriction status changes", async () => {
      const mkt = "walmart";
      const src = "PUBLIC_WEB";

      const s1 = await SourceHealthTracker.recordAttempt({
        marketplace: mkt,
        sourceType: src,
        success: true,
        latencyMs: 120,
      });
      assert.equal(s1.status, "LIVE");
      assert.equal(s1.successCount, 1);

      const s2 = await SourceHealthTracker.recordAttempt({
        marketplace: mkt,
        sourceType: src,
        success: false,
        latencyMs: 80,
        failureReason: "RATE_LIMITED",
      });
      assert.equal(s2.status, "RATE_LIMITED");
      assert.equal(s2.failureCount, 1);

      const health = await SourceHealthTracker.getHealth(mkt, src);
      assert.equal(health.status, "RATE_LIMITED");
      assert.equal(health.failureCount, 1);
    });
  });

  // --------------------------------------------------------------------------
  // 6. Security, SSRF & Private Dashboard Guards
  // --------------------------------------------------------------------------
  describe("SSRF & Compliance Guard Baseline", () => {
    it("allows valid public marketplace product URLs", () => {
      assert.equal(isAllowedMarketplaceUrl("https://www.etsy.com/listing/123456/ceramic-mug", "etsy"), true);
      assert.equal(isAllowedMarketplaceUrl("https://www.amazon.com/dp/B08N5WRWNW", "amazon"), true);
      assert.equal(isAllowedMarketplaceUrl("https://www.ebay.com/itm/123456789012", "ebay"), true);
      assert.equal(isAllowedMarketplaceUrl("https://www.walmart.com/ip/Ceramic-Coffee-Mug/123456789", "walmart"), true);
    });

    it("rejects SSRF attacks, internal IPs, cloud metadata, and private seller portals", () => {
      // Loopback / non-standard port throws AcquisitionComplianceError
      assert.throws(() => validateAcquisitionCompliance("http://127.0.0.1:8080/admin", {}, "etsy"));

      // Cloud metadata
      assert.throws(() => validateAcquisitionCompliance("http://169.254.169.254/latest/meta-data", {}, "amazon"));

      // Private seller portals
      assert.throws(() => validateAcquisitionCompliance("https://www.etsy.com/your/shops/me/dashboard", {}, "etsy"));
      assert.throws(() => validateAcquisitionCompliance("https://sellercentral.amazon.com/orders", {}, "amazon"));
    });
  });

  // --------------------------------------------------------------------------
  // 7. Canonical Opportunity Scoring & Zero-Fabrication
  // --------------------------------------------------------------------------
  describe("Canonical Scoring & Zero-Fabrication Integrity", () => {
    it("evaluates opportunity scores with explicit signal group availability", () => {
      const scoreResult = evaluateCanonicalOpportunity({
        marketplace: "etsy",
        price: 35.0,
        feeSchedule: { percentageFee: 0.095, flatFee: 0.2 },
        estDailySales: 4.5,
        shopReviewCount: 80,
        activeListings: 20,
        listingAgeDays: 60,
        shopAgeMonths: 18,
      });

      assert.ok(scoreResult.overallScore !== null && scoreResult.overallScore >= 0 && scoreResult.overallScore <= 100);
      assert.ok(scoreResult.confidenceScore >= 50 && scoreResult.confidenceScore <= 100);
      assert.ok(["EXCELLENT", "STRONG", "MODERATE", "SPECULATIVE", "CHALLENGING"].includes(scoreResult.tier));
    });

    it("aggregates niches from normalized products without inventing search volumes", () => {
      const mockProducts: NormalizedProduct[] = [
        {
          marketplace: "etsy",
          externalId: "p1",
          title: "Custom Dog Portrait Ceramic Mug",
          price: 28.0,
          currency: "USD",
          categoryPath: ["Home & Living", "Kitchen & Dining", "Drinkware", "Mugs"],
          salesCount: 300,
          shop: { name: "PetGifts", ageMonths: 12, avgSellingRatio: 8.5 },
          rating: 4.9,
          reviewCount: 45,
          acquisitionMethod: "PUBLIC_WEB",
          source: "ACTUAL_DATA",
          capturedAt: new Date(),
        },
        {
          marketplace: "etsy",
          externalId: "p2",
          title: "Cat Lover Ceramic Coffee Mug",
          price: 24.0,
          currency: "USD",
          categoryPath: ["Home & Living", "Kitchen & Dining", "Drinkware", "Mugs"],
          salesCount: 150,
          shop: { name: "CatLoverStore", ageMonths: 10, avgSellingRatio: 5.0 },
          rating: 4.7,
          reviewCount: 30,
          acquisitionMethod: "PUBLIC_WEB",
          source: "ACTUAL_DATA",
          capturedAt: new Date(),
        },
      ];

      const nicheSummary = discoverNichesFromProducts(mockProducts, "etsy", "mug");

      assert.ok(nicheSummary.totalNichesFound >= 1);
      const topNiche = nicheSummary.niches[0];
      assert.ok(topNiche);
      assert.equal(topNiche.observedProductCount, 2);
      assert.equal(topNiche.demand.observedDailyVelocity !== null, true);
    });
  });

  // --------------------------------------------------------------------------
  // 8. Unified Research Workbench Orchestration
  // --------------------------------------------------------------------------
  describe("Unified Research Workbench Orchestrator", () => {
    it("executes unified product research run returning structured workbench response", async () => {
      const response = await executeResearchRun({
        organizationId: "org_test_workbench",
        type: "PRODUCT",
        query: "leather wallet",
        marketplaces: ["etsy"],
        limit: 10,
        bypassCache: true,
      });

      assert.ok(response.runId);
      assert.equal(response.type, "PRODUCT");
      assert.equal(response.query, "leather wallet");
      assert.ok(Array.isArray(response.data));
      assert.ok(["COMPLETED", "PARTIAL"].includes(response.status));
      assert.equal(typeof response.durationMs, "number");
      assert.equal(response.isCached, false);
      assert.ok(response.confidence >= 50);
    });

    it("executes keyword research run harvesting empirical terms and intent categories", async () => {
      const response = await executeResearchRun({
        organizationId: "org_test_workbench",
        type: "KEYWORD",
        query: "ceramic planter",
        marketplaces: ["etsy"],
        limit: 10,
        bypassCache: true,
      });

      assert.ok(response.runId);
      assert.equal(response.type, "KEYWORD");
      assert.ok(response.data);
      assert.ok(Array.isArray(response.data.topKeywords || response.data.keywords));
      assert.equal(response.status, "COMPLETED");
    });

    it("serves subsequent identical research requests from research cache", async () => {
      const req = {
        organizationId: "org_test_workbench",
        type: "PRODUCT" as const,
        query: "wedding favor candle",
        marketplaces: ["etsy" as const],
        limit: 5,
      };

      const res1 = await executeResearchRun({ ...req, bypassCache: false });
      assert.equal(res1.isCached, false);

      const res2 = await executeResearchRun({ ...req, bypassCache: false });
      assert.equal(res2.isCached, true);
      assert.equal(res2.runId, res1.runId);
    });
  });
});

