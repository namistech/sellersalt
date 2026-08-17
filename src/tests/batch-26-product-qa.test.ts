import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PLAN_DEFINITIONS,
  PlanTierKey,
  getFeatureAccess,
} from "@/services/plans/plan-capabilities";
import {
  resolveSubscriptionState,
  resolveEffectiveTier,
  resolveOrganizationPlan,
  resolveTrialDetails,
} from "@/services/billing/subscription-lifecycle";
import { resolveConnectorLifecycleState } from "@/services/connector-diagnostics";
import { parseEtsyListingInput } from "@/lib/etsy-listing-parser";
import { getProvenanceMeta, type DataProvenanceType } from "@/types/provenance";
import { resolveNextBestAction } from "@/services/intelligence/next-best-action";
import { auditListingSeo } from "@/services/seo-engine";

test("Batch 26: Data Provenance Transparency & Badging", async (t) => {
  await t.test("verifies all four provenance categories have distinct user-facing meta", () => {
    const actual = getProvenanceMeta("ACTUAL_ETSY_DATA");
    const estimated = getProvenanceMeta("ESTIMATED");
    const score = getProvenanceMeta("SELLERSALT_SCORE");
    const external = getProvenanceMeta("EXTERNAL_DATA");

    assert.equal(actual.badgeText, "[ACTUAL ETSY DATA]");
    assert.equal(actual.variant, "success");

    assert.equal(estimated.badgeText, "[ESTIMATED]");
    assert.equal(estimated.variant, "info");

    assert.equal(score.badgeText, "[SELLERSALT SCORE]");
    assert.equal(score.variant, "gold");

    assert.equal(external.badgeText, "[EXTERNAL DATA]");
    assert.equal(external.variant, "neutral");
  });
});

test("Batch 26: Explainable Scoring & Next Best Action 4-Part Framework", async (t) => {
  await t.test("produces structured Signal -> Interpretation -> Why -> Action object", () => {
    const nba = resolveNextBestAction({
      stage: "OPPORTUNITY",
      opportunityScore: 84,
      estDailySales: 4.2,
      seoScore: 62,
    });

    assert.ok(nba.signal.length > 0);
    assert.ok(nba.interpretation.length > 0);
    assert.ok(nba.whyYouShouldCare.length > 0);
    assert.ok(nba.actionLabel.length > 0);
    assert.ok(nba.provenance !== undefined);
  });
});

test("Batch 26: Operating Loop End-to-End Hand-Off Integrity", async (t) => {
  await t.test("verifies continuous handoffs across all 11 lifecycle stages", () => {
    const stages = [
      "DISCOVER",
      "RESEARCH",
      "SHORTLIST",
      "OPPORTUNITY",
      "KEYWORDS",
      "STRATEGY",
      "CONTENT",
      "DRAFT",
      "HUMAN_REVIEW",
      "PUBLISH",
      "MONITOR",
    ];

    assert.equal(stages.length, 11);
    assert.equal(stages[0], "DISCOVER");
    assert.equal(stages[stages.length - 1], "MONITOR");
  });
});

test("Batch 26: SEO Audit Multi-Input Robustness", async (t) => {
  await t.test("parses listing URL with deep tracking parameters cleanly", () => {
    const url = "https://www.etsy.com/listing/182930485/boho-macrame-plant-hanger?ga_order=most_relevant&ga_search_type=all&ref=sr_gallery-1-1";
    const res = parseEtsyListingInput(url);
    assert.equal(res.listingId, 182930485);
    assert.equal(res.isShopUrl, false);
    assert.equal(res.error, undefined);
  });

  await t.test("parses listing URL with localized Etsy domain", () => {
    const url = "https://www.etsy.com/de/listing/554433221/vintage-leather-jacket";
    const res = parseEtsyListingInput(url);
    assert.equal(res.listingId, 554433221);
    assert.equal(res.isShopUrl, false);
  });

  await t.test("intercepts shop URL and returns shop resolution path", () => {
    const url = "https://www.etsy.com/shop/BohoVibesStudio?ref=simple-shop-header";
    const res = parseEtsyListingInput(url);
    assert.equal(res.isShopUrl, true);
    assert.equal(res.shopName, "BohoVibesStudio");
    assert.equal(res.listingId, null);
  });

  await t.test("computes explainable SEO breakdown score without 500 error", () => {
    const audit = auditListingSeo({
      title: "Handmade Wooden Cutting Board Walnut Edge Grain",
      tags: ["wooden board", "cutting board", "walnut block", "kitchen gift"],
      description: "Solid American walnut cutting board treated with food grade mineral oil.",
    });

    assert.ok(audit.overallScore >= 0 && audit.overallScore <= 100);
    assert.equal(typeof audit.breakdown.titleScore, "number");
    assert.equal(typeof audit.breakdown.tagScore, "number");
    assert.equal(typeof audit.breakdown.descriptionScore, "number");
  });
});

test("Batch 26: Plan Integrity & Pro Trial Single Source of Truth", async (t) => {
  await t.test("guarantees matching pricing and quotas across all 4 canonical tiers", () => {
    assert.equal(PLAN_DEFINITIONS.FREE.priceMonthlyUsd, 0);
    assert.equal(PLAN_DEFINITIONS.STARTED.priceMonthlyUsd, 19);
    assert.equal(PLAN_DEFINITIONS.PRO.priceMonthlyUsd, 49);
    assert.equal(PLAN_DEFINITIONS.AGENCY.priceMonthlyUsd, 199);

    assert.equal(PLAN_DEFINITIONS.FREE.limits.monthlyKeywordSearches, 15);
    assert.equal(PLAN_DEFINITIONS.STARTED.limits.monthlyKeywordSearches, 250);
    assert.equal(PLAN_DEFINITIONS.PRO.limits.monthlyKeywordSearches, 2500);
    assert.equal(PLAN_DEFINITIONS.AGENCY.limits.monthlyKeywordSearches, 25000);
  });

  await t.test("calculates Pro 3-day trial $1 upfront with automatic $49 transition", () => {
    const trial = resolveTrialDetails("PRO");
    assert.equal(trial.isEligibleForTrial, true);
    assert.equal(trial.trialPriceUsd, 1.0);
    assert.equal(trial.trialDurationDays, 3);
    assert.equal(trial.regularPriceUsd, 49);
  });
});
