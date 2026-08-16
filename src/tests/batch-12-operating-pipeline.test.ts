import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildOpportunityPackage } from "../services/listing-strategy";
import {
  getProductNextAction,
  getKeywordNextAction,
  getPlannerNextAction,
} from "../services/intelligence/next-best-action";
import { generateListingContent } from "../services/listing-assistant";

describe("Batch 12: Opportunity Package & Listing Strategy Plan", () => {
  it("builds an Opportunity Package with 6-pillar strategy and accurate unit economics", () => {
    const pkg = buildOpportunityPackage({
      productTitle: "Handmade Leather Passport Holder",
      price: 36.0,
      estimatedCogs: 9.0,
      category: "Bags & Purses",
      shopName: "ArtisanCrafts",
      shopTotalSales: 3500,
      shopReviewCount: 420,
      estDailySales: 3.5,
      opportunityScore: 84,
      primaryKeyword: "Leather Passport Holder",
      secondaryKeywords: ["Travel Wallet", "Custom Mens Gift"],
    });

    assert.ok(pkg.strategy, "Strategy object must exist");
    assert.strictEqual(pkg.strategy.recommendationVerdict, "STRONG_OPPORTUNITY");
    assert.strictEqual(pkg.product.price, 36.0);
    assert.strictEqual(pkg.economics.sellingPrice, 36.0);

    // Etsy Fee: 36 * 0.095 + 0.20 = 3.42 + 0.20 = 3.62
    assert.strictEqual(pkg.economics.etsyFees, 3.62);
    // Net profit: 36 - 9 - 3.62 = 23.38
    assert.strictEqual(pkg.economics.netProfit, 23.38);
    // Margin %: (23.38 / 36) * 100 = 64.9%
    assert.ok(pkg.economics.profitMarginPercent > 60.0);

    // Verify 6 strategy pillars exist
    assert.ok(pkg.strategy.positioning.length > 0);
    assert.ok(pkg.strategy.primaryBuyerIntent.length > 0);
    assert.ok(pkg.strategy.keywordStrategy.includes("Leather Passport Holder"));
    assert.ok(pkg.strategy.pricingStrategy.includes("$36.00"));
    assert.ok(pkg.strategy.differentiation.length > 0);
    assert.ok(pkg.strategy.competitiveRisk.length > 0);
  });

  it("assigns WEAK_OPPORTUNITY when margin is low or score is below threshold", () => {
    const pkg = buildOpportunityPackage({
      productTitle: "Commodity Plastic Trinket",
      price: 10.0,
      estimatedCogs: 8.5, // leaves almost no margin after Etsy fees
      opportunityScore: 42,
    });

    assert.strictEqual(pkg.strategy.recommendationVerdict, "WEAK_OPPORTUNITY");
    assert.ok(pkg.economics.profitMarginPercent < 25);
  });
});

describe("Batch 12: Universal Next Best Action Engine", () => {
  it("recommends shortlisting for high opportunity score products", () => {
    const action = getProductNextAction({
      opportunityScore: 85,
      estDailySales: 4.2,
      shopReviewCount: 120,
      price: 32.0,
      isShortlisted: false,
    });

    assert.strictEqual(action.id, "shortlist-opportunity");
    assert.strictEqual(action.urgency, "HIGH");
    assert.strictEqual(action.actionHref, "/planner");
  });

  it("recommends adding keywords to planner for high opportunity / low competition keywords", () => {
    const action = getKeywordNextAction({
      keyword: "custom ceramic planter",
      opportunityScore: 78,
      competitionLevel: "LOW",
      searchVolumeEstimated: 1400,
    });

    assert.strictEqual(action.id, "add-keywords-to-planner");
    assert.strictEqual(action.urgency, "HIGH");
    assert.strictEqual(action.actionHref, "/planner");
  });

  it("recommends pre-flight draft creation when content is generated", () => {
    const action = getPlannerNextAction({
      status: "CONTENT_READY",
      hasStrategy: true,
      hasContent: true,
      hasDraft: false,
    });

    assert.strictEqual(action.id, "run-preflight-draft");
    assert.strictEqual(action.urgency, "HIGH");
  });
});

describe("Batch 12: Content Assistant 2.0 Integration", () => {
  it("generates 10-part structured description and attribute suggestions", () => {
    const content = generateListingContent({
      productTitle: "Artisan Ceramic Espresso Cup",
      primaryKeyword: "Ceramic Espresso Cup",
      secondaryKeywords: ["Handmade Coffee Mug", "Pottery Cup"],
      category: "Home & Living",
      targetPrice: 22.0,
    });

    assert.strictEqual(content.tags.length, 13);
    assert.ok(content.title.length <= 140);
    assert.ok(content.description.includes("WHY YOU'LL LOVE IT"));
    assert.ok(content.description.includes("SHIPPING & CAREFUL PACKAGING"));
    assert.ok(content.description.includes("CARE INSTRUCTIONS"));
    assert.ok(Object.keys(content.attributes).length >= 4);
  });
});
