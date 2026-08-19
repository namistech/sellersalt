import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MarketplaceRegistry, assertCapability, registerAllConnectors } from "@/marketplaces/core/registry";
import { MarketplaceCapabilityUnavailableError, MarketplaceNotImplementedError } from "@/marketplaces/core/errors";
import { NO_CAPABILITIES, withCapabilities } from "@/marketplaces/core/capabilities";
import {
  normalizeEtsyProspectToSearchResult,
  normalizeEtsyShopStats,
  normalizeEtsySellerOrder,
} from "@/marketplaces/core/normalizers/etsy";
import { scoreProductOpportunity, scoreShopCompetition } from "@/marketplaces/core/opportunity-engine";
import { getOptimizationRules, ETSY_OPTIMIZATION_RULES } from "@/marketplaces/core/optimization-rules";
import { sanitizeTitle, sanitizeTags } from "@/services/listing-generation";
import { etsyConnector } from "@/marketplaces/etsy/connector";
import { amazonConnector } from "@/marketplaces/amazon/connector";
import { ebayConnector } from "@/marketplaces/ebay/connector";
import { tiktokShopConnector } from "@/marketplaces/tiktok-shop/connector";
import { shopifyMarketplaceConnector } from "@/marketplaces/shopify/connector";
import { woocommerceMarketplaceConnector } from "@/marketplaces/woocommerce/connector";

registerAllConnectors();

describe("Marketplace Registry", () => {
  it("registers and resolves every marketplace connector", () => {
    for (const id of ["etsy", "shopify", "woocommerce", "amazon", "ebay", "tiktok_shop"] as const) {
      const connector = MarketplaceRegistry.getConnector(id);
      assert.equal(connector.marketplace, id);
    }
  });

  it("throws a clear error for an unregistered marketplace id", () => {
    assert.throws(() => MarketplaceRegistry.getConnector("not_a_real_marketplace" as any), /No marketplace connector registered/);
  });

  it("listActive() only includes connectors with at least one real capability", () => {
    const active = MarketplaceRegistry.listActive().map((c) => c.marketplace);
    assert.ok(active.includes("etsy"));
    assert.ok(!active.includes("amazon"), "Amazon has zero live capabilities and must not appear in listActive()");
    assert.ok(!active.includes("ebay"));
    assert.ok(!active.includes("tiktok_shop"));
  });
});

describe("Capability Detection", () => {
  it("assertCapability throws MarketplaceCapabilityUnavailableError when the flag is false", () => {
    assert.throws(
      () => assertCapability(amazonConnector, "readOrders"),
      MarketplaceCapabilityUnavailableError
    );
  });

  it("assertCapability does not throw when the flag is true", () => {
    assert.doesNotThrow(() => assertCapability(etsyConnector, "research"));
  });

  it("withCapabilities only sets the overrides passed in, everything else stays false", () => {
    const caps = withCapabilities({ research: true });
    assert.equal(caps.research, true);
    assert.equal(caps.createListing, false);
    assert.deepEqual(NO_CAPABILITIES.research, false, "NO_CAPABILITIES itself must remain all-false (not mutated by withCapabilities)");
  });
});

describe("Stub Connectors Never Fabricate Data (Amazon / eBay / TikTok Shop)", () => {
  for (const [name, connector] of [
    ["amazon", amazonConnector],
    ["ebay", ebayConnector],
    ["tiktok_shop", tiktokShopConnector],
  ] as const) {
    it(`${name} connector has zero live capabilities`, () => {
      assert.deepEqual(connector.capabilities, NO_CAPABILITIES);
    });

    it(`${name} connector throws MarketplaceNotImplementedError rather than returning empty/fake data`, async () => {
      await assert.rejects(() => connector.getShops!("fake-account-id"), MarketplaceNotImplementedError);
      await assert.rejects(() => connector.getOrders!("fake-account-id"), MarketplaceNotImplementedError);
      await assert.rejects(() => connector.searchPublicListings!({ keywords: ["mug"] }), MarketplaceNotImplementedError);
    });
  }
});

describe("Shopify / WooCommerce Connectors Are Honestly Partial", () => {
  for (const connector of [shopifyMarketplaceConnector, woocommerceMarketplaceConnector]) {
    it(`${connector.marketplace} declares readOrders true but research/createListing false`, () => {
      assert.equal(connector.capabilities.readOrders, true);
      assert.equal(connector.capabilities.research, false);
      assert.equal(connector.capabilities.createListing, false);
    });
  }
});

describe("Etsy Connector Capabilities", () => {
  it("declares exactly the capabilities backed by real, shipped features", () => {
    assert.equal(etsyConnector.capabilities.research, true);
    assert.equal(etsyConnector.capabilities.createListing, true);
    assert.equal(etsyConnector.capabilities.readOrders, true);
    assert.equal(etsyConnector.capabilities.publishListing, false, "Silent auto-publish must never be a supported capability");
  });
});

describe("Etsy Normalizers", () => {
  it("normalizes a ProspectResult into a canonical SearchResult", () => {
    const result = normalizeEtsyProspectToSearchResult({
      keyword: "leather wallet",
      shopExternalId: "shop_1",
      shopName: "ArtisanLeatherCo",
      shopUrl: "https://etsy.com/shop/ArtisanLeatherCo",
      shopAgeMonths: 24,
      reviewCount: 500,
      activeListings: 40,
      reviewRatio: 12.5,
      reviewVelocity: 20.8,
      listingExternalId: "listing_1",
      listingTitle: "Minimalist Leather Wallet",
      listingUrl: "https://etsy.com/listing/listing_1",
      price: 28,
    });
    assert.equal(result.marketplace, "etsy");
    assert.equal(result.externalId, "listing_1");
    assert.equal(result.title, "Minimalist Leather Wallet");
    assert.equal(result.shopName, "ArtisanLeatherCo");
  });

  it("normalizes ShopStats into a canonical MarketplaceShop", () => {
    const shop = normalizeEtsyShopStats({
      shopExternalId: "shop_1",
      shopName: "ArtisanLeatherCo",
      shopUrl: "https://etsy.com/shop/ArtisanLeatherCo",
      shopAgeMonths: 24,
      reviewCount: 500,
      activeListings: 40,
    });
    assert.equal(shop.marketplace, "etsy");
    assert.equal(shop.name, "ArtisanLeatherCo");
    assert.equal(shop.ageMonths, 24);
  });

  it("normalizes a SellerOrderResult into a canonical Order, carrying the marketplaceAccountId", () => {
    const order = normalizeEtsySellerOrder("channel_123", {
      externalOrderId: "receipt_1",
      totalAmount: 42.5,
      currency: "USD",
      status: "paid",
      placedAt: new Date("2026-01-01"),
    });
    assert.equal(order.marketplace, "etsy");
    assert.equal(order.marketplaceAccountId, "channel_123");
    assert.equal(order.totalAmount, 42.5);
  });
});

describe("Opportunity Engine — Deterministic, Never Fabricates Missing Factors", () => {
  const baseParams = {
    marketplace: "etsy" as const,
    price: 28,
    estDailySales: 3.2,
    shopReviewCount: 340,
    listingAgeDays: 60,
    numFavorers: 120,
  };

  it("produces an identical score across repeated calls with identical input", () => {
    const a = scoreProductOpportunity(baseParams);
    const b = scoreProductOpportunity(baseParams);
    assert.equal(a.score, b.score);
    assert.deepEqual(a.factors.map((f) => f.score), b.factors.map((f) => f.score));
  });

  it("marks the price-stability factor unavailable (not fabricated) when categoryMedianPrice is omitted", () => {
    const result = scoreProductOpportunity(baseParams);
    const priceFactor = result.factors.find((f) => f.id === "price_stability");
    assert.ok(priceFactor);
    assert.equal(priceFactor?.available, false);
    assert.equal(priceFactor?.score, null);
  });

  it("does not include an unavailable price-stability factor once categoryMedianPrice is supplied", () => {
    const result = scoreProductOpportunity({ ...baseParams, categoryMedianPrice: 25 });
    const priceFactor = result.factors.find((f) => f.id === "price_stability");
    assert.equal(priceFactor, undefined);
  });

  it("confidence drops when a factor is unavailable vs. when everything is available", () => {
    const withoutPrice = scoreProductOpportunity(baseParams);
    const withPrice = scoreProductOpportunity({ ...baseParams, categoryMedianPrice: 25 });
    assert.ok(withoutPrice.confidence < withPrice.confidence);
  });

  it("scores shop competition deterministically and tags the data source", () => {
    const result = scoreShopCompetition({
      marketplace: "etsy",
      shopName: "TestShop",
      totalSales: 2000,
      reviewCount: 300,
      activeListings: 50,
      shopAgeMonths: 18,
      estDailySales: 4,
    });
    assert.deepEqual(result.dataSources, ["etsy"]);
    assert.ok(result.score !== null && result.score >= 10 && result.score <= 99);
  });
});

describe("Universal Scoring Fee-Schedule Parameterization Preserves Etsy Defaults", () => {
  it("evaluateProductOpportunity with no feeSchedule arg matches passing the explicit Etsy schedule", async () => {
    const { evaluateProductOpportunity } = await import("@/services/intelligence/universal-scoring");
    const params = { price: 30, estDailySales: 2, shopReviewCount: 200, listingAgeDays: 100 };
    const implicit = evaluateProductOpportunity(params);
    const explicit = evaluateProductOpportunity({ ...params, feeSchedule: { percentageFee: 0.095, flatFee: 0.2 } });
    assert.equal(implicit.score, explicit.score);
  });

  it("dropping the fee schedule (unknown marketplace) still returns a valid 0-100 score with margin excluded", async () => {
    const { evaluateProductOpportunity } = await import("@/services/intelligence/universal-scoring");
    const result = evaluateProductOpportunity({
      price: 30,
      estDailySales: 2,
      shopReviewCount: 200,
      listingAgeDays: 100,
      feeSchedule: null,
    });
    assert.ok(result.score >= 10 && result.score <= 99);
    assert.ok(!result.factors.some((f) => f.id === "margin"), "margin factor must be dropped, not scored against a guessed fee");
    const totalWeight = result.factors.reduce((sum, f) => sum + f.weight, 0);
    assert.ok(Math.abs(totalWeight - 1) < 0.001, "remaining factor weights must still sum to 1.0");
  });
});

describe("Marketplace-Neutral Listing Optimization Rules", () => {
  it("Etsy rules match the platform's real 140-char / 13-tag / 20-char constraints", () => {
    assert.equal(ETSY_OPTIMIZATION_RULES.titleMaxLength, 140);
    assert.equal(ETSY_OPTIMIZATION_RULES.tagCount, 13);
    assert.equal(ETSY_OPTIMIZATION_RULES.tagMaxLength, 20);
  });

  it("unknown marketplaces report null constraints, never a guessed number", () => {
    const rules = getOptimizationRules("amazon");
    assert.equal(rules.titleMaxLength, null);
    assert.equal(rules.tagCount, null);
    assert.equal(rules.supportsTags, false);
  });

  it("sanitizeTitle defaults to Etsy's 140-char limit unchanged", () => {
    const longTitle = "x".repeat(200);
    const result = sanitizeTitle(longTitle);
    assert.ok(result.length <= 140);
  });

  it("sanitizeTitle respects a custom marketplace rule set", () => {
    const rules = { ...ETSY_OPTIMIZATION_RULES, marketplace: "amazon" as const, titleMaxLength: 200 };
    const longTitle = "word ".repeat(60); // 300 chars
    const result = sanitizeTitle(longTitle, [], rules);
    assert.ok(result.length <= 200);
  });

  it("sanitizeTags defaults to exactly 13 Etsy-style tags unchanged", () => {
    const tags = sanitizeTags(["handmade wallet"], ["leather goods"]);
    assert.equal(tags.length, 13);
    assert.ok(tags.every((t) => t.length <= 20));
  });

  it("sanitizeTags returns an empty array for a marketplace that doesn't support tags", () => {
    const rules = getOptimizationRules("amazon");
    const tags = sanitizeTags(["handmade wallet"], [], rules);
    assert.deepEqual(tags, []);
  });
});
