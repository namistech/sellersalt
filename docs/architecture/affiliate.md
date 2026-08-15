Status: Draft
Owner: [ASSUMPTION] Founder (Aliyan)
Last Updated: 2026-08-15
Decision State: That SellerSalt must have a first-class Affiliate
Program, that affiliate participation is **not** an account type (never
`User.type = AFFILIATE`, never a third-alongside-Agency/Institute
`Organization.kind`), and that billing remains the single source of
truth for all money movement (commission is *derived* from billing
events, never a parallel ledger of truth) are **[LOCKED]** (Decision 5,
2026-08-15 — see [MASTER_BLUEPRINT.md](../MASTER_BLUEPRINT.md)).
Everything else in this document — the commission rule model, the
ledger's concrete schema, attribution-window rules, payout provider,
fraud rules, and the product surface — is
[DECISION REQUIRED]/[ASSUMPTION]/[FUTURE] as marked throughout.
**Nothing in this document is implemented.** No application code, Prisma
schema, migration, dependency, or route was changed to produce it.

# SellerSalt Affiliate Program — Architecture

Primary technical/product reference for the Affiliate Program. Extends,
and cross-references rather than duplicates,
[architecture/billing.md](billing.md),
[architecture/organizations.md](organizations.md),
[architecture/rbac.md](rbac.md),
[architecture/data.md](data.md),
[security/security-model.md](../security/security-model.md), and
[architecture/mcp.md](mcp.md) (for the MCP/AI boundary question).

## What this is

A first-class growth and monetization capability: people (not
necessarily SellerSalt customers themselves) promote SellerSalt via a
referral link/code, and earn commission when that referral converts into
paying SellerSalt revenue. "First-class" means: a real commission
engine, a real auditable ledger, a real admin console, and a real
affiliate-facing dashboard — not a referral-code text field on `Coupon`
and a footer mailto link.

## Current state

**Nothing exists.** Verified against the repository in this pass: no
`Affiliate`-related model anywhere in `prisma/schema.prisma` (full model
inventory checked), no referral/attribution parameter handling in
`src/app/api/signup/route.ts` or `src/app/api/billing/checkout/route.ts`
(both inspected directly), no attribution cookie/session logic found.
The only existing uses of the word "affiliate" in the codebase are (a)
`shopify_affiliate_url` — an **outbound** referral link SellerSalt uses
when *recommending Shopify to its own customers*, an `AppSetting`-backed
value entirely unrelated to a SellerSalt-run program
(see [architecture/integrations.md](integrations.md)) — and (b) two
static `mailto:hello@netdrix.com?subject=Affiliate%20Program` links in
`src/app/marketing-homepage.tsx`'s footer ("Become a Partner,"
"Commission Rates"), which are exactly the "referral-code field and a
marketing page" this task explicitly says the real program must be
more than. **Naming collision to flag, same shape as the `AGENCY`
package-key collision already noted in
[product/plans.md](../product/plans.md)**: "Affiliate" the future
program and `shopify_affiliate_url` the existing setting are unrelated
concepts sharing a word — no renaming is required (the existing setting
is not user-facing under that name), but a future implementer should not
assume any relationship between them.

---

## Core architectural principle — Affiliate is not an account type

**[LOCKED — Decision 5]**

```
User
 ├── Account / Organization Membership   (Individual / Agency / Institute — Decision 1)
 └── Affiliate Relationship               (independent, orthogonal)
```

Do not create `User.type = AFFILIATE`. Do not create an `Organization`
`kind` value for Affiliate merely to represent program participation.
Affiliate status is a **separate commercial relationship** — a program
membership — attached to a `User`, structurally parallel to (and
independent of) that same `User`'s `Membership` row(s) in whatever
Organization(s) they belong to. Concretely, all of the following are
simultaneously true and unremarkable under this model:

- An Individual SellerSalt customer can also be an Affiliate.
- An Agency Owner can also be an Affiliate (and the commission they earn
  has nothing to do with their Agency's own billing).
- An Institute Staff member can potentially also be an Affiliate.
- **A person can be an Affiliate with *no* SellerSalt customer
  Organization at all** — a pure marketer/blogger/creator who refers
  people to SellerSalt but never becomes a paying customer themselves.
  This last case is the concrete reason Affiliate cannot be modeled as
  an attribute *of* an Organization (e.g. an `Organization.isAffiliate`
  flag) — there may be no Organization to attach it to.

This mirrors, and deliberately reuses the reasoning behind, Decision 1's
"shared primitives, distinct domain models" split
([architecture/organizations.md](organizations.md)) — `User` stays the
one identity primitive; Affiliate is a new, independent relationship
hanging off `User`, not a new flavor of `Organization` or a new enum
value colliding with the account-type axis. See
[Database implications](#database-implications-conceptual-only) for the
conceptual `Affiliate` primitive shape.

---

## The affiliate product loop

**[LOCKED — Decision 5]** the pipeline shape below is committed.
**[DECISION REQUIRED]** on every business rule governing transitions
between its stages — none are invented by this document.

```
Affiliate application / enrollment
        ↓
Approval
        ↓
Affiliate identity
        ↓
Referral link / code
        ↓
Visitor attribution
        ↓
Signup
        ↓
Trial / subscription
        ↓
Conversion
        ↓
Commission event
        ↓
Pending
        ↓
Approved
        ↓
Payable
        ↓
Paid
```

| Stage | What happens | Grounded in / analog |
|---|---|---|
| Application/enrollment | A person (existing `User` or a new one) applies to the program via a public form. | New — no existing analog. Public route: `/affiliate/apply` (see [Public website surface](#public-website-surface)). |
| Approval | An admin (or, [DECISION REQUIRED], an automatic rule for low-risk applicants) reviews and approves/rejects. | Structurally similar to how `Invite.status` transitions `PENDING → ACCEPTED`, but a distinct model — an affiliate application is not a team invite. |
| Affiliate identity | Once approved, the `User` gains an `Affiliate` record: status, referral slug/code, commission rule assignment, payout config. | See [Affiliate identity](#affiliate-identity). |
| Referral link/code | A unique, shareable link/slug (e.g. `sellersalt.com/?ref=slug` or `sellersalt.com/r/slug`) the affiliate distributes. | See [Attribution architecture](#attribution-architecture). |
| Visitor attribution | A visitor arrives via that link; SellerSalt records which affiliate should get credit if this visitor later converts. | New — see [Attribution architecture](#attribution-architecture). |
| Signup | The attributed visitor creates a SellerSalt account (today: `src/app/api/signup/route.ts`, merged into `/checkout` per [billing/billing-lifecycle.md](../billing/billing-lifecycle.md)). | Attribution must survive from "visitor" to "signed-up `User`" — a real technical requirement, not yet supported by any field on `User`/`Organization` today. |
| Trial/subscription | The signed-up user starts a `Subscription` (today, every plan uses a real trial charge, not $0 — [product/plans.md](../product/plans.md)). | `Subscription.status = TRIALING`/`INCOMPLETE`. |
| Conversion | The subscription reaches a commission-eligible state — [DECISION REQUIRED] exactly which state (see below). | `Subscription.status = ACTIVE` is the natural candidate, mirroring the existing access-control rule in [architecture/billing.md](billing.md). |
| Commission event | A ledger entry is created, referencing the triggering billing event. | See [Affiliate ledger](#affiliate-ledger-event-sourced-not-a-balance-field). Never computed by re-deriving from `Subscription`/`PaymentWebhookEvent` on the fly at payout time — recorded once, as its own auditable fact. |
| Pending | The commission event exists but isn't yet payable — e.g. within a refund/chargeback window. | Mirrors `Coupon`'s validate-then-redeem split conceptually: something can be provisionally true before it's confirmed. |
| Approved | The pending window has passed (or an admin manually approved it) without reversal. | [DECISION REQUIRED]: exact hold period. |
| Payable | Approved and above any per-payout minimum threshold, awaiting the next payout run. | See [Payouts](#payouts). |
| Paid | Included in a completed payout. | Terminal state for that commission event (absent a later reversal — see below). |

### Reversal events, and how they interact with the loop

**[DECISION REQUIRED]** on exact rules; the following must all be
representable by the ledger design (see
[Affiliate ledger](#affiliate-ledger-event-sourced-not-a-balance-field)),
whatever the final rules turn out to be:

| Billing event | Effect on commission | Notes |
|---|---|---|
| Refund | Should be able to reverse or partially reverse the associated Commission Event, likely only if the commission hasn't yet reached Paid — [DECISION REQUIRED] whether a refund after Paid claws back from a future payout or is written off. |
| Chargeback | Same shape as refund, but higher fraud signal — see [Security / fraud](#security--fraud). Should almost certainly reverse commission regardless of stage, given chargebacks already represent a payment SellerSalt itself didn't actually keep. |
| Cancellation | Does not, by itself, reverse *already-earned* commission for periods already paid for — [DECISION REQUIRED] whether it stops *future* recurring commission (relevant only if a recurring commission rule is in effect — see [Commission engine](#commission-engine)). |
| Failed payment | `Subscription.status = PAST_DUE` — if commission was tied to an expected renewal that never actually happened, no Commission Event should have been created for that (unmaterialized) renewal in the first place; nothing to reverse if commission events are only ever created from confirmed billing events, not anticipated ones. |
| Subscription upgrade | [DECISION REQUIRED]: does the affiliate earn a delta commission on the upgraded amount, a fresh full commission event, or nothing extra? Depends entirely on which commission rule type is in effect (see below). |
| Subscription downgrade | [DECISION REQUIRED]: symmetric question — does future recurring commission (if applicable) reduce accordingly? |
| Coupon interaction | If the referred customer also used a `Coupon` (discount), should commission be computed on the discounted price actually paid, or the list price? [DECISION REQUIRED] — this document recommends **discounted price actually paid** (commission should never exceed real revenue collected), but does not lock it. |

**Hard rule regardless of how the above are resolved**: every one of
these is a **new ledger entry** (a reversal/adjustment event), never a
mutation of a prior entry's amount. See next section.

---

## Commission engine

**[LOCKED — Decision 5]** Commission must **not** be hardcoded (e.g. "20%
for every affiliate," a single constant anywhere in code). The
architecture must support a rule-based model capable of expressing, at
minimum, all of the following — **[FUTURE]**, architectural
possibilities the schema/engine must be able to represent, not locked
commercial terms:

- Percentage commission (e.g. 20% of first payment).
- Fixed commission (e.g. $50 flat per conversion).
- First-payment-only commission (one-time, on the initial charge only).
- Recurring commission (a cut of every renewal, not just the first).
- Commission for a fixed duration (e.g. recurring for 12 months, then
  stops).
- Lifetime recurring commission (recurring for as long as the referred
  customer remains subscribed).
- Affiliate tiers (different rates/rules based on volume, tenure, or
  manual designation).
- Custom per-affiliate agreements (a negotiated override for a specific
  affiliate, distinct from the standard tier structure).

Conceptual shape (**[FUTURE]**, no schema designed): a `CommissionRule`
entity — type (`PERCENTAGE`/`FIXED`), value, applicability
(`FIRST_PAYMENT`/`RECURRING`), duration (`ONE_TIME`/`N_PERIODS`/
`LIFETIME`), and a reference to what it applies to (a default
program-wide rule, an `AffiliateTier`, or a specific `Affiliate` for a
custom agreement). An `Affiliate` resolves to exactly one effective
`CommissionRule` at the time each Commission Event is created — **the
rule that was in effect at conversion time should be captured on the
Commission Event itself** (not re-resolved later), so a future rule
change never silently alters the commission owed on a past conversion.
This is the same "snapshot the value at the time, don't re-derive it
later" principle `Coupon`'s discount computation already follows
(`applyCouponDiscount()` computes and the checkout session captures the
discounted price at creation time, not a live lookup at payment time).

**[DECISION REQUIRED]** — none of the following are decided by this
document: the default commission rate/type, whether tiers exist at
launch or are a v2 addition, whether custom agreements are supported at
launch, and the exact `CommissionRule` schema (a dedicated table vs. a
structured JSON field on `Affiliate`/`AffiliateTier`).

---

## Affiliate ledger (event-sourced, not a balance field)

**[LOCKED — Decision 5]** Affiliate earnings must not be modeled as a
single mutable `affiliate.balance` number. Every financial fact is a
discrete, immutable ledger entry; balances (pending/approved/payable/
paid) are **computed by summing entries**, the same way a real
accounting ledger works — never stored as an independently-updated
counter that can drift from the entries that produced it.

```
Referral
 ↓
Conversion
 ↓
Commission Event
 ↓
Pending
 ↓
Approved
 ↓
Payable
 ↓
Paid
```

Conceptual entry types (**[FUTURE]**, no schema designed) an
`AffiliateLedgerEntry`-style model must be able to represent:

| Entry type | Effect | Trigger |
|---|---|---|
| Commission creation | +amount, status `PENDING` | A Commission Event fires (see loop above) |
| Approval | Status transition `PENDING → APPROVED` on the referenced entry (or a new entry recording the transition — [DECISION REQUIRED] on whether status is a field on the original entry or its own event) | Hold period elapses, or admin manual approval |
| Reversal | −amount, referencing the original entry it reverses | Refund/chargeback (see loop table above) |
| Refund adjustment | Same shape as reversal, refund-specific reason code | Refund webhook |
| Chargeback adjustment | Same shape as reversal, chargeback-specific reason code, likely flagged for fraud review (see [Security / fraud](#security--fraud)) | Chargeback webhook |
| Manual adjustment | +/−amount, requires an admin actor and a reason, always logged | Support correction, goodwill adjustment, dispute resolution |
| Payout | −amount from payable balance, referencing the `Payout` it was included in | Payout run executes |
| Payout failure | Reverses the payout entry's debit (funds return to payable) if the actual transfer failed after the ledger entry was tentatively created — [DECISION REQUIRED] on exact sequencing (create-then-reverse-on-failure vs. only-create-on-confirmed-success) | Payout provider reports failure |

**Every entry is auditable**: who/what triggered it, when, the amount,
the reason, and (for reversals/adjustments) which prior entry it
relates to. This is the same minimum shape already specified for the
not-yet-built platform Activity/Audit primitive
([architecture/rbac.md](rbac.md)) and for MCP call logging
([architecture/mcp.md](mcp.md#audit-logging)) — the affiliate ledger is
a third, domain-specific application of "every consequential action is
independently recorded," not a fourth unrelated logging mechanism, even
though the ledger itself (being financial, not just an activity log)
likely needs its own dedicated table rather than reusing a generic
Activity/Audit row shape.

### User-facing surfacing — notifications and email

The ledger above is the durable record; it is not itself how an
affiliate finds out something happened. Two separate, already-designed
surfaces should carry the subset of ledger/lifecycle events a person
actually needs to be told about, rather than either being invented fresh
here:

- **Notification Center** — application approved/rejected, commission
  approved, payout sent/failed surface as an "Affiliate alerts" category
  in the existing unified Notification Center, alongside Shop/
  Competitor/Optimization/MCP alerts — see
  [design/information-architecture-v1.md §Notifications IA](../design/information-architecture-v1.md#notifications-ia).
- **Transactional email** — the same lifecycle events (application
  approved/rejected, payout sent/failed) are natural candidates for
  transactional email, following the exact pattern already real for
  team invites and password resets
  (`src/lib/send-email.ts`/`EmailSettings` —
  [architecture/integrations.md](integrations.md),
  [product/complete-product-surface.md §19](../product/complete-product-surface.md#19-communications)).
  **[FUTURE]** — no template exists for these yet (no transactional
  email template exists for *anything* today; `EmailSettings` is SMTP-
  connection config only), but this is the same, already-planned email
  system, not a separate affiliate-specific mailer.

---

## Attribution architecture

**[LOCKED — Decision 5]** attribution capture is required.
**[DECISION REQUIRED]** on every rule governing *how* it resolves —
explicitly, per this task's instruction, none of the following are
decided by this document:

- **Attribution window** — how long after a click does a signup still
  count (24 hours? 30 days? 90 days?).
- **First-touch vs. last-touch** — if a visitor clicks two different
  affiliates' links before signing up, who gets credit.
- **Referral-code override** — can a customer manually enter/change a
  referral code at checkout, overriding cookie-based attribution?
- **Cross-device behavior** — a visitor clicks on mobile, signs up on
  desktop; does attribution survive?
- **Direct signup after prior referral exposure** — a visitor clicks a
  referral link, doesn't convert immediately, later returns via a direct
  (non-referral) URL — does the earlier attribution still count within
  the window?
- **Multiple affiliates touching the same visitor** — resolution rule
  when more than one affiliate's link was clicked (ties to first/last-
  touch above, but may need its own explicit tie-breaking rule).
- **Self-referral prevention** — an affiliate must not be able to earn
  commission by referring themselves (a new email, a family member's
  card, etc. — genuinely a fraud question, see
  [Security / fraud](#security--fraud), but the attribution layer is
  where a first line of defense could live, e.g. rejecting attribution
  when the referred `User`'s email/payment fingerprint matches the
  affiliate's own).
- **Existing customer referral** — can a current SellerSalt customer be
  "referred" (e.g. an existing Individual upgrading, or a second
  Organization signup by someone who already has one) — [DECISION
  REQUIRED] whether attribution ever applies to anyone but a genuinely
  new `User`.
- **Attribution persistence through trial** — must survive from
  click → signup → trial → eventual paid conversion, which today, per
  [product/plans.md](../product/plans.md), is itself a real charge (not
  $0) — meaning the "first commission-eligible event" candidate is
  plausibly the trial charge itself, not a later "real" payment.
  [DECISION REQUIRED] which one counts.
- **Attribution on upgrade** — if a referred customer later upgrades
  plans, does that generate a fresh attribution question, or does
  original attribution simply continue to apply to whatever the
  customer is currently paying (relevant only for recurring/lifetime
  commission rules)?

### Mechanisms (architectural options, not a chosen implementation)

- **Referral URL** — a query parameter (e.g. `?ref=slug`) on any public
  page, most naturally the homepage and `/checkout`.
- **Referral slug/code** — the affiliate's unique identifier, embedded
  in the URL and/or enterable as a plain code at checkout (ties to the
  override question above).
- **Attribution cookie/session** — set on first touch, read at
  signup/checkout time. [DECISION REQUIRED]: cookie lifetime (should
  plausibly match the attribution window), and behavior under cookie-
  consent/privacy regimes (see [Security / fraud](#security--fraud) and
  the existing, still-unbuilt GDPR/consent gap in
  [security/security-model.md](../security/security-model.md)).
- **Signup attribution** — the point where a click-level attribution
  becomes attached to a real `User` record. Structurally, this is new
  surface area on the signup/checkout path
  (`src/app/api/signup/route.ts`, now merged into
  `src/app/api/billing/checkout/route.ts` per
  [billing/billing-lifecycle.md](../billing/billing-lifecycle.md)) —
  today that route accepts `packageKey`/`provider`/`couponCode` and
  nothing referral-related; a future `referralCode`/attribution token
  would be a new, independent field alongside `couponCode`, not a
  replacement for it. **Coupon and referral attribution are
  independent concepts that can co-occur on one checkout** — see the
  Coupon-interaction row in the product-loop table above.
- **Subscription attribution** — the durable link, once a `Subscription`
  exists, between that `Subscription` (or the `Organization` it belongs
  to) and the `Affiliate` who gets credit — this is what a recurring/
  lifetime Commission Event would key off on each future renewal.

None of these are chosen; this section exists so a future implementer
starts from the right question list rather than discovering these edge
cases mid-build — the same purpose
[architecture/marketplace.md](marketplace.md)'s "Questions explicitly
deferred" section already serves for a different area.

---

## Affiliate identity

Conceptual fields (**[FUTURE]**, not a final schema):

- Affiliate ID (own primary key, distinct from `User.id` — an
  `Affiliate` row references a `User`, it is not a flag on `User`).
- Referral slug (public, human-shareable, likely unique and
  admin/self-editable within constraints — [DECISION REQUIRED] on
  editability, since changing a slug could break already-distributed
  links).
- Referral code (may be the same value as the slug, or a separate
  short manual-entry code for the override case above — [DECISION
  REQUIRED]).
- Status (`APPLIED`/`APPROVED`/`SUSPENDED`/`REJECTED`/`REVOKED` —
  [ASSUMPTION] on exact enum values, mirroring the shape of existing
  status enums like `InviteStatus`/`SubscriptionStatus`, not a final
  list).
- Commission tier/rule reference — see
  [Commission engine](#commission-engine).
- Payout configuration — see [Payouts](#payouts).
- Application/approval metadata — applied-at, approved-at, approved-by
  (an admin `User.id`, same actor-tracking principle as everywhere else
  in this document).

---

## Payouts

**[FUTURE]**, no schema or provider chosen. Conceptual components:

- **Pending / approved / payable balance** — computed from the ledger
  (see above), never stored as an independent mutable number.
- **Payout history** — a record of each completed (or attempted)
  payout run, referencing which ledger entries it included.
- **Payout method** — [DECISION REQUIRED], **do not assume a specific
  payment provider**. Candidates worth naming without choosing: PayPal
  Payouts API (SellerSalt already has a live PayPal integration —
  [architecture/billing.md](billing.md) — though payouts are a
  different PayPal product/API surface than the existing Checkout/
  Subscriptions integration), Stripe Connect (also a different product
  surface than Stripe's existing Checkout Sessions usage), manual bank
  transfer/wire (admin-recorded, no API), or a dedicated payout
  processor (Tipalti, etc.). None inspected or chosen in this pass.
- **Minimum payout threshold** — a configurable floor below which a
  payable balance carries forward rather than triggering a payout.
- **Payout schedule** — [DECISION REQUIRED]: fixed cadence (monthly)
  vs. on-demand vs. threshold-triggered.
- **Failed payouts** — must be representable and visible (see the
  ledger's "Payout failure" entry type above) — a failed payout must
  never silently lose track of the money; it returns to payable balance
  with the failure reason recorded.
- **Manual/admin payouts** — an admin-initiated payout outside the
  normal schedule (e.g. resolving a dispute, an early payout request) —
  same ledger mechanics as an automatic payout, different trigger,
  logged with the admin actor.
- **Payout status** — per-payout-run status (`PENDING`/`PROCESSING`/
  `COMPLETED`/`FAILED`), independent of the underlying ledger entries'
  own status.
- **Payout reconciliation** — the ability to confirm, after the fact,
  that a payout marked `COMPLETED` actually corresponds to money that
  left SellerSalt's account and arrived at the affiliate — [DECISION
  REQUIRED] on mechanism (provider webhook confirmation, manual
  admin confirmation, or both), but should follow the same "actually
  verify, don't just trust" discipline the existing Stripe/PayPal
  payment webhook handlers already apply
  ([security/security-model.md](../security/security-model.md)
  "Webhook verification").

---

## Admin Affiliate Console

**Not implemented.** Classification below is NOW (would be needed for
even a minimal v1 program to function safely) / LATER (needed once the
program has meaningful volume) / FUTURE (genuinely optional or far out)
— this document's own judgment, not a commitment or schedule.

| Section | Purpose | Classification |
|---|---|---|
| Affiliate Overview | Program-wide KPIs (active affiliates, pending commission liability, MTD payouts) | LATER — useful, not required for v1 to function |
| Applications | Review/approve/reject applications | **NOW** — the approval gate is load-bearing for fraud prevention (see [Security / fraud](#security--fraud)); a program with no application review is a program with no gate at all |
| Active Affiliates | List/manage approved affiliates | **NOW** |
| Suspended Affiliates | List/manage suspended affiliates | **NOW** — suspension is the primary lever against fraud/abuse once detected; must exist alongside Applications |
| Affiliate Detail | Single affiliate's full picture (identity, referrals, commission, payouts) | **NOW** |
| Referral Activity | Click/visit-level attribution log | LATER — valuable for fraud investigation and affiliate support, not required for the loop itself to function |
| Conversions | List of signups/conversions attributed to affiliates | **NOW** — this is the evidence commission events are built from; without visibility here, commission events are unauditable in practice even if the ledger is technically complete |
| Commission Ledger | The full auditable ledger, per [Affiliate ledger](#affiliate-ledger-event-sourced-not-a-balance-field) | **NOW** |
| Commission Rules | Manage `CommissionRule`/tier definitions | **NOW** (even a single default rule needs somewhere to be set — never hardcoded, per Decision 5) |
| Affiliate Tiers | Manage tier definitions, if tiers are used | FUTURE — depends on whether tiers ship at all (see [Commission engine](#commission-engine)) |
| Payouts | Run/review payout batches | **NOW** — a program that can't actually pay affiliates isn't a functioning program |
| Payout Failures | Surface and resolve failed payouts | LATER — important once payout volume exists, not blocking for the very first payout run |
| Fraud / Risk | Flagged applications/affiliates/conversions | LATER — a manual admin review capability is plausible for v1 (fold into Applications/Suspended above); a dedicated risk-scoring surface is FUTURE (see [Security / fraud](#security--fraud)) |
| Program Settings | Default commission rule, payout threshold/schedule, attribution window | **NOW** — these are exactly the [DECISION REQUIRED] parameters this document deliberately leaves open; they must be admin-configurable, not hardcoded, the same principle as everything else in this document |
| Terms | Affiliate program terms/agreement management | LATER — real legal content, same category of gap as the still-unbuilt Privacy Policy/Terms noted in [security/security-model.md](../security/security-model.md) |

Structurally, this belongs in the **Admin tree**
([design/information-architecture-v1.md](../design/information-architecture-v1.md)
"Admin IA"), as a new top-level node alongside Organizations/
Subscriptions & Billing/etc., and is a strong candidate for its own
sub-admin department (an "Affiliate/Growth Ops" department, alongside
the already-named Onboarding/SEO/Accounts-Billing/Support/Content/
Operations departments in
[product/complete-product-surface.md §18](../product/complete-product-surface.md#18-sub-admin--department-system)) —
[DECISION REQUIRED] whether it launches as its own department or folds
into Accounts/Billing initially, mirroring that section's own existing
open sequencing question.

---

## Affiliate Dashboard

**Not implemented.** The affiliate-facing product surface — explicitly
intended to feel like a first-class SellerSalt workspace, not an
embedded admin form:

```
Affiliate Dashboard
├── Overview                      (at-a-glance: clicks, signups, conversions, earnings)
├── Referral link / code           (copy link, copy code, QR code)
├── Performance
│     Clicks · Signups · Trials · Conversions · Active customers · Conversion rate
├── Revenue generated               (attributed customer revenue — visibility, not a commission promise)
├── Commission
│     Earned (lifetime) · Pending · Approved · Payable balance
├── Payout history
├── Marketing assets                (see Marketing Center below)
├── Payout settings                  (method, threshold visibility)
├── Affiliate terms                   (the agreement this affiliate accepted)
└── Support                            (contact/help, program-specific)
```

**[IA DECISION]** (restated from
[design/information-architecture-v1.md](../design/information-architecture-v1.md),
which carries the authoritative placement question — see
[Information architecture placement](#information-architecture-placement)
below): this is its own shell, not a tab bolted onto the customer
`AppShell`'s Individual/Agency/Institute workspace, precisely because an
affiliate need not be any of those account types at all.

---

## Marketing Center

**[FUTURE]**, not to be implemented in this pass. A future affiliate
asset library:

- Product screenshots
- Banners (standard ad sizes)
- Social media assets (pre-sized for common platforms)
- Email templates (affiliate-authored outreach, distinct from
  SellerSalt's own transactional email templates —
  [product/complete-product-surface.md §19](../product/complete-product-surface.md#19-communications))
- Product descriptions / promotional copy (pre-approved language,
  relevant to keeping affiliate claims consistent with
  [seo/geo.md](../seo/geo.md)'s "never overstate a capability" rule —
  an affiliate promoting SellerSalt is, functionally, another public
  voice describing the product, and should be held to the same
  accuracy discipline)
- Referral links (pre-generated, possibly per-campaign)
- QR codes (encoding the referral link)
- Campaign assets (bundled sets for a specific promotion/launch)

No content model, storage, or admin-authoring surface designed here —
this is a sibling gap to the already-named, also-unbuilt
[Content/CMS](../product/complete-product-surface.md#20-content--cms)
system, and should very plausibly be built on the same eventual content
infrastructure rather than a separate one, once either is scoped for
real implementation.

---

## Affiliate vs. Partner vs. Agency vs. Institute

**[LOCKED — resolved 2026-08-15, documentation hygiene pass]** Four
distinct concepts, none collapsed into one role or one selector, and —
per the same "not an account type" principle Decision 5 already applies
to Affiliate — **Partner is not an account type either**:

| Concept | Relationship to SellerSalt | Earns commission? | Uses the product? |
|---|---|---|---|
| **Affiliate** | A **commission-based promotion relationship** — promotes SellerSalt, earns commission on resulting conversions | Yes — this is the entire point | Not necessarily at all |
| **Partner** | A broader **ecosystem/business relationship** — co-marketing, integration partnerships, reseller arrangements, technology partnerships — not inherently commission-based | [DECISION REQUIRED] per-arrangement — a Partner relationship may or may not include commission terms, but commission is not what defines it | [DECISION REQUIRED] — varies by arrangement type |
| **Agency** | Uses SellerSalt to manage *client* commerce operations (Decision 1) | No (unless the same `User` separately holds an Affiliate relationship) | Yes, as its core use case |
| **Institute** | Uses SellerSalt to manage students/cohorts (Decision 1) | No (same caveat as Agency) | Yes, as its core use case |

**[LOCKED]** Affiliate and Partner are **independent relationships**,
not a hierarchy and not synonyms:

- A Partner may **also** be an Affiliate (e.g. a technology-integration
  partner who separately runs a referral link) — the two relationships
  compose the same way Affiliate already composes with Individual/
  Agency/Institute Membership: independent facts attached to the same
  `User`/`Organization`, never one implying or requiring the other.
- An Affiliate is not automatically a Partner, and a Partner is not
  automatically enrolled as an Affiliate — each has its own
  application/agreement, its own terms, and (where commission applies)
  its own `CommissionRule`.
- **Neither Affiliate nor Partner is an account type.** Never
  `User.type = AFFILIATE`, never `User.type = PARTNER`, never an
  `Organization.kind` value for either — both attach to `User`/
  `Organization` the same orthogonal way Decision 5 already established
  for Affiliate alone:

```
User / Organization
 ├── Account / Organization Membership   (Individual / Agency / Institute)
 ├── Affiliate Relationship               (independent — commission-based promotion)
 └── Partner Relationship                  (independent — ecosystem/business, [FUTURE])
```

**Partner remains [FUTURE] and not designed by this document** — the
existing marketing-homepage footer link text ("Become a Partner")
currently points at what is, in substance, an affiliate inquiry; a
future implementer should not assume that copy defines the formal
Partner relationship once/if it's scoped separately. What's now locked
is only the *shape* of the distinction (independent, non-account-type
relationships, composable) — not Partner's own commercial terms, tiers,
or application flow, none of which are scoped here.

---

## Billing integration — billing remains the source of truth

**[LOCKED — Decision 5]** The affiliate system must not duplicate
billing truth. Every fact about what a customer was actually charged,
refunded, or charged back **already lives in `Subscription`,
`PaymentWebhookEvent`, and the payment providers themselves**
([architecture/billing.md](billing.md)) — the affiliate ledger
references those facts, it does not re-derive or independently assert
them.

```
Customer → Subscription → Invoice/Payment → Refund/Chargeback
                 │
                 └──> Affiliate Referral (attribution, resolved earlier)
                           │
                           └──> Commission Event (derived from a specific billing event)
                                     │
                                     └──> Payout (aggregates approved Commission Events)
```

Concretely: a Commission Event should carry a reference to the specific
billing fact that produced it — plausibly a `Subscription.id` +
`currentPeriodEnd` snapshot for a recurring charge, or (once/if invoice-
level tracking exists — [VERIFY]/[FUTURE], not confirmed built today
beyond `Subscription`'s own status field) an invoice/payment identifier.
`upsertSubscription()`'s existing access-control rule
([architecture/billing.md](billing.md)) — `status IN (ACTIVE, TRIALING)`
→ real access — is the natural anchor for "did a commission-eligible
billing event actually happen," reused rather than reinvented: the
affiliate system should hook into the **same** webhook-driven
subscription-state transitions billing already processes, not add a
second, parallel billing-event listener with its own interpretation of
what counts as a real payment.

**Refunds and chargebacks are billing events first, commission
consequences second** — the webhook handlers that already exist for
Stripe/PayPal ([architecture/billing.md](billing.md)) are where a
refund/chargeback is *known*; the affiliate ledger's reversal logic is
a downstream consumer of that same event, not an independent detection
mechanism.

---

## Security / fraud

**[FUTURE]**, no detection algorithms designed or implemented in this
pass — named so a future security-hardening pass has a starting list,
the same treatment [architecture/mcp.md](mcp.md#suspicious-activity-handling)
gave the equivalent MCP concern:

- **Self-referrals** — an affiliate referring themselves (new email,
  family member, alternate payment method) to earn commission on their
  own purchase. First line of defense plausibly lives in the
  attribution/approval layer (matching email/payment fingerprints
  between affiliate and referred customer); full prevention is a
  genuinely hard fraud problem, not solved here.
- **Duplicate accounts** — a referred "customer" who is actually the
  same person signing up repeatedly to generate fake conversions.
- **Fake signups** — signups with no genuine intent to become a real
  customer, created purely to trigger attribution/trial-charge
  commission (relevant especially if the trial charge itself is deemed
  commission-eligible — see [Attribution architecture](#attribution-architecture)).
- **Fraudulent payments** — a conversion funded by a stolen card,
  likely to end in a chargeback; the resulting reversal (see [Affiliate
  ledger](#affiliate-ledger-event-sourced-not-a-balance-field)) recovers
  the commission, but detecting the pattern *before* payout (not just
  reversing after) is the harder, unsolved problem.
- **Chargebacks** — see billing-integration reversal handling above; a
  pattern of chargebacks tied to one affiliate is a strong fraud signal
  independent of any single chargeback's own resolution.
- **Cookie manipulation** — a visitor or a bad actor tampering with
  attribution cookies to steal or fabricate credit; ties to the
  cookie-lifetime/security questions in
  [Attribution architecture](#attribution-architecture).
- **Referral-code abuse** — code-sharing/reselling in ways that violate
  program terms (e.g. an affiliate's code being posted on a public
  coupon-aggregator site, generating volume the affiliate didn't
  actually earn through genuine promotion).
- **Suspicious conversion patterns** — anomaly detection (unusually high
  conversion rate, geographic clustering, timing patterns) —
  [FUTURE], genuinely a data-science problem, not scoped here.
- **Manual commission manipulation** — the risk that an admin (or a
  compromised admin credential) directly alters ledger entries outside
  the normal event flow. Mitigated structurally by the ledger's
  append-only, fully-attributed design (see [Affiliate ledger](#affiliate-ledger-event-sourced-not-a-balance-field)) —
  a manual adjustment is itself a logged, actor-attributed entry type,
  never a silent balance edit. Least-privilege for the Admin Affiliate
  Console itself (who can create manual adjustments, who can approve
  payouts) should follow the same platform-admin RBAC direction
  described in [architecture/rbac.md](rbac.md), once that exists.

An eventual **Affiliate Risk/Fraud layer** (flagging, not necessarily
auto-blocking, suspicious applications/conversions/payout requests) is
named as a real future need, consistent with the same "flag, review,
don't silently auto-revoke" posture already recommended for MCP
suspicious activity
([architecture/mcp.md §Suspicious activity handling](mcp.md#suspicious-activity-handling)) —
not designed further here.

---

## Organization interaction

**[LOCKED — Decision 5]** The person who clicks a referral link is not
always the billing owner of the eventual conversion, and attribution
must resolve to the correct **billable entity**, not just the
clicking/signing-up individual:

```
Affiliate
 ↓
Agency owner signs up
 ↓
Agency subscription
 ↓
Commission
```

| Customer type | Who is attributed | Notes |
|---|---|---|
| **Individual** | The signing-up `User` and their (auto-created) `Organization` are effectively the same billable entity today — attribution is unambiguous. | Matches today's one-`User`-one-`Organization`-at-signup shape ([architecture/organizations.md](organizations.md)). |
| **Agency** | The `Organization`'s subscription is what generates billing-eligible revenue — commission should attach to *that Organization's* `Subscription`, regardless of which specific `User` (the Owner, or conceivably an invited Employee who happened to click the link before the org existed) completed checkout. | [DECISION REQUIRED]: if an Employee (not the eventual Owner) is the one who clicked the referral link before the Agency org was created, does attribution still resolve correctly once that org's subscription starts? Depends on exactly when/how attribution is persisted (see [Attribution architecture](#attribution-architecture) "signup attribution"). |
| **Institute** | Same structural shape as Agency — the Institute `Organization`'s subscription is the billable event, independent of which specific Staff member initiated signup. | Same open question as Agency. |

**The general rule**: Commission Events reference the `Organization`
(via its `Subscription`) that actually generates the billing-eligible
revenue, with the *referral* itself recorded against the `User` who was
attributed at signup time — these are two different foreign keys on the
same Commission Event, not one. This is what makes "attribute the
commercial conversion to the correct billable entity" concretely
achievable rather than aspirational.

---

## Public website surface

**[FUTURE]**, not implemented:

```
/affiliate            — program overview, commission explanation,
                         eligibility, how it works, payout information,
                         FAQ, terms, apply CTA
/affiliate/apply       — the application form itself
/affiliate/login        — authentication entry point for an already-
                          approved affiliate to reach their dashboard
                          (may or may not be the same login as the
                          regular customer login — see Information
                          architecture placement below)
```

Per [seo/geo.md](../seo/geo.md)'s existing hard rule (never publish a
capability claim ahead of what's built) and the same discipline already
applied to the equivalent MCP public page
([architecture/mcp.md §Product surface](mcp.md#product-surface)): this
page must not go live, and specific commission rates/terms must not be
published, before the program actually exists and has real, approved
`CommissionRule`s behind it — publishing promotional commission
language before the engine exists risks a real, binding-sounding public
claim with nothing enforcing it.

---

## Information architecture placement

Per this task's explicit instruction: Affiliate must **not**
automatically appear in the main product navigation for every user — it
is capability/context-based, visible only to a `User` who has an
Affiliate relationship (any status worth surfacing — at minimum
`APPROVED`; [DECISION REQUIRED] whether a `PENDING` application also
gets a status-check entry point).

**[DECISION REQUIRED]** — this document recommends, but does not lock,
the following structure, because the "no Organization required" case
(see [Core architectural principle](#core-architectural-principle--affiliate-is-not-an-account-type))
makes this a genuinely different shape than every other Settings-nested
surface in
[design/information-architecture-v1.md](../design/information-architecture-v1.md):

**Recommended: a hybrid, not a single choice.**

1. **For a `User` who also has an Organization Membership** (an
   Individual/Agency/Institute customer who is *also* an approved
   Affiliate): a conditional entry in the **Global layer** — Account
   menu, alongside the existing account/settings/sign-out items — e.g.
   "Affiliate Dashboard," rendered only when
   `user.affiliateAccount?.status === "APPROVED"`. This is the same
   *rendering discipline* already established for the Workspace switcher
   ("only render for users who genuinely have multiple org
   memberships" — [design/information-architecture-v1.md](../design/information-architecture-v1.md)
   "Workspace Model") and for Admin console access
   (`AccountMenu`'s conditional Admin link, built in the Application
   Shell — see [design/frontend-execution-plan-v1.md §3](../design/frontend-execution-plan-v1.md#3-application-shell)) —
   Affiliate joins Admin as a second capability-gated Account-menu
   destination, structurally parallel, never merged into the same menu
   item.
2. **For a pure affiliate with no customer Organization at all**: the
   `/affiliate` public routes above, plus an entirely separate,
   minimal authenticated shell (not the customer `AppShell`, not nested
   under any Organization's Settings) reachable at an affiliate-specific
   authenticated route — the Affiliate Dashboard content described
   above, but its own top-level product surface, not a tab inside
   another shell. [DECISION REQUIRED]: whether this uses the same
   NextAuth session/login as regular customers (a `User` who happens to
   have zero Memberships) or a genuinely separate auth surface —
   this document recommends the same underlying `User`/session
   mechanism for consistency (one identity system, per
   [architecture/organizations.md](organizations.md)'s existing
   principle that `User` stays the one identity primitive), with
   `/affiliate/login` simply being a differently-branded entry point
   into the same authentication flow, not a parallel one.

**Admin side**: the Admin Affiliate Console (see above) belongs in the
**Admin tree**
([design/information-architecture-v1.md](../design/information-architecture-v1.md)
"Admin IA"), never in the customer-facing MANAGE tree — same "admin
tools never leak into customer UX" discipline already locked there.

This recommendation is captured as a proposed addition to
[design/information-architecture-v1.md](../design/information-architecture-v1.md)
(see that document's own updated "Affiliate IA" section) — marked there,
per this task's instruction, as [DECISION REQUIRED] rather than silently
promoted to an [IA DECISION].

---

## MCP / AI interaction

**[LOCKED — Decision 5]** Affiliate status and MCP entitlement
(`mcp_access` — [architecture/mcp.md](mcp.md)) are **independent
capabilities**. Do not automatically grant MCP access to affiliates, and
do not gate affiliate program eligibility on any plan's `mcp_access`
capability — the two have no default relationship in either direction.

**[FUTURE]**, worth naming as a real possibility without designing it:
an affiliate's own performance data (clicks, conversions, commission)
could eventually be exposed through a tool ("get my affiliate
performance") via SellerSalt AI and/or MCP, **subject to the exact same
authorization model** every other tool already requires
([architecture/mcp.md §Authorization layering](mcp.md#authorization-layering-the-full-stack)) —
an affiliate-scoped credential/session would need its own explicit tool
grant and would only ever see that one affiliate's own data, never
program-wide data (which is an Admin Affiliate Console concern, itself
gated by platform-admin permissions, not by affiliate status). This is
named here only to prevent a future implementer from treating "affiliate
data" as automatically outside MCP's scope, or automatically inside it
— it is exactly as gated as everything else.

---

## Database implications (conceptual only)

Named so a future migration author sees the shape of what's coming, in
the same style as [architecture/data.md](data.md)'s "What the schema
does NOT yet represent" section and
[architecture/mcp.md §Database implications](mcp.md#database-implications-no-schema-changes-made) —
**no migration was written or authorized in this pass**:

- **`Affiliate`** — one row per `User` who has applied/been approved;
  status, referral slug/code, commission-rule reference, payout
  configuration. References `User`, does not extend or branch it.
- **`AffiliateApplication`** — the application/approval record, likely
  a precursor to (or the first state of) `Affiliate` rather than a
  fully separate model — [DECISION REQUIRED] on whether `Affiliate`
  and `AffiliateApplication` are one table with a status field or two
  related tables (an applicant who is later rejected may never need a
  full `Affiliate` row at all).
- **`AffiliateReferral`** / **Attribution** — the click/visit-level
  attribution record: referring `Affiliate`, attribution mechanism
  (cookie/code/URL param), timestamp, and (once resolved) the `User`
  and/or `Organization` it ultimately attributed to. Likely two
  concerns (an ephemeral pre-signup attribution record vs. a durable
  post-signup link) rather than one — [DECISION REQUIRED].
- **`CommissionRule`** — see [Commission engine](#commission-engine).
- **`AffiliateTier`** — see [Commission engine](#commission-engine);
  [FUTURE], only needed if tiers ship.
- **`CommissionEvent`** — one row per commission-triggering billing
  event; references the `Affiliate`, the `Organization`/`Subscription`
  that generated it, the `CommissionRule` snapshot applied, and the
  amount. See [Billing integration](#billing-integration--billing-remains-the-source-of-truth).
- **`AffiliateLedgerEntry`** — see
  [Affiliate ledger](#affiliate-ledger-event-sourced-not-a-balance-field);
  the append-only financial event log. Plausibly `CommissionEvent` and
  the ledger's "commission creation" entry type are the same
  row/closely coupled — [DECISION REQUIRED] on exact modeling (one
  table with entry-type discrimination, vs. `CommissionEvent` as a
  parent with `AffiliateLedgerEntry` rows underneath it).
- **`Payout`** — one row per payout run/attempt; references the
  `Affiliate`, the set of `AffiliateLedgerEntry` rows it includes,
  method, status, provider reference. See [Payouts](#payouts).
- **`ProgramSettings`** — [ASSUMPTION]: likely reuses the existing
  generic `AppSetting` key-value mechanism
  ([architecture/integrations.md](integrations.md)) for simple
  program-wide defaults (default commission rate, payout threshold,
  attribution window) rather than a dedicated table — consistent with
  how every other admin-editable platform-wide config already works
  today, and requiring no migration to add new settings later, per
  `AppSetting`'s own existing "additive, no migration" design. A
  dedicated table would only be justified if program settings need
  versioning/audit history beyond what `AppSetting` already provides.

**Explicitly not proposed as new, separate primitives** where an
existing one already covers the need: actor/timestamp attribution
throughout reuses `User.id` the same way every other model in this
schema already does; program-wide audit trail needs plausibly converge
with the same Activity/Audit primitive already locked as a shared need
under Decision 1 ([architecture/organizations.md](organizations.md))
and independently motivated by [architecture/rbac.md](rbac.md) and
[architecture/mcp.md](mcp.md) — the affiliate ledger's own dedicated
table (needed regardless, since it's financial, not just an activity
log) should still emit into that same general audit trail for
non-financial affiliate actions (application approved, affiliate
suspended), not maintain a second, parallel activity log.

---

## How this fits the implementation order

Affiliate is a **growth/monetization** capability, not a core product
surface — it depends on billing (to derive commission-eligible events
from) but nothing else in the product's intelligence stack depends on
it. It is reasonable to sequence Affiliate:

- **After** Billing is real (already true today) and after this
  document's [DECISION REQUIRED] commercial questions are actually
  resolved by the product owner — building the engine before knowing
  even a default commission rate/type risks building the wrong shape.
- **Roughly parallel to, not blocking or blocked by**, the Agency/
  Institute domain work (Decision 1) and the MCP work (Decision 4) —
  none of the three depend on each other, though all three now share
  the same underlying discipline this pass and the MCP pass both
  established: a real service-layer boundary, capability-based
  entitlement thinking, and actor-attributed, auditable event logs
  wherever money or permissions are involved.
- **Before** any public claims are published (`/affiliate`,
  marketing-homepage copy) — per [Public website surface](#public-website-surface),
  publishing ahead of the real engine is the one sequencing mistake
  this document explicitly warns against.

No specific wave/phase number is assigned here — that sequencing
decision belongs to
[design/frontend-execution-plan-v1.md](../design/frontend-execution-plan-v1.md)
(not modified in this pass, since it was outside this task's requested
reading/update list), not to this architecture document.

---

## Open questions [DECISION REQUIRED]

Consolidated from throughout this document:

1. Which billing state counts as "conversion" for commission purposes —
   trial charge vs. first full-price payment vs. `ACTIVE` status.
2. Default commission type/rate, and whether tiers/custom agreements
   ship at launch.
3. `CommissionRule`/`AffiliateTier`/`CommissionEvent`/
   `AffiliateLedgerEntry` exact schema shape and how they relate to each
   other.
4. Refund/chargeback/cancellation/upgrade/downgrade effect on
   already-created or future commission events (per the reversal table
   above).
5. Whether commission is computed on discounted (coupon-adjusted) or
   list price.
6. Attribution window length, first-touch vs. last-touch, cookie
   lifetime, referral-code override behavior, cross-device handling,
   multi-affiliate tie-breaking, existing-customer-referral eligibility.
7. Self-referral and other fraud detection rules (beyond naming the risk
   categories).
8. Payout provider, method, minimum threshold, schedule.
9. Payout reconciliation mechanism.
10. Whether Applications/Affiliate are one table or two.
11. Whether the Affiliate Program launches as its own sub-admin
    department or folds into an existing one.
12. Exact IA placement (Account-menu entry vs. dedicated shell vs. the
    hybrid recommended above) — see
    [Information architecture placement](#information-architecture-placement).
13. Whether a `PENDING` (not yet approved) applicant gets any dashboard
    access before approval.
14. Relationship between `ProgramSettings` and the existing
    `AppSetting` mechanism (reuse, recommended, vs. dedicated table).
15. ~~Whether/how the future Partner concept relates to or overlaps with
    Affiliate~~ — **resolved 2026-08-15**: independent, composable,
    non-account-type relationships (see [Affiliate vs. Partner vs.
    Agency vs. Institute](#affiliate-vs-partner-vs-agency-vs-institute)).
    Partner's own commercial terms/tiers/application flow remain
    unscoped.
