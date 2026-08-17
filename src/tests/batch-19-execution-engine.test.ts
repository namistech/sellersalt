import { test } from "node:test";
import assert from "node:assert/strict";
import {
  executeStageTransition,
  validateExecutionTransition,
  type ExecutionLifecycleStage,
} from "@/services/execution-engine";
import {
  validateListingPreflight,
  type PreflightInput,
} from "@/services/listing-preflight-validator";
import {
  saveContentVersion,
  listContentVersions,
  restoreContentVersion,
  compareContentVersions,
} from "@/services/listing-content-studio";
import {
  upsertCanonicalOpportunity,
  getCanonicalOpportunities,
} from "@/services/opportunity-memory";
import { evaluatePublishedListing } from "@/services/intelligence/post-publish-monitoring";
import { getOwnShopIntelligence } from "@/services/own-shop-intelligence";
import { isTierSufficient, getFeatureAccess, PLAN_DEFINITIONS } from "@/services/plans/plan-capabilities";
import { MARKETPLACE_DEFINITIONS } from "@/services/marketplaces/types";
import { classifyEtsyUrl, extractListingIdFromUrl, extractShopNameFromUrl } from "../../extension/etsy/page-detector.js";

test("Batch 19: Execution Engine & Operational State Machine", async (t) => {
  const orgId = `org_exec_test_${Date.now()}`;

  // Seed test opportunity
  const { opportunity } = upsertCanonicalOpportunity(orgId, {
    source: "PRODUCT_RESEARCH",
    listingExternalId: "exec_item_999",
    listingTitle: "Handmade Ceramic Coffee Dripper",
    primaryKeyword: "ceramic coffee dripper",
    price: 36.0,
    stage: "RESEARCHED",
  });

  await t.test("successfully advances opportunity from RESEARCHED to SHORTLISTED", async () => {
    const res = await executeStageTransition({
      organizationId: orgId,
      opportunityId: opportunity.id,
      targetStage: "SHORTLISTED",
    });

    assert.equal(res.success, true);
    assert.equal(res.currentStage, "SHORTLISTED");
    assert.equal(res.previousStage, "RESEARCHED");
  });

  await t.test("successfully advances opportunity to KEYWORD_READY with keyword cluster", async () => {
    const res = await executeStageTransition({
      organizationId: orgId,
      opportunityId: opportunity.id,
      targetStage: "KEYWORD_READY",
      payload: {
        keywords: ["ceramic dripper", "pourover coffee", "artisan coffee maker"],
      },
    });

    assert.equal(res.success, true);
    assert.equal(res.currentStage, "KEYWORD_READY");
  });

  await t.test("blocks DRAFT_READY transition when content fails 13-tag pre-flight validation", async () => {
    const res = await executeStageTransition({
      organizationId: orgId,
      opportunityId: opportunity.id,
      targetStage: "DRAFT_READY",
      payload: {
        content: {
          title: "Ceramic Dripper",
          tags: ["dripper", "coffee"], // only 2 tags, needs 13
          description: "A nice coffee dripper.",
          price: 36.0,
        },
      },
    });

    assert.equal(res.success, false, "Transition should be blocked due to missing tags");
    assert.ok(res.blockers && res.blockers.length > 0);
    assert.ok(res.message.includes("blocked"));
  });

  await t.test("enforces Rule 9: Human approval gate required before PUBLISHED", async () => {
    const res = await executeStageTransition({
      organizationId: orgId,
      opportunityId: opportunity.id,
      targetStage: "PUBLISHED",
    });

    assert.equal(res.success, false);
    assert.ok(res.blockers?.some((b) => b.includes("Rule 9 Violation")));
  });
});

test("Batch 19: Listing Pre-Flight Validator", async (t) => {
  await t.test("passes a 100% compliant listing payload", () => {
    const validTags = [
      "ceramic dripper",
      "pourover coffee",
      "artisan mug",
      "handmade coffee",
      "barista gift",
      "kitchen aesthetic",
      "pottery dripper",
      "slow coffee maker",
      "coffee lover gift",
      "morning brew",
      "clay coffee filter",
      "handcrafted gift",
      "unique kitchenware",
    ];

    const result = validateListingPreflight({
      title: "Ceramic Coffee Dripper | Handmade Pour Over Maker with Artisan Glaze",
      tags: validTags,
      description: "Handmade ceramic coffee dripper crafted for the ultimate slow-brew experience.\n\nKey Specifications:\n- Food-safe ceramic glaze\n- Dimensions: 4.5 inches wide x 3.5 inches high\n- Fits standard #2 cone coffee filters\n\nCare Instructions:\nDishwasher safe, hand washing recommended.",
      price: 38.0,
      cogs: 9.0,
      primaryKeyword: "ceramic coffee dripper",
    });

    assert.equal(result.status, "READY");
    assert.equal(result.blockers.length, 0);
    assert.equal(result.seoScore, 100);
    assert.equal(result.contentScore, 100);
    assert.equal(result.economicsScore, 100);
    assert.ok(result.overallScore >= 90);
  });

  await t.test("flags oversized title (>140 chars) as a hard blocker", () => {
    const oversizedTitle = "A".repeat(145);
    const result = validateListingPreflight({
      title: oversizedTitle,
      tags: Array(13).fill("tag"),
      description: "Description text",
      price: 25.0,
    });

    assert.equal(result.status, "BLOCKED");
    assert.ok(result.blockers.some((b) => b.includes("exceeds Etsy maximum limit of 140 characters")));
  });

  await t.test("flags tags exceeding 20 chars as a hard blocker", () => {
    const invalidTags = [
      "extremely long tag over twenty characters",
      "tag two",
      "tag three",
      "tag four",
      "tag five",
      "tag six",
      "tag seven",
      "tag eight",
      "tag nine",
      "tag ten",
      "tag eleven",
      "tag twelve",
      "tag thirteen",
    ];

    const result = validateListingPreflight({
      title: "Handmade Ceramic Cup",
      tags: invalidTags,
      description: "Description text",
      price: 25.0,
    });

    assert.equal(result.status, "BLOCKED");
    assert.ok(result.blockers.some((b) => b.includes("exceed 20 characters") || b.includes("Tag character limit")));
  });

  await t.test("flags duplicate tags as a hard blocker", () => {
    const duplicateTags = [
      "coffee dripper",
      "coffee dripper", // duplicate
      "tag three",
      "tag four",
      "tag five",
      "tag six",
      "tag seven",
      "tag eight",
      "tag nine",
      "tag ten",
      "tag eleven",
      "tag twelve",
      "tag thirteen",
    ];

    const result = validateListingPreflight({
      title: "Handmade Coffee Dripper",
      tags: duplicateTags,
      description: "Description text",
      price: 25.0,
    });

    assert.equal(result.status, "BLOCKED");
    assert.ok(result.blockers.some((b) => b.includes("Duplicate tags detected")));
  });
});

test("Batch 19: Content Studio Historical Versioning", async (t) => {
  const orgId = `org_ver_test_${Date.now()}`;
  const oppId = `opp_ver_101`;

  await t.test("saves sequential versions without overwriting previous copies", () => {
    const v1 = saveContentVersion(orgId, oppId, {
      title: "Initial Draft Title v1",
      tags: Array(13).fill("initial tag"),
      description: "Initial description v1",
      price: 30.0,
      changeSummary: "First generation",
    });

    assert.equal(v1.versionNumber, 1);
    assert.equal(v1.isCurrent, true);

    const v2 = saveContentVersion(orgId, oppId, {
      title: "Refined SEO Title v2",
      tags: Array(13).fill("refined tag"),
      description: "Refined description v2",
      price: 35.0,
      changeSummary: "Added high-intent buyer keywords",
    });

    assert.equal(v2.versionNumber, 2);
    assert.equal(v2.isCurrent, true);

    const all = listContentVersions(orgId, oppId);
    assert.equal(all.length, 2);
    assert.equal(all[0].versionNumber, 2);
    assert.equal(all[1].versionNumber, 1);
    assert.equal(all[1].title, "Initial Draft Title v1", "Historical title preserved");
  });

  await t.test("compares version diffs accurately", () => {
    const versions = listContentVersions(orgId, oppId);
    const diff = compareContentVersions(versions[1], versions[0]); // v1 to v2

    assert.equal(diff.titleChanged, true);
    assert.equal(diff.titleBefore, "Initial Draft Title v1");
    assert.equal(diff.titleAfter, "Refined SEO Title v2");
    assert.equal(diff.priceDelta, 5.0);
  });

  await t.test("restores a previous version non-destructively as a new version", () => {
    const versions = listContentVersions(orgId, oppId);
    const v1Id = versions.find((v) => v.versionNumber === 1)!.id;

    const restored = restoreContentVersion(orgId, oppId, v1Id);
    assert.ok(restored !== null);
    assert.equal(restored?.versionNumber, 3);
    assert.equal(restored?.title, "Initial Draft Title v1");
    assert.ok(restored?.changeSummary.includes("Restored from Version 1"));
  });
});

test("Batch 19: Post-Publish Monitoring & Closed-Loop Diagnostics", async (t) => {
  await t.test("classifies outperforming listing with expansion recommendation", () => {
    const diagnosis = evaluatePublishedListing({
      etsyListingId: "etsy_live_1001",
      title: "Artisan Leather Wallet",
      price: 45.0,
      publishedDaysAgo: 14,
      totalSales: 45,
      dailyVelocity: 3.2,
      categoryBenchmarkVelocity: 1.5,
      forecastOpportunityVelocity: 2.0,
      tagComplianceCount: 13,
      first40CharsKeywordMatch: true,
    });

    assert.equal(diagnosis.status, "OUTPERFORMING");
    assert.ok(diagnosis.velocityIndex >= 1.2);
    assert.equal(diagnosis.recommendedAction.actionLabel, "Create Variation in Planner");
  });

  await t.test("classifies underperforming listing with specific keyword fix", () => {
    const diagnosis = evaluatePublishedListing({
      etsyListingId: "etsy_live_1002",
      title: "Wooden Desk Tray",
      price: 32.0,
      publishedDaysAgo: 21,
      totalSales: 6,
      dailyVelocity: 0.3,
      categoryBenchmarkVelocity: 1.8,
      forecastOpportunityVelocity: 1.5,
      tagComplianceCount: 9, // only 9 tags
      first40CharsKeywordMatch: false,
    });

    assert.equal(diagnosis.status, "NEEDS_OPTIMIZATION");
    assert.ok(diagnosis.velocityIndex < 0.7);
    assert.equal(diagnosis.recommendedAction.actionLabel, "Audit & Optimize in Studio");
    assert.ok(diagnosis.recommendedAction.whyYouShouldCare.includes("missing tags"));
  });
});

test("Batch 19: Own Shop Operations & Optimization Queues", async (t) => {
  const orgId = `org_store_test_${Date.now()}`;
  const report = await getOwnShopIntelligence(orgId);

  await t.test("reports store health with clear catalog optimization count", () => {
    assert.ok(report.healthScore >= 0 && report.healthScore <= 100);
    assert.ok(Array.isArray(report.optimizationQueue));
    assert.ok(report.primaryNextAction.actionLabel.length > 0);
  });
});

test("Batch 19: Extension MV3 Page Detector", async (t) => {
  await t.test("classifies public Etsy listing URLs", () => {
    const type = classifyEtsyUrl("https://www.etsy.com/listing/1429810482/handmade-leather-card-holder");
    assert.equal(type, "ETSY_LISTING_PUBLIC");

    const listingId = extractListingIdFromUrl("https://www.etsy.com/listing/1429810482/handmade-leather-card-holder");
    assert.equal(listingId, "1429810482");
  });

  await t.test("classifies public Etsy shop URLs", () => {
    const type = classifyEtsyUrl("https://www.etsy.com/shop/LayerSculpt3D");
    assert.equal(type, "ETSY_SHOP_PUBLIC");

    const shopName = extractShopNameFromUrl("https://www.etsy.com/shop/LayerSculpt3D");
    assert.equal(shopName, "LayerSculpt3D");
  });

  await t.test("classifies Etsy search result URLs", () => {
    const type = classifyEtsyUrl("https://www.etsy.com/search?q=leather+wallet");
    assert.equal(type, "ETSY_SEARCH_RESULTS");
  });

  await t.test("classifies Etsy listing editor URLs", () => {
    const type = classifyEtsyUrl("https://www.etsy.com/your/shops/me/listing-editor/edit/1429810482");
    assert.equal(type, "ETSY_LISTING_EDITOR");
  });
});

test("Batch 19: Plan Gating & Quota Consistency", async (t) => {
  await t.test("verifies Starter plan limits and capabilities", () => {
    const access = getFeatureAccess("STARTED");
    assert.equal(access.canConnectEtsy, true);
    assert.equal(access.canGenerateListingCopy, true);
    assert.equal(access.canExportData, true);
    assert.equal(access.canAccessAgencyTools, false);
  });

  await t.test("verifies Pro plan unlocks advanced surveillance and multi-stores", () => {
    const access = getFeatureAccess("PRO");
    assert.equal(access.canUseAdvancedSurveillance, true);
    assert.equal(access.canManageMultipleStores, true);
  });
});
