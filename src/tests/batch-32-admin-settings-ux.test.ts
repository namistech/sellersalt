import test from "node:test";
import assert from "node:assert/strict";
import { SETTING_DEFINITIONS, type SettingKey } from "../lib/app-settings";
import { resolveCouponBehavior } from "../services/billing/coupon-engine";

test("Batch 32: App Settings Registry & Secret Protection", async (t) => {
  await t.test("SETTING_DEFINITIONS registers all required core, branding, and integration keys", () => {
    const keys = SETTING_DEFINITIONS.map((s) => s.key);
    
    // Core application
    assert.ok(keys.includes("app_name"));
    assert.ok(keys.includes("app_url"));
    assert.ok(keys.includes("support_email"));
    assert.ok(keys.includes("default_timezone"));
    assert.ok(keys.includes("default_currency"));
    assert.ok(keys.includes("registration_enabled"));
    assert.ok(keys.includes("free_plan_enabled"));
    assert.ok(keys.includes("default_signup_plan"));

    // Branding & Artwork
    assert.ok(keys.includes("app_logo_url"));
    assert.ok(keys.includes("app_favicon_url"));
    assert.ok(keys.includes("app_icon_square_url"));
    assert.ok(keys.includes("assistant_logo_url"));
    assert.ok(keys.includes("auth_page_image_url"));
    assert.ok(keys.includes("auth_page_image_position_x"));
    assert.ok(keys.includes("auth_page_image_position_y"));

    // Integrations
    assert.ok(keys.includes("google_client_id"));
    assert.ok(keys.includes("google_client_secret"));
    assert.ok(keys.includes("etsy_seller_client_id"));
    assert.ok(keys.includes("etsy_seller_client_secret"));
    assert.ok(keys.includes("amazon_client_id"));
    assert.ok(keys.includes("shopify_client_id"));
    assert.ok(keys.includes("tiktok_app_key"));
    assert.ok(keys.includes("ebay_app_id"));
    assert.ok(keys.includes("woocommerce_store_url"));
    assert.ok(keys.includes("walmart_client_id"));
  });

  await t.test("Secrets are explicitly marked as isSecret: true", () => {
    const secretKeys = ["google_client_secret", "etsy_seller_client_secret", "amazon_client_secret", "shopify_client_secret", "s3_secret_access_key"];
    for (const key of secretKeys) {
      const def = SETTING_DEFINITIONS.find((s) => s.key === key);
      assert.ok(def, `Expected definition for ${key}`);
      assert.equal(def.isSecret, true, `${key} must be marked as secret`);
    }
  });
});

test("Batch 32: Commercial Coupon Engine Multi-Behavior Resolution", async (t) => {
  const proPkg = { key: "PRO", priceUsd: 49, trialPriceUsd: 1.0, trialDays: 3 };

  await t.test("Type A: Free Trial Coupon ($0 today, standard recurring)", () => {
    const coupon = { code: "FREETRIAL", type: "FREE_TRIAL", isActive: true };
    const res = resolveCouponBehavior(coupon, proPkg);
    assert.equal(res.valid, true);
    assert.equal(res.behavior, "FREE_TRIAL");
    assert.equal(res.trialPriceUsd, 0);
    assert.equal(res.firstPeriodPriceUsd, 49);
    assert.equal(res.requiresCheckout, true);
    assert.equal(res.requiresPaymentMethod, true);
  });

  await t.test("Type B: Paid Trial -> First Month Free ($1 today, first month $0)", () => {
    const coupon = { code: "1MONTHFREE", type: "FIRST_MONTH_FREE", isActive: true };
    const res = resolveCouponBehavior(coupon, proPkg);
    assert.equal(res.valid, true);
    assert.equal(res.behavior, "PAID_TRIAL_FIRST_MONTH_FREE");
    assert.equal(res.trialPriceUsd, 1.0);
    assert.equal(res.firstPeriodPriceUsd, 0);
    assert.equal(res.requiresCheckout, true);
  });

  await t.test("Type C: Completely Free Access / Direct Bypass ($0 today, $0 recurring, no payment method)", () => {
    const coupon = { code: "VIP100", type: "COMPLETELY_FREE", isActive: true };
    const res = resolveCouponBehavior(coupon, proPkg);
    assert.equal(res.valid, true);
    assert.equal(res.behavior, "COMPLETELY_FREE");
    assert.equal(res.trialPriceUsd, 0);
    assert.equal(res.firstPeriodPriceUsd, 0);
    assert.equal(res.requiresCheckout, false);
    assert.equal(res.requiresPaymentMethod, false);
  });

  await t.test("Type D: Percentage Discount (e.g. 50% off)", () => {
    const coupon = { code: "SAVE50", type: "PERCENT", value: 50, isActive: true };
    const res = resolveCouponBehavior(coupon, proPkg);
    assert.equal(res.valid, true);
    assert.equal(res.behavior, "PERCENTAGE_DISCOUNT");
    assert.equal(res.firstPeriodPriceUsd, 24.5);
    assert.equal(res.requiresCheckout, true);
  });

  await t.test("Type E: Fixed Discount (e.g. $10 off)", () => {
    const coupon = { code: "10OFF", type: "FIXED", value: 10, isActive: true };
    const res = resolveCouponBehavior(coupon, proPkg);
    assert.equal(res.valid, true);
    assert.equal(res.behavior, "FIXED_DISCOUNT");
    assert.equal(res.firstPeriodPriceUsd, 39);
    assert.equal(res.requiresCheckout, true);
  });
});
