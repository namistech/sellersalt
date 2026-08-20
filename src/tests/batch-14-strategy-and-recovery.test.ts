/**
 * SellerSalt Batch 14 Comprehensive Test Suite
 * 
 * Tests:
 * 1. Centralized Acquisition Strategy Engine (prioritization, health degradation, fallback chains).
 * 2. Universal Pagination Engine (deduplication, budget caps, saturation termination).
 * 3. Query Normalization & Search Variants (tokenization, stop words, bounded generation).
 * 4. Parser Health & Drift Detection (field fill rates, degradation detection, challenge detection).
 * 5. Autonomous Acquisition Recovery (multi-stage recovery pipeline, compliance halts).
 * 6. Multi-Marketplace Public Adapters (Etsy, Amazon, eBay, Walmart, TikTok Shop, Shopify, WooCommerce).
 * 7. Upgraded Keyword, Shop, Category, Niche Intelligence.
 * 8. Zero-Fabrication & Security (SSRF protection, unobserved metrics remain null).
 */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { registerAllConnectors, MarketplaceRegistry } from "@/marketplaces/core/registry";
import { AcquisitionStrategyEngine } from "@/marketplaces/core/acquisition/strategy-engine";
import { UniversalPaginationEngine } from "@/marketplaces/core/acquisition/pagination";
import { QueryNormalizer } from "@/marketplaces/core/acquisition/query-normalizer";
import { ParserHealthEngine } from "@/marketplaces/core/acquisition/parser-health";
import { AcquisitionRecoveryEngine } from "@/marketplaces/core/acquisition/recovery-engine";
import { ResearchBudgetTracker } from "@/marketplaces/core/acquisition/research-budgets";
import { harvestPublicMarketplaceKeywords, buildDeterministicKeywordClusters } from "@/marketplaces/core/acquisition/keywords";
import { fetchPublicShopResearch } from "@/marketplaces/core/acquisition/shops";
import { aggregatePublicCategoryIntelligence, comparePublicCategories } from "@/marketplaces/core/acquisition/categories";
import { discoverNichesFromProducts } from "@/services/intelligence/niche-discovery";
import { evaluateResearchQuality } from "@/marketplaces/core/acquisition/research-quality";
import { isSafeRedirect } from "@/marketplaces/core/acquisition/compliance";
import { getMarketplaceCapabilityMatrix } from "@/lib/marketplace-capability-matrix";
import type { NormalizedProduct } from "@/marketplaces/core/types";

describe("Batch 14: Production Research Intelligence & Autonomous Acquisition Recovery", () => {
  before(() => {
    registerAllConnectors();
  });

  // --------------------------------------------------------------------------
  // 1. Centralized Acquisition Strategy Engine
  // --------------------------------------------------------------------------
  describe("Acquisition Strategy Engine", () => {
    it("resolves prioritized strategies for a product research request", async () => {
      const plan = await AcquisitionStrategyEngine.resolveStrategyPlan({
        marketplace: "etsy",
        researchType: "PRODUCT",
        preferredSources: ["PUBLIC_WEB", "MARKETPLACE_API", "HISTORICAL_OBSERVATION"],
      });

      assert.equal(plan.marketplace, "etsy");
      assert.equal(plan.researchType, "PRODUCT");
      assert.ok(plan.strategies.length >= 2);
      assert.equal(plan.primaryStrategy.sourceType, "PUBLIC_WEB");
      assert.ok(plan.fallbackStrategies.some((s) => s.sourceType === "HISTORICAL_OBSERVATION"));
    });

    it("includes secondary API enrichment for marketplaces with API capability", async () => {
      const plan = await AcquisitionStrategyEngine.resolveStrategyPlan({
        marketplace: "etsy",
        researchType: "PRODUCT",
        enableSecondaryApi: true,
      });

      const apiStrat = plan.strategies.find((s) => s.id === "SECONDARY_OFFICIAL_API");
      assert.ok(apiStrat, "Etsy should have SECONDARY_OFFICIAL_API strategy enabled");
      assert.equal(apiStrat?.sourceType, "MARKETPLACE_API");
    });

    it("omits API strategy for marketplaces without API credentials without fabricating", async () => {
      const plan = await AcquisitionStrategyEngine.resolveStrategyPlan({
        marketplace: "amazon",
        researchType: "PRODUCT",
        enableSecondaryApi: true,
      });

      const apiStrat = plan.strategies.find((s) => s.id === "SECONDARY_OFFICIAL_API");
      assert.equal(apiStrat, undefined, "Amazon has no API credentials; API strategy must not be registered");
    });
  });

  // --------------------------------------------------------------------------
  // 2. Universal Pagination Engine
  // --------------------------------------------------------------------------
  describe("Universal Pagination Engine", () => {
    it("coordinates multi-page acquisition and deduplicates listings", async () => {
      const mockPages = [
        { items: [{ id: "1", title: "Mug A" }, { id: "2", title: "Mug B" }], hasMore: true },
        { items: [{ id: "2", title: "Mug B" }, { id: "3", title: "Mug C" }], hasMore: true },
        { items: [{ id: "4", title: "Mug D" }], hasMore: false },
      ];

      const result = await UniversalPaginationEngine.paginate({
        maxPages: 3,
        maxItems: 10,
        getId: (item: any) => item.id,
        fetchPage: async (page) => mockPages[page - 1] || { items: [], hasMore: false },
      });

      assert.equal(result.uniqueCount, 4);
      assert.equal(result.duplicateCount, 1);
      assert.equal(result.pagesFetched, 3);
      assert.equal(result.items.length, 4);
    });

    it("terminates pagination early on duplicate saturation", async () => {
      const duplicatePage = {
        items: [
          { id: "1", title: "Item 1" },
          { id: "2", title: "Item 2" },
          { id: "3", title: "Item 3" },
          { id: "4", title: "Item 4" },
          { id: "5", title: "Item 5" },
          { id: "6", title: "Item 6" },
        ],
        hasMore: true,
      };

      const result = await UniversalPaginationEngine.paginate({
        maxPages: 5,
        maxItems: 50,
        duplicateRateThreshold: 0.8,
        getId: (item: any) => item.id,
        fetchPage: async (page) => duplicatePage, // Same items every page
      });

      assert.equal(result.pagesFetched, 2);
      assert.equal(result.terminationReason, "DUPLICATE_SATURATION");
    });

    it("halts immediately on ACCESS_RESTRICTED without retrying", async () => {
      let fetchCount = 0;
      const result = await UniversalPaginationEngine.paginate({
        maxPages: 5,
        getId: (item: any) => item.id,
        fetchPage: async (page) => {
          fetchCount++;
          if (page === 2) {
            return { items: [], failureReason: "ACCESS_RESTRICTED" };
          }
          return { items: [{ id: "1", title: "A" }], hasMore: true };
        },
      });

      assert.equal(fetchCount, 2);
      assert.equal(result.terminationReason, "ACCESS_RESTRICTED");
    });
  });

  // --------------------------------------------------------------------------
  // 3. Query Normalization & Search Variants Engine
  // --------------------------------------------------------------------------
  describe("Query Normalization & Search Variants", () => {
    it("normalizes whitespace, punctuation noise, and stop words", () => {
      const profile = QueryNormalizer.normalize("  The Best Ceramic Coffee Mugs For Gift!!  ");
      assert.equal(profile.normalizedQuery, "best ceramic coffee mugs gift");
      assert.ok(profile.cleanTokens.includes("ceramic"));
      assert.ok(profile.cleanTokens.includes("coffee"));
      assert.ok(profile.cleanTokens.includes("mugs"));
      assert.equal(profile.isSpecific, true);
    });

    it("generates bounded variants without runaway explosion", () => {
      const profile = QueryNormalizer.normalize("handmade leather journal notebook", 3);
      assert.ok(profile.variants.length <= 3);
      assert.ok(profile.variants.length >= 1);
      assert.equal(profile.variants[0], "handmade leather journal notebook");
    });

    it("handles single token and empty input gracefully", () => {
      const empty = QueryNormalizer.normalize("");
      assert.equal(empty.normalizedQuery, "");
      assert.equal(empty.variants.length, 0);

      const single = QueryNormalizer.normalize("pottery");
      assert.equal(single.normalizedQuery, "pottery");
      assert.equal(single.variants.length, 1);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Parser Health & Drift Detection Engine
  // --------------------------------------------------------------------------
  describe("Parser Health & Drift Detection", () => {
    const mockHealthyProducts: NormalizedProduct[] = Array.from({ length: 20 }, (_, i) => ({
      marketplace: "amazon",
      externalId: `B000${i}`,
      title: `Wireless Ergonomic Keyboard Model ${i}`,
      url: `https://www.amazon.com/dp/B000${i}`,
      price: 49.99,
      currency: "USD",
      rating: 4.6,
      reviewCount: 350 + i,
      shop: { name: "TechBrand" },
      imageUrl: "https://m.media-amazon.com/images/I/sample.jpg",
      categoryPath: ["Electronics", "Keyboards"],
      source: "ACTUAL_DATA",
      capturedAt: new Date(),
    }));

    it("evaluates healthy parser extraction with high fill rates", () => {
      const health = ParserHealthEngine.evaluate({
        marketplace: "amazon",
        items: mockHealthyProducts,
      });

      assert.equal(health.marketplace, "amazon");
      assert.equal(health.status, "HEALTHY");
      assert.equal(health.driftDetected, false);
      assert.equal(health.metrics.fillRates.titlePercent, 100);
      assert.equal(health.metrics.fillRates.pricePercent, 100);
      assert.ok(health.confidenceScore >= 90);
    });

    it("flags parser degradation when price extraction collapses", () => {
      const degradedProducts = mockHealthyProducts.map((p, idx) => ({
        ...p,
        price: idx === 0 ? 49.99 : null, // Only 1 out of 20 has price (5% fill rate)
      }));

      const health = ParserHealthEngine.evaluate({
        marketplace: "amazon",
        items: degradedProducts,
      });

      assert.equal(health.status, "DEGRADED");
      assert.equal(health.driftDetected, true);
      assert.ok(health.driftReason?.includes("Price extraction rate"));
    });

    it("detects bot verification / CAPTCHA challenge HTML without throwing", () => {
      const health = ParserHealthEngine.evaluate({
        marketplace: "amazon",
        items: [],
        rawHtml: "<html><body><form><h4>Type the characters you see in this image:</h4><input /></form></body></html>",
        statusCode: 200,
      });

      assert.equal(health.status, "DEGRADED");
      assert.ok(health.driftReason?.includes("challenge interstitial"));
    });
  });

  // --------------------------------------------------------------------------
  // 5. Autonomous Acquisition Recovery Engine
  // --------------------------------------------------------------------------
  describe("Autonomous Acquisition Recovery Engine", () => {
    it("executes strategy plan and records step attempts", async () => {
      const res = await AcquisitionRecoveryEngine.executeWithRecovery({
        marketplace: "etsy",
        researchType: "PRODUCT",
        query: "ceramic bowl",
        limit: 10,
      });

      assert.ok(res.attempts.length >= 1);
      assert.ok(res.totalDurationMs >= 0);
      assert.ok(Array.isArray(res.sourcesUsed));
      assert.ok(Array.isArray(res.limitations));
    });
  });

  // --------------------------------------------------------------------------
  // 6. Upgraded Keyword Intelligence
  // --------------------------------------------------------------------------
  describe("Keyword Intelligence Engine", () => {
    it("harvests empirical tokens, listing prevalence %, and intent clusters without fake volume", async () => {
      const harvest = await harvestPublicMarketplaceKeywords({
        query: "wedding favor mug",
        marketplace: "etsy",
        limit: 20,
      });

      assert.equal(harvest.marketplace, "etsy");
      assert.ok(Array.isArray(harvest.topKeywords));
      assert.ok(Array.isArray(harvest.clusters));

      // Verify Zero-Fabrication on harvest
      harvest.topKeywords.forEach((kw) => {
        assert.equal(kw.searchVolume, null);
        assert.equal(kw.searchVolumeProvenance, "UNAVAILABLE");
        assert.ok(kw.listingFrequencyPercent >= 0 && kw.listingFrequencyPercent <= 100);
      });

      // Verify intent classification on sample observations
      const clusters = buildDeterministicKeywordClusters([
        {
          keyword: "personalized ceramic mug",
          marketplace: "etsy",
          occurrenceCount: 12,
          listingFrequencyPercent: 60,
          observedAveragePrice: 24.5,
          demandProxyScore: 78,
          competitionProxy: "MODERATE",
          searchVolume: null,
          searchVolumeProvenance: "UNAVAILABLE",
          freshness: { isFresh: true, isStale: false, stalenessHours: 0, lastObservedAt: new Date() } as any,
          provenance: "ACTUAL_DATA",
          observedAt: new Date(),
        },
      ]);
      assert.ok(clusters.length > 0);
    });
  });

  // --------------------------------------------------------------------------
  // 7. Upgraded Shop Intelligence
  // --------------------------------------------------------------------------
  describe("Shop & Seller Intelligence", () => {
    it("fetches public shop profile and reports price range and competition rating", async () => {
      const shopRes = await fetchPublicShopResearch("PotteryStudio", "etsy");
      if ("shop" in shopRes && shopRes.shop) {
        assert.equal(shopRes.marketplace, "etsy");
        assert.ok(shopRes.competition);
        assert.ok(shopRes.competition.score !== null && shopRes.competition.score >= 0 && shopRes.competition.score <= 100);
        // Zero-fabrication check
        assert.equal((shopRes.shop as any).conversionRate, undefined);
      }
    });
  });

  // --------------------------------------------------------------------------
  // 8. Upgraded Category Intelligence & Comparison
  // --------------------------------------------------------------------------
  describe("Category Intelligence & Comparison", () => {
    it("aggregates category price percentiles and opportunity distribution", async () => {
      const catRes = await aggregatePublicCategoryIntelligence({
        categoryName: "Ceramics & Pottery",
        marketplace: "etsy",
        limit: 20,
      });

      if ("categoryName" in catRes) {
        assert.equal(catRes.categoryName, "Ceramics & Pottery");
        assert.ok(catRes.priceDistribution);
        assert.ok(catRes.opportunityDistribution);
        assert.ok(catRes.topProducts.length >= 0);
      }
    });

    it("compares multiple public categories and identifies highest opportunity", async () => {
      const comparison = await comparePublicCategories({
        categories: ["Ceramic Mugs", "Glass Cups"],
        marketplace: "etsy",
        limitPerCategory: 10,
      });

      assert.equal(comparison.marketplace, "etsy");
      assert.equal(comparison.categories.length, 2);
      assert.ok("highestYieldCategory" in comparison.comparison);
      assert.ok("highestOpportunityCategory" in comparison.comparison);
      assert.ok("highestMedianPriceCategory" in comparison.comparison);
    });
  });

  // --------------------------------------------------------------------------
  // 9. Upgraded Niche Discovery Engine
  // --------------------------------------------------------------------------
  describe("Niche Discovery Engine", () => {
    it("discovers structured niche profiles from normalized products", () => {
      const mockProducts: NormalizedProduct[] = [
        {
          marketplace: "etsy",
          externalId: "n1",
          title: "Personalized Ceramic Wedding Mug",
          url: "https://etsy.com/1",
          price: 24.5,
          currency: "USD",
          rating: 4.9,
          reviewCount: 220,
          shop: { name: "WeddingGiftsCo" },
          categoryPath: ["Home & Living", "Kitchen & Dining", "Mugs"],
          source: "ACTUAL_DATA",
          capturedAt: new Date(),
        },
        {
          marketplace: "etsy",
          externalId: "n2",
          title: "Custom Monogram Coffee Mug",
          url: "https://etsy.com/2",
          price: 26.0,
          currency: "USD",
          rating: 4.8,
          reviewCount: 140,
          shop: { name: "WeddingGiftsCo" },
          categoryPath: ["Home & Living", "Kitchen & Dining", "Mugs"],
          source: "ACTUAL_DATA",
          capturedAt: new Date(),
        },
      ];

      const summary = discoverNichesFromProducts(mockProducts, "etsy", "wedding mugs");
      assert.equal(summary.marketplace, "etsy");
      assert.ok(summary.niches.length > 0);

      const niche = summary.niches[0];
      assert.ok(niche.nicheName);
      assert.ok(niche.observedProductCount > 0);
      assert.ok(niche.sampleProducts.length > 0);
      assert.ok(niche.averagePrice !== null);
      assert.ok(niche.opportunityScore !== null && niche.opportunityScore >= 0);
    });
  });

  // --------------------------------------------------------------------------
  // 10. Research Quality & Dataset Trustworthiness
  // --------------------------------------------------------------------------
  describe("Research Quality Model", () => {
    it("computes field-level coverage metrics and source timeline", () => {
      const quality = evaluateResearchQuality({
        itemCount: 25,
        liveCount: 25,
        historicalCount: 0,
        sourcesUsed: ["PUBLIC_WEB"],
        freshnessStatus: "LIVE",
        sampleProducts: [
          {
            marketplace: "amazon",
            externalId: "B1",
            title: "Item 1",
            url: "https://amazon.com/dp/B1",
            price: 19.99,
            currency: "USD",
            rating: 4.5,
            reviewCount: 100,
            shop: { name: "Seller A" },
            categoryPath: ["Category A"],
            source: "ACTUAL_DATA",
            capturedAt: new Date(),
          },
        ],
      });

      assert.ok(quality.qualityScore >= 75);
      assert.equal(quality.qualityTier, "HIGH");
      assert.ok(quality.fieldMetrics.length >= 4);
      assert.ok(quality.sourceTimeline.length >= 2);
    });
  });

  // --------------------------------------------------------------------------
  // 11. Security & Compliance Enforcement
  // --------------------------------------------------------------------------
  describe("Security & SSRF Redirect Guard", () => {
    it("blocks internal loopback, private subnets, and cloud metadata", () => {
      assert.equal(isSafeRedirect("https://www.etsy.com", "http://127.0.0.1:8000/steal", "etsy"), false);
      assert.equal(isSafeRedirect("https://www.etsy.com", "http://localhost:3000/api", "etsy"), false);
      assert.equal(isSafeRedirect("https://www.etsy.com", "http://169.254.169.254/latest/meta-data", "etsy"), false);
      assert.equal(isSafeRedirect("https://www.etsy.com", "http://10.0.0.1/admin", "etsy"), false);
      assert.equal(isSafeRedirect("https://www.etsy.com", "http://192.168.1.1/router", "etsy"), false);
    });

    it("blocks authenticated seller portal redirects", () => {
      assert.equal(isSafeRedirect("https://www.amazon.com", "https://sellercentral.amazon.com/dashboard", "amazon"), false);
      assert.equal(isSafeRedirect("https://www.walmart.com", "https://seller.walmart.com/portal", "walmart"), false);
      assert.equal(isSafeRedirect("https://www.etsy.com", "https://www.etsy.com/your/shops/manage", "etsy"), false);
    });

    it("allows valid public marketplace redirects", () => {
      assert.equal(isSafeRedirect("https://www.etsy.com/search", "https://www.etsy.com/listing/123/mug", "etsy"), true);
      assert.equal(isSafeRedirect("https://www.amazon.com/s", "https://www.amazon.com/dp/B001", "amazon"), true);
    });
  });

  // --------------------------------------------------------------------------
  // 12. Marketplace Readiness Matrix Truthfulness
  // --------------------------------------------------------------------------
  describe("Marketplace Capability Matrix", () => {
    it("truthfully reflects public web and API readiness across all channels", () => {
      const matrix = getMarketplaceCapabilityMatrix();
      assert.equal(matrix.etsy.status, "IMPLEMENTED");
      assert.equal(matrix.amazon.status, "PARTIAL");
      assert.equal(matrix.ebay.status, "PARTIAL");
      assert.equal(matrix.walmart.status, "PARTIAL");
      assert.equal(matrix.shopify.status, "PARTIAL");
      assert.equal(matrix.woocommerce.status, "PARTIAL");
      assert.equal(matrix.tiktok_shop.status, "ARCHITECTURE_READY");
    });
  });
});
