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
} from "@/marketplaces/core/acquisition";
import { EtsyPublicWebAdapter } from "@/marketplaces/etsy/public-adapter";
import { acquireProductObservations } from "@/marketplaces/core/acquisition";
import { registerAllConnectors } from "@/marketplaces/core/registry";
import {
  evaluateCanonicalOpportunity,
  extractOpportunityInputFromNormalizedProduct,
} from "@/services/intelligence/canonical-opportunity";
import type { NormalizedProduct } from "@/marketplaces/core/types";

describe("Batch 9B: Marketplace-Independent Public Web Data Acquisition Engine", () => {
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

  describe("1. Structured Data & Metadata Parsing", () => {
    it("extracts JSON-LD Product with prices, ratings, reviews, and seller info", () => {
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
      assert.equal(product.sellerUrl, "https://www.etsy.com/shop/EarthAndWheelPottery");
    });

    it("extracts BreadcrumbList category taxonomy hierarchy", () => {
      const blocks = extractJsonLdBlocks(sampleEtsyListingHtml);
      const breadcrumbs = parseCategoryBreadcrumbsFromJsonLd(blocks);

      assert.deepEqual(breadcrumbs, ["Home & Living", "Kitchen & Dining", "Drinkware", "Mugs"]);
    });

    it("extracts OpenGraph meta properties as secondary fallback", () => {
      const og = parseOpenGraphData(sampleEtsyListingHtml);

      assert.equal(og.title, "Ceramic Coffee Mug Handmade");
      assert.equal(og.priceAmount, 26.5);
      assert.equal(og.priceCurrency, "USD");
      assert.equal(og.image, "https://i.etsystatic.com/123/r/il/mug.jpg");
    });

    it("extracts numeric listing IDs from canonical marketplace URLs", () => {
      assert.equal(extractListingIdFromUrl("https://www.etsy.com/listing/987654321/pottery-mug"), "987654321");
      assert.equal(extractListingIdFromUrl("https://www.amazon.com/dp/B08N5WRWNW/ref=sr_1"), "B08N5WRWNW");
      assert.equal(extractListingIdFromUrl("https://www.ebay.com/itm/123456789012"), "123456789012");
      assert.equal(extractListingIdFromUrl("invalid-url"), null);
    });

    it("parses listing cards from public search result HTML", () => {
      const cards = parseEtsyListingCardsFromHtml(sampleEtsySearchHtml);

      assert.equal(cards.length, 2);
      assert.equal(cards[0].externalId, "987654321");
      assert.equal(cards[0].title, "Handmade Pottery Mug 12oz");
      assert.equal(cards[0].price, 28.0);
      assert.equal(cards[0].shopName, "StoneCraftMakers");

      assert.equal(cards[1].externalId, "123456789");
      assert.equal(cards[1].price, 22.5);
      assert.equal(cards[1].shopName, "WildFlowerCeramics");
    });
  });

  describe("2. Rate Limiting, Throttling & Fetch Caching", () => {
    it("enforces domain rate limiting without throwing", async () => {
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

    it("PublicPageFetcher transparently caches successful responses", async () => {
      const fetcher = new PublicPageFetcher();
      fetcher.clearCache();

      // Mock fetch in unit context
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
  });

  describe("3. EtsyPublicWebAdapter & Canonical Opportunity Scoring", () => {
    it("fetches and normalizes a public product with canonical opportunity score", async () => {
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

        const product = result.items[0];
        assert.equal(product.marketplace, "etsy");
        assert.equal(product.externalId, "987654321");
        assert.equal(product.title, "Ceramic Coffee Mug Handmade Stoneware");
        assert.equal(product.price, 26.5);
        assert.equal(product.currency, "USD");
        assert.equal(product.rating, 4.9);
        assert.equal(product.reviewCount, 142);
        assert.equal(product.acquisitionMethod, "PUBLIC_WEB");
        assert.equal(product.source, "ACTUAL_DATA");
        assert.equal(product.isHistorical, false);

        assert.ok(product.opportunityScore !== null && product.opportunityScore !== undefined);
        assert.ok(product.opportunityScore.score! >= 0 && product.opportunityScore.score! <= 100);
        assert.ok(product.opportunityScore.confidence >= 35, "Calibrated confidence for observed public signals");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("searches public products and normalizes listing cards into NormalizedProducts", async () => {
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
        const result = await adapter.searchPublicProducts({ query: "ceramic mug", limit: 10 });

        assert.equal(result.success, true);
        assert.equal(result.items.length, 2);

        assert.equal(result.items[0].externalId, "987654321");
        assert.equal(result.items[0].price, 28.0);
        assert.equal(result.items[0].acquisitionMethod, "PUBLIC_WEB");
        assert.equal(result.items[0].source, "ACTUAL_DATA");

        assert.equal(result.items[1].externalId, "123456789");
        assert.equal(result.items[1].price, 22.5);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("4. STRATEGIC CONTRACT: Product Research WITHOUT Official API Keys", () => {
    it("successfully acquires and evaluates real product research via PUBLIC_WEB when API keys are absent", async () => {
      const originalFetch = globalThis.fetch;

      globalThis.fetch = async () => {
        return new Response(sampleEtsySearchHtml, {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      };

      try {
        // Execute research request specifying PUBLIC_WEB as preferred source
        const result = await acquireProductObservations({
          marketplace: "etsy",
          query: "ceramic mug",
          preferredSources: ["PUBLIC_WEB"],
          limit: 10,
        });

        assert.equal(result.marketplace, "etsy");
        assert.equal(result.status, "AVAILABLE");
        assert.equal(result.hasLiveCoverage, true);
        assert.equal(result.sourcesSucceeded[0], "PUBLIC_WEB");
        assert.equal(result.products.length, 2);

        const prod = result.products[0];
        assert.equal(prod.acquisitionMethod, "PUBLIC_WEB");
        assert.equal(prod.source, "ACTUAL_DATA");
        assert.ok(prod.opportunityScore !== null && prod.opportunityScore !== undefined);
        assert.ok(prod.opportunityScore.score! >= 0 && prod.opportunityScore.score! <= 100);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
