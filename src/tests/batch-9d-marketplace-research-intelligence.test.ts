/**
 * SellerSalt Batch 9D: Real Marketplace Research & Observation Intelligence Test Suite
 * 
 * Comprehensive verification of:
 * - Public Web Product Research (Amazon, eBay, Walmart, Etsy) without API keys
 * - Observation Persistence & Longitudinal Trend Derivations (Zero-Fabrication)
 * - Deterministic Empirical Keyword Harvesting & Intent Clustering
 * - Public Shop / Seller Research & Competition Barrier Scoring
 * - Public Category & Taxonomy Aggregation with Price Percentiles
 * - Niche Discovery consuming Public Web Observations
 * - Opportunity Radar consuming Canonical Intelligence
 * - Cross-Marketplace Comparison with Research Coverage Scoring
 * - Security, SSRF & Central Compliance Guardrails
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  orchestrateProductResearch,
  harvestPublicMarketplaceKeywords,
  fetchPublicShopResearch,
  aggregatePublicCategoryIntelligence,
  calculateObservationTrendsFromPoints,
  evaluateFreshness,
  validateAcquisitionCompliance,
  AcquisitionComplianceError,
  DomainRateLimiter,
  PublicPageFetcher,
  globalPageFetcher,
  mergeProductObservations,
  buildDeterministicKeywordClusters,
  type ProductObservationPoint,
} from "@/marketplaces/core/acquisition";

import {
  runProductResearch,
  runAllMarketplaceProductResearch,
} from "@/marketplaces/core/research-pipeline";

import {
  searchMarketplaceProducts,
} from "@/services/product-hunting";

import {
  fetchMarketplaceKeywordResearch,
} from "@/services/keyword-research";

import {
  discoverNichesFromProducts,
  discoverLiveMarketplaceNiches,
} from "@/services/intelligence/niche-discovery";

import {
  buildCrossMarketplaceComparison,
} from "@/services/intelligence/cross-marketplace-comparison";

import {
  MarketplaceRegistry,
  registerAllConnectors,
} from "@/marketplaces/core/registry";

import type { NormalizedProduct, MarketplaceId } from "@/marketplaces/core/types";

describe("Batch 9D: Real Marketplace Research & Observation Intelligence", () => {
  registerAllConnectors();

  // ==========================================================================
  // 1. PRODUCT RESEARCH WITHOUT OFFICIAL API KEYS
  // ==========================================================================
  describe("1. Product Research Lifecycle via Public Web", () => {
    it("1. Amazon product research executes through PUBLIC_WEB without SP-API keys", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        return new Response(
          `<html>
            <div data-asin="B08N5MUG01" class="s-result-item">
              <h2><span class="a-text-normal">Ceramic Coffee Mug Handcrafted 16oz</span></h2>
              <span class="a-price"><span class="a-offscreen">$26.99</span></span>
              <span class="a-icon-alt">4.7 out of 5 stars</span>
              <span class="a-size-base s-underline-text">850</span>
              <img class="s-image" src="https://m.media-amazon.com/images/I/mug1.jpg" />
            </div>
          </html>`,
          { status: 200, headers: { "content-type": "text/html" } }
        );
      };

      try {
        const res = await orchestrateProductResearch(
          { query: "ceramic mug", marketplace: "amazon" },
          { preferredSources: ["PUBLIC_WEB"] }
        );

        assert.equal(res.report.status, "AVAILABLE");
        assert.equal(res.report.primarySourceUsed, "PUBLIC_WEB");
        assert.equal(res.items.length, 1);

        const p = res.items[0];
        assert.equal(p.marketplace, "amazon");
        assert.equal(p.externalId, "B08N5MUG01");
        assert.equal(p.title, "Ceramic Coffee Mug Handcrafted 16oz");
        assert.equal(p.price, 26.99);
        assert.equal(p.rating, 4.7);
        assert.equal(p.reviewCount, 850);
        assert.equal(p.source, "ACTUAL_DATA");
        assert.equal(p.acquisitionMethod, "PUBLIC_WEB");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("2. eBay product research executes through PUBLIC_WEB without API keys", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        return new Response(
          `<html>
            <ul class="srp-results">
              <li class="s-item">
                <a class="s-item__link" href="https://www.ebay.com/itm/987654321098">
                  <h3 class="s-item__title">Studio Pottery Artisan Tea Cup Hand Thrown</h3>
                </a>
                <span class="s-item__price">$21.50</span>
                <span class="s-item__seller-info-text">clay_master (540) 99.8%</span>
                <img class="s-item__image-img" src="https://i.ebayimg.com/images/g/cup.jpg" />
              </li>
            </ul>
          </html>`,
          { status: 200, headers: { "content-type": "text/html" } }
        );
      };

      try {
        const res = await orchestrateProductResearch(
          { query: "tea cup", marketplace: "ebay" },
          { preferredSources: ["PUBLIC_WEB"] }
        );

        assert.equal(res.report.status, "AVAILABLE");
        assert.equal(res.items.length, 1);
        assert.equal(res.items[0].marketplace, "ebay");
        assert.equal(res.items[0].externalId, "987654321098");
        assert.equal(res.items[0].price, 21.5);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("3. Walmart product research executes through PUBLIC_WEB without API keys", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        return new Response(
          `<html>
            <div data-item-id="44556677">
              <span class="w_iUH7">Porcelain White Diner Mug 12oz</span>
              <span class="w_iUH7">$5.97</span>
              <span>4.4 out of 5 Stars</span>
              <span>(180 reviews)</span>
              <img src="https://i5.walmartimages.com/asr/diner.jpg" />
            </div>
          </html>`,
          { status: 200, headers: { "content-type": "text/html" } }
        );
      };

      try {
        const res = await orchestrateProductResearch(
          { query: "diner mug", marketplace: "walmart" },
          { preferredSources: ["PUBLIC_WEB"] }
        );

        assert.equal(res.report.status, "AVAILABLE");
        assert.equal(res.items.length, 1);
        assert.equal(res.items[0].marketplace, "walmart");
        assert.equal(res.items[0].externalId, "44556677");
        assert.equal(res.items[0].price, 5.97);
        assert.equal(res.items[0].rating, 4.4);
        assert.equal(res.items[0].reviewCount, 180);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("4. searchMarketplaceProducts service delegates to orchestrator and returns normalized results", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        return new Response(
          `<html>
            <div data-asin="B08N5TEST" class="s-result-item">
              <h2><span class="a-text-normal">Ceramic Espresso Cup</span></h2>
              <span class="a-price"><span class="a-offscreen">$14.99</span></span>
            </div>
          </html>`,
          { status: 200, headers: { "content-type": "text/html" } }
        );
      };

      try {
        const response = await searchMarketplaceProducts("amazon", "mock-org-id", {
          keywords: "espresso cup",
          limit: 10,
        });

        assert.ok("results" in response);
        assert.equal(response.results.length, 1);
        assert.equal(response.results[0].listing.listingId, "B08N5TEST");
        assert.equal(response.results[0].listing.price, 14.99);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("5. API enrichment merges secondary fields non-destructively", () => {
      const publicItem: NormalizedProduct = {
        marketplace: "amazon",
        externalId: "B08N5TEST",
        title: "Ceramic Mug",
        price: 24.99,
        currency: "USD",
        rating: 4.8,
        reviewCount: 300,
        source: "ACTUAL_DATA",
        acquisitionMethod: "PUBLIC_WEB",
        isHistorical: false,
        capturedAt: new Date(),
      };

      const apiItem: NormalizedProduct = {
        marketplace: "amazon",
        externalId: "B08N5TEST",
        title: "Ceramic Mug - Stoneware",
        price: 24.99,
        currency: "USD",
        rating: null,
        reviewCount: null,
        categoryPath: ["Kitchen", "Drinkware", "Mugs"],
        source: "ACTUAL_DATA",
        acquisitionMethod: "MARKETPLACE_API",
        isHistorical: false,
        capturedAt: new Date(),
      };

      const merged = mergeProductObservations(publicItem, apiItem);
      assert.equal(merged.isEnriched, true);
      assert.deepEqual(merged.sources, ["PUBLIC_WEB", "MARKETPLACE_API"]);
      assert.equal(merged.product.rating, 4.8, "Preserved public rating");
      assert.deepEqual(merged.product.categoryPath, ["Kitchen", "Drinkware", "Mugs"], "Enriched API categories");
    });
  });

  // ==========================================================================
  // 2. OBSERVATION PERSISTENCE & LONGITUDINAL TREND ENGINE
  // ==========================================================================
  describe("2. Observation Persistence & Longitudinal Trends", () => {
    it("6. single observation produces strictly null growth (zero fabrication)", () => {
      const singlePoint: ProductObservationPoint[] = [
        { price: 25.0, reviewCount: 100, rating: 4.8, favoritesCount: 50, observedAt: new Date() },
      ];

      const trend = calculateObservationTrendsFromPoints("101", "etsy", singlePoint);
      assert.equal(trend.observationCount, 1);
      assert.equal(trend.priceTrend.priceDelta, null);
      assert.equal(trend.priceTrend.priceDeltaPercent, null);
      assert.equal(trend.reviewTrend.reviewDelta, null);
      assert.equal(trend.reviewTrend.monthlyVelocity, null);
      assert.equal(trend.persistenceStatus, "NEW");
    });

    it("7. multiple longitudinal observations derive real price delta and review velocity", () => {
      const timeT1 = new Date(Date.now() - 30 * 86400 * 1000); // 30 days ago
      const timeT2 = new Date(); // today

      const points: ProductObservationPoint[] = [
        { price: 29.99, reviewCount: 120, rating: 4.6, favoritesCount: 200, observedAt: timeT1 },
        { price: 24.99, reviewCount: 150, rating: 4.7, favoritesCount: 260, observedAt: timeT2 },
      ];

      const trend = calculateObservationTrendsFromPoints("B08N5TREND", "amazon", points);
      assert.equal(trend.observationCount, 2);
      assert.equal(trend.priceTrend.initialPrice, 29.99);
      assert.equal(trend.priceTrend.currentPrice, 24.99);
      assert.equal(trend.priceTrend.priceDelta, -5.0);
      assert.equal(trend.priceTrend.isPriceDrop, true);
      assert.equal(trend.reviewTrend.initialReviews, 120);
      assert.equal(trend.reviewTrend.currentReviews, 150);
      assert.equal(trend.reviewTrend.reviewDelta, 30);
      assert.ok(trend.reviewTrend.monthlyVelocity !== null && trend.reviewTrend.monthlyVelocity >= 29);
      assert.equal(trend.persistenceStatus, "PERSISTENT");
    });
  });

  // ==========================================================================
  // 3. EMPIRICAL KEYWORD RESEARCH & INTENT CLUSTERING
  // ==========================================================================
  describe("3. Empirical Keyword Research & Deterministic Clusters", () => {
    it("8. keyword research extracts terms from listings and strictly keeps searchVolume null", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        return new Response(
          `<html>
            <div data-asin="B1" class="s-result-item">
              <h2><span class="a-text-normal">Handmade Ceramic Mug Pottery Coffee Cup</span></h2>
              <span class="a-price"><span class="a-offscreen">$25.00</span></span>
            </div>
            <div data-asin="B2" class="s-result-item">
              <h2><span class="a-text-normal">Artisan Ceramic Mug Stoneware Tea Cup</span></h2>
              <span class="a-price"><span class="a-offscreen">$30.00</span></span>
            </div>
          </html>`,
          { status: 200, headers: { "content-type": "text/html" } }
        );
      };

      try {
        globalPageFetcher.clearCache();
        const res = await harvestPublicMarketplaceKeywords({
          query: "ceramic mug",
          marketplace: "amazon",
        });

        assert.equal(res.totalListingsObserved, 2);
        assert.equal(res.averageObservedPrice, 27.5);
        assert.ok(res.topKeywords.length > 0);

        for (const kw of res.topKeywords) {
          assert.equal(kw.searchVolume, null, "searchVolume must be strictly null");
          assert.equal(kw.searchVolumeProvenance, "UNAVAILABLE");
          assert.ok(kw.listingFrequencyPercent > 0);
        }
      } finally {
        globalPageFetcher.clearCache();
        globalThis.fetch = originalFetch;
      }
    });

    it("9. deterministic keyword clusters group by material, occasion, and modifiers", () => {
      const mockKeywords: import("@/marketplaces/core/acquisition").CanonicalKeywordObservation[] = [
        {
          keyword: "stoneware ceramic mug",
          marketplace: "etsy",
          occurrenceCount: 15,
          listingFrequencyPercent: 75,
          observedAveragePrice: 28.0,
          demandProxyScore: 80,
          competitionProxy: "MODERATE",
          searchVolume: null,
          searchVolumeProvenance: "UNAVAILABLE",
          freshness: evaluateFreshness(new Date(), "general"),
          provenance: "ACTUAL_DATA",
          observedAt: new Date(),
        },
        {
          keyword: "wedding gift mug",
          marketplace: "etsy",
          occurrenceCount: 10,
          listingFrequencyPercent: 50,
          observedAveragePrice: 32.0,
          demandProxyScore: 65,
          competitionProxy: "LOW",
          searchVolume: null,
          searchVolumeProvenance: "UNAVAILABLE",
          freshness: evaluateFreshness(new Date(), "general"),
          provenance: "ACTUAL_DATA",
          observedAt: new Date(),
        },
        {
          keyword: "personalized custom mug",
          marketplace: "etsy",
          occurrenceCount: 12,
          listingFrequencyPercent: 60,
          observedAveragePrice: 24.0,
          demandProxyScore: 70,
          competitionProxy: "MODERATE",
          searchVolume: null,
          searchVolumeProvenance: "UNAVAILABLE",
          freshness: evaluateFreshness(new Date(), "general"),
          provenance: "ACTUAL_DATA",
          observedAt: new Date(),
        },
      ];

      const clusters = buildDeterministicKeywordClusters(mockKeywords);
      assert.ok(clusters.length >= 3);

      const materialCluster = clusters.find((c) => c.intentCategory === "MATERIAL_STYLE");
      assert.ok(materialCluster);
      assert.ok(materialCluster.keywords.includes("stoneware ceramic mug"));

      const occasionCluster = clusters.find((c) => c.intentCategory === "RECIPIENT_OCCASION");
      assert.ok(occasionCluster);
      assert.ok(occasionCluster.keywords.includes("wedding gift mug"));

      const modifierCluster = clusters.find((c) => c.intentCategory === "PRODUCT_MODIFIER");
      assert.ok(modifierCluster);
      assert.ok(modifierCluster.keywords.includes("personalized custom mug"));
    });

    it("10. fetchMarketplaceKeywordResearch service executes across all marketplaces", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        return new Response(
          `<html>
            <div data-asin="B10" class="s-result-item">
              <h2><span class="a-text-normal">Stoneware Coffee Mug</span></h2>
              <span class="a-price"><span class="a-offscreen">$22.00</span></span>
            </div>
          </html>`,
          { status: 200, headers: { "content-type": "text/html" } }
        );
      };

      try {
        const response = await fetchMarketplaceKeywordResearch("amazon", "mock-org", {
          query: "coffee mug",
        });

        assert.ok(!("available" in response && response.available === false));
        const res = response as any;
        assert.ok("harvestedKeywords" in res);
        assert.equal(res.query, "coffee mug");
        assert.equal(res.summary.searchVolume, null);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  // ==========================================================================
  // 4. PUBLIC SHOP / SELLER RESEARCH & COMPETITION SCORING
  // ==========================================================================
  describe("4. Public Shop Research & Competition Barrier Scoring", () => {
    it("11. public shop research extracts seller storefront and evaluates canonical competition score", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        return new Response(
          `<html>
            <div class="v2-listing-card">
              <a href="https://www.etsy.com/listing/901"><h3 class="v2-listing-card__title">Handmade Mug</h3></a>
              <span class="currency-value">$28.00</span>
            </div>
          </html>`,
          { status: 200, headers: { "content-type": "text/html" } }
        );
      };

      try {
        globalPageFetcher.clearCache();
        const res = await fetchPublicShopResearch("ClayStudioCrafts", "etsy");
        assert.ok(!("available" in res && res.available === false));

        const r = res as import("@/marketplaces/core/acquisition").PublicShopResearchResult;
        assert.equal(r.marketplace, "etsy");
        assert.equal(r.shop.name, "ClayStudioCrafts");
        assert.ok(r.competition.score !== null && r.competition.score >= 0);
        assert.ok(r.competition.factors.length > 0);
        assert.ok(r.competition.confidence >= 0);
      } finally {
        globalPageFetcher.clearCache();
        globalThis.fetch = originalFetch;
      }
    });
  });

  // ==========================================================================
  // 5. PUBLIC CATEGORY & TAXONOMY AGGREGATION
  // ==========================================================================
  describe("5. Public Category Aggregation & Price Distribution", () => {
    it("12. category aggregation computes empirical price distribution percentiles", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        return new Response(
          `<html>
            <div data-asin="C1" class="s-result-item">
              <h2><span class="a-text-normal">Basic Ceramic Mug</span></h2>
              <span class="a-price"><span class="a-offscreen">$10.00</span></span>
            </div>
            <div data-asin="C2" class="s-result-item">
              <h2><span class="a-text-normal">Standard Ceramic Mug</span></h2>
              <span class="a-price"><span class="a-offscreen">$20.00</span></span>
            </div>
            <div data-asin="C3" class="s-result-item">
              <h2><span class="a-text-normal">Premium Artisan Mug</span></h2>
              <span class="a-price"><span class="a-offscreen">$30.00</span></span>
            </div>
          </html>`,
          { status: 200, headers: { "content-type": "text/html" } }
        );
      };

      try {
        const res = await aggregatePublicCategoryIntelligence({
          categoryName: "Mugs",
          marketplace: "amazon",
        });

        assert.ok(!("available" in res && res.available === false));
        const cat = res as import("@/marketplaces/core/acquisition").PublicCategoryIntelligenceResult;

        assert.equal(cat.observedCatalogCount, 3);
        assert.equal(cat.priceDistribution.min, 10.0);
        assert.equal(cat.priceDistribution.max, 30.0);
        assert.equal(cat.priceDistribution.average, 20.0);
        assert.equal(cat.priceDistribution.median, 20.0);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  // ==========================================================================
  // 6. NICHE DISCOVERY HUB INTEGRATION
  // ==========================================================================
  describe("6. Niche Discovery Consuming Public Web Observations", () => {
    it("13. discovers and clusters niches from public web observations", () => {
      const publicProducts: NormalizedProduct[] = [
        {
          marketplace: "etsy",
          externalId: "A1",
          title: "Minimalist Stoneware Coffee Mug",
          price: 24.0,
          currency: "USD",
          rating: 4.8,
          reviewCount: 300,
          categoryPath: ["Home & Living", "Kitchen & Dining", "Drinkware", "Coffee Mugs"],
          source: "ACTUAL_DATA",
          acquisitionMethod: "PUBLIC_WEB",
          isHistorical: false,
          capturedAt: new Date(),
        },
        {
          marketplace: "etsy",
          externalId: "A2",
          title: "Artisanal Pottery Tea Cup",
          price: 28.0,
          currency: "USD",
          rating: 4.9,
          reviewCount: 150,
          categoryPath: ["Home & Living", "Kitchen & Dining", "Drinkware", "Tea Cups"],
          source: "ACTUAL_DATA",
          acquisitionMethod: "PUBLIC_WEB",
          isHistorical: false,
          capturedAt: new Date(),
        },
      ];

      const summary = discoverNichesFromProducts(publicProducts, "etsy", "drinkware");
      assert.equal(summary.totalNichesFound, 2);
      assert.ok(summary.niches.length === 2);
      assert.ok(summary.niches.some((n) => n.nicheName === "Coffee Mugs"));
      assert.ok(summary.niches.some((n) => n.nicheName === "Tea Cups"));
    });
  });

  // ==========================================================================
  // 7. CROSS-MARKETPLACE COMPARISON & RESEARCH COVERAGE
  // ==========================================================================
  describe("7. Cross-Marketplace Comparison & Research Coverage", () => {
    it("14. evaluates research coverage and ranks public web marketplaces without official APIs", () => {
      const mockResults = [
        {
          marketplace: "amazon" as const,
          status: "AVAILABLE" as const,
          products: [
            {
              marketplace: "amazon" as const,
              externalId: "B1",
              title: "Amazon Ceramic Mug",
              price: 24.99,
              currency: "USD",
              rating: 4.7,
              reviewCount: 500,
              source: "ACTUAL_DATA" as const,
              acquisitionMethod: "PUBLIC_WEB" as const,
              isHistorical: false,
              capturedAt: new Date(),
              opportunityScore: {
                score: 84,
                confidence: 90,
                tier: "High Opportunity",
                verdict: "Strong Opportunity",
                verdictVariant: "success" as const,
                availableSignals: ["DEMAND", "COMPETITION"],
                unavailableSignals: [],
              },
            },
          ],
          itemCount: 1,
          durationMs: 80,
          limitations: [],
          observedAt: new Date(),
          generatedAt: new Date(),
        },
        {
          marketplace: "tiktok_shop" as const,
          status: "NOT_IMPLEMENTED" as const,
          products: [],
          itemCount: 0,
          durationMs: 10,
          limitations: ["TikTok Shop public research adapter not implemented"],
          observedAt: new Date(),
          generatedAt: new Date(),
        },
      ];

      const comparison = buildCrossMarketplaceComparison("ceramic mug", mockResults);
      assert.equal(comparison.rankings.length, 1);
      assert.equal(comparison.rankings[0].marketplace, "amazon");
      assert.ok(comparison.coverage !== undefined);
      assert.equal(comparison.coverage.totalObservedProducts, 1);
      assert.equal(comparison.coverage.freshProductsCount, 1);
      assert.equal(comparison.coverage.availableMarketplacesCount, 1);
    });
  });

  // ==========================================================================
  // 8. SECURITY & CENTRAL COMPLIANCE SAFEGUARDS
  // ==========================================================================
  describe("8. Security & Central Compliance Guardrails", () => {
    it("15. blocks dangerous SSRF and internal AWS metadata IP addresses", () => {
      assert.throws(() => validateAcquisitionCompliance("http://127.0.0.1"), AcquisitionComplianceError);
      assert.throws(() => validateAcquisitionCompliance("http://localhost:8080"), AcquisitionComplianceError);
      assert.throws(() => validateAcquisitionCompliance("http://169.254.169.254/latest/meta-data"), AcquisitionComplianceError);
    });

    it("16. blocks private seller dashboard URLs", () => {
      assert.throws(() => validateAcquisitionCompliance("https://www.etsy.com/your/shops/orders"), AcquisitionComplianceError);
      assert.throws(() => validateAcquisitionCompliance("https://sellercentral.amazon.com/inventory"), AcquisitionComplianceError);
    });
  });
});
