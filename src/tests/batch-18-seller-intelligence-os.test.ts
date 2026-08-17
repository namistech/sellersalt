import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateOpportunityDedupeKey,
  upsertCanonicalOpportunity,
  getCanonicalOpportunities,
  updateOpportunityStage,
  dismissOpportunity,
  reopenOpportunity,
  calculatePipelineHealth,
  compareOpportunities,
  calculateCanonicalScore,
  calculateUnitEconomics,
} from "@/services/opportunity-memory";
import {
  resolveNextBestAction,
  getProductNextAction,
  getKeywordNextAction,
  getPlannerNextAction,
  getCompetitorNextAction,
  getPublishedListingNextAction,
} from "@/services/intelligence/next-best-action";
import { getOwnShopIntelligence } from "@/services/own-shop-intelligence";
import { generateIntelligenceAlert } from "@/services/intelligence-alerts";
import { MARKETPLACE_DEFINITIONS } from "@/services/marketplaces/types";
import { PLAN_DEFINITIONS, isTierSufficient, getFeatureAccess } from "@/services/plans/plan-capabilities";
import type { CanonicalOpportunity } from "@/types/opportunity";

test("Batch 18: Canonical Opportunity Identity & Deduplication", async (t) => {
  const orgId = `org_test_dedupe_${Date.now()}`;

  await t.test("generates deterministic deduplication keys", () => {
    const key1 = generateOpportunityDedupeKey("etsy", { listingExternalId: "12345678" });
    const key2 = generateOpportunityDedupeKey("ETSY", { listingExternalId: "12345678" });
    assert.equal(key1, "etsy_listing_12345678");
    assert.equal(key1, key2);

    const kwKey = generateOpportunityDedupeKey("etsy", { primaryKeyword: "Leather Wallet " });
    assert.equal(kwKey, "etsy_kw_leather wallet");
  });

  await t.test("enriches existing opportunity on rediscovery without duplicating", () => {
    const res1 = upsertCanonicalOpportunity(orgId, {
      source: "PRODUCT_RESEARCH",
      listingExternalId: "listing_alpha_99",
      listingTitle: "Handmade Leather Card Holder",
      primaryKeyword: "leather card holder",
      price: 28.0,
      estDailySales: 3.5,
      stage: "RESEARCHED",
    });

    assert.equal(res1.isNew, true);
    assert.equal(res1.opportunity.listingTitle, "Handmade Leather Card Holder");

    // Shortlist the opportunity
    updateOpportunityStage(orgId, res1.opportunity.id, "SHORTLISTED");

    // Rediscover the same listing from Competitor Surveillance with updated price
    const res2 = upsertCanonicalOpportunity(orgId, {
      source: "COMPETITOR_SURVEILLANCE",
      listingExternalId: "listing_alpha_99",
      listingTitle: "Handmade Leather Card Holder (Updated)",
      primaryKeyword: "leather card holder",
      price: 32.0,
      estDailySales: 4.5,
    });

    assert.equal(res2.isNew, false);
    assert.equal(res2.opportunity.id, res1.opportunity.id);
    assert.equal(res2.opportunity.economics.price, 32.0);
    assert.equal(res2.opportunity.stage, "SHORTLISTED", "Preserves user workflow stage");
  });
});

test("Batch 18: Opportunity Lifecycle & Reversible Dismissal", async (t) => {
  const orgId = `org_test_lifecycle_${Date.now()}`;

  const { opportunity } = upsertCanonicalOpportunity(orgId, {
    source: "PRODUCT_RESEARCH",
    listingExternalId: "listing_life_101",
    listingTitle: "Ceramic Coffee Pour Over",
    primaryKeyword: "ceramic pour over",
    price: 38.0,
    stage: "RESEARCHED",
  });

  await t.test("advances through canonical pipeline stages", () => {
    const updated1 = updateOpportunityStage(orgId, opportunity.id, "SHORTLISTED");
    assert.equal(updated1?.stage, "SHORTLISTED");
    assert.equal(updated1?.status, "SHORTLISTED");

    const updated2 = updateOpportunityStage(orgId, opportunity.id, "STRATEGY");
    assert.equal(updated2?.stage, "STRATEGY");
    assert.equal(updated2?.status, "STRATEGY_READY");

    const updated3 = updateOpportunityStage(orgId, opportunity.id, "PUBLISHED");
    assert.equal(updated3?.stage, "PUBLISHED");
    assert.equal(updated3?.status, "PUBLISHED");
  });

  await t.test("supports reversible dismissal", () => {
    const dismissed = dismissOpportunity(orgId, opportunity.id, "Not fit for current season");
    assert.equal(dismissed?.isDismissed, true);
    assert.equal(dismissed?.dismissedReason, "Not fit for current season");
    assert.equal(dismissed?.status, "DISMISSED");

    // Dismissed items are excluded from active queries
    const active = getCanonicalOpportunities(orgId, { tab: "ALL" });
    assert.ok(!active.some((o) => o.id === opportunity.id));

    // Dismissed items are included in dismissed tab
    const dismissedList = getCanonicalOpportunities(orgId, { tab: "DISMISSED" });
    assert.ok(dismissedList.some((o) => o.id === opportunity.id));

    // Reopen dismissed opportunity
    const reopened = reopenOpportunity(orgId, opportunity.id);
    assert.equal(reopened?.isDismissed, false);
    assert.equal(reopened?.dismissedReason, null);

    const activeAfter = getCanonicalOpportunities(orgId, { tab: "ALL" });
    assert.ok(activeAfter.some((o) => o.id === opportunity.id));
  });
});

test("Batch 18: Research Snapshots & Score Provenance", async (t) => {
  await t.test("calculates transparent score breakdown with formula", () => {
    const scoreResult = calculateCanonicalScore({
      estDailySales: 6.5,
      activeListings: 45,
      totalSales: 2400,
      reviewCount: 35,
      shopAgeMonths: 12,
      discoveredAt: new Date(),
    });

    assert.ok(scoreResult.score >= 10 && scoreResult.score <= 99);
    assert.ok(scoreResult.breakdown.velocityPoints > 0);
    assert.ok(scoreResult.breakdown.densityPoints > 0);
    assert.ok(scoreResult.breakdown.competitionPoints > 0);
    assert.ok(scoreResult.breakdown.formula.includes("Velocity("));
  });

  await t.test("calculates transparent Etsy unit economics", () => {
    const economics = calculateUnitEconomics(40.0, 10.0);
    assert.equal(economics.price, 40.0);
    assert.equal(economics.estCogs, 10.0);
    assert.equal(economics.feeBreakdown.listingFee, 0.20);
    assert.equal(economics.feeBreakdown.transactionFee, 2.60); // 6.5% of 40
    assert.ok(economics.estNetProfit > 0);
    assert.ok(economics.marginPercent > 0);
  });
});

test("Batch 18: Next-Best-Action Engine 2.0 Decision Logic", async (t) => {
  await t.test("recommends Shortlist for high opportunity product", () => {
    const action = getProductNextAction({
      opportunityScore: 88,
      estDailySales: 5.2,
      shopReviewCount: 24,
      price: 34.0,
      isShortlisted: false,
    });

    assert.equal(action.id, "shortlist-opportunity");
    assert.equal(action.actionLabel, "Shortlist Product");
    assert.ok(action.signal.length > 0);
    assert.ok(action.interpretation.length > 0);
    assert.ok(action.whyYouShouldCare.length > 0);
    assert.equal(action.provenance, "SELLERSALT_SCORE");
  });

  await t.test("recommends Keyword Research for shortlisted product without keywords", () => {
    const action = getProductNextAction({
      opportunityScore: 82,
      estDailySales: 4.0,
      shopReviewCount: 40,
      price: 30.0,
      isShortlisted: true,
      hasKeywords: false,
    });

    assert.equal(action.id, "research-product-keywords");
    assert.equal(action.actionLabel, "Research Keywords");
    assert.ok(action.whyYouShouldCare.includes("first-page organic indexation"));
  });

  await t.test("recommends Human Review for created draft (Rule 9)", () => {
    const action = getPlannerNextAction({
      status: "DRAFT",
      hasStrategy: true,
      hasContent: true,
      hasDraft: true,
    });

    assert.equal(action.id, "review-draft-human-gate");
    assert.equal(action.actionLabel, "Review Draft");
    assert.ok(action.signal.includes("draft state and awaiting mandatory human review"));
    assert.equal(action.provenance, "ACTUAL_ETSY_DATA");
  });

  await t.test("recommends Optimization for underperforming published listing", () => {
    const action = getPublishedListingNextAction({
      listingTitle: "Espresso Mug",
      daysLive: 21,
      actualDailySales: 0.8,
      forecastDailySales: 2.5,
      seoScore: 70,
    });

    assert.equal(action.id, "optimize-underperforming-listing");
    assert.equal(action.actionLabel, "Optimize Listing SEO");
    assert.ok(action.whyYouShouldCare.includes("recover organic search rank"));
  });

  await t.test("recommends Competitor Analysis for sales velocity surge", () => {
    const action = getCompetitorNextAction({
      shopName: "ArtisanCrafts",
      salesGrowth7dPercent: 25,
    });

    assert.equal(action.id, "analyze-winning-listings");
    assert.equal(action.actionLabel, "Analyze Winning Listings");
    assert.ok(action.signal.includes("+25.0% over 7 days"));
  });
});

test("Batch 18: 10-Stage Pipeline Health & Bottleneck Diagnostics", async (t) => {
  const orgId = `org_test_pipeline_${Date.now()}`;

  const report = calculatePipelineHealth(orgId);

  await t.test("reports exactly 10 canonical pipeline stages", () => {
    assert.equal(report.stages.length, 10);
    assert.equal(report.stages[0].stage, "RESEARCHED");
    assert.equal(report.stages[1].stage, "SHORTLISTED");
    assert.equal(report.stages[4].stage, "STRATEGY");
    assert.equal(report.stages[5].stage, "CONTENT");
    assert.equal(report.stages[6].stage, "DRAFT");
    assert.equal(report.stages[7].stage, "REVIEW");
    assert.equal(report.stages[8].stage, "PUBLISHED");
    assert.equal(report.stages[9].stage, "MONITORING");
  });

  await t.test("identifies primary conversion bottleneck and fix CTA", () => {
    assert.ok(report.bottleneckStage);
    assert.ok(report.bottleneckLabel.includes("→"));
    assert.ok(report.fixBottleneckAction.label.startsWith("Fix Bottleneck:"));
    assert.ok(report.fixBottleneckAction.href.length > 0);
  });
});

test("Batch 18: Multi-Opportunity Tradeoff Comparison", async (t) => {
  const opp1: CanonicalOpportunity = {
    id: "opp_1",
    organizationId: "org_1",
    source: "PRODUCT_RESEARCH",
    marketplace: "etsy",
    listingTitle: "Leather Passport Cover",
    primaryKeyword: "leather passport",
    targetKeywords: ["leather passport"],
    opportunityScore: 92,
    confidenceScore: 90,
    classification: "EMERGING_WINNER",
    classificationLabel: "Emerging Winner",
    classificationEmoji: "🔥",
    reason: "High velocity",
    scoreBreakdown: {} as any,
    demand: { estDailySales: 7.2, estMonthlySales: 219, estMonthlyRevenue: 7665, totalSales: 3400, salesVelocityTrend: "ACCELERATING", numFavorers: null },
    competition: { activeListings: 180, reviewCount: 45, reviewAverage: 4.9, barrierLevel: "LOW", reviewMoatEstimateDays: 60, incumbentSaturation: "180 listings" },
    economics: { price: 35.0, currency: "USD", estCogs: 8.0, estEtsyFees: 3.5, estNetProfit: 23.5, marginPercent: 67, feeBreakdown: {} as any },
    provenance: "SELLERSALT_SCORE",
    stage: "SHORTLISTED",
    status: "SHORTLISTED",
    isDismissed: false,
    relations: {},
    historicalSnapshots: [],
    nextBestAction: {} as any,
    discoveredAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastObservedAt: new Date().toISOString(),
  };

  const opp2: CanonicalOpportunity = {
    ...opp1,
    id: "opp_2",
    listingTitle: "Handmade Wooden Shelf",
    opportunityScore: 84,
    demand: { ...opp1.demand, estDailySales: 3.1 },
    competition: { ...opp1.competition, activeListings: 45 },
    economics: { price: 75.0, currency: "USD", estCogs: 15.0, estEtsyFees: 7.0, estNetProfit: 53.0, marginPercent: 71, feeBreakdown: {} as any },
  };

  const tradeoffs = compareOpportunities([opp1, opp2]);

  await t.test("identifies best opportunity and best margin winners accurately", () => {
    assert.equal(tradeoffs.bestOpportunityId, "opp_1", "opp1 has highest score (92 vs 84)");
    assert.equal(tradeoffs.bestMarginId, "opp_2", "opp2 has highest margin % (71% vs 67%)");
    assert.equal(tradeoffs.lowestCompetitionId, "opp_2", "opp2 has fewer active listings (45 vs 180)");
    assert.equal(tradeoffs.fastestMomentumId, "opp_1", "opp1 has higher daily sales (7.2 vs 3.1)");
    assert.ok(tradeoffs.comparisonSummary.includes("Leather Passport Cover"));
  });
});

test("Batch 18: Seller Own-Shop Intelligence & Capability Matrix", async (t) => {
  const orgId = `org_test_own_shop_${Date.now()}`;
  const report = await getOwnShopIntelligence(orgId);

  await t.test("provides store health with strict provenance separation", () => {
    assert.ok(report.healthScore >= 0 && report.healthScore <= 100);
    assert.equal(report.actualData.provenance, "ACTUAL_ETSY_DATA");
    assert.equal(report.estimatedMetrics.provenance, "ESTIMATED");
  });

  await t.test("evaluates connector capabilities without fabricating live publish", () => {
    assert.equal(report.capabilities.shopRead.state, "AVAILABLE");
    assert.equal(report.capabilities.listingRead.state, "AVAILABLE");
    assert.equal(report.capabilities.seoAudit.state, "AVAILABLE");
    assert.equal(report.capabilities.directPublishing.state, "NOT_SUPPORTED", "Rule 9 prevents silent auto-publish");
  });
});

test("Batch 18: Meaningful Intelligence Alerts Generation", async (t) => {
  await t.test("generates alert on competitor spike meeting threshold (>=15%)", () => {
    const alert = generateIntelligenceAlert({
      organizationId: "org_1",
      type: "COMPETITOR_ACCELERATION",
      title: "ArtisanStudio",
      data: { shopName: "ArtisanStudio", growthPercent: 24.5 },
    });

    assert.ok(alert !== null);
    assert.equal(alert?.category, "competitor");
    assert.ok(alert?.title.includes("🔥 Competitor Acceleration"));
  });

  await t.test("suppresses alert on sub-threshold competitor movement (<15%)", () => {
    const alert = generateIntelligenceAlert({
      organizationId: "org_1",
      type: "COMPETITOR_ACCELERATION",
      title: "QuietShop",
      data: { shopName: "QuietShop", growthPercent: 6.2 },
    });

    assert.equal(alert, null, "Suppresses alert to prevent notification spam");
  });

  await t.test("generates alert on listing underperformance (>25% below forecast)", () => {
    const alert = generateIntelligenceAlert({
      organizationId: "org_1",
      type: "LISTING_UNDERPERFORMANCE",
      title: "Ceramic Mug",
      data: { actualVelocity: 1.0, forecastVelocity: 2.5 },
    });

    assert.ok(alert !== null);
    assert.equal(alert?.category, "listing");
    assert.ok(alert?.title.includes("⚠ Listing Underperforming"));
  });
});

test("Batch 18: Multi-Marketplace Capability Declarations", async (t) => {
  await t.test("Etsy is active with draft creation capability", () => {
    const etsy = MARKETPLACE_DEFINITIONS.etsy;
    assert.equal(etsy.status, "active");
    assert.equal(etsy.capabilities.research, true);
    assert.equal(etsy.capabilities.draftCreate, true);
    assert.equal(etsy.capabilities.publish, false, "Publishing is gated behind human review");
  });

  await t.test("Future marketplaces are cleanly declared as coming soon", () => {
    assert.equal(MARKETPLACE_DEFINITIONS.amazon.status, "coming_soon");
    assert.equal(MARKETPLACE_DEFINITIONS.ebay.status, "coming_soon");
    assert.equal(MARKETPLACE_DEFINITIONS.tiktok_shop.status, "coming_soon");
    assert.equal(MARKETPLACE_DEFINITIONS.walmart.status, "coming_soon");
  });
});

test("Batch 18: Multi-Tenant Scoping & Security", async (t) => {
  const orgAlpha = `org_sec_alpha_${Date.now()}`;
  const orgBeta = `org_sec_beta_${Date.now()}`;

  upsertCanonicalOpportunity(orgAlpha, {
    source: "PRODUCT_RESEARCH",
    listingExternalId: "alpha_exclusive_item",
    listingTitle: "Alpha Secret Strategy Product",
    price: 50.0,
  });

  await t.test("strictly isolates organization opportunity queries", () => {
    const alphaOpps = getCanonicalOpportunities(orgAlpha);
    const betaOpps = getCanonicalOpportunities(orgBeta);

    assert.ok(alphaOpps.some((o) => o.listingExternalId === "alpha_exclusive_item"));
    assert.ok(!betaOpps.some((o) => o.listingExternalId === "alpha_exclusive_item"), "Zero cross-tenant leakage to orgBeta");
  });
});
