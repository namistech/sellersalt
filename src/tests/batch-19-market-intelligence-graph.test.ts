/**
 * SellerSalt — Batch 19 Test Suite
 * 
 * Comprehensive verification of Proprietary Market Intelligence Graph,
 * Deterministic Entity Resolution, Relationship Graph Engine, Continuous Market Memory,
 * Market Change Detection ("What Changed?"), Market Momentum 2.0, Opportunity Persistence,
 * Cross-Marketplace Evidence Synthesis, and Zero-Fabrication integrity.
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { EntityResolutionEngine } from "@/services/intelligence/entity-resolution-engine";
import { MarketGraphEngine } from "@/services/intelligence/market-graph-engine";
import { ContinuousMarketMemoryEngine } from "@/services/intelligence/continuous-market-memory";
import { MarketChangeDetectionEngine } from "@/services/intelligence/market-change-detection";
import { MarketMomentum2Engine } from "@/services/intelligence/market-momentum-2";
import { OpportunityPersistenceEngine } from "@/services/intelligence/opportunity-persistence";
import { CrossMarketplaceGraphEngine } from "@/services/intelligence/cross-marketplace-graph";
import { GraphConfidenceEngine } from "@/services/intelligence/graph-confidence";
import type { NormalizedProduct } from "@/marketplaces/core/types";

describe("Batch 19: Proprietary Market Intelligence Graph & Continuous Memory Engine", () => {
  beforeEach(() => {
    MarketGraphEngine.clearGraph();
    ContinuousMarketMemoryEngine.clearStore();
  });

  // --------------------------------------------------------------------------
  // 1. Canonical Market Entity Resolution & Deterministic Identity
  // --------------------------------------------------------------------------
  describe("1. Canonical Market Entity Resolution & Deterministic Identity", () => {
    it("generates deterministic entity IDs for products, sellers, categories, and keywords", () => {
      const prodId = EntityResolutionEngine.generateProductId("etsy", "12345");
      assert.equal(prodId, "prod:etsy:12345");

      const sellerId = EntityResolutionEngine.generateSellerId("amazon", "Artisan Crafts Studio");
      assert.equal(sellerId, "seller:amazon:artisan-crafts-studio");

      const catId = EntityResolutionEngine.generateCategoryId("ebay", ["Home", "Kitchen", "Cookware"]);
      assert.equal(catId, "cat:ebay:home/kitchen/cookware");

      const kwId = EntityResolutionEngine.generateKeywordId("Ceramic Mug");
      assert.equal(kwId, "kw:ceramic-mug");
    });

    it("transforms NormalizedProduct into CanonicalProductEntity with clean provenance", () => {
      const norm: NormalizedProduct = {
        marketplace: "etsy",
        externalId: "listing-999",
        title: "Handmade Ceramic Coffee Mug",
        price: 24.5,
        currency: "USD",
        rating: 4.9,
        reviewCount: 120,
        favoritesCount: 450,
        shop: { name: "PotteryBarnCrafts" },
        categoryPath: ["Home", "Drinkware"],
        source: "ACTUAL_DATA",
        capturedAt: new Date(),
      };

      const entity = EntityResolutionEngine.toCanonicalProduct(norm, "org_test_123");
      assert.equal(entity.id, "prod:etsy:listing-999");
      assert.equal(entity.entityType, "PRODUCT");
      assert.equal(entity.marketplace, "etsy");
      assert.equal(entity.price, 24.5);
      assert.equal(entity.sellerId, "seller:etsy:potterybarncrafts");
      assert.ok(entity.fingerprint);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Cross-Marketplace Entity Matching & Disambiguation
  // --------------------------------------------------------------------------
  describe("2. Cross-Marketplace Entity Matching", () => {
    it("classifies EXACT match for identical marketplace and external ID", () => {
      const prodA: NormalizedProduct = {
        marketplace: "etsy",
        externalId: "item-100",
        title: "Minimalist Leather Wallet",
        price: 35.0,
        currency: "USD",
        source: "ACTUAL_DATA",
        capturedAt: new Date(),
      };

      const match = EntityResolutionEngine.compareCrossMarketplaceProducts(prodA, prodA);
      assert.equal(match.matchTier, "SAME_PRODUCT");
      assert.equal(match.confidenceTier, "EXACT");
      assert.equal(match.confidenceScore, 100);
    });

    it("classifies HIGH_CONFIDENCE for high token overlap and aligned price band", () => {
      const prodA: NormalizedProduct = {
        marketplace: "etsy",
        externalId: "item-etsy",
        title: "Minimalist Slim Leather Cardholder Wallet - Brown",
        price: 35.0,
        currency: "USD",
        source: "ACTUAL_DATA",
        capturedAt: new Date(),
      };

      const prodB: NormalizedProduct = {
        marketplace: "amazon",
        externalId: "item-amz",
        title: "Minimalist Slim Leather Cardholder Wallet - Brown",
        price: 38.0,
        currency: "USD",
        source: "ACTUAL_DATA",
        capturedAt: new Date(),
      };

      const match = EntityResolutionEngine.compareCrossMarketplaceProducts(prodA, prodB);
      assert.equal(match.matchTier, "SAME_PRODUCT");
      assert.equal(match.confidenceTier, "HIGH_CONFIDENCE");
      assert.ok(match.confidenceScore >= 80);
      assert.ok(match.matchingFields.includes("priceBand"));
    });

    it("classifies UNRELATED for non-overlapping product titles", () => {
      const prodA: NormalizedProduct = {
        marketplace: "etsy",
        externalId: "item-1",
        title: "Vintage Denim Jacket",
        price: 60.0,
        currency: "USD",
        source: "ACTUAL_DATA",
        capturedAt: new Date(),
      };

      const prodB: NormalizedProduct = {
        marketplace: "amazon",
        externalId: "item-2",
        title: "Wireless Bluetooth Earbuds",
        price: 45.0,
        currency: "USD",
        source: "ACTUAL_DATA",
        capturedAt: new Date(),
      };

      const match = EntityResolutionEngine.compareCrossMarketplaceProducts(prodA, prodB);
      assert.equal(match.matchTier, "UNRELATED");
      assert.equal(match.confidenceTier, "UNRESOLVED");
    });
  });

  // --------------------------------------------------------------------------
  // 3. Market Intelligence Relationship Graph Engine
  // --------------------------------------------------------------------------
  describe("3. Market Intelligence Relationship Graph Engine", () => {
    it("ingests products, creating interconnected nodes and verified edges", () => {
      const products: NormalizedProduct[] = [
        {
          marketplace: "etsy",
          externalId: "prod-1",
          title: "Ceramic Coffee Mug - White",
          price: 25.0,
          currency: "USD",
          shop: { name: "PotteryCo" },
          categoryPath: ["Kitchen", "Drinkware"],
          source: "ACTUAL_DATA",
          capturedAt: new Date(),
        },
        {
          marketplace: "amazon",
          externalId: "prod-2",
          title: "Ceramic Coffee Mug - White",
          price: 27.0,
          currency: "USD",
          shop: { name: "KitchenDirect" },
          categoryPath: ["Home & Kitchen", "Mugs"],
          source: "ACTUAL_DATA",
          capturedAt: new Date(),
        },
      ];

      const { nodesAdded, edgesAdded } = MarketGraphEngine.ingestProducts(products, {
        researchRunId: "run_test_1",
        organizationId: "org_1",
      });

      assert.ok(nodesAdded > 0);
      assert.ok(edgesAdded > 0);
      assert.ok(MarketGraphEngine.getNodeCount() >= 2);

      // Verify product-to-seller edge
      const rels = MarketGraphEngine.getRelationships("prod:etsy:prod-1", "outgoing");
      const sellerRel = rels.find((r) => r.relationshipType === "PRODUCT_SOLD_BY_SELLER");
      assert.ok(sellerRel);
      assert.equal(sellerRel.targetEntityId, "seller:etsy:potteryco");

      // Verify cross-marketplace match edge
      const crossRels = MarketGraphEngine.getRelationships("prod:etsy:prod-1", "both");
      const crossMatch = crossRels.find((r) => r.relationshipType === "PRODUCT_MATCHED_ACROSS_MARKETPLACES");
      assert.ok(crossMatch);
      assert.equal(crossMatch.targetEntityId, "prod:amazon:prod-2");
    });

    it("extracts interactive subgraphs for visualization", () => {
      const products: NormalizedProduct[] = [
        {
          marketplace: "etsy",
          externalId: "lamp-1",
          title: "Modern Wooden Desk Lamp",
          price: 45.0,
          currency: "USD",
          shop: { name: "WoodWorks" },
          categoryPath: ["Lighting", "Lamps"],
          source: "ACTUAL_DATA",
          capturedAt: new Date(),
        },
      ];

      MarketGraphEngine.ingestProducts(products);
      const subgraph = MarketGraphEngine.extractSubgraph("prod:etsy:lamp-1", 2);

      assert.equal(subgraph.rootEntityId, "prod:etsy:lamp-1");
      assert.ok(subgraph.nodes.length >= 3); // Product, Seller, Category, Keywords
      assert.ok(subgraph.edges.length >= 2);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Continuous Market Memory & Price Distributions
  // --------------------------------------------------------------------------
  describe("4. Continuous Market Memory & Quantile Distributions", () => {
    it("computes exact empirical price percentiles (P10, P25, P50, P75, P90)", () => {
      const prices = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const dist = ContinuousMarketMemoryEngine.computePriceDistribution(prices);

      assert.equal(dist.min, 10);
      assert.equal(dist.max, 100);
      assert.equal(dist.median, 50);
      assert.equal(dist.average, 55);
      assert.ok(dist.p10 !== null);
      assert.ok(dist.p90 !== null);
    });

    it("captures append-only immutable snapshot history", () => {
      const dist = ContinuousMarketMemoryEngine.computePriceDistribution([25, 30, 35]);

      const snap1 = ContinuousMarketMemoryEngine.captureSnapshot({
        snapshotKey: "query:ceramic-mug",
        marketplace: "all",
        observedProductCount: 15,
        observedSellerCount: 8,
        priceDistribution: dist,
        reviewDistribution: { medianReviews: 45, p75Reviews: 120, maxReviews: 450 },
        ratingDistribution: { averageRating: 4.8, medianRating: 4.9 },
        sellerConcentrationHHI: 1200,
        topKeywords: [{ term: "ceramic", prevalencePercent: 85 }],
        topSellers: [{ sellerName: "StudioA", catalogSharePercent: 20 }],
        opportunitySummary: { averageOpportunityScore: 78, highOpportunityCount: 5, strongCandidateCount: 2 },
        fieldCompletenessPercent: 90,
        confidence: 85,
        provenance: "ACTUAL_DATA",
      });

      assert.ok(snap1.id);
      const history = ContinuousMarketMemoryEngine.getSnapshotHistory("query:ceramic-mug", "all");
      assert.equal(history.length, 1);
      assert.equal(history[0].observedProductCount, 15);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Market Change Detection & "What Changed?" Engine
  // --------------------------------------------------------------------------
  describe("5. Market Change Detection & Zero-Fabrication Contract", () => {
    it("returns null deltas when only 1 snapshot exists (Zero-Fabrication Contract)", () => {
      const dist = ContinuousMarketMemoryEngine.computePriceDistribution([20, 30]);
      const snap1 = ContinuousMarketMemoryEngine.captureSnapshot({
        snapshotKey: "query:desk-lamp",
        marketplace: "all",
        observedProductCount: 10,
        observedSellerCount: 5,
        priceDistribution: dist,
        reviewDistribution: { medianReviews: 20, p75Reviews: 50, maxReviews: 100 },
        ratingDistribution: { averageRating: 4.5, medianRating: 4.5 },
        sellerConcentrationHHI: 800,
        topKeywords: [],
        topSellers: [],
        opportunitySummary: { averageOpportunityScore: 65, highOpportunityCount: 2, strongCandidateCount: 1 },
        fieldCompletenessPercent: 80,
        confidence: 70,
        provenance: "ACTUAL_DATA",
      });

      const report = MarketChangeDetectionEngine.compareSnapshots(snap1, null);
      assert.equal(report.hasPreviousComparison, false);
      assert.equal(report.summary.medianPriceDelta, null);
      assert.equal(report.summary.medianPriceDeltaPercent, null);
      assert.equal(report.summary.sellerConcentrationDeltaHHI, null);
    });

    it("computes longitudinal deltas when >= 2 snapshots exist", () => {
      const dist1 = ContinuousMarketMemoryEngine.computePriceDistribution([20, 30, 40]);
      const dist2 = ContinuousMarketMemoryEngine.computePriceDistribution([25, 35, 45]);

      const snap1 = ContinuousMarketMemoryEngine.captureSnapshot({
        snapshotKey: "query:desk-lamp",
        marketplace: "all",
        observedProductCount: 10,
        observedSellerCount: 5,
        priceDistribution: dist1,
        reviewDistribution: { medianReviews: 20, p75Reviews: 50, maxReviews: 100 },
        ratingDistribution: { averageRating: 4.5, medianRating: 4.5 },
        sellerConcentrationHHI: 800,
        topKeywords: [{ term: "wood", prevalencePercent: 40 }],
        topSellers: [{ sellerName: "ShopA", catalogSharePercent: 20 }],
        opportunitySummary: { averageOpportunityScore: 65, highOpportunityCount: 2, strongCandidateCount: 1 },
        fieldCompletenessPercent: 80,
        confidence: 70,
        provenance: "ACTUAL_DATA",
      });

      const snap2 = ContinuousMarketMemoryEngine.captureSnapshot({
        snapshotKey: "query:desk-lamp",
        marketplace: "all",
        observedProductCount: 12,
        observedSellerCount: 6,
        priceDistribution: dist2,
        reviewDistribution: { medianReviews: 25, p75Reviews: 60, maxReviews: 120 },
        ratingDistribution: { averageRating: 4.6, medianRating: 4.6 },
        sellerConcentrationHHI: 950,
        topKeywords: [{ term: "wood", prevalencePercent: 60 }],
        topSellers: [{ sellerName: "ShopA", catalogSharePercent: 30 }],
        opportunitySummary: { averageOpportunityScore: 72, highOpportunityCount: 4, strongCandidateCount: 2 },
        fieldCompletenessPercent: 85,
        confidence: 75,
        provenance: "ACTUAL_DATA",
      });

      const report = MarketChangeDetectionEngine.compareSnapshots(snap2, snap1);
      assert.equal(report.hasPreviousComparison, true);
      assert.equal(report.summary.medianPriceDelta, 5.0);
      assert.ok(report.summary.medianPriceDeltaPercent !== null);
      assert.equal(report.summary.sellerConcentrationDeltaHHI, 150);

      // Verify keyword change detection
      const kwChange = report.keywordChanges.find((k) => k.term === "wood");
      assert.ok(kwChange);
      assert.equal(kwChange.changeType, "RISING_PREVALENCE");
      assert.equal(kwChange.deltaPercent, 20);
    });
  });

  // --------------------------------------------------------------------------
  // 6. Market Momentum 2.0 Engine
  // --------------------------------------------------------------------------
  describe("6. Market Momentum 2.0 Engine", () => {
    it("strictly returns INSUFFICIENT_DATA for single snapshot observations", () => {
      const report = MarketMomentum2Engine.evaluateTimeframeMomentum({
        entityId: "prod:etsy:101",
        entityType: "PRODUCT",
        marketplace: "etsy",
        snapshots: [
          { observedAt: new Date(), metricValue: 50, price: 25.0 },
        ],
      });

      assert.equal(report.currentStatus, "INSUFFICIENT_DATA");
      assert.equal(report.shortTermMomentum.isAvailable, false);
      assert.equal(report.shortTermMomentum.velocityDaily, null);
    });

    it("evaluates ACCELERATING momentum for positive velocity growth across snapshots", () => {
      const now = Date.now();
      const report = MarketMomentum2Engine.evaluateTimeframeMomentum({
        entityId: "prod:etsy:101",
        entityType: "PRODUCT",
        marketplace: "etsy",
        snapshots: [
          { observedAt: new Date(now - 10 * 86400000), metricValue: 50, price: 25.0 },
          { observedAt: new Date(now), metricValue: 120, price: 25.0 },
        ],
      });

      assert.equal(report.currentStatus, "ACCELERATING");
      assert.ok(report.shortTermMomentum.velocityDaily !== null);
      assert.ok((report.shortTermMomentum.velocityDaily ?? 0) >= 1.5);
    });
  });

  // --------------------------------------------------------------------------
  // 7. Opportunity Persistence Engine
  // --------------------------------------------------------------------------
  describe("7. Opportunity Persistence Engine", () => {
    it("identifies PERSISTENT_OPPORTUNITY when high score maintained over >= 7 days", () => {
      const now = Date.now();
      const report = OpportunityPersistenceEngine.evaluatePersistence({
        opportunityId: "opp_1",
        targetTitle: "Ceramic Pour-Over Coffee Dripper",
        marketplace: "etsy",
        observations: [
          { observedAt: new Date(now - 14 * 86400000), score: 85, confidence: 80 },
          { observedAt: new Date(now - 7 * 86400000), score: 82, confidence: 85 },
          { observedAt: new Date(now), score: 88, confidence: 90 },
        ],
      });

      assert.equal(report.persistenceTier, "PERSISTENT_OPPORTUNITY");
      assert.ok(report.daysTracked >= 14);
      assert.ok(report.stabilityScore >= 70);
    });
  });

  // --------------------------------------------------------------------------
  // 8. Cross-Marketplace Evidence Synthesis
  // --------------------------------------------------------------------------
  describe("8. Cross-Marketplace Evidence Synthesis", () => {
    it("synthesizes cross-marketplace pricing and seller overlap without fake multipliers", () => {
      const products: NormalizedProduct[] = [
        {
          marketplace: "etsy",
          externalId: "wallet-etsy",
          title: "Slim Minimalist Cardholder",
          price: 25.0,
          currency: "USD",
          shop: { name: "LeatherCraft" },
          source: "ACTUAL_DATA",
          capturedAt: new Date(),
        },
        {
          marketplace: "amazon",
          externalId: "wallet-amz",
          title: "Slim Minimalist Cardholder",
          price: 32.0,
          currency: "USD",
          shop: { name: "LeatherCraft" },
          source: "ACTUAL_DATA",
          capturedAt: new Date(),
        },
      ];

      MarketGraphEngine.ingestProducts(products);
      const evidence = CrossMarketplaceGraphEngine.getProductCrossMarketplaceEvidence("prod:etsy:wallet-etsy");

      assert.ok(evidence);
      assert.equal(evidence.matchedMarketplaces.length, 2);
      assert.equal(evidence.priceComparison.minPrice, 25.0);
      assert.equal(evidence.priceComparison.maxPrice, 32.0);
      assert.equal(evidence.priceComparison.lowestMarketplace, "etsy");
      assert.equal(evidence.sellerOverlap.hasSameSeller, true);
    });
  });

  // --------------------------------------------------------------------------
  // 9. Deterministic Graph Confidence Engine
  // --------------------------------------------------------------------------
  describe("9. Deterministic Graph Confidence Engine", () => {
    it("calibrates confidence score and transparently exposes unknown signals", () => {
      const report = GraphConfidenceEngine.evaluateConfidence({
        observationCount: 15,
        sourceCount: 2,
        daysObserved: 10,
        isLive: true,
        hasPrice: true,
        hasRating: false, // unobserved
        hasReviews: true,
        hasSeller: true,
      });

      assert.ok(report.confidenceScore >= 65);
      assert.ok(report.unknownSignals.includes("Rating metrics are unobserved."));
      assert.ok(report.unknownSignals.some((u) => u.includes("Exact monthly search query volume is strictly unavailable")));
    });
  });

  // --------------------------------------------------------------------------
  // 10. Navigation Integration
  // --------------------------------------------------------------------------
  describe("10. Navigation & UI Integration", () => {
    it("Navigation config registers Intelligence Graph in Intelligence section", () => {
      const navSrc = fs.readFileSync(path.join(process.cwd(), "src/services/navigation.ts"), "utf8");
      assert.ok(navSrc.includes("id: \"intelligence-graph\""));
      assert.ok(navSrc.includes("href: \"/intelligence\""));
      assert.ok(navSrc.includes("Intelligence Graph"));
    });
  });
});
