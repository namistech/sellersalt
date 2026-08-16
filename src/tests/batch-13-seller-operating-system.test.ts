import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateSellerHealthScore } from "../services/intelligence/seller-health";
import {
  getProductNextAction,
  getKeywordNextAction,
  getPlannerNextAction,
} from "../services/intelligence/next-best-action";

describe("Batch 13: Seller Health Score Engine", () => {
  it("calculates multi-factor composite score (0-100) with explainable factor breakdown", () => {
    const report = calculateSellerHealthScore({
      shortlistedCount: 8,
      avgOpportunityScore: 85,
      keywordClusterCount: 4,
      tagCompliancePercent: 90,
      draftsReadyCount: 3,
      avgMarginPercent: 65,
      avgDailySales: 3.5,
    });

    assert.ok(report.overallScore >= 75, `Score ${report.overallScore} should be in strong/elite tier`);
    assert.strictEqual(report.provenance, "SELLERSALT_SCORE");
    assert.ok(report.factors.opportunityScore > 0);
    assert.ok(report.factors.keywordCoverageScore > 0);
    assert.ok(report.factors.listingQualityScore > 0);
    assert.ok(report.factors.pricingMarginScore > 0);
    assert.ok(report.factors.velocityMomentumScore > 0);

    // Verify biggest weakness and opportunity diagnosis
    assert.ok(report.biggestWeakness.factor.length > 0);
    assert.ok(report.biggestOpportunity.headline.length > 0);
    assert.ok(report.recommendedAction.actionLabel.length > 0);
  });

  it("assigns NEEDS_OPTIMIZATION or AT_RISK tier when catalog margins or velocity are low", () => {
    const report = calculateSellerHealthScore({
      shortlistedCount: 1,
      avgOpportunityScore: 35,
      keywordClusterCount: 1,
      tagCompliancePercent: 40,
      draftsReadyCount: 0,
      avgMarginPercent: 18,
      avgDailySales: 0.2,
    });

    assert.ok(report.overallScore < 50, `Score ${report.overallScore} should be in needs optimization/at-risk tier`);
    assert.ok(["NEEDS_OPTIMIZATION", "AT_RISK"].includes(report.tier));
  });
});

describe("Batch 13: 10-Stage Operating Pipeline & Next Best Action", () => {
  it("verifies actionable recommendations across pipeline stages", () => {
    // Stage 1: Product Shortlist
    const pAction = getProductNextAction({
      opportunityScore: 82,
      estDailySales: 3.8,
      shopReviewCount: 95,
      price: 34.0,
      isShortlisted: false,
    });
    assert.strictEqual(pAction.id, "shortlist-opportunity");
    assert.strictEqual(pAction.urgency, "HIGH");

    // Stage 4: Keyword Cluster
    const kAction = getKeywordNextAction({
      keyword: "personalized leather luggage tag",
      opportunityScore: 80,
      competitionLevel: "LOW",
      searchVolumeEstimated: 1200,
    });
    assert.strictEqual(kAction.id, "add-keywords-to-planner");

    // Stage 6: Content -> Pre-Flight Draft
    const plAction = getPlannerNextAction({
      status: "CONTENT_READY",
      hasStrategy: true,
      hasContent: true,
      hasDraft: false,
    });
    assert.strictEqual(plAction.id, "run-preflight-draft");
  });
});
