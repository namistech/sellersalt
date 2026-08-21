/**
 * Batch 37 — Product Research Data Contract regression tests.
 *
 * Covers the real defects found and fixed during Batch 37's forensic audit
 * of the Amazon/Walmart public-web adapters and the orchestrator's price
 * filter — all against synthetic-but-structurally-real fixtures modeled on
 * markup/JSON actually captured from live fetches during the audit (see
 * BATCH-37-PRODUCT-RESEARCH-DATA-VALIDATION.md for the raw evidence).
 * Deterministic, no live network — CI-safe.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseAmazonListingCardsFromHtml,
  parseAmazonPriceAndCurrency,
  extractAmazonBreadcrumbCategoryPath,
} from "../marketplaces/amazon/public-adapter";
import { parseWalmartListingCardsFromHtml } from "../marketplaces/walmart/public-adapter";
import { orchestrateProductResearch } from "../marketplaces/core/acquisition/orchestrator";
import { MarketplaceRegistry, registerAllConnectors } from "../marketplaces/core/registry";
import type { PublicWebAcquisitionAdapter, PublicAcquisitionResult } from "../marketplaces/core/acquisition/contracts";
import type { NormalizedProduct } from "../marketplaces/core/types";

registerAllConnectors();

/** Builds a real-shaped Amazon sponsored-slot card: a long ad-metadata
 * preamble (matches the ~9,000-16,000 char gaps observed live between
 * data-asin and <h2> on real sponsored cards) followed by the real
 * data-cy="title-recipe"/price-recipe/reviews-block markup shape. */
function buildAmazonRealCard(opts: {
  asin: string;
  title: string;
  preambleChars: number;
  offscreenPrice?: string; // e.g. "PKR 4,159.35" or "$19.99"
  rating?: string;
  reviewCount?: string;
  productType?: string;
  sponsored?: boolean;
  bestSeller?: boolean;
  materialBadge?: string;
}): string {
  const preamble = "x".repeat(Math.max(0, opts.preambleChars));
  const sponsoredMarkup = opts.sponsored ? `<span>Sponsored</span>` : "";
  const bestSellerMarkup = opts.bestSeller ? `<span>Best Seller</span>` : "";
  const productTypeAttr = opts.productType ? `data-csa-c-product-type="${opts.productType}"` : "";
  const materialMarkup = opts.materialBadge
    ? `<span class="puis-medium-weight-text">${opts.materialBadge}</span>`
    : "";

  return `<div data-asin="${opts.asin}" ${productTypeAttr} data-component-type="s-search-result">
    ${sponsoredMarkup}${bestSellerMarkup}
    <div class="a-section">${preamble}</div>
    <div data-cy="title-recipe"><h2 aria-label="${opts.title}" class="a-size-base-plus"><span>${opts.title}</span></h2></div>
    ${materialMarkup}
    <div data-cy="reviews-block">
      ${opts.rating ? `<span aria-hidden="true">${opts.rating}</span>` : ""}
      ${opts.reviewCount ? `<a aria-label="${opts.reviewCount} ratings"></a>` : ""}
    </div>
    <div data-cy="price-recipe">
      ${opts.offscreenPrice ? `<span class="a-offscreen">${opts.offscreenPrice}</span>` : ""}
    </div>
    <img class="s-image" src="https://m.media-amazon.com/images/I/test.jpg" />
  </div>`;
}

describe("Batch 37: Amazon public-web adapter data contract", () => {
  describe("1. Window-cap fix — real sponsored-card gaps (proves the actual Batch 37 bug, not just the happy path)", () => {
    it("extracts a title from a real sponsored-card gap size (9,771 chars — the exact offset observed live)", () => {
      const html = buildAmazonRealCard({
        asin: "B0GCL55CR9",
        title: "Striped Ceramic Coffee Mug with Sip Hole",
        preambleChars: 9771,
        offscreenPrice: "$19.99",
      });
      const products = parseAmazonListingCardsFromHtml(html);
      assert.equal(products.length, 1, "a title beyond the old 9,000-char cap must still be found");
      assert.equal(products[0].title, "Striped Ceramic Coffee Mug with Sip Hole");
    });

    it("still bounds each card by the next card's own data-asin match (no cross-card bleed even with the raised cap)", () => {
      const cardA = buildAmazonRealCard({ asin: "AAAAAAAAAA", title: "First Real Product", preambleChars: 8000, offscreenPrice: "$10.00" });
      const cardB = buildAmazonRealCard({ asin: "BBBBBBBBBB", title: "Second Real Product", preambleChars: 8000, offscreenPrice: "$20.00" });
      const products = parseAmazonListingCardsFromHtml(cardA + cardB);
      assert.equal(products.length, 2);
      assert.equal(products[0].externalId, "AAAAAAAAAA");
      assert.equal(products[1].externalId, "BBBBBBBBBB");
    });
  });

  describe("2. Currency-honest price parsing — never assumes USD", () => {
    it("parses a real geo-localized non-USD offscreen price with its real currency code, never mislabeled USD", () => {
      const html = buildAmazonRealCard({
        asin: "B0FR1FDNSV",
        title: "Coffee Mug Espresso Cup",
        preambleChars: 200,
        offscreenPrice: "PKR 4,159.35",
      });
      const products = parseAmazonListingCardsFromHtml(html);
      assert.equal(products[0].price, 4159.35);
      assert.equal(products[0].currency, "PKR", "must carry the real observed currency, not a hardcoded USD");
    });

    it("still parses a real $-prefixed USD price correctly", () => {
      const html = buildAmazonRealCard({
        asin: "B0TESTUSD1",
        title: "USD Priced Item",
        preambleChars: 200,
        offscreenPrice: "$24.50",
      });
      const products = parseAmazonListingCardsFromHtml(html);
      assert.equal(products[0].price, 24.5);
      assert.equal(products[0].currency, "USD");
    });

    it("parseAmazonPriceAndCurrency returns null/null for unparseable text rather than guessing", () => {
      assert.deepEqual(parseAmazonPriceAndCurrency(""), { price: null, currency: null });
      assert.deepEqual(parseAmazonPriceAndCurrency("Free"), { price: null, currency: null });
    });

    it("never emits a price without a currency (and vice versa) on a card", () => {
      const html = buildAmazonRealCard({
        asin: "B0NOPRICE01",
        title: "No Parseable Price Item",
        preambleChars: 200,
      });
      const products = parseAmazonListingCardsFromHtml(html);
      assert.equal(products[0].price, null);
      assert.equal(products[0].currency, null);
    });
  });

  describe("3. Category, badges, sponsored disclosure — real on-page signals, not invented", () => {
    it("extracts Amazon's own data-csa-c-product-type as a humanized category", () => {
      const html = buildAmazonRealCard({
        asin: "B0CATEGORY1",
        title: "Drinking Cup Item",
        preambleChars: 200,
        offscreenPrice: "$9.99",
        productType: "DRINKING_CUP",
      });
      const products = parseAmazonListingCardsFromHtml(html);
      assert.deepEqual(products[0].category, { id: "DRINKING_CUP", name: "Drinking Cup" });
    });

    it("discloses a sponsored placement as a badge rather than silently treating it as organic", () => {
      const html = buildAmazonRealCard({
        asin: "B0SPONSORED1",
        title: "Sponsored Item",
        preambleChars: 200,
        offscreenPrice: "$9.99",
        sponsored: true,
      });
      const products = parseAmazonListingCardsFromHtml(html);
      assert.ok(products[0].badges?.includes("Sponsored"));
    });

    it("captures a real Best Seller badge and material attribute chip", () => {
      const html = buildAmazonRealCard({
        asin: "B0BESTSELLER1",
        title: "Best Seller Item",
        preambleChars: 200,
        offscreenPrice: "$9.99",
        bestSeller: true,
        materialBadge: "Porcelain",
      });
      const products = parseAmazonListingCardsFromHtml(html);
      assert.ok(products[0].badges?.includes("Best Seller"));
      assert.ok(products[0].badges?.includes("Porcelain"));
    });

    it("never fabricates a category, badge, or currency for a card with none of the underlying markup", () => {
      const html = `<div data-asin="B0PLAIN0001"><h2><span>Plain title with no extras</span></h2></div>`;
      const products = parseAmazonListingCardsFromHtml(html);
      assert.equal(products.length, 1);
      assert.equal(products[0].category, undefined);
      assert.equal(products[0].badges, undefined);
      assert.equal(products[0].currency, null);
    });
  });

  describe("4. Breadcrumb category extraction (product-detail path) — real HTML fallback since JSON-LD is dead on live pages", () => {
    it("extracts a real multi-level breadcrumb trail", () => {
      const html = `<div id="wayfinding-breadcrumbs_feature_div" class="a-subheader a-breadcrumb feature"><ul>
        <li><a class="a-link-normal a-color-tertiary" href="/x">Home &amp; Kitchen</a></li>
        <li><a class="a-link-normal a-color-tertiary" href="/y">Kitchen &amp; Dining</a></li>
        <li><a class="a-link-normal a-color-tertiary" href="/z">Cups, Mugs &amp; Saucers</a></li>
      </ul></div>`;
      const path = extractAmazonBreadcrumbCategoryPath(html);
      assert.deepEqual(path, ["Home & Kitchen", "Kitchen & Dining", "Cups, Mugs & Saucers"]);
    });

    it("returns [] when no breadcrumb section exists, never a fabricated path", () => {
      assert.deepEqual(extractAmazonBreadcrumbCategoryPath("<html><body>no breadcrumbs here</body></html>"), []);
    });
  });
});

describe("Batch 37: Walmart public-web adapter data contract", () => {
  function buildWalmartSearchPage(items: any[]): string {
    const nextData = {
      props: {
        pageProps: {
          initialData: {
            searchResult: {
              itemStacks: [{ items }],
            },
          },
        },
      },
    };
    return `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(nextData)}</script>`;
  }

  it("extracts real seller name/id previously never read from the hydration JSON", () => {
    const html = buildWalmartSearchPage([
      {
        usItemId: "1",
        name: "Test Mug",
        priceInfo: { linePrice: "$17.99" },
        averageRating: 5,
        numberOfReviews: 2,
        canonicalUrl: "/ip/test/1",
        sellerName: "CafePress",
        sellerId: "SELLER123",
      },
    ]);
    const products = parseWalmartListingCardsFromHtml(html);
    assert.equal(products[0].shop?.name, "CafePress");
    assert.equal(products[0].shop?.externalId, "SELLER123");
  });

  it("extracts real category (department + catalogProductType) into categoryPath", () => {
    const html = buildWalmartSearchPage([
      {
        usItemId: "2",
        name: "Test Mug 2",
        priceInfo: { linePrice: "$12.00" },
        canonicalUrl: "/ip/test/2",
        departmentName: "Home",
        catalogProductType: "Cups & Mugs",
      },
    ]);
    const products = parseWalmartListingCardsFromHtml(html);
    assert.deepEqual(products[0].categoryPath, ["Home", "Cups & Mugs"]);
  });

  it("extracts real availability and sponsored/merchandising badges, never fabricated", () => {
    const html = buildWalmartSearchPage([
      {
        usItemId: "3",
        name: "Sponsored Item",
        priceInfo: { linePrice: "$8.00" },
        canonicalUrl: "/ip/test/3",
        isOutOfStock: false,
        availabilityStatusV2: { value: "IN_STOCK" },
        isSponsoredFlag: true,
        badges: { flags: [{ text: "Best seller" }] },
        fulfillmentType: "FC",
      },
    ]);
    const products = parseWalmartListingCardsFromHtml(html);
    assert.equal(products[0].availability, "IN_STOCK");
    assert.ok(products[0].badges?.includes("Sponsored"));
    assert.ok(products[0].badges?.includes("Best seller"));
    assert.equal(products[0].shippingInfo, "Fulfilled by Walmart");
  });

  it("never fabricates seller/category/badges when the item has none of those fields", () => {
    const html = buildWalmartSearchPage([
      { usItemId: "4", name: "Bare Item", priceInfo: { linePrice: "$5.00" }, canonicalUrl: "/ip/test/4" },
    ]);
    const products = parseWalmartListingCardsFromHtml(html);
    assert.equal(products[0].shop, undefined);
    assert.equal(products[0].categoryPath, undefined);
    assert.equal(products[0].badges, undefined);
    assert.equal(products[0].availability, null);
  });
});

describe("Batch 37: orchestrator price filter — repairs a UI field that was accepted and silently ignored", () => {
  class FixturePublicAdapter implements PublicWebAcquisitionAdapter {
    readonly marketplace = "amazon" as const;
    readonly displayName = "Amazon";
    readonly domain = "amazon.com";
    readonly capabilities = {
      productSearch: true,
      productDetail: true,
      shopResearch: false,
      keywordDiscovery: false,
      categoryDiscovery: false,
      reviews: true,
      ratings: true,
      pricing: true,
      images: true,
      taxonomy: false,
      engagement: false,
      salesEstimation: false,
    };

    async searchPublicProducts(): Promise<PublicAcquisitionResult<NormalizedProduct>> {
      const now = new Date();
      const items: NormalizedProduct[] = [
        { marketplace: "amazon", externalId: "cheap", title: "Cheap Item", price: 5, currency: "USD", source: "ACTUAL_DATA", acquisitionMethod: "PUBLIC_WEB", isHistorical: false, capturedAt: now },
        { marketplace: "amazon", externalId: "mid", title: "Mid Item", price: 25, currency: "USD", source: "ACTUAL_DATA", acquisitionMethod: "PUBLIC_WEB", isHistorical: false, capturedAt: now },
        { marketplace: "amazon", externalId: "expensive", title: "Expensive Item", price: 100, currency: "USD", source: "ACTUAL_DATA", acquisitionMethod: "PUBLIC_WEB", isHistorical: false, capturedAt: now },
        { marketplace: "amazon", externalId: "no-price", title: "Unpriced Item", price: null, currency: null, source: "ACTUAL_DATA", acquisitionMethod: "PUBLIC_WEB", isHistorical: false, capturedAt: now },
      ];
      return { success: true, marketplace: "amazon", items, sourceType: "PUBLIC_WEB", provenance: "ACTUAL_DATA", statusCode: 200, fetchedAt: now };
    }

    async fetchPublicProduct(): Promise<PublicAcquisitionResult<NormalizedProduct>> {
      return { success: false, marketplace: "amazon", items: [], sourceType: "PUBLIC_WEB", provenance: "UNAVAILABLE", fetchedAt: new Date() };
    }
  }

  it("actually excludes observed prices outside a minPrice/maxPrice range (previously accepted and silently ignored end-to-end)", async () => {
    MarketplaceRegistry.registerPublicWebAdapter(new FixturePublicAdapter());
    const result = await orchestrateProductResearch(
      { query: "test", marketplace: "amazon", minPrice: 10, maxPrice: 50 },
      { preferredSources: ["PUBLIC_WEB"], allowHistoricalFallback: false, persistObservations: false }
    );
    const ids = result.items.map((i) => i.externalId).sort();
    assert.deepEqual(ids, ["mid", "no-price"], "only the in-range item and the unpriced item should survive");
  });

  it("never excludes an item with a genuinely UNAVAILABLE (null) price, even under a strict price filter", async () => {
    MarketplaceRegistry.registerPublicWebAdapter(new FixturePublicAdapter());
    const result = await orchestrateProductResearch(
      { query: "test", marketplace: "amazon", minPrice: 1000, maxPrice: 2000 },
      { preferredSources: ["PUBLIC_WEB"], allowHistoricalFallback: false, persistObservations: false }
    );
    const ids = result.items.map((i) => i.externalId);
    assert.ok(ids.includes("no-price"), "an unobserved price must never be treated as if it were $0 and excluded");
    assert.ok(!ids.includes("cheap") && !ids.includes("mid") && !ids.includes("expensive"));
  });

  it("passes through every item unfiltered when no price filter was requested", async () => {
    MarketplaceRegistry.registerPublicWebAdapter(new FixturePublicAdapter());
    const result = await orchestrateProductResearch(
      { query: "test", marketplace: "amazon" },
      { preferredSources: ["PUBLIC_WEB"], allowHistoricalFallback: false, persistObservations: false }
    );
    assert.equal(result.items.length, 4);
  });
});
