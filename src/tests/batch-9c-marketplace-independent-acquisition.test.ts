/**
 * SellerSalt Batch 9C: Marketplace-Independent Web Acquisition Expansion
 * & Research Source Orchestrator Test Suite
 * 
 * Verifies end-to-end multi-source acquisition across Public Web, Official APIs,
 * Historical DB fallback, Freshness temporal calibration, Empirical Keyword Harvesting,
 * Semantic Parsers (Amazon, eBay, Walmart, Etsy), and Compliance Boundaries.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  DomainRateLimiter,
  PublicPageFetcher,
  extractJsonLdBlocks,
  parseProductFromJsonLd,
  parseCategoryBreadcrumbsFromJsonLd,
  parseOpenGraphData,
  extractListingIdFromUrl,
  mergeProductObservations,
  evaluateFreshness,
  validateAcquisitionCompliance,
  AcquisitionComplianceError,
  orchestrateProductResearch,
  harvestPublicMarketplaceKeywords,
} from "@/marketplaces/core/acquisition";

import { EtsyPublicWebAdapter, etsyPublicWebAdapter } from "@/marketplaces/etsy/public-adapter";
import {
  AmazonPublicWebAdapter,
  amazonPublicWebAdapter,
  parseAmazonListingCardsFromHtml,
} from "@/marketplaces/amazon/public-adapter";
import {
  EbayPublicWebAdapter,
  ebayPublicWebAdapter,
  parseEbayListingCardsFromHtml,
} from "@/marketplaces/ebay/public-adapter";
import {
  WalmartPublicWebAdapter,
  walmartPublicWebAdapter,
  parseWalmartListingCardsFromHtml,
} from "@/marketplaces/walmart/public-adapter";
import {
  TikTokShopPublicWebAdapter,
  tiktokShopPublicWebAdapter,
} from "@/marketplaces/tiktok-shop/public-adapter";

import {
  MarketplaceRegistry,
  registerAllConnectors,
} from "@/marketplaces/core/registry";
import { scoreShopCompetition } from "@/marketplaces/core/opportunity-engine";
import { buildCrossMarketplaceComparison } from "@/services/intelligence/cross-marketplace-comparison";
import type { NormalizedProduct, NormalizedObservation } from "@/marketplaces/core/types";

describe("Batch 9C: Marketplace-Independent Web Acquisition & Source Orchestrator", () => {
  registerAllConnectors();

  // --------------------------------------------------------------------------
  // 1. Amazon Structured & Card Parser Verification
  // --------------------------------------------------------------------------
  describe("1. Amazon Public Web Acquisition & Semantic Parser", () => {
    const sampleAmazonSearchHtml = `
      <div data-asin="B08N5WRWNW" class="s-result-item">
        <h2><span class="a-text-normal">Stoneware Coffee Mug Ceramic 16oz Handcrafted</span></h2>
        <span class="a-price"><span class="a-offscreen">$24.99</span></span>
        <span class="a-icon-alt">4.6 out of 5 stars</span>
        <span class="a-size-base s-underline-text">1,420</span>
        <img class="s-image" src="https://m.media-amazon.com/images/I/71xyz.jpg" />
      </div>
      <div data-asin="B09XYZ1234" class="s-result-item">
        <h2><span class="a-text-normal">Minimalist Matte Tea Mug Porcelain</span></h2>
        <span class="a-price"><span class="a-offscreen">$19.50</span></span>
        <span class="a-icon-alt">4.8 out of 5 stars</span>
        <span class="a-size-base s-underline-text">380</span>
        <img class="s-image" src="https://m.media-amazon.com/images/I/81abc.jpg" />
      </div>
    `;

    const sampleAmazonDetailJsonLd = `
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": "Artisanal Ceramic Coffee Mug with Handle",
        "image": "https://m.media-amazon.com/images/I/91mug.jpg",
        "description": "Premium handcrafted ceramic mug for tea and coffee",
        "sku": "B08N5WRWNW",
        "brand": { "@type": "Brand", "name": "ClayArt" },
        "offers": {
          "@type": "Offer",
          "price": "26.50",
          "priceCurrency": "USD",
          "availability": "https://schema.org/InStock"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.7",
          "reviewCount": "890"
        }
      }
      </script>
    `;

    it("1. extracts Amazon search cards with ASIN, title, price, rating, review count", () => {
      const products = parseAmazonListingCardsFromHtml(sampleAmazonSearchHtml);
      assert.equal(products.length, 2);

      const p1 = products[0];
      assert.equal(p1.marketplace, "amazon");
      assert.equal(p1.externalId, "B08N5WRWNW");
      assert.equal(p1.title, "Stoneware Coffee Mug Ceramic 16oz Handcrafted");
      assert.equal(p1.price, 24.99);
      assert.equal(p1.rating, 4.6);
      assert.equal(p1.reviewCount, 1420);
      if (p1.opportunityScore?.score) {
        assert.ok(p1.opportunityScore.score >= 0);
      }
    });

    it("2. extracts Amazon product detail from JSON-LD schema", () => {
      const jsonLdBlocks = extractJsonLdBlocks(sampleAmazonDetailJsonLd);
      const parsed = parseProductFromJsonLd(jsonLdBlocks);

      assert.ok(parsed);
      assert.equal(parsed.name, "Artisanal Ceramic Coffee Mug with Handle");
      assert.equal(parsed.price, 26.5);
      assert.equal(parsed.currency, "USD");
      assert.equal(parsed.ratingValue, 4.7);
      assert.equal(parsed.reviewCount, 890);
    });

    it("3. Amazon adapter handles bot-check restrictions gracefully without crashing or fabricating", async () => {
      const fetcher = new PublicPageFetcher();
      const originalFetch = globalThis.fetch;

      globalThis.fetch = async () => {
        return new Response("<html><body>Type the characters you see in this image to continue</body></html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      };

      try {
        const adapter = new AmazonPublicWebAdapter(fetcher);
        const res = await adapter.searchPublicProducts({ query: "ceramic mug" });

        assert.equal(res.success, false);
        assert.equal(res.failureReason, "ACCESS_RESTRICTED");
        assert.equal(res.items.length, 0);
        assert.equal(res.provenance, "UNAVAILABLE");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  // --------------------------------------------------------------------------
  // 2. eBay Structured & Card Parser Verification
  // --------------------------------------------------------------------------
  describe("2. eBay Public Web Acquisition & Semantic Parser", () => {
    const sampleEbaySearchHtml = `
      <ul class="srp-results">
        <li class="s-item">
          <a class="s-item__link" href="https://www.ebay.com/itm/123456789012?hash=item1">
            <h3 class="s-item__title">Vintage Ceramic Pottery Coffee Mug Studio Crafted</h3>
          </a>
          <span class="s-item__price">$18.99</span>
          <span class="s-item__seller-info-text">pottery_barn_vintage (1240) 99.2%</span>
          <img class="s-item__image-img" src="https://i.ebayimg.com/images/g/xyz/s-l500.jpg" />
        </li>
      </ul>
    `;

    it("4. extracts eBay search listing card with listing ID, title, price, seller", () => {
      const products = parseEbayListingCardsFromHtml(sampleEbaySearchHtml);
      assert.equal(products.length, 1);

      const p = products[0];
      assert.equal(p.marketplace, "ebay");
      assert.equal(p.externalId, "123456789012");
      assert.equal(p.title, "Vintage Ceramic Pottery Coffee Mug Studio Crafted");
      assert.equal(p.price, 18.99);
      if (p.opportunityScore?.score !== null && p.opportunityScore?.score !== undefined) {
        assert.ok(p.opportunityScore.score >= 0);
      }
    });

    it("5. eBay adapter handles HTTP 429 rate limits gracefully", async () => {
      const fetcher = new PublicPageFetcher();
      const originalFetch = globalThis.fetch;

      globalThis.fetch = async () => {
        return new Response("Too Many Requests", {
          status: 429,
          headers: { "content-type": "text/plain" },
        });
      };

      try {
        const adapter = new EbayPublicWebAdapter(fetcher);
        const res = await adapter.searchPublicProducts({ query: "vintage mug" });

        assert.equal(res.success, false);
        assert.equal(res.statusCode, 429);
        assert.equal(res.failureReason, "RATE_LIMITED");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  // --------------------------------------------------------------------------
  // 3. Walmart Structured & Card Parser Verification
  // --------------------------------------------------------------------------
  describe("3. Walmart Public Web Acquisition & Semantic Parser", () => {
    const sampleWalmartSearchHtml = `
      <div data-item-id="98765432">
        <span class="w_iUH7">Mainstays Ceramic Bistro Coffee Mug 15 fl oz White</span>
        <span class="w_iUH7">$4.98</span>
        <span>4.5 out of 5 Stars</span>
        <span>(320 reviews)</span>
        <img src="https://i5.walmartimages.com/asr/mug.jpeg" />
      </div>
    `;

    it("6. extracts Walmart search cards with item ID, title, price, rating, reviews", () => {
      const products = parseWalmartListingCardsFromHtml(sampleWalmartSearchHtml);
      assert.equal(products.length, 1);

      const p = products[0];
      assert.equal(p.marketplace, "walmart");
      assert.equal(p.externalId, "98765432");
      assert.equal(p.title, "Mainstays Ceramic Bistro Coffee Mug 15 fl oz White");
      assert.equal(p.price, 4.98);
      assert.equal(p.rating, 4.5);
      assert.equal(p.reviewCount, 320);
      if (p.opportunityScore?.score) {
        assert.ok(p.opportunityScore.score >= 0);
      }
    });

    it("7. Walmart adapter reports ACCESS_RESTRICTED on identity verification challenge", async () => {
      const fetcher = new PublicPageFetcher();
      const originalFetch = globalThis.fetch;

      globalThis.fetch = async () => {
        return new Response("<html><body>Robot or human? Verify your identity</body></html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      };

      try {
        const adapter = new WalmartPublicWebAdapter(fetcher);
        const res = await adapter.searchPublicProducts({ query: "coffee mug" });

        assert.equal(res.success, false);
        assert.equal(res.failureReason, "ACCESS_RESTRICTED");
        assert.equal(res.items.length, 0);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  // --------------------------------------------------------------------------
  // 4. TikTok Shop Architecture-Ready Verification
  // --------------------------------------------------------------------------
  describe("4. TikTok Shop Architecture-Ready Public Adapter", () => {
    it("8. TikTok Shop public adapter reports NOT_IMPLEMENTED with all-false capabilities", async () => {
      assert.equal(tiktokShopPublicWebAdapter.capabilities.productSearch, false);
      assert.equal(tiktokShopPublicWebAdapter.capabilities.shopResearch, false);

      const res = await tiktokShopPublicWebAdapter.searchPublicProducts({ query: "mug" });
      assert.equal(res.success, false);
      assert.equal(res.failureReason, "NOT_IMPLEMENTED");
      assert.equal(res.provenance, "UNAVAILABLE");
    });
  });

  // --------------------------------------------------------------------------
  // 5. Standardized Freshness Model
  // --------------------------------------------------------------------------
  describe("5. Temporal Freshness Evaluation & Confidence Calibration", () => {
    it("9. classifies observations < 1 hour as LIVE with zero confidence penalty", () => {
      const freshDate = new Date(Date.now() - 15 * 60 * 1000); // 15 mins ago
      const evalResult = evaluateFreshness(freshDate, "price");

      assert.equal(evalResult.status, "LIVE");
      assert.equal(evalResult.isStale, false);
      assert.equal(evalResult.confidencePenalty, 0);
    });

    it("10. classifies observations < 6 hours as FRESH for price domain", () => {
      const date = new Date(Date.now() - 3 * 3600 * 1000); // 3 hours ago
      const evalResult = evaluateFreshness(date, "price");

      assert.equal(evalResult.status, "FRESH");
      assert.equal(evalResult.isStale, false);
      assert.equal(evalResult.confidencePenalty, 5);
    });

    it("11. classifies price observations > 6 hours as STALE with 15% confidence penalty", () => {
      const staleDate = new Date(Date.now() - 12 * 3600 * 1000); // 12 hours ago
      const evalResult = evaluateFreshness(staleDate, "price");

      assert.equal(evalResult.status, "STALE");
      assert.equal(evalResult.isStale, true);
      assert.equal(evalResult.confidencePenalty, 15);
    });

    it("12. classifies taxonomy observations as FRESH up to 7 days", () => {
      const taxonomyDate = new Date(Date.now() - 3 * 86400 * 1000); // 3 days ago
      const evalResult = evaluateFreshness(taxonomyDate, "taxonomy");

      assert.equal(evalResult.status, "FRESH");
      assert.equal(evalResult.isStale, false);
    });

    it("13. classifies missing observation timestamp as UNKNOWN with penalty", () => {
      const evalResult = evaluateFreshness(null, "general");

      assert.equal(evalResult.status, "UNKNOWN");
      assert.equal(evalResult.isStale, true);
      assert.ok(evalResult.confidencePenalty >= 30);
    });
  });

  // --------------------------------------------------------------------------
  // 6. Empirical Keyword Research Without Official APIs
  // --------------------------------------------------------------------------
  describe("6. Keyword Observation & Evidence Aggregation", () => {
    it("14. harvests keyword frequencies, price averages, and demand proxies without fake search volume", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        return new Response(
          `<html>
            <div class="v2-listing-card">
              <a href="https://www.etsy.com/listing/101">
                <h3 class="v2-listing-card__title">Handmade Ceramic Mug Pottery</h3>
                <span class="currency-value">$25.00</span>
              </a>
            </div>
            <div class="v2-listing-card">
              <a href="https://www.etsy.com/listing/102">
                <h3 class="v2-listing-card__title">Artisan Ceramic Mug Stoneware</h3>
                <span class="currency-value">$30.00</span>
              </a>
            </div>
          </html>`,
          { status: 200, headers: { "content-type": "text/html" } }
        );
      };

      try {
        const summary = await harvestPublicMarketplaceKeywords({
          query: "ceramic mug",
          marketplace: "etsy",
        });

        assert.equal(summary.totalListingsObserved, 2);
        assert.equal(summary.averageObservedPrice, 27.5);
        assert.ok(summary.topKeywords.length > 0);

        // Verify zero-fabrication of exact search volume
        for (const kw of summary.topKeywords) {
          assert.equal(kw.searchVolume, null);
          assert.equal(kw.searchVolumeProvenance, "UNAVAILABLE");
          assert.ok(kw.listingFrequencyPercent > 0);
        }
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("15. gracefully returns UNAVAILABLE when adapter has no public observations", async () => {
      const summary = await harvestPublicMarketplaceKeywords({
        query: "nonexistent query",
        marketplace: "tiktok_shop",
      });

      assert.equal(summary.totalListingsObserved, 0);
      assert.equal(summary.provenance, "UNAVAILABLE");
      assert.equal(summary.topKeywords.length, 0);
    });
  });

  // --------------------------------------------------------------------------
  // 7. Research Source Orchestration & Fallback Cascades
  // --------------------------------------------------------------------------
  describe("7. Research Source Orchestration & Multi-Source Policy", () => {
    it("16. prioritizes PUBLIC_WEB and records primarySourceUsed in acquisition report", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        return new Response(
          `<html>
            <div class="v2-listing-card">
              <a href="https://www.etsy.com/listing/201"><h3 class="v2-listing-card__title">Clay Tea Cup Artisan</h3></a>
              <span class="currency-value">22.00</span>
            </div>
          </html>`,
          { status: 200, headers: { "content-type": "text/html" } }
        );
      };

      try {
        const res = await orchestrateProductResearch({
          query: "tea cup",
          marketplace: "etsy",
        });

        assert.equal(res.items.length, 1);
        assert.equal(res.report.primarySourceUsed, "PUBLIC_WEB");
        assert.equal(res.report.status, "AVAILABLE");
        assert.ok(res.report.sourcesSucceeded.includes("PUBLIC_WEB"));
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("17. multi-source merger combines public web and API data non-destructively", () => {
      const publicProduct: NormalizedProduct = {
        marketplace: "etsy",
        externalId: "12345",
        title: "Handmade Ceramic Vase",
        price: 45.0,
        currency: "USD",
        rating: 4.9,
        reviewCount: 120,
        source: "ACTUAL_DATA",
        acquisitionMethod: "PUBLIC_WEB",
        isHistorical: false,
        capturedAt: new Date(),
      };

      const apiProduct: NormalizedProduct = {
        marketplace: "etsy",
        externalId: "12345",
        title: "Handmade Ceramic Vase - Stoneware Flower Pot",
        price: 45.0,
        currency: "USD",
        rating: null, // missing in API
        reviewCount: null, // missing in API
        categoryPath: ["Home & Living", "Home Decor", "Vases"],
        source: "ACTUAL_DATA",
        acquisitionMethod: "MARKETPLACE_API",
        isHistorical: false,
        capturedAt: new Date(),
      };

      const merged = mergeProductObservations(publicProduct, apiProduct);
      assert.equal(merged.isEnriched, true);
      assert.deepEqual(merged.sources, ["PUBLIC_WEB", "MARKETPLACE_API"]);
      assert.equal(merged.product.rating, 4.9, "Preserved public rating");
      assert.equal(merged.product.reviewCount, 120, "Preserved public review count");
      assert.deepEqual(
        merged.product.categoryPath,
        ["Home & Living", "Home Decor", "Vases"],
        "Enriched API category path"
      );
    });
  });

  // --------------------------------------------------------------------------
  // 8. Compliance & Safety Safeguards
  // --------------------------------------------------------------------------
  describe("8. Centralized Compliance & Safety Guards", () => {
    it("18. blocks SSRF attempts to localhost / internal networks", () => {
      assert.throws(
        () => validateAcquisitionCompliance("http://127.0.0.1:8080/admin"),
        AcquisitionComplianceError
      );
      assert.throws(
        () => validateAcquisitionCompliance("http://localhost:3000/api/secret"),
        AcquisitionComplianceError
      );
      assert.throws(
        () => validateAcquisitionCompliance("http://169.254.169.254/latest/meta-data"),
        AcquisitionComplianceError
      );
    });

    it("19. blocks direct scraping of authenticated private seller dashboards", () => {
      assert.throws(
        () => validateAcquisitionCompliance("https://www.etsy.com/your/shops/orders"),
        AcquisitionComplianceError
      );
      assert.throws(
        () => validateAcquisitionCompliance("https://sellercentral.amazon.com/orders"),
        AcquisitionComplianceError
      );
      assert.throws(
        () => validateAcquisitionCompliance("https://my.ebay.com/selling"),
        AcquisitionComplianceError
      );
      assert.throws(
        () => validateAcquisitionCompliance("https://seller.walmart.com/dashboard"),
        AcquisitionComplianceError
      );
    });

    it("20. allows legitimate public marketplace URLs", () => {
      assert.doesNotThrow(() => validateAcquisitionCompliance("https://www.etsy.com/listing/123"));
      assert.doesNotThrow(() => validateAcquisitionCompliance("https://www.amazon.com/dp/B08N5WRWNW"));
      assert.doesNotThrow(() => validateAcquisitionCompliance("https://www.ebay.com/itm/123456789"));
      assert.doesNotThrow(() => validateAcquisitionCompliance("https://www.walmart.com/ip/98765432"));
    });
  });

  // --------------------------------------------------------------------------
  // 9. MarketplaceRegistry Single Entry Point & Cross-Marketplace Fan-Out
  // --------------------------------------------------------------------------
  describe("9. MarketplaceRegistry Integration & Multi-Marketplace Comparison", () => {
    it("21. MarketplaceRegistry exposes public web adapters for all registered marketplaces", () => {
      const etsyAdapter = MarketplaceRegistry.tryGetPublicWebAdapter("etsy");
      const amazonAdapter = MarketplaceRegistry.tryGetPublicWebAdapter("amazon");
      const ebayAdapter = MarketplaceRegistry.tryGetPublicWebAdapter("ebay");
      const walmartAdapter = MarketplaceRegistry.tryGetPublicWebAdapter("walmart");
      const tiktokAdapter = MarketplaceRegistry.tryGetPublicWebAdapter("tiktok_shop");

      assert.ok(etsyAdapter);
      assert.ok(amazonAdapter);
      assert.ok(ebayAdapter);
      assert.ok(walmartAdapter);
      assert.ok(tiktokAdapter);
    });

    it("22. Cross-Marketplace comparison handles mixed available/unavailable channels without fake scores", () => {
      const mockResearchResults = [
        {
          marketplace: "etsy" as const,
          status: "AVAILABLE" as const,
          products: [
            {
              marketplace: "etsy" as const,
              externalId: "1",
              title: "Handmade Ceramic Mug",
              price: 25.0,
              currency: "USD",
              rating: 4.8,
              reviewCount: 150,
              source: "ACTUAL_DATA" as const,
              acquisitionMethod: "PUBLIC_WEB" as const,
              isHistorical: false,
              capturedAt: new Date(),
              opportunityScore: {
                score: 82,
                confidence: 88,
                tier: "High Opportunity",
                verdict: "Strong Opportunity",
                verdictVariant: "success" as const,
                availableSignals: ["DEMAND", "COMPETITION"],
                unavailableSignals: [],
              },
            },
          ],
          itemCount: 1,
          durationMs: 120,
          limitations: [],
          observedAt: new Date(),
          generatedAt: new Date(),
        },
        {
          marketplace: "amazon" as const,
          status: "UNAVAILABLE" as const,
          products: [],
          itemCount: 0,
          durationMs: 50,
          limitations: ["Access restricted"],
          observedAt: new Date(),
          generatedAt: new Date(),
        },
      ];

      const comparison = buildCrossMarketplaceComparison("ceramic mug", mockResearchResults);
      assert.ok(comparison);
      assert.equal(comparison.rankings.length, 1, "Only available marketplaces ranked");
      assert.equal(comparison.rankings[0].marketplace, "etsy");

      const amazonEval = comparison.evaluations.find((e) => e.marketplace === "amazon");
      assert.ok(amazonEval);
      assert.equal(amazonEval.status, "UNAVAILABLE");
      assert.equal(amazonEval.opportunityScore, null);
    });
  });

  // --------------------------------------------------------------------------
  // 10. Zero-Fabrication Guarantees & Edge Cases
  // --------------------------------------------------------------------------
  describe("10. Zero-Fabrication Guarantees & Edge Cases", () => {
    it("23. preserves missing price as null without defaulting to 0", () => {
      const jsonLd = `
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "Custom Handmade Bowl"
        }
        </script>
      `;
      const blocks = extractJsonLdBlocks(jsonLd);
      const parsed = parseProductFromJsonLd(blocks);
      assert.ok(parsed);
      assert.equal(parsed.price, undefined);
    });

    it("24. preserves missing rating and review count as null", () => {
      const jsonLd = `
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "Custom Handmade Bowl",
          "offers": { "@type": "Offer", "price": "40.00" }
        }
        </script>
      `;
      const blocks = extractJsonLdBlocks(jsonLd);
      const parsed = parseProductFromJsonLd(blocks);
      assert.ok(parsed);
      assert.equal(parsed.ratingValue, undefined);
      assert.equal(parsed.reviewCount, undefined);
    });

    it("25. handles malformed HTML and broken JSON gracefully without crashing", () => {
      const brokenHtml = `<html><script type="application/ld+json">{ invalid json here ...`;
      const blocks = extractJsonLdBlocks(brokenHtml);
      assert.deepEqual(blocks, []);

      const parsed = parseProductFromJsonLd(blocks);
      assert.equal(parsed, null);
    });
  });

  // --------------------------------------------------------------------------
  // 11. Background Job Contracts & Rate Limiting
  // --------------------------------------------------------------------------
  describe("11. Background Job Contracts & Rate Limiting", () => {
    it("26. validates AcquisitionJobPayload structure for scheduled tasks", () => {
      const payload: import("@/marketplaces/core/acquisition").AcquisitionJobPayload = {
        jobId: "job-123",
        type: "SCHEDULED_NICHE_REFRESH",
        marketplace: "etsy",
        targetQuery: "ceramic mug",
        scheduledAt: new Date(),
      };

      assert.equal(payload.jobId, "job-123");
      assert.equal(payload.type, "SCHEDULED_NICHE_REFRESH");
      assert.equal(payload.marketplace, "etsy");
    });

    it("27. enforces per-domain token-bucket rate limiting", async () => {
      const limiter = new DomainRateLimiter({
        defaultRate: { maxRequestsPerSecond: 10, burstCapacity: 5, maxConcurrent: 2, minDelayMs: 10 },
      });

      const start = Date.now();
      await limiter.acquire("https://www.etsy.com/search");
      await limiter.acquire("https://www.etsy.com/search?page=2");
      const elapsed = Date.now() - start;

      assert.ok(elapsed >= 10, "Enforced minDelay between requests");
    });

    it("28. PublicPageFetcher supports cache clearing and cache bypass", async () => {
      const fetcher = new PublicPageFetcher();
      let networkCalls = 0;

      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        networkCalls++;
        return new Response("<html><body>Content</body></html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      };

      try {
        const url = "https://www.etsy.com/listing/999999";
        const r1 = await fetcher.fetchPage(url);
        assert.equal(r1.isCached, false);
        assert.equal(networkCalls, 1);

        const r2 = await fetcher.fetchPage(url);
        assert.equal(r2.isCached, true);
        assert.equal(networkCalls, 1);

        const r3 = await fetcher.fetchPage(url, { bypassCache: true });
        assert.equal(r3.isCached, false);
        assert.equal(networkCalls, 2);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
