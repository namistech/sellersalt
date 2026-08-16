import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MockBillingAdapter } from "../services/billing/billing-provider";
import {
  classifyEtsyUrl,
  extractListingIdFromUrl,
  extractShopNameFromUrl,
  EtsyPageType,
} from "../../extension/etsy/page-detector.js";
import {
  PLAN_DEFINITIONS,
  getFeatureAccess,
} from "../services/plans/plan-capabilities";

describe("Batch 18: Billing Provider Abstraction & Webhook Verification", () => {
  const billing = new MockBillingAdapter();

  it("generates structured checkout sessions with carryover params", async () => {
    const session = await billing.createCheckoutSession({
      organizationId: "org_123",
      userEmail: "seller@example.com",
      planKey: "PRO",
      billingInterval: "ANNUAL",
      successUrl: "https://sellersalt.com/workspace",
      cancelUrl: "https://sellersalt.com/pricing",
    });

    assert.ok(session.sessionId.startsWith("mock_sess_"));
    assert.ok(session.checkoutUrl.includes("plan=PRO"));
    assert.ok(session.checkoutUrl.includes("interval=ANNUAL"));
  });

  it("verifies and parses billing webhook events idempotently", () => {
    const valid = billing.verifyWebhookSignature("payload", "mock_sig_12345");
    assert.strictEqual(valid, true);

    const invalid = billing.verifyWebhookSignature("payload", "invalid_sig");
    assert.strictEqual(invalid, false);

    const event = billing.parseWebhookEvent(
      JSON.stringify({
        id: "evt_123",
        type: "checkout.completed",
        organizationId: "org_test",
        planKey: "PRO",
        isTrial: true,
      })
    );

    assert.strictEqual(event?.type, "checkout.completed");
    assert.strictEqual(event?.organizationId, "org_test");
    assert.strictEqual(event?.planKey, "PRO");
    assert.ok(event?.trialEnd instanceof Date);
  });
});

describe("Batch 18: Browser Extension Expanded URL Classifier", () => {
  it("detects public Etsy listing page and extracts listing ID", () => {
    const url = "https://www.etsy.com/listing/1429810482/custom-leather-journal";
    const type = classifyEtsyUrl(url);
    const id = extractListingIdFromUrl(url);

    assert.strictEqual(type, EtsyPageType.ETSY_LISTING_PUBLIC);
    assert.strictEqual(id, "1429810482");
  });

  it("detects public Etsy shop page and extracts shop name", () => {
    const url = "https://www.etsy.com/shop/LayerSculpt3D?ref=search";
    const type = classifyEtsyUrl(url);
    const shopName = extractShopNameFromUrl(url);

    assert.strictEqual(type, EtsyPageType.ETSY_SHOP_PUBLIC);
    assert.strictEqual(shopName, "LayerSculpt3D");
  });

  it("detects search results and non-Etsy pages", () => {
    assert.strictEqual(
      classifyEtsyUrl("https://www.etsy.com/search?q=acrylic+calendar"),
      EtsyPageType.ETSY_SEARCH_RESULTS
    );
    assert.strictEqual(
      classifyEtsyUrl("https://www.amazon.com/dp/B08N5WRWNW"),
      EtsyPageType.NOT_ETSY
    );
  });
});
