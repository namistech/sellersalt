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
  recordProductEvent,
  computeActivationProgress,
} from "@/services/analytics/product-events";
import { PLAN_DEFINITIONS } from "@/services/plans/plan-capabilities";
import { resolveConnectorLifecycleState } from "@/services/connector-diagnostics";
import { parseEtsyListingInput } from "@/lib/etsy-listing-parser";

test("Batch 24: Canonical Subscription State Machine", async (t) => {
  await t.test("maps raw and provider states into canonical 8-state model", () => {
    assert.equal(resolveSubscriptionState(undefined), "FREE");
    assert.equal(resolveSubscriptionState(""), "FREE");
    assert.equal(resolveSubscriptionState("active"), "ACTIVE");
    assert.equal(resolveSubscriptionState("active", { isTrial: true }), "TRIALING");
    assert.equal(resolveSubscriptionState("trialing"), "TRIALING");
    assert.equal(resolveSubscriptionState("past_due"), "PAST_DUE");
    assert.equal(resolveSubscriptionState("canceled"), "CANCELED");
    assert.equal(resolveSubscriptionState("payment_failed"), "PAYMENT_FAILED");
    assert.equal(resolveSubscriptionState("incomplete"), "INCOMPLETE");
  });

  await t.test("automatically classifies expired subscriptions when past currentPeriodEnd", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const expiredState = resolveSubscriptionState("ACTIVE", { currentPeriodEnd: yesterday });
    assert.equal(expiredState, "EXPIRED");
  });

  await t.test("reverts effective tier to FREE when subscription is expired or past due", () => {
    assert.equal(resolveEffectiveTier("PRO", "ACTIVE"), "PRO");
    assert.equal(resolveEffectiveTier("PRO", "TRIALING"), "PRO");
    assert.equal(resolveEffectiveTier("PRO", "EXPIRED"), "FREE");
    assert.equal(resolveEffectiveTier("PRO", "PAST_DUE"), "FREE");
    assert.equal(resolveEffectiveTier("AGENCY", "CANCELED"), "FREE");
  });

  await t.test("retrieves canonical plan definitions without duplication", () => {
    const starter = resolveOrganizationPlan("STARTED");
    assert.equal(starter.name, "Starter");
    assert.equal(starter.priceMonthlyUsd, 19);

    const pro = resolveOrganizationPlan("PRO");
    assert.equal(pro.name, "Growth & Pro");
    assert.equal(pro.priceMonthlyUsd, 49);

    const unknown = resolveOrganizationPlan("UNKNOWN_TIER");
    assert.equal(unknown.key, "FREE");
  });
});

test("Batch 24: Feature Entitlement & Authorization Gating", async (t) => {
  await t.test("evaluates feature boolean flags based on tier and active status", () => {
    const activePro = resolveFeatureEntitlement("PRO", "ACTIVE");
    assert.equal(activePro.canUseAdvancedSurveillance, true);
    assert.equal(activePro.canGenerateListingCopy, true);
    assert.equal(activePro.canAccessAgencyTools, false);

    const expiredPro = resolveFeatureEntitlement("PRO", "EXPIRED");
    assert.equal(expiredPro.canUseAdvancedSurveillance, false);
    assert.equal(expiredPro.canGenerateListingCopy, false);
  });

  await t.test("canUseFeature strictly enforces server-authoritative decisions", () => {
    assert.equal(canUseFeature("FREE", "canUseAdvancedSurveillance", "FREE"), false);
    assert.equal(canUseFeature("PRO", "canUseAdvancedSurveillance", "ACTIVE"), true);
    assert.equal(canUseFeature("PRO", "canUseAdvancedSurveillance", "EXPIRED"), false);
    assert.equal(canUseFeature("AGENCY", "canAccessAgencyTools", "ACTIVE"), true);
  });
});

test("Batch 24: Non-Destructive Downgrade & Transition Safety", async (t) => {
  await t.test("guarantees 100% data preservation on downgrades", () => {
    const verdict = evaluatePlanTransition("PRO", "STARTED", {
      trackedShops: 25,
      connectedStores: 3,
      plannerItems: 40,
    });

    assert.equal(verdict.isDowngrade, true);
    assert.equal(verdict.dataPreserved, true);
    assert.equal(verdict.canProceed, true);
    assert.ok(verdict.restrictionsSummary?.includes("25 tracked shops"));
    assert.ok(verdict.preservationSummary.includes("100% preserved"));
  });

  await t.test("detects upgrades smoothly", () => {
    const upgradeVerdict = evaluatePlanTransition("FREE", "PRO");
    assert.equal(upgradeVerdict.isUpgrade, true);
    assert.equal(upgradeVerdict.isDowngrade, false);
    assert.equal(upgradeVerdict.dataPreserved, true);
  });
});

test("Batch 24: Pro $1 / 3-Day Trial Architecture", async (t) => {
  await t.test("calculates trial availability and transparent pricing", () => {
    const eligibleTrial = resolveTrialDetails("PRO");
    assert.equal(eligibleTrial.isEligibleForTrial, true);
    assert.equal(eligibleTrial.isCurrentlyTrialing, false);
    assert.equal(eligibleTrial.trialPriceUsd, 1.0);
    assert.equal(eligibleTrial.trialDurationDays, 3);
    assert.equal(eligibleTrial.regularPriceUsd, 49);

    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const activeTrial = resolveTrialDetails("PRO", twoDaysAgo, 3);
    assert.equal(activeTrial.isCurrentlyTrialing, true);
    assert.equal(activeTrial.daysRemaining, 1);
  });

  await t.test("non-Pro plans do not offer $1 trial", () => {
    const starterTrial = resolveTrialDetails("STARTED");
    assert.equal(starterTrial.isEligibleForTrial, false);
  });
});

test("Batch 24: Conversion Analytics & Activation Progress", async (t) => {
  await t.test("computes activation progress checklist accurately", () => {
    const newProgress = computeActivationProgress({
      hasCompletedOnboarding: true,
      hasNicheFocus: true,
      hasRunResearch: false,
    });

    assert.equal(newProgress.accountCreated, true);
    assert.equal(newProgress.nicheSelected, true);
    assert.equal(newProgress.firstResearchRun, false);
    assert.equal(newProgress.isActivated, false);

    const activatedProgress = computeActivationProgress({
      hasCompletedOnboarding: true,
      hasNicheFocus: true,
      hasRunResearch: true,
      hasSavedProspect: true,
      hasCreatedDraft: true,
    });

    assert.equal(activatedProgress.isActivated, true);
    assert.equal(activatedProgress.completionPercentage, 100);
  });

  await t.test("records product conversion events safely", () => {
    const evt = recordProductEvent({
      organizationId: "org_test_123",
      eventType: "first_value_reached",
      metadata: { tool: "radar", resultsCount: 42 },
    });

    assert.equal(evt.ok, true);
    assert.equal(evt.eventType, "first_value_reached");
    assert.ok(evt.id.startsWith("evt_"));
  });
});
