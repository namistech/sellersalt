# SellerSalt — Agent Handoff

Read this file first. It is the fastest path to being productive in this
repository. Everything here is verified against the actual code as of
2026-08-19, not aspirational.

## CURRENT IMPLEMENTATION CHECKPOINT (2026-08-19)

Read this section first if you're picking up work cold — it's the
condensed version of everything else in this file, current as of the
Keyword Research / Category Hunting / SEO Audit marketplace-context batch
and the documentation-synchronization pass that followed it.

**Architecture** (`src/marketplaces/core/` — canonical, don't rebuild):
`MarketplaceConnector` interface (`interfaces.ts`) · `MarketplaceRegistry`
+ `registerAllConnectors()` (`registry/index.ts`) · capability flags
(`capabilities.ts`, `MarketplaceCapabilities`) · research pipeline
(`research-pipeline.ts` — `runMarketResearch`/`runProductResearch`/
`runAllMarketplaceProductResearch`/`fanOutMarketplaceRequest<T>()`) ·
optimization rules (`optimization-rules.ts` — `getOptimizationRules`,
`MarketplaceOptimizationRules`, Etsy the only marketplace with real
values) · normalized research types (`types.ts` — `NormalizedProduct`,
`Listing`, `Order`, `MarketplaceId`, `marketplaceFromSellerChannelPlatform`).

**Implemented (marketplace-aware) intelligence surfaces** — all four wired
functionally (real state → real API call → capability-aware empty state,
not decorative):
- **Product Research / Prospects** (`/prospects`) — the original flagship;
  `POST /api/marketplaces/research` fans out via
  `runAllMarketplaceProductResearch`.
- **Keyword Research** (`/keyword-research`) — `POST /api/keywords/search`;
  "All Marketplaces" via `fetchAllMarketplaceKeywordResearch`.
- **Category Hunting** (`/categories`) — `GET /api/categories`; "All
  Marketplaces" via `fetchAllMarketplaceCategoryTree` (free-text search
  stays single-marketplace only — nothing meaningful to merge across
  independent taxonomies).
- **SEO Audit / Draft Playground** (`/seo`, Draft Playground tab only) —
  `POST /api/seo/audit` resolves rules via `getOptimizationRules`, derived
  from a connected `SellerChannel` when one is picked, else a manual
  `MarketplaceSelector` choice. Live Listing/Shop SEO tabs stay Etsy-only
  (they only ever fetch real live Etsy data).

**Marketplace capability matrix** (full detail:
`docs/MARKETPLACE-INTEGRATION-MATRIX.md` — this is the summary):

| Marketplace | Research/Keyword/Category | SEO Rules | Account Connect | Status |
|---|---|---|---|---|
| Etsy | IMPLEMENTED (real Open API v3) | IMPLEMENTED (real 140/13/20 + fees) | IMPLEMENTED (OAuth PKCE) | Live, production |
| Shopify | NOT IMPLEMENTED | NOT IMPLEMENTED (`null` rules) | IMPLEMENTED (OAuth, admin-only) | PARTIAL — account/orders only |
| WooCommerce | NOT IMPLEMENTED | NOT IMPLEMENTED (`null` rules) | IMPLEMENTED (OAuth/manual keys, admin-only) | PARTIAL — account/orders only |
| Amazon | NOT IMPLEMENTED | NOT IMPLEMENTED (`null` rules) | NOT IMPLEMENTED | ARCHITECTURE READY — no credentials |
| eBay | NOT IMPLEMENTED | NOT IMPLEMENTED (`null` rules) | NOT IMPLEMENTED | ARCHITECTURE READY — no credentials |
| TikTok Shop | NOT IMPLEMENTED | NOT IMPLEMENTED (`null` rules) | NOT IMPLEMENTED | ARCHITECTURE READY — no credentials |

**Important architectural boundaries — do not blur these:**
- **A `MarketplaceSelector` on a page ≠ that marketplace being
  implemented.** All four surfaces above let a user pick Amazon/eBay/
  TikTok Shop; picking one returns a structured `NOT_IMPLEMENTED`/
  `CapabilityUnavailable` response, never fabricated data. UI wiring and
  capability status are different facts — see `docs/SELLERSALT-
  ARCHITECTURE.md`'s "Marketplace-aware UI vs. marketplace capability vs.
  implementation" section.
- **`ARCHITECTURE READY` ≠ `IMPLEMENTED`.** Never flip a capability flag
  to `true` without a real, working implementation behind it.
- **Never fabricate unsupported data.** A capability gap returns a
  structured unavailable/not-implemented object, never an empty-looking
  "0 results" or a guessed number.
- **Listing Studio / cross-marketplace listing creation remains
  Etsy-only**, by schema design (`ListingDraft` has Etsy-specific field
  comments and columns — `etsyListingId`, `etsyDraftUrl`) — not a wiring
  gap to close.
- **Real marketplace credentials are required before any capability flag
  can go `true`** for Amazon/eBay/TikTok Shop — this is an external
  dependency (developer-program applications), not something more code
  in this repo can resolve.

**Plan-tier quota enforcement is now real** (2026-08-19, launch-blocker
fix): `checkQuota()` (`src/services/plans/quota-enforcement.ts`) existed
correctly but had zero live call sites — every plan's headline paid
differentiators were unlimited for every tier including Free. Now wired
into all 5 routes, gating before the expensive operation and after the
existing auth check, using the existing `403 { error }` convention already
used by `src/lib/plan-limits.ts`'s `checkLimit()`:

| Route | Quota action |
|---|---|
| `POST /api/keywords/search` | `KEYWORD_SEARCH` |
| `GET`/`POST /api/products/search` | `PRODUCT_RESEARCH` |
| `POST /api/seo/audit` | `SEO_AUDIT` |
| `POST /api/studio/generate` | `AI_GENERATION` |
| `POST /api/planner/items` | `PLANNER_ITEM` (checked only on the real creation path — the pre-existing idempotent "already saved" return is never blocked) |

Also two SaltBot tools fixed the same day (`src/services/assistant/
tool-registry.ts` — `search_products`, `explore_category`,
`search_keywords`): they used to silently return hardcoded fallback data
tagged `ACTUAL_ETSY_DATA` on any upstream failure. Now they report a real
`success: false` + error, matching every other tool in the registry.

**Known caveat, not fixed this pass**: `checkQuota`'s `KEYWORD_SEARCH`/
`PRODUCT_RESEARCH` "current usage" is counted from `Prospect` row
creation dates — but neither `/api/keywords/search` nor `/api/products/
search` actually creates `Prospect` rows (only the separate, async
Prospects worker does). The blocking arithmetic is real and enforced, but
for these two actions specifically it measures worker-collected research
volume, not live per-search usage from these two routes. Flagged, not
redesigned, per explicit scope for this pass.

**Plan/usage visibility is now honest end-to-end** (2026-08-19, same-day
follow-up): `PlanUsageCard` (`dashboard-client.tsx`) shows the org's real
plan name and real usage/limits via a new `getPlanUsageSummary()`
(`src/services/plans/quota-enforcement.ts`) — no default props, an
explicit "unavailable" state when data can't load, never a fabricated
number. `PLAN_DEFINITIONS` (`plan-capabilities.ts`) is now the single
authoritative source for product-research quota everywhere a user can see
it — pricing page, checkout page, marketing homepage, and the in-app
billing page all previously showed independently-drifted numbers for
this one metric (`Package.maxProspectsPerMonth`: 15/500/5000/50000 vs.
`PLAN_DEFINITIONS.monthlyProductResearches`: 10/150/1000/10000, already
publicly promised and the one now actually enforced) — all four now agree.
`checkLimit`'s old `"prospectsThisMonth"` resource (display-only, never
actually enforced) was removed rather than left to drift again.
`trackedCompetitorShops`/`connectedEtsyStores` already agreed between both
systems and were left as-is, now with a regression test guarding against
future drift instead of a code restructure. Pricing page's feature
comparison table (`pricing-client.tsx`) also had its own second, fully
hardcoded copy of these same numbers a few hundred lines under the
already-live plan cards — now derived from `PLAN_DEFINITIONS` too.

**Onboarding activation flow & routing completed** (2026-08-19, launch-readiness pass):
- Real `User` fields added (`onboardingCompletedAt`, `onboardingCategory`,
  `onboardingGoal`, `onboardingNiche`).
- `POST /api/onboarding/complete` persists real onboarding choices to the
  `User` model with input validation and session auth.
- `/onboarding` has a server-side guard bouncing completed users to
  `/dashboard` (unauthenticated to `/login`).
- `checkout-client.tsx` routes new free signups to `/onboarding` and
  existing logins to `/dashboard`.
- `dashboard/page.tsx` fetches onboarding state and `ListingDraft` count
  server-side; `DashboardOnboardingGuide` computes checklist completion
  from real props (`onboardingCategory`, `onboardingGoal`, `hasListingDraft`),
  eliminating `localStorage` for business facts.

**Validation baseline** (independently re-run for this checkpoint):
- Tests: **724/724 passing** (`npx tsx --env-file=.env.local --test src/tests/*.test.ts`)
- TypeScript: clean (`npx tsc --noEmit`)
- Prisma: valid, migrations up to date (`npx prisma validate` / `migrate status` — 29 migrations)
- Build: clean (`npx next build`)

**Next engineering task**: Amazon/eBay/TikTok Shop real API credential
applications (Phase 7). `handleShopWatchJob`'s old-registry migration (see
`AGENTS.md` §19) remains real, lower-priority technical debt — no
user-facing/revenue impact.

## What is SellerSalt?

An ecommerce intelligence platform. Its product surface is Etsy-focused
today (the only marketplace with a live, working integration), but its
**architecture** (`src/marketplaces/`) is marketplace-agnostic by design —
Etsy, Shopify, WooCommerce, Amazon, eBay, and TikTok Shop are all
*connectors* into one shared intelligence layer, not the identity of the
app. See `docs/SELLERSALT-ARCHITECTURE.md` for the full model.

## What exists right now?

- **Etsy**: fully live — OAuth PKCE seller-shop connection, market research
  (product/keyword/category search via the platform-owned connector),
  gated listing-draft creation (human approval required before any push),
  order sync, SEO audit, AI listing generation with an originality gate.
- **Shopify / WooCommerce**: real OAuth + order sync only. No research, no
  listing read/write. Admin-only in the current product (customer-facing
  gate is a deliberate MVP-scope decision, not a bug).
- **Amazon / eBay / TikTok Shop**: registered in the marketplace registry
  with the correct interface shape, zero live capabilities, no
  credentials. Every method throws a clear `MarketplaceNotImplementedError`
  rather than returning empty/fake data.
- **Multi-tenant SaaS foundation**: orgs, packages/plan limits, billing
  (Stripe + PayPal, real), admin console, 2FA/passkeys, email verification
  — all real, all pre-dating the marketplace work below.

## What was just built (this development arc, 2026-08-19)

In order, each verified with a full test/build pass before moving on:

1. **Etsy Commercial API compliance remediation** — Etsy's Commercial
   Access application was declined. Fixed: removed unused OAuth scopes
   (`shops_w`, and `billing_r` — which turned out not to be a real Etsy
   scope at all), removed the Chrome extension's Etsy-page DOM read/write
   entirely (not just disabled), removed "spy/surveillance/stalk"
   terminology from user-visible surfaces, bounded snapshot retention to
   the product's own actual need (not an invented Etsy rule), fixed a
   forensic audit of the actual homepage/app-description gaps.
2. **Marketplace abstraction layer** (`src/marketplaces/core/`) — unified
   two pre-existing, narrower connector patterns
   (`src/connectors/`=platform research, `src/seller-channels/`=OAuth
   accounts) into one `MarketplaceConnector` interface with explicit
   capability flags, a central registry, canonical types
   (`NormalizedProduct`, `Listing`, `Order`, etc.), and per-marketplace
   adapters for all six marketplaces above.
3. **Research pipeline migration** — `/api/products/search`,
   `/api/keywords/search`, `/api/categories`, and the scheduled Prospects
   worker now check marketplace capabilities via the registry before doing
   Etsy-specific work, returning a structured "not available" response
   instead of crashing for unsupported marketplaces. Etsy's actual
   behavior is unchanged (verified byte-identical via the pre-existing
   test suite).
4. **All-Marketplaces UX** — a real "All Marketplaces" selector option
   (`POST /api/marketplaces/research`) that fans a search out across every
   registered connector in parallel, rendering each marketplace's own
   AVAILABLE/PARTIAL/UNAVAILABLE/NOT_IMPLEMENTED status — one connector
   failing never hides another's results.
5. **SEO engine parameterization** — `auditListingSeo` now takes an
   optional `MarketplaceOptimizationRules` argument instead of hardcoding
   Etsy's 140-char/13-tag/20-char limits; Etsy's default behavior is
   unchanged (verified by test).
6. **Keyword Research, Category Hunting, and SEO Audit made genuinely
   marketplace-aware** — the three surfaces flagged as "not yet done" in
   an earlier pass are now wired, not just decorative:
   - `/keyword-research` and `/categories` both got a functional
     `MarketplaceSelector` (single marketplace + "All Marketplaces"),
     backed by new `fetchAllMarketplaceKeywordResearch`/
     `fetchAllMarketplaceCategoryTree` fan-outs that reuse the same
     generic `fanOutMarketplaceRequest<T>()` helper the Prospects page's
     fan-out already used — one implementation, three call sites. A
     `CapabilityUnavailable` response renders as an honest "not available
     yet" state, never a fabricated result.
   - `POST /api/seo/audit` resolves and returns the marketplace it scored
     against; the `/seo` Draft Playground tab shows dynamic title/tag
     targets from `getOptimizationRules(marketplace)` instead of a
     hardcoded Etsy 140/13, and offers an optional "Connected Store"
     picker — when a real `SellerChannel` is selected, that channel's
     actual platform (org-scoped, via
     `resolveMarketplaceForAudit` in `src/services/seo-engine.ts`) is
     authoritative over a manually-picked marketplace. Etsy's Live
     Listing/Shop SEO tabs are untouched (still real, Etsy-only fetches).
7. **This documentation pass.**

## What should I NOT touch?

- **Etsy's actual OAuth scopes, connector logic, or draft-approval gate**
  (`src/marketplaces/etsy/connector.ts`, `src/services/etsy-execution/`).
  The human-approval-before-publish rule is a permanent compliance
  decision, not a WIP limitation.
- **The removed browser-extension Etsy DOM code.** Do not re-add
  `*.etsy.com` host permissions or a content script that reads/writes
  Etsy's page DOM without written authorization from Etsy — this was
  removed for a real, documented policy reason
  (`docs/SELLERSALT-ARCHITECTURE-AUDIT.md`).
- **`MarketplaceCapabilities` flags** — never flip one to `true` without a
  real, working implementation behind it. A stub connector with an honest
  all-false capability set is the correct state for Amazon/eBay/TikTok
  Shop today; do not "help" by marking something available to make a
  dashboard look more complete.
- **Multi-tenant `organizationId` scoping** on any query — this is a
  security boundary, not a convention.
- **The prior Etsy compliance terminology fixes** — don't reintroduce
  "spy"/"surveillance"/"stalk" into user-visible copy.

## What is broken?

Nothing known. Current baseline (§ below) is all-green. Known gaps (not
"broken", just not done — see `docs/SELLERSALT-ROADMAP.md` and the
technical-debt list) are things that were never claimed to work.

## What is next?

See `docs/SELLERSALT-ROADMAP.md`. The "All Marketplaces" mode and
marketplace-aware SEO rules are now wired into Prospects, Keyword
Research, Category Hunting, and the SEO Audit (Phases 3/4 both DONE).
Remaining marketplace-architecture work is external-dependency-gated
(Phase 7 — real Amazon/eBay/TikTok Shop credentials) or scoped-out by
design (Listing Studio's actual draft-generation/push flow stays
Etsy-only — see `AGENTS.md` §15's `ListingDraft` note).

## What commands should I run?

```bash
npx tsc --noEmit                 # typecheck
npx prisma validate              # schema syntax
npx prisma migrate status        # pending migrations against the connected DB
npx tsx --env-file=.env.local --test src/tests/*.test.ts   # full test suite
npx next build                   # production build
```

`.env.local`'s `DATABASE_URL` points at the **staging** Postgres instance
(`sellersalt_staging`) — never production. See root `CLAUDE.md` for the
full infrastructure map (Coolify resource names, server IPs, migration
discipline) if you need to touch deployment.

## What files are architecturally important?

| File | Why |
|---|---|
| `src/marketplaces/core/interfaces.ts` | The `MarketplaceConnector` contract every marketplace implements |
| `src/marketplaces/core/registry/index.ts` | Single source of truth for "what can marketplace X do" |
| `src/marketplaces/core/capabilities.ts` | The capability flags — never assert one without a real implementation |
| `src/marketplaces/core/research-pipeline.ts` | `runMarketResearch`/`runProductResearch`/`runAllMarketplaceProductResearch` — the marketplace-neutral orchestration entry points |
| `src/marketplaces/core/optimization-rules.ts` | Per-marketplace listing constraints (title/tag limits) — Etsy has real values, everyone else is `null` |
| `src/marketplaces/<id>/connector.ts` | One adapter per marketplace |
| `src/services/seo-engine.ts`, `src/services/listing-generation.ts` | Rule-consumers — accept `MarketplaceOptimizationRules`, default to Etsy |
| `prisma/schema.prisma` | `SellerChannel`/`Connector` + their platform/type enums are the DB-level marketplace identity |

## What decisions have already been made?

- Etsy stays the only customer-facing, fully-live marketplace for now —
  intelligence architecture is marketplace-neutral, the *product* isn't
  forced to be multi-marketplace yet.
- Shopify/WooCommerce/cross-listing stay admin-only (founder decision,
  documented in root `CLAUDE.md`'s "MVP scope decision").
- No fabricated connectors, ever — a marketplace without real credentials
  is `ARCHITECTURE READY`, never `IMPLEMENTED`.
- No silent AI publish — every AI-generated Etsy listing requires human
  approval before it can be pushed live. Permanent, not provisional.
- Etsy trial pricing was disabled on staging (nulled `Package.trialDays`),
  not deleted — reversible via `/admin`.

## What should I read next?

1. `docs/SELLERSALT-ARCHITECTURE.md` — canonical architecture (start here for "how does this actually work")
2. `docs/MARKETPLACE-INTEGRATION-MATRIX.md` — exact per-marketplace capability status
3. `docs/SELLERSALT-MARKETPLACE-ARCHITECTURE.md` — deep technical reference for `src/marketplaces/`
4. `docs/SELLERSALT-ROADMAP.md` — what's next, phase by phase
4. `docs/CHANGELOG.md` — how we got here, and why
5. `docs/SELLERSALT-ARCHITECTURE-AUDIT.md` — the Etsy compliance forensic audit (historical, still useful context)
6. `AGENTS.md` — non-negotiable engineering rules for any agent working in this repo
7. Root `CLAUDE.md` — infrastructure/deployment specifics (Coolify, servers, DNS) not covered above

## Current verified baseline

As of the Launch Readiness & Onboarding Completion batch (2026-08-19),
independently re-run (not copied from an earlier report):

- Tests: **724/724 passing** (`npx tsx --env-file=.env.local --test src/tests/*.test.ts`)
- TypeScript: clean (`npx tsc --noEmit`)
- Prisma: valid, migrations up to date (`npx prisma validate` / `migrate status` — 29 migrations)
- Build: clean (`npx next build`)

If these numbers differ when you run them yourself, trust your own run —
this file is a snapshot, not a live dashboard.
