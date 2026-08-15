Status: Draft
Owner: [ASSUMPTION] Founder (Aliyan)
Last Updated: 2026-08-15
Decision State: Mixed — current-state sections are factual; Decisions 1–5 (below) are [LOCKED] as of the dates noted on each; remaining future-direction sections are still [DECISION REQUIRED]

# SellerSalt — Master Blueprint

This is the entry point for the `docs/` tree. Read this first, then
follow the links into the area you need. It exists so a future AI
coding agent or engineer doesn't need months of chat history
re-explained — read this file plus the linked docs, and root
`CLAUDE.md` for infrastructure/operational specifics.

**How to read the markers used throughout `docs/`:**
- `[ASSUMPTION]` — stated without direct verification against code or an
  explicit product-owner decision.
- `[DECISION REQUIRED]` — a real open question the product owner needs
  to resolve; do not treat as settled.
- `[VERIFY]` — a claim that should be checked against the live repo
  before being relied on, since it wasn't (or couldn't be) confirmed in
  the pass that wrote it.

## Locked product decisions (2026-08-14)

These three decisions were made by the product owner after reviewing
the initial documentation pass and are now **[LOCKED]** — treat them as
current product decisions, not open questions, everywhere they're
referenced in `docs/`. Each links to its full detail; this section is
the canonical, dated record of what was decided.

### Decision 1 — Agency / Institute architecture — [LOCKED]

SellerSalt uses **shared identity/organization primitives** (`User`,
`Organization`, `Membership`, `Role`, `Permission`, `Seat`, `Shop`,
`ShopConnection`, Activity/Audit) but **distinct domain models** for
Agency and Institute — they are not to be forced into one generic
managed-account model.

```
Agency Organization                    Institute Organization
├── Employees                          ├── Staff
└── Clients                            └── Cohorts
    └── Client Shops                       └── Students
                                                └── Student Shops
```

Agency capabilities: employee management, client management, client
shop management, employee/client permissions, optimization work,
before/after proof reports, PDF/shareable reports.

Institute capabilities: staff management, cohort management, student
enrollment, student shop oversight, student progress, seat management.

**What's locked**: the domain split (two models, not one) and the
shared-primitives list. **What's still open** ([DECISION REQUIRED]):
field-level schema for `Client`/`ClientShop`/`Cohort`/`Student`/
`StudentShop`, whether Clients/Students get logins, exact `Role`/
`Permission`/`Seat` schema. No migration has been written — this is an
architecture decision, not yet implemented. Full detail:
[architecture/organizations.md](architecture/organizations.md),
[product/personas.md](product/personas.md).

### Decision 2 — Design system — [LOCKED]

The existing application's blue primary color (`#2563EB`) and existing
dark-mode implementation are **legacy implementation details**, not the
final SellerSalt design direction. Approved target:

- Light theme only — dark mode is not part of the current target
  product unless explicitly reintroduced later.
- White/off-white surfaces.
- Primary ink `#141B16`, primary growth accent `#16C784`, gold/accent
  `#FFB020`.
- Premium, restrained, editorial SaaS aesthetic (Stripe/Linear/Vercel/
  Notion quality level); modern typography with strong hierarchy;
  disciplined spacing; dense-but-readable app, generous marketing;
  responsive; accessible.

**Not a mechanical blue→green replacement.** The future design system
must define semantic design tokens and component states (surface,
ink/text, border, accent, semantic status, interactive states), not
just swap raw hex values. **What's locked**: the palette and theme
direction. **What's still open** ([DECISION REQUIRED]): the full
semantic token spec, exact off-white/derived shades, gold's precise
usage rule, and the migration plan for removing dark mode from the
codebase. No screens have been redesigned and no tokens beyond the
three locked colors have been implemented — this is a documentation-
only decision in this pass. Full detail:
[design/design-system.md](design/design-system.md).

### Decision 3 — Marketplace normalization — [LOCKED]

The architecture must be designed with a marketplace/platform
abstraction boundary:

```
RAW MARKETPLACE DATA
  ↓
MARKETPLACE ADAPTER / CONNECTOR
  ↓
NORMALIZED COMMERCE REPRESENTATION
  ↓
INTELLIGENCE SERVICES
  ↓
SCORES / ANALYSIS / TRENDS
  ↓
RECOMMENDATIONS
  ↓
ACTIONS
```

No database rewrite or migration now. Current Etsy-specific
implementation remains fully operational. The concrete normalization
schema is deliberately **deferred** until the second production
marketplace/platform is selected — designing a universal schema against
hypothetical marketplaces now is explicitly out of scope. Until that
selection happens: preserve current Etsy functionality, isolate new
platform-specific code in its own connector module, avoid introducing
*additional* Etsy coupling into shared/cross-cutting code, and keep
designing interfaces (the existing `MarketplaceConnector` contract and
registry already satisfy this) so future adapters can plug in without a
rewrite. Full detail, including concrete engineering guidance for the
interim period:
[architecture/marketplace.md](architecture/marketplace.md),
[marketplace/marketplace-abstraction.md](marketplace/marketplace-abstraction.md),
[marketplace/etsy.md](marketplace/etsy.md).

### Decision 4 — MCP / external AI agent access — [LOCKED] (2026-08-15)

SellerSalt **must support external AI agents through MCP** (Model
Context Protocol) as a first-class platform capability, architected from
the start rather than bolted on later. The committed request path:

```
External AI Agent → MCP → SellerSalt Agent Gateway → Authentication →
Plan Entitlement → Organization/User Permissions → Shop/Client/Cohort
Scope → Tool Permissions → Rate Limits → Usage Tracking → Audit Logging
→ SellerSalt Intelligence / Service Layer
```

MCP, the Web UI, and the (also unbuilt) internal SellerSalt AI Assistant
all consume **one shared service/intelligence layer** — MCP must not
become a second implementation of SellerSalt's business logic.

**MCP access is entitlement-gated, and cheaper plans do not receive it
initially** — it is available only on eligible premium plan(s), modeled
as a capability (`mcp_access`) an org's plan does or doesn't include,
never as a hardcoded plan-name check in code (e.g. never
`if (package.key === "PRO")`).

**What's locked**: that MCP is a first-class, shared-service-layer
capability; the Gateway's authorization pipeline shape above; that
Agency/Institute scope enforcement (an employee's client-scoped
permissions, a staff member's cohort-scoped permissions) applies
identically through MCP as through the web app — MCP is never a looser
side door; and that access is capability-gated with cheaper plans
excluded initially. **What's still open** ([DECISION REQUIRED]): the
concrete tool catalog and signatures, the credential/token model, the
exact `Package`/capability schema, which specific plan(s) count as
"eligible premium," and every other item listed in
[architecture/mcp.md](architecture/mcp.md)'s "Open questions" section.
No migration, dependency, or code was written — this is an architecture
decision only. Full detail: [architecture/mcp.md](architecture/mcp.md).

### Decision 5 — Affiliate Program — [LOCKED] (2026-08-15)

SellerSalt **must have a first-class Affiliate Program** — a real
commission engine, a real auditable ledger, a real admin console, and a
real affiliate-facing dashboard, not a referral-code field and a
marketing page.

**Affiliate is not an account type.** Do not create
`User.type = AFFILIATE` or an `Organization.kind` value for Affiliate.
It is a separate commercial relationship attached to a `User`,
orthogonal to that `User`'s Organization membership(s):

```
User
 ├── Account / Organization Membership   (Individual / Agency / Institute)
 └── Affiliate Relationship               (independent)
```

A person can simultaneously be an Individual customer, an Agency Owner,
an Institute Staff member, **and** an Affiliate — or an Affiliate with
no SellerSalt customer Organization at all.

**Affiliate vs. Partner — resolved 2026-08-15**: Partner (a broader
ecosystem/business relationship — co-marketing, integrations, reseller
arrangements) and Affiliate (a commission-based promotion relationship)
are **independent, composable relationships**, neither an account type.
A Partner may also be an Affiliate; neither requires the other. Full
detail: [architecture/affiliate.md §Affiliate vs. Partner vs. Agency vs.
Institute](architecture/affiliate.md#affiliate-vs-partner-vs-agency-vs-institute).

**What's locked**: that the program is first-class (not a field);
Affiliate is never conflated with the account-type axis; Affiliate and
Partner are independent, composable relationships, neither an account
type; the product loop shape (application → approval → identity → referral link →
attribution → signup → trial/subscription → conversion → commission
event → pending → approved → payable → paid); commission is
rule-based, never a hardcoded percentage in code; affiliate earnings are
an append-only, auditable ledger, never a mutable balance field; and
billing remains the single source of truth — commission is *derived*
from billing events, never a parallel financial truth. **What's still
open** ([DECISION REQUIRED]): every business rule governing the loop
(what counts as "conversion," refund/chargeback/upgrade effects on
commission, attribution window and tie-breaking rules), the concrete
commission-rule/ledger schema, the payout provider, fraud-detection
rules, and the exact IA placement of the affiliate-facing surfaces. No
migration, dependency, or code was written — this is an architecture
decision only. Full detail: [architecture/affiliate.md](architecture/affiliate.md).

---

## Vision

SellerSalt is an e-commerce intelligence SaaS. Today: a live,
customer-facing Etsy product/shop research tool with real sales data.
Secondary, admin-only pillar: connecting a customer's own store
(Shopify/WooCommerce/Etsy-seller) for analytics and future cross-
listing. Long-term direction: marketplace-agnostic research + multiple
account-type support (individual, agency, institute) + an AI copilot
over SellerSalt's own intelligence. Full detail:
[product/vision.md](product/vision.md).

## Product layers

1. **Core intelligence** (live today, Etsy-only): search, real sales
   data, competition scoring, shop tracking, trends, dropped shops,
   favorites, scheduled alerts. See
   [product/product-map.md](product/product-map.md).
2. **Seller channels** (built, admin-only today): Shopify/WooCommerce/
   Etsy-seller OAuth connections, currency-aware analytics, cross-
   listing foundation (no sync logic yet). See
   [architecture/marketplace.md](architecture/marketplace.md).
3. **Platform/SaaS foundation** (live): multi-tenancy, DB-editable
   plans with real limit enforcement, admin console, team invites,
   checkout-gated signup, billing (Stripe + PayPal, real webhooks,
   coupons, admin-grantable subscriptions). See
   [architecture/billing.md](architecture/billing.md) and
   [billing/billing-lifecycle.md](billing/billing-lifecycle.md).
4. **Future layers** (not built; architecture direction for the first
   three below is now [LOCKED] per Decisions 1–3, implementation not
   started): normalization/intelligence layer for multi-marketplace
   (Decision 3), Agency/Institute account structures (Decision 1),
   redesigned visual system (Decision 2), plus still fully open:
   AI assistant, programmatic SEO/AEO/GEO content, transactional email
   template system, reporting/PDF generation, real platform-admin RBAC +
   audit log.

## User / account model

**Today**: one flat shape — `Organization` + `Membership` (`OWNER`/
`ADMIN`/`MEMBER`), no hierarchy, nothing else implemented. **Target
direction (Decision 1, [LOCKED]`)`**: Individual (Starter/Pro), Agency
(owner → employees → clients → client shops), and Institute (owner/
admin → staff → cohorts → students → student shops, with progress
tracking and seat management) as **two distinct domain models** — not
one generic managed-account model — sharing `User`/`Organization`/
`Membership`/`Role`/`Permission`/`Seat`/`Shop`/`ShopConnection`/
Activity-Audit primitives. See
[architecture/organizations.md](architecture/organizations.md) and
[product/personas.md](product/personas.md) for the full structure. What
remains open is field-level schema, not the domain shape — see those
documents' "Still open" sections.

## Marketplace model

Two deliberately separate connector systems, not to be collapsed:
**marketplace research connectors** (`src/connectors/`, platform-wide,
Etsy today, eBay named as planned) and **seller/channel connectors**
(`src/seller-channels/`, one customer's own store, Shopify/WooCommerce/
Etsy-seller today). Full detail, including the specific reserved-but-
unimplemented `EBAY_SELLER` enum value:
[architecture/marketplace.md](architecture/marketplace.md).

## Intelligence architecture

Current: `Prospect` (Etsy-shaped fields) → `competition-scoring.ts`
(two-axis Difficulty/Demand, editorial-judgment thresholds) → Trends/
Dropped-shops (derived views, not dedicated tables) — scoring reads
Etsy-shaped fields directly, no normalization layer exists yet.
**Decision 3 ([LOCKED])** commits to closing this gap via a marketplace
abstraction boundary — raw data → adapter/connector → normalized
commerce representation → intelligence services → scores/trends →
recommendations → actions — while explicitly deferring the concrete
normalized-entity schema until a second marketplace is selected, and
explicitly prohibiting a database rewrite now. Current Etsy
functionality is unaffected. Full detail and interim engineering
guidance (isolate new platform code, avoid new Etsy coupling, keep the
existing `MarketplaceConnector` interface as the adapter seam):
[architecture/marketplace.md](architecture/marketplace.md) and
[marketplace/marketplace-abstraction.md](marketplace/marketplace-abstraction.md).

## Application areas

See [product/product-map.md](product/product-map.md) for the full,
route-cross-referenced inventory of what exists vs. what's planned.

## Admin architecture

Today: a single flat `ADMIN_EMAILS` env-var allowlist
(`isAdminEmail()`/`requireAdminOrg()`) gates both `/admin` (packages,
orgs, coupons, payment providers, email settings) and the entire admin-
only seller-channels preview — same mechanism, two very different blast
radii. No sub-admin roles, no audit log. Full gap analysis:
[architecture/rbac.md](architecture/rbac.md).

## AI architecture

Nothing built — no AI SDK dependency, no conversation-storage schema.
Intended to be a commerce-intelligence copilot with predefined tools
over SellerSalt's own data (not a generic chatbot). Roughly half the
brief's example queries map to existing data/features today; the other
half (SEO-problem detection, momentum analysis, report generation)
require new intelligence work independent of the assistant itself.
Because Decision 3 defers the normalized-entity schema until a second
marketplace is chosen, assistant tools built before then should read
today's Etsy-shaped data through a single narrow seam rather than wait
for normalization. See [ai/assistant.md](ai/assistant.md) and
[architecture/ai.md](architecture/ai.md).

**Distinct from the above**: **[LOCKED — Decision 4]** SellerSalt MCP —
external AI agents calling into SellerSalt from outside its own UI — is
a separate, also-unbuilt surface that shares the same underlying service
layer as the AI Assistant and the Web UI. See
[architecture/mcp.md](architecture/mcp.md).

## SEO / AEO / GEO direction

Nothing built beyond the existing marketing homepage with live pricing.
Direction: standard technical SEO (metadata, sitemap, structured data,
programmatic pages) + AEO (answer-oriented/FAQ content) + GEO
(consistent, authoritative, machine-readable entity information). The
one hard rule across all three: never publish a capability claim for a
feature that isn't actually built — cross-check against
[product/product-map.md](product/product-map.md) first. See
[seo/seo.md](seo/seo.md), [seo/aeo.md](seo/aeo.md), [seo/geo.md](seo/geo.md).

## Billing

Real, not just credential storage: dynamic Stripe Checkout Sessions,
lazy PayPal Product+Plan creation, signature-verified idempotent
webhooks, coupons, admin-grantable manual subscriptions. Signup is now
checkout-gated (account creation happens on checkout, not before it, as
of the 2026-08-13/14 commits). Access control (`Organization.packageId`)
is driven entirely by webhook-updated `Subscription.status`, never by
the checkout response itself. See
[architecture/billing.md](architecture/billing.md) and
[billing/billing-lifecycle.md](billing/billing-lifecycle.md) for the
full flow and what's not yet supported (billing intervals, plan
changes on an existing subscription, Safepay/PayFast checkout logic).

## Security

Credential encryption at rest (AES-256-GCM) is applied consistently
across every credential-bearing table. Webhook signatures are actually
verified (not just trusted). The single highest-risk area for future
work: whatever Agency/Institute data-isolation model gets built must
preserve today's `organizationId`-scoping discipline, since "some data
within my own org I can't see" is a new access-control dimension this
system has never needed before. Full detail:
[security/security-model.md](security/security-model.md).

## Design direction

**Decision 2 ([LOCKED])**: the target palette
(`#141B16`/`#16C784`/`#FFB020`, light-theme-only) is the approved
SellerSalt design direction. The application's currently-implemented
blue accent (`#2563EB`) and working dark-mode implementation are legacy
and not the target — this is a resolved decision, not an open
discrepancy. No visual implementation has happened in this pass; the
future design system still needs a full semantic-token spec (not a
mechanical color swap) before any screens are restyled — see
[design/design-system.md](design/design-system.md). Other direction
(Inter typography, restrained radius, dense app / generous marketing
split, `.sellersalt-marketing`-scoped marketing styles) already matches
what's built and is unaffected by this decision.

## Documentation map

```
docs/
  product/        vision, product-map, personas, plans,
                   complete-product-surface (full CURRENT/PLANNED/FUTURE
                   surface map across 24 product areas — read this
                   before any screen design work)
  architecture/    system, marketplace, organizations, rbac, billing,
                   data, ai, mcp, affiliate, integrations
  design/          design-system, information-architecture, navigation,
                   ux-principles
  marketplace/     marketplace-abstraction, etsy
  seo/             seo, aeo, geo
  ai/              assistant
  billing/         billing-lifecycle
  security/        security-model
  decisions/       README (ADR process + queue)
  MASTER_BLUEPRINT.md   (this file)
```

Root `CLAUDE.md` remains the authority for infrastructure/deployment
specifics (Coolify UUIDs, domains, database credentials, operational
lessons learned) — this `docs/` tree is the authority for product/
architecture intent and current-state feature mapping. They're
complementary, not overlapping; don't duplicate infrastructure detail
into `docs/`.

## Locked-decision residual questions

Decisions 1–3 above lock the *shape* of each area. Each still has
field-level or spec-level questions open before implementation can
start — these are not re-litigating the locked decision, only filling
in detail underneath it:

- **Decision 1 (Agency/Institute)**: exact schema for `Client`/
  `ClientShop`/`Cohort`/`Student`/`StudentShop`; whether Clients/
  Students get their own login; exact `Role`/`Permission`/`Seat`
  schema; the `Organization.kind` discriminator design. See
  [architecture/organizations.md](architecture/organizations.md) "Still
  open."
- **Decision 2 (Design system)**: the full semantic-token spec beyond
  the three locked raw colors; exact off-white/derived surface shades;
  gold's precise usage rule; the dark-mode-removal migration plan. See
  [design/design-system.md](design/design-system.md) "Semantic design
  tokens" and "Migration path."
- **Decision 3 (Marketplace normalization)**: deliberately not to be
  answered until a second marketplace is selected (where normalization
  happens, whether the DB schema itself changes, what counts as a
  normalized commerce entity). See
  [architecture/marketplace.md](architecture/marketplace.md) "Questions
  explicitly deferred."
- **Decision 4 (MCP)**: the concrete tool catalog/signatures, the
  credential/token model (API-key vs. OAuth, expiry, revocation shape),
  the capability/entitlement schema on `Package`, which specific plan(s)
  are "eligible premium," and MCP v1's tool scope. See
  [architecture/mcp.md](architecture/mcp.md) "Open questions."
- **Decision 5 (Affiliate)**: every commission/attribution/payout
  business rule, the concrete `Affiliate`/`CommissionRule`/
  `CommissionEvent`/`AffiliateLedgerEntry`/`Payout` schema, the payout
  provider, fraud rules, and the exact IA placement of the
  affiliate-facing dashboard. See
  [architecture/affiliate.md](architecture/affiliate.md) "Open
  questions."

## Unresolved decisions — highest priority for product-owner input

Roughly in order of how much future work depends on each. Renumbered
2026-08-14 after Decisions 1–3 (above) were locked and removed from
this list.

1. **Which marketplace ships second** — only eBay is named as "planned"
   anywhere in code comments; not a committed roadmap item. This is the
   single decision that unblocks Decision 3's deferred concrete
   normalization schema — nothing in that area can move past the
   locked pipeline shape until this is chosen.
2. **Platform-admin RBAC + audit log** — real sub-admin roles to replace
   the flat `ADMIN_EMAILS` allowlist, and an audit log shape. Now also
   the natural home for the `Role`/`Permission` primitives Decision 1
   locked for Agency/Institute use — worth designing these together
   rather than twice. Directly relevant given root `CLAUDE.md`'s
   documented real incidents (open DB port, branch/database mismatch)
   that an audit log would have made easier to trace. See
   [architecture/rbac.md](architecture/rbac.md).
3. **AI assistant sequencing** — ship a narrow assistant now covering
   only already-backed queries, or wait for more underlying intelligence
   features (SEO-problem detection, momentum analysis, reporting) to
   exist first. See [ai/assistant.md](ai/assistant.md).
4. **Reporting/PDF generation** — needed by both the now-locked Agency
   capability ("optimization proof reports") and the AI assistant
   ("generate a report") examples; likely one underlying capability, not
   two. No design work started.
5. **Transactional email template system** — editor, variables,
   versions, delivery logs; today `EmailSettings` is SMTP connection
   config only, with no template model.
6. **Billing interval support** (monthly/annual) and plan-change flows
   (upgrade/downgrade on an existing subscription) — `Package.priceUsd`
   has no interval field today; [VERIFY] whether plan changes on an
   active subscription are supported at all currently. Also now
   entangled with Decision 1: whether `Package` key `AGENCY` (a pricing
   tier name) should be renamed to avoid colliding with the newly-locked
   Agency *domain* type. See
   [billing/billing-lifecycle.md](billing/billing-lifecycle.md),
   [product/plans.md](product/plans.md).
7. **Programmatic SEO/AEO/GEO content model** — hand-authored pages vs.
   a real content model; sequencing relative to which features are
   actually customer-facing (e.g. don't publish Shopify/WooCommerce
   integration pages while those remain admin-only). See
   [seo/seo.md](seo/seo.md).
