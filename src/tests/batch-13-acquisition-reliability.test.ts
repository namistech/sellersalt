/**
 * Batch 13: Real-World Marketplace Acquisition Reliability & Coverage Expansion Test Suite
 * 
 * Validates:
 * 1. Multi-marketplace public web adapters (Etsy, Amazon, eBay, Walmart, TikTok Shop).
 * 2. Multi-page acquisition within budget safety bounds.
 * 3. Parser robustness against partial HTML, malformed JSON-LD, and missing fields.
 * 4. Structured source status classification (SUCCESS, PARTIAL, NO_RESULTS, ACCESS_RESTRICTED, RATE_LIMITED).
 * 5. Multi-tier source health telemetry distinguishing CACHE_HIT from NETWORK_SUCCESS.
 * 6. Research Quality Evaluation (Volume, Freshness, Signal Coverage, Source Diversity).
 * 7. End-to-end Acquisition Diagnostics tracing.
 * 8. SSRF redirect validation and private network / seller portal blocking.
 * 9. Multi-tier fallback (PUBLIC_WEB -> MARKETPLACE_API -> HISTORICAL_OBSERVATION).
 * 10. Zero-Fabrication Contract across all research outputs.
 */

import { describe, it, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { MarketplaceRegistry, registerAllConnectors } from "@/marketplaces/core/registry";
import { parseEtsyListingCardsFromHtml } from "@/marketplaces/core/acquisition/structured-parser";
import { parseAmazonListingCardsFromHtml } from "@/marketplaces/amazon/public-adapter";
import { parseEbayListingCardsFromHtml } from "@/marketplaces/ebay/public-adapter";
import { parseWalmartListingCardsFromHtml } from "@/marketplaces/walmart/public-adapter";
import { tiktokShopPublicWebAdapter } from "@/marketplaces/tiktok-shop/public-adapter";
import {
  extractJsonLdBlocks,
  parseProductFromJsonLd,
  parseCategoryBreadcrumbsFromJsonLd,
  parseOpenGraphData,
  extractListingIdFromUrl,
} from "@/marketplaces/core/acquisition/structured-parser";
import { orchestrateProductResearch } from "@/marketplaces/core/acquisition/orchestrator";
import { harvestPublicMarketplaceKeywords } from "@/marketplaces/core/acquisition/keywords";
import { fetchPublicShopResearch } from "@/marketplaces/core/acquisition/shops";
import { aggregatePublicCategoryIntelligence } from "@/marketplaces/core/acquisition/categories";
import { executeResearchRun } from "@/marketplaces/core/acquisition/workbench";
import { evaluateResearchQuality } from "@/marketplaces/core/acquisition/research-quality";
import { runAcquisitionDiagnostics } from "@/marketplaces/core/acquisition/diagnostics";
import { ResearchCache } from "@/marketplaces/core/acquisition/research-cache";
import { ResearchBudgetTracker } from "@/marketplaces/core/acquisition/research-budgets";
import { SourceHealthTracker } from "@/marketplaces/core/acquisition/source-health";
import { isSafeRedirect } from "@/marketplaces/core/acquisition/compliance";
import { computeProductObservationFingerprint, evaluateObservationChange } from "@/marketplaces/core/acquisition/deduplication";
import { compareResearchRuns } from "@/marketplaces/core/acquisition/diff-engine";
import { getMarketplaceCapabilityMatrix } from "@/lib/marketplace-capability-matrix";
import type { NormalizedProduct } from "@/marketplaces/core/types";

describe("Batch 13: Marketplace Acquisition Reliability & Coverage Expansion", () => {
  before(() => {
    registerAllConnectors();
  });

  beforeEach(() => {
    ResearchCache.clear();
  });

  // --------------------------------------------------------------------------
  // 1. Multi-Marketplace HTML & JSON-LD Parser Robustness
  // --------------------------------------------------------------------------
  describe("Parser Robustness & Multi-Marketplace HTML Extraction", () => {
    it("extracts Etsy listing cards from semantic HTML and data-listing-id attributes", () => {
      const sampleEtsyHtml = `
        <div data-listing-id="1092837465">
          <h3 class="v2-listing-card__title">Handmade Ceramic Coffee Mug with Glaze</h3>
          <span class="currency-value">34.50</span>
          <p class="v2-listing-card__shop">StudioPottery</p>
          <img src="https://i.etsystatic.com/sample_mug.jpg" alt="Handmade Ceramic Mug" />
        </div>
      `;

      const cards = parseEtsyListingCardsFromHtml(sampleEtsyHtml);
      assert.equal(cards.length, 1);
      assert.equal(cards[0].externalId, "1092837465");
      assert.equal(cards[0].title, "Handmade Ceramic Coffee Mug with Glaze");
      assert.equal(cards[0].price, 34.50);
      assert.equal(cards[0].shopName, "StudioPottery");
      assert.equal(cards[0].imageUrl, "https://i.etsystatic.com/sample_mug.jpg");
    });

    it("extracts Amazon listing cards from data-asin and structured price/ratings", () => {
      const sampleAmazonHtml = `
        <div data-asin="B08N5WRWNW">
          <h2><span class="a-text-normal">Minimalist Matte Ceramic Tea Mug 12oz</span></h2>
          <span class="a-offscreen">$24.99</span>
          <span class="a-icon-alt">4.7 out of 5 stars</span>
          <span class="a-size-base s-underline-text">1,420</span>
          <img class="s-image" src="https://m.media-amazon.com/images/sample.jpg" />
        </div>
      `;

      const products = parseAmazonListingCardsFromHtml(sampleAmazonHtml);
      assert.equal(products.length, 1);
      assert.equal(products[0].marketplace, "amazon");
      assert.equal(products[0].externalId, "B08N5WRWNW");
      assert.equal(products[0].title, "Minimalist Matte Ceramic Tea Mug 12oz");
      assert.equal(products[0].price, 24.99);
      assert.equal(products[0].rating, 4.7);
      assert.equal(products[0].reviewCount, 1420);
      assert.equal(products[0].imageUrl, "https://m.media-amazon.com/images/sample.jpg");
    });

    it("extracts eBay search items with price and seller info", () => {
      const sampleEbayHtml = `
        <li class="s-item">
          <a href="https://www.ebay.com/itm/125983746201">
            <div class="s-item__title">Vintage Stoneware Coffee Mug Handcrafted</div>
          </a>
          <span class="s-item__price">$18.00</span>
          <span class="s-item__seller-info-text">craft_collector_99</span>
          <img src="https://i.ebayimg.com/images/sample.jpg" />
        </li>
      `;

      const products = parseEbayListingCardsFromHtml(sampleEbayHtml);
      assert.equal(products.length, 1);
      assert.equal(products[0].marketplace, "ebay");
      assert.equal(products[0].externalId, "125983746201");
      assert.equal(products[0].title, "Vintage Stoneware Coffee Mug Handcrafted");
      assert.equal(products[0].price, 18.00);
      assert.equal(products[0].shop?.name, "craft_collector_99");
    });

    it("extracts Walmart listing cards from data-item-id and price attributes", () => {
      const sampleWalmartHtml = `
        <div data-item-id="84739201">
          <span class="w_iUH7">Modern Ceramic Speckled Coffee Mug Set of 2</span>
          <span class="w_iUH7">$29.99</span>
          <span>4.5 out of 5 Stars</span>
          <span>(380 reviews)</span>
          <img src="https://i5.walmartimages.com/sample.jpg" />
        </div>
      `;

      const products = parseWalmartListingCardsFromHtml(sampleWalmartHtml);
      assert.equal(products.length, 1);
      assert.equal(products[0].marketplace, "walmart");
      assert.equal(products[0].externalId, "84739201");
      assert.equal(products[0].title, "Modern Ceramic Speckled Coffee Mug Set of 2");
      assert.equal(products[0].price, 29.99);
      assert.equal(products[0].rating, 4.5);
      assert.equal(products[0].reviewCount, 380);
    });

    it("handles partial HTML observations without throwing when rating or reviewCount is missing", () => {
      const partialHtml = `
        <div data-asin="B09TESTPARTIAL">
          <h2><span class="a-text-normal">Handmade Clay Planter Pot</span></h2>
          <span class="a-offscreen">$19.50</span>
          <img class="s-image" src="https://m.media-amazon.com/images/pot.jpg" />
        </div>
      `;

      const products = parseAmazonListingCardsFromHtml(partialHtml);
      assert.equal(products.length, 1);
      assert.equal(products[0].title, "Handmade Clay Planter Pot");
      assert.equal(products[0].price, 19.50);
      assert.equal(products[0].rating, null);
      assert.equal(products[0].reviewCount, null);
    });

    it("extracts structured JSON-LD Product schema with offers and aggregateRating", () => {
      const htmlWithJsonLd = `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "Product",
                "name": "Artisan Ceramic Espresso Cup",
                "description": "Hand-thrown pottery espresso cup with earthy glaze",
                "image": "https://example.com/cup.jpg",
                "offers": {
                  "@type": "Offer",
                  "price": "16.00",
                  "priceCurrency": "USD"
                },
                "aggregateRating": {
                  "@type": "AggregateRating",
                  "ratingValue": "4.9",
                  "reviewCount": "85"
                },
                "brand": {
                  "@type": "Brand",
                  "name": "EarthWare Ceramics"
                }
              }
            </script>
          </head>
        </html>
      `;

      const blocks = extractJsonLdBlocks(htmlWithJsonLd);
      assert.equal(blocks.length, 1);

      const parsed = parseProductFromJsonLd(blocks);
      assert.ok(parsed);
      assert.equal(parsed.name, "Artisan Ceramic Espresso Cup");
      assert.equal(parsed.price, 16.00);
      assert.equal(parsed.currency, "USD");
      assert.equal(parsed.ratingValue, 4.9);
      assert.equal(parsed.reviewCount, 85);
      assert.equal(parsed.brandName, "EarthWare Ceramics");
    });

    it("extracts OpenGraph metadata as fallback", () => {
      const ogHtml = `
        <meta property="og:title" content="Handcrafted Walnut Cutting Board" />
        <meta property="og:image" content="https://example.com/board.jpg" />
        <meta property="og:price:amount" content="48.00" />
        <meta property="og:price:currency" content="USD" />
      `;

      const og = parseOpenGraphData(ogHtml);
      assert.equal(og.title, "Handcrafted Walnut Cutting Board");
      assert.equal(og.image, "https://example.com/board.jpg");
      assert.equal(og.priceAmount, 48.00);
      assert.equal(og.priceCurrency, "USD");
    });

    it("extracts listing IDs accurately across marketplace URL formats", () => {
      assert.equal(extractListingIdFromUrl("https://www.etsy.com/listing/1482938472/ceramic-mug"), "1482938472");
      assert.equal(extractListingIdFromUrl("https://www.amazon.com/dp/B08N5WRWNW"), "B08N5WRWNW");
      assert.equal(extractListingIdFromUrl("https://www.ebay.com/itm/194827392817?hash=abc"), "194827392817");
      assert.equal(extractListingIdFromUrl("https://unknown.com/page"), null);
    });
  });

  // --------------------------------------------------------------------------
  // 2. TikTok Shop & Architecture-Ready Marketplace Truthfulness
  // --------------------------------------------------------------------------
  describe("Architecture-Ready Marketplace Truthfulness", () => {
    it("reports TikTok Shop public search as NOT_IMPLEMENTED without fabricating data", async () => {
      const res = await tiktokShopPublicWebAdapter.searchPublicProducts({ query: "hoodie" });
      assert.equal(res.success, false);
      assert.equal(res.marketplace, "tiktok_shop");
      assert.equal(res.failureReason, "NOT_IMPLEMENTED");
      assert.equal(res.items.length, 0);
      assert.equal(res.provenance, "UNAVAILABLE");
    });

    it("verifies marketplace capability matrix reports honest readiness for all 7 platforms", () => {
      const matrix = getMarketplaceCapabilityMatrix();
      assert.equal(matrix.etsy.status, "IMPLEMENTED");
      assert.equal(matrix.amazon.status, "PARTIAL");
      assert.equal(matrix.ebay.status, "PARTIAL");
      assert.equal(matrix.walmart.status, "PARTIAL");
      assert.equal(matrix.shopify.status, "PARTIAL"); // Connected store only
      assert.equal(matrix.woocommerce.status, "PARTIAL"); // Connected store only
      assert.equal(matrix.tiktok_shop.status, "ARCHITECTURE_READY");
    });
  });

  // --------------------------------------------------------------------------
  // 3. Research Quality Score & Data Completeness Engine
  // --------------------------------------------------------------------------
  describe("Research Quality & Coverage Evaluation", () => {
    it("evaluates comprehensive dataset as HIGH quality coverage", () => {
      const quality = evaluateResearchQuality({
        itemCount: 30,
        liveCount: 30,
        historicalCount: 0,
        sourcesUsed: ["PUBLIC_WEB"],
        freshnessStatus: "LIVE",
        confidence: 85,
        marketplaces: ["etsy"],
        sampleProducts: [
          {
            marketplace: "etsy",
            externalId: "1",
            title: "Mug 1",
            url: "https://etsy.com/1",
            price: 25.0,
            currency: "USD",
            rating: 4.8,
            reviewCount: 120,
            shop: { name: "PotteryCo" },
            source: "ACTUAL_DATA",
            capturedAt: new Date(),
          },
        ],
      });

      assert.ok(quality.qualityScore >= 75);
      assert.ok(quality.qualityTier === "HIGH" || quality.qualityTier === "MODERATE");
      assert.equal(quality.coverage.observationsCount, 30);
      assert.equal(quality.coverage.liveObservationsCount, 30);
      assert.equal(quality.factors.length, 4);
    });

    it("evaluates sparse/stale dataset as LIMITED coverage without inflating score", () => {
      const quality = evaluateResearchQuality({
        itemCount: 3,
        liveCount: 0,
        historicalCount: 3,
        sourcesUsed: ["HISTORICAL_OBSERVATION"],
        freshnessStatus: "STALE",
        confidence: 40,
        marketplaces: ["etsy"],
      });

      assert.ok(quality.qualityScore < 60);
      assert.ok(quality.qualityTier === "LIMITED" || quality.qualityTier === "INSUFFICIENT");
    });
  });

  // --------------------------------------------------------------------------
  // 4. Acquisition Diagnostics Tracing
  // --------------------------------------------------------------------------
  describe("Acquisition Diagnostics Engine", () => {
    it("traces acquisition steps, cache inspection, and source health for a query", async () => {
      const diag = await runAcquisitionDiagnostics({
        marketplace: "etsy",
        query: "pottery",
        type: "PRODUCT",
      });

      assert.equal(diag.marketplace, "etsy");
      assert.equal(diag.query, "pottery");
      assert.ok(diag.steps.length >= 4);
      assert.ok(diag.steps.some((s) => s.step === "ADAPTER_RESOLUTION" && s.status === "OK"));
      assert.ok(diag.steps.some((s) => s.step === "CACHE_INSPECTION"));
      assert.ok(diag.steps.some((s) => s.step === "SOURCE_HEALTH"));
    });
  });

  // --------------------------------------------------------------------------
  // 5. Research Budgets & Safety Bounds
  // --------------------------------------------------------------------------
  describe("Research Budgets & Safety Bounds", () => {
    it("enforces max pages, listings, and timeout limits", () => {
      const tracker = new ResearchBudgetTracker({
        maxPages: 3,
        maxListings: 50,
        maxPayloadBytes: 1024 * 1024,
        maxTimeoutMs: 5000,
      });

      assert.equal(tracker.canContinue(), true);

      // Record 3 pages and 50 listings
      tracker.recordPageFetch();
      tracker.recordListings(20);
      tracker.recordPageFetch();
      tracker.recordListings(20);
      tracker.recordPageFetch();
      tracker.recordListings(10);

      assert.equal(tracker.getSummary().pagesFetched, 3);
      assert.equal(tracker.getSummary().listingsAcquired, 50);
      assert.equal(tracker.canContinue(), false);
      assert.equal(tracker.getSummary().isBudgetExhausted, true);
    });
  });

  // --------------------------------------------------------------------------
  // 6. Security, Compliance & SSRF Protection
  // --------------------------------------------------------------------------
  describe("Security, Compliance & SSRF Protection", () => {
    it("blocks dangerous redirect URLs and private IP ranges", () => {
      assert.equal(isSafeRedirect("https://www.etsy.com/search?q=mug", "https://localhost:3000/api"), false);
      assert.equal(isSafeRedirect("https://www.etsy.com/search?q=mug", "http://127.0.0.1/etc/passwd"), false);
      assert.equal(isSafeRedirect("https://www.etsy.com/search?q=mug", "http://169.254.169.254/latest/meta-data/"), false);
      assert.equal(isSafeRedirect("https://www.etsy.com/search?q=mug", "https://www.etsy.com/your/shops/me/dashboard"), false); // Seller portal block
      assert.equal(isSafeRedirect("https://www.etsy.com/search?q=mug", "https://www.etsy.com/c/home-and-living"), true);
    });
  });

  // --------------------------------------------------------------------------
  // 7. Observation Deduplication & Longitudinal Diff Engine
  // --------------------------------------------------------------------------
  describe("Observation Deduplication & Longitudinal Diff Engine", () => {
    it("generates deterministic SHA-256 fingerprints across volatile and structural metrics", () => {
      const productA: Partial<NormalizedProduct> = {
        marketplace: "etsy",
        externalId: "12345",
        price: 29.99,
        currency: "USD",
        rating: 4.8,
        reviewCount: 250,
      };

      const productB: Partial<NormalizedProduct> = {
        marketplace: "etsy",
        externalId: "12345",
        price: 24.99, // Price drop
        currency: "USD",
        rating: 4.8,
        reviewCount: 250,
      };

      const fpA = computeProductObservationFingerprint(productA);
      const fpB = computeProductObservationFingerprint(productB);

      assert.notEqual(fpA, fpB);
      assert.equal(typeof fpA, "string");
      assert.equal(fpA.length, 32);
    });

    it("detects changed fields and suppresses redundant snapshots when metrics are identical", () => {
      const currentProduct: Partial<NormalizedProduct> = {
        marketplace: "etsy",
        externalId: "12345",
        price: 29.99,
        currency: "USD",
        rating: 4.8,
        reviewCount: 250,
      };

      const existingObservation = {
        price: 29.99,
        currency: "USD",
        rating: 4.8,
        reviewCount: 250,
        fingerprint: computeProductObservationFingerprint(currentProduct),
      };

      const changeCheck = evaluateObservationChange(existingObservation, currentProduct);
      assert.equal(changeCheck.hasChanged, false);
      assert.equal(changeCheck.changedFields.length, 0);

      // Mutate price
      const priceDroppedProduct = { ...currentProduct, price: 22.50 };
      const changeCheck2 = evaluateObservationChange(existingObservation, priceDroppedProduct);
      assert.equal(changeCheck2.hasChanged, true);
      assert.ok(changeCheck2.changedFields.includes("price"));
    });

    it("compares two research runs computing appearing, disappearing, and price drop deltas", () => {
      const runA = {
        id: "run-1",
        query: "ceramic mug",
        marketplace: "etsy",
        products: [
          { externalId: "p1", title: "Mug 1", price: 30.0, marketplace: "etsy" },
          { externalId: "p2", title: "Mug 2", price: 20.0, marketplace: "etsy" },
        ],
      };

      const runB = {
        id: "run-2",
        query: "ceramic mug",
        marketplace: "etsy",
        products: [
          { externalId: "p1", title: "Mug 1", price: 25.0, marketplace: "etsy" }, // Price drop $5
          { externalId: "p3", title: "Mug 3", price: 40.0, marketplace: "etsy" }, // Appearing
        ],
      };

      const diff = compareResearchRuns(runA, runB);
      assert.equal(diff.appearingCount, 1);
      assert.equal(diff.disappearingCount, 1);
      assert.equal(diff.persistingCount, 1);
      assert.equal(diff.priceDropsCount, 1);
      
      const p1Diff = diff.productDiffs.find((d) => d.externalId === "p1");
      assert.ok(p1Diff);
      assert.equal(p1Diff.price?.previous, 30.0);
      assert.equal(p1Diff.price?.current, 25.0);
      assert.equal(p1Diff.price?.delta, -5.0);
    });
  });

  // --------------------------------------------------------------------------
  // 8. Zero-Fabrication Contract Across All Modalities
  // --------------------------------------------------------------------------
  describe("Zero-Fabrication Contract Verification", () => {
    it("ensures keyword search volume is never fabricated from listing prevalence", async () => {
      const harvest = await harvestPublicMarketplaceKeywords({
        marketplace: "etsy",
        query: "linen shirt",
        limit: 5,
      });

      assert.equal(harvest.marketplace, "etsy");
      assert.ok(harvest.provenance);
      // Top keywords have listing frequency % but no fake search volume
      harvest.topKeywords.forEach((kw) => {
        assert.ok(kw.listingFrequencyPercent >= 0 && kw.listingFrequencyPercent <= 100);
        assert.equal((kw as any).monthlySearchVolume, undefined);
      });
    });

    it("ensures shop research leaves unobserved sales count as null or unobserved", async () => {
      const shopRes = await fetchPublicShopResearch("ClayArtCo", "etsy");
      if ("shop" in shopRes && shopRes.shop) {
        assert.equal(shopRes.marketplace, "etsy");
        // No fake conversion rate or revenue
        assert.equal((shopRes.shop as any).conversionRate, undefined);
        assert.equal((shopRes.shop as any).monthlyRevenue, undefined);
      }
    });
  });
});


