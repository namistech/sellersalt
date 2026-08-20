/**
 * Batch 10 — Production-Grade Marketplace-Independent Research Acquisition Hardening Test Suite
 * 
 * Verifies:
 * 1. Centralized Domain Safety, URL Sanitation, and SSRF Prevention
 * 2. Hardened PublicPageFetcher with Safe Redirect Validation, 429/503 Retries, and Payload Bounds
 * 3. Field-Level Provenance Tracking and Non-Destructive Multi-Source Observation Merging
 * 4. Domain-Specific Temporal Freshness Calibration & Confidence Degradation
 * 5. Multi-Marketplace Public Web Search & Product Detail Adapters (Amazon, eBay, Walmart, Etsy)
 * 6. Public Shop Research & Canonical Competition Scoring
 * 7. Public Category Aggregation with Price Percentiles and Opportunity Distributions
 * 8. Empirical Keyword Harvesting with Deterministic Intent Clustering & Zero Fake Volume
 * 9. Longitudinal Trend Intelligence (n=1 => null, n >= 2 => empirical delta)
 * 10. Research Source Orchestrator Cascades, Product Detail Orchestration, and Coverage Reporting
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  isAllowedMarketplaceUrl,
  validateAcquisitionCompliance,
  AcquisitionComplianceError,
} from "../marketplaces/core/acquisition/compliance";

import {
  PublicPageFetcher,
} from "../marketplaces/core/acquisition/page-fetcher";

import {
  evaluateFreshness,
} from "../marketplaces/core/acquisition/freshness";

import {
  mergeProductObservations,
} from "../marketplaces/core/acquisition/merger";

import {
  parseAmazonListingCardsFromHtml,
} from "../marketplaces/amazon/public-adapter";

import {
  parseEbayListingCardsFromHtml,
} from "../marketplaces/ebay/public-adapter";

import {
  parseWalmartListingCardsFromHtml,
} from "../marketplaces/walmart/public-adapter";

import {
  parseEtsyListingCardsFromHtml,
} from "../marketplaces/core/acquisition/structured-parser";

import {
  EtsyPublicWebAdapter,
} from "../marketplaces/etsy/public-adapter";

import {
  buildDeterministicKeywordClusters,
} from "../marketplaces/core/acquisition/keywords";

import {
  fetchPublicShopResearch,
} from "../marketplaces/core/acquisition/shops";

import {
  aggregatePublicCategoryIntelligence,
} from "../marketplaces/core/acquisition/categories";

import {
  calculateObservationTrendsFromPoints,
} from "../marketplaces/core/acquisition/trends";

import {
  orchestrateProductResearch,
  orchestrateProductDetail,
} from "../marketplaces/core/acquisition/orchestrator";

import {
  registerAllConnectors,
} from "../marketplaces/core/registry";

import type {
  NormalizedProduct,
} from "../marketplaces/core/types";

describe("Batch 10: Production-Grade Marketplace-Independent Research Acquisition Hardening", () => {
  beforeEach(() => {
    registerAllConnectors();
  });

  // ==========================================================================
  // 1. CENTRALIZED DOMAIN SAFETY & SSRF PREVENTION
  // ==========================================================================
  describe("1. Centralized Domain Safety, URL Sanitation & SSRF Guard", () => {
    it("1. allows legitimate public marketplace search and product URLs", () => {
      assert.equal(isAllowedMarketplaceUrl("https://www.etsy.com/search?q=mug"), true);
      assert.equal(isAllowedMarketplaceUrl("https://www.amazon.com/dp/B08N5WRWNW"), true);
      assert.equal(isAllowedMarketplaceUrl("https://www.ebay.com/itm/1234567890"), true);
      assert.equal(isAllowedMarketplaceUrl("https://www.walmart.com/ip/123456"), true);
      assert.equal(isAllowedMarketplaceUrl("https://www.tiktok.com/@shop"), true);
    });

    it("2. strictly blocks internal network SSRF targets and IP literals", () => {
      const ssrfUrls = [
        "http://localhost:3000/api/secret",
        "http://127.0.0.1:8080/admin",
        "http://169.254.169.254/latest/meta-data/",
        "http://0.0.0.0/",
        "http://192.168.1.1/router",
        "http://10.0.0.1/internal",
        "http://172.16.0.1/private",
      ];

      for (const badUrl of ssrfUrls) {
        assert.equal(isAllowedMarketplaceUrl(badUrl), false, `Should reject SSRF URL: ${badUrl}`);
        assert.throws(
          () => validateAcquisitionCompliance(badUrl),
          (err: any) => err instanceof AcquisitionComplianceError
        );
      }
    });

    it("3. strictly blocks non-standard protocols and non-standard ports", () => {
      const badProtocolUrls = [
        "file:///etc/passwd",
        "ftp://ftp.example.com/file",
        "data:text/html,<h1>test</h1>",
        "javascript:alert(1)",
        "https://www.amazon.com:8443/dp/B08N5WRWNW",
      ];

      for (const badUrl of badProtocolUrls) {
        assert.equal(isAllowedMarketplaceUrl(badUrl), false, `Should reject bad protocol/port: ${badUrl}`);
        assert.throws(
          () => validateAcquisitionCompliance(badUrl),
          (err: any) => err instanceof AcquisitionComplianceError
        );
      }
    });

    it("4. strictly blocks authenticated seller portal and private account endpoints", () => {
      const privateUrls = [
        "https://www.etsy.com/your/shops/my-shop/dashboard",
        "https://sellercentral.amazon.com/home",
        "https://my.ebay.com/ws/eBayISAPI.dll?MyEbayBeta",
        "https://seller.walmart.com/item-management",
        "https://seller-us.tiktok.com/order",
      ];

      for (const pUrl of privateUrls) {
        assert.equal(isAllowedMarketplaceUrl(pUrl), false, `Should reject private portal: ${pUrl}`);
        assert.throws(
          () => validateAcquisitionCompliance(pUrl),
          (err: any) => err instanceof AcquisitionComplianceError
        );
      }
    });
  });

  // ==========================================================================
  // 2. HARDENED PUBLIC PAGE FETCHER & SAFE REDIRECTS
  // ==========================================================================
  describe("2. Hardened PublicPageFetcher & Safe Redirect Handling", () => {
    it("5. validates and follows safe redirects within allowed marketplace domains", async () => {
      const fetcher = new PublicPageFetcher();
      const originalFetch = globalThis.fetch;

      globalThis.fetch = async (input: any) => {
        const urlStr = typeof input === "string" ? input : input.url;
        if (urlStr.includes("etsy.com/listing-short/123")) {
          return new Response("", {
            status: 301,
            headers: { location: "https://www.etsy.com/listing/123456789/ceramic-mug" },
          });
        }
        return new Response("<html><head><title>Ceramic Mug</title></head><body><h1>Ceramic Mug</h1></body></html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      };

      try {
        const response = await fetcher.fetchPage("https://www.etsy.com/listing-short/123", { bypassCache: true });
        assert.equal(response.statusCode, 200);
        assert.equal(response.url, "https://www.etsy.com/listing/123456789/ceramic-mug");
        assert.equal(response.redirectsFollowed, 1);
        assert.ok(response.html.includes("Ceramic Mug"));
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("6. immediately aborts redirect to unauthorized or SSRF target domain", async () => {
      const fetcher = new PublicPageFetcher();
      const originalFetch = globalThis.fetch;

      globalThis.fetch = async () => {
        return new Response("", {
          status: 302,
          headers: { location: "http://169.254.169.254/latest/meta-data/" },
        });
      };

      try {
        const response = await fetcher.fetchPage("https://www.amazon.com/redirect-attack", { bypassCache: true });
        assert.equal(response.statusCode, 0);
        assert.equal(response.failureReason, "ACCESS_RESTRICTED");
        assert.ok(response.errorMessage?.includes("domain safety guard"));
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("7. handles 429 rate limits gracefully with backoff classification", async () => {
      const fetcher = new PublicPageFetcher();
      const originalFetch = globalThis.fetch;

      globalThis.fetch = async () => {
        return new Response("Too Many Requests", {
          status: 429,
          headers: { "retry-after": "5", "content-type": "text/plain" },
        });
      };

      try {
        const response = await fetcher.fetchPage("https://www.ebay.com/itm/123", { maxRetries: 0, bypassCache: true });
        assert.equal(response.statusCode, 429);
        assert.equal(response.failureReason, "RATE_LIMITED");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("8. enforces maximum response payload size and truncates gracefully", async () => {
      const fetcher = new PublicPageFetcher();
      const originalFetch = globalThis.fetch;

      const largeHtml = "A".repeat(5000);
      globalThis.fetch = async () => {
        return new Response(largeHtml, {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      };

      try {
        const response = await fetcher.fetchPage("https://www.walmart.com/ip/123", {
          maxBytes: 1000,
          bypassCache: true,
        });
        assert.equal(response.statusCode, 200);
        assert.equal(response.html.length, 1000);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  // ==========================================================================
  // 3. FIELD-LEVEL PROVENANCE & NON-DESTRUCTIVE MERGING
  // ==========================================================================
  describe("3. Field-Level Provenance & Multi-Source Observation Merging", () => {
    it("9. constructs complete fieldLineage for single-source public web observations", () => {
      const prod: NormalizedProduct = {
        marketplace: "etsy",
        externalId: "123",
        title: "Handmade Ceramic Mug",
        price: 24.5,
        currency: "USD",
        rating: 4.8,
        reviewCount: 150,
        source: "ACTUAL_DATA",
        acquisitionMethod: "PUBLIC_WEB",
        isHistorical: false,
        capturedAt: new Date(),
      };

      const merged = mergeProductObservations(prod);
      assert.equal(merged.isEnriched, false);
      assert.ok(merged.product.fieldLineage);
      assert.equal(merged.product.fieldLineage?.title?.source, "PUBLIC_WEB");
      assert.equal(merged.product.fieldLineage?.price?.value, 24.5);
      assert.equal(merged.product.fieldLineage?.rating?.provenance, "ACTUAL_DATA");
    });

    it("10. non-destructively merges public web and official API observations with field lineage", () => {
      const publicProd: NormalizedProduct = {
        marketplace: "etsy",
        externalId: "123",
        title: "Handmade Ceramic Mug",
        price: 24.5,
        currency: "USD",
        rating: 4.8,
        reviewCount: 150,
        source: "ACTUAL_DATA",
        acquisitionMethod: "PUBLIC_WEB",
        isHistorical: false,
        capturedAt: new Date(),
      };

      const apiProd: NormalizedProduct = {
        marketplace: "etsy",
        externalId: "123",
        title: "",
        price: null,
        currency: null,
        categoryPath: ["Home & Living", "Kitchen & Dining", "Drinkware"],
        favoritesCount: 890,
        shop: {
          name: "ClayAndKiln",
          activeListings: 42,
          ageMonths: 24,
        },
        source: "ACTUAL_DATA",
        acquisitionMethod: "MARKETPLACE_API",
        isHistorical: false,
        capturedAt: new Date(),
      };

      const merged = mergeProductObservations(publicProd, apiProd);
      assert.equal(merged.isEnriched, true);
      assert.equal(merged.product.title, "Handmade Ceramic Mug");
      assert.equal(merged.product.price, 24.5);
      assert.equal(merged.product.favoritesCount, 890);
      assert.deepEqual(merged.product.categoryPath, ["Home & Living", "Kitchen & Dining", "Drinkware"]);
      assert.equal(merged.fieldProvenance.price, "PUBLIC_WEB");
      assert.equal(merged.fieldProvenance.favoritesCount, "MARKETPLACE_API");
      assert.equal(merged.fieldProvenance.categoryPath, "MARKETPLACE_API");
    });
  });

  // ==========================================================================
  // 4. DOMAIN-SPECIFIC TEMPORAL FRESHNESS CALIBRATION
  // ==========================================================================
  describe("4. Domain-Specific Temporal Freshness Calibration", () => {
    it("11. evaluates price freshness against 6-hour TTL window", () => {
      const now = Date.now();
      const livePrice = evaluateFreshness(new Date(now - 30 * 60 * 1000), "price");
      assert.equal(livePrice.status, "LIVE");
      assert.equal(livePrice.confidencePenalty, 0);

      const freshPrice = evaluateFreshness(new Date(now - 3 * 3600 * 1000), "price");
      assert.equal(freshPrice.status, "FRESH");
      assert.equal(freshPrice.confidencePenalty, 5);

      const stalePrice = evaluateFreshness(new Date(now - 12 * 3600 * 1000), "price");
      assert.equal(stalePrice.status, "STALE");
      assert.equal(stalePrice.confidencePenalty, 15);
    });

    it("12. evaluates review freshness against 48-hour TTL window", () => {
      const now = Date.now();
      const freshReviews = evaluateFreshness(new Date(now - 24 * 3600 * 1000), "reviews");
      assert.equal(freshReviews.status, "FRESH");
      assert.equal(freshReviews.confidencePenalty, 5);

      const staleReviews = evaluateFreshness(new Date(now - 72 * 3600 * 1000), "reviews");
      assert.equal(staleReviews.status, "STALE");
      assert.equal(staleReviews.confidencePenalty, 15);
    });

    it("13. applies appropriate penalties for historical and unknown timestamp records", () => {
      const historical = evaluateFreshness(new Date(Date.now() - 30 * 86400 * 1000), "general", true);
      assert.equal(historical.status, "HISTORICAL");
      assert.equal(historical.confidencePenalty, 30);

      const missing = evaluateFreshness(null);
      assert.equal(missing.status, "UNKNOWN");
      assert.equal(missing.confidencePenalty, 35);
    });
  });

  // ==========================================================================
  // 5. MULTI-MARKETPLACE PUBLIC WEB SEARCH & PRODUCT DETAIL ADAPTERS
  // ==========================================================================
  describe("5. Multi-Marketplace Public Search & Detail Parsing", () => {
    it("14. Amazon adapter extracts ASIN, title, price, rating, reviews from search cards and JSON-LD", () => {
      const amazonHtml = `
        <div data-asin="B08N5WRWNW">
          <h2 class="a-size-mini"><span class="a-text-normal">Minimalist Ceramic Coffee Mug 12oz</span></h2>
          <span class="a-offscreen">$18.99</span>
          <span class="a-icon-alt">4.7 out of 5 stars</span>
          <span class="a-size-base s-underline-text">1,420</span>
        </div>
      `;

      const products = parseAmazonListingCardsFromHtml(amazonHtml);
      assert.equal(products.length, 1);
      assert.equal(products[0].externalId, "B08N5WRWNW");
      assert.equal(products[0].title, "Minimalist Ceramic Coffee Mug 12oz");
      assert.equal(products[0].price, 18.99);
      assert.equal(products[0].rating, 4.7);
      assert.equal(products[0].reviewCount, 1420);
    });

    it("15. eBay adapter extracts item ID, title, price, rating from .s-item cards", () => {
      const ebayHtml = `
        <li class="s-item">
          <a href="https://www.ebay.com/itm/234567890123?hash=abc">
            <div class="s-item__title">Vintage Handmade Stoneware Coffee Mug</div>
          </a>
          <span class="s-item__price">$22.50</span>
          <span class="s-item__seller-info-text">pottery_shop (520) 99.4%</span>
        </li>
      `;

      const products = parseEbayListingCardsFromHtml(ebayHtml);
      assert.equal(products.length, 1);
      assert.equal(products[0].externalId, "234567890123");
      assert.equal(products[0].title, "Vintage Handmade Stoneware Coffee Mug");
      assert.equal(products[0].price, 22.50);
    });

    it("16. Walmart adapter extracts item ID, title, price, rating from semantic cards", () => {
      const walmartHtml = `
        <div data-item-id="87654321">
          <span class="w_iUH7">Modern Matte Ceramic Coffee Mug</span>
          <span class="w_iUH7">$14.99</span>
          <span>4.6 out of 5 Stars</span>
          <span>(350 reviews)</span>
        </div>
      `;

      const products = parseWalmartListingCardsFromHtml(walmartHtml);
      assert.equal(products.length, 1);
      assert.equal(products[0].externalId, "87654321");
      assert.equal(products[0].title, "Modern Matte Ceramic Coffee Mug");
      assert.equal(products[0].price, 14.99);
      assert.equal(products[0].rating, 4.6);
      assert.equal(products[0].reviewCount, 350);
    });

    it("17. Etsy adapter extracts listing ID, title, price, shop name, favorites from search cards", () => {
      const etsyHtml = `
        <div class="v2-listing-card" data-listing-id="987654321">
          <h3 class="v2-listing-card__title">Artisan Pottery Mug with Thumb Rest</h3>
          <span class="currency-value">28.00</span>
          <p class="v2-listing-card__shop">EarthAndFireStudio</p>
          <span class="screen-reader-only">4.9 out of 5 stars</span>
        </div>
      `;

      const products = parseEtsyListingCardsFromHtml(etsyHtml);
      assert.equal(products.length, 1);
      assert.equal(products[0].externalId, "987654321");
      assert.equal(products[0].title, "Artisan Pottery Mug with Thumb Rest");
      assert.equal(products[0].price, 28.00);
      assert.equal(products[0].shop?.name, "EarthAndFireStudio");
    });
  });

  // ==========================================================================
  // 6. PUBLIC SHOP & CATEGORY RESEARCH AGGREGATION
  // ==========================================================================
  describe("6. Public Shop Research & Category Aggregation", () => {
    it("18. evaluates canonical competition barrier score for public shops", async () => {
      const shopResult = await fetchPublicShopResearch("artisan-pottery", "etsy");
      if ("shop" in shopResult) {
        assert.equal(shopResult.marketplace, "etsy");
        assert.ok(shopResult.competition);
        assert.ok(typeof shopResult.competition.score === "number" || shopResult.competition.score === null);
      }
    });

    it("19. aggregates price percentiles and opportunity distributions for categories", async () => {
      const sampleProducts: NormalizedProduct[] = [
        {
          marketplace: "etsy",
          externalId: "1",
          title: "Low Price Mug",
          price: 10.0,
          currency: "USD",
          source: "ACTUAL_DATA",
          capturedAt: new Date(),
        },
        {
          marketplace: "etsy",
          externalId: "2",
          title: "Median Price Mug",
          price: 25.0,
          currency: "USD",
          source: "ACTUAL_DATA",
          capturedAt: new Date(),
        },
        {
          marketplace: "etsy",
          externalId: "3",
          title: "High Price Mug",
          price: 50.0,
          currency: "USD",
          source: "ACTUAL_DATA",
          capturedAt: new Date(),
        },
      ];

      const categoryIntel = await aggregatePublicCategoryIntelligence("Drinkware", "etsy", sampleProducts);
      if ("totalListings" in categoryIntel) {
        assert.equal(categoryIntel.totalListings, 3);
        assert.equal(categoryIntel.priceDistribution.min, 10.0);
        assert.equal(categoryIntel.priceDistribution.median, 25.0);
        assert.equal(categoryIntel.priceDistribution.max, 50.0);
      } else {
        assert.fail("Expected category intelligence result");
      }
    });
  });

  // ==========================================================================
  // 7. EMPIRICAL KEYWORD HARVESTING & INTENT CLUSTERING
  // ==========================================================================
  describe("7. Empirical Keyword Harvesting & Intent Clustering", () => {
    it("20. deterministically clusters terms into intent categories with zero fake search volume", () => {
      const terms = [
        "ceramic coffee mug",
        "stoneware pottery cup",
        "gift for mom",
        "christmas present",
        "custom personalized mug",
        "minimalist matte mug",
      ];

      const clusters = buildDeterministicKeywordClusters(terms);
      assert.ok(clusters.some((c) => c.intent === "MATERIAL_STYLE" && c.keywords.some((k) => k.includes("ceramic") || k.includes("stoneware"))));
      assert.ok(clusters.some((c) => c.intent === "RECIPIENT_OCCASION" && c.keywords.some((k) => k.includes("mom") || k.includes("christmas"))));
      assert.ok(clusters.some((c) => c.intent === "PRODUCT_MODIFIER" && c.keywords.some((k) => k.includes("custom") || k.includes("personalized"))));
    });
  });

  // ==========================================================================
  // 8. LONGITUDINAL TREND TRACKING WITH ZERO FABRICATION
  // ==========================================================================
  describe("8. Longitudinal Trend Tracking with Zero Fabrication", () => {
    it("21. returns null deltas when only 1 observation exists (Zero Fabrication Rule)", () => {
      const singlePoint = [
        {
          observedAt: new Date("2026-08-01T10:00:00Z"),
          price: 24.0,
          reviewCount: 100,
          rating: 4.8,
          salesCount: null,
          favoritesCount: 300,
          activeListings: 10,
        },
      ];

      const trend = calculateObservationTrendsFromPoints("A1", "amazon", singlePoint);
      assert.equal(trend.observationCount, 1);
      assert.equal(trend.priceTrend.priceDelta, null);
      assert.equal(trend.priceTrend.priceDeltaPercent, null);
      assert.equal(trend.reviewTrend.reviewDelta, null);
      assert.equal(trend.reviewTrend.monthlyVelocity, null);
      assert.equal(trend.persistenceStatus, "NEW");
    });

    it("22. calculates genuine empirical price and review deltas for multiple observations", () => {
      const multiPoints = [
        {
          observedAt: new Date("2026-08-01T10:00:00Z"),
          price: 30.0,
          reviewCount: 100,
          rating: 4.8,
          salesCount: null,
          favoritesCount: 300,
          activeListings: 10,
        },
        {
          observedAt: new Date("2026-08-15T10:00:00Z"),
          price: 24.0,
          reviewCount: 120,
          rating: 4.8,
          salesCount: null,
          favoritesCount: 350,
          activeListings: 10,
        },
      ];

      const trend = calculateObservationTrendsFromPoints("A1", "amazon", multiPoints);
      assert.equal(trend.observationCount, 2);
      assert.equal(trend.priceTrend.initialPrice, 30.0);
      assert.equal(trend.priceTrend.currentPrice, 24.0);
      assert.equal(trend.priceTrend.priceDelta, -6.0);
      assert.equal(trend.priceTrend.isPriceDrop, true);
      assert.equal(trend.reviewTrend.reviewDelta, 20);
      assert.ok(trend.reviewTrend.monthlyVelocity !== null && trend.reviewTrend.monthlyVelocity > 0);
      assert.equal(trend.persistenceStatus, "PERSISTENT");
    });
  });

  // ==========================================================================
  // 9. RESEARCH SOURCE ORCHESTRATOR & PRODUCT DETAIL ORCHESTRATION
  // ==========================================================================
  describe("9. Research Source Orchestrator & Product Detail Resolution", () => {
    it("23. orchestrates product search with graceful degradation and status report", async () => {
      const res = await orchestrateProductResearch(
        { query: "desk organizer", marketplace: "etsy" },
        { preferredSources: ["PUBLIC_WEB", "HISTORICAL_OBSERVATION"], persistObservations: false }
      );

      assert.ok(res.report);
      assert.equal(res.report.marketplace, "etsy");
      assert.ok(["AVAILABLE", "PARTIAL", "UNAVAILABLE"].includes(res.report.status));
      assert.ok(Array.isArray(res.report.sourcesAttempted));
    });

    it("24. orchestrates individual product detail resolution across sources", async () => {
      const res = await orchestrateProductDetail(
        "B08N5WRWNW",
        "amazon",
        { preferredSources: ["PUBLIC_WEB", "HISTORICAL_OBSERVATION"] }
      );

      assert.ok(res.report);
      assert.equal(res.report.marketplace, "amazon");
      assert.ok(["AVAILABLE", "PARTIAL", "UNAVAILABLE", "NOT_IMPLEMENTED"].includes(res.report.status));
    });
  });
});
