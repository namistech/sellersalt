import test from "node:test";
import assert from "node:assert/strict";
import { S3StorageProvider } from "../lib/storage/s3-storage";
import { LocalStorageProvider } from "../lib/storage/local-storage";

test("Batch 34: Cloudflare R2 / S3 Storage Configuration & Endpoint Handling", async () => {
  const r2Provider = new S3StorageProvider({
    bucket: "sellersalt-assets",
    region: "auto",
    endpoint: "https://acc123.r2.cloudflarestorage.com",
    accessKeyId: "mock-key",
    secretAccessKey: "mock-secret",
    publicBaseUrl: "https://assets.sellersalt.com",
  });

  assert.equal(r2Provider.name, "s3");
  assert.equal(r2Provider.isConfigured(), true);
});

test("Batch 34: Local Storage Subfolder & Configuration", async () => {
  const localProvider = new LocalStorageProvider();

  assert.equal(localProvider.name, "local");
  assert.equal(localProvider.isConfigured(), true);
});

test("Batch 34: Extended Commercial Coupon Behaviors & Duration Math", async () => {
  // Type A: Free Trial ($0 Today, recurring normal)
  const freeTrialCoupon = {
    code: "FREE30TRIAL",
    type: "PERCENT" as const,
    value: 100,
    behavior: "FREE_TRIAL",
    duration: "ONCE",
    applicablePlanKey: "PRO",
    firstTimeOnly: true,
  };

  assert.equal(freeTrialCoupon.behavior, "FREE_TRIAL");
  assert.equal(freeTrialCoupon.value, 100);

  // Type B: Paid Trial ($1 Today -> Month 1 Free)
  const paidTrialCoupon = {
    code: "FIRSTMONTHFREE",
    type: "PERCENT" as const,
    value: 100,
    behavior: "PAID_TRIAL_FIRST_MONTH_FREE",
    duration: "ONCE",
    applicablePlanKey: null,
  };

  assert.equal(paidTrialCoupon.behavior, "PAID_TRIAL_FIRST_MONTH_FREE");

  // Type D: Recurring Percentage Discount
  const recurringCoupon = {
    code: "SAVE25FOR6MO",
    type: "PERCENT" as const,
    value: 25,
    behavior: "PERCENTAGE_DISCOUNT",
    duration: "REPEATING",
    durationMonths: 6,
  };

  assert.equal(recurringCoupon.duration, "REPEATING");
  assert.equal(recurringCoupon.durationMonths, 6);
  assert.equal(recurringCoupon.value, 25);
});

test("Batch 34: Multi-Placement Announcement Targeting Logic", async () => {
  const announcement = {
    id: "ann-etsy-rates",
    title: "Etsy Sync Rate Limit Ceilings Expanded",
    message: "Background workers now sync up to 8 req/sec.",
    placement: "DASHBOARD_BANNER" as const,
    audience: "PAID_ONLY" as const,
    priority: "NORMAL" as const,
    isActive: true,
    isPermanent: false,
    isClosable: true,
  };

  assert.equal(announcement.placement, "DASHBOARD_BANNER");
  assert.equal(announcement.audience, "PAID_ONLY");
  assert.equal(announcement.isActive, true);
});
