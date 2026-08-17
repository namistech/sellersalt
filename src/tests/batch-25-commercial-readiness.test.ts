import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveSubscriptionState,
  resolveEffectiveTier,
  resolveOrganizationPlan,
  resolveFeatureEntitlement,
  canUseFeature,
  evaluatePlanTransition,
  resolveTrialDetails,
} from "@/services/billing/subscription-lifecycle";
import {
  PLAN_DEFINITIONS,
  PlanTierKey,
  getFeatureAccess,
  canAccessFeature,
} from "@/services/plans/plan-capabilities";
import { resolveConnectorLifecycleState } from "@/services/connector-diagnostics";
import { parseEtsyListingInput } from "@/lib/etsy-listing-parser";
import { computeActivationProgress } from "@/services/analytics/product-events";

test("Batch 25: Comprehensive 12-Direction Plan Transition Matrix", async (t) => {
  const tiers: PlanTierKey[] = ["FREE", "STARTED", "PRO", "AGENCY"];

  for (const fromTier of tiers) {
    for (const toTier of tiers) {
      if (fromTier === toTier) continue;

      await t.test(`transition from ${fromTier} to ${toTier}`, () => {
        const verdict = evaluatePlanTransition(fromTier, toTier, {
          trackedShops: 30,
          connectedStores: 4,
          plannerItems: 120,
        });

        // INVARIANT 1: Downgrades and upgrades must NEVER destroy user data
        assert.equal(verdict.dataPreserved, true);
        assert.ok(verdict.preservationSummary.includes("100% preserved"));
        assert.equal(verdict.canProceed, true);

        // Check upgrade vs downgrade classification
        const tierRanks: Record<PlanTierKey, number> = {
          FREE: 0,
          STARTED: 1,
          PRO: 2,
          AGENCY: 3,
        };

        if (tierRanks[toTier] > tierRanks[fromTier]) {
          assert.equal(verdict.isUpgrade, true);
          assert.equal(verdict.isDowngrade, false);
        } else {
          assert.equal(verdict.isUpgrade, false);
          assert.equal(verdict.isDowngrade, true);
          // When downgrading with high usage, a restriction summary must be generated
          if (toTier === "STARTED" || toTier === "FREE") {
            assert.ok(verdict.restrictionsSummary !== undefined);
          }
        }
      });
    }
  }
});

test("Batch 25: Pro $1 / 3-Day Trial Commercial Verification", async (t) => {
  await t.test("enforces exactly 3-day duration with transparent $1 charge and $49 recurring", () => {
    const trial = resolveTrialDetails("PRO");
    assert.equal(trial.isEligibleForTrial, true);
    assert.equal(trial.trialPriceUsd, 1.0);
    assert.equal(trial.trialDurationDays, 3);
    assert.equal(trial.regularPriceUsd, 49);
  });

  await t.test("calculates active trial expiration and days remaining safely", () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeTrial = resolveTrialDetails("PRO", oneDayAgo, 3);
    assert.equal(activeTrial.isCurrentlyTrialing, true);
    assert.equal(activeTrial.daysRemaining, 2);

    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    const expiredTrial = resolveTrialDetails("PRO", fourDaysAgo, 3);
    assert.equal(expiredTrial.isCurrentlyTrialing, false);
    assert.equal(expiredTrial.daysRemaining, 0);
  });
});

test("Batch 25: Multi-Tenant & Server-Authoritative Gating Invariants", async (t) => {
  await t.test("prevents client-side plan spoofing on feature checks", () => {
    // A canceled or expired user cannot access Pro features even if the client claims "PRO"
    assert.equal(canUseFeature("PRO", "canUseAdvancedSurveillance", "EXPIRED"), false);
    assert.equal(canUseFeature("PRO", "canGenerateListingCopy", "CANCELED"), false);
    assert.equal(canUseFeature("AGENCY", "canAccessAgencyTools", "PAYMENT_FAILED"), false);
    
    // Only ACTIVE or TRIALING subscriptions unlock paid features
    assert.equal(canUseFeature("PRO", "canUseAdvancedSurveillance", "ACTIVE"), true);
    assert.equal(canUseFeature("PRO", "canUseAdvancedSurveillance", "TRIALING"), true);
  });

  await t.test("retains single source of truth for plan limits across all tiers", () => {
    assert.equal(PLAN_DEFINITIONS.FREE.priceMonthlyUsd, 0);
    assert.equal(PLAN_DEFINITIONS.STARTED.priceMonthlyUsd, 19);
    assert.equal(PLAN_DEFINITIONS.PRO.priceMonthlyUsd, 49);
    assert.equal(PLAN_DEFINITIONS.AGENCY.priceMonthlyUsd, 199);
  });
});

test("Batch 25: Real-World Funnel & Activation Check", async (t) => {
  await t.test("computes progress milestone for newly registered users reaching first value", () => {
    const freshUser = computeActivationProgress({});
    assert.equal(freshUser.accountCreated, true);
    assert.equal(freshUser.isActivated, false);

    const firstValueUser = computeActivationProgress({
      hasCompletedOnboarding: true,
      hasNicheFocus: true,
      hasRunResearch: true,
      hasSavedProspect: true,
    });
    assert.equal(firstValueUser.isActivated, true);
    assert.ok(firstValueUser.completionPercentage >= 80);
  });

  await t.test("parses real Etsy listing URLs and intercepts shop URLs cleanly", () => {
    const listingRes = parseEtsyListingInput("https://www.etsy.com/listing/987654321/handmade-wooden-bowl?ref=hp_rv-1");
    assert.equal(listingRes.listingId, 987654321);
    assert.equal(listingRes.isShopUrl, false);

    const shopRes = parseEtsyListingInput("https://www.etsy.com/shop/ArtisanWoodworks");
    assert.equal(shopRes.isShopUrl, true);
    assert.equal(shopRes.shopName, "ArtisanWoodworks");
    assert.equal(shopRes.listingId, null);
  });
});
