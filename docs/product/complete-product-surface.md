Status: Draft
Owner: [ASSUMPTION] Founder (Aliyan)
Last Updated: 2026-08-15
Decision State: CURRENT items are factual (verified against the repository). PLANNED items follow directly from the five locked decisions in [MASTER_BLUEPRINT.md](../MASTER_BLUEPRINT.md) (Decision 4, 2026-08-15, added MCP/external AI agent access as a locked, premium-plan-gated capability — see [System / Developer Experience §24](#24-system--developer-experience) and [architecture/mcp.md](../architecture/mcp.md); Decision 5, 2026-08-15, added a first-class Affiliate Program, explicitly not an account type — see [Affiliate Program](#affiliate-program) and [architecture/affiliate.md](../architecture/affiliate.md)). FUTURE items are aspirational and not yet decided. [DECISION REQUIRED] items block further design work in that area.

# SellerSalt — Complete Product Surface Map

## How to read this document

This is a **product surface map**, not a technical implementation plan
and not a screen design. Its purpose is to establish the full scope of
SellerSalt — every product area, module, and feature/capability — before
any screen design starts, so design work has a complete, honestly-
labeled inventory to work from instead of discovering scope mid-design.

Every item is classified:

- **[CURRENT]** — verified working in the repository as of this pass
  (2026-08-14). If something is marked CURRENT, it was checked against
  actual code (routes, models, or lib functions), not assumed from an
  earlier planning document.
- **[PLANNED]** — direction is decided (usually because it follows
  directly from a [LOCKED] decision in
  [MASTER_BLUEPRINT.md](../MASTER_BLUEPRINT.md)), and/or real
  architectural foundation already exists in code, but the
  feature/screen itself is not built.
- **[FUTURE]** — named in the product brief/vision as a direction worth
  having, but no architecture decision has been made and no foundation
  exists yet. Do not treat as scheduled.
- **[DECISION REQUIRED]** — a specific open question that blocks
  further design or implementation in that area. Cross-referenced to
  the relevant `docs/architecture/*` or `docs/product/*` file where the
  full question is recorded.

A capability is never silently upgraded from PLANNED/FUTURE to CURRENT
in this document, and never silently downgraded either — every
classification below was checked against the repository or against an
explicit decision record.

## Relationship to other docs

This document is the **breadth-first inventory**. It does not repeat
the depth already written elsewhere — it links out:
- [MASTER_BLUEPRINT.md](../MASTER_BLUEPRINT.md) — the three locked
  decisions and the residual open questions.
- [product/product-map.md](product-map.md) — the original current-state
  feature inventory (narrower scope, written before this document;
  this document supersedes it as the authoritative surface map going
  forward, but does not contradict it).
- [product/personas.md](personas.md),
  [architecture/organizations.md](../architecture/organizations.md) —
  full detail on the Agency/Institute domain model.
- [architecture/marketplace.md](../architecture/marketplace.md) — full
  detail on the marketplace abstraction boundary.
- [design/design-system.md](../design/design-system.md) — the locked
  design direction.

## Table of contents

1. [Public / Marketing Experience](#1-public--marketing-experience)
2. [Authentication & Account Onboarding](#2-authentication--account-onboarding)
3. [Individual Seller Experience](#3-individual-seller-experience)
4. [Agency Experience](#4-agency-experience)
5. [Institute Experience](#5-institute-experience)
6. [Research & Discovery](#6-research--discovery)
7. [Shop Intelligence](#7-shop-intelligence)
8. [Product Intelligence](#8-product-intelligence)
9. [Listing / SEO Intelligence](#9-listing--seo-intelligence)
10. [Competitor Intelligence](#10-competitor-intelligence)
11. [Trends & Market Intelligence](#11-trends--market-intelligence)
12. [Reporting](#12-reporting)
13. [AI Commerce Copilot](#13-ai-commerce-copilot)
14. [Alerts / Notifications / Automation](#14-alerts--notifications--automation)
15. [Organization / Team Management](#15-organization--team-management)
16. [Billing & Subscriptions](#16-billing--subscriptions)
17. [Admin Platform](#17-admin-platform)
18. [Sub-Admin / Department System](#18-sub-admin--department-system)
19. [Communications](#19-communications)
20. [Content / CMS](#20-content--cms)
21. [SEO / AEO / GEO](#21-seo--aeo--geo)
22. [Marketplace Platform](#22-marketplace-platform)
23. [Security / Privacy / Compliance](#23-security--privacy--compliance)
24. [System / Developer Experience](#24-system--developer-experience)
25. [Affiliate Program](#affiliate-program)
26. [Product Gaps & Opportunities](#product-gaps--opportunities)
27. [Core Product Loops](#core-product-loops)
28. [Primary Navigation Requirements](#primary-navigation-requirements)
29. [Screen Inventory](#screen-inventory)
30. [Design Dependencies](#design-dependencies)
31. [Recommended Design Order](#recommended-design-order)

---

## 1. PUBLIC / MARKETING EXPERIENCE

**Current state**: one real marketing page (`src/app/marketing-homepage.tsx`
+ `src/app/page.tsx`, scoped under `.sellersalt-marketing`) plus the
`/checkout` page, which functions as the de facto public pricing page
since account creation now happens on checkout (see
[billing/billing-lifecycle.md](../billing/billing-lifecycle.md)).
Everything else in this section is not built.

| Page | Purpose | Primary CTA | Target user | SEO/AEO/GEO relevance | Status |
|---|---|---|---|---|---|
| Homepage (`/`) | Explain the product, drive signup | "Start free trial" / "Get started" → `/checkout` | All | Primary entity page — should anchor GEO consistency (see [seo/geo.md](../seo/geo.md)) | [CURRENT] |
| Checkout / pricing (`/checkout`) | Show live plan pricing, collect account + payment | Start subscription | All, mid-funnel | Currently gated behind account-creation flow, not a pure SEO-indexable pricing page — see [DECISION REQUIRED] below | [CURRENT] (as checkout); no separate SEO-indexable `/pricing` page exists |
| Features | Explain capabilities in depth | Signup | Individual/Agency/Institute (segmented) | High — natural home for feature-level structured data | [FUTURE] |
| Integrations (Shopify/WooCommerce/Etsy-seller) | Explain seller-channel connections | Signup / "connect your store" | Individual, Agency | High, but sequencing-blocked — these features are admin-only in-product today (see [product/product-map.md](product-map.md) MVP scope); publishing before customer-facing is a real risk (see [seo/seo.md](../seo/seo.md)) | [FUTURE], [DECISION REQUIRED] on sequencing |
| Marketplace/platform pages (e.g. "SellerSalt for Etsy sellers") | Marketplace-specific landing pages | Signup | Individual sellers on that marketplace | High for programmatic SEO | [FUTURE] — Etsy page could exist now; a second marketplace's page depends on which marketplace ships second (open decision, see MASTER_BLUEPRINT.md) |
| Individual seller use case | Persona-specific pitch | Signup | Individual | Medium | [FUTURE] |
| Agency use case | Persona-specific pitch | Signup / "book a demo" | Agency | Medium — depends on Agency domain (Decision 1, [PLANNED]) being real enough to describe honestly | [FUTURE] |
| Institute use case | Persona-specific pitch | Signup / "book a demo" | Institute | Medium — same dependency as Agency | [FUTURE] |
| Partner directory | List of verified agencies/institutes using SellerSalt, and/or ecosystem Partners (co-marketing, integrations, reseller — resolved 2026-08-15 as independent of Affiliate, see [Affiliate Program](#affiliate-program)) | Browse / apply | Prospective agency/institute clients, partners | Medium | [FUTURE] — the *relationship* is now [LOCKED] (Partner ≠ Affiliate, ≠ account type), the directory feature itself remains undesigned, see Section 4/5 "verification/partner directory presence" |
| Resources/content hub | Central index of educational content | Browse | All | High (AEO/GEO surface) | [FUTURE] |
| Blog/content system | Ongoing content marketing | Browse, subscribe | All | High | [FUTURE] — needs a content model, see [Content/CMS](#20-content--cms) |
| Comparison pages (vs. competitor tools) | Competitive positioning | Signup | Evaluators | High | [FUTURE] |
| Programmatic SEO pages (category/keyword-driven) | Long-tail organic acquisition | Signup | All | Very high — this is the explicit programmatic-SEO surface named in [seo/seo.md](../seo/seo.md) | [FUTURE] |
| Public reports/share links | Let a report recipient view a report without logging in | View report, "Powered by SellerSalt" upsell | Agency clients, Institute stakeholders | Medium — real content, but access-gated, not indexable | [FUTURE] — depends entirely on [Reporting](#12-reporting) existing first |
| Public tools (e.g. a free calculator/checker) | Top-of-funnel lead magnet | Try tool → signup | Prospective users | High if built well | [FUTURE], [OPTIONAL] — see Product Gaps |
| Contact/support page | Route inquiries | Submit / email | All | Low | [FUTURE] — today only `support@` mailbox exists (per root `CLAUDE.md`), no dedicated page confirmed |
| Legal: Privacy Policy, Terms, GDPR | Legal compliance | N/A | All (compliance-driven) | Low direct SEO value, high trust/compliance value | [FUTURE] — explicitly flagged as a real legal gap in root `CLAUDE.md`: still `mailto:` placeholders |
| Status/system page | Uptime/incident transparency | N/A | Existing customers, prospects evaluating reliability | Low | [FUTURE], [OPTIONAL] |
| AI & MCP ("Connect SellerSalt to your AI") | Explain MCP, documentation, supported agents, example workflows, security explanation | Signup / connect | Prospective + existing customers on eligible plans | Medium-high once real (GEO-relevant machine-readable capability description) | [FUTURE] — **must not publish before `mcp_access` and at least one real tool ship**, per [seo/geo.md](../seo/geo.md)'s existing rule; do not name specific third-party agents as "supported" until verified. Full detail: [architecture/mcp.md §Product surface](../architecture/mcp.md#product-surface) |
| Affiliate program (`/affiliate`, `/affiliate/apply`) | Program overview, commission explanation, eligibility, payout info, FAQ, terms, application | Apply | Prospective affiliates (not necessarily SellerSalt customers) | Medium | [FUTURE] — **must not publish commission-rate claims before the engine exists**, per [seo/geo.md](../seo/geo.md). Full detail: [architecture/affiliate.md §Public website surface](../architecture/affiliate.md#public-website-surface) |

**[DECISION REQUIRED]**: should there be a standalone, SEO-indexable
`/pricing` page separate from `/checkout`, so pricing is discoverable
and shareable without starting the signup flow? Today pricing is only
visible by landing on `/checkout` itself.

---

## 2. AUTHENTICATION & ACCOUNT ONBOARDING

**Current state**: real, verified against `src/lib/auth.ts`,
`src/app/api/signup`, `src/app/(auth)/*`, `src/app/checkout/*`.

| Capability | Status | Notes |
|---|---|---|
| Signup | [CURRENT] | Merged into `/checkout` as of the 2026-08-13/14 commits — see [billing/billing-lifecycle.md](../billing/billing-lifecycle.md). Old `/signup` route redirects here. |
| Login | [CURRENT] | NextAuth credentials provider, JWT session (`src/lib/auth.ts`). |
| Social login | [FUTURE] | Explicitly "discussed, not built" per root `CLAUDE.md`. |
| Email verification | [FUTURE] | No `emailVerified`-equivalent field on `User` in `prisma/schema.prisma`; not implemented. |
| Password reset | [CURRENT] | `PasswordResetToken` (hashed token, `expiresAt`), `/forgot-password`, `/reset-password`. |
| Account recovery (beyond password reset) | [FUTURE] | No separate concept found (e.g. no account-lockout/unlock flow, no security-question flow). |
| Onboarding (guided, post-signup) | [FUTURE] | No dedicated onboarding wizard/checklist route found. Signup → checkout → dashboard is the full current flow. |
| Package selection | [CURRENT] | Part of `/checkout` (`checkout-client.tsx`), pulls live `Package` rows. |
| Checkout | [CURRENT] | Stripe (dynamic Checkout Sessions) and PayPal (lazy Plan creation) — see [architecture/billing.md](../architecture/billing.md). |
| Organization creation | [CURRENT] | One `Organization` created per signup (`src/app/api/signup/route.ts`). |
| Agency onboarding | [FUTURE] | Domain shape [PLANNED] (Decision 1); no onboarding flow designed — would need an `Organization.kind` selection step at signup that doesn't exist today. |
| Institute onboarding | [FUTURE] | Same dependency as Agency. |
| Individual onboarding | [CURRENT] (minimal) | Today's signup→checkout→dashboard flow *is* individual onboarding; no additional guided steps beyond that. |
| Shop connection (as part of onboarding) | [CURRENT] (mechanism), not part of onboarding flow | Seller-channel OAuth exists and works, but is admin-only — a regular Individual user never sees a shop-connect step during onboarding, since Individual research works against the platform-owned Etsy connector with no shop of their own required. |
| First research workflow | [CURRENT] (unguided) | A new user can immediately create a `SearchConfig` and run a search post-checkout; there is no guided "run your first search" tutorial overlay. |
| Onboarding checklist | [FUTURE] | Not found. |
| Onboarding completion (tracked state) | [FUTURE] | No `onboardingCompletedAt`-equivalent field found on `Organization`/`User`. |
| Invitations | [CURRENT] | `Invite` model, `/accept-invite`, `src/app/api/team/invites`. States: `PENDING`/`ACCEPTED`/`REVOKED`, `expiresAt`. |
| Device/session management | [FUTURE] | No session-listing or device-management concept found; NextAuth JWT sessions are stateless with no per-device tracking. |

### Meaningful states already represented in code

| State | Where |
|---|---|
| Loading | Standard client-side fetch states in `checkout-client.tsx` and similar (`accountSubmitting`, `couponChecking`, etc. — implementation detail, not a modeled entity state) |
| Error | Form-level error messages throughout (e.g. signup 409 "account already exists," coupon validation errors) |
| Expired | `PasswordResetToken.expiresAt`, `Invite.expiresAt` |
| Incomplete | `Subscription.status = INCOMPLETE` |
| Pending | `Invite.status = PENDING` |
| Verified | Not modeled — no email verification exists (see above) |
| Successful | Implicit (redirect to `/dashboard` on successful signup/checkout/login) |

No onboarding-specific state machine (e.g. "incomplete profile," "shop
not yet connected") exists — [FUTURE] if guided onboarding gets built.

---

## 3. INDIVIDUAL SELLER EXPERIENCE

**Current state**: this is the one fully-built, customer-facing product
surface. Verified against `src/app/(dashboard)/sidebar.tsx` and route
tree — see [product/product-map.md](product-map.md) for full detail;
summarized here at the three-level structure this document uses.

| Module | Feature/capability | Status | Notes |
|---|---|---|---|
| Research | Prospects (search/filter/sort) | [CURRENT] | `SearchConfig` + `Prospect`, `/prospects` |
| Research | Spy on Competitor (cold shop lookup) | [CURRENT] | `getShopByName`, `/shops/[shopExternalId]` |
| Research | Shop tracking ("Spy → Tracked") | [CURRENT] | `ShopWatch`/`ShopSnapshot`, `/spy/tracked` |
| Research | Trends | [CURRENT] | Derived view, `/trends` |
| Research | Dropped shops | [CURRENT] | Derived view, `/inactive` |
| Research | Favorites | [CURRENT] | `Prospect.isFavorite`, `/favorites` |
| Research | Scheduled searches | [CURRENT] | `SearchConfig.scheduleCron`, BullMQ |
| Research | CSV export | [CURRENT] | Confirmed present on Prospects, Dropped shops, Trends pages |
| Research | Competitor keyword extraction | [CURRENT] | `extractLongTailTerms()` on the shop detail page — extracts a *competitor's* listing-title keywords, not an audit of the user's own listings |
| Notifications | Scheduled-search email alerts | [CURRENT] | `src/lib/send-email.ts` |
| Notifications | In-app notification center | [FUTURE] | Not found — see [Alerts/Notifications](#14-alerts--notifications--automation) |
| Shop connections | Connect own Shopify/WooCommerce/Etsy shop | [CURRENT] (mechanism), admin-only (access) | Individual users do not see this today — MVP scope decision, see [product/product-map.md](product-map.md) |
| Analytics | Own-store analytics dashboard | [CURRENT] (mechanism), admin-only (access) | Same gating as above |
| Account | Profile | [CURRENT] | `/settings/profile` |
| Account | Billing | [CURRENT] | `/settings/billing`, see [Billing & Subscriptions](#16-billing--subscriptions) |
| Account | Team invites | [CURRENT] | `/settings/team` |
| Account | Connectors (bring-your-own-key) | [CURRENT] | `/connectors`, opt-in premium option |
| Account | Jobs (background run history) | [CURRENT] | `/jobs` |
| Intelligence | Competitor scoring (Difficulty/Demand) | [CURRENT] | `competition-scoring.ts`, two-axis, editorial-judgment thresholds |
| Intelligence | Shop Intelligence (health score for *own* shop) | [FUTURE] | See [Section 7](#7-shop-intelligence) — does not exist for the user's own shop today |
| Intelligence | Shop Optimization | [FUTURE] | No optimization workflow exists |
| Intelligence | Listing Optimization | [FUTURE] | See [Section 9](#9-listing--seo-intelligence) |
| Intelligence | Product Intelligence (beyond today's Prospect data) | [FUTURE] | See [Section 8](#8-product-intelligence) |
| Intelligence | SEO Intelligence | [FUTURE] | Distinct from the competitor-keyword-extraction that exists today |
| Intelligence | Competitor Intelligence (beyond today's baseline) | [FUTURE] | See [Section 10](#10-competitor-intelligence) |
| Intelligence | Recommendations (prescriptive, not just scores) | [FUTURE] | Nothing prescriptive exists — today's output is scores/data, not "do X" guidance |
| Intelligence | Alerts (beyond scheduled-search email) | [FUTURE] | See [Section 14](#14-alerts--notifications--automation) |
| Intelligence | Reports | [FUTURE] | See [Section 12](#12-reporting) |
| Intelligence | AI assistant | [FUTURE] | See [Section 13](#13-ai-commerce-copilot) |

---

## 4. AGENCY EXPERIENCE

**Current state: none.** Domain shape is **[PLANNED]** — locked
(Decision 1, see [MASTER_BLUEPRINT.md](../MASTER_BLUEPRINT.md)) but
zero implementation exists. Every row below is PLANNED (follows
directly from the locked shape and capability list) or FUTURE (an idea
not yet in the locked capability list) or DECISION REQUIRED.

```
Agency Organization
├── Employees
└── Clients
    └── Client Shops
```

| Module | Feature/capability | Status | Notes |
|---|---|---|---|
| Core | Agency dashboard | [FUTURE] | No design or data model yet |
| Client management | Client list/detail | [PLANNED] | Follows from locked "client management" capability |
| Client management | Client onboarding flow | [FUTURE] | Not in the locked capability list explicitly — implied but undesigned |
| Client management | Client health (score) | [FUTURE] | Depends on [Shop Intelligence](#7-shop-intelligence) existing first |
| Employee management | Employee list/invite | [PLANNED] | Built on `User`+`Membership` (shared primitives, already partially real) |
| Employee management | Employee roles | [PLANNED] | Depends on the new `Role` primitive (locked, not implemented — see [architecture/rbac.md](../architecture/rbac.md)) |
| Employee management | Employee permissions (scoped to specific clients) | [PLANNED] | Depends on the new `Permission` primitive (locked, not implemented) |
| Employee management | Employee workload view (e.g. clients-per-employee) | [FUTURE] | Not in the locked capability list — candidate for Product Gaps |
| Assignment | Client → employee assignment | [PLANNED] | Implied by "employee/client permissions," not separately named |
| Assignment | Shop → client assignment | [PLANNED] | Client Shops are locked as a structural node under Client |
| Shop oversight | Client shop list/detail | [PLANNED] | |
| Shop oversight | Shop health (per client shop) | [FUTURE] | Same dependency as client health |
| Optimization | Optimization workflow | [PLANNED] (named capability), [DECISION REQUIRED] (workflow design) | Locked capability "optimization work" has no defined workflow yet |
| Optimization | Recommendations feeding the workflow | [FUTURE] | Depends on Sections 7–10 existing |
| Reporting | Before/after proof reports | [PLANNED] | Named locked capability |
| Reporting | PDF export | [PLANNED] | Named locked capability |
| Reporting | Shareable report links | [PLANNED] | Named locked capability |
| Reporting | Client-facing report view (client-side, possibly no-login) | [FUTURE] | Not explicitly named in the locked capability list — see [Reporting](#12-reporting) and [Public reports/share links](#1-public--marketing-experience) |
| Usage & seats | Usage dashboard | [FUTURE] | Not in the locked capability list |
| Usage & seats | Seats | [DECISION REQUIRED] | The `Seat` primitive is locked as shared, but the brief names seats explicitly for Institute, not Agency — whether Agency uses per-employee seats or a simple `Package`-level employee-count limit is undecided |
| Settings | Agency settings | [FUTURE] | |
| Settings | Agency profile | [FUTURE] | |
| Settings | Billing (agency-specific, e.g. accounting for client count) | [FUTURE], [DECISION REQUIRED] | Whether Agency pricing scales with client/employee count is unresolved — ties to the `Package`/`AGENCY`-key naming question in [product/plans.md](plans.md) |
| Trust | Verification (e.g. "verified agency" badge) | [FUTURE] | Not defined anywhere yet |
| Trust | Partner directory presence | [FUTURE] | Ties to marketing [Partner directory](#1-public--marketing-experience) |

### Missing agency capabilities worth naming (not yet decided)

Per the task's instruction to identify what would make SellerSalt
genuinely useful to agencies, beyond the brief's explicit list — all
[FUTURE], none assumed or scheduled:

- **Client-facing portal** — a lightweight, scoped login for the
  *client themselves* to view their own shop's reports without seeing
  other agency clients. This is the concrete resolution to the open
  "does a Client get their own login" question in
  [product/personas.md](personas.md).
- **White-label/branded reports** — the agency's own branding on
  PDF/shareable reports rather than SellerSalt's, which materially
  affects how "genuinely useful to agencies" this is (also see
  [Content/CMS](#20-content--cms) branding capability).
- **Bulk/multi-client research** — running one search or one
  optimization pass across many client shops at once, rather than
  one-at-a-time.
- **Etsy API quota visibility for agencies specifically** — agencies
  managing many client shops will stress the shared platform-wide Etsy
  quota (see [marketplace/etsy.md](../marketplace/etsy.md) "Known
  scaling constraint") faster than an individual seller; agencies may
  need quota visibility or their own bring-your-own-key guidance
  surfaced more prominently.
- **Task/note tracking per client** — lightweight internal notes or
  task status per client, distinct from the optimization workflow
  itself.

These are also carried into [Product Gaps & Opportunities](#product-gaps--opportunities)
with explicit RECOMMENDED/OPTIONAL/EXPERIMENT classification.

---

## 5. INSTITUTE EXPERIENCE

**Current state: none.** Domain shape is **[PLANNED]** — locked
(Decision 1) but zero implementation exists.

```
Institute Organization
├── Staff
└── Cohorts
    └── Students
        └── Student Shops
```

| Module | Feature/capability | Status | Notes |
|---|---|---|---|
| Core | Institute dashboard | [FUTURE] | |
| Staff | Staff list/invite | [PLANNED] | Same `User`+`Membership` foundation as Agency Employees |
| Staff | Staff permissions (scoped to specific cohorts) | [PLANNED] | Depends on `Role`/`Permission` primitives, same as Agency |
| Cohorts | Cohort creation | [PLANNED] | Named locked capability; `Cohort` has **no schema yet** — this is the one structural concept with zero analog anywhere in today's data model (see [architecture/organizations.md](../architecture/organizations.md)) |
| Cohorts | Cohort list/detail | [PLANNED] | |
| Cohorts | Cohort analytics (aggregate student performance) | [FUTURE] | Depends on Student Progress existing first (below) |
| Students | Student enrollment | [PLANNED] | Named locked capability |
| Students | Student invitations | [PLANNED] | Likely reuses the existing `Invite` model/flow, extended with a cohort reference — [VERIFY] at implementation time |
| Students | Student management (list/detail) | [PLANNED] | |
| Students | Student shops | [PLANNED] | Same `Shop`/`ShopConnection` primitives as Agency Client Shops |
| Students | Student shop oversight | [PLANNED] | Named locked capability |
| Progress | Student progress tracking | [PLANNED] (named), [DECISION REQUIRED] (definition) | What "progress" measures is explicitly undefined — see [product/personas.md](personas.md) |
| Progress | Student performance view | [FUTURE] | Same dependency as above |
| Progress | Learning/curriculum milestones | [FUTURE] | Would require a curriculum-content model that doesn't exist and isn't scoped by Decision 1 |
| Seats | Seat management | [PLANNED] | Named locked capability, `Seat` primitive locked; allocation mechanics (org-wide cap vs. per-cohort assignment) are [DECISION REQUIRED] |
| Settings | Institute settings | [FUTURE] | |
| Settings | Institute profile | [FUTURE] | |
| Settings | Billing | [FUTURE] | Same open questions as Agency billing (seat-based pricing undecided) |
| Trust | Verification | [FUTURE] | |
| Trust | Partner directory presence | [FUTURE] | |

### Missing institute capabilities worth naming (not yet decided)

All [FUTURE]:

- **Cohort lifecycle (enrollment window, start/end dates, waitlist)** —
  cohorts are inherently time-boxed per the brief, but no lifecycle
  states are defined.
- **Instructor/staff-to-student messaging or feedback** — no
  communication primitive scoped between Staff and Students beyond
  generic team invites.
- **Certificate/completion issuance** — a natural pairing with
  "progress," undefined.
- **Cohort-relative benchmarking** ("how does my shop compare to my
  cohort's median") — a genuinely differentiated use of SellerSalt's
  existing scoring primitives (`competition-scoring.ts`) applied
  *within* a cohort rather than against the open market; worth flagging
  as high-leverage in [Product Gaps](#product-gaps--opportunities).
- **Student self-service shop verification** — confirming a student
  actually connected a real shop (vs. a placeholder), relevant given
  Student Shops likely reuse the OAuth-based `ShopConnection` mechanism.

---

## 6. RESEARCH & DISCOVERY

**Current state**: this is SellerSalt's most mature area. All items
below are [CURRENT] unless noted.

| Module | Feature/capability | Status | Notes |
|---|---|---|---|
| Discovery | Prospect discovery | [CURRENT] | |
| Discovery | Filters (price, shop age, review count) | [CURRENT] | `SearchConfig` fields |
| Discovery | Keyword search | [CURRENT] | `SearchConfig.keywords[]` |
| Discovery | Sorting | [CURRENT] | [VERIFY] exact sort options in UI — not enumerated in this pass, but the underlying data supports it |
| Discovery | Saved searches | [CURRENT] | `SearchConfig` itself is inherently a named, reusable saved search |
| Discovery | Scheduled searches | [CURRENT] | `scheduleCron` |
| Discovery | Email notifications on completion | [CURRENT] | |
| Discovery | Shop research (cold lookup) | [CURRENT] | "Spy on Competitor" |
| Discovery | Product research | [CURRENT] | Listing-level fields on `Prospect` |
| Discovery | Competitor research | [CURRENT] | Combination of Spy + competition scoring |
| Discovery | Trends | [CURRENT] | Derived, not a dedicated table |
| Discovery | Dropped shops | [CURRENT] | Derived, not a dedicated table |
| Discovery | Favorites | [CURRENT] | |
| Discovery | Exports (CSV) | [CURRENT] | Confirmed on Prospects, Dropped shops, Trends |
| Discovery | Saved items (beyond Favorites) | N/A | Favorites *is* the saved-items mechanism — no separate concept exists |
| Discovery | Collections (custom groupings beyond Favorites) | [FUTURE] | Not found — see [Product Gaps](#product-gaps--opportunities) |
| Discovery | Side-by-side comparison (shop vs. shop, product vs. product) | [FUTURE] | Not confirmed built |
| Discovery | Historical analysis | [CURRENT] | `ShopSnapshot` time series powers the tracked-shop sales-trend graph |

### Reusable intelligence primitives (already real, not to be reinvented)

These are the actual building blocks other future modules (Shop
Intelligence, Product Intelligence, AI tools, Reporting) should be built
on top of:

| Primitive | What it is | Where |
|---|---|---|
| `SearchConfig` | A named, parameterized, reusable query | `prisma/schema.prisma` |
| `Job` | An async execution unit with status tracking | `prisma/schema.prisma`, BullMQ |
| `Prospect` | A result row that also forms a time series across repeated search runs | `prisma/schema.prisma` |
| `ShopWatch`/`ShopSnapshot` | A tracked entity + its point-in-time snapshot series | `prisma/schema.prisma` |
| `competition-scoring.ts` | A two-axis (Difficulty/Demand), threshold-based scorer with labeled color semantics | `src/lib/competition-scoring.ts` |
| `extractLongTailTerms()` | Title-based keyword-phrase extraction | `src/app/api/shops/[shopExternalId]/route.ts` |

Every future intelligence module (Sections 7–11) should be evaluated
first against whether it's a *new lens on these existing primitives*
(cheap) versus a genuinely new data-collection need (expensive) before
being scoped.

---

## 7. SHOP INTELLIGENCE

**Important distinction, verified against the schema**: SellerSalt has
**two separate "shop" concepts today**, and this section's brief
lifecycle (Connect → Sync → Health → Intelligence → Recommendations →
Actions → Monitoring → Reassessment) is about the **second** one, which
is largely unbuilt:

1. **Researched/competitor shops** (`Prospect`/`ShopWatch`) — any Etsy
   shop, works cold, read-only, platform-owned data. This is what
   powers "Spy on Competitor" today.
2. **The user's own shop** (`SellerChannel`) — OAuth-connected,
   customer-specific, currently admin-only. This is what "Shop
   Intelligence" in the brief's sense (health score, recommendations
   for *my own* shop) would be built on.

| Lifecycle stage | Capability | Status | Notes |
|---|---|---|---|
| Connect | OAuth connection (Shopify/WooCommerce/Etsy-seller) | [CURRENT] (mechanism), admin-only (access) | Real, working OAuth — see [architecture/integrations.md](../architecture/integrations.md) |
| Connect | Permissions/scopes | [CURRENT] | Write scope already requested on all three, ready for future cross-listing |
| Import/sync | Order sync | [CURRENT] (mechanism), admin-only (access) | `sync-seller-channel.ts`, `SellerOrder` |
| Import/sync | Sync status | [CURRENT] | `SellerChannel.lastSyncedAt`/`lastSyncError` |
| Import/sync | Data freshness (surfaced in UI) | [VERIFY] | Fields exist; not confirmed whether Analytics UI surfaces "last synced X ago" prominently |
| Health assessment | Health score / shop score (for the user's *own* shop) | [FUTURE] | Does not exist — `competition-scoring.ts` scores *other* (competitor) shops within research, not the user's own connected shop |
| Health assessment | SEO score | [FUTURE] | See [Section 9](#9-listing--seo-intelligence) |
| Health assessment | Listing score | [FUTURE] | |
| Health assessment | Product score | [FUTURE] | See [Section 8](#8-product-intelligence) |
| Health assessment | Conversion/performance score | [FUTURE] | No conversion-rate data exists in the schema (orders exist, but no funnel/traffic data) |
| Intelligence | Issue detection | [FUTURE] | |
| Intelligence | Recommendations | [FUTURE] | |
| Actions | Optimization actions (taken from a recommendation) | [FUTURE] | Nearest existing analog is `CrossListing` (schema-only, no push logic) — conceptually different (cross-platform sync, not optimization) |
| Monitoring | Optimization history / scan history | [FUTURE] | |
| Monitoring | Before/after comparison | [FUTURE] | Named as a locked Agency reporting capability (Decision 1) but the underlying "before" and "after" *scans* it would compare don't exist yet |
| Monitoring | Alerts (shop-level) | [FUTURE] | See [Section 14](#14-alerts--notifications--automation) |
| Reassessment | Re-scan on schedule | [FUTURE] | The closest existing analog is `ShopWatch`'s scheduled snapshot mechanism for *competitor* shops — the same BullMQ pattern would apply here, just against the user's own shop |

**[DECISION REQUIRED]**: Shop Intelligence as scoped in the brief only
makes sense once seller channels are customer-facing (today admin-only
per the MVP scope decision) — building health scores for a feature
customers can't access yet is a sequencing question, not just a
technical one.

---

## 8. PRODUCT INTELLIGENCE

| Module | Feature/capability | Status | Notes |
|---|---|---|---|
| Discovery | "Winning products" discovery | [CURRENT] (unlabeled) | This is functionally what Prospects search + competition scoring already does — finding low-competition/high-demand listings — just not badged as a distinct "winning products" feature in the UI |
| Trends | Product trends | [CURRENT] | Trends page |
| Velocity | Product velocity (sales rate) | [CURRENT] (baseline metric) | `estDailySales`/`avgSellingRatio` on `Prospect`, computed by the Etsy connector — real derived metrics, not a dedicated "velocity" UI concept |
| Opportunities | Product opportunity surfacing | [FUTURE] | Today's Trends/Dropped-shops are the closest static views; no dedicated "opportunity" concept exists — also named as an AI-assistant example query gap in [ai/assistant.md](../ai/assistant.md) |
| Comparison | Product-to-product comparison | [FUTURE] | Not confirmed built |
| Health | Product health | [FUTURE] | |
| Optimization | Product optimization | [FUTURE] | See [Section 9](#9-listing--seo-intelligence) for the listing-level version of this |
| SEO | Product SEO | [FUTURE] | |
| Profitability | Cost/margin/profitability concepts | [FUTURE], [DECISION REQUIRED] | `Prospect` only stores `price`, no cost data — this would need new fields and a real design decision (does SellerSalt ever see a seller's actual costs, or only estimate margin from price signals?) |
| Monitoring | Listing-level monitoring (vs. shop-level tracking) | [FUTURE] | `ShopWatch` tracks at the shop level; no per-listing tracking exists |
| Alerts | Product alerts | [FUTURE] | |
| Recommendations | Product recommendations | [FUTURE] | |

---

## 9. LISTING / SEO INTELLIGENCE

**Current state**: exactly one real capability exists here — everything
else is [FUTURE].

| Module | Feature/capability | Status | Notes |
|---|---|---|---|
| Keywords | Keyword extraction from competitor listing titles | [CURRENT] | `extractLongTailTerms()` — real, on the shop detail page, but scoped to *reading a competitor's* keyword usage, not auditing the user's own listing |
| Audit | Listing audit (of the user's own listing) | [FUTURE] | |
| Audit | Title analysis | [FUTURE] | |
| Audit | Description analysis | [FUTURE] | |
| Audit | Tags/keyword analysis (own listings) | [FUTURE] | Distinct from the competitor-keyword-extraction above |
| Scoring | SEO score | [FUTURE] | |
| Opportunities | Keyword opportunities | [FUTURE] | |
| Opportunities | Ranking opportunities | [FUTURE] | Etsy's own ranking signals are not exposed via the current connector beyond what's already captured (price, reviews, sales) |
| Recommendations | Image/content recommendations | [FUTURE] | |
| Workflow | Optimization workflow | [FUTURE] | Same dependency as [Section 7](#7-shop-intelligence)'s optimization actions |
| Workflow | Before/after | [FUTURE] | |
| Monitoring | Ongoing listing monitoring | [FUTURE] | |

---

## 10. COMPETITOR INTELLIGENCE

| Module | Feature/capability | Status | Notes |
|---|---|---|---|
| Discovery | Competitor discovery | [CURRENT] | Any shop found via Prospects search, or cold lookup via Spy |
| Tracking | Competitor tracking | [CURRENT] | `ShopWatch` |
| Scoring | Difficulty/Demand scoring | [CURRENT] | `competition-scoring.ts`, two-axis, intentionally inverted color semantics — see [design/ux-principles.md](../design/ux-principles.md) |
| Comparison | Competitor-to-competitor comparison | [FUTURE] | Not confirmed built |
| Comparison | "My shop" vs. competitor comparison | [FUTURE] | Blocked on Shop Intelligence ([Section 7](#7-shop-intelligence)) existing for the user's own shop — named as an AI-assistant example query gap in [ai/assistant.md](../ai/assistant.md) |
| Health | Competitor health scoring | [CURRENT] (as Difficulty score) | The existing Difficulty axis already functions as a competitor-health signal |
| Products | Competitor's product catalog | [CURRENT] | `getShopTopListings()` |
| Trends | Competitor trend tracking | [CURRENT] | Via `ShopSnapshot` time series |
| Alerts | Competitor alerts (e.g. "competitor just dropped price") | [FUTURE] | No alerting beyond scheduled-search email exists |
| Reports | Competitor reports (exportable) | [FUTURE] | CSV export exists on list views; a dedicated competitor report document does not |
| Positioning | Market positioning / benchmarking | [FUTURE] | |

---

## 11. TRENDS & MARKET INTELLIGENCE

| Module | Feature/capability | Status | Notes |
|---|---|---|---|
| Trends | Trends view | [CURRENT] | Derived from `Prospect` query patterns |
| Trends | Emerging products | [CURRENT] (implicit in Trends) | [VERIFY] exact framing in UI |
| Trends | Declining products / dropped shops | [CURRENT] | "Dropped shops" is the shop-level version of this; product-level decline detection [VERIFY] |
| Trends | Seasonal patterns | [FUTURE] | Would require multi-period historical comparison logic not confirmed built |
| Opportunities | Market opportunities | [FUTURE] | Same "opportunity" gap named in Sections 8/10 |
| Category intelligence | Category-level rollups | [FUTURE] | `Prospect` has no explicit `category` field — [VERIFY]/[DECISION REQUIRED] whether category needs to be captured from Etsy's taxonomy |
| Marketplace intelligence | Cross-marketplace trend comparison | [FUTURE] | Blocked on a second marketplace existing — see [architecture/marketplace.md](../architecture/marketplace.md) |
| Alerts | Trend alerts | [FUTURE] | |
| Historical data | Time-series storage | [CURRENT] | `Prospect` (via repeated search runs) and `ShopSnapshot` both function as real historical stores |
| Forecasting | Forecasting concepts | [FUTURE] | No predictive/forecasting logic exists — today's metrics are descriptive (current state, historical trend), not predictive |

---

## 12. REPORTING

**Current state: nothing.** No PDF generation, no report model, no
share-link mechanism found anywhere in the codebase. Every row is
[FUTURE] except where a locked capability makes it [PLANNED].

| Module | Feature/capability | Status | Notes |
|---|---|---|---|
| Personal reports | Individual seller's own report | [FUTURE] | |
| Shop reports | Shop-level report | [FUTURE] | |
| Product reports | Product-level report | [FUTURE] | |
| Competitor reports | Competitor-level report | [FUTURE] | |
| Optimization reports | Before/after optimization report | [PLANNED] (named for Agency), [FUTURE] (for Individual) | Decision 1 names "before/after proof reports" as a locked Agency capability specifically |
| Agency proof reports | Client-facing proof-of-work report | [PLANNED] | Named locked Agency capability |
| Client reports | Per-client report | [PLANNED] | Same as above |
| Institute reports | Institute-level report | [FUTURE] | Not explicitly named in Decision 1's Institute capability list (which names "student progress," not "reports" specifically) |
| Cohort reports | Cohort-level aggregate report | [FUTURE] | Same gap as above — flagged in Section 5's missing-capabilities list |
| PDF generation | PDF export mechanism | [PLANNED] (named for Agency), infrastructure [FUTURE] | No PDF library/service integrated in `package.json` today |
| Shareable links | Public/semi-public report URLs | [PLANNED] (named for Agency), [FUTURE] (mechanism) | Ties to [Public reports/share links](#1-public--marketing-experience) |
| Report history | Versioned/historical report storage | [FUTURE] | |
| Templates | Report template system | [FUTURE] | |
| Branding | White-label/branded reports (agency's own branding) | [FUTURE] | Named in Section 4's missing-capabilities list as high-value |
| Scheduled reports | Auto-generated recurring reports | [FUTURE] | |

**[DECISION REQUIRED]**: whether Reporting is one shared capability
(a single `Report` model/service consumed by Individual, Agency, and
Institute contexts) or genuinely separate systems — this document
recommends the shared-model approach (least duplication, consistent
with the "reusable intelligence primitives" philosophy in
[Section 6](#6-research--discovery)), but it has not been decided by
the product owner.

---

## 13. AI COMMERCE COPILOT

**Current state: nothing.** No AI SDK dependency, no conversation
model. Full detail: [ai/assistant.md](../ai/assistant.md),
[architecture/ai.md](../architecture/ai.md). This section maps the
brief's structure at the surface-map level; it does not re-derive the
analysis already in those documents.

```
AI assistant
├── Natural language interface
├── Predefined queries
├── Tool registry
├── Research tools
├── Shop tools
├── Product tools
├── Competitor tools
├── Trend tools
├── SEO tools
├── Analytics tools
├── Reporting tools
└── Recommendation tools
```

| Module | Feature/capability | Status | Notes |
|---|---|---|---|
| Interface | Assistant home / entry point | [FUTURE] | Not designed — see [design/information-architecture.md](../design/information-architecture.md) open question |
| Interface | Conversation UI | [FUTURE] | |
| Interface | Suggested queries | [FUTURE] | The brief's example list (find winning products, analyze my shop, etc.) is the seed for this |
| Interface | Query history | [FUTURE] | Requires new conversation-persistence schema |
| Interface | Saved queries | [FUTURE] | |
| Interface | Contextual/page-aware assistant | [FUTURE] | |
| Tool registry | Research tools | [PLANNED] (data exists), [FUTURE] (tool wrapper) | Would wrap [Section 6](#6-research--discovery)'s existing primitives — closest to shippable of all the tool categories |
| Tool registry | Shop tools | [FUTURE] | Blocked on [Shop Intelligence](#7-shop-intelligence) existing for "my shop" queries |
| Tool registry | Product tools | [FUTURE] | Blocked on [Product Intelligence](#8-product-intelligence) |
| Tool registry | Competitor tools | [PLANNED] (data exists), [FUTURE] (tool wrapper) | Could wrap today's competition-scoring + Spy data directly |
| Tool registry | Trend tools | [PLANNED] (data exists), [FUTURE] (tool wrapper) | Could wrap today's Trends view |
| Tool registry | SEO tools | [FUTURE] | Blocked on [Listing/SEO Intelligence](#9-listing--seo-intelligence) |
| Tool registry | Analytics tools | [FUTURE] | Blocked on Analytics becoming customer-facing (today admin-only) |
| Tool registry | Reporting tools ("generate a report") | [FUTURE] | Blocked on [Reporting](#12-reporting) existing |
| Tool registry | Recommendation tools | [FUTURE] | Blocked on any recommendation engine existing (nothing prescriptive exists today) |
| Execution | Tool execution / result rendering | [FUTURE] | |
| Execution | Result cards, charts, tables | [FUTURE] | Recharts v3 is already a dependency — reuse, not a new library |
| Execution | Citations/source data | [FUTURE] | Important for the "editorial judgment, labeled as such" UX principle — see [design/ux-principles.md](../design/ux-principles.md) |
| Execution | Actions taken from AI recommendations | [FUTURE] | |
| Governance | Permissions (who can use which tools) | [FUTURE] | Would plug into the same `Permission` primitive locked by Decision 1 |
| Governance | Usage limits (per plan tier) | [FUTURE] | Would extend `checkLimit()`/`Package` pattern — see [product/plans.md](plans.md) |
| Governance | AI settings | [FUTURE] | |

Per [ai/assistant.md](../ai/assistant.md)'s existing analysis: roughly
half the brief's example queries (find winning products, compare with
competitors) map to tools that could wrap *already-real* data; the
other half (SEO problems, momentum analysis, report generation) require
new intelligence work independent of the assistant shell itself. This
surface map does not change that conclusion — the "[PLANNED] (data
exists)" rows above are the same distinction restated at the
tool-registry level.

---

## 14. ALERTS / NOTIFICATIONS / AUTOMATION

**Current state**: exactly one real automation exists (scheduled search
→ email). Everything else is [FUTURE].

| Module | Feature/capability | Status | Notes |
|---|---|---|---|
| Email | Scheduled-search completion email | [CURRENT] | `src/lib/send-email.ts`, `EmailSettings` |
| Email | Team invite email | [CURRENT] | |
| Email | Password reset email | [CURRENT] | |
| In-app | In-app notification center | [FUTURE] | No model or UI found |
| Shop alerts | Shop-level alerts (e.g. new competitor, price change) | [FUTURE] | |
| Competitor alerts | Competitor-specific alerts | [FUTURE] | |
| Trend alerts | Trend-based alerts | [FUTURE] | |
| Optimization alerts | Optimization-related alerts | [FUTURE] | Depends on [Shop/Listing Intelligence](#7-shop-intelligence) existing |
| Billing notifications | Payment failure/renewal notices | [VERIFY]/[FUTURE] | Webhook handlers exist and could trigger these, but no dedicated billing-notification email template was confirmed in this pass |
| Team notifications | Team-activity notifications | [FUTURE] | |
| System notifications | Platform-wide announcements | [FUTURE] | |
| Scheduled reports | Auto-delivered reports | [FUTURE] | Depends on [Reporting](#12-reporting) |
| Automation rules | User-defined "if X then notify/act" rules | [FUTURE] | No rule-engine concept exists; `SearchConfig.scheduleCron` is the only existing automation primitive, and it's narrowly scoped to re-running a search |
| Preferences | Notification preferences | [FUTURE] | No per-user notification-preference model found |
| Notification center | Unified notification inbox | [FUTURE] | |

---

## 15. ORGANIZATION / TEAM MANAGEMENT

| Module | Feature/capability | Status | Notes |
|---|---|---|---|
| Organization | Organization entity | [CURRENT] | Flat shape today — no Agency/Institute structure implemented |
| Membership | Membership (user↔org link) | [CURRENT] | `role`: `OWNER`/`ADMIN`/`MEMBER` |
| Roles | Flat role enum | [CURRENT] | `MembershipRole` |
| Roles | Real `Role` model (named, assignable permission sets) | [PLANNED] | Locked shared primitive (Decision 1), not implemented — see [architecture/rbac.md](../architecture/rbac.md) |
| Permissions | Resource-scoped `Permission` model | [PLANNED] | Locked shared primitive, not implemented |
| Seats | `Seat` model | [PLANNED] | Locked shared primitive, not implemented; allocation mechanics [DECISION REQUIRED] |
| Invitations | Team invites | [CURRENT] | `Invite` model |
| User management | Member list/removal | [CURRENT] | [VERIFY] exact UI capability at `/settings/team` |
| Activity/Audit | Activity log | [FUTURE] | Locked shared primitive *concept* (Decision 1 names "Activity/Audit"), but no implementation exists — same gap independently flagged for platform-admin audit logging in [architecture/rbac.md](../architecture/rbac.md) |
| Sessions/devices | Session/device management | [FUTURE] | Not found |
| Settings | Organization settings | [CURRENT] (minimal) | [VERIFY] exact scope of what's editable beyond profile/billing/team/channels |

### Agency-specific extensions (all [PLANNED]/[FUTURE], see Section 4)

Employees (Membership-based), Clients (new entity), Client Shops
(`Shop`/`ShopConnection`-based), client-scoped `Permission`s.

### Institute-specific extensions (all [PLANNED]/[FUTURE], see Section 5)

Staff (Membership-based), Cohorts (new entity, no analog today),
Students (new entity), Student Shops, cohort-scoped `Permission`s,
`Seat` allocation.

---

## 16. BILLING & SUBSCRIPTIONS

**Current state**: real and mature — see
[architecture/billing.md](../architecture/billing.md) and
[billing/billing-lifecycle.md](../billing/billing-lifecycle.md) for
full depth; summarized here.

| Module | Feature/capability | Status | Notes |
|---|---|---|---|
| Pricing | Live, DB-editable pricing | [CURRENT] | `Package` model |
| Pricing | Monthly/annual toggle | [FUTURE] | `Package.priceUsd` has no interval field |
| Checkout | Package selection | [CURRENT] | |
| Checkout | Stripe checkout | [CURRENT] | Dynamic Checkout Sessions |
| Checkout | PayPal checkout | [CURRENT] | Lazy Product+Plan creation |
| Checkout | Coupons | [CURRENT] | `Coupon`, percent/fixed, redemption limits/expiry |
| Payment methods | Payment method management (view/update card) | [VERIFY]/[FUTURE] | Not confirmed built beyond the initial checkout flow |
| Invoices | Invoice list/download | [VERIFY]/[FUTURE] | Not confirmed built |
| Transaction history | Payment history view | [VERIFY]/[FUTURE] | Not confirmed built |
| Subscription state | State machine (`INCOMPLETE`/`TRIALING`/`ACTIVE`/`PAST_DUE`/`CANCELED`) | [CURRENT] | `Subscription.status`, driven by webhooks |
| Upgrades | Change package on an active subscription (upgrade) | [VERIFY]/[FUTURE] | Not confirmed whether `/api/billing/checkout` supports this vs. only first-time purchase |
| Downgrades | Downgrade on an active subscription | [VERIFY]/[FUTURE] | Same as above |
| Scheduled downgrade | Downgrade effective at period end | [FUTURE] | No field analogous to `cancelAtPeriodEnd` exists for a pending downgrade |
| Cancellation | Cancel subscription | [CURRENT] | `/api/billing/cancel`; `cancelAtPeriodEnd` field exists |
| Renewal | Automatic renewal | [CURRENT] | Webhook-driven, standard Stripe/PayPal recurring billing |
| Expiration | Access downgrade on non-active status | [CURRENT] | `upsertSubscription()` falls back org to `STARTED` package on any non-`ACTIVE`/`TRIALING` status |
| Failed payments | Failed-payment handling | [CURRENT] (state), [FUTURE] (dedicated UI/notification) | `PAST_DUE` status exists; no confirmed dedicated "your payment failed" UI/email |
| Grace periods | Grace period before downgrade | [VERIFY]/[FUTURE] | Not confirmed as a distinct concept from `PAST_DUE` |
| Seat limits | Numeric plan limits | [CURRENT] | `checkLimit()`, `Package` fields |
| Seat limits | True per-seat allocation (assign/revoke) | [PLANNED] | Depends on the locked `Seat` primitive (Decision 1), not implemented |
| Usage limits | Monthly prospect limit | [CURRENT] | `maxProspectsPerMonth` |
| Admin grants | Manual/admin-granted subscriptions | [CURRENT] | `PaymentProviderType.MANUAL` |
| Billing settings | Provider mode toggle (live/sandbox), credential storage | [CURRENT] | `PaymentProvider`, admin-only |
| Safepay/PayFast | Checkout logic | [FUTURE] | Credential storage only today per root `CLAUDE.md` |
| Feature-gated entitlement | Capability model on `Package` (`mcp_access`, `ai_assistant`, `reports`, etc.) | [PLANNED] (named, locked for `mcp_access` specifically), [FUTURE] (schema) | **[LOCKED — Decision 4]**: MCP access must be capability-gated, premium-plan-only initially, never a hardcoded plan-key check. `Package` has no boolean-feature-flag shape today — see [product/plans.md](plans.md) and [architecture/mcp.md §Commercial model](../architecture/mcp.md#commercial-model--capability-based-entitlement) |
| Affiliate commission | Commission Events derived from `Subscription`/webhook billing state, never a parallel financial truth | [PLANNED] (principle locked), [FUTURE] (implementation) | **[LOCKED — Decision 5]**: billing remains the sole source of truth; affiliate payouts are a new *outbound* financial obligation, distinct from `Package` entitlement limits. See [architecture/affiliate.md §Billing integration](../architecture/affiliate.md#billing-integration--billing-remains-the-source-of-truth) |

---

## 17. ADMIN PLATFORM

**Current state**: real, single-tier (no sub-admin roles). Verified
against `src/app/(dashboard)/admin/admin-client.tsx` and
`src/app/api/admin/*`.

| Module | Feature/capability | Status | Notes |
|---|---|---|---|
| Access | Admin console gate | [CURRENT] | Flat `ADMIN_EMAILS` allowlist, `isAdminEmail()` — see [architecture/rbac.md](../architecture/rbac.md) |
| Dashboard | Admin dashboard / platform KPIs | [VERIFY]/[FUTURE] | `/admin` exists but confirmed sections are management forms (below), not a KPI dashboard — [VERIFY] whether any summary metrics are shown |
| Users | User management (cross-org) | [FUTURE] | Confirmed admin sections are organization/package/coupon/connector/payment-provider/email-settings management — a dedicated cross-org *user* list was not confirmed |
| Organizations | Organization list/management | [CURRENT] | `/api/admin/organizations` |
| Organizations | Individuals/Agencies/Institutes (segmented views) | [FUTURE] | Depends on `Organization.kind` discriminator existing (Decision 1 residual, not built) |
| Organizations | Clients/Students (cross-org visibility) | [FUTURE] | Depends on those entities existing at all |
| Organizations | Employees (cross-org visibility) | [FUTURE] | Same dependency |
| Subscriptions | Admin-granted subscriptions | [CURRENT] | `/api/admin/organizations/[id]/subscription` |
| Packages | Package CRUD (pricing/limits) | [CURRENT] | `/api/admin/packages` |
| Coupons | Coupon CRUD | [CURRENT] | `/api/admin/coupons` |
| Payments | Payment provider credential management | [CURRENT] | `/api/admin/payment-providers`, live/sandbox mode toggle |
| Payments | Invoice/transaction oversight (platform-wide) | [VERIFY]/[FUTURE] | Not confirmed |
| Connectors | Platform (research) connector management | [CURRENT] | `/api/admin/platform-connectors` — confirmed in `admin-client.tsx` (Etsy API key/shared secret form) |
| Connectors | Seller-channel connector oversight (cross-org) | [VERIFY]/[FUTURE] | Individual orgs manage their own via `/settings/channels`; a platform-wide oversight view not confirmed |
| Verification | Agency/Institute verification workflow | [FUTURE] | Ties to Sections 4/5 "verification" |
| Partners | Partner directory management | [FUTURE] | |
| Content | Homepage editor / site branding | [FUTURE] | No CMS found — see [Content/CMS](#20-content--cms) |
| Email | Email settings (SMTP connection) | [CURRENT] | `/api/admin/email-settings` + test-send |
| Email | Email *template* management | [FUTURE] | `EmailSettings` is connection config only, no template model — see [Communications](#19-communications) |
| System | System settings (generic key-value) | [CURRENT] | `AppSetting`/`src/lib/app-settings.ts` |
| System | Feature flags | [FUTURE] | Not found |
| Audit | Audit logs | [FUTURE] | Not found anywhere — see [architecture/rbac.md](../architecture/rbac.md) |
| Support | Support tooling (ticket view, impersonation, etc.) | [FUTURE] | Not found |
| System health | Queue/job monitoring UI | [FUTURE] | BullMQ jobs exist (`Job` model, worker) but no admin UI to inspect queue health was confirmed |
| System health | Data sync monitoring (seller channels) | [VERIFY]/[FUTURE] | `lastSyncedAt`/`lastSyncError` fields exist; platform-wide monitoring view not confirmed |
| Usage | Cross-org usage reporting | [FUTURE] | Not found |
| Security | Security event visibility | [FUTURE] | Not found |

---

## 18. SUB-ADMIN / DEPARTMENT SYSTEM

**Current state: none.** This is entirely conceptual — the brief asks
for the product surface to be designed, explicitly noting these roles
are not implemented. Every row is [FUTURE] or [DECISION REQUIRED].

```
Super Admin
├── Onboarding Team
├── SEO/Growth Team
├── Accounts/Billing
├── Support Team
├── Content Team
├── Operations
└── Other future departments
```

Per [architecture/rbac.md](../architecture/rbac.md), this is a genuinely
separate axis from org-level `Role`/`Permission` (Decision 1) — platform
employee permissions across *all* orgs, not one org member's permissions
within their own org. It would plausibly reuse the same underlying
mechanism (a `Permission`-style grant model) but is a distinct
application of it.

| Department | Dashboard | Tools | Data visibility | Allowed actions | Limitations | Sub-members/manager | Audit trail |
|---|---|---|---|---|---|---|---|
| Onboarding Team | [FUTURE] | Org/signup funnel visibility, manual account assistance | New orgs, signup state | Assist onboarding, possibly resend invites/verification | No billing/payment credential access | [FUTURE] | [FUTURE] — depends on the Activity/Audit primitive existing |
| SEO/Growth Team | [FUTURE] | Content/CMS tools (see Section 20), analytics on marketing pages | Marketing content, SEO metadata, public analytics | Edit marketing content, publish programmatic SEO pages | No access to org/customer data | [FUTURE] | [FUTURE] |
| Accounts/Billing | [FUTURE] | Today's `/admin` payment-provider/package/coupon/subscription tools, scoped down | Billing/subscription data across orgs | Grant manual subscriptions, manage coupons/packages | No access to org's research data or credentials unrelated to billing | [FUTURE] | [FUTURE] |
| Support Team | [FUTURE] | Ticket view (not built), possibly limited org visibility for troubleshooting | Org-level account state (not full data) | Assist with account issues, possibly issue refunds (ties to Billing dept scope) | No payment-credential or platform-connector access | [FUTURE] | [FUTURE] |
| Content Team | [FUTURE] | CMS tools (Section 20), email template editor (Section 19) | Marketing/content data, email templates | Edit/publish content and templates | No org/customer data access | [FUTURE] | [FUTURE] |
| Operations | [FUTURE] | Platform connector management, queue/job monitoring, system settings | Platform infrastructure state | Manage platform connectors, `AppSetting`, monitor jobs | Scope TBD — this department overlaps most with today's undifferentiated `/admin` | [FUTURE] | [FUTURE] |

**[DECISION REQUIRED]**: whether this department system launches all at
once or incrementally (e.g. Accounts/Billing first, since it maps most
directly onto existing `/admin` functionality that already needs
scoping down from "any `ADMIN_EMAILS` address can do everything").

---

## 19. COMMUNICATIONS

| Module | Feature/capability | Status | Notes |
|---|---|---|---|
| SMTP config | Email connection settings | [CURRENT] | `EmailSettings`, `/admin` |
| Sending | Transactional email sending | [CURRENT] | `src/lib/send-email.ts` — password reset, invites, scheduled-search alerts |
| Templates | Template editor | [FUTURE] | No template model exists — `EmailSettings` is connection config only |
| Templates | Variables | [FUTURE] | |
| Templates | Preview | [FUTURE] | |
| Templates | Test send | [CURRENT] (for SMTP connection itself), [FUTURE] (for a specific template) | `/api/admin/email-settings/test` tests the SMTP connection, not a template |
| Templates | Versions | [FUTURE] | |
| Templates | Activation (draft vs. live) | [FUTURE] | |
| Templates | Delivery logs | [FUTURE] | No delivery-log model found |
| System announcements | Platform-wide announcement banners | [FUTURE] | |
| In-app announcements | In-product announcement surface | [FUTURE] | |
| Notification templates | Templates for in-app notifications (once they exist) | [FUTURE] | Depends on [in-app notifications](#14-alerts--notifications--automation) existing first |
| Affiliate lifecycle email | Application approved/rejected, payout sent/failed | [FUTURE] | Same not-yet-built template system as every other email — see [architecture/affiliate.md §User-facing surfacing](../architecture/affiliate.md#user-facing-surfacing--notifications-and-email); not a separate mailer |
| MCP/Agent lifecycle notification | Credential revoked, rate-limit warning (in-app Notification Center, not email) | [FUTURE] | See [architecture/mcp.md §Rate limiting & usage tracking](../architecture/mcp.md#rate-limiting--usage-tracking) |

---

## 20. CONTENT / CMS

**Current state: none as an editable system.** The marketing homepage
exists as code (`src/app/marketing-homepage.tsx`), not as
admin-editable content.

| Module | Feature/capability | Status | Notes |
|---|---|---|---|
| Homepage editor | Admin-editable homepage content | [FUTURE] | Today's homepage is hardcoded in a `.tsx` file, not data-driven (except pricing, which pulls live from `Package`) |
| Marketing page editor | General marketing page editing | [FUTURE] | |
| Blog | Blog system | [FUTURE] | |
| Resources | Resource library | [FUTURE] | |
| FAQs | FAQ content/structured data | [FUTURE] | Ties to [AEO](#21-seo--aeo--geo) |
| Glossary | Term glossary | [FUTURE] | Named in the original SEO brief as programmatic SEO surface |
| Comparison pages | Comparison content | [FUTURE] | |
| SEO metadata | Per-page metadata management | [FUTURE] | [VERIFY] whether Next.js's built-in metadata API is used anywhere today — not confirmed |
| Structured data | JSON-LD management | [FUTURE] | |
| Media | Media/asset library | [FUTURE] | |
| Navigation | Marketing site nav/footer management | [FUTURE] | |
| Announcements | Content-driven announcements | [FUTURE] | Overlaps with [Communications](#19-communications) |
| Branding | Agency/Institute white-label branding assets | [FUTURE] | Named in Section 4's missing-capabilities list |

---

## 21. SEO / AEO / GEO

Full depth already exists in [seo/seo.md](../seo/seo.md),
[seo/aeo.md](../seo/aeo.md), [seo/geo.md](../seo/geo.md) — this section
maps them at the surface-map level for completeness; nothing here
contradicts those documents.

| Category | Capability | Status | Notes |
|---|---|---|---|
| SEO | Metadata (title/description) | [VERIFY]/[FUTURE] | Not confirmed implemented via Next.js's metadata API |
| SEO | Canonical URLs | [FUTURE] | |
| SEO | Sitemap | [FUTURE] | No `sitemap.ts` found |
| SEO | Robots | [FUTURE] | No `robots.ts` found |
| SEO | Structured data (JSON-LD) | [FUTURE] | |
| SEO | Internal linking strategy | [FUTURE] | |
| SEO | Programmatic pages | [FUTURE] | Depends on [Content/CMS](#20-content--cms) |
| SEO | Content architecture | [FUTURE] | |
| SEO | Indexing controls | [FUTURE] | |
| AEO | Question/answer content | [FUTURE] | |
| AEO | FAQ (structured) | [FUTURE] | |
| AEO | Structured answers | [FUTURE] | |
| AEO | Entity relationships | [FUTURE] | |
| AEO | Answer-oriented pages | [FUTURE] | |
| GEO | Entity consistency | [FUTURE] | The one hard rule already established: never publish a capability claim ahead of what's actually built — see [seo/geo.md](../seo/geo.md) |
| GEO | Machine-readable information | [FUTURE] | |
| GEO | Structured product information | [FUTURE] | Could be generated from live `Package` data, same as homepage pricing already is |
| GEO | Authoritative content | [FUTURE] | |
| GEO | Reference content | [FUTURE] | |

---

## 22. MARKETPLACE PLATFORM

Governed by **Decision 3** — see [MASTER_BLUEPRINT.md](../MASTER_BLUEPRINT.md)
and [architecture/marketplace.md](../architecture/marketplace.md) for
full detail. Etsy is the only current marketplace. No concrete future
marketplace schema is designed here, per the locked decision.

```
RAW DATA
  ↓
ADAPTER / CONNECTOR
  ↓
NORMALIZED COMMERCE REPRESENTATION
  ↓
INTELLIGENCE
  ↓
RECOMMENDATIONS
  ↓
ACTIONS
```

| Module | Feature/capability | Status | Notes |
|---|---|---|---|
| Registry | Marketplace research connector registry | [CURRENT] | `src/connectors/registry.ts` |
| Registry | Seller-channel connector registry | [CURRENT] | `src/seller-channels/registry.ts` — separate from the above by design |
| Capabilities | Per-connector capability contract (`MarketplaceConnector`) | [CURRENT] | `src/connectors/types.ts` |
| Capabilities | Per-connector capability contract (`SellerChannelConnector`) | [CURRENT] | `src/seller-channels/types.ts` |
| Research connectors | Etsy | [CURRENT] | Fully implemented |
| Research connectors | eBay (or any second marketplace) | [FUTURE], [DECISION REQUIRED] | Only named as "planned" in a code comment — not committed; blocks Decision 3's deferred normalization schema |
| Seller connectors | Shopify, WooCommerce, Etsy-seller | [CURRENT] | Admin-only access today |
| Seller connectors | eBay-seller | [FUTURE] | Reserved enum value (`EBAY_SELLER`) with no confirmed implementation |
| OAuth | Per-platform OAuth flows | [CURRENT] | See [architecture/integrations.md](../architecture/integrations.md) |
| Credentials | Encrypted credential storage | [CURRENT] | AES-256-GCM, `src/lib/encryption.ts` |
| Permissions | Scope requests per platform | [CURRENT] | See integrations doc for exact scopes |
| Sync | Order sync (seller channels) | [CURRENT] | |
| Webhooks | Marketplace-side webhooks (e.g. Shopify order webhooks) | [FUTURE] | Not confirmed — current sync appears to be pull-based (`syncSellerChannel()`), not webhook-driven |
| Rate limits | Etsy research quota tracking | [FUTURE] | The 5 req/sec, 5,000/day constraint is documented (root `CLAUDE.md`) but not confirmed to have any UI-visible tracking/alerting |
| Health | Connector health/status | [CURRENT] | `ConnectorStatus`/`SellerChannel.status` enums |
| Data freshness | Last-synced visibility | [CURRENT] (data), [VERIFY] (UI) | See Section 7 |
| Normalized representation | Marketplace-neutral commerce entities | [FUTURE], deliberately [DEFERRED] | Per Decision 3, not to be designed until the second marketplace is selected |
| Adapter capability differences | Per-platform capability gaps (e.g. "this marketplace has no favorites concept") | [DECISION REQUIRED] | Explicitly named as an open question in [architecture/marketplace.md](../architecture/marketplace.md) |

---

## 23. SECURITY / PRIVACY / COMPLIANCE

Full depth in [security/security-model.md](../security/security-model.md);
mapped here at the surface level.

| Module | Feature/capability | Status | Notes |
|---|---|---|---|
| Authentication | Credentials-based login (JWT) | [CURRENT] | |
| Authorization | Org-scoped access (`organizationId` filtering) | [CURRENT] | Consistent pattern across sampled routes |
| RBAC | Flat `Membership.role` | [CURRENT] | |
| RBAC | Real `Role`/`Permission` system | [PLANNED] | Locked (Decision 1), not implemented |
| Organization isolation | Cross-org data isolation | [CURRENT] | |
| Client isolation | Agency employee scoped to specific clients | [FUTURE] | Explicitly named as the single highest-risk area for a future data-isolation bug — see [security/security-model.md](../security/security-model.md) |
| Student isolation | Institute staff scoped to specific cohorts | [FUTURE] | Same risk category as above |
| Secrets | Encrypted credential storage | [CURRENT] | AES-256-GCM |
| OAuth tokens | Signed, time-limited connect tokens | [CURRENT] | `store-connect-token.ts` |
| Encryption | At-rest encryption for all credential-bearing tables | [CURRENT] | |
| Audit logs | Any admin/user action history | [FUTURE] | See [architecture/rbac.md](../architecture/rbac.md) |
| Device/session policy | Session/device management | [FUTURE] | |
| Data deletion | Account/org data deletion (GDPR "right to erasure") | [FUTURE] | Not confirmed built |
| Privacy | Privacy Policy | [FUTURE] | Real gap — `mailto:` placeholder today |
| GDPR | GDPR compliance tooling (consent, data export/deletion) | [FUTURE] | Not confirmed built |
| Consent | Cookie/tracking consent | [VERIFY]/[FUTURE] | Not confirmed |
| Security events | Security event logging/alerting (e.g. failed-login tracking) | [FUTURE] | Not confirmed |
| Account recovery | Beyond password reset | [FUTURE] | |

---

## 24. SYSTEM / DEVELOPER EXPERIENCE

| Module | Feature/capability | Status | Notes |
|---|---|---|---|
| Jobs | Background job model | [CURRENT] | `Job`, BullMQ |
| Jobs | Job list UI | [CURRENT] | `/jobs` |
| Queues | BullMQ + Redis | [CURRENT] | `src/lib/queue.ts`, `src/workers/index.ts` |
| Scheduled tasks | Cron-based scheduling | [CURRENT] | `SearchConfig.scheduleCron`, `ShopWatch` repeatable jobs |
| Retries | Job retry logic | [VERIFY] | BullMQ supports this natively; exact retry config not inspected in this pass |
| Failed jobs | Failed-job visibility | [CURRENT] (data), [VERIFY] (UI) | `Job.status = FAILED`, `errorMessage` field exist; admin-facing failed-job dashboard not confirmed |
| Sync status | Seller-channel sync status | [CURRENT] | `lastSyncedAt`/`lastSyncError` |
| Connector health | Research/seller connector status | [CURRENT] | `ConnectorStatus` enum |
| Logs | Application logging | [VERIFY] | Standard Next.js/Node logging presumably exists; no dedicated log-viewing UI confirmed |
| Monitoring | APM/error monitoring | [VERIFY]/[FUTURE] | No monitoring SDK dependency found in `package.json` |
| Feature flags | Feature flag system | [FUTURE] | Not found |
| Configuration | Admin-editable config | [CURRENT] | `AppSetting` |
| Environment management | Per-environment config (staging/production) | [CURRENT] | Coolify-managed, documented in root `CLAUDE.md` |
| API health | Health check endpoint | [CURRENT] | `src/app/api/health` |
| MCP / external AI agent access | SellerSalt Agent Gateway (auth → entitlement → permissions → scope → tool permissions → rate limits → usage tracking → audit logging) | [PLANNED] | **[LOCKED — Decision 4, 2026-08-15]** as a required, first-class capability; nothing implemented. Full detail: [architecture/mcp.md](../architecture/mcp.md) |
| MCP | Tool catalog (Research/Shop Intelligence/Optimization/Reporting categories) | [FUTURE] (Research category could be built against real data today), [FUTURE] (blocked on unbuilt intelligence work) for the rest | Mirrors the same CURRENT/FUTURE split already mapped for the internal AI Assistant in [ai/assistant.md](../ai/assistant.md) — see [architecture/mcp.md §Candidate tool catalog](../architecture/mcp.md#candidate-tool-catalog) |
| MCP | Agent credentials (issue/revoke/scope) | [FUTURE] | No credential model exists in the schema; see [architecture/mcp.md §Credential / token lifecycle](../architecture/mcp.md#credential--token-lifecycle) |
| MCP | Entitlement (`mcp_access` capability) | [PLANNED] (named, locked), [FUTURE] (schema) | **[LOCKED]**: premium-plan-only, cheaper plans excluded initially, never a hardcoded plan-key check. Schema shape [DECISION REQUIRED] — see [Billing & Subscriptions §16](#16-billing--subscriptions) |
| Future API | Non-MCP developer/system API (REST/GraphQL) | [FUTURE] | Not scoped by Decision 4; named only to avoid conflating "build an API" with "build MCP" — see [architecture/mcp.md §Distinguishing the three AI/agent surfaces](../architecture/mcp.md#distinguishing-the-three-aiagent-surfaces) |

---

## AFFILIATE PROGRAM

**Current state: nothing.** **[LOCKED — Decision 5, 2026-08-15]**
SellerSalt must have a first-class Affiliate Program — full architecture in
[architecture/affiliate.md](../architecture/affiliate.md); this section
is the surface-map digest, following this document's own CURRENT/
PLANNED/FUTURE/DECISION REQUIRED convention. Verified in this pass: no
`Affiliate`-related model anywhere in `prisma/schema.prisma`, no
attribution/referral handling in the signup or checkout routes. The
only existing "affiliate" references in the codebase
(`shopify_affiliate_url`, two footer `mailto:` links on the marketing
homepage) are unrelated to a SellerSalt-run program — see
[architecture/affiliate.md](../architecture/affiliate.md) "Current
state."

**Core architectural principle, restated from Decision 5**: Affiliate is
not a fourth account type. A `User` can hold an Individual/Agency/
Institute Organization Membership **and** an Affiliate relationship
simultaneously, or be a pure Affiliate with no customer Organization at
all. Never `User.type = AFFILIATE`, never an `Organization.kind` value
for it.

| Module | Feature/capability | Status | Notes |
|---|---|---|---|
| Program loop | Application/enrollment, approval, referral link/code, attribution, commission event, payout | [PLANNED] (shape locked), [DECISION REQUIRED] (every business rule) | See [architecture/affiliate.md §The affiliate product loop](../architecture/affiliate.md#the-affiliate-product-loop) |
| Commission engine | Percentage/fixed, first-payment/recurring, fixed-duration/lifetime, tiers, custom agreements | [FUTURE] (all rule types), [LOCKED] (must be rule-based, never hardcoded) | See [architecture/affiliate.md §Commission engine](../architecture/affiliate.md#commission-engine) |
| Ledger | Append-only `AffiliateLedgerEntry`-style event log; pending/approved/payable/paid computed from entries | [FUTURE], [LOCKED] (must not be a mutable balance field) | See [architecture/affiliate.md §Affiliate ledger](../architecture/affiliate.md#affiliate-ledger-event-sourced-not-a-balance-field) |
| Attribution | Referral URL/slug/code, attribution cookie, signup/subscription attribution | [FUTURE] | Every rule (window, first/last-touch, override, self-referral prevention, etc.) is [DECISION REQUIRED] — see [architecture/affiliate.md §Attribution architecture](../architecture/affiliate.md#attribution-architecture) |
| Payouts | Pending/approved/payable balance, payout history/method/schedule/threshold, failed payouts, reconciliation | [FUTURE] | Provider not chosen — see [architecture/affiliate.md §Payouts](../architecture/affiliate.md#payouts) |
| Admin console | Overview, Applications, Active/Suspended Affiliates, Affiliate Detail, Referral Activity, Conversions, Commission Ledger, Commission Rules, Tiers, Payouts, Payout Failures, Fraud/Risk, Program Settings, Terms | [FUTURE] | NOW/LATER/FUTURE classification per section — see [architecture/affiliate.md §Admin Affiliate Console](../architecture/affiliate.md#admin-affiliate-console) |
| Affiliate dashboard | Overview, referral link/code, performance metrics, commission (earned/pending/approved/payable), payout history, marketing assets, payout settings, terms, support | [FUTURE] | Intended to feel like a first-class SellerSalt workspace — see [architecture/affiliate.md §Affiliate Dashboard](../architecture/affiliate.md#affiliate-dashboard) |
| Marketing Center | Screenshots, banners, social assets, email templates, promotional copy, QR codes, campaign assets | [FUTURE] | Plausibly built on the same future Content/CMS infrastructure ([§20](#20-content--cms)) rather than a separate one |
| Affiliate vs. Partner vs. Agency vs. Institute | Affiliate = commission-based promotion relationship; Partner = broader ecosystem/business relationship; both independent of each other and of Agency/Institute (which use the product for their own operations); a Partner may also be an Affiliate; neither is an account type | [LOCKED] (the distinction and independence), [FUTURE] (Partner's own commercial terms/tiers) | See [architecture/affiliate.md §Affiliate vs. Partner vs. Agency vs. Institute](../architecture/affiliate.md#affiliate-vs-partner-vs-agency-vs-institute) |
| Billing integration | Commission Events reference billing facts (`Subscription`/webhook state), never re-derive them | [LOCKED] (principle), [FUTURE] (implementation) | See [Billing & Subscriptions §16](#16-billing--subscriptions) and [architecture/billing.md](../architecture/billing.md) |
| Organization interaction | Attribution resolves to the correct billable entity (Individual/Agency/Institute Organization), not necessarily the clicking individual | [DECISION REQUIRED] for Agency/Institute edge cases | See [architecture/affiliate.md §Organization interaction](../architecture/affiliate.md#organization-interaction) |
| Security/fraud | Self-referral, duplicate accounts, fake signups, chargebacks, cookie manipulation, referral-code abuse, manual manipulation | [FUTURE] (all detection), risk categories only | See [security/security-model.md](../security/security-model.md) "Affiliate Program security / fraud" |
| MCP/AI interaction | Affiliate status and `mcp_access` are independent capabilities; affiliate performance data could eventually be an AI/MCP tool, same auth model as everything else | [LOCKED] (independence), [FUTURE] (any tool) | See [architecture/affiliate.md §MCP / AI interaction](../architecture/affiliate.md#mcp--ai-interaction) |
| Public surface | `/affiliate`, `/affiliate/apply`, `/affiliate/login` | [FUTURE] | Must not publish commission-rate claims before the engine exists, per [seo/geo.md](../seo/geo.md) |
| IA placement | Not in main product nav for every user; capability/context-gated. Recommended hybrid: conditional Account-menu entry (org-member affiliates) + dedicated minimal shell (pure affiliates with no Organization) | [DECISION REQUIRED] | See [design/information-architecture-v1.md §Affiliate IA](../design/information-architecture-v1.md#affiliate-ia) and [architecture/affiliate.md §Information architecture placement](../architecture/affiliate.md#information-architecture-placement) |

---

## PRODUCT GAPS & OPPORTUNITIES

Capabilities not explicitly named in the brief's structure but that
would materially increase SellerSalt's value as an ecommerce
intelligence platform. None of these are added to any roadmap by
appearing here — they are candidates only.

| Idea | Area | Why it matters | Classification |
|---|---|---|---|
| Client-facing portal (scoped login for Agency clients / Institute students) | Agency, Institute | Resolves the open "does a client/student get a login" question in [product/personas.md](personas.md) with a concrete, high-value answer; directly enables self-service report viewing | [RECOMMENDED] |
| Cohort-relative benchmarking (compare a student's shop against their cohort's median, not just the open market) | Institute | A genuinely differentiated use of existing scoring primitives (`competition-scoring.ts`) that no generic research tool offers | [RECOMMENDED] |
| White-label/branded reports for Agencies | Agency, Reporting | Directly increases the value of the already-locked "before/after proof reports" capability — an agency reselling SellerSalt-branded reports to their own clients is a weaker pitch than their own branding | [RECOMMENDED] |
| Etsy quota visibility/allocation for high-volume orgs (Agencies especially) | Marketplace Platform | The shared 5,000 req/day platform quota (root `CLAUDE.md`) is a real constraint that Agencies managing many client shops will hit first; visibility avoids silent failures | [RECOMMENDED] |
| Collections (custom groupings of Prospects beyond binary Favorites) | Research & Discovery | Natural, low-cost extension of an existing primitive (`Prospect.isFavorite` → a many-to-many grouping table) | [RECOMMENDED] |
| Side-by-side shop/product comparison view | Research & Discovery, Competitor Intelligence | Named as a gap in multiple sections independently; a comparison view is a UI feature over already-existing data, not new data collection | [RECOMMENDED] |
| Public free tool (e.g. a single-shop "health check" lead magnet) | Marketing | Low-cost top-of-funnel acquisition reusing existing "Spy on Competitor" cold-lookup capability | [OPTIONAL] |
| In-app notification center (unifying scheduled-search alerts + future shop/competitor alerts) | Notifications | Currently every alert is email-only; a unified in-app inbox is foundational for every future alert type in Section 14 | [RECOMMENDED] |
| Bulk/multi-client research for Agencies | Agency | Named in Section 4's gap analysis; meaningfully reduces per-client manual effort at scale | [RECOMMENDED] |
| Employee workload dashboard (Agency) / Staff cohort-load view (Institute) | Agency, Institute | Operational visibility, not core intelligence — useful but not differentiating | [OPTIONAL] |
| Certificate/completion issuance for Institute students | Institute | Increases the pitch to institutes specifically (a tangible outcome for their own students/marketing) but is tangential to core commerce intelligence | [OPTIONAL] |
| AI-generated report narration (auto-written summary text inside a PDF report) | Reporting, AI Commerce Copilot | High leverage once both Reporting and the AI assistant exist, but stacks two unbuilt systems — premature until either lands independently | [EXPERIMENT] |
| Predictive forecasting (sales/trend forecasting, not just descriptive trends) | Trends & Market Intelligence | Real value if accurate, but a meaningfully harder data-science problem than anything else in this list; risk of shipping misleading predictions if done poorly | [EXPERIMENT] |
| Marketplace-side webhooks (real-time order sync instead of pull-based sync) | Marketplace Platform | Would improve data freshness for Shop Intelligence, but adds real infrastructure complexity (webhook registration/verification per platform) for a benefit that's not yet blocking anything, since seller channels aren't customer-facing yet | [EXPERIMENT] |
| Chrome extension (already named in root `CLAUDE.md` as "not built yet") | Research & Discovery | Real potential (in-context research while browsing Etsy) but a genuinely separate product surface (browser extension packaging/distribution) from everything else in this document | [EXPERIMENT] |
| Reseller/affiliate program for Agencies | Agency, Billing | Monetization idea with no current foundation (no referral/commission tracking exists anywhere) | [NOT RECOMMENDED] — premature before the core Agency product itself exists |
| Cross-listing push/sync (already schema-foundation-only) | Marketplace Platform | Real, already-scoped work (per root `CLAUDE.md`), but distinct from this document's *research/intelligence* focus — belongs to a separate cross-listing initiative, not bundled into this surface map's priorities | [NOT RECOMMENDED for this initiative specifically] — not a rejection of the feature, a scope boundary |

---

## CORE PRODUCT LOOPS

The recurring interaction loops that define how value gets delivered.
Each is marked CURRENT (the loop is real and complete today) or PLANNED
(some stages exist, the loop as a whole is not complete).

| Loop | Stages | Status | Notes |
|---|---|---|---|
| **Research loop** | Research → Discover → Save → Analyze → Act → Monitor | [CURRENT] (Research→Discover→Save→Analyze→Monitor), [FUTURE] (Act) | Discover=Prospects search, Save=Favorites, Analyze=competition scoring, Monitor=ShopWatch. "Act" has no concrete in-product action today (a user acts *outside* SellerSalt, e.g. by launching a product) — there is no in-app "act on this prospect" workflow |
| **Shop optimization loop** | Connect Shop → Scan → Diagnose → Optimize → Measure → Repeat | [CURRENT] (Connect), [FUTURE] (Scan/Diagnose/Optimize/Measure/Repeat) | Connect exists (admin-only) via OAuth; nothing past that stage exists — see [Section 7](#7-shop-intelligence) |
| **Competitor loop** | Competitor → Track → Compare → Learn → Act → Monitor | [CURRENT] (Competitor→Track→Monitor), [FUTURE] (Compare→Learn→Act as prescriptive steps) | Tracking and monitoring are real (`ShopWatch`); "Compare"/"Learn"/"Act" as *guided* steps don't exist — a user today has to do this comparison mentally from raw scores/data |
| **AI query loop** | AI Query → Intelligence → Recommendation → Action → Outcome | [FUTURE] (entirely) | No stage of this loop exists yet — see [Section 13](#13-ai-commerce-copilot) |
| **Agency client loop** | Agency → Onboard Client → Connect Shop → Optimize → Report → Retain Client | [FUTURE] (entirely, though "Connect Shop" reuses the [CURRENT] OAuth mechanism) | Every Agency-specific stage (Onboard Client, Optimize workflow, Report) requires the [PLANNED] Agency domain model first |
| **Institute student loop** | Institute → Enroll Student → Connect Shop → Learn → Execute → Track Progress | [FUTURE] (entirely, same caveat as above) | "Learn" implies curriculum content that isn't scoped by Decision 1 at all — the least-defined stage of any loop in this document |

**Observation**: every CURRENT loop today is a variant of the same
underlying pattern — *discover/track something external, observe it
over time, let the user interpret it*. None of the CURRENT loops close
with a concrete in-product action or outcome measurement. This is the
same gap independently visible in Sections 7–10 and 13 (no prescriptive
recommendations, no "actions" stage anywhere) — worth treating as one
gap, not several unrelated ones, when prioritizing future work.

---

## PRIMARY NAVIGATION REQUIREMENTS

Not a navigation design — the areas that must be *reachable* per user
type, so navigation design (a future task) has a complete brief. See
[design/information-architecture.md](../design/information-architecture.md)
and [design/navigation.md](../design/navigation.md) for the current
implementation and open IA questions this expands on.

| User type | Must reach | Status of underlying area |
|---|---|---|
| **Individual** | Research (Prospects, Spy, Trends, Dropped shops, Favorites) | [CURRENT] |
| | Connectors, Jobs | [CURRENT] |
| | Settings (profile, billing, team) | [CURRENT] |
| | Own-store connections + Analytics | [CURRENT] mechanism, currently admin-gated — becomes reachable if/when made customer-facing |
| | Shop/Product/Listing/Competitor Intelligence, Reports, AI assistant | [FUTURE] — reachable once built |
| **Agency** | Everything Individual reaches, in the context of "my own agency org" | Same as above |
| | Client management, Client Shops | [PLANNED] |
| | Employee management | [PLANNED] |
| | Agency reporting (proof reports, PDF, share links) | [PLANNED] |
| | Agency settings/billing | [FUTURE] |
| **Institute** | Everything Individual reaches, in the context of "my own institute org" | Same as above |
| | Staff, Cohorts, Students, Student Shops | [PLANNED] |
| | Progress tracking | [PLANNED] (named), [DECISION REQUIRED] (definition) |
| | Institute settings/billing | [FUTURE] |
| **Super Admin** | Everything in [Section 17](#17-admin-platform) | Mostly [CURRENT], gaps noted there |
| | Sub-admin/department views (once they exist) | [FUTURE] |
| **Sub-admin** | Only their department's scoped tools (per [Section 18](#18-sub-admin--department-system)) | [FUTURE] — entire system unbuilt |

**Cross-cutting requirement**: any future navigation design must account
for a user potentially belonging to more than one context in the
future (e.g. an Agency employee who is also, separately, an Individual
Pro subscriber) — today's session model assumes exactly one org per
session (see [architecture/organizations.md](../architecture/organizations.md)),
which is a real constraint on any multi-context navigation design.

---

## SCREEN INVENTORY

High-level required screens. Status mirrors the area each screen
belongs to — a screen is never marked CURRENT unless the underlying
route was verified in the repository.

| Screen | Product area | User type | Status | Primary purpose | Key actions | Important data | Permissions | Responsive importance |
|---|---|---|---|---|---|---|---|---|
| Homepage | Marketing | All | [CURRENT] | Convert visitor to signup | Click "Get started" | Live pricing | Public | High |
| Checkout/Pricing | Marketing, Billing | All | [CURRENT] | Convert visitor to paying org | Select plan, pay | Live `Package` data | Public | High |
| Login | Auth | All | [CURRENT] | Authenticate | Submit credentials | — | Public | High |
| Forgot/Reset password | Auth | All | [CURRENT] | Recover access | Submit new password | — | Token-gated | High |
| Accept invite | Auth | All | [CURRENT] | Join an org | Accept, set password | `Invite` | Token-gated | High |
| Dashboard / Overview | Individual | Individual, Agency, Institute (in their own-org context) | [CURRENT] | Landing page post-login | Navigate to modules | Summary of recent activity | Org member | High |
| Prospects | Research | Individual+ | [CURRENT] | Run/view research searches | Search, filter, favorite, export | `Prospect` | Org member | High |
| Spy on Competitor | Research | Individual+ | [CURRENT] | Look up a specific shop | Search by name, track | Shop stats | Org member | High |
| Tracked shops | Research | Individual+ | [CURRENT] | View tracked-shop trend graphs | View history | `ShopSnapshot` | Org member | Medium |
| Trends | Research | Individual+ | [CURRENT] | Surface trending products | View, export | Derived from `Prospect` | Org member | Medium |
| Dropped shops | Research | Individual+ | [CURRENT] | Surface inactive shops | View, export | Derived from `Prospect` | Org member | Medium |
| Favorites | Research | Individual+ | [CURRENT] | View saved prospects | Un-favorite | `Prospect.isFavorite` | Org member | Medium |
| Connectors | Workspace | Individual+ | [CURRENT] | Manage bring-your-own-key connectors | Add/remove | `Connector` | Org member | Low |
| Jobs | Workspace | Individual+ | [CURRENT] | View background job history | View status | `Job` | Org member | Low |
| Settings → Profile | Account | All | [CURRENT] | Manage own profile | Edit name/password | `User` | Self | High |
| Settings → Billing | Billing | Org owner/admin | [CURRENT] | Manage subscription | Checkout, cancel, coupon | `Subscription`, `Package` | Owner/Admin | High |
| Settings → Team | Org | Org owner/admin | [CURRENT] | Manage members | Invite, remove | `Membership`, `Invite` | Owner/Admin | Medium |
| Settings → Connected stores | Seller channels | Admin-only today | [CURRENT] | Manage own-store OAuth connections | Connect/disconnect | `SellerChannel` | Admin-gated | Medium |
| Analytics | Seller channels | Admin-only today | [CURRENT] | View own-store analytics | View per-currency revenue | `SellerOrder` | Admin-gated | High |
| Admin console | Platform admin | Super Admin | [CURRENT] | Manage platform | CRUD packages/orgs/coupons/providers/connectors/email | Multiple | `ADMIN_EMAILS` allowlist | Low |
| Agency dashboard | Agency | Agency owner/employee | [FUTURE] | Agency landing page | Navigate to clients/employees | TBD | TBD | High |
| Client list/detail | Agency | Agency owner/employee | [PLANNED] | Manage clients and their shops | Add client, view shop health | New `Client` entity | Scoped `Permission` | High |
| Employee management | Agency | Agency owner | [PLANNED] | Manage employees and their access | Invite, assign role/permissions | `Membership`, `Role` | Owner | Medium |
| Agency reports | Agency, Reporting | Agency owner/employee | [PLANNED] (named), [FUTURE] (built) | Generate/view client proof reports | Generate PDF, share link | TBD `Report` entity | Scoped | High |
| Institute dashboard | Institute | Institute owner/staff | [FUTURE] | Institute landing page | Navigate to cohorts/students | TBD | TBD | High |
| Cohort list/detail | Institute | Institute owner/staff | [PLANNED] | Manage cohorts and enrolled students | Create cohort, enroll students | New `Cohort` entity | Scoped `Permission` | High |
| Student list/detail | Institute | Institute owner/staff | [PLANNED] | Manage students and their shops/progress | Enroll, view progress | New `Student` entity | Scoped | High |
| Shop Intelligence detail | Shop Intelligence | Individual+ (once customer-facing) | [FUTURE] | View own-shop health/recommendations | View score, act on recommendation | TBD | Owner of that shop | High |
| Listing/SEO audit | Listing/SEO Intelligence | Individual+ | [FUTURE] | Audit a specific listing | View issues, apply fix | TBD | Owner of that shop | High |
| AI assistant | AI Commerce Copilot | Individual+ | [FUTURE] | Natural-language query interface | Ask a question, view result cards | Wraps existing intelligence data | Org member, tool-scoped | High |
| Notification center | Notifications | All | [FUTURE] | Unified alert inbox | Read/dismiss | New notification model | Self | Medium |
| Sub-admin dashboards (per department) | Sub-admin system | Sub-admin | [FUTURE] | Department-scoped platform tools | Varies by department | Varies | Department-scoped `Permission` | Low |
| Homepage/content editor | Content/CMS | Content sub-admin | [FUTURE] | Edit marketing content | Edit/publish pages | New content model | Content-scoped | Low |
| Email template editor | Communications | Content/Ops sub-admin | [FUTURE] | Edit transactional email templates | Edit, test-send, activate | New template model | Content/Ops-scoped | Low |
| Public report view | Marketing, Reporting | External viewer (no login) | [FUTURE] | View a shared report | View, possibly download | Report snapshot | Link-token-gated | High |
| Settings → Developer & Integrations → AI/MCP | System/Developer, MCP | Org owner/admin (Individual+) | [FUTURE] | Manage external AI agent access | Create/revoke credential, set tool/scope permissions, view usage | New agent-credential entity | Owner/Admin, `mcp_access`-entitled orgs only | Medium |
| AI & MCP (public) | Marketing | Prospective + existing customers | [FUTURE] | Explain and drive adoption of MCP access | Read docs, view example workflows | Live capability/plan data | Public | Medium |
| Affiliate Dashboard | Affiliate Program | Any `User` with an approved Affiliate relationship (org membership optional) | [FUTURE] | View performance, manage referral link, track commission/payouts | Copy link, view stats, view/adjust payout settings | New `Affiliate`/`AffiliateLedgerEntry` entities | Self (own data only) | High |
| Admin Affiliate Console | Affiliate Program, Admin | Super Admin / Affiliate-scoped sub-admin | [FUTURE] | Review applications, manage affiliates, run payouts, set program rules | Approve/suspend, adjust ledger, run payout batch, edit Commission Rules | Program-wide affiliate data | Admin (dept-scoped once sub-admin exists) | Low |
| Affiliate program (public + apply) | Affiliate Program, Marketing | Prospective affiliates | [FUTURE] | Explain program, collect applications | Submit application | New `AffiliateApplication` entity | Public | Medium |

This inventory is not exhaustive of every future edge-case screen
(e.g. individual settings sub-pages, empty states, error pages) — it is
the set of screens needed to reason about scope before navigation and
visual design begin, per this document's stated purpose.

---

## DESIGN DEPENDENCIES

Product decisions that **must** be resolved before UI design begins in
each affected area — resolving these is a prerequisite, not something
design work can route around.

| Dependency | Blocks | Current status |
|---|---|---|
| `Organization.kind` discriminator (Individual/Agency/Institute) | Any screen that needs to know which context it's rendering (dashboard, nav, settings) | [DECISION REQUIRED] — residual under Decision 1 |
| `Role`/`Permission` schema | Any screen with conditional actions based on employee/staff scope (client assignment, cohort assignment) | [DECISION REQUIRED] — residual under Decision 1 |
| `Client`/`Student` schema (own login or not) | Client-facing portal, student-facing portal, any screen showing "who can see this" | [DECISION REQUIRED] — residual under Decision 1 |
| `Seat` allocation mechanics | Any seat-management UI (Institute cohorts, potentially Agency employees) | [DECISION REQUIRED] — residual under Decision 1 |
| Semantic design token spec (beyond the three locked raw colors) | Every screen — component states, surfaces, borders can't be styled consistently without this | [DECISION REQUIRED] — residual under Decision 2 |
| Dark-mode removal plan | Any screen currently rendering with `dark:` utility classes | [DECISION REQUIRED] — residual under Decision 2 |
| Plan limits / `checkLimit()` extension for new resources (seats, employees, students) | Any screen showing usage/limit indicators for Agency/Institute | [DECISION REQUIRED] |
| Navigation context-switching model (multi-org, client/student switcher) | Sidebar/nav design for Agency/Institute | [DECISION REQUIRED] — open IA question, see [design/information-architecture.md](../design/information-architecture.md) |
| Marketplace capability differences (what a second marketplace can/can't expose) | Any screen currently assuming Etsy-only fields (favorites, sell-through) once a second marketplace exists | [DEFERRED] until second marketplace selected — not blocking today's Etsy-only screens |
| Data freshness surfacing convention | Any screen showing synced data (Analytics, Shop Intelligence) | [DECISION REQUIRED] |
| AI tool permission model | AI assistant UI (which tools show for which plan/role) | [DECISION REQUIRED], depends on `Permission` schema above |
| Reporting data model (shared vs. per-context) | Any report-viewing/generation screen | [DECISION REQUIRED] |
| Billing interval + plan-change UI states | Billing settings screen redesign, Agency/Institute seat-based pricing screens | [DECISION REQUIRED] |
| Capability/entitlement schema on `Package` (`mcp_access` and siblings) | Settings → Developer & Integrations → AI/MCP screen (eligibility state can't render without this) | [DECISION REQUIRED] — need is [LOCKED] (Decision 4), schema shape is not |
| Agent-credential model (token/API-key shape, tool + Client/Cohort/Shop scope grants) | Settings → Developer & Integrations → AI/MCP screen (credential list/create/revoke UI) | [DECISION REQUIRED] — see [architecture/mcp.md §Credential / token lifecycle](../architecture/mcp.md#credential--token-lifecycle) |
| Commission-rule/ledger schema, attribution rules, payout provider | Affiliate Dashboard, Admin Affiliate Console (neither can render real data without these) | [DECISION REQUIRED] — need is [LOCKED] (Decision 5), every rule is not — see [architecture/affiliate.md §Open questions](../architecture/affiliate.md#open-questions-decision-required) |
| Affiliate IA placement (Account-menu entry vs. dedicated shell) | Affiliate Dashboard's navigation/entry point | [DECISION REQUIRED] — see [architecture/affiliate.md §Information architecture placement](../architecture/affiliate.md#information-architecture-placement) |

---

## RECOMMENDED DESIGN ORDER

The sequence in which frontend design work should proceed, given the
dependencies above. This is a sequencing recommendation, not a
commitment to build every stage.

1. **Design token system first** (Decision 2's semantic tokens,
   component states) — every subsequent screen depends on this
   existing; doing it first avoids re-skinning work later. Blocked only
   on the [DECISION REQUIRED] token spec itself, which should be
   resolved before, not during, this stage.
2. **Redesign the existing CURRENT Individual surface** (Sections 3 and
   6) using the new token system — this is the highest-traffic,
   already-shipped surface, and gives the new design system its first
   real-world proving ground before it's extended to unbuilt areas.
3. **Resolve the `Organization.kind` and navigation context-switching
   decisions** (Design Dependencies above) — needed before any
   Agency/Institute screen can be designed, since every one of them
   needs to know "whose context am I in."
4. **Design Organization/Team Management screens for the new `Role`/
   `Permission`/`Seat` primitives** (Section 15) — this is shared
   infrastructure both Agency and Institute screens depend on; building
   it once, generically, avoids designing it twice.
5. **Design the Agency experience** (Section 4) — of the two new domain
   models, Agency has fewer undefined structural concepts (no `Cohort`
   analog) and reuses more of the existing research/intelligence
   surface, making it the lower-risk of the two to design first.
6. **Design the Institute experience** (Section 5) — building on
   patterns proven in step 5, resolving the Institute-specific `Cohort`
   and progress-definition questions along the way.
7. **Design Reporting** (Section 12) — needed by Agency (already
   designed in step 5) and increasingly valuable once Institute exists
   too; deferring until after both account types are designed avoids
   building a reporting system around only one context's needs.
8. **Design Shop/Product/Listing Intelligence** (Sections 7–9) — the
   deepest, most novel intelligence work; sequencing it after the
   account-model work means it can be designed once and made available
   to Individual, Agency, and Institute contexts simultaneously rather
   than bolted onto Individual first and retrofitted.
9. **Design the AI Commerce Copilot** (Section 13) — deliberately last
   among the major systems, since its highest-value tools (Shop/
   Product/SEO tools) depend on step 8 existing; designing it earlier
   would either under-deliver on the brief's example queries or require
   redesigning tool cards once real intelligence data exists.
10. **Design Sub-Admin/Department system and Content/CMS** (Sections
    18, 20) — lowest end-user-facing urgency; can proceed in parallel
    with steps 5–9 once resourcing allows, since they don't block any
    customer-facing screen.

Marketing/SEO surface (Section 1, 21) can proceed in parallel with any
of the above once Decision 2's token system exists (step 1) — it has no
hard dependency on the Agency/Institute/AI work, only on the design
system itself and on not overstating what's built (per
[seo/geo.md](../seo/geo.md)).
