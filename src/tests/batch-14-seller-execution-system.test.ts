import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateOpportunityScore } from "../services/intelligence/opportunity-scoring";
import { evaluatePublishedListing } from "../services/intelligence/post-publish-monitoring";
import { getMarketIntelligenceFeed } from "../services/intelligence/market-feed";

describe("Batch 14: Opportunity Scoring Engine (v2)", () => {
  it("calculates 0-100 opportunity score with complete mathematical point breakdown", () => {
    const opp = evaluateOpportunityScore({
      price: 45.0,
      estimatedCogs: 12.0,
      estDailySales: 3.5,
      shopReviewCount: 180,
      competingListingsCount: 320,
      keywordCount: 10,
      tagComplianceRate: 0.92,
    });

    assert.ok(opp.overallScore >= 75, `Overall score ${opp.overallScore} should be in high tier`);
    assert.strictEqual(opp.provenance, "SELLERSALT_SCORE");
    assert.strictEqual(opp.weights.demand, 0.30);
    assert.strictEqual(opp.weights.margin, 0.25);
    assert.strictEqual(opp.weights.competition, 0.20);
    assert.strictEqual(opp.weights.keyword, 0.15);
    assert.strictEqual(opp.weights.reviewBarrier, 0.10);

    // Verify explainable inputs (Rule 5)
    assert.ok(opp.explanation.whyThisScore.includes(`${opp.overallScore}/100`));
    assert.ok(opp.explanation.primaryStrength.length > 0);
  });

  it("assigns WEAK_OPPORTUNITY when unit margin is low or competition is intense", () => {
    const opp = evaluateOpportunityScore({
      price: 15.0,
      estimatedCogs: 12.0, // Low margin
      estDailySales: 0.5,
      shopReviewCount: 8500, // Deep moat
      competingListingsCount: 4500,
    });

    assert.ok(opp.overallScore < 50);
    assert.strictEqual(opp.verdict, "WEAK_OPPORTUNITY");
  });
});

describe("Batch 14: Post-Publish Listing Intelligence", () => {
  it("recommends product variation expansion when listing outperforms forecast", () => {
    const diagnosis = evaluatePublishedListing({
      etsyListingId: "123456789",
      title: "Artisan Leather Wallet",
      price: 45.0,
      publishedDaysAgo: 14,
      totalSales: 48,
      dailyVelocity: 3.4,
      categoryBenchmarkVelocity: 1.8,
      forecastOpportunityVelocity: 2.2,
      tagComplianceCount: 13,
      first40CharsKeywordMatch: true,
      favoritesCount: 82,
    });

    assert.strictEqual(diagnosis.status, "OUTPERFORMING");
    assert.strictEqual(diagnosis.recommendedAction.id, "expand-product-variations");
  });

  it("recommends SEO optimization when listing trails forecast or lacks 13 tags", () => {
    const diagnosis = evaluatePublishedListing({
      etsyListingId: "987654321",
      title: "Leather Wallet",
      price: 45.0,
      publishedDaysAgo: 20,
      totalSales: 4,
      dailyVelocity: 0.2,
      categoryBenchmarkVelocity: 1.8,
      forecastOpportunityVelocity: 2.2,
      tagComplianceCount: 7, // Missing 6 tags
      first40CharsKeywordMatch: false,
    });

    assert.strictEqual(diagnosis.status, "NEEDS_OPTIMIZATION");
    assert.strictEqual(diagnosis.recommendedAction.id, "optimize-live-listing-seo");
    assert.strictEqual(diagnosis.recommendedAction.urgency, "HIGH");
  });
});

describe("Batch 14: Market Intelligence Feed", () => {
  it("generates verified actionable market signals with data provenance", () => {
    const feed = getMarketIntelligenceFeed();
    assert.ok(feed.length >= 4);

    for (const signal of feed) {
      assert.ok(signal.id.length > 0);
      assert.ok(signal.title.length > 0);
      assert.ok(signal.whatHappened.length > 0);
      assert.ok(signal.whyItMatters.length > 0);
      assert.ok(signal.actionHref.length > 0);
      assert.ok(["ACTUAL_ETSY_DATA", "ESTIMATED", "SELLERSALT_SCORE"].includes(signal.provenance));
    }
  });
});
