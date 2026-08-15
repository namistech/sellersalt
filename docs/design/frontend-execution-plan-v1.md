Status: Draft
Owner: [ASSUMPTION] Founder (Aliyan)
Last Updated: 2026-08-15
Decision State: This is an execution/sequencing plan, not a new product decision. It builds directly on the approved foundation documents and does not reopen any of their conclusions. Where this plan makes a new scoping call of its own (e.g. mock-data conventions, service-boundary rules), it is marked **[PLAN DECISION]**. Decision 4 (2026-08-15, MCP/external AI agent access — [architecture/mcp.md](../architecture/mcp.md)) added a Settings category (Section 19) and a real-architecture prerequisite (below) ahead of Wave 10; it does not change wave numbering or sequencing.

# SellerSalt — Frontend Execution Plan v1

## Purpose

This document sequences the build of a **fully navigable, polished
SellerSalt frontend product simulator** — every product area, every
major screen, real navigation, realistic mock data, and every UI state
(loading/empty/error/success/permission) — so the product can be
reviewed and validated visually **before** the remaining backend systems
(Agency/Institute, Shop Intelligence, Optimization, AI, Reporting) are
built. It does not implement anything. It is the plan a coding agent
executes against, one wave at a time.

Builds directly on:
- [MASTER_BLUEPRINT.md](../MASTER_BLUEPRINT.md) — locked decisions
- [product/complete-product-surface.md](../product/complete-product-surface.md) —
  the full CURRENT/PLANNED/FUTURE capability inventory and Screen
  Inventory this plan sequences
- [design/information-architecture-v1.md](information-architecture-v1.md) —
  the structural/navigational model
- [design/ia-journey-validation.md](ia-journey-validation.md) — specific
  gaps this plan explicitly builds for (the client-initiated connect
  flow, the AI-unavailable state, the Sync-vs-Scan first-scan moment)
- [design/design-system-v1.md](design-system-v1.md) — every token,
  component spec, and pattern this plan sequences into a build order

**Constraint restated**: this document plans work. It does not perform
it — no application code, Prisma, database, migrations, dependencies,
deployment, or git history are touched by writing this plan.

---

## 1. IMPLEMENTATION STRATEGY

```
Foundation → App shell → Navigation → Core components → Shared product patterns
  → Individual → Connected-shop → Agency → Institute → AI → Reporting
  → Admin → Public website → Responsive/mobile refinement → Polish
```

**Why this order, not alphabetical or feature-priority order:**

1. **Foundation before anything visual.** Tokens, the mock-data
   architecture, and the service-boundary pattern ([Sections 7](#7-mock-data-architecture),
   [27](#27-backend-integration-boundary)) are consumed by *every*
   subsequent screen. Building a screen before these exist means
   rebuilding it once they land.
2. **App shell + Navigation before any screen.** Every screen renders
   *inside* the shell. Building screens against a placeholder shell
   produces throwaway chrome work multiplied across every wave.
3. **Core components before shared product patterns**, which are
   composites of core components — this is literally the dependency
   direction defined in [design-system-v1.md §28](design-system-v1.md#28-component-architecture).
   Building out of order means patterns get rebuilt when their
   primitives change underneath them.
4. **Individual before Connected-shop.** Individual/DISCOVER is the
   product's one already-shipped, most-defined surface — building it
   first proves the new design system against real, existing precedent
   with the least ambiguity, exactly as already recommended in
   [complete-product-surface.md §Recommended Design Order](../product/complete-product-surface.md#recommended-design-order)
   and [design-system-v1.md](design-system-v1.md)'s own closing
   recommendation.
5. **Connected-shop before Agency/Institute.** Agency and Institute's
   core value (diagnose/optimize a client's/student's shop) *is* the
   Connected-shop workspace, performed on someone else's behalf. Build
   it once here; Agency/Institute mostly reuse it rather than
   rebuilding it.
6. **Agency before Institute.** Per the IA's own reasoning
   ([information-architecture-v1.md](information-architecture-v1.md)):
   Agency has no `Cohort`-equivalent structural novelty, making it the
   lower-risk of the two to prove the MANAGE-tree pattern
   (Clients/Employees) that Institute then follows
   (Cohorts/Staff/Students).
7. **AI after Agency/Institute.** AI's highest-value tools (shop
   analysis, opportunity-finding) need real Intelligence/Shop screens to
   render results into. Building AI's shell earlier is fine (its entry
   points are added incrementally), but its *result rendering* is
   cheapest once the components it reuses already exist.
8. **Reporting after AI.** Reports pull from Optimization/Outcome data
   (Connected-shop wave) and Agency/Institute contexts — both need to
   exist first for report mock data to be meaningful.
9. **Admin after customer-facing waves.** Admin is architecturally
   separate (its own tree, per the IA) and lower urgency for a
   simulator whose primary purpose is proving the *customer* experience
   — but its Organizations view is far more meaningful once customer
   mock orgs already exist to populate it.
10. **Public website late, not first.** It has no dependency on, and
    blocks nothing in, the app — but content/SEO work is safer once the
    product's real capability set is settled, avoiding the exact
    overstatement risk flagged in [seo/geo.md](../seo/geo.md).
11. **Responsive/mobile refinement after all desktop waves.** Per
    [design-system-v1.md §25](design-system-v1.md#25-responsive-system),
    mobile needs component-*specific* adaptations. Adapting the full,
    known component inventory once is cheaper than mobile-first work
    that gets redesigned as new components appear mid-build.
12. **Polish last.** A final visual-QA / edge-case pass, per
    [Section 28](#28-quality-gates).

---

## 2. CURRENT CODEBASE REUSE

Verified directly against the repository in this pass (not assumed).
**Nothing below is changed by this document** — classification only.

| Item | Location | Classification | Reasoning |
|---|---|---|---|
| Tailwind config + CSS-variable token system | `tailwind.config.ts`, `src/app/globals.css` `:root`/`.dark` | **REFACTOR** | The *mechanism* (CSS vars consumed via Tailwind's `rgb(var(--x) / <alpha-value>)` pattern) is exactly what [design-system-v1.md §27](design-system-v1.md#27-design-tokens-implementation) recommends keeping — only the values change |
| `.btn-primary`/`.btn-secondary`/`.card`/`.input`/`.label`/`.badge` utility classes | `globals.css` `@layer components` | **REFACTOR** | Real, working, restrained classes — good bones, wrong colors, and currently global CSS rather than typed components; migrate to the component tiers in [design-system-v1.md §28](design-system-v1.md#28-component-architecture) |
| Root layout dark-mode init script | `src/app/layout.tsx` (`themeInitScript`, reads `localStorage['anadash-theme']`) | **DEPRECATE** | Decision 2 locks light-only — this entire script becomes dead code once removed |
| `dark:` utility classes | Scattered — confirmed in `competition-scoring.ts` level-meta objects, `globals.css`, elsewhere | **DEPRECATE** | Removed as part of the same Decision 2 migration, not before |
| Root layout base metadata | `src/app/layout.tsx` (`export const metadata`) | **KEEP** | A real base `Metadata` object already exists — corrects an earlier assumption in [complete-product-surface.md §21](../product/complete-product-surface.md#21-seo--aeo--geo) that this wasn't confirmed built; per-page metadata still needs building out, but the mechanism is proven |
| `SessionProvider` wrapper | `src/app/providers.tsx` | **KEEP** | Correctly wired already, added specifically to support `useSession()` per the checkout-merge commits |
| Sidebar | `src/app/(dashboard)/sidebar.tsx` | **REFACTOR** | Its grouping (Product hunting / Workspace) already maps directly to DISCOVER/MANAGE — needs re-tokening, the three-switcher additions, and removal of the admin-only groups from the customer sidebar (fixing the exact anti-pattern named in the IA) |
| Auth pages + shared layout | `src/app/(auth)/auth-layout.tsx` + login/forgot-password/reset-password/accept-invite | **KEEP structure, REFACTOR visuals** | Real, working flows with a shared layout already — no structural rebuild needed |
| Checkout/signup-merged flow | `src/app/checkout/*` | **KEEP structure, REFACTOR visuals** | A real, deliberate, working architecture (see [billing/billing-lifecycle.md](../billing/billing-lifecycle.md)) — re-skin only |
| Admin console | `src/app/(dashboard)/admin/admin-client.tsx` (936-line monolithic client component) | **REPLACE** | Per the new Admin IA, Admin needs a proper separate route tree with per-module screens, not one file handling packages+orgs+coupons+connectors+email at once; underlying API calls are reused, UI structure is rebuilt |
| Recharts usage | `dashboard-charts.tsx`, `analytics-charts.tsx`, `shops/[shopExternalId]/page.tsx` | Library: **KEEP** ([CURRENT] dependency, matches [design-system-v1.md §14](design-system-v1.md#14-charts--data-visualization)'s recommendation) · Implementations: **REFACTOR** into shared Chart components rather than one-off per-page code |
| Prospects table/list | `src/app/(dashboard)/prospects/page.tsx` | **REFACTOR** | Real, working data/filter logic — visual table markup should be extracted into the shared Table/Dense-Table component |
| Shop detail page (incl. keyword extraction, snapshot chart) | `src/app/(dashboard)/shops/[shopExternalId]/page.tsx` | **KEEP logic, REFACTOR visuals** | Real intelligence logic (`extractLongTailTerms()`) worth preserving exactly; UI adopts the new Intelligence Card/Score components |
| API routes | `src/app/api/**` | **KEEP, out of scope** | Backend logic is untouched by this plan; the frontend calls through the new service abstraction ([Section 27](#27-backend-integration-boundary)), which wraps existing routes where real and mocks where not |
| `src/lib/*` business logic | `competition-scoring.ts`, `plan-limits.ts`, `app-settings.ts`, etc. | **KEEP, unaffected** | |
| Shared component directory | — | **Does not exist** — `src/components` was not found anywhere in the repo | **CREATE** — the single biggest structural gap this plan addresses; foundational to [Section 6](#6-design-system-component-build-order) |
| Custom hooks | — | **Does not exist** — no `use*`-exported functions found | **CREATE** |
| API client / fetch abstraction | — | **Does not exist** — routes call `fetch()` inline (e.g. `admin-client.tsx`) | **CREATE** — directly the [Section 27](#27-backend-integration-boundary) requirement |
| Marketing homepage | `src/app/marketing-homepage.tsx`, scoped `.sellersalt-marketing` CSS | **KEEP scoping mechanism, REFACTOR visuals** | The CSS-scoping approach (marketing styles can't leak into the app) is sound and worth preserving exactly |

---

## 3. APPLICATION SHELL

| Element | Requirement | Reuse status |
|---|---|---|
| Desktop shell | Persistent 256px sidebar + main content area + new top bar (breadcrumbs, search/command-palette trigger, AI entry, notifications, profile) | Sidebar: REFACTOR. Top bar: **new** — confirmed no header/breadcrumb component exists today |
| Mobile shell | Bottom tab bar (≤5 destinations) + collapsed "More" menu, per [design-system-v1.md §25](design-system-v1.md#25-responsive-system) | New — root `CLAUDE.md` confirms no mobile-responsive pass exists |
| Sidebar | Re-tokened; admin-only groups **removed** from the customer sidebar entirely (not just conditionally hidden — moved to the separate Admin tree) | REFACTOR |
| Top bar | Houses breadcrumbs (left), search/command-palette trigger + AI entry + notifications + profile (right) | New |
| Breadcrumbs | Data-driven from the route hierarchy ([Section 4](#4-route-architecture)); required past 2 levels of nesting per the IA | New |
| Global search | **[PLAN DECISION, per design-system-v1.md §15]** Lives inside the Command Palette — no separate search surface built | New (one surface, not two) |
| Command palette | Cmd/Ctrl+K, centered overlay, keyboard-navigable, grouped results | New |
| AI entry | Global launcher built once here (App Shell wave); **contextual** entries added incrementally as each object page is built in later waves | New |
| Notifications | Bell icon + panel (Notification Center) — launches immediately with mock data | New |
| Profile | Shell-level dropdown menu is new; the underlying Settings→Profile page is a REFACTOR of existing content | Mixed |
| Workspace selector | Rendered only for demo roles with genuine multi-org membership ([Section 8](#8-demo--role-switching)) | New |
| Client/Cohort scope selector | Rendered in MANAGE context for Agency/Institute demo roles | New |
| Connected-shop selector | Rendered in OPERATE context | New |

**Restated as a hard shell requirement, not just a visual guideline**:
Workspace selector, Client/Cohort scope selector, and Connected-shop
selector are **three separate components** with distinct icons and
distinct trigger conditions — see
[design-system-v1.md §15](design-system-v1.md#15-navigation-components).
An implementing agent must not collapse these into one generic dropdown
under time pressure; this is one of the most-repeated warnings across
the entire foundation document set for a reason.

---

## 4. ROUTE ARCHITECTURE

Reflects the IA's Final IA Tree, separated into six groups. **Admin is
never reachable through customer navigation** — a hard rule, not a
convention.

```
src/app/
  (public)/                    PUBLIC — no auth
    page.tsx (home) · features/ · solutions/{individual,agency,institute}/
    integrations/ · pricing/ · partners/ · resources/{blog,guides,comparisons,glossary,faq}/
    contact/ · legal/{privacy,terms,gdpr}/

  (auth)/                      AUTH — existing group, kept
    login/ · forgot-password/ · reset-password/ · accept-invite/
  checkout/                    hybrid public/authed — existing, kept at top level

  (app)/                       CUSTOMER — reorganized from (dashboard)
    dashboard/                 Overview
    discover/                  prospects/ · spy/ · spy/tracked/ · trends/ · dropped-shops/ · favorites/
    operate/
      shops/                   Connected Shops list + selector
      shops/[shopId]/          overview · products · listings · optimization · analytics · competitors
    manage/
      clients/[clientId]/          AGENCY-scoped
      cohorts/[cohortId]/          INSTITUTE-scoped
      cohorts/[cohortId]/students/[studentId]/
      employees/                   AGENCY-scoped
      staff/                       INSTITUTE-scoped
      reports/[reportId]?/
      billing/
      settings/{account,security,workspace,members,roles,connections,notifications,billing,ai,privacy}/

  admin/                       ADMIN — separate top-level segment, never under (app)
    (mirrors the Admin IA tree exactly — see Section 20)
```

| Group | Route(s) | Purpose | User type | Layout | Access requirement | Mock-data requirement |
|---|---|---|---|---|---|---|
| PUBLIC | `(public)/*` | Marketing/content, SEO surface | Anyone, unauthenticated | Marketing layout (scoped `.sellersalt-marketing`) | None | Optional — pricing can pull real `Package` data, everything else mock |
| AUTH | `(auth)/*` | Sign in / recover access | Unauthenticated visitors | Auth layout (existing) | None → creates session | None — real backend already exists |
| CUSTOMER (shared) | `(app)/dashboard`, `(app)/discover/*` | Core DISCOVER experience | Individual+, all customer roles | App shell | Authenticated | Mock (Prospects/Spy/Trends/Dropped/Favorites) |
| CUSTOMER (shared) | `(app)/operate/*` | Connected Shop workspace | Individual+ (once customer-facing), Agency/Institute (scoped) | App shell | Authenticated, plan/role-gated | Mock |
| CUSTOMER (shared) | `(app)/manage/settings/*`, `reports/*`, `billing/*` | Account-level MANAGE | All authenticated roles | App shell | Authenticated | Mixed — Billing/Settings partially real |
| AGENCY | `(app)/manage/clients/*`, `employees/*` | Agency-specific MANAGE | Agency Owner/Employee | App shell, Scope selector active | Authenticated + `Organization.kind = Agency` (mock) | Mock |
| INSTITUTE | `(app)/manage/cohorts/*`, `staff/*` | Institute-specific MANAGE | Institute Admin/Staff/Student | App shell, Scope selector active | Authenticated + `Organization.kind = Institute` (mock) | Mock |
| ADMIN | `admin/*` | Platform administration | Super Admin, Sub-admin | Admin shell (separate, `bg-muted`-tinted) | `ADMIN_EMAILS` (mock in demo mode) | Mock, some real (Packages/Coupons/Payment Providers/AppSettings) |

Full per-screen breakdown (purpose/screens/priority) is in
[Section 5](#5-screen-inventory-implementation-order) — this table
defines the route *groups and access boundaries*, not every leaf route.

---

## 5. SCREEN INVENTORY IMPLEMENTATION ORDER

Extends the Screen Inventory from
[complete-product-surface.md](../product/complete-product-surface.md#screen-inventory)
with build-planning columns. **P0** = foundational or highest simulator
value; **P1** = core product value, built soon after; **P2** =
important, follows; **P3** = lowest urgency for a simulator's purpose.

| Screen | Priority | Implementation type | Data mode | Reusable pattern |
|---|---|---|---|---|
| Homepage | P2 | MARKETING | HYBRID | marketing |
| Checkout / Pricing | P1 | TEMPLATE | HYBRID (real backend exists) | wizard |
| Login / Forgot / Reset / Accept invite | P0 | TEMPLATE | HYBRID (real backend exists) | wizard |
| Onboarding | P1 | TEMPLATE | MOCK | wizard |
| Dashboard / Overview | P0 | FOUNDATION/PRODUCT | MOCK | dashboard |
| Prospects | P0 | PRODUCT | MOCK | list + search + filter |
| Spy on Competitor | P0 | PRODUCT | MOCK | search + detail |
| Tracked shops | P1 | PRODUCT | MOCK | list + analysis |
| Trends | P1 | PRODUCT | MOCK | analysis |
| Dropped shops | P1 | PRODUCT | MOCK | list |
| Favorites | P1 | PRODUCT | MOCK | list |
| Connectors | P2 | MANAGEMENT | MOCK | management |
| Jobs | P2 | MANAGEMENT | MOCK | list |
| Connect Shop flow (all states) | P0 | TEMPLATE | MOCK | connection |
| Connected Shop workspace (Overview/Products/Listings/Analytics/Competitors) | P0 | PRODUCT | MOCK | health + analysis |
| Optimization workflow | P0 | PRODUCT | MOCK | optimization |
| Client-initiated connect link flow | P1 | TEMPLATE | MOCK | connection |
| Agency dashboard | P1 | PRODUCT | MOCK | dashboard |
| Client list / detail | P1 | MANAGEMENT | MOCK | list + detail |
| Employee management | P2 | MANAGEMENT | MOCK | management |
| Agency reports (proof reports) | P2 | PRODUCT | MOCK | report |
| Institute dashboard | P1 | PRODUCT | MOCK | dashboard |
| Cohort list / detail | P1 | MANAGEMENT | MOCK | list + detail |
| Student list / detail | P1 | MANAGEMENT | MOCK | list + detail |
| AI assistant (global + contextual) | P1 | PRODUCT | MOCK | AI |
| Notification center | P1 | TEMPLATE | MOCK | other |
| Report hub / detail / share page | P2 | PRODUCT | MOCK | report |
| Billing states gallery (upgrade/downgrade/cancel/failed/invoices) | P1 | TEMPLATE | MOCK | wizard |
| Settings (all 10 categories) | P1 | TEMPLATE | MOCK/HYBRID | settings |
| Analytics | P2 | PRODUCT | MOCK | dashboard/analysis |
| Listing/SEO audit | P2 | PRODUCT | MOCK | analysis |
| Admin console (rebuilt) | P2 | ADMIN | MOCK/HYBRID | management |
| Sub-admin department views | P3 | ADMIN | MOCK | dashboard |
| Email template designer | P3 | ADMIN | MOCK | wizard |
| Homepage/content editor | P3 | ADMIN | MOCK | management |

---

## 6. DESIGN SYSTEM COMPONENT BUILD ORDER

Expands
[design-system-v1.md §28](design-system-v1.md#28-component-architecture)'s
five-tier hierarchy into a literal build order with named components.

| Tier | Components | Built once, reused in |
|---|---|---|
| **0 — Tokens** | Color/typography/spacing/radius/shadow CSS variables, Tailwind config mapping | Every subsequent tier |
| **1 — Primitives** | `Box`/`Stack` (layout), `Text`, `Icon` (wraps lucide-react + size scale) | Every component |
| **2 — Core** | `Button`, `Input`/`Textarea`/`Select`/`Checkbox`/`Radio`/`Switch`, `Card`, `Badge`, `Tag`, `Avatar`, `Tooltip`, `Table`, `Tabs`, `Breadcrumbs`, `Dialog`, `Drawer`, `Toast` | Every screen in every wave |
| **3 — Composite** | `ScoreBadge`/`ScoreRing`, `StatusBadge`, `StatBlock`, `Sparkline`, `TrendIndicator`, **`IntelligenceCard`** (the shared base, [design-system-v1.md §12](design-system-v1.md#12-intelligence-components)), `Skeleton`, `EmptyState` | **`IntelligenceCard` and `ScoreBadge`/`ScoreRing` are the single highest-leverage components in the entire system** — reused across DISCOVER, OPERATE, MANAGE, Reports, and AI |
| **4 — Product patterns** | `IssueCard`/`RecommendationCard`/`OpportunityCard`/`InsightCard`/`AlertCard`/`BenchmarkCard`/`ActionLogItem`/`OutcomeCard` (all `IntelligenceCard` variants), `ConnectShopFlow`, `WorkspaceSwitcher`/`ScopeSwitcher`/`ShopSelector`, `NotificationCenterPanel`, `AIPanel`, `CommandPalette` | Optimization pages, Agency/Institute pages, AI results, Reports |
| **5 — Dashboard sections** | `StatBlockGrid`, `ShopHealthSummary`, `OptimizationIssueList`, `ClientHealthRollup`, `CohortProgressRollup` | Overview pages across every context |
| **6 — Intelligence pages** | Full Shop Overview, Optimization page, Client detail, Cohort detail | Assembled from Tier 4–5 |
| **7 — Optimization workflows** | The full Advise/Prepare/Apply/Verify/Measure state machine UI | Connected Shop wave, reused by Agency/Institute, AI |

---

## 7. MOCK DATA ARCHITECTURE

**[PLAN DECISION]** Mock data is **not** scattered hardcoded arrays in
components. It is a set of typed modules, each exposing lookup/query
functions (never raw exported arrays consumed directly by a component)
— this is what makes [Section 27](#27-backend-integration-boundary)'s
mock→real swap possible without touching component code.

```
mock/
├── users/            User records, linked to organizations via membership
├── organizations/    Organization records with a `kind` field
│                       (Individual/Agency/Institute/Admin) — surfaces the
│                       still-open Organization.kind discriminator decision
│                       visually, even in mock form
├── shops/            TWO genuinely separate types: ResearchShop and
│                       ConnectedShop — never one polymorphic "Shop" type.
│                       This enforces the Critical Shop Distinction at the
│                       data layer itself, not just visually
├── products/         Linked to ConnectedShop (own listings) — separate
│                       from listings surfaced via ResearchShop (researched)
├── listings/          Same split as products
├── competitors/        ResearchShop records flagged/tracked (ShopWatch-equivalent)
├── trends/              Aggregate records, not linked to one shop
├── prospects/            Search-result records, linked to a mock SearchConfig
├── intelligence/          Score/Benchmark/Trend records, linked via a typed
│                            reference: { targetType: 'connectedShop' |
│                            'listing' | 'researchShop', targetId }
├── recommendations/        Linked to an Issue (under intelligence/), carries
│                             Advise/Prepare/Apply/Automate state
├── alerts/                   Linked to a triggering object, also surfaced
│                               in notifications/
├── reports/                    Linked to Organization + optional Client/
│                                 Cohort/Student + referenced Score/Outcome snapshots
├── billing/                      Package/Subscription/Coupon records,
│                                   covering every SubscriptionStatus value
├── notifications/                  Notification + Alert records only —
│                                     Insight/Recommendation are NOT
│                                     duplicated here, per design-system-v1 §20
├── admin/                            Cross-org aggregate/verification records
└── ai/                                  Conversation/query/tool-result records,
                                          including a deliberate "unavailable
                                          capability" example response
```

### Relationships must be internally consistent — worked examples

```
Agency Org "Meridian Growth"
  → Client "Luna & Co."
    → Connected Shop "lunaandco-etsy"
      → Products (12) → Listings (34)
        → Issues (5, mixed severity)
          → Recommendations (5, one per issue, mixed Advise/Prepare/Apply states)
            → Optimization history (3 completed actions)
              → Outcome (before/after score: 61 → 78)
      → Report "Q3 Optimization Proof Report" (references the Outcome above)
```

```
Institute Org "Etsy Bootcamp Academy"
  → Cohort "Fall 2026 Cohort"
    → Student "Jordan M."
      → Connected Shop "jordanmcrafts-etsy"
        → Progress record — MUST render with a visible "illustrative
          metric" caveat in the mock UI, since Progress's real definition
          is [DECISION REQUIRED] per product/personas.md. The mock must
          not imply this is a settled product decision.
```

---

## 8. DEMO / ROLE SWITCHING

**[PLAN DECISION]** A dev-only **Demo Context Switcher** — visible only
when `NEXT_PUBLIC_DEMO_MODE=true` — lets a reviewer pick from all nine
roles: Individual Starter, Individual Pro, Agency Owner, Agency
Employee, Institute Admin, Institute Staff, Student, Super Admin,
Accounts Sub-admin.

- Implemented as a **client-side-only React Context** that, when demo
  mode is active, **short-circuits** what the real session hook would
  return with a mock session object matching the same shape — real
  components never know the difference.
- **Fully isolated from `src/lib/auth.ts`** — never touches real
  cookies, JWTs, or the database. Must be compiled out or gated by the
  env flag so it is never reachable in a production build by default,
  not merely hidden by a UI toggle.
- Purpose: lets a stakeholder visually inspect every one of the nine
  experiences without needing nine real seeded accounts or a working
  permission backend.

---

## 9. PRODUCT PATTERNS

| Pattern | Screens that reuse it |
|---|---|
| Dashboard | Individual Overview, Agency Overview, Institute Overview, Admin department dashboards |
| List | Prospects, Tracked shops, Dropped shops, Favorites, Client list, Cohort list, Student list, Jobs, Connectors, Admin Organizations/Users |
| Search | Prospects, Spy lookup, Admin customer lookup, Command Palette |
| Filter | Prospects filter panel, Trends, Admin Organizations (by type) |
| Detail | Competitor Shop detail, Connected Shop workspace, Client detail, Cohort/Student detail, Report detail |
| Comparison | Benchmark component usage across every Score detail; a dedicated compare view is [FUTURE] |
| Analysis | Trends, Analytics, Listing/SEO audit, Shop Health detail |
| Health | Shop Intelligence detail, every Score Ring/Dot usage |
| Optimization | The full Optimization workflow page — Connected Shop wave, reused verbatim by Agency/Institute |
| Report | Report hub/detail, Agency proof report, Institute cohort report, public share view |
| Management | Employee/Staff management, Connectors, Admin Organizations/Users/Packages/Coupons |
| Settings | Every Settings category page |
| Wizard | Onboarding, Connect Shop flow, Checkout, Report builder |
| Connection | Connect marketplace flow, all connection states |
| AI | Global AI panel, contextual entries, AI result rendering |
| Admin | Admin dashboard, verification workflow, system health, audit logs |
| Marketing | Homepage, Solutions, Pricing, Resources |

---

## 10. INDIVIDUAL FRONTEND WAVE

Build order (within this wave):

1. Onboarding (first-run empty states, connect prompts)
2. Dashboard / Overview
3. Prospects (product discovery)
4. Spy on Competitor (shop research)
5. Tracked shops (competitor research)
6. Trends
7. Dropped shops
8. Favorites
9. Saved/Scheduled searches — **built as a tab within Prospects, not a
   separate screen**, per the IA
10. Connected shop entry point (Settings → Connections) — the *entry*
    only; the full workspace is [Section 11](#11-connected-shop-wave)'s
    own wave
11. Reports, AI — **entry points only** in this wave; the full systems
    are built once in their own dedicated waves ([14](#14-intelligence-wave)/[16](#16-ai-wave)/[17](#17-reporting-wave))
    and simply linked from here — not rebuilt per-context
12. Billing (Settings → Billing)
13. Profile / Settings

**Explicit note**: Shop health, Optimization, Recommendations, Alerts,
and AI are cross-cutting systems built once elsewhere. This wave's job
is DISCOVER + entry points, not a second implementation of intelligence
or AI.

---

## 11. CONNECTED SHOP WAVE

```
Connect → Authorization → Pending → Connected → Syncing → Ready
  → Health → Issues → Recommendations → Optimization → Measurement
```

Build order:

1. Connect Shop flow shell (platform selector → OAuth redirect
   interstitial → pending → success/failure), per
   [design-system-v1.md §16](design-system-v1.md#16-shop--connection-components)
2. Shop selector (multi-shop), wired to real mock shop lists — mock
   seeds **at least 2–3 shops** for one demo persona so the selector has
   something real to switch between
3. Connected Shop workspace shell — Overview/Products/Listings/
   Optimization/Analytics/Competitors tabs
4. Sync status + **stale / disconnected / failed** states
5. Health/Score rendering on Overview (Score Ring, mock scores)
6. Issues list (Optimization tab)
7. Recommendations (linked to Issues)
8. Full Optimization workflow — built **together with**
   [Section 15](#15-optimization-wave), not twice; the brief describes
   the same underlying work from two angles
9. Outcome / before-after (Measurement stage)
10. **No-data / insufficient-data** mock states for a freshly-connected,
    not-yet-scanned shop — directly resolving the gap named in
    [ia-journey-validation.md, Journey 2](ia-journey-validation.md#2-connected-seller--shop-diagnosis)

---

## 12. AGENCY WAVE

Build order, **including the client-initiated OAuth flow discovered
during IA validation** — the single largest gap found in
[ia-journey-validation.md, Journey 5](ia-journey-validation.md#5-agency):

1. Agency dashboard (rollup Stat Blocks)
2. Client list
3. Client detail shell (Overview/Shops/Optimization/Reports/Activity)
4. Client onboarding (add-client form)
5. **Client-initiated connect flow** — a scoped connect-link the agency
   generates, plus a **separate, lightweight page** (reachable without
   full login) where the client completes OAuth themselves. This is a
   genuinely new page type, distinct from the standard Connect flow in
   [Section 11](#11-connected-shop-wave), since it's initiated by a
   different actor
6. Connection request/pending states specific to this flow ("Waiting
   for [Client] to connect their shop")
7. Client Shop — **reuses** the Connected Shop workspace from
   [Section 11](#11-connected-shop-wave), scoped under a Client
8. Employees list/detail
9. Roles & Permissions UI (client assignment)
10. Optimization — **reuses** [Section 11](#11-connected-shop-wave)/[15](#15-optimization-wave)
    exactly, performed on a Client Shop
11. Before/after + Proof reports — **reuses**
    [Section 17](#17-reporting-wave)'s components with the Agency
    branding slot
12. Report sharing (share-link generation)
13. Activity (Client detail's Activity tab — reuses the Action log
    pattern)
14. Seats — kept visually simple/illustrative, since real allocation
    mechanics are [DECISION REQUIRED]
15. Billing / Settings (Agency-scoped, reuses [Section 19](#19-settings-wave))

---

## 13. INSTITUTE WAVE

Build order:

1. Institute dashboard
2. Cohort list
3. Cohort detail (Overview/Students/Progress rollup/Analytics)
4. Student list (cross-cohort)
5. Student detail/workspace
6. Student onboarding — mirrors the Client onboarding pattern from
   [Section 12](#12-agency-wave), reused not reinvented
7. Student shop — reuses the Connected Shop workspace, scoped to
   exactly one shop per student, per the IA
8. Progress / Performance — **explicit "illustrative metric" caveat
   rendered in the mock UI**, since Progress's real definition is
   [DECISION REQUIRED]
9. Reports (Student/Cohort Reports — reuses
   [Section 17](#17-reporting-wave) with cohort-benchmark emphasis)
10. Staff list/permissions — mirrors the Employee pattern from
    [Section 12](#12-agency-wave), reused
11. Seats — same illustrative caveat as Agency
12. Billing / Settings

---

## 14. INTELLIGENCE WAVE

**This wave is primarily verification, not new construction** — the
Intelligence Card system was already built in
[Section 6](#6-design-system-component-build-order) (Tier 3–4). This
wave confirms each of the ten object types renders correctly in every
context it's meant to serve:

| Type | Verified in at least |
|---|---|
| Score | Connected Shop Overview, Competitor Shop (existing Difficulty/Demand — **reconciled per [design-system-v1.md §13](design-system-v1.md#13-health--score-system), not restyled**), Cohort student rollup |
| Benchmark | Score detail views, Cohort progress view |
| Issue | Optimization tab, AI result |
| Opportunity | Trends page, AI result |
| Insight | AI conversation, Shop Overview |
| Recommendation | Optimization tab, AI result, Report |
| Alert | Notification Center, inline on triggering object |
| Trend | Trends page, Shop Overview sparkline, Report |
| Action | Optimization history, Admin Audit Log |
| Outcome | Optimization Measurement stage, Agency proof Report |

---

## 15. OPTIMIZATION WAVE

Tightly coupled with [Section 11](#11-connected-shop-wave) — built
together. Full stage-by-stage visual states per
[design-system-v1.md §17](design-system-v1.md#17-recommendation--action-system):

```
Issue → Recommendation → Prepare → Preview → Approval → Apply → Verification → Measurement
```

**Hard constraint on this wave**: no button anywhere in it may use the
bare word "Act" or an unqualified "Optimize now." Every CTA uses
**Advise / Prepare / Apply** phrasing exactly as specified — this is a
directly checkable acceptance criterion, not a style suggestion.

**Mock variety requirement**: seed enough issues to demonstrate the
full spectrum in one demo session — an Advise-only issue, a
Prepare-then-Apply issue, an already-Applied+Verified+Measured issue
with full history, and a Future/disabled **Automate** toggle shown but
clearly marked unavailable.

---

## 16. AI WAVE

**Not MCP.** This wave is the SellerSalt AI Assistant — the AI
experience *inside* SellerSalt's own UI. External AI agents (SellerSalt
MCP) are a separate, backend-first concern — see
[architecture/mcp.md](../architecture/mcp.md) — with its own frontend
surface built in [Section 19](#19-settings-wave) (Settings → Developer &
Integrations), not this wave. Per Decision 4
([MASTER_BLUEPRINT.md](../MASTER_BLUEPRINT.md)), the real Agent Gateway
architecture must exist conceptually before this wave (or any major
surface) is implemented — that's an architecture/documentation
prerequisite already satisfied by [architecture/mcp.md](../architecture/mcp.md),
not a frontend dependency this wave needs to wait on; this wave can
proceed on its existing schedule.

Build order:

1. Global AI launcher + panel shell
2. Suggested prompts — **SellerSalt-specific, never generic**: "Find
   winning products in [category]," "Analyze my shop's health," "What
   are my biggest SEO problems?," "Compare my shop to competitors,"
   "Show me products losing momentum this month" — lifted directly from
   the brief's own recurring example list
3. Query input + submit
4. Processing/tool-execution state — names *which* mock tool is running
5. Result rendering — **reuses Intelligence Cards/charts/tables
   exactly**, no AI-specific variants
6. Partial result state
7. **Unavailable capability state** — mandatory, at least two distinct
   mock examples (one plan-gated, one genuinely-not-built-yet) —
   directly resolves the requirement found in
   [ia-journey-validation.md, Journey 7](ia-journey-validation.md#7-ai-copilot)
8. Recommendation/Action from AI — **routes through the same
   Optimization components** from [Section 15](#15-optimization-wave),
   not rebuilt
9. Confirmation before Apply-tier AI actions — reuses
   [Section 15](#15-optimization-wave)'s Approval step exactly
10. Conversation history / saved queries
11. Contextual AI entry points added retroactively to every object page
    already built in prior waves (a checklist task, not new component
    work)

---

## 17. REPORTING WAVE

Build order:

1. Report hub (global list, filterable by type)
2. Report detail — header/metrics/insights/recommendations/comparison/
   before-after/chart/footer per
   [design-system-v1.md §19](design-system-v1.md#19-reporting)
3. Before/after report (Agency proof-report variant, branding slot)
4. Client report (Agency-scoped)
5. Student/Cohort report (Institute-scoped, benchmark emphasis)
6. Report builder — lower priority (P2/P3) relative to viewing
   pre-generated reports
7. Share page — a genuinely separate route/layout, since it must not
   include internal chrome/navigation
8. PDF preview — reuses the report detail component tree with a print
   stylesheet, not a separate implementation

---

## 18. BILLING WAVE

**Most of this wave already has real, working backend** (see
[architecture/billing.md](../architecture/billing.md)) — this is
primarily a re-skin, plus building UI for states that have no real
backend yet.

Build order:

1. Re-skin existing Checkout/Pricing (real data, new visuals)
2. Subscription/Plan management view (usage-vs-limit bars via Stat
   Block pattern)
3. Upgrade/Downgrade flow — **new UI, mock backend** (real support is
   [VERIFY]/[FUTURE] per [architecture/billing.md](../architecture/billing.md))
4. Cancellation flow — re-skin, real backend exists
5. Payment methods — new UI, mock
6. Invoices/Transactions — new UI, mock
7. Coupons — re-skin existing entry point, real backend exists
8. Seat usage — new UI, mock, same illustrative caveat as Agency/
   Institute seats
9. Mock billing **state gallery** — failed payment, renewal-upcoming,
   expired/canceled — as distinct visual states on the Subscription
   view, demonstrable without triggering real Stripe/PayPal test events

---

## 19. SETTINGS WAVE

Uses the exact IA-approved 11-category hierarchy: Account, Security,
Workspace, Members, Roles & Permissions, Connections, Notifications,
Billing, AI, **Developer & Integrations**, Privacy & Data — the last
addition (Decision 4, 2026-08-15) houses MCP/external AI agent
management ([architecture/mcp.md](../architecture/mcp.md),
[information-architecture-v1.md §Settings IA](information-architecture-v1.md#settings-ia)).

Build order: shared Settings shell (nav + category page template)
first, then Account/Security/Billing/Connections (P0–P1, needed by
other waves), then Workspace/Members/Roles & Permissions/AI/Privacy &
Data (P2, needed once Agency/Institute/AI waves are underway), then
Notifications last (depends on the Notification Center existing from
the App Shell wave). **Developer & Integrations (AI/MCP) is P3** — a
fully mock screen (agent connections, credentials, tool/scope
permissions, usage, rate limits, activity — see
[architecture/mcp.md §Product surface](../architecture/mcp.md#product-surface)),
built like every other not-yet-real Settings category; it does not
require the real Agent Gateway backend to exist first, and must render
its "hidden unless `mcp_access`-entitled" behavior per the IA even
though entitlement itself is mocked at this stage.

---

## 20. ADMIN WAVE

Structurally separate — own route segment, own shell
([Section 3](#3-application-shell)/[4](#4-route-architecture)).

Build order:

1. Admin shell (`bg-muted`-tinted per
   [design-system-v1.md §21](design-system-v1.md#21-admin-ui))
2. Admin dashboard (Platform Overview, mock KPIs)
3. Customer search/Organizations list (Individuals/Agencies/Institutes
   filter, mock `Organization.kind`)
4. Organization detail (Account detail + Activity tab — directly
   resolves [ia-journey-validation.md, Journey 8](ia-journey-validation.md#8-super-admin))
5. Subscriptions/Billing/Packages/Coupons — **REPLACE**, rebuilt against
   the new Admin IA rather than the monolithic `admin-client.tsx`
6. Payments — re-skin real Payment Provider management
7. Verification — new, mock — workflow pattern only
8. Partners — new, mock (an ecosystem/business-relationship directory —
   **distinct from Affiliate Program below**, per
   [architecture/affiliate.md §Affiliate vs. Partner vs. Agency vs. Institute](../architecture/affiliate.md#affiliate-vs-partner-vs-agency-vs-institute):
   independent relationships, never the same screen)
9. **Affiliate Program** — new, mock. Overview · Applications · Active/
   Suspended Affiliates · Affiliate Detail · Referral Activity ·
   Conversions · Commission Ledger · Commission Rules · Tiers · Payouts
   · Payout Failures · Fraud/Risk · Program Settings · Terms, per
   [information-architecture-v1.md §Admin IA](information-architecture-v1.md#admin-ia)
   and [architecture/affiliate.md §Admin Affiliate Console](../architecture/affiliate.md#admin-affiliate-console)
   (NOW/LATER/FUTURE classification for which sections matter most at
   v1 is in that document — build NOW-classified sections first:
   Applications, Active/Suspended Affiliates, Affiliate Detail,
   Conversions, Commission Ledger, Commission Rules, Payouts, Program
   Settings). Mock ledger data only — no real commission engine exists.
10. Marketplace/Seller Connectors — re-skin real Platform Connector admin
11. Email — re-skin real SMTP settings entry point (the Template
    Designer is its own wave, [Section 21](#21-email-template-designer))
12. Content/SEO/Branding — new, mock, ties to
    [Section 22](#22-cms--marketing)
13. Support — new, mock
14. Jobs/System Health — new UI over partially-real data (`Job` model
    exists)
15. Audit Logs — new, mock, reuses the Action component at platform
    scope
16. Settings — re-skin real `AppSetting` admin UI
17. Sub-admin department-scoped views — built **last**: apply
    visibility scoping on top of the already-built full Admin tree, per
    the IA's "same tree, subsetted" rule, previewed via the Demo Role
    Switcher ([Section 8](#8-demo--role-switching)) — includes the
    candidate Affiliate/Growth Ops department scoped to item 9 above

---

## 21. EMAIL TEMPLATE DESIGNER

Entirely [FUTURE]/net-new — no real backend exists for this at all
(`EmailSettings` is SMTP-connection-only). Fully mock.

Build order: template list (mock templates: welcome, verification,
password reset, invitation, subscription, payment, trial, cancellation,
shop connection, scan completion, report ready, system — the exact list
named in root `CLAUDE.md`) → template editor shell (uses
[design-system-v1.md §23](design-system-v1.md#23-email-design-system)) →
variable picker → preview → desktop/mobile preview toggle → test send
(mock confirmation, no real send) → version history (mock) → activation
toggle → delivery logs (mock, reuses the Table pattern).

---

## 22. CMS / MARKETING

Build order: re-skin existing Homepage (real page, new design system) →
Solutions pages (Individual/Agency/Institute — new, reuse Homepage
section patterns) → Feature pages (new) → standalone Pricing page (new,
lighter-weight than `/checkout`, links into the real checkout flow —
resolves the open [DECISION REQUIRED] on a separate SEO-indexable
pricing page by building the page shell now, pending product-owner
sign-off on publishing) → Integration pages (page template built now;
publish timing remains a separate product decision per
[seo/seo.md](../seo/seo.md)) → Resources hub + Blog/Guides/Comparisons/
Glossary/FAQ (one shared long-form content template, per the IA's
grouping decision) → Partner directory (new, mock) → Contact/Legal
(new, P3).

All pages use the **same design system components** as the app (Stat
Blocks, Cards, Buttons) even though marketing layout is more generous.

---

## 23. SEO / AEO / GEO FRONTEND

| Requirement | Implementation |
|---|---|
| Metadata | Per-page `generateMetadata`/`export const metadata`, building on the **real** base metadata already confirmed in `layout.tsx` |
| Canonical | `alternates.canonical` in Next.js metadata |
| Structured data | JSON-LD per page type — `Organization`/`SoftwareApplication` sitewide, `Product`/`FAQPage`/`BreadcrumbList` per relevant page |
| Breadcrumbs | Reuses the App Shell `Breadcrumbs` component ([Section 3](#3-application-shell)) on public pages too, feeding `BreadcrumbList` structured data from the same source |
| FAQ | One content source drives both the visual accordion and `FAQPage` JSON-LD — never maintained twice |
| Entity pages | Solutions/Marketplace pages describe the same product facts consistently, per the GEO requirement |
| Sitemap | Next.js `sitemap.ts` convention, generated from the CMS content model once it exists, not hand-maintained |
| Programmatic pages | Route template + content-source pattern for category/marketplace pages, not hand-built HTML per page |
| Internal linking | A shared "related content" component across Resources/Solutions/Feature pages, not ad hoc links |

**Hard rule, restated**: no page built here may claim a capability that
isn't [CURRENT] per
[complete-product-surface.md](../product/complete-product-surface.md) —
verify before publishing copy, per [seo/geo.md](../seo/geo.md).

---

## 24. RESPONSIVE IMPLEMENTATION

Per-wave mobile priority and bespoke component needs (beyond the
general rules in
[design-system-v1.md §25](design-system-v1.md#25-responsive-system)):

| Wave | Desktop | Tablet | Mobile priority | Bespoke need |
|---|---|---|---|---|
| App Shell | Full sidebar + top bar | Icon-rail sidebar | **P0** | The most consequential adaptation — every other wave's mobile behavior assumes this exists first |
| Individual (Discover) | Full table density | Full | P1 | Prospects keeps horizontal-scroll+sticky-column even on mobile (spreadsheet mental model); Trends/Dropped/Favorites use card-per-row |
| Connected Shop | Side-by-side | Stacked | P1 | Optimization's Prepare/Preview/Approval steps become full-screen sequential steps on mobile |
| Agency/Institute | Master/detail split | Stacked | P2 | Client/Cohort/Student lists → card-per-row; deep hierarchies rely on back-stack, not persistent breadcrumbs |
| AI | Side panel | Side panel | P1 | Full-screen takeover on mobile, per the explicit rule in design-system-v1 |
| Reporting | Long-form scroll | Same | P2 | PDF preview is desktop-primary (P3) — a mobile user more likely downloads/shares |
| Billing | Full | Full | **P0** (Checkout specifically) | Checkout is a real conversion funnel — must work on mobile; invoices/transactions are P2 |
| Settings | Two-column | Stacked | P1 | Standard form stacking |
| Admin | Full | Full | **P3 — desktop-only for v1** | **[PLAN DECISION]**: Admin work is overwhelmingly desktop; a "best viewed on desktop" notice on small screens is a deliberate, reasoned scope limit rather than spending effort on a rarely-mobile-used surface |
| Email Designer | Full | Full | **P3 — desktop-only for v1** | Same reasoning as Admin |
| CMS/Marketing | Full | Full | **P0** | Public visitors are frequently mobile — standard responsive marketing patterns, not the app's dense patterns |

---

## 25. INTERACTION REQUIREMENTS

These distinguish a **product simulator** (this task's stated goal)
from a static export — every item below must be genuinely interactive
against mock data, not decorative:

- Navigation — real client-side routing
- Tabs — real switching
- Filters — real application against mock data sets
- Search — real substring/fuzzy match against mock data
- Sorting — real column sort
- Pagination — real page-through, even of a small mock set
- Modals/Drawers — real open/close, focus-trap
- Forms — real client-side validation, real submit→mock-success flow
- Toggles — real state persistence within the session
- Selectors (the three switchers) — must actually change which mock
  data renders
- Onboarding — real step progression, real completion state
- Connection flows — real Connect→Pending→Success/Failure progression
  using mock timers
- Optimization workflows — real progression through the 7-stage
  pipeline
- Report builder — real selection→generate flow against mock data
- AI interactions — real query submission → mock "processing" delay →
  mock result rendering — never a static pre-filled screenshot
- Role switching — real, immediate context swap via
  [Section 8](#8-demo--role-switching)

---

## 26. FRONTEND-ONLY STATE MANAGEMENT

**[PLAN DECISION]** A layered approach:

| Layer | Mechanism | Examples |
|---|---|---|
| Session/context state | Three **separate** React Context providers — `DemoSessionContext` (role/org), `ScopeContext` (client/cohort), `ShopContext` (active connected shop) — mirroring the three-switcher distinction exactly at the state layer, not just visually | Selected workspace, selected client/cohort, selected shop |
| "Server-ish" state (mock data reads) | Fetched through the [Section 27](#27-backend-integration-boundary) service abstraction, cached via a query pattern (React Query/SWR-idiomatic loading/error/data states) even though the "server" is a mock module | Prospects, shops, intelligence, reports, billing |
| Local UI state | Plain component-local `useState`/`useReducer` — no global state needed | Filters, sort, pagination, modal open/closed, form input, dirty-state, onboarding step, optimization workflow step |
| AI conversation state | A dedicated context/store — persists across navigation within a session (per the IA's "Query history" requirement), but is not itself a navigation switcher | Conversation history, current query, tool-execution status |
| Notification/alert state | A dedicated store, since notifications arrive asynchronously and must be readable from the global bell regardless of active page | Notification Center contents |

**General rule**: anything that would eventually come from a real API
call goes through the [Section 27](#27-backend-integration-boundary)
service boundary — never held as a raw component-local mock array.
Anything purely ephemeral UI state stays local and is never
over-engineered into global state.

---

## 27. BACKEND INTEGRATION BOUNDARY

```
Components → UI state → Service/API abstraction → Mock implementation OR real implementation
```

**[PLAN DECISION]** This is the single most important architectural
rule for making the mock→real swap cheap:

- Components **never** import from `mock/*` directly. They import from
  a service layer — e.g. `services/prospects.ts` exporting
  `useProspects(filters)`, `services/shops.ts` exporting
  `useConnectedShop(shopId)`, `services/billing.ts` exporting
  `useSubscription()`.
- Each service function has **one real contract** (its TypeScript
  input/output types). Wherever a real backend already exists (Discover,
  Billing, Auth, Team, seller-channel OAuth — roughly the CURRENT
  surface per
  [complete-product-surface.md](../product/complete-product-surface.md)),
  the contract **matches the actual existing API route's response
  shape**, verified against the real route — not invented fresh.
- For genuinely new/FUTURE capabilities (Shop Health, Optimization, AI,
  Reporting, Agency/Institute), the service contract is this plan's own
  invention — written as a real TypeScript interface, not a loose
  shape, giving a future backend implementer an exact target.
- **Swapping mock→real** = replacing the function body inside
  `services/*.ts` from "read `mock/*`" to "call `fetch('/api/...')`" —
  calling component code, UI state, and type contracts do not change.
- A single environment-driven switch (`NEXT_PUBLIC_DATA_MODE=mock|real`),
  checked once per service module — **granular per-service**, enabling
  the HYBRID data mode named in [Section 5](#5-screen-inventory-implementation-order)
  (some services real, some mocked, simultaneously).

This is precisely how "the UI must not directly depend on mock data
structures in a way that makes future backend integration difficult" is
satisfied — components only ever see the service's typed contract,
never the mock module's internal shape.

**Same principle, now also a real-backend requirement, not just a
frontend-simulator one**: per Decision 4
([architecture/mcp.md §The three consumers of one Backend Domain Services layer](../architecture/mcp.md#the-three-consumers-of-one-backend-domain-services-layer)),
once a real backend exists, the Web UI, the SellerSalt AI Assistant, and
SellerSalt MCP must all call the **same** real service-layer functions
this section's contracts describe — MCP is not a reason to write a
second implementation of, e.g., shop-health scoring. The service
contracts this frontend plan invents for FUTURE capabilities (Shop
Health, Optimization, Reporting) are therefore also, implicitly, the
shape a future MCP tool for that same capability should call — worth
keeping in mind when writing these contracts, even though this plan's
own scope is frontend-only.

---

## 28. QUALITY GATES

Before a wave is considered complete, verify:

- **Responsive** — all 3 breakpoints, per [Section 24](#24-responsive-implementation)'s wave-specific rules
- **Accessible** — spot-checked against
  [design-system-v1.md §26](design-system-v1.md#26-accessibility)
  (keyboard nav, visible focus, contrast, `aria-label` on icon buttons)
- **Realistic data** — mock data reflects [Section 7](#7-mock-data-architecture)'s relationship model; no orphaned/inconsistent records
- **Loading / Empty / Error / Success / Permission states** — every
  screen demonstrates all five, per
  [design-system-v1.md §24](design-system-v1.md#24-empty--loading--error-states)
  — a wave showing only its happy path is not done
- **No console errors**
- **No broken routes** — every route in [Section 4](#4-route-architecture) resolves; no orphaned links
- **No visual inconsistencies** — spot-check against tokens; no raw hex/px values, no radius/spacing outside the defined scale
- **No duplicated component logic** — any pattern appearing twice uses the same shared component ([Section 6](#6-design-system-component-build-order)); reimplementing a Score badge or Table a second time fails this gate

---

## 29. IMPLEMENTATION ORDER

Master schedule — every wave, with objective/components/screens/
dependencies/mock data/expected result. Detail for each wave is in its
own section above; this is the consolidated view.

| # | Wave | Objective | Key components | Key screens | Dependencies | Mock data | Expected result |
|---|---|---|---|---|---|---|---|
| 0 | Foundation | Tokens, mock architecture, service boundary, state management exist | Tier 0 tokens | — | None | `mock/` skeleton | Nothing renders yet, but everything else can build on solid ground |
| 1 | App Shell + Navigation | Every screen has somewhere to live | Sidebar, top bar, breadcrumbs, 3 switchers, command palette | — | §0 | `mock/users`, `mock/organizations` | Empty shell navigable end-to-end |
| 2 | Core Components | Reusable primitives/core exist | Tier 1–2 | — | §0 | — | Button/Input/Card/Table etc. usable everywhere |
| 3 | Shared Product Patterns | Intelligence vocabulary exists | Tier 3–4, `IntelligenceCard` | — | §2 | `mock/intelligence` | One coherent visual language ready for every wave |
| 4 | Individual | DISCOVER fully navigable | List/search/filter patterns | Prospects, Spy, Trends, Dropped, Favorites, Dashboard | §1–3 | `mock/prospects`, `mock/competitors`, `mock/trends` | The one already-shipped surface, re-skinned and proven |
| 5–6 | Connected Shop + Optimization | Full shop-health/optimization loop demoable | `ConnectShopFlow`, Optimization state machine | Connected Shop workspace, Optimization pages | §3–4 | `mock/shops` (ConnectedShop), `mock/recommendations` | Every OPERATE state, including edge cases, demoable |
| 7 | Agency | Full Agency operating loop demoable | `WorkspaceSwitcher`/`ScopeSwitcher`, client-connect flow | Agency dashboard, Client list/detail | §5–6 | `mock/organizations` (Agency), Client chain | Onboard→Connect→Optimize→Report loop demoable |
| 8 | Institute | Full Institute operating loop demoable | Cohort/Student patterns | Institute dashboard, Cohort/Student detail | §7 | `mock/organizations` (Institute), Cohort chain | Enroll→Connect→Track loop demoable |
| 9 | Intelligence (verify) | Cross-context consistency confirmed | — (verification only) | Spot-checks across §4–8 | §3–8 | — | Zero divergent score/issue/alert rendering |
| 10 | AI | Full AI loop demoable, incl. unavailable-capability state | `AIPanel`, `CommandPalette` | Global + contextual AI | §6, 9 | `mock/ai` | Ask→Result→Act loop demoable, never generic-chatbot-feeling |
| 11 | Reporting | Reports demoable across every context | Report components | Report hub/detail/share | §6–8, 10 | `mock/reports` | Individual/Agency/Institute reports all demoable |
| 12 | Billing | Every subscription state demoable | Billing state gallery | Checkout (re-skin), Subscription, states | §2 | `mock/billing` | Full billing lifecycle demoable without real Stripe/PayPal events |
| 13 | Settings | Full settings hierarchy demoable | Settings shell | 11 category pages, incl. Developer & Integrations (AI/MCP, mock) | §2 | Various | Every settings category reachable and functional |
| 14 | Admin | Separate admin product demoable | Admin shell | Full Admin tree, incl. Affiliate Program console (mock ledger) | §0–2 | `mock/admin` | Admin fully separate from customer nav, department-scoped views work |
| 15 | Email Designer | Template editor demoable | Editor shell | Template list/editor/preview | §2 | New email mock module | Full editor loop demoable, fully mock |
| 16 | CMS/Marketing | Public site demoable | Marketing patterns | Homepage, Solutions, Pricing, Resources | §2 | Minimal | Public site on the new design system |
| 17 | SEO/AEO/GEO | Metadata/structured data wired | — (applied within §16) | — | §16 | — | Every public page has real metadata/JSON-LD |
| 18 | Responsive/Mobile | Every wave usable on mobile per its priority | — (applied across all) | — | §4–17 | — | Per [Section 24](#24-responsive-implementation)'s priority table |
| 19 | Polish | Final QA pass | — | — | §0–18 | — | [Section 28](#28-quality-gates) gates pass everywhere |

---

## 30. TOKEN / COST EFFICIENCY

**[PLAN DECISION]** Rules for keeping future implementation prompts
small and cheap, since multiple AI coding tools will work across this
plan over time:

- **Source-of-truth files, each scoped to a question, not "everything":**
  - This document → sequencing ("what do I build next, in what order")
  - [design-system-v1.md](design-system-v1.md) → tokens/components ("what does this look like")
  - [information-architecture-v1.md](information-architecture-v1.md) → structure/routing ("where does this live")
  - [complete-product-surface.md](../product/complete-product-surface.md) → capability status ("is this real or should it be mocked")
- **Component conventions** — once [Section 6](#6-design-system-component-build-order)'s
  tree exists, future prompts cite "reuse existing components in
  `src/components/`," not a re-description of what a Button looks like
  — the components themselves supersede the prose spec once built.
- **Route conventions** — cite the specific route group from
  [Section 4](#4-route-architecture) (PUBLIC/CUSTOMER/AGENCY/etc.), not
  the whole tree.
- **Mock-data conventions** — new mock entities go into the relevant
  existing `mock/*` module per [Section 7](#7-mock-data-architecture),
  never as a new scattered array.
- **Prompt boundaries** — scope each implementation prompt to **one
  wave**, or one screen within a wave, citing only: (a) this document's
  relevant wave section, (b) the specific design-system-v1 component
  specs needed, (c) the specific mock module involved. Example: a
  well-scoped prompt for "build the Client detail page" cites
  [Section 12](#12-agency-wave) + the `IntelligenceCard`/`StatBlock`
  specs + `mock/organizations` + `mock/shops` — three targeted
  references, not five full documents.
- **How future agents should read docs before modifying code**: read
  this document's relevant wave section and design-system-v1.md's
  relevant component sections. Do not re-read `MASTER_BLUEPRINT.md` or
  `complete-product-surface.md` in full — consult them only for a
  specific status-verification question ("is X actually built already")
  via targeted search, never a full re-read.

---

## FRONTEND IMPLEMENTATION PHASES

| Phase | Waves | Focus |
|---|---|---|
| 1 | 0–3 | Foundation & Shell |
| 2 | 4 | Individual Experience |
| 3 | 5–6 | Connected Shop & Optimization |
| 4 | 7–8 | Agency & Institute |
| 5 | 9–10 | Intelligence Verification & AI |
| 6 | 11–12 | Reporting & Billing |
| 7 | 13–14 | Settings & Admin |
| 8 | 15–17 | Email Designer, CMS & SEO |
| 9 | 18–19 | Responsive & Polish |

---

## FIRST IMPLEMENTATION TASK

**Implement the Section 3 color tokens, Section 4 typography scale, and
Section 5/7 spacing/radius/shadow scales from
[design-system-v1.md](design-system-v1.md) as CSS custom properties in
`src/app/globals.css`, and extend `tailwind.config.ts`'s theme to
reference them — following the exact naming convention in
[design-system-v1.md §27](design-system-v1.md#27-design-tokens-implementation).**

Do not modify any component, page, or route in this task. This is the
smallest task that unblocks everything else — every component built
afterward depends on these tokens existing — every value needed is
already fully specified, and it requires no new architecture decisions.

**Verification**: run `npm run dev` and confirm the existing app still
renders (colors will visibly shift to the new palette; layout and
functionality must not break) with zero console errors.

---

## DEFINITION OF DONE

**Per-wave** (gate before moving to the next wave): all
[Section 28](#28-quality-gates) criteria pass for every screen in that
wave.

**Overall** (the frontend simulator is complete): every product area
from [complete-product-surface.md](../product/complete-product-surface.md)'s
Screen Inventory is reachable; every one of the nine demo roles from
[Section 8](#8-demo--role-switching) is fully demonstrable; zero broken
routes across [Section 4](#4-route-architecture); zero console errors;
full responsive coverage per [Section 24](#24-responsive-implementation)'s
per-wave priorities; mock data is internally consistent per
[Section 7](#7-mock-data-architecture)'s relationship model; no
component-logic duplication anywhere in the build.

---

## STATUS

## READY FOR FRONTEND IMPLEMENTATION

**Why**: every section requested has a concrete build order grounded in
verified, real facts about the current codebase (not assumed) — Section
2's KEEP/REFACTOR/REPLACE/DEPRECATE classification was checked directly
against the repository, including the discovery that no shared
component/hooks/API-client layer currently exists, which this plan
treats as the foundational first task rather than glossing over. The
mock-data architecture and the Component→Service→Mock/Real boundary
([Sections 7](#7-mock-data-architecture), [27](#27-backend-integration-boundary))
are specific and mechanically well-defined, making the eventual
real-backend swap a function-body change, not a rewrite. Every
gap the IA Journey Validation found (the client-initiated connect flow,
the AI-unavailable state, the first-scan moment) has an explicit,
named place it gets built. The first implementation task is genuinely
the smallest useful unit of work, has no open decisions blocking it, and
is independently verifiable.

As with every prior status conclusion in this documentation set, this
is not claimed merely because the plan exists: the plan is honest about
what remains genuinely undecided at the *product* level (Progress's
definition, Seat allocation mechanics, `Organization.kind`) and
prescribes exactly how the frontend should represent that
undecided-ness (visible "illustrative" caveats) rather than pretending
those decisions are settled.

---

## Git status

```
On branch main
Untracked files:
	docs/
nothing added to commit but untracked files present
```

**Files created this task**: `docs/design/frontend-execution-plan-v1.md`
only. **No other file was modified.** `src/`, `prisma/`, `package.json`,
and `package-lock.json` all remain unchanged — confirmed via
`git status --porcelain` on each path. No application code, Prisma
schema, migrations, dependencies, or deployment were touched. Nothing
was committed or pushed.
