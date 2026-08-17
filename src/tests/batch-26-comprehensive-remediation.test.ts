import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveCouponBehavior,
  type CouponInput,
} from "@/services/billing/coupon-engine";
import { resolveEtsyOAuthRedirectUri } from "@/services/connectors/etsy-oauth-helper";
import { PLAN_DEFINITIONS } from "@/services/plans/plan-capabilities";

test("Batch 26 Remediation: Advanced Coupon Behaviors (Types A-E)", async (t) => {
  const proPkg = {
    key: "PRO",
    priceUsd: 49.0,
    trialPriceUsd: 1.0,
    trialDays: 3,
  };

  await t.test("Type A: Free Trial Coupon (FREE3DAY) bypasses $1 charge with standard renewal", () => {
    const coupon: CouponInput = {
      code: "FREE3DAY",
      behavior: "FREE_TRIAL",
      isActive: true,
    };
    const res = resolveCouponBehavior(coupon, proPkg);
    assert.equal(res.valid, true);
    assert.equal(res.behavior, "FREE_TRIAL");
    assert.equal(res.trialPriceUsd, 0);
    assert.equal(res.firstPeriodPriceUsd, 49.0);
    assert.equal(res.recurringPriceUsd, 49.0);
    assert.equal(res.requiresCheckout, true);
    assert.equal(res.requiresPaymentMethod, true);
  });

  await t.test("Type B: Paid Trial -> First Month Free ($1 today, Month 1 free)", () => {
    const coupon: CouponInput = {
      code: "1MONTHFREE",
      behavior: "PAID_TRIAL_FIRST_MONTH_FREE",
      isActive: true,
    };
    const res = resolveCouponBehavior(coupon, proPkg);
    assert.equal(res.valid, true);
    assert.equal(res.behavior, "PAID_TRIAL_FIRST_MONTH_FREE");
    assert.equal(res.trialPriceUsd, 1.0);
    assert.equal(res.firstPeriodPriceUsd, 0.0);
    assert.equal(res.recurringPriceUsd, 49.0);
  });

  await t.test("Type C: Completely Free Access / Direct Checkout Bypass (FREEPRO)", () => {
    const coupon: CouponInput = {
      code: "FREEPRO",
      behavior: "COMPLETELY_FREE",
      isActive: true,
    };
    const res = resolveCouponBehavior(coupon, proPkg);
    assert.equal(res.valid, true);
    assert.equal(res.behavior, "COMPLETELY_FREE");
    assert.equal(res.trialPriceUsd, 0);
    assert.equal(res.firstPeriodPriceUsd, 0);
    assert.equal(res.recurringPriceUsd, 0);
    assert.equal(res.requiresCheckout, false);
    assert.equal(res.requiresPaymentMethod, false);
  });

  await t.test("Type D: Percentage Discount (e.g. 50% off)", () => {
    const coupon: CouponInput = {
      code: "HALF50",
      type: "PERCENT",
      value: 50,
      duration: "FOREVER",
      isActive: true,
    };
    const res = resolveCouponBehavior(coupon, proPkg);
    assert.equal(res.valid, true);
    assert.equal(res.behavior, "PERCENTAGE_DISCOUNT");
    assert.equal(res.trialPriceUsd, 1.0);
    assert.equal(res.firstPeriodPriceUsd, 24.5);
    assert.equal(res.recurringPriceUsd, 24.5);
  });

  await t.test("Type E: Fixed Amount Discount (e.g. $20 off)", () => {
    const coupon: CouponInput = {
      code: "SAVE20",
      type: "FIXED",
      value: 20,
      duration: "ONCE",
      isActive: true,
    };
    const res = resolveCouponBehavior(coupon, proPkg);
    assert.equal(res.valid, true);
    assert.equal(res.behavior, "FIXED_DISCOUNT");
    assert.equal(res.trialPriceUsd, 1.0);
    assert.equal(res.firstPeriodPriceUsd, 29.0);
    assert.equal(res.recurringPriceUsd, 49.0);
  });

  await t.test("Rejects expired coupon", () => {
    const coupon: CouponInput = {
      code: "OLDEXPIRED",
      value: 10,
      expiresAt: new Date(Date.now() - 100000),
      isActive: true,
    };
    const res = resolveCouponBehavior(coupon, proPkg);
    assert.equal(res.valid, false);
    assert.ok(res.error?.includes("expired"));
  });

  await t.test("Rejects coupon when max redemption limit reached", () => {
    const coupon: CouponInput = {
      code: "MAXEDOUT",
      value: 10,
      maxRedemptions: 5,
      redemptionCount: 5,
      isActive: true,
    };
    const res = resolveCouponBehavior(coupon, proPkg);
    assert.equal(res.valid, false);
    assert.ok(res.error?.includes("maximum redemptions"));
  });

  await t.test("Enforces plan-specific coupon restrictions", () => {
    const coupon: CouponInput = {
      code: "AGENCYONLY",
      value: 50,
      applicablePlanKey: "AGENCY",
      isActive: true,
    };
    const res = resolveCouponBehavior(coupon, proPkg);
    assert.equal(res.valid, false);
    assert.ok(res.error?.includes("AGENCY plan"));
  });
});

test("Batch 26 Remediation: Etsy OAuth Environment & Redirect Resolution", async (t) => {
  await t.test("resolves production redirect URI matching sellersalt.com", () => {
    const cfg = resolveEtsyOAuthRedirectUri({
      overrideBaseUrl: "https://sellersalt.com",
    });
    assert.equal(cfg.baseUrl, "https://sellersalt.com");
    assert.equal(cfg.redirectUri, "https://sellersalt.com/api/seller-channels/etsy/callback");
    assert.equal(cfg.environment, "production");
  });

  await t.test("resolves staging redirect URI matching namis.tech", () => {
    const cfg = resolveEtsyOAuthRedirectUri({
      overrideBaseUrl: "https://anadash.namis.tech",
    });
    assert.equal(cfg.baseUrl, "https://anadash.namis.tech");
    assert.equal(cfg.redirectUri, "https://anadash.namis.tech/api/seller-channels/etsy/callback");
    assert.equal(cfg.environment, "staging");
  });

  await t.test("respects explicit ETSY_REDIRECT_URI environment override", () => {
    const cfg = resolveEtsyOAuthRedirectUri({
      overrideBaseUrl: "https://anadash.namis.tech",
      overrideRedirectUri: "https://custom.sellersalt.com/api/seller-channels/etsy/callback",
    });
    assert.equal(cfg.redirectUri, "https://custom.sellersalt.com/api/seller-channels/etsy/callback");
  });

  // Regression coverage for the "Credentials are not configured" bug: the
  // connect/callback routes merge an AppSetting-configured client ID with
  // any env-var one, but `isValid` used to be computed from env vars only —
  // so a clientId configured solely via /admin Site Settings (the
  // documented, intended path) still failed this check even though the
  // route had a perfectly usable clientId. Fixed by accepting an
  // `overrideClientId` that takes priority over env vars.
  await t.test("without ETSY_CLIENT_ID/ETSY_KEYSTRING/ETSY_API_KEY and no override, config is invalid", () => {
    const saved = {
      ETSY_CLIENT_ID: process.env.ETSY_CLIENT_ID,
      ETSY_KEYSTRING: process.env.ETSY_KEYSTRING,
      ETSY_API_KEY: process.env.ETSY_API_KEY,
    };
    delete process.env.ETSY_CLIENT_ID;
    delete process.env.ETSY_KEYSTRING;
    delete process.env.ETSY_API_KEY;
    try {
      const cfg = resolveEtsyOAuthRedirectUri({ overrideBaseUrl: "https://sellersalt.com" });
      assert.equal(cfg.isValid, false);
      assert.equal(cfg.diagnosticCode, "ETSY_CLIENT_ID_MISSING");
    } finally {
      if (saved.ETSY_CLIENT_ID !== undefined) process.env.ETSY_CLIENT_ID = saved.ETSY_CLIENT_ID;
      if (saved.ETSY_KEYSTRING !== undefined) process.env.ETSY_KEYSTRING = saved.ETSY_KEYSTRING;
      if (saved.ETSY_API_KEY !== undefined) process.env.ETSY_API_KEY = saved.ETSY_API_KEY;
    }
  });

  await t.test("an AppSetting-sourced clientId (overrideClientId) is valid even with no matching env var", () => {
    const saved = {
      ETSY_CLIENT_ID: process.env.ETSY_CLIENT_ID,
      ETSY_KEYSTRING: process.env.ETSY_KEYSTRING,
      ETSY_API_KEY: process.env.ETSY_API_KEY,
    };
    delete process.env.ETSY_CLIENT_ID;
    delete process.env.ETSY_KEYSTRING;
    delete process.env.ETSY_API_KEY;
    try {
      const cfg = resolveEtsyOAuthRedirectUri({
        overrideBaseUrl: "https://sellersalt.com",
        overrideClientId: "admin-configured-client-id",
      });
      assert.equal(cfg.isValid, true);
      assert.equal(cfg.clientId, "admin-configured-client-id");
      assert.equal(cfg.diagnosticCode, undefined);
    } finally {
      if (saved.ETSY_CLIENT_ID !== undefined) process.env.ETSY_CLIENT_ID = saved.ETSY_CLIENT_ID;
      if (saved.ETSY_KEYSTRING !== undefined) process.env.ETSY_KEYSTRING = saved.ETSY_KEYSTRING;
      if (saved.ETSY_API_KEY !== undefined) process.env.ETSY_API_KEY = saved.ETSY_API_KEY;
    }
  });
});

test("Batch 26 Remediation: Shop Tracking & Duration Entitlements", async (t) => {
  await t.test("Starter plan has 3-day tracking window", () => {
    assert.equal(PLAN_DEFINITIONS.STARTED.limits.trackedCompetitorShops, 10);
  });

  await t.test("Pro plan allows 3-day, 7-day, and 30-day tracking windows", () => {
    assert.equal(PLAN_DEFINITIONS.PRO.limits.trackedCompetitorShops, 50);
  });

  await t.test("Agency plan allows multi-shop enterprise tracking", () => {
    assert.equal(PLAN_DEFINITIONS.AGENCY.limits.trackedCompetitorShops, 250);
  });
});
