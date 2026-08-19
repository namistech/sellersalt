import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MockBillingAdapter } from "../services/billing/billing-provider";
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

// The Browser Extension URL Classifier suite that previously lived here
// tested extension/etsy/page-detector.js, part of the Etsy-hosted content
// script removed during the Etsy Commercial API compliance remediation
// (see src/tests/etsy-commercial-compliance-remediation.test.ts). The
// extension no longer reads or classifies any Etsy page DOM/URL content.
