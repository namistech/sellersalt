# SellerSalt — Billing & Subscription Specification

- **Document Version:** 2.0.0
- **Status:** Canonical Specification
- **System Classification:** Payments, Plan Limits & Monetization Infrastructure

---

## 1. Executive Purpose & Multi-Gateway Support

SellerSalt acts as the merchant of record, integrating with **Stripe** (Cards / Dynamic Checkout Sessions) and **PayPal** (REST Subscriptions with lazy Plan generation), alongside support for **SafePay** and **PayFast**.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       BILLING ARCHITECTURE OVERVIEW                         │
├──────────────────────────────────────┬──────────────────────────────────────┤
│ 1. DYNAMIC CHECKOUT (Stripe)         │ 2. LAZY PLAN CREATION (PayPal)       │
│    • Real-time inline `price_data`   │    • Plans created on first purchase │
│    • DB `Package` is single source   │    • Cached on `Package` record      │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ 3. IDEMPOTENT WEBHOOKS               │ 4. MULTI-GATEWAY ADMIN CONTROLS      │
│    • Signature verification          │    • Live vs Sandbox toggle          │
│    • `PaymentWebhookEvent` log       │    • Dynamic credential entry        │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

---

## 2. Plan Limit Enforcement (`checkLimit`)

All quota-restricted operations (creating search configs, adding tracked shops, generating AI drafts, connecting stores) pass through `src/lib/plan-limits.ts`:
- Reads the active organization's `Package` quotas.
- Rejects requests exceeding allowed limits with standard `403 Limit Reached` errors and upgrade URLs.
