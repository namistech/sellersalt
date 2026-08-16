/**
 * SellerSalt Billing Provider Abstraction
 * 
 * Clean adapter interface separating SellerSalt business domain logic from
 * external payment gateways (Stripe, Paddle, LemonSqueezy, etc.).
 * Includes a safe local/development mock adapter with zero external credential requirements.
 */

export interface CheckoutOptions {
  organizationId: string;
  userEmail: string;
  planKey: "STARTED" | "PRO" | "AGENCY";
  billingInterval: "MONTHLY" | "ANNUAL";
  isTrial?: boolean;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  checkoutUrl: string;
}

export interface BillingWebhookEvent {
  id: string;
  type:
    | "checkout.completed"
    | "subscription.created"
    | "subscription.updated"
    | "subscription.canceled"
    | "payment.succeeded"
    | "payment.failed";
  organizationId: string;
  planKey: string;
  status: "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED";
  currentPeriodEnd: Date;
  trialEnd?: Date;
}

export interface BillingProviderAdapter {
  createCheckoutSession(options: CheckoutOptions): Promise<CheckoutSessionResult>;
  cancelSubscription(subscriptionId: string): Promise<boolean>;
  verifyWebhookSignature(payload: string, signature: string): boolean;
  parseWebhookEvent(payload: string): BillingWebhookEvent | null;
}

/**
 * Development & CI Safe Mock Billing Adapter
 */
export class MockBillingAdapter implements BillingProviderAdapter {
  async createCheckoutSession(options: CheckoutOptions): Promise<CheckoutSessionResult> {
    const sessionId = `mock_sess_${Date.now()}_${options.planKey.toLowerCase()}`;
    const checkoutUrl = `/checkout?plan=${options.planKey}&interval=${options.billingInterval}&session_id=${sessionId}`;
    return { sessionId, checkoutUrl };
  }

  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    return true;
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    return Boolean(signature && signature.startsWith("mock_sig_"));
  }

  parseWebhookEvent(payload: string): BillingWebhookEvent | null {
    try {
      const data = JSON.parse(payload);
      return {
        id: data.id || `evt_${Date.now()}`,
        type: data.type || "checkout.completed",
        organizationId: data.organizationId,
        planKey: data.planKey || "PRO",
        status: data.status || "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        trialEnd: data.isTrial ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) : undefined,
      };
    } catch {
      return null;
    }
  }
}

export const billingProvider: BillingProviderAdapter = new MockBillingAdapter();
