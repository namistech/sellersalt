Status: Draft
Owner: [ASSUMPTION] Founder (Aliyan)
Last Updated: 2026-08-14
Decision State: Current-state factual for what's built; future lifecycle stages [DECISION REQUIRED]

# Billing Lifecycle

See [architecture/billing.md](../architecture/billing.md) for the model-
level architecture. This document walks the actual request flow,
end to end, as of the 2026-08-13/14 checkout-merge commits (see git log:
"Add checkout-gated signup flow, admin-grantable subscriptions, and
coupon system", "Merge signup into checkout as one page... SessionProvider",
"Redirect old /signup route into unified checkout flow").

## 1. Signup now happens *on* checkout, not before it

`/checkout` (`src/app/checkout/page.tsx`) is the entry point for new
visitors — the old standalone `/signup` route now redirects here. The
page only redirects an existing session away (to `/dashboard`) if that
org already has an `ACTIVE` or `TRIALING` subscription; a logged-out
visitor, or a logged-in visitor without a paid subscription, is exactly
who this page serves.

`checkout-client.tsx` defaults to `accountMode: "signup"` and toggles to
`"login"` for returning users. Submitting signup calls `POST
/api/signup` (`src/app/api/signup/route.ts`), which in one request:
creates one `User` + one `Organization` + one `OWNER` `Membership` — the
code comment calls this "the single org per user today, schema ready for
more" pattern, i.e. nothing structurally prevents a second membership
later (team invites already do this), but signup itself always creates
exactly one fresh org. The same call establishes the session (via
`signIn`/`useSession` from `next-auth/react` — this is why `SessionProvider`
was added to `src/app/providers.tsx` in the referenced commit, to make
`useSession()` usable client-side on this page).

## 2. Package selection + checkout

Still on `/checkout`, now with a session: the user picks a package
(`?plan=` query param preselects one, defaulting to `STARTED`),
optionally enters a coupon code (validated live via `POST
/api/billing/coupon/validate` — **does not** redeem it, just previews
the discount via `applyCouponDiscount()`), and picks a payment provider
from whichever `PaymentProvider` rows are `isActive: true` (ordered by
`priority`).

Submitting calls `POST /api/billing/checkout/route.ts`, which:
1. Requires an authenticated session with an `organizationId` (401 if
   not — this is why step 1 must complete first).
2. Re-validates the coupon server-side if present.
3. For **Stripe**: creates or reuses a Stripe Customer, then builds a
   Checkout Session. Trial handling is deliberately *not* Stripe's
   native `trial_period_days` (which charges $0 during trial) — instead
   a one-time line item charges the real trial fee immediately
   (`trialPriceUsd`), and the recurring subscription price is [the
   comment is cut off in this pass at the point inspected —
   [VERIFY] the exact mechanism completing this in
   `src/app/api/billing/checkout/route.ts` past line 60, not fully read].
4. For **PayPal**: resolves or lazily creates a Product+Plan for the
   package (`getOrCreatePaypalPlan`), or a discounted variant if a
   coupon applies (`createDiscountedPaypalPlan`).
5. Coupon is only actually redeemed (`redeemCoupon()`, increments
   `redemptionCount`) once the session/subscription is genuinely
   created — never at the validate/preview step.

## 3. Webhook-driven activation

The checkout response itself does **not** grant plan access.
Stripe/PayPal webhooks (`src/app/api/webhooks/{stripe,paypal}/route.ts`)
are the only path that calls `upsertSubscription()`
(`src/lib/subscription.ts`), which is the single place `Organization.packageId`
actually gets updated based on `Subscription.status`. This means: **a
successful checkout redirect does not itself mean the org has access
yet** — the UI must handle the async gap between "checkout completed in
the browser" and "webhook processed." [VERIFY] how `checkout-client.tsx`
handles this gap (polling, optimistic UI, or just redirecting to
`/dashboard` and relying on the webhook having already landed by the
time the user gets there).

**Prerequisite not yet done**: webhooks must be manually registered in
the Stripe and PayPal dashboards before this activation path works for
a real purchase (root `CLAUDE.md`, "What's explicitly NOT built yet").

## 4. Cancellation

`POST /api/billing/cancel` (`src/app/api/billing/cancel/route.ts`, 52
lines) — [VERIFY] exact behavior (immediate cancel vs.
`cancelAtPeriodEnd`); not read in full this pass. `Subscription` has a
`cancelAtPeriodEnd` boolean field, suggesting scheduled-cancellation is
at least represented in the schema.

## 5. Admin-granted (manual) subscriptions

`PaymentProviderType.MANUAL` — an admin assigns a package to an org via
`src/app/api/admin/organizations/[id]/subscription/route.ts`, bypassing
Stripe/PayPal entirely but still going through the same `Subscription`
row and `upsertSubscription()` access-control logic. Functionally
identical downstream to a paid subscription.

## What the lifecycle does not yet support [DECISION REQUIRED]

- **Upgrades/downgrades of an existing subscription** — [VERIFY] whether
  `/api/billing/checkout` handles "change my existing package" or only
  first-time purchase; the `existingSub` lookup in the route suggests
  some reuse-of-customer logic exists, but changing an *active*
  subscription's plan (as opposed to creating a new one) wasn't
  confirmed in this pass.
- **Scheduled downgrades** — no code path found; would need explicit
  handling given `cancelAtPeriodEnd` exists for cancellation but no
  analogous field for "downgrade at period end."
- **Monthly vs. annual billing** — `Package.priceUsd` has no interval;
  see [architecture/billing.md](../architecture/billing.md).
- **Invoices / payment method management / transaction history UI** —
  not confirmed built.
