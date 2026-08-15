Status: Draft
Owner: [ASSUMPTION] Founder (Aliyan)
Last Updated: 2026-08-15
Decision State: Current-state factual; future needs [DECISION REQUIRED].
Capability-based entitlement (needed for MCP access, among other future
gated features) is now [LOCKED] as a direction — see "Capability-based
entitlement" below. Billing remaining the sole source of truth for the
future Affiliate Program's commission events is also [LOCKED] — see
"Affiliate commission is derived from billing, never a parallel truth"
below.

# Billing Architecture

See also [billing/billing-lifecycle.md](../billing/billing-lifecycle.md)
for the lifecycle/state-machine view, and
[product/plans.md](../product/plans.md) for plan/pricing content.

## Models

- `Package` — plan tiers, DB-editable, cached `paypalProductId`/
  `paypalPlanId` (lazy-created on first PayPal purchase per package,
  since PayPal requires a pre-created Plan resource unlike Stripe's
  inline dynamic pricing).
- `PaymentProvider` — one row per `PaymentProviderType`
  (`STRIPE`/`PAYPAL`/`SAFEPAY`/`PAYFAST`/`MANUAL`), platform-level (not
  per-org — SellerSalt itself is the merchant of record). Holds
  **separate** `encryptedLiveCredentials` and
  `encryptedSandboxCredentials` plus a `mode` toggle, so switching
  live/sandbox for testing never requires re-entering keys. `priority`
  (lower = shown first) ranks active providers on the checkout/billing
  page. `MANUAL` is not a real payment rail — it's the mechanism behind
  admin-granted subscriptions (see below).
- `Subscription` — one row per org (`@@unique` on `organizationId`),
  driven by webhooks via `upsertSubscription()` (`src/lib/subscription.ts`),
  **not** by the initial checkout response. Fields: `provider`,
  `providerCustomerId`, `providerSubscriptionId`, `status`
  (`INCOMPLETE`/`TRIALING`/`ACTIVE`/`PAST_DUE`/`CANCELED`),
  `currentPeriodEnd`, `cancelAtPeriodEnd`.
- `PaymentWebhookEvent` — idempotency log, unique on
  `(provider, externalEventId)`. `isDuplicateWebhookEvent()` /
  `recordWebhookEvent()` guard every webhook handler so a retried
  delivery (both Stripe and PayPal retry) can't double-process.
- `Coupon` — `PERCENT` or `FIXED`, `isActive`, `maxRedemptions` +
  `redemptionCount`, `expiresAt`. `validateCoupon()` and
  `applyCouponDiscount()` in `src/lib/coupons.ts` compute the discounted
  trial and recurring price; `redeemCoupon()` increments the redemption
  counter and is **only called once a checkout session/subscription is
  actually created** — the validate/preview endpoint (`/api/billing/coupon/validate`)
  deliberately does not redeem.

## The access-control rule

`upsertSubscription()` is the single place that decides what package an
org actually has access to: `status IN (ACTIVE, TRIALING)` → org gets
the purchased `packageId`; anything else (`PAST_DUE`, `CANCELED`,
`INCOMPLETE`) → org falls back to the `STARTED` package. This means
`Organization.packageId` is **not** the source of truth for "what did
they buy" — `Subscription` is; `Organization.packageId` is a derived,
denormalized cache of current entitlement that `checkLimit()`
(`src/lib/plan-limits.ts`) reads for cheap limit checks without joining
`Subscription` on every request.

## Stripe integration

Fully dynamic Checkout Sessions using inline `price_data` — no
pre-created Stripe `Price` objects. This keeps the DB-edited `Package`
row as the single source of truth for price; changing a price in
`/admin` takes effect on the very next checkout with no Stripe-side
sync step. Webhook handler: `src/app/api/webhooks/stripe/route.ts`,
verifies via local HMAC (`stripe.webhooks.constructEvent`).

## PayPal integration

Direct REST calls, not the SDK — root `CLAUDE.md` states this was a
deliberate choice due to lower confidence in that specific newer SDK's
method surface vs. PayPal's stable, well-documented REST API. Lazy
Product+Plan creation on first purchase per package
(`src/lib/payment-providers/paypal-plans.ts`), cached on `Package`.
Webhook handler: `src/app/api/webhooks/paypal/route.ts`, verifies via a
live verification API call (PayPal has no local HMAC option, unlike
Stripe).

## Admin-grantable subscriptions

`PaymentProviderType.MANUAL` lets an admin assign/grandfather an org
onto a plan with no real payment provider behind it —
`src/app/api/admin/organizations/[id]/subscription/route.ts`. Goes
through the same `Subscription` row and the same access-control rule
above, so a manually-granted subscription behaves identically to a paid
one from the rest of the app's point of view.

## Capability-based entitlement

**[LOCKED — Decision 4, 2026-08-15]** MCP access (external AI agents —
see [architecture/mcp.md](mcp.md)) must be gated as a capability/
entitlement, never as a hardcoded plan-key comparison
(`if (package.key === "PRO")`) anywhere in the codebase. This is the
first **locked** requirement for a capability model that
[product/plans.md](../product/plans.md) had already independently
flagged as a gap ("Feature-gated tiers... nothing in the current
`Package` shape supports boolean feature flags per tier") — `mcp_access`
is the concrete forcing function, but the resulting mechanism should be
general enough to gate `ai_assistant`, `reports`, and any other future
feature-tier capability the same way, not built as MCP-specific
plumbing.

Intended shape (**[FUTURE]** — no schema change made in this pass):
`Package` grows a capability set (`research`, `connected_shop`,
`optimization`, `reports`, `ai_assistant`, `mcp_access`, …), and
`checkLimit()`/a sibling function grows a boolean capability-check
alongside its existing numeric-limit checks. **[LOCKED]**: cheaper plans
do not include `mcp_access` initially — it is premium-plan-only from
launch. **[DECISION REQUIRED]**: exact schema shape
(`features: String[]` vs. a join table vs. structured JSON) and which
specific `Package` key(s) count as "eligible premium." Full detail:
[architecture/mcp.md §Commercial model](mcp.md#commercial-model--capability-based-entitlement).

Entitlement must be checked live per request/call (the same "not cached
indefinitely" discipline `Subscription.status` already enforces via
`upsertSubscription()`'s access-control rule above), not derived once
and trusted for the life of a credential.

## Affiliate commission is derived from billing, never a parallel truth

**[LOCKED — Decision 5, 2026-08-15]** The future Affiliate Program
([architecture/affiliate.md](affiliate.md)) must not duplicate billing
truth. `Subscription`, `PaymentWebhookEvent`, and the payment providers
themselves remain the only source of truth for what a customer was
actually charged, refunded, or charged back. A Commission Event
references a specific billing fact (a `Subscription`'s state
transition, anchored the same way `upsertSubscription()`'s existing
`status IN (ACTIVE, TRIALING)` access-control rule already anchors real
access) — it does not re-derive or independently assert payment facts.
Refunds and chargebacks are billing events first (handled by the
existing, signature-verified Stripe/PayPal webhook handlers) and
commission-ledger consequences second, via a downstream reversal, never
via a second, parallel detection mechanism. Full detail:
[architecture/affiliate.md §Billing integration](affiliate.md#billing-integration--billing-remains-the-source-of-truth).

## What's explicitly not built

- **Webhook registration in the Stripe/PayPal dashboards.** The
  endpoints exist and verify correctly, but per root `CLAUDE.md` this
  must be done manually before a real purchase will actually update
  someone's plan. Do this before testing a real checkout end-to-end.
- **Safepay/PayFast checkout logic** — credential storage only
  (`PaymentProvider` rows can exist for them, `mode`/priority all work),
  no actual checkout flow. Same shared `Subscription`/webhook framework
  is ready for them.
- **Monthly vs. annual billing intervals** — `Package.priceUsd` is a
  single number, no interval field. [DECISION REQUIRED]
- **Upgrades/downgrades/scheduled downgrades** as first-class flows —
  [VERIFY] whether the checkout flow currently supports changing an
  existing subscription's package, or only new-subscription checkout.
  Not directly inspected this pass; `src/app/api/billing/checkout/route.ts`
  would be the place to check. See
  [billing/billing-lifecycle.md](../billing/billing-lifecycle.md).
- **Invoices / payment method management / transaction history UI** —
  [VERIFY]; not confirmed built in this pass.
