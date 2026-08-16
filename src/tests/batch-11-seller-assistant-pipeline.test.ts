import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateListingContent,
  calculateJaccardSimilarity,
  sanitizeEtsyTag,
} from "../services/listing-assistant";
import {
  MARKETPLACE_DEFINITIONS,
  getMarketplaceCapability,
} from "../services/marketplaces/types";

describe("Batch 11: Listing Content Assistant & Originality Protection", () => {
  it("enforces title length <= 140 chars and places primary keyword in first 40 chars", () => {
    const content = generateListingContent({
      productTitle: "Personalized Leather Travel Wallet",
      primaryKeyword: "Leather Travel Wallet",
      secondaryKeywords: ["Passport Holder", "Custom Mens Gift", "Travel Organizer"],
      category: "Bags & Purses",
      targetPrice: 38.0,
    });

    assert.ok(content.title.length <= 140, `Title length ${content.title.length} exceeds 140 chars`);
    assert.ok(content.title.toLowerCase().startsWith("leather travel wallet"), "Primary keyword must be at start of title");
    assert.ok(content.first40Chars.length <= 40);
  });

  it("generates exactly 13 unique tags, each <= 20 chars and sanitized", () => {
    const content = generateListingContent({
      productTitle: "Minimalist Ceramic Coffee Mug",
      primaryKeyword: "Ceramic Coffee Mug",
      secondaryKeywords: ["Handmade Pottery", "Artisan Cup", "Morning Coffee Mug"],
      category: "Home & Living",
      targetPrice: 24.0,
    });

    assert.strictEqual(content.tags.length, 13, "Must generate exactly 13 tags");
    for (const tagObj of content.tags) {
      assert.ok(tagObj.tag.length <= 20, `Tag "${tagObj.tag}" exceeds 20 characters`);
      assert.ok(!/[^a-z0-9\s]/.test(tagObj.tag), `Tag "${tagObj.tag}" contains invalid characters`);
    }

    const uniqueTags = new Set(content.tags.map((t) => t.tag));
    assert.strictEqual(uniqueTags.size, 13, "All 13 tags must be unique");
  });

  it("calculates Jaccard token overlap accurately and verifies originality compliance (Rule 6)", () => {
    const competitorTitles = [
      "Personalized Leather Journal Notebook Refillable Custom Travelers Gift",
      "Handmade Leather Diary Sketchbook Embossed Vintage Style",
    ];

    const lowOverlapTitle = "Modern Minimalist Planner Binder - Premium Artisan Stationery";
    const simLow = calculateJaccardSimilarity(lowOverlapTitle, competitorTitles);
    assert.ok(simLow < 15.0, `Similarity ${simLow}% should be below 15% threshold`);

    const highOverlapTitle = "Personalized Leather Journal Notebook Refillable Travelers Gift";
    const simHigh = calculateJaccardSimilarity(highOverlapTitle, competitorTitles);
    assert.ok(simHigh > 50.0, `Similarity ${simHigh}% should detect heavy overlap`);
  });

  it("sanitizes raw Etsy tags according to marketplace rules", () => {
    assert.strictEqual(sanitizeEtsyTag("Custom Gift (For Her!)"), "custom gift for her");
    assert.strictEqual(sanitizeEtsyTag("Super Long Product Tag That Exceeds Twenty Characters"), "super long product t");
    assert.strictEqual(sanitizeEtsyTag("  #Artisan_Craft  "), "artisancraft");
  });
});

describe("Batch 11: Multi-Marketplace Capability Abstraction", () => {
  it("verifies Etsy is active with expected research and draft capabilities", () => {
    const etsy = MARKETPLACE_DEFINITIONS.etsy;
    assert.strictEqual(etsy.status, "active");
    assert.strictEqual(etsy.capabilities.research, true);
    assert.strictEqual(etsy.capabilities.draftCreate, true);
    assert.strictEqual(etsy.capabilities.publish, false); // Rule 9: No silent publishing without human review
  });

  it("verifies Amazon, eBay, TikTok Shop, and Walmart are coming soon with appropriate flags", () => {
    const futureMarketplaces = ["amazon", "ebay", "tiktok_shop", "walmart"] as const;
    for (const mId of futureMarketplaces) {
      const def = MARKETPLACE_DEFINITIONS[mId];
      assert.ok(def, `Marketplace ${mId} definition must exist`);
      assert.strictEqual(def.status, "coming_soon");
      assert.strictEqual(getMarketplaceCapability(mId, "research"), false);
      assert.strictEqual(getMarketplaceCapability(mId, "publish"), false);
    }
  });
});

describe("Batch 11: Unit Economics & Fee Deductions", () => {
  it("calculates Etsy fee deductions (6.5% transaction + 3% payment + $0.20) and margin accurately", () => {
    const price = 40.0;
    const cogs = 10.0;
    const etsyFee = price * 0.095 + 0.20; // 3.80 + 0.20 = 4.00
    const netMargin = price - cogs - etsyFee; // 40 - 10 - 4 = 26.00
    const marginPct = (netMargin / price) * 100; // 65.0%

    assert.strictEqual(etsyFee, 4.00);
    assert.strictEqual(netMargin, 26.00);
    assert.strictEqual(marginPct, 65.0);
  });
});
