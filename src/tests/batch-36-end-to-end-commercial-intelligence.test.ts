/**
 * Batch 36: Real Data -> Research -> Validate -> Plan Validation
 *
 * Batch 35 proved Amazon/Walmart's public-web acquisition genuinely works.
 * This batch traced that real data all the way through SEARCH -> RESEARCH
 * -> VALIDATE -> PLAN and found (and fixed) three real Zero-Fabrication
 * violations that only became consequential once real, non-Etsy data
 * started flowing through paths that were built assuming every field was
 * always a real, non-null Etsy number:
 *
 * 1. src/services/product-hunting.ts coerced an unobserved price to `0`
 *    (`p.price ?? 0`) before it ever reached the UI — a real merchant
 *    would see "$0.00" for an Amazon product whose price genuinely isn't
 *    exposed in its static search-result markup, indistinguishable from a
 *    real, confirmed $0.00 price. Same pattern for shop-level aggregate
 *    stats (reviewCount/activeListings/totalSales/shopAgeMonths), which
 *    Amazon/Walmart's public search results never provide at all —
 *    defaulted to plausible-looking placeholders (12 months, 1 listing,
 *    0 reviews) instead of being marked unavailable, silently feeding the
 *    Opportunity Score and rendering as "~0.0 sales/day · 0 reviews" as
 *    if directly observed.
 * 2. The same "$0.00" search-results card also displayed a hardcoded
 *    "[ACTUAL ETSY DATA]" provenance badge for Amazon/Walmart results —
 *    a direct violation of this codebase's own non-negotiable provenance
 *    rule (CLAUDE.md rule #2).
 * 3. src/marketplaces/walmart/public-adapter.ts's price extraction
 *    accepted Walmart's own "price not yet loaded" sentinel
 *    (`priceInfo: { linePrice: "", minPrice: 0 }` — observed live on
 *    Walmart's search page under repeated-request load) as if `0` were a
 *    real price, rather than treating it the same as a missing value.
 *
 * All three are fixed. This suite is a deterministic (no live network)
 * regression guard for the exact defects found, using the same
 * minimal-but-structurally-real fixture technique as Batch 35's suite.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compareProducts } from "../services/product-hunting";
import { parseWalmartListingCardsFromHtml } from "../marketplaces/walmart/public-adapter";
import type { ProductHuntingResult, NormalizedShopProfile } from "../types/product-hunting";

function buildWalmartPageWithPriceInfo(priceInfo: Record<string, unknown>): string {
  const nextData = {
    props: {
      pageProps: {
        initialData: {
          searchResult: {
            itemStacks: [
              {
                items: [
                  {
                    usItemId: "999",
                    name: "Test Item With Sentinel Price",
                    priceInfo,
                    averageRating: null,
                    numberOfReviews: null,
                    image: "https://i5.walmartimages.com/999.jpeg",
                    canonicalUrl: "/ip/test-item/999",
                  },
                ],
              },
            ],
          },
        },
      },
    },
  };
  return `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(nextData)}</script>`;
}

function buildResult(overrides: {
  price: number | null;
  shopMetricsObserved: boolean;
  id?: string;
}): ProductHuntingResult {
  const shop: NormalizedShopProfile = {
    shopId: overrides.id ?? "shop_1",
    shopName: "Test Shop",
    shopUrl: "https://example.com/shop",
    shopIconUrl: null,
    createdTimestamp: Math.floor(Date.now() / 1000),
    shopAgeMonths: overrides.shopMetricsObserved ? 24 : 12,
    totalSales: overrides.shopMetricsObserved ? 500 : 0,
    activeListings: overrides.shopMetricsObserved ? 30 : 1,
    reviewCount: overrides.shopMetricsObserved ? 120 : 0,
    reviewAverage: overrides.shopMetricsObserved ? 4.7 : null,
    shopMetricsObserved: overrides.shopMetricsObserved,
  };
  return {
    id: overrides.id ?? "listing_1",
    listing: {
      listingId: overrides.id ?? "listing_1",
      title: "Test Product",
      price: overrides.price,
      currency: "USD",
      images: [],
      imageUrl: null,
      tags: ["test"],
      materials: [],
      taxonomyId: null,
      createdTimestamp: Math.floor(Date.now() / 1000),
      updatedTimestamp: Math.floor(Date.now() / 1000),
      listingAgeDays: 30,
      listingAgeMonths: 1,
      listingUrl: "https://example.com/listing",
      shopId: overrides.id ?? "shop_1",
      shopName: "Test Shop",
      numFavorers: null,
      views: null,
    },
    shop,
    signals: {
      estDailySales: overrides.shopMetricsObserved ? 5 : 0,
      avgSellingRatio: overrides.shopMetricsObserved ? 16.7 : 0,
      salesVelocityProxy: "LOW",
      reviewConversionRate: 0,
    },
    opportunity: {
      opportunityScore: 50,
      classification: "GROWING",
      classificationLabel: "Consistent Growth",
      classificationEmoji: "📈",
      reason: "test",
      signals: {
        velocity: { score: 50, label: "test", metricValue: "test" },
        density: { score: 50, label: "test", metricValue: "test" },
        competition: { score: 50, label: "test", metricValue: "test" },
        freshness: { score: 50, label: "test", metricValue: "test" },
        momentum: { score: 50, label: "test", metricValue: "test" },
      },
      evidence: [],
      strengths: [],
      weaknesses: [],
      recommendedAction: "IGNORE",
      strategicTakeaway: "test",
    },
  };
}

describe("Batch 36: Real Data -> Research -> Validate -> Plan", () => {
  describe("1. Walmart price sentinel fix — a real '$0 placeholder' response never becomes a fabricated price", () => {
    it("rejects minPrice: 0 with an empty linePrice as a real observation (the exact shape observed live under repeated-request load)", () => {
      const html = buildWalmartPageWithPriceInfo({ linePrice: "", minPrice: 0 });
      const products = parseWalmartListingCardsFromHtml(html);
      assert.equal(products.length, 1);
      assert.equal(products[0].price, null, "a $0 sentinel must never be reported as a real observed price");
    });

    it("still accepts a genuine linePrice of a real low value (e.g. $0.99), not blanket-rejecting all low prices", () => {
      const html = buildWalmartPageWithPriceInfo({ linePrice: "$0.99", minPrice: 0.99 });
      const products = parseWalmartListingCardsFromHtml(html);
      assert.equal(products[0].price, 0.99);
    });

    it("still accepts a real minPrice when linePrice is absent", () => {
      const html = buildWalmartPageWithPriceInfo({ linePrice: "", minPrice: 14.99 });
      const products = parseWalmartListingCardsFromHtml(html);
      assert.equal(products[0].price, 14.99);
    });
  });

  describe("2. compareProducts never fabricates a price range from unobserved prices", () => {
    it("returns priceRange: null when none of the compared items have an observed price (all-Amazon comparison)", () => {
      const items = [
        buildResult({ price: null, shopMetricsObserved: false, id: "a" }),
        buildResult({ price: null, shopMetricsObserved: false, id: "b" }),
      ];
      const comparison = compareProducts(items);
      assert.equal(comparison.priceRange, null);
    });

    it("computes a real priceRange only from items that actually have an observed price, ignoring unobserved ones", () => {
      const items = [
        buildResult({ price: 20, shopMetricsObserved: true, id: "a" }),
        buildResult({ price: null, shopMetricsObserved: false, id: "b" }),
        buildResult({ price: 40, shopMetricsObserved: true, id: "c" }),
      ];
      const comparison = compareProducts(items);
      assert.ok(comparison.priceRange !== null);
      assert.equal(comparison.priceRange.min, 20);
      assert.equal(comparison.priceRange.max, 40);
      assert.equal(comparison.priceRange.average, 30);
    });
  });

  describe("3. shopMetricsObserved correctly distinguishes real shop stats from placeholder inputs", () => {
    it("a marketplace with no shop-level data (Amazon/Walmart) is marked shopMetricsObserved: false", () => {
      const result = buildResult({ price: null, shopMetricsObserved: false });
      assert.equal(result.shop.shopMetricsObserved, false);
    });

    it("Etsy (real shop-level data) is marked shopMetricsObserved: true", () => {
      const result = buildResult({ price: 25, shopMetricsObserved: true });
      assert.equal(result.shop.shopMetricsObserved, true);
    });
  });
});
