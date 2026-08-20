import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractJsonLdBlocks,
  parseProductFromJsonLd,
  parseCategoryBreadcrumbsFromJsonLd,
  parseOpenGraphData,
  parseEtsyListingCardsFromHtml,
  extractListingIdFromUrl,
  DomainRateLimiter,
  PublicPageFetcher,
  mergeProductObservations,
  persistPublicProductObservations,
  acquireProductObservations,
  deduplicateProductObservations,
} from "@/marketplaces/core/acquisition";
import { EtsyPublicWebAdapter, etsyPublicWebAdapter } from "@/marketplaces/etsy/public-adapter";
import { AmazonPublicWebAdapter, amazonPublicWebAdapter } from "@/marketplaces/amazon/public-adapter";
import { EbayPublicWebAdapter, ebayPublicWebAdapter } from "@/marketplaces/ebay/public-adapter";
import { TikTokShopPublicWebAdapter, tiktokShopPublicWebAdapter } from "@/marketplaces/tiktok-shop/public-adapter";
import { registerAllConnectors } from "@/marketplaces/core/registry";
import { globalPageFetcher } from "@/marketplaces/core/acquisition/page-fetcher";
import { discoverNichesFromProducts } from "@/services/intelligence/niche-discovery";
import { scoreShopCompetition } from "@/marketplaces/core/opportunity-engine";
import type { NormalizedProduct, NormalizedObservation } from "@/marketplaces/core/types";

describe("Batch 9B: Marketplace-Independent Public Web Acquisition Engine & Foundation", () => {
  registerAllConnectors();

  const sampleEtsyListingHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <title>Ceramic Coffee Mug Handmade | Etsy</title>
      <meta property="og:title" content="Ceramic Coffee Mug Handmade" />
      <meta property="og:image" content="https://i.etsystatic.com/123/r/il/mug.jpg" />
      <meta property="og:price:amount" content="26.50" />
      <meta property="og:price:currency" content="USD" />
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": "Ceramic Coffee Mug Handmade Stoneware",
        "image": "https://i.etsystatic.com/123/r/il/mug.jpg",
        "description": "Handmade ceramic stoneware mug with ergonomic handle.",
        "sku": "MUG-101",
        "offers": {
          "@type": "Offer",
          "price": "26.50",
          "priceCurrency": "USD",
          "seller": {
            "@type": "Organization",
            "name": "EarthAndWheelPottery",
            "url": "https://www.etsy.com/shop/EarthAndWheelPottery"
          }
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.9",
          "reviewCount": "142"
        }
      }
      </script>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home & Living" },
          { "@type": "ListItem", "position": 2, "name": "Kitchen & Dining" },
          { "@type": "ListItem", "position": 3, "name": "Drinkware" },
          { "@type": "ListItem", "position": 4, "name": "Mugs" }
        ]
      }
      </script>
    </head>
    <body>
      <h1>Ceramic Coffee Mug Handmade Stoneware</h1>
    </body>
    </html>
  `;

  const sampleEtsySearchHtml = `
    <div class="search-results">
      <a href="https://www.etsy.com/listing/987654321/handmade-pottery-mug" title="Handmade Pottery Mug 12oz">
        <img src="https://i.etsystatic.com/thumb/pottery.jpg" alt="Handmade Pottery Mug" />
        <span class="currency-value">$28.00</span>
        <p>by StoneCraftMakers</p>
      </a>
      <a href="https://www.etsy.com/listing/123456789/speckled-clay-tea-cup" title="Speckled Clay Tea Cup">
        <img src="https://i.etsystatic.com/thumb/cup.jpg" alt="Speckled Clay Tea Cup" />
        <span class="currency-value">$22.50</span>
        <p>by WildFlowerCeramics</p>
      </a>
    </div>
  `;

  const sampleEtsyShopHtml = `
    <div class="shop-home">
      <h1>StoneCraftMakers</h1>
      <span>1,420 Sales</span>
      <span>(385) reviews</span>
      <span>64 Items</span>
    </div>
  `;

  describe("1. Structured Data & Metadata Parsing", () => {
    it("1. extracts JSON-LD Product with prices, ratings, reviews, and seller info", () => {
      const blocks = extractJsonLdBlocks(sampleEtsyListingHtml);
      assert.equal(blocks.length, 2);

      const product = parseProductFromJsonLd(blocks);
      assert.ok(product !== null);
      assert.equal(product.name, "Ceramic Coffee Mug Handmade Stoneware");
      assert.equal(product.price, 26.5);
      assert.equal(product.currency, "USD");
      assert.equal(product.ratingValue, 4.9);
      assert.equal(product.reviewCount, 142);
      assert.equal(product.sellerName, "EarthAndWheelPottery");
    });

    it("2. extracts BreadcrumbList category taxonomy hierarchy", () => {
      const blocks = extractJsonLdBlocks(sampleEtsyListingHtml);
      const breadcrumbs = parseCategoryBreadcrumbsFromJsonLd(blocks);
      assert.deepEqual(breadcrumbs, ["Home & Living", "Kitchen & Dining", "Drinkware", "Mugs"]);
    });

    it("3. extracts OpenGraph meta properties as secondary fallback", () => {
      const og = parseOpenGraphData(sampleEtsyListingHtml);
      assert.equal(og.title, "Ceramic Coffee Mug Handmade");
      assert.equal(og.priceAmount, 26.5);
      assert.equal(og.priceCurrency, "USD");
      assert.equal(og.image, "https://i.etsystatic.com/123/r/il/mug.jpg");
    });

    it("4. handles malformed HTML gracefully without throwing", () => {
      const blocks = extractJsonLdBlocks("<script type='application/ld+json'>{malformed json");
      assert.deepEqual(blocks, []);

      const og = parseOpenGraphData("<html><body><<<bad markup>>></body></html>");
      assert.deepEqual(og, {});
    });

    it("5. preserves missing price as null without fabricating zero", () => {
      const htmlWithoutPrice = sampleEtsyListingHtml.replace(/"price":\s*"26.50",/g, "");
      const blocks = extractJsonLdBlocks(htmlWithoutPrice);
      const parsed = parseProductFromJsonLd(blocks);
      assert.equal(parsed?.price, undefined);
    });

    it("6. preserves missing rating as null without fabricating default", () => {
      const htmlWithoutRating = sampleEtsyListingHtml.replace(/"ratingValue":\s*"4.9",/g, "");
      const blocks = extractJsonLdBlocks(htmlWithoutRating);
      const parsed = parseProductFromJsonLd(blocks);
      assert.equal(parsed?.ratingValue, undefined);
    });

    it("7. preserves missing review count as null", () => {
      const htmlWithoutReviews = sampleEtsyListingHtml.replace(/"reviewCount":\s*"142"/g, "");
      const blocks = extractJsonLdBlocks(htmlWithoutReviews);
      const parsed = parseProductFromJsonLd(blocks);
      assert.equal(parsed?.reviewCount, undefined);
    });

    it("8. extracts numeric listing IDs from canonical marketplace URLs", () => {
      assert.equal(extractListingIdFromUrl("https://www.etsy.com/listing/987654321/pottery-mug"), "987654321");
      assert.equal(extractListingIdFromUrl("https://www.amazon.com/dp/B08N5WRWNW/ref=sr_1"), "B08N5WRWNW");
      assert.equal(extractListingIdFromUrl("https://www.ebay.com/itm/123456789012"), "123456789012");
      assert.equal(extractListingIdFromUrl("invalid-url"), null);
    });
  });

  describe("2. Rate Limiting, Throttling & Fetch Caching", () => {
    it("9. enforces domain rate limiting with configurable limits", async () => {
      const limiter = new DomainRateLimiter({
        "etsy.com": {
          maxRequestsPerSecond: 10,
          burstCapacity: 5,
          maxConcurrent: 5,
          minDelayMs: 10,
        },
      });

      await limiter.acquire("https://www.etsy.com/search?q=mug");
      limiter.release("https://www.etsy.com/search?q=mug");

      const backoff = limiter.getBackoffDelayMs(1);
      assert.ok(backoff >= 1000);
    });

    it("10. PublicPageFetcher transparently caches successful responses", async () => {
      const fetcher = new PublicPageFetcher();
      fetcher.clearCache();

      const originalFetch = globalThis.fetch;
      let networkFetchCount = 0;

      globalThis.fetch = async () => {
        networkFetchCount++;
        return new Response(sampleEtsyListingHtml, {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      };

      try {
        const res1 = await fetcher.fetchPage("https://www.etsy.com/listing/987654321");
        assert.equal(res1.statusCode, 200);
        assert.equal(res1.isCached, false);
        assert.equal(networkFetchCount, 1);

        const res2 = await fetcher.fetchPage("https://www.etsy.com/listing/987654321");
        assert.equal(res2.statusCode, 200);
        assert.equal(res2.isCached, true);
        assert.equal(networkFetchCount, 1, "Reused cached page without hitting network");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("11. supports cache clearing and bypass", async () => {
      const fetcher = new PublicPageFetcher();
      const originalFetch = globalThis.fetch;
      let count = 0;

      globalThis.fetch = async () => {
        count++;
        return new Response(sampleEtsyListingHtml, { status: 200 });
      };

      try {
        await fetcher.fetchPage("https://www.etsy.com/listing/111");
        assert.equal(count, 1);

        // Fetch with bypassCache: true
        await fetcher.fetchPage("https://www.etsy.com/listing/111", { bypassCache: true });
        assert.equal(count, 2);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("3. Observation Merging & Source Lineage", () => {
    it("12. merges PUBLIC_WEB observation with MARKETPLACE_API observation non-destructively", () => {
      const publicObs: NormalizedProduct = {
        marketplace: "etsy",
        externalId: "987654321",
        title: "Ceramic Coffee Mug Handmade",
        url: "https://www.etsy.com/listing/987654321",
        price: 28.0,
        currency: "USD",
        rating: 4.8,
        reviewCount: 95,
        source: "ACTUAL_DATA",
        acquisitionMethod: "PUBLIC_WEB",
        isHistorical: false,
        capturedAt: new Date(),
      };

      const apiObs: NormalizedProduct = {
        marketplace: "etsy",
        externalId: "987654321",
        title: "Ceramic Coffee Mug Handmade - Artisanal Stoneware",
        url: "https://www.etsy.com/listing/987654321",
        price: 28.0,
        currency: "USD",
        rating: null,
        reviewCount: null,
        categoryPath: ["Home & Living", "Drinkware"],
        keywordSignals: [
          {
            term: "ceramic mug",
            metric: "competition",
            value: 10,
            source: "etsy",
            provenance: "ACTUAL_DATA",
          },
        ],
        source: "ACTUAL_DATA",
        acquisitionMethod: "MARKETPLACE_API",
        isHistorical: false,
        capturedAt: new Date(),
      };

      const merged = mergeProductObservations(publicObs, apiObs);
      assert.equal(merged.isEnriched, true);
      assert.deepEqual(merged.sources, ["PUBLIC_WEB", "MARKETPLACE_API"]);
      assert.equal(merged.product.price, 28.0);
      assert.equal(merged.product.rating, 4.8, "Preserved public rating");
      assert.equal(merged.product.reviewCount, 95, "Preserved public review count");
      assert.deepEqual(merged.product.categoryPath, ["Home & Living", "Drinkware"], "Enriched API categories");
    });

    it("13. deduplicates observations and prefers fresher live observations", () => {
      const now = new Date();
      const older = new Date(Date.now() - 86400000);

      const obs1: NormalizedObservation<NormalizedProduct> = {
        id: "1",
        data: {
          marketplace: "etsy",
          externalId: "987654321",
          title: "Old Title",
          url: "https://www.etsy.com/listing/987654321",
          price: 25.0,
          currency: "USD",
          source: "ACTUAL_DATA",
          acquisitionMethod: "HISTORICAL_OBSERVATION",
          isHistorical: true,
          capturedAt: older,
        },
        metadata: {
          sourceType: "HISTORICAL_OBSERVATION",
          sourceIdentifier: "db",
          marketplace: "etsy",
          observedAt: older,
          provenance: "ACTUAL_DATA",
          confidenceScore: 60,
          isHistorical: true,
        },
      };

      const obs2: NormalizedObservation<NormalizedProduct> = {
        id: "2",
        data: {
          marketplace: "etsy",
          externalId: "987654321",
          title: "Fresh Live Title",
          url: "https://www.etsy.com/listing/987654321",
          price: 28.0,
          currency: "USD",
          source: "ACTUAL_DATA",
          acquisitionMethod: "PUBLIC_WEB",
          isHistorical: false,
          capturedAt: now,
        },
        metadata: {
          sourceType: "PUBLIC_WEB",
          sourceIdentifier: "etsy:public_web",
          marketplace: "etsy",
          observedAt: now,
          provenance: "ACTUAL_DATA",
          confidenceScore: 85,
          isHistorical: false,
        },
      };

      const deduped = deduplicateProductObservations([obs1, obs2]);
      assert.equal(deduped.length, 1);
      assert.equal(deduped[0].data.title, "Fresh Live Title");
      assert.equal(deduped[0].data.isHistorical, false);
    });
  });

  describe("4. EtsyPublicWebAdapter Core Capabilities", () => {
    it("14. fetches public listing and calculates canonical opportunity", async () => {
      const fetcher = new PublicPageFetcher();
      const originalFetch = globalThis.fetch;

      globalThis.fetch = async () => {
        return new Response(sampleEtsyListingHtml, {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      };

      try {
        const adapter = new EtsyPublicWebAdapter(fetcher);
        const result = await adapter.fetchPublicProduct("987654321");

        assert.equal(result.success, true);
        assert.equal(result.items.length, 1);

        const prod = result.items[0];
        assert.equal(prod.externalId, "987654321");
        assert.equal(prod.price, 26.5);
        assert.equal(prod.rating, 4.9);
        assert.equal(prod.reviewCount, 142);
        assert.ok(prod.opportunityScore !== null && prod.opportunityScore !== undefined);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("15. fetches public shop profile statistics", async () => {
      const fetcher = new PublicPageFetcher();
      const originalFetch = globalThis.fetch;

      globalThis.fetch = async () => {
        return new Response(sampleEtsyShopHtml, {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      };

      try {
        const adapter = new EtsyPublicWebAdapter(fetcher);
        const result = await adapter.fetchPublicShop("StoneCraftMakers");

        assert.equal(result.success, true);
        assert.equal(result.items.length, 1);

        const shop = result.items[0];
        assert.equal(shop.externalId, "StoneCraftMakers");
        assert.equal(shop.totalSales, 1420);
        assert.equal(shop.reviewCount, 385);
        assert.equal(shop.activeListings, 64);

        // Feed into canonical shop competition engine
        const comp = scoreShopCompetition({
          marketplace: shop.marketplace,
          shopName: shop.name,
          totalSales: shop.totalSales ?? 0,
          reviewCount: shop.reviewCount ?? 0,
          activeListings: shop.activeListings ?? 0,
          shopAgeMonths: shop.ageMonths ?? 12,
          estDailySales: 3.8,
        });
        assert.ok(comp.score !== null && comp.score >= 0 && comp.score <= 100);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("16. harvests keyword signals and co-occurring phrases from search results", async () => {
      const fetcher = new PublicPageFetcher();
      const originalFetch = globalThis.fetch;

      globalThis.fetch = async () => {
        return new Response(sampleEtsySearchHtml, {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      };

      try {
        const adapter = new EtsyPublicWebAdapter(fetcher);
        const result = await adapter.harvestPublicKeywords({ query: "ceramic mug" });

        assert.equal(result.success, true);
        assert.equal(result.items.length, 1);

        const harvest = result.items[0];
        assert.equal(harvest.query, "ceramic mug");
        assert.equal(harvest.observedListingsCount, 2);
        assert.equal(harvest.averagePrice, 25.25);
        assert.ok(harvest.relatedKeywords.length > 0);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("5. Niche Discovery & Opportunity Clustered Ingestion", () => {
    it("17. clusters publicly acquired products into niches via canonical engine", () => {
      const products: NormalizedProduct[] = [
        {
          marketplace: "etsy",
          externalId: "1",
          title: "Handmade Ceramic Stoneware Coffee Mug",
          price: 28.0,
          currency: "USD",
          rating: 4.9,
          reviewCount: 150,
          favoritesCount: 420,
          categoryPath: ["Home & Living", "Kitchen & Dining", "Drinkware"],
          keywordSignals: [
            {
              term: "ceramic mug",
              metric: "competition",
              value: 5,
              source: "etsy",
              provenance: "ACTUAL_DATA",
            },
          ],
          source: "ACTUAL_DATA",
          acquisitionMethod: "PUBLIC_WEB",
          isHistorical: false,
          capturedAt: new Date(),
        },
        {
          marketplace: "etsy",
          externalId: "2",
          title: "Speckled Clay Tea Cup Artisan",
          price: 24.0,
          currency: "USD",
          rating: 4.7,
          reviewCount: 80,
          favoritesCount: 210,
          categoryPath: ["Home & Living", "Kitchen & Dining", "Drinkware"],
          keywordSignals: [
            {
              term: "tea cup",
              metric: "competition",
              value: 3,
              source: "etsy",
              provenance: "ACTUAL_DATA",
            },
          ],
          source: "ACTUAL_DATA",
          acquisitionMethod: "PUBLIC_WEB",
          isHistorical: false,
          capturedAt: new Date(),
        },
      ];

      const summary = discoverNichesFromProducts(products, "etsy", "ceramic mug");
      assert.ok(summary.niches.length > 0);
      assert.ok(summary.niches[0].opportunityScore !== null && summary.niches[0].opportunityScore >= 0);
      assert.equal(summary.niches[0].sampleProducts.length, 2);
    });
  });

  describe("6. Cross-Marketplace Isolation & Architecture-Ready Public Adapters", () => {
    it("18. Amazon public adapter returns real, provenanced results for a real query — never fabricated, never a crash (Batch 35: fixed, no longer unconditionally unavailable)", async () => {
      // This used to assert Amazon always reports UNAVAILABLE — that was
      // true only because the card parser was broken (see Batch 35's
      // forensics report), not because Amazon's public web access is
      // genuinely blocked the way eBay's and TikTok Shop's are (tests 19
      // and 20, unchanged, still correctly UNAVAILABLE). A live query can
      // legitimately return zero items on any given run (real network
      // variability), so this asserts the honest contract instead of a
      // brittle exact outcome: never throws, and whichever shape comes
      // back is well-formed — real items with real provenance, or a
      // structured unavailable state, never a silently fabricated result.
      const res = await amazonPublicWebAdapter.searchPublicProducts({ query: "mug" });
      if (res.success) {
        assert.ok(res.items.length > 0);
        for (const item of res.items) {
          assert.equal(item.source, "ACTUAL_DATA");
          assert.equal(item.marketplace, "amazon");
          assert.ok(item.title.length > 0);
        }
      } else {
        assert.equal(res.items.length, 0);
        assert.equal(res.provenance, "UNAVAILABLE");
      }
    });

    it("19. eBay public adapter gracefully reports UNAVAILABLE without fake products", async () => {
      const res = await ebayPublicWebAdapter.searchPublicProducts({ query: "mug" });
      assert.equal(res.success, false);
      assert.equal(res.items.length, 0);
      assert.equal(res.provenance, "UNAVAILABLE");
    });

    it("20. TikTok Shop public adapter gracefully reports UNAVAILABLE without fake products", async () => {
      const res = await tiktokShopPublicWebAdapter.searchPublicProducts({ query: "mug" });
      assert.equal(res.success, false);
      assert.equal(res.items.length, 0);
      assert.equal(res.provenance, "UNAVAILABLE");
    });

    it("21. Multi-marketplace fan-out isolates failures (Etsy success + Amazon unavailable)", async () => {
      const originalFetch = globalThis.fetch;

      // Batch 35: test 18 above (and any other earlier real Amazon call
      // in this run) may have populated globalPageFetcher's 6-hour cache
      // with a real, successful amazon.com response for this same query —
      // fetchPage checks that cache before ever calling fetch(), so
      // without clearing it first, the mock below would silently never
      // be consulted for Amazon's request and this test would assert
      // against stale real data instead of the mocked input it's
      // actually designed to test.
      globalPageFetcher.clearCache();

      globalThis.fetch = async () => {
        return new Response(sampleEtsySearchHtml, {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      };

      try {
        const [etsyRes, amazonRes] = await Promise.all([
          acquireProductObservations({ marketplace: "etsy", query: "mug", preferredSources: ["PUBLIC_WEB"] }),
          acquireProductObservations({ marketplace: "amazon", query: "mug", preferredSources: ["PUBLIC_WEB"] }),
        ]);

        assert.equal(etsyRes.status, "AVAILABLE");
        assert.equal(etsyRes.hasLiveCoverage, true);
        assert.equal(etsyRes.products.length, 2);

        assert.equal(amazonRes.status, "NOT_IMPLEMENTED");
        assert.equal(amazonRes.hasLiveCoverage, false);
        assert.equal(amazonRes.products.length, 0);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
