/**
 * Batch 35: Independent Ecommerce Intelligence Acquisition Engine
 *
 * Proves the marketplace-independent acquisition pipeline works with real
 * data, not just Etsy credentials. This batch found and fixed:
 *
 * 1. src/marketplaces/amazon/public-adapter.ts's card parser used a fixed
 *    2,500-character window to isolate each product card's HTML around
 *    its `data-asin` attribute. A real live fetch (2026-08-20) showed
 *    Amazon's current search-result markup puts the <h2> title
 *    3,000-6,000 characters after `data-asin` — the fixed window silently
 *    missed every card's title, so the adapter always returned zero
 *    items despite a real, successful 200 response. Fixed to bound the
 *    window by the next card's own `data-asin` match instead.
 * 2. src/marketplaces/walmart/public-adapter.ts's HTML-regex card parser
 *    had a card-boundary regex that matched up to the *first* nested
 *    `</div>` inside each card (a few characters in) — never real card
 *    content — and a title selector targeting a build-specific hashed
 *    CSS class name that no longer exists on the live site. Rewritten to
 *    parse the page's own embedded `__NEXT_DATA__` Next.js hydration
 *    JSON instead, which is far more reliable (real field names, not
 *    hashed classes) and is not client-side JS execution or anti-bot
 *    evasion — it's structured data the server already sent us.
 * 3. src/marketplaces/core/research-pipeline.ts's runProductResearch
 *    (used by "All Marketplaces" fan-out) and
 *    src/app/api/marketplaces/research/route.ts's default marketplace
 *    list both gated on the OFFICIAL API connector's `capabilities.
 *    research` flag alone — Amazon/Walmart's official connectors are
 *    architecture-ready stubs with that flag false, so both silently
 *    excluded them from "All Marketplaces" mode even after their real,
 *    working PUBLIC_WEB adapters were fixed. Fixed to gate on EITHER
 *    capability.
 * 4. The MarketplaceSelector UI and GET /api/marketplaces both gated on
 *    the same official-API-only flag, hard-disabling the Amazon/Walmart
 *    picker buttons ("Coming soon") even though they work. Fixed via a
 *    new `researchAvailable` field combining both capability sources.
 *
 * All fixture HTML/JSON below is a minimal *structural* reproduction of
 * the real shapes observed on a live fetch on 2026-08-20 (verified against
 * https://www.amazon.com/s?k=... and https://www.walmart.com/search?q=...
 * while diagnosing this), not verbatim scraped content — chosen so the
 * parser's real fix (the widened/bounded window; the JSON-first strategy)
 * is genuinely exercised rather than trivially passing on a toy input.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseAmazonListingCardsFromHtml } from "../marketplaces/amazon/public-adapter";
import { parseWalmartListingCardsFromHtml } from "../marketplaces/walmart/public-adapter";
import { MarketplaceRegistry, registerAllConnectors } from "../marketplaces/core/registry";
import { runProductResearch } from "../marketplaces/core/research-pipeline";

registerAllConnectors();

/** Builds a synthetic-but-structurally-real Amazon search-result HTML
 * fragment: `data-asin`, then ~3,500 chars of realistic surrounding
 * markup (image container, price recipe wrapper, etc. — the same kind of
 * content actually observed between the ASIN and the title on a live
 * fetch), then the real `<h2 ...><span>title</span></h2>` shape Amazon
 * currently uses. */
function buildAmazonCard(asin: string, title: string, precedingPaddingChars: number): string {
  const padding = `<div class="a-section a-spacing-base"><span class="a-declarative" data-csa-c-type="item">${"x".repeat(Math.max(0, precedingPaddingChars - 120))}</span></div>`;
  return `<div data-asin="${asin}" data-component-type="s-search-result" class="s-result-item"><div class="sg-col-inner">${padding}<h2 aria-label="${title}" class="a-size-base-plus a-color-base a-text-normal"><span>${title}</span></h2></div></div>`;
}

/** Builds a synthetic-but-structurally-real Walmart `__NEXT_DATA__` page:
 * the real JSON path (`props.pageProps.initialData.searchResult.
 * itemStacks[].items[]`) and the real field names (`usItemId`, `name`,
 * `priceInfo.linePrice`, `averageRating`, `numberOfReviews`, `image`,
 * `canonicalUrl`) observed on a live fetch, with placeholder values. */
function buildWalmartPage(items: Array<{ id: string; name: string; linePrice: string; rating: number; reviews: number }>): string {
  const nextData = {
    props: {
      pageProps: {
        initialData: {
          searchResult: {
            itemStacks: [
              {
                items: items.map((it) => ({
                  usItemId: it.id,
                  name: it.name,
                  priceInfo: { linePrice: it.linePrice, minPrice: null },
                  averageRating: it.rating,
                  numberOfReviews: it.reviews,
                  image: `https://i5.walmartimages.com/${it.id}.jpeg`,
                  canonicalUrl: `/ip/${it.name.replace(/\s+/g, "-")}/${it.id}`,
                })),
              },
            ],
          },
        },
      },
    },
  };
  return `<html><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(nextData)}</script></body></html>`;
}

describe("Batch 35: Independent Ecommerce Intelligence Acquisition Engine", () => {
  describe("1. Amazon public-web parser — real card window fix", () => {
    it("extracts a card whose title sits far beyond the old 2,500-char window (proves the fix, not just the happy path)", () => {
      const html = buildAmazonCard("B07PZBF7F4", "Liry Products Brown Wooden Desk Organizer", 3597);
      const products = parseAmazonListingCardsFromHtml(html);
      assert.equal(products.length, 1);
      assert.equal(products[0].externalId, "B07PZBF7F4");
      assert.equal(products[0].title, "Liry Products Brown Wooden Desk Organizer");
      assert.equal(products[0].marketplace, "amazon");
      assert.equal(products[0].source, "ACTUAL_DATA");
      assert.equal(products[0].acquisitionMethod, "PUBLIC_WEB");
    });

    it("does not bleed one card's title into an adjacent card (bounded by the next data-asin match)", () => {
      const cardA = buildAmazonCard("AAAAAAAAAA", "First Real Product Title", 3200);
      const cardB = buildAmazonCard("BBBBBBBBBB", "Second Real Product Title", 3200);
      const products = parseAmazonListingCardsFromHtml(cardA + cardB);
      assert.equal(products.length, 2);
      assert.equal(products[0].externalId, "AAAAAAAAAA");
      assert.equal(products[0].title, "First Real Product Title");
      assert.equal(products[1].externalId, "BBBBBBBBBB");
      assert.equal(products[1].title, "Second Real Product Title");
    });

    it("never fabricates a title, price, or rating for a card it can't confidently parse", () => {
      const brokenHtml = `<div data-asin="C000000001">no h2 title markup at all here</div>`;
      const products = parseAmazonListingCardsFromHtml(brokenHtml);
      assert.equal(products.length, 0, "a card with no extractable title must be skipped, never given a fabricated one");
    });

    it("returns [] (not a throw) for empty/garbage input", () => {
      assert.deepEqual(parseAmazonListingCardsFromHtml(""), []);
      assert.deepEqual(parseAmazonListingCardsFromHtml("<html></html>"), []);
    });
  });

  describe("2. Walmart public-web parser — real __NEXT_DATA__ extraction", () => {
    it("extracts real title/price/rating/reviewCount/url/image from the page's own embedded JSON state", () => {
      const html = buildWalmartPage([
        { id: "18976470864", name: "Marsrock Desktop Shelf, Desk Hutch with 2 Shelves", linePrice: "$19.99", rating: 3.9, reviews: 45 },
      ]);
      const products = parseWalmartListingCardsFromHtml(html);
      assert.equal(products.length, 1);
      const p = products[0];
      assert.equal(p.externalId, "18976470864");
      assert.equal(p.title, "Marsrock Desktop Shelf, Desk Hutch with 2 Shelves");
      assert.equal(p.price, 19.99);
      assert.equal(p.rating, 3.9);
      assert.equal(p.reviewCount, 45);
      assert.equal(p.url, "https://www.walmart.com/ip/Marsrock-Desktop-Shelf,-Desk-Hutch-with-2-Shelves/18976470864");
      assert.ok(p.imageUrl?.startsWith("https://"));
      assert.equal(p.marketplace, "walmart");
      assert.equal(p.source, "ACTUAL_DATA");
    });

    it("deduplicates repeated usItemId entries across item stacks", () => {
      const html = buildWalmartPage([
        { id: "1", name: "Item One", linePrice: "$10.00", rating: 4, reviews: 1 },
        { id: "1", name: "Item One Duplicate", linePrice: "$10.00", rating: 4, reviews: 1 },
        { id: "2", name: "Item Two", linePrice: "$20.00", rating: 4, reviews: 1 },
      ]);
      const products = parseWalmartListingCardsFromHtml(html);
      assert.equal(products.length, 2);
    });

    it("never fabricates a price when priceInfo has neither linePrice nor a numeric minPrice", () => {
      const nextData = {
        props: {
          pageProps: {
            initialData: {
              searchResult: {
                itemStacks: [
                  { items: [{ usItemId: "9", name: "No Price Item", priceInfo: { linePrice: "", minPrice: null }, averageRating: null, numberOfReviews: null }] },
                ],
              },
            },
          },
        },
      };
      const html = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(nextData)}</script>`;
      const products = parseWalmartListingCardsFromHtml(html);
      assert.equal(products.length, 1);
      assert.equal(products[0].price, null, "missing price must stay null, never fabricated");
      assert.equal(products[0].rating, null);
      assert.equal(products[0].reviewCount, null);
    });

    it("falls back to the legacy regex path (and ultimately []) when __NEXT_DATA__ is absent, rather than throwing", () => {
      assert.deepEqual(parseWalmartListingCardsFromHtml("<html><body>no next data here</body></html>"), []);
      assert.deepEqual(parseWalmartListingCardsFromHtml(""), []);
    });

    it("handles malformed __NEXT_DATA__ JSON without throwing", () => {
      const html = `<script id="__NEXT_DATA__" type="application/json">{not valid json</script>`;
      assert.doesNotThrow(() => parseWalmartListingCardsFromHtml(html));
    });
  });

  describe("3. 'All Marketplaces' no longer silently excludes public-web-only marketplaces", () => {
    it("Amazon's official connector genuinely has no research capability (sanity check the premise of the bug)", () => {
      const connector = MarketplaceRegistry.tryGetConnector("amazon");
      assert.equal(connector?.capabilities.research, false);
    });

    it("Amazon's public-web adapter genuinely has productSearch capability (the source runProductResearch used to ignore)", () => {
      const publicAdapter = MarketplaceRegistry.tryGetPublicWebAdapter("amazon");
      assert.equal(publicAdapter?.capabilities.productSearch, true);
    });

    it("runProductResearch('amazon', ...) is NOT short-circuited to NOT_IMPLEMENTED merely because the official connector lacks research capability", async () => {
      const result = await runProductResearch({
        type: "products",
        marketplace: "amazon",
        organizationId: "org_test_batch35",
        keywords: ["wooden desk organizer"],
        limit: 5,
      });
      // Before the fix, this always returned NOT_IMPLEMENTED without ever
      // attempting acquisition. Now it must reach real attempted
      // acquisition — AVAILABLE/PARTIAL/UNAVAILABLE are all legitimate
      // outcomes of actually trying; NOT_IMPLEMENTED is not, since a real
      // public-web capability is registered.
      assert.notEqual(result.status, "NOT_IMPLEMENTED");
    });

    it("a marketplace with neither official nor public-web research capability still correctly reports NOT_IMPLEMENTED (no over-correction)", async () => {
      const result = await runProductResearch({
        type: "products",
        marketplace: "tiktok_shop",
        organizationId: "org_test_batch35",
        keywords: ["wooden desk organizer"],
        limit: 5,
      });
      assert.equal(result.status, "NOT_IMPLEMENTED");
    });
  });
});
