import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateProductOpportunity,
  evaluateShopCompetition,
  getScoreTier,
} from "../services/intelligence/universal-scoring";
import { calculateShopDeltas } from "../services/tracking-engine";

describe("Universal Intelligence Scoring Architecture", () => {
  it("evaluates high-velocity, high-margin product opportunity deterministically", () => {
    const result = evaluateProductOpportunity({
      price: 34.0,
      estDailySales: 4.5,
      shopReviewCount: 180,
      listingAgeDays: 65,
      numFavorers: 850,
    });

    assert.equal(typeof result.score, "number");
    assert.ok(result.score >= 70, `Score should be high, got ${result.score}`);
    assert.equal(result.provenance, "SELLERSALT_SCORE");
    assert.equal(result.factors.length, 4);

    // Factors point sum should match score
    const factorPointsSum = result.factors.reduce((sum, f) => sum + f.pointsContributed, 0);
    assert.equal(result.score, factorPointsSum);

    // Discloses human-readable explainable inputs
    assert.ok(result.summary.length > 0);
    assert.ok(result.explanation.length > 0);
  });

  it("evaluates saturated incumbent competitor shop with appropriate barrier rating", () => {
    const result = evaluateShopCompetition({
      shopName: "MassIncumbentStore",
      totalSales: 85000,
      reviewCount: 9500,
      activeListings: 1200,
      shopAgeMonths: 72,
      estDailySales: 35.0,
    });

    assert.equal(typeof result.score, "number");
    assert.ok(result.factors.some((f) => f.id === "reviewMoat"));
    assert.equal(result.provenance, "SELLERSALT_SCORE");
  });

  it("maps numeric score boundaries accurately to standardized tiers", () => {
    assert.equal(getScoreTier(92).tier, "EXCELLENT");
    assert.equal(getScoreTier(75).tier, "STRONG");
    assert.equal(getScoreTier(55).tier, "MODERATE");
    assert.equal(getScoreTier(35).tier, "HIGH_BARRIER");
    assert.equal(getScoreTier(15).tier, "UNFAVORABLE");
  });
});

describe("Tracking Engine: 6-Hour & Longitudinal Deltas", () => {
  it("calculates 6-hour, 24-hour, and 7-day deltas from historical snapshots", () => {
    const now = new Date();
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const snapshots = [
      {
        id: "snap-1",
        shopWatchId: "watch-1",
        totalSales: 1000,
        reviewCount: 150,
        reviewAverage: 4.9,
        activeListings: 40,
        numFavorers: 200,
        capturedAt: threeDaysAgo.toISOString(),
      },
      {
        id: "snap-2",
        shopWatchId: "watch-1",
        totalSales: 1020,
        reviewCount: 151,
        reviewAverage: 4.9,
        activeListings: 41,
        numFavorers: 205,
        capturedAt: twelveHoursAgo.toISOString(),
      },
      {
        id: "snap-3",
        shopWatchId: "watch-1",
        totalSales: 1032,
        reviewCount: 152,
        reviewAverage: 4.9,
        activeListings: 42,
        numFavorers: 210,
        capturedAt: fourHoursAgo.toISOString(),
      },
      {
        id: "snap-4",
        shopWatchId: "watch-1",
        totalSales: 1040,
        reviewCount: 153,
        reviewAverage: 4.9,
        activeListings: 42,
        numFavorers: 215,
        capturedAt: now.toISOString(),
      },
    ];

    const deltas = calculateShopDeltas(snapshots);

    // Latest delta = 1040 - 1032 = 8
    assert.equal(deltas.salesDeltaToday, 8);
    // 6-hour delta (from snap-3 4hrs ago) = 1040 - 1032 = 8
    assert.equal(deltas.salesDelta6h, 8);
    // 24-hour delta (from snap-2 12hrs ago) = 1040 - 1020 = 20
    assert.equal(deltas.salesDelta24h, 20);
    // 7-day delta (from snap-1 3 days ago) = 1040 - 1000 = 40
    assert.equal(deltas.salesDelta7d, 40);
    assert.equal(deltas.listingDelta, 0); // 42 - 42
    assert.equal(deltas.reviewDelta, 1);  // 153 - 152
  });
});
