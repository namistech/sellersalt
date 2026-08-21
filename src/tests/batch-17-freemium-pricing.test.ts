import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PLAN_DEFINITIONS,
  PlanTierKey,
  getFeatureAccess,
  isTierSufficient,
} from "../services/plans/plan-capabilities";

describe("Batch 17: Pricing & Commercial Plan Architecture", () => {
  it("verifies 20% annual discount calculations across paid tiers", () => {
    // Starter: $19/mo -> $15/mo
    assert.strictEqual(PLAN_DEFINITIONS.STARTED.priceMonthlyUsd, 19);
    assert.strictEqual(PLAN_DEFINITIONS.STARTED.priceAnnualMonthlyUsd, 15);

    // Pro: $49/mo -> $39/mo
    assert.strictEqual(PLAN_DEFINITIONS.PRO.priceMonthlyUsd, 49);
    assert.strictEqual(PLAN_DEFINITIONS.PRO.priceAnnualMonthlyUsd, 39);

    // Agency: $199/mo -> $159/mo
    assert.strictEqual(PLAN_DEFINITIONS.AGENCY.priceMonthlyUsd, 199);
    assert.strictEqual(PLAN_DEFINITIONS.AGENCY.priceAnnualMonthlyUsd, 159);
  });

  it("verifies free explorer plan is genuinely useful with non-zero quotas", () => {
    const free = PLAN_DEFINITIONS.FREE;
    assert.strictEqual(free.priceMonthlyUsd, 0);
    assert.strictEqual(free.limits.monthlyKeywordSearches, 15);
    assert.strictEqual(free.limits.monthlyProductResearches, 10);
    assert.strictEqual(free.limits.trackedCompetitorShops, 1);
    assert.strictEqual(free.limits.activePlannerItems, 3);
  });

  it("validates graduated feature permissions across tiers", () => {
    const freeFeat = getFeatureAccess("FREE");
    assert.strictEqual(freeFeat.canExportData, false);
    assert.strictEqual(freeFeat.canUseAdvancedTracking, false);

    const starterFeat = getFeatureAccess("STARTED");
    assert.strictEqual(starterFeat.canExportData, true);
    assert.strictEqual(starterFeat.canUseAdvancedTracking, false);

    const proFeat = getFeatureAccess("PRO");
    assert.strictEqual(proFeat.canExportData, true);
    assert.strictEqual(proFeat.canUseAdvancedTracking, true);
    assert.strictEqual(proFeat.canManageMultipleStores, true);
  });
});
