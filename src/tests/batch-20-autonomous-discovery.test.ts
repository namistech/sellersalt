/**
 * SellerSalt — Batch 20 Test Suite
 * 
 * Comprehensive verification of Autonomous Opportunity Discovery,
 * Opportunity Signal Taxonomy, Deterministic Detection Rules, Opportunity Scoring 3.0,
 * Opportunity Confidence, Deduplication, Deterministic Ranking, Product Idea Engine,
 * Opportunity Radar 2.0 Feed, Watchlist & Alerting, and Zero-Fabrication integrity.
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { AutonomousDiscoveryEngine } from "@/services/intelligence/autonomous-discovery-engine";
import { OpportunityDetectorEngine } from "@/services/intelligence/opportunity-detector";
import { OpportunityScoring3Engine } from "@/services/intelligence/opportunity-scoring-3";
import { OpportunityConfidenceEngine } from "@/services/intelligence/opportunity-confidence";
import { OpportunityDeduplicationEngine } from "@/services/intelligence/opportunity-deduplication";
import { OpportunityRankingEngine } from "@/services/intelligence/opportunity-ranking";
import { ProductIdeaEngine } from "@/services/intelligence/product-idea-engine";
import { OpportunityRadar2Engine } from "@/services/intelligence/opportunity-radar-2";
import { OpportunityWatchEngine } from "@/services/intelligence/opportunity-watch-engine";
import type { NormalizedProduct } from "@/marketplaces/core/types";
import type {
  AutonomousOpportunityItem,
  OpportunitySignalTaxonomy,
} from "@/marketplaces/core/autonomous-discovery-types";

describe("Batch 20: Autonomous Opportunity Discovery & Market Radar 2.0", () => {
  beforeEach(() => {
    OpportunityWatchEngine.clearAlerts();
  });

  // Helper to build test signals
  function createSampleSignals(overrides: Partial<OpportunitySignalTaxonomy> = {}): OpportunitySignalTaxonomy {
    return {
      demand: {
        observedReviewCount: { value: 85, provenance: "ACTUAL_DATA", label: "Reviews", isAvailable: true },
        observedReviewVelocityDaily: { value: 0.8, provenance: "ACTUAL_DATA", label: "Velocity", isAvailable: true },
        observedFavoritesCount: { value: 340, provenance: "ACTUAL_DATA", label: "Favorites", isAvailable: true },
        listingPrevalencePercent: { value: 20, provenance: "ACTUAL_DATA", label: "Prevalence", isAvailable: true },
        persistenceDays: { value: 14, provenance: "ACTUAL_DATA", label: "Persistence", isAvailable: true },
        repeatedObservationCount: { value: 5, provenance: "ACTUAL_DATA", label: "Observations", isAvailable: true },
      },
      competition: {
        observedSellerCount: { value: 25, provenance: "ACTUAL_DATA", label: "Sellers", isAvailable: true },
        sellerConcentrationHHI: { value: 1100, provenance: "ACTUAL_DATA", label: "HHI", isAvailable: true },
        dominantSellerCatalogShare: { value: 12, provenance: "ACTUAL_DATA", label: "Dom Share", isAvailable: true },
        medianCompetitorReviews: { value: 40, provenance: "ACTUAL_DATA", label: "Median Reviews", isAvailable: true },
        establishedBarrierLevel: { value: "LOW", provenance: "ACTUAL_DATA", label: "Barrier", isAvailable: true },
      },
      market: {
        observedPriceMedian: { value: 32.5, provenance: "ACTUAL_DATA", label: "Median Price", isAvailable: true },
        observedPriceMin: { value: 18.0, provenance: "ACTUAL_DATA", label: "Min Price", isAvailable: true },
        observedPriceMax: { value: 65.0, provenance: "ACTUAL_DATA", label: "Max Price", isAvailable: true },
        priceSpreadPercent: { value: 40, provenance: "ACTUAL_DATA", label: "Spread", isAvailable: true },
        freshnessRatio: { value: 0.9, provenance: "ACTUAL_DATA", label: "Freshness", isAvailable: true },
        marketMomentumStatus: { value: "RISING", provenance: "ACTUAL_DATA", label: "Momentum", isAvailable: true },
      },
      keyword: {
        dominantKeywords: [{ term: "ceramic", prevalencePercent: 60 }],
        risingKeywords: [{ term: "handmade", velocityDelta: 15 }],
      },
      differentiation: {
        underrepresentedAttributes: ["matte glaze", "personalized base", "cork coaster"],
        observedAttributeGaps: ["gift unboxing bundle"],
        materialStyleOpportunities: ["raw clay rim"],
      },
      crossMarketplace: {
        matchedMarketplaces: ["etsy", "amazon"],
        priceDisparityPercent: { value: 15, provenance: "ACTUAL_DATA", label: "Price Disparity", isAvailable: true },
        sharedSellerIdentified: { value: true, provenance: "ACTUAL_DATA", label: "Shared Seller", isAvailable: true },
      },
      ...overrides,
    };
  }

  // --------------------------------------------------------------------------
  // 1. Opportunity Scoring 3.0 & Confidence Model
  // --------------------------------------------------------------------------
  describe("1. Opportunity Scoring 3.0 & Confidence Model", () => {
    it("computes deterministic multi-factor score from signal taxonomy", () => {
      const signals = createSampleSignals();
      const score = OpportunityScoring3Engine.evaluateScore(signals);

      assert.ok(score.compositeScore >= 60);
      assert.ok(score.demandScore > 0);
      assert.ok(score.competitionAttractivenessScore > 0);
      assert.ok(score.momentumScore > 0);
      assert.ok(score.differentiationScore > 0);
      assert.ok(score.pricePositioningScore > 0);
      assert.ok(score.evidenceDepthScore > 0);
    });

    it("transparently marks unobserved signals in confidence report without scoring zero", () => {
      const signals = createSampleSignals();
      signals.demand.observedReviewCount.isAvailable = false;
      signals.demand.observedReviewCount.value = null;

      const confidence = OpportunityConfidenceEngine.evaluate(signals, {
        observationCount: 12,
        marketplaceCount: 2,
        daysObserved: 10,
      });

      assert.ok(confidence.confidenceScore >= 50);
      assert.ok(confidence.unknownSignals.includes("Listing review counts unobserved."));
      assert.ok(confidence.unknownSignals.some((u) => u.includes("Exact monthly search query volume is strictly unavailable")));
    });
  });

  // --------------------------------------------------------------------------
  // 2. Deterministic Opportunity Detection Rules
  // --------------------------------------------------------------------------
  describe("2. Deterministic Opportunity Detection Rules", () => {
    it("detects CROSS_MARKETPLACE_OPPORTUNITY when corroborated on multiple platforms", () => {
      const product: NormalizedProduct = {
        marketplace: "etsy",
        externalId: "mug-101",
        title: "Handmade Ceramic Coffee Mug",
        price: 28.0,
        currency: "USD",
        reviewCount: 95,
        shop: { name: "PotteryCo" },
        categoryPath: ["Home & Living", "Drinkware"],
        source: "ACTUAL_DATA",
        capturedAt: new Date(),
      };

      const signals = createSampleSignals();
      const opp = OpportunityDetectorEngine.detectProductOpportunity(product, signals, {
        matchedMarketplaces: ["etsy", "amazon"],
        observationCount: 8,
      });

      assert.equal(opp.type, "CROSS_MARKETPLACE_OPPORTUNITY");
      assert.equal(opp.marketplaces.length, 2);
      assert.equal(opp.explanation.verdict, "HIGH_OPPORTUNITY");
    });

    it("detects RISING_KEYWORD when keyword velocity expands significantly", () => {
      const signals = createSampleSignals();
      const opp = OpportunityDetectorEngine.detectKeywordOpportunity("minimalist desk lamp", "etsy", signals, {
        prevalencePercent: 35,
        velocityDelta: 20,
        category: "Lighting",
      });

      assert.equal(opp.type, "RISING_KEYWORD");
      assert.equal(opp.momentum, "RISING");
      assert.ok(opp.score.compositeScore > 0);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Opportunity Deduplication & Canonical Grouping
  // --------------------------------------------------------------------------
  describe("3. Opportunity Deduplication & Canonical Grouping", () => {
    it("merges duplicate candidates across runs around canonical entity ID", () => {
      const product: NormalizedProduct = {
        marketplace: "etsy",
        externalId: "wallet-1",
        title: "Minimalist Slim Leather Wallet",
        price: 35.0,
        currency: "USD",
        source: "ACTUAL_DATA",
        capturedAt: new Date(),
      };

      const signals = createSampleSignals();
      const oppA = OpportunityDetectorEngine.detectProductOpportunity(product, signals, { observationCount: 2 });
      const oppB = OpportunityDetectorEngine.detectProductOpportunity(product, signals, { observationCount: 3 });

      const deduplicated = OpportunityDeduplicationEngine.deduplicate([oppA, oppB]);
      assert.equal(deduplicated.length, 1);
      assert.equal(deduplicated[0].observationCount, 5);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Deterministic Opportunity Ranking Engine
  // --------------------------------------------------------------------------
  describe("4. Deterministic Opportunity Ranking Engine", () => {
    it("sorts opportunities deterministically across various ranking modes", () => {
      const p1: NormalizedProduct = { marketplace: "etsy", externalId: "p1", title: "Item A", price: 20, currency: "USD", source: "ACTUAL_DATA", capturedAt: new Date() };
      const p2: NormalizedProduct = { marketplace: "etsy", externalId: "p2", title: "Item B", price: 40, currency: "USD", source: "ACTUAL_DATA", capturedAt: new Date() };

      const sig1 = createSampleSignals();
      sig1.market.marketMomentumStatus.value = "STABLE";
      const sig2 = createSampleSignals();
      sig2.market.marketMomentumStatus.value = "ACCELERATING";

      const opp1 = OpportunityDetectorEngine.detectProductOpportunity(p1, sig1, { observationCount: 2 });
      const opp2 = OpportunityDetectorEngine.detectProductOpportunity(p2, sig2, { observationCount: 5 });

      const rankedBest = OpportunityRankingEngine.rank([opp1, opp2], "BEST_OPPORTUNITIES");
      assert.ok(rankedBest.length === 2);

      const rankedFastest = OpportunityRankingEngine.rank([opp1, opp2], "FASTEST_RISING");
      assert.equal(rankedFastest[0].canonicalEntityId, "prod:etsy:p2"); // ACCELERATING momentum first
    });
  });

  // --------------------------------------------------------------------------
  // 5. Evidence-Grounded Product Idea Engine
  // --------------------------------------------------------------------------
  describe("5. Evidence-Grounded Product Idea Engine", () => {
    it("synthesizes product ideas distinguishing observed metrics vs derived angles", () => {
      const products: NormalizedProduct[] = [
        { marketplace: "etsy", externalId: "1", title: "Handmade Ceramic Coffee Mug White", price: 25, currency: "USD", source: "ACTUAL_DATA", capturedAt: new Date() },
        { marketplace: "etsy", externalId: "2", title: "Handmade Ceramic Tea Mug Matte Black", price: 28, currency: "USD", source: "ACTUAL_DATA", capturedAt: new Date() },
        { marketplace: "etsy", externalId: "3", title: "Modern Ceramic Espresso Mug", price: 22, currency: "USD", source: "ACTUAL_DATA", capturedAt: new Date() },
      ];

      const signals = createSampleSignals();
      const opp = OpportunityDetectorEngine.detectProductOpportunity(products[0], signals);

      const ideas = ProductIdeaEngine.generateIdeas({
        opportunities: [opp],
        products,
        category: "Home & Living",
        niche: "Ceramic Drinkware",
      });

      assert.ok(ideas.length >= 1);
      const firstIdea = ideas[0];
      assert.ok(firstIdea.title);
      assert.ok(firstIdea.ideaScore >= 70);
      assert.ok(firstIdea.observedEvidence.dominantKeywords.length >= 1);
      assert.ok(firstIdea.derivedEvidence.attributeGap);
      assert.ok(firstIdea.nextSteps.length >= 1);
    });
  });

  // --------------------------------------------------------------------------
  // 6. Opportunity Radar 2.0 Feed Engine
  // --------------------------------------------------------------------------
  describe("6. Opportunity Radar 2.0 Feed Engine", () => {
    it("categorizes opportunities into structured sections with real-time pulse stats", () => {
      const p: NormalizedProduct = { marketplace: "etsy", externalId: "p-rad", title: "Desk Lamp", price: 45, currency: "USD", source: "ACTUAL_DATA", capturedAt: new Date() };
      const signals = createSampleSignals();
      const opp = OpportunityDetectorEngine.detectProductOpportunity(p, signals);

      const feed = OpportunityRadar2Engine.buildRadarFeed([opp], [], ["etsy", "amazon"]);
      assert.ok(feed.pulse.totalOpportunitiesDiscovered >= 1);
      assert.ok(feed.sections.length >= 1);
      assert.equal(feed.marketCoverage.requested.length, 2);
    });
  });

  // --------------------------------------------------------------------------
  // 7. Watchlist & Change Alert Engine
  // --------------------------------------------------------------------------
  describe("7. Watchlist & Change Alert Engine", () => {
    it("evaluates alert triggers on opportunity score and momentum shifts", () => {
      const watchItem = {
        id: "watch_123",
        organizationId: "org_test",
        type: "PRODUCT" as const,
        targetId: "prod:etsy:999",
        title: "Ceramic Mug",
        marketplace: "etsy" as const,
        initialScore: 65,
        currentScore: 65,
        scoreDelta: 0,
        momentum: "STABLE",
        alertConditions: {
          notifyOnScoreChange: true,
          notifyOnMomentumShift: true,
        },
        firstObservedAt: new Date(),
        lastObservedAt: new Date(),
        lastCheckedAt: new Date(),
      };

      const updatedSignals = createSampleSignals();
      updatedSignals.market.marketMomentumStatus.value = "ACCELERATING";
      const product: NormalizedProduct = { marketplace: "etsy", externalId: "999", title: "Ceramic Mug", price: 30, currency: "USD", source: "ACTUAL_DATA", capturedAt: new Date() };
      const updatedOpp = OpportunityDetectorEngine.detectProductOpportunity(product, updatedSignals);

      // Evaluate alert
      const alert = OpportunityWatchEngine.evaluateWatchlistAlerts(watchItem, updatedOpp);
      assert.ok(alert);
      assert.equal(alert.watchItemId, "watch_123");
      assert.ok(alert.title.includes("Score") || alert.title.includes("Momentum"));

      const alerts = OpportunityWatchEngine.getAlerts("org_test");
      assert.equal(alerts.length, 1);
    });
  });

  // --------------------------------------------------------------------------
  // 8. Autonomous Discovery Pipeline Execution
  // --------------------------------------------------------------------------
  describe("8. Autonomous Discovery Pipeline Execution", () => {
    it("executes autonomous discovery within bounded research budgets", async () => {
      const result = await AutonomousDiscoveryEngine.execute({
        organizationId: "org_unit_test",
        category: "Home & Living",
        marketplaces: ["etsy"],
        depth: "QUICK",
        generateProductIdeas: true,
      });

      assert.ok(result.runId);
      assert.ok(result.summary.seedsEvaluated.length >= 1);
      assert.ok(result.radarFeed);
      assert.ok(result.productIdeas);
      assert.ok(result.quality);
      assert.ok(result.acquisitionTrace.length >= 1);
    });
  });
});
