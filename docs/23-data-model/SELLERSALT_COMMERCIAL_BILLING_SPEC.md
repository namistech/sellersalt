# SellerSalt Canonical Commercial Billing & Subscription Architecture Spec

## 1. Overview
SellerSalt operates a multi-tier commercial SaaS model designed for eCommerce intelligence, opportunity discovery, competitor surveillance, and listing execution across Etsy (active) and forthcoming multi-marketplace channels.

The billing engine is built on a strict **server-authoritative model**: client applications (Web app, Browser Extension, REST APIs) never self-declare plan tiers, subscription statuses, or quota limits. All entitlement decisions are resolved server-side.

---

## 2. Canonical Subscription Lifecycle State Machine

External payment providers (Stripe, PayPal, Safepay, PayFast) emit provider-specific events which are normalized into SellerSalt's canonical 8-state lifecycle:

```
               ┌───────────────┐
               │     FREE      │ (Default unauthenticated / Free Explorer)
               └───────┬───────┘
                       │ (Starts $1/3-Day Trial)
                       ▼
               ┌───────────────┐
               │   TRIALING    │
               └───────┬───────┘
                       │ (Converts / Renews)
                       ▼
               ┌───────────────┐
               │    ACTIVE     │ ◄────────────────────────┐
               └───────┬───────┘                          │
                       │ (Payment Failed / Grace Period)  │ (Reactivated)
                       ▼                                  │
               ┌───────────────┐                          │
               │   PAST_DUE    │ ─────────────────────────┘
               └───────┬───────┘
                       │ (Grace Period Expired / Cancelled)
                       ▼
               ┌───────────────┐
               │   CANCELED    │
               └───────┬───────┘
                       │ (Period End Passed)
                       ▼
               ┌───────────────┐
               │    EXPIRED    │ ───► Falls back to FREE Explorer without data loss
               └───────────────┘
```

### Supported States:
1. `FREE` — Default tier with limited monthly searches and progressive upgrade gates.
2. `TRIALING` — Active 3-day Pro trial ($1.00 upfront).
3. `ACTIVE` — Subscription active and paid up to date.
4. `PAST_DUE` — Payment attempt failed; in grace period.
5. `CANCELED` — Customer initiated cancellation; active until period end.
6. `EXPIRED` — Billing period ended; privileges revert safely to Free Explorer.
7. `PAYMENT_FAILED` — Terminal payment error.
8. `INCOMPLETE` — Checkout initiated but pending initial payment confirmation.

---

## 3. Plan Transition Matrix & Downgrade Safety

| From Tier | To Tier | Transition Type | Data Preservation Policy | Over-Limit Enforcement |
|---|---|---|---|---|
| **Free** | **Starter** | Upgrade ($19/mo) | 100% Preserved | Quotas expanded to 250 searches, 10 tracked shops |
| **Free** | **Pro** | Upgrade ($49/mo) | 100% Preserved | Quotas expanded to 2,500 searches, 50 shops, AI studio |
| **Starter** | **Pro** | Upgrade ($49/mo) | 100% Preserved | Full advanced surveillance & AI generation unlocked |
| **Pro** | **Agency** | Upgrade ($199/mo) | 100% Preserved | Multi-store & agency client tools unlocked |
| **Agency** | **Pro** | Downgrade | 100% Preserved | Existing client catalogs preserved; new client additions capped |
| **Pro** | **Starter** | Downgrade | 100% Preserved | Existing shops & drafts preserved; creation capped at 10 |
| **Starter** | **Free** | Downgrade | 100% Preserved | Research history preserved; new searches capped at 15/mo |

**Absolute Rule on Downgrades**:
SellerSalt **never deletes or truncates user data** upon downgrade. If an organization has 35 tracked shops and downgrades to Starter (limit 10), all 35 shops remain visible with historical charts. Creation of new tracked shops is restricted until usage is below 10 or the plan is upgraded.

---

## 4. Webhook Idempotency & Replay Protection

All inbound webhook endpoints (`/api/webhooks/stripe`, `/api/webhooks/paypal`, `/api/webhooks/safepay`, `/api/webhooks/payfast`) enforce:
1. **Signature Verification**: Validates HMAC cryptographic signatures before parsing payload.
2. **Deduplication Gate**: Checks `PaymentWebhookEvent` table for `(provider, externalEventId)` collisions. If present, returns HTTP 200 `{ ok: true, duplicate: true }` immediately without reprocessing.
3. **Audit Trail**: Records every processed webhook in the database with timestamps and event types.

---

## 5. Privacy-Conscious Conversion Analytics Taxonomy

Events are tenant-scoped and contain zero sensitive user credentials or PII:

- `signup_completed`
- `onboarding_started`
- `onboarding_completed`
- `first_value_reached`
- `free_tool_used`
- `keyword_research_run`
- `product_research_run`
- `seo_audit_run`
- `opportunity_saved`
- `upgrade_gate_viewed`
- `pricing_viewed`
- `checkout_started`
- `checkout_completed`
- `trial_started`
- `subscription_activated`
- `subscription_canceled`
- `subscription_downgraded`
- `subscription_upgraded`

---

## 6. Production Launch Checklist

- [x] Canonical subscription state machine defined in `src/services/billing/subscription-lifecycle.ts`.
- [x] Multi-tenant scoping enforced on all queries (`where: { organizationId }`).
- [x] Non-destructive downgrade evaluation verified with automated tests.
- [x] Contextual 5-part `UpgradeGate` messaging implemented and active.
- [x] First-Value Onboarding at `/onboarding` with 4 fast-start steps.
- [x] Activation checklist with dynamic progress bar integrated into `/dashboard`.
- [x] 13-state Etsy connector lifecycle diagnostics verified without inventing capabilities.
- [x] SEO audit multi-input parsing (Numeric ID, URL, Shop URL, Query parameters) resilient against 500 errors.
