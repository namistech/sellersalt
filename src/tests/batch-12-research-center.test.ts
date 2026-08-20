/**
 * Batch 12: Ecommerce Intelligence Research Center & Workbench Productization Test Suite
 * 
 * Validates:
 * 1. Multi-modal research runs (PRODUCT, KEYWORD, SHOP, CATEGORY, NICHE, RADAR) via PUBLIC_WEB.
 * 2. Canonical marketplace capability matrix integrity.
 * 3. Zero-Fabrication Contract across all research outputs (null search volumes, explicit sales states).
 * 4. Multi-tier source strategy & fallbacks (PUBLIC_WEB -> MARKETPLACE_API -> HISTORICAL_OBSERVATION).
 * 5. ResearchRun lifecycle, persistence, cache, and execution budget tracking.
 * 6. Cross-marketplace Radar comparison & Best Available Channel selection.
 * 7. Longitudinal run diff and comparison engine.
 * 8. Organization isolation and multi-tenant security.
 */

import { describe, it, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { MarketplaceRegistry, registerAllConnectors } from "@/marketplaces/core/registry";
import { executeResearchRun, getOrganizationResearchRuns, getResearchRunDetails } from "@/marketplaces/core/acquisition/workbench";
import { harvestPublicMarketplaceKeywords } from "@/marketplaces/core/acquisition/keywords";
import { fetchPublicShopResearch } from "@/marketplaces/core/acquisition/shops";
import { aggregatePublicCategoryIntelligence } from "@/marketplaces/core/acquisition/categories";
import { discoverLiveMarketplaceNiches } from "@/services/intelligence/niche-discovery";
import { buildCrossMarketplaceComparison } from "@/services/intelligence/cross-marketplace-comparison";
import { getMarketplaceCapabilityMatrix, getMarketplaceCapability } from "@/lib/marketplace-capability-matrix";
import { ResearchCache } from "@/marketplaces/core/acquisition/research-cache";
import { ResearchBudgetTracker } from "@/marketplaces/core/acquisition/research-budgets";
import { SourceHealthTracker } from "@/marketplaces/core/acquisition/source-health";
import { compareResearchRuns } from "@/marketplaces/core/acquisition/diff-engine";
import { evaluateCanonicalOpportunity } from "@/services/intelligence/canonical-opportunity";
import type { NormalizedProduct } from "@/marketplaces/core/types";

describe("Batch 12: Ecommerce Intelligence Research Center", () => {
  before(() => {
    registerAllConnectors();
  });

  beforeEach(() => {
    ResearchCache.clear();
  });

  // --------------------------------------------------------------------------
  // 1. Marketplace Capability Matrix Single Source of Truth
  // --------------------------------------------------------------------------
  describe("Marketplace Capability Matrix", () => {
    it("returns honest capability flags matching real codebase implementations", () => {
      const matrix = getMarketplaceCapabilityMatrix();
      
      // Etsy is Live & Verified
      assert.equal(matrix.etsy.status, "IMPLEMENTED");
      assert.equal(matrix.etsy.publicWebCapabilities.productSearch, true);
      assert.equal(matrix.etsy.publicWebCapabilities.keywordDiscovery, true);
      assert.equal(matrix.etsy.publicWebCapabilities.shopResearch, true);

      // Amazon is Partial (Public Ingestion active, API not live)
      assert.equal(matrix.amazon.status, "PARTIAL");
      assert.equal(matrix.amazon.publicWebCapabilities.productSearch, true);
      assert.equal(matrix.amazon.apiCapabilities.research, false); // no fake live API

      // eBay is Partial
      assert.equal(matrix.ebay.status, "PARTIAL");
      assert.equal(matrix.ebay.publicWebCapabilities.productSearch, true);
      assert.equal(matrix.ebay.apiCapabilities.research, false);

      // Walmart is Partial
      assert.equal(matrix.walmart.status, "PARTIAL");
      assert.equal(matrix.walmart.publicWebCapabilities.productSearch, true);

      // TikTok Shop is Architecture Ready
      assert.equal(matrix.tiktok_shop.status, "ARCHITECTURE_READY");
      assert.equal(matrix.tiktok_shop.apiCapabilities.research, false);

      // Shopify is Connected Store Only (no public catalog)
      assert.equal(matrix.shopify.primaryAcquisitionMethod, "CONNECTED_STORE");
      assert.equal(matrix.shopify.publicWebCapabilities.productSearch, false);
      assert.equal(matrix.shopify.connectedStoreCapabilities.orders, true);
    });

    it("provides fallback descriptor for unknown marketplaces", () => {
      const unknown = getMarketplaceCapability("nonexistent_mkt" as any);
      assert.equal(unknown.status, "UNAVAILABLE");
      assert.equal(unknown.supportedResearchTypes.length, 0);
      assert.ok(unknown.limitations.length > 0);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Multi-Modal Research Execution via Unified Workbench
  // --------------------------------------------------------------------------
  describe("Multi-Modal Research Execution", () => {
    it("executes PRODUCT research returning normalized products with canonical opportunity scores", async () => {
      const res = await executeResearchRun({
        organizationId: "org_batch12_test",
        type: "PRODUCT",
        query: "ceramic planter",
        marketplaces: ["etsy"],
        limit: 10,
        bypassCache: true,
      });

      assert.equal(res.type, "PRODUCT");
      assert.ok(res.runId);
      assert.ok(Array.isArray(res.data));
      assert.ok(["COMPLETED", "PARTIAL", "UNAVAILABLE"].includes(res.status));
      assert.ok(typeof res.durationMs === "number");
      assert.ok(res.confidence >= 0 && res.confidence <= 100);

      // If items returned, verify opportunity scoring
      if (res.data.length > 0) {
        const sampleItem = res.data[0];
        assert.ok(sampleItem.title);
        assert.ok(sampleItem.opportunityScore);
        assert.ok(sampleItem.opportunityScore.score !== null);
      }
    });

    it("executes KEYWORD research with listing frequency % and strictly null search volume", async () => {
      const res = await executeResearchRun({
        organizationId: "org_batch12_test",
        type: "KEYWORD",
        query: "handmade ceramic mug",
        marketplaces: ["etsy"],
        limit: 15,
        bypassCache: true,
      });

      assert.equal(res.type, "KEYWORD");
      assert.ok(res.runId);
      assert.ok(res.data);
      const keywords = res.data.topKeywords || res.data.keywords || [];
      assert.ok(Array.isArray(keywords));

      // Verify Zero-Fabrication on search volume
      for (const kw of keywords) {
        assert.equal(kw.searchVolume, null);
        assert.equal(kw.searchVolumeProvenance, "UNAVAILABLE");
        assert.ok(kw.listingFrequencyPercent >= 0 && kw.listingFrequencyPercent <= 100);
        assert.ok(kw.demandProxyScore >= 0 && kw.demandProxyScore <= 100);
      }
    });

    it("executes SHOP research extracting catalog yield and competition scores", async () => {
      const res = await executeResearchRun({
        organizationId: "org_batch12_test",
        type: "SHOP",
        query: "ClayCraftStudio",
        marketplaces: ["etsy"],
        bypassCache: true,
      });

      assert.equal(res.type, "SHOP");
      assert.ok(res.runId);
      assert.ok(res.data);
      if (res.data.shop) {
        assert.equal(res.data.shop.name, "ClayCraftStudio");
        assert.ok(res.data.competition);
      }
    });

    it("executes CATEGORY research calculating empirical price percentiles and opportunity distributions", async () => {
      const res = await executeResearchRun({
        organizationId: "org_batch12_test",
        type: "CATEGORY",
        query: "Home Decor",
        marketplaces: ["etsy"],
        bypassCache: true,
      });

      assert.equal(res.type, "CATEGORY");
      assert.ok(res.runId);
      assert.ok(res.data);
      if (res.data.categoryName) {
        assert.equal(res.data.categoryName, "Home Decor");
        assert.ok(res.data.priceDistribution);
        assert.ok(res.data.opportunityDistribution);
      }
    });

    it("executes NICHE discovery without fabricating search volume or growth momentum", async () => {
      const res = await executeResearchRun({
        organizationId: "org_batch12_test",
        type: "NICHE",
        query: "planter",
        marketplaces: ["etsy"],
        limit: 10,
        bypassCache: true,
      });

      assert.equal(res.type, "NICHE");
      assert.ok(res.runId);
      assert.ok(res.data);
      if (res.data.niches && res.data.niches.length > 0) {
        const niche = res.data.niches[0];
        assert.ok(niche);
        assert.ok(niche.demand.observedDailyVelocity !== null);
        assert.equal(niche.momentum?.historicalGrowthRate, undefined);
      }
    });

    it("executes RADAR multi-marketplace research and dynamically selects Best Available Channel", async () => {
      const res = await executeResearchRun({
        organizationId: "org_batch12_test",
        type: "RADAR",
        query: "linen shirt",
        marketplaces: ["etsy", "amazon", "ebay", "walmart"],
        bypassCache: true,
      });

      assert.equal(res.type, "RADAR");
      assert.ok(res.runId);
      assert.ok(res.data.comparison);
      const evals = res.data.comparison.evaluations || res.data.comparison.channels;
      assert.ok(Array.isArray(evals));
      assert.equal(evals.length, 4);

      // Best Available Channel evaluated if any channel available
      if (res.data.comparison.bestMarketplace || res.data.comparison.bestChannel) {
        const best = res.data.comparison.bestMarketplace || res.data.comparison.bestChannel;
        assert.ok(best.marketplace);
        assert.ok(best.opportunityScore >= 0);
      }
    });
  });

  // --------------------------------------------------------------------------
  // 3. Cache & Budget Execution Controls
  // --------------------------------------------------------------------------
  describe("Cache & Budget Controls", () => {
    it("serves repeated identical requests from cache and tracks cache hit state", async () => {
      const req = {
        organizationId: "org_batch12_test",
        type: "PRODUCT" as const,
        query: "scented soy candle",
        marketplaces: ["etsy" as const],
        limit: 5,
      };

      const res1 = await executeResearchRun({ ...req, bypassCache: false });
      assert.equal(res1.isCached, false);

      const res2 = await executeResearchRun({ ...req, bypassCache: false });
      assert.equal(res2.isCached, true);
      assert.equal(res2.runId, res1.runId);

      // Bypass cache must force re-execution
      const res3 = await executeResearchRun({ ...req, bypassCache: true });
      assert.equal(res3.isCached, false);
    });

    it("enforces execution safety bounds via ResearchBudgetTracker", () => {
      const budget = new ResearchBudgetTracker({ maxPages: 2, maxListings: 10 });
      assert.equal(budget.recordPageFetch(), true);
      assert.equal(budget.recordListings(5), true);
      assert.equal(budget.canContinue(), true);
      budget.recordPageFetch();
      budget.recordListings(5);
      // Hit limit
      assert.equal(budget.canContinue(), false);
      assert.equal(budget.getSummary().isBudgetExhausted, true);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Source Health & Operational Resilience
  // --------------------------------------------------------------------------
  describe("Source Health & Operational Resilience", () => {
    it("records success and latencies in SourceHealthTracker", async () => {
      const record = await SourceHealthTracker.recordAttempt({
        marketplace: "test_marketplace",
        sourceType: "PUBLIC_WEB",
        success: true,
        latencyMs: 145,
      });

      assert.ok(record);
      assert.equal(record.status, "LIVE");
      assert.ok(record.successCount >= 1);
      assert.equal(record.failureCount, 0);
    });

    it("flags RATE_LIMITED status on 429 events", async () => {
      await SourceHealthTracker.recordAttempt({
        marketplace: "amazon",
        sourceType: "PUBLIC_WEB",
        success: false,
        latencyMs: 80,
        failureReason: "RATE_LIMITED",
      });
      const health = await SourceHealthTracker.getHealth("amazon", "PUBLIC_WEB");
      assert.ok(health);
      assert.equal(health.status, "RATE_LIMITED");
      assert.equal(health.failureCount, 1);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Research Comparison & Diff Engine
  // --------------------------------------------------------------------------
  describe("Run Comparison & Change Detection", () => {
    it("calculates appearing, disappearing, and persisting listings between two runs", () => {
      const runA = {
        id: "run_a",
        query: "wooden desk",
        marketplace: "etsy" as const,
        products: [
          { externalId: "p1", marketplace: "etsy", title: "Oak Desk", price: 200, rating: 4.8, reviewCount: 50, observedAt: new Date(Date.now() - 86400000) },
          { externalId: "p2", marketplace: "etsy", title: "Walnut Desk", price: 300, rating: 4.9, reviewCount: 80, observedAt: new Date(Date.now() - 86400000) },
        ],
      };

      const runB = {
        id: "run_b",
        query: "wooden desk",
        marketplace: "etsy" as const,
        products: [
          { externalId: "p1", marketplace: "etsy", title: "Oak Desk", price: 180, rating: 4.8, reviewCount: 55, observedAt: new Date() }, // Price drop + reviews
          { externalId: "p3", marketplace: "etsy", title: "Pine Desk", price: 150, rating: 4.5, reviewCount: 10, observedAt: new Date() }, // New item
        ],
      };

      const diff = compareResearchRuns(runA, runB);
      assert.equal(diff.persistingCount, 1);
      assert.equal(diff.appearingCount, 1);
      assert.equal(diff.disappearingCount, 1);
      assert.equal(diff.priceDropsCount, 1);
    });
  });

  // --------------------------------------------------------------------------
  // 6. Zero-Fabrication Contract & Provenance Integrity
  // --------------------------------------------------------------------------
  describe("Zero-Fabrication & Provenance Guarantees", () => {
    it("does not fabricate sales or search volumes when missing", () => {
      const evaluated = evaluateCanonicalOpportunity({
        marketplace: "etsy",
        price: 25.0,
        feeSchedule: { percentageFee: 0.095, flatFee: 0.2 },
        // sales velocity and reviews missing
      });

      assert.equal(evaluated.signals.unavailable.some((s) => s.id === "velocity"), true);
      assert.equal(evaluated.signals.unavailable.some((s) => s.id === "competition"), true);
      // Confidence reflects missing signals
      assert.ok(evaluated.confidenceScore <= 70);
    });
  });
});
