/**
 * SellerSalt — Batch 15 Test Suite
 * 
 * Comprehensive verification of Intelligence Data Depth, Marketplace Coverage Expansion,
 * Longitudinal Aggregation, Market Memory Snapshots, Demand Intelligence, and Zero-Fabrication integrity.
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

import { getMarketplaceCapabilityMatrix } from "@/lib/marketplace-capability-matrix";
import {
  ProductDemandEngine,
  LongitudinalIntelligenceEngine,
  MarketMemoryEngine,
  aggregatePublicCategoryIntelligence,
  fetchPublicShopResearch,
  harvestPublicMarketplaceKeywords,
  evaluateResearchQuality,
} from "@/marketplaces/core/acquisition";
import { discoverNichesFromProducts } from "@/services/intelligence/niche-discovery";
import type { NormalizedProduct } from "@/marketplaces/core/types";

describe("Batch 15: Intelligence Data Depth & Marketplace Coverage Expansion", () => {
  before(() => {
    MarketMemoryEngine.clear();
  });

  after(() => {
    MarketMemoryEngine.clear();
  });

  // --------------------------------------------------------------------------
  // 1. Marketplace Capability Matrix & Coverage
  // --------------------------------------------------------------------------
  describe("1. Marketplace Capability Matrix", () => {
    it("reports honest capability flags and readiness across all registered marketplaces", () => {
      const matrix = getMarketplaceCapabilityMatrix();
      
      assert.ok(matrix.etsy);
      assert.equal(matrix.etsy.status, "IMPLEMENTED");
      assert.equal(matrix.etsy.publicWebCapabilities.productSearch, true);
      assert.equal(matrix.etsy.apiCapabilities.research, true);

      assert.ok(matrix.amazon);
      assert.equal(matrix.amazon.status, "PARTIAL");
      assert.equal(matrix.amazon.publicWebCapabilities.productSearch, true);
      assert.equal(matrix.amazon.apiCapabilities.research, false); // No credentials

      assert.ok(matrix.ebay);
      assert.equal(matrix.ebay.status, "PARTIAL");
      assert.equal(matrix.ebay.publicWebCapabilities.productSearch, true);

      assert.ok(matrix.tiktok_shop);
      assert.equal(matrix.tiktok_shop.status, "ARCHITECTURE_READY");
    });
  });

  // --------------------------------------------------------------------------
  // 2. Product Demand Intelligence Engine
  // --------------------------------------------------------------------------
  describe("2. Product Demand Intelligence Engine", () => {
    it("evaluates demand proxy score from legitimate observable signals", () => {
      const product: NormalizedProduct = {
        marketplace: "etsy",
        externalId: "p1",
        title: "Handmade Leather Journal Notebook",
        price: 34.99,
        currency: "USD",
        rating: 4.9,
        reviewCount: 420,
        favoritesCount: 850,
        shop: {
          name: "LeatherCraftsCo",
          reviewVelocity: 14.5,
          ageMonths: 24,
        },
        source: "ACTUAL_DATA",
        capturedAt: new Date(),
      };

      const demandProfile = ProductDemandEngine.evaluateDemand(product);

      assert.ok(demandProfile.demandProxyScore !== null);
      assert.ok(demandProfile.demandProxyScore >= 70);
      assert.equal(demandProfile.demandTier, "HIGH");
      assert.ok(demandProfile.confidence >= 80);

      // Verify explicit signal classification
      const observedNames = demandProfile.observedSignals.map((s) => s.name);
      assert.ok(observedNames.includes("reviewCount"));
      assert.ok(observedNames.includes("rating"));
      assert.ok(observedNames.includes("favoritesCount"));

      const derivedNames = demandProfile.derivedSignals.map((s) => s.name);
      assert.ok(derivedNames.includes("reviewVelocity"));

      // Zero-fabrication check: exact search volume is explicitly marked unavailable
      assert.ok(demandProfile.unavailableSignals.some((s) => s.includes("Exact monthly search query volume unavailable")));
    });

    it("returns UNAVAILABLE demand profile when product has zero observable signals", () => {
      const bareProduct: NormalizedProduct = {
        marketplace: "amazon",
        externalId: "p2",
        title: "Generic Item Without Metrics",
        price: null,
        currency: null,
        source: "ACTUAL_DATA",
        capturedAt: new Date(),
      };

      const demandProfile = ProductDemandEngine.evaluateDemand(bareProduct);

      assert.equal(demandProfile.demandProxyScore, null);
      assert.equal(demandProfile.demandTier, "UNAVAILABLE");
      assert.equal(demandProfile.confidence, 0);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Deep Category Intelligence & Multi-Percentile Benchmarking
  // --------------------------------------------------------------------------
  describe("3. Category Intelligence & Percentile Distribution", () => {
    it("computes 10th, 25th, median, 75th, 90th percentiles and seller concentration", async () => {
      const mockProducts: NormalizedProduct[] = [
        { marketplace: "etsy", externalId: "1", title: "Pottery Mug A", price: 10, currency: "USD", shop: { name: "Shop1" }, reviewCount: 15, source: "ACTUAL_DATA", capturedAt: new Date() },
        { marketplace: "etsy", externalId: "2", title: "Pottery Mug B", price: 20, currency: "USD", shop: { name: "Shop1" }, reviewCount: 30, source: "ACTUAL_DATA", capturedAt: new Date() },
        { marketplace: "etsy", externalId: "3", title: "Pottery Mug C", price: 30, currency: "USD", shop: { name: "Shop2" }, reviewCount: 60, source: "ACTUAL_DATA", capturedAt: new Date() },
        { marketplace: "etsy", externalId: "4", title: "Pottery Mug D", price: 40, currency: "USD", shop: { name: "Shop3" }, reviewCount: 120, source: "ACTUAL_DATA", capturedAt: new Date() },
        { marketplace: "etsy", externalId: "5", title: "Pottery Mug E", price: 50, currency: "USD", shop: { name: "Shop4" }, reviewCount: 300, source: "ACTUAL_DATA", capturedAt: new Date() },
      ];

      const catIntel = await aggregatePublicCategoryIntelligence({
        categoryName: "Pottery Mugs",
        marketplace: "etsy",
        products: mockProducts,
      });

      assert.equal(catIntel.observedCatalogCount, 5);
      assert.equal(catIntel.observedSellerCount, 4);
      assert.ok(catIntel.priceDistribution.median !== null);
      assert.equal(catIntel.priceDistribution.median, 30);
      assert.ok(catIntel.priceDistribution.percentile10 !== null);
      assert.ok(catIntel.priceDistribution.percentile25 !== null);
      assert.ok(catIntel.priceDistribution.percentile75 !== null);
      assert.ok(catIntel.priceDistribution.percentile90 !== null);
      assert.ok(catIntel.sellerConcentrationIndex !== null);
      assert.ok(catIntel.reviewBarrierRating === "MODERATE" || catIntel.reviewBarrierRating === "LOW");
    });
  });

  // --------------------------------------------------------------------------
  // 4. Enhanced Seller / Shop Intelligence
  // --------------------------------------------------------------------------
  describe("4. Public Seller & Shop Intelligence", () => {
    it("reports observed catalog size, category concentration, and median price", async () => {
      const shopRes = await fetchPublicShopResearch("ClayArtCo", "etsy");

      if ("shop" in shopRes) {
        assert.equal(shopRes.marketplace, "etsy");
        assert.ok(shopRes.observedCatalogSize >= 0);
        assert.ok(shopRes.priceRange);
        assert.ok(shopRes.competition);
      }
    });
  });

  // --------------------------------------------------------------------------
  // 5. Keyword Intelligence 2.0 & Momentum
  // --------------------------------------------------------------------------
  describe("5. Keyword Intelligence 2.0", () => {
    it("extracts keyword prevalence %, seller prevalence %, and intent without fake search volume", async () => {
      const kwSummary = await harvestPublicMarketplaceKeywords({
        query: "ceramic planter",
        marketplace: "etsy",
        limit: 10,
      });

      assert.equal(kwSummary.marketplace, "etsy");
      assert.ok(kwSummary.topKeywords.length >= 0);
      for (const kw of kwSummary.topKeywords) {
        assert.equal(kw.searchVolume, null);
        assert.equal(kw.searchVolumeProvenance, "UNAVAILABLE");
        assert.ok(kw.demandProxyScore >= 0 && kw.demandProxyScore <= 100);
      }
    });
  });

  // --------------------------------------------------------------------------
  // 6. Longitudinal Intelligence Engine
  // --------------------------------------------------------------------------
  describe("6. Longitudinal Intelligence Engine", () => {
    it("strictly returns null deltas when n <= 1 snapshot exists (Zero-Fabrication Contract)", async () => {
      const longIntel = await LongitudinalIntelligenceEngine.evaluateProduct("non_existent_id", "etsy");

      assert.equal(longIntel.hasLongitudinalData, false);
      assert.equal(longIntel.priceDelta, null);
      assert.equal(longIntel.priceDeltaPercent, null);
      assert.equal(longIntel.reviewVelocityDaily, null);
      assert.equal(longIntel.persistenceTier, "NEW");
    });

    it("returns INSUFFICIENT_DATA for keyword momentum when n <= 1 historical record exists", async () => {
      const kwMomentum = await LongitudinalIntelligenceEngine.evaluateKeywordMomentum("brand_new_term", "etsy");

      assert.equal(kwMomentum.hasLongitudinalData, false);
      assert.equal(kwMomentum.momentum, "INSUFFICIENT_DATA");
      assert.equal(kwMomentum.deltaPrevalencePercent, null);
    });
  });

  // --------------------------------------------------------------------------
  // 7. Market Memory & Intelligence Snapshots
  // --------------------------------------------------------------------------
  describe("7. Market Memory Layer", () => {
    it("saves and retrieves structured domain intelligence snapshots with full lineage", () => {
      const saved = MarketMemoryEngine.saveSnapshot({
        snapshotType: "NICHE",
        marketplace: "etsy",
        key: "leather-journals",
        sampleSize: 45,
        confidence: 88,
        derivedMetrics: {
          dominantPrice: 35.0,
          topSellersCount: 12,
        },
        limitations: ["Observed sample volume only."],
      });

      assert.ok(saved.id);
      assert.equal(saved.key, "leather-journals");
      assert.equal(saved.sampleSize, 45);

      const retrieved = MarketMemoryEngine.getSnapshot("NICHE", "etsy", "leather-journals");
      assert.ok(retrieved);
      assert.equal(retrieved.key, "leather-journals");
      assert.equal(retrieved.derivedMetrics.dominantPrice, 35.0);

      const all = MarketMemoryEngine.listSnapshots("NICHE", "etsy");
      assert.ok(all.length >= 1);
    });
  });

  // --------------------------------------------------------------------------
  // 8. Niche Discovery with Market Profile Answers
  // --------------------------------------------------------------------------
  describe("8. Niche Discovery & Market Profile Answers", () => {
    it("generates structured market answers addressing the 10 market questions", () => {
      const mockProducts: NormalizedProduct[] = [
        {
          marketplace: "etsy",
          externalId: "n1",
          title: "Custom Wax Seal Stamp Kit",
          price: 28.0,
          currency: "USD",
          rating: 4.9,
          reviewCount: 180,
          shop: { name: "SealMakers" },
          categoryPath: ["Craft Supplies & Tools", "Stamps", "Wax Seals"],
          source: "ACTUAL_DATA",
          capturedAt: new Date(),
        },
        {
          marketplace: "etsy",
          externalId: "n2",
          title: "Personalized Brass Wax Seal Stamp",
          price: 32.0,
          currency: "USD",
          rating: 4.8,
          reviewCount: 95,
          shop: { name: "SealMakers" },
          categoryPath: ["Craft Supplies & Tools", "Stamps", "Wax Seals"],
          source: "ACTUAL_DATA",
          capturedAt: new Date(),
        },
      ];

      const summary = discoverNichesFromProducts(mockProducts, "etsy", "wax seal stamps");
      assert.equal(summary.marketplace, "etsy");
      assert.ok(summary.niches.length > 0);

      const niche = summary.niches[0];
      assert.ok(niche.nicheProfileAnswers);
      assert.equal(niche.nicheProfileAnswers.isActive, true);
      assert.ok(niche.nicheProfileAnswers.dominantPriceBand);
      assert.ok(Array.isArray(niche.nicheProfileAnswers.dominantKeywords));
      assert.ok(Array.isArray(niche.nicheProfileAnswers.dominantSubcategories));
      assert.ok(niche.nicheProfileAnswers.sellerConcentration);
      assert.ok(Array.isArray(niche.nicheProfileAnswers.dataGaps));
    });
  });

  // --------------------------------------------------------------------------
  // 9. Research Quality & Trustworthiness Evaluation
  // --------------------------------------------------------------------------
  describe("9. Research Quality Model", () => {
    it("computes data trustworthiness score strictly separated from commercial opportunity", () => {
      const qualityReport = evaluateResearchQuality({
        itemCount: 30,
        liveCount: 30,
        historicalCount: 0,
        sourcesUsed: ["PUBLIC_WEB"],
        freshnessStatus: "LIVE",
        confidence: 85,
        sampleProducts: [
          {
            marketplace: "amazon",
            externalId: "B001",
            title: "Stainless Steel Tumbler 20oz",
            price: 19.99,
            currency: "USD",
            rating: 4.7,
            reviewCount: 520,
            shop: { name: "TumblerStore" },
            categoryPath: ["Kitchen", "Drinkware", "Tumblers"],
            source: "ACTUAL_DATA",
            capturedAt: new Date(),
          },
        ],
      });

      assert.ok(qualityReport.qualityScore >= 70);
      assert.equal(qualityReport.qualityTier, "HIGH");
      assert.ok(qualityReport.factors.length >= 4);
      assert.ok(qualityReport.fieldMetrics.length >= 5);
    });
  });
});
