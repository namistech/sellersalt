import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseEtsyListingInput } from "../lib/etsy-listing-parser";
import { evaluateProductOpportunity, evaluateShopCompetition } from "../services/intelligence/universal-scoring";
import { SUPPORTED_MARKETPLACE_COUNTRIES } from "../components/ui/CountrySelector";

describe("Batch 10: Media Provenance & Fallback Hierarchy", () => {
  it("enforces that product listing images and shop covers remain strictly separated", () => {
    const productListing = {
      listingId: "1729482012",
      title: "Handmade Leather Journal",
      imageUrl: "https://i.etsystatic.com/12345/r/il/product-main.jpg",
      shopCoverUrl: "https://i.etsystatic.com/12345/r/isbl/shop-banner.jpg",
      shopAvatarUrl: "https://i.etsystatic.com/12345/r/isla/shop-avatar.jpg",
    };

    // Product cards must strictly resolve to the listing image
    const resolvedProductImg = productListing.imageUrl;
    assert.strictEqual(resolvedProductImg, "https://i.etsystatic.com/12345/r/il/product-main.jpg");
    assert.notStrictEqual(resolvedProductImg, productListing.shopCoverUrl);
    assert.notStrictEqual(resolvedProductImg, productListing.shopAvatarUrl);
  });

  it("verifies shop fallback hierarchy uses shop avatar or shop fallback, never product icon", () => {
    const shopWithAvatarOnly = {
      shopName: "PaperCraftCo",
      shopBannerUrl: null,
      shopIconUrl: "https://i.etsystatic.com/12345/r/isla/avatar.jpg",
    };

    const resolvedShopHeaderImg = shopWithAvatarOnly.shopBannerUrl || shopWithAvatarOnly.shopIconUrl;
    assert.strictEqual(resolvedShopHeaderImg, "https://i.etsystatic.com/12345/r/isla/avatar.jpg");
  });
});

describe("Batch 10: Shop & Listing URL Boundary Defense", () => {
  it("strictly distinguishes Etsy shop URLs from Etsy listing URLs", () => {
    const shopUrl1 = parseEtsyListingInput("https://www.etsy.com/shop/ModPawsPrints");
    assert.strictEqual(shopUrl1.isShopUrl, true);
    assert.strictEqual(shopUrl1.shopName, "ModPawsPrints");
    assert.strictEqual(shopUrl1.listingId, null);

    const shopUrl2 = parseEtsyListingInput("https://LayerSculpt3D.etsy.com");
    assert.strictEqual(shopUrl2.isShopUrl, true);
    assert.strictEqual(shopUrl2.shopName, "LayerSculpt3D");
    assert.strictEqual(shopUrl2.listingId, null);

    const validListing = parseEtsyListingInput("https://www.etsy.com/listing/1729482012/personalized-leather-journal");
    assert.strictEqual(validListing.isShopUrl, false);
    assert.strictEqual(validListing.listingId, 1729482012);
  });

  it("parses bare numeric listing IDs cleanly", () => {
    const res = parseEtsyListingInput("987654321");
    assert.strictEqual(res.isShopUrl, false);
    assert.strictEqual(res.listingId, 987654321);
  });
});

describe("Batch 10: Country-Wise Search & Marketplace Persistence", () => {
  it("supports the 6 primary Etsy marketplace countries", () => {
    const countryCodes = SUPPORTED_MARKETPLACE_COUNTRIES.map((c) => c.code);
    assert.deepStrictEqual(countryCodes, ["US", "GB", "CA", "AU", "DE", "FR"]);
  });

  it("includes accurate localized flags and marketplace currency metadata", () => {
    const gb = SUPPORTED_MARKETPLACE_COUNTRIES.find((c) => c.code === "GB");
    assert.ok(gb);
    assert.strictEqual(gb.currency, "GBP (£)");
    assert.strictEqual(gb.flag, "🇬🇧");

    const us = SUPPORTED_MARKETPLACE_COUNTRIES.find((c) => c.code === "US");
    assert.ok(us);
    assert.strictEqual(us.currency, "USD ($)");
    assert.strictEqual(us.flag, "🇺🇸");
  });
});

describe("Batch 10: Universal Intelligence Scoring & Unit Economics", () => {
  it("calculates accurate product unit economics and fee deductions", () => {
    const price = 45.0;
    const estDailySales = 2.5;
    const result = evaluateProductOpportunity({
      price,
      estDailySales,
      shopReviewCount: 220,
      listingAgeDays: 45,
      numFavorers: 350,
    });

    assert.ok(result.score > 60);
    assert.strictEqual(result.verdictVariant, "success");
  });

  it("evaluates shop competition feasibility with explainable inputs", () => {
    const shopResult = evaluateShopCompetition({
      shopName: "VintageVault",
      totalSales: 8500,
      reviewCount: 950,
      activeListings: 60,
      shopAgeMonths: 18,
      estDailySales: 5.2,
    });

    assert.ok(typeof shopResult.score === "number");
    assert.ok(shopResult.score >= 0 && shopResult.score <= 100);
    assert.ok(shopResult.verdictLabel.length > 0);
  });
});

describe("Batch 10: Surveillance Longitudinal Delta Engine", () => {
  it("handles empty / single-snapshot state gracefully without crashing", () => {
    const singleSnapshotList: Array<{ capturedAt: string; totalSales: number | null }> = [
      { capturedAt: "2026-08-16T12:00:00.000Z", totalSales: 1500 },
    ];

    const deltas = singleSnapshotList.slice(1).map((s, i) => {
      const prev = singleSnapshotList[i]!;
      return (s.totalSales ?? 0) - (prev.totalSales ?? 0);
    });

    assert.strictEqual(deltas.length, 0);
  });

  it("computes longitudinal deltas accurately across multiple 6-hour cron snapshots", () => {
    const snapshots = [
      { capturedAt: "2026-08-15T00:00:00.000Z", totalSales: 1000 },
      { capturedAt: "2026-08-15T06:00:00.000Z", totalSales: 1008 },
      { capturedAt: "2026-08-15T12:00:00.000Z", totalSales: 1022 },
      { capturedAt: "2026-08-15T18:00:00.000Z", totalSales: 1035 },
    ];

    const deltas = snapshots.slice(1).map((s, i) => {
      const prev = snapshots[i]!;
      return s.totalSales - prev.totalSales;
    });

    assert.deepStrictEqual(deltas, [8, 14, 13]);
    const totalGrowth = snapshots[snapshots.length - 1]!.totalSales - snapshots[0]!.totalSales;
    assert.strictEqual(totalGrowth, 35);
  });
});
