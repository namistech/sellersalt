# AGENTS.md — SellerSalt Agent Context

Welcome to the SellerSalt repository. This file is the canonical
instruction set for any AI coding agent (Claude, Gemini, Antigravity, or
otherwise) working in this codebase. Read it fully before making changes.

For a faster, more practical "what do I do right now" version, read
**`docs/SELLERSALT-HANDOFF.md`** first — this file is the fuller reference
it links back to.

---

## 1. Product Identity

SellerSalt is **the Ecommerce Intelligence Platform**. It is not an
Etsy-only application, an "Etsy competitor spy tool," or a scraper —
those were all real risks the codebase has been deliberately steered away
from (see §10).

Its purpose is to help ecommerce merchants:
- discover what to sell and where to sell it
- research products, keywords, and categories
- understand market opportunity, demand, and competition
- optimize listings and shops
- synchronize their own connected marketplace business data
- eventually grow sales across multiple commerce ecosystems

**Marketplaces are data sources and distribution channels. SellerSalt's
intelligence layer is the product.** Never let a feature's implementation
quietly become Etsy-only in a place where the architecture says otherwise
(see `src/marketplaces/core/`).

## 2. Marketplace Strategy

Currently registered in `src/marketplaces/core/registry/`:

| Marketplace | Status |
|---|---|
| Etsy | IMPLEMENTED (research, orders, gated listing write) |
| Shopify | PARTIAL (account + orders only) |
| WooCommerce | PARTIAL (account + orders only) |
| Amazon | ARCHITECTURE READY (no credentials) |
| eBay | ARCHITECTURE READY (no credentials) |
| Walmart | ARCHITECTURE READY (no credentials) |
| TikTok Shop | ARCHITECTURE READY (no credentials) |

The architecture must remain extensible to Walmart, Noon, Flipkart, Amazon
India, and other regional marketplaces later — **do not pre-register them
in code until there's a real integration to back the entry.** Adding a
marketplace to the registry with all-false capabilities is fine
(architecture-ready); adding one that doesn't exist in the registry at all
because "we'll get to it" is also fine. What's not fine is a capability
flag that doesn't match reality in either direction.

See `docs/MARKETPLACE-INTEGRATION-MATRIX.md` for the authoritative,
code-verified status table — regenerate it from actual capability flags
whenever they change, don't hand-edit it out of sync with the code.

## 3. Core Architecture

```
src/marketplaces/
  core/
    types.ts              canonical entities (Listing, Order, NormalizedProduct, ...)
    capabilities.ts        MarketplaceCapabilities flags
    interfaces.ts            the MarketplaceConnector contract
    errors.ts                  capability/not-implemented error types
    optimization-rules.ts        per-marketplace listing constraints
    opportunity-engine.ts          scoring envelope (wraps universal-scoring.ts)
    research-pipeline.ts             Request -> Provider -> Dataset -> Insight
    availability.ts                    CapabilityUnavailable structured responses
    registry/                            MarketplaceRegistry + registerAllConnectors()
    normalizers/                           marketplace-shape -> canonical-shape mappers
  etsy/connector.ts        IMPLEMENTED
  shopify/connector.ts     PARTIAL
  woocommerce/connector.ts PARTIAL
  amazon/connector.ts      ARCHITECTURE READY (stub, throws not-implemented)
  ebay/connector.ts        ARCHITECTURE READY (stub, throws not-implemented)
  tiktok-shop/connector.ts ARCHITECTURE READY (stub, throws not-implemented)
```

**Marketplace connectors** (`src/marketplaces/<id>/connector.ts`) talk to
one marketplace and normalize its data into canonical shapes. They contain
marketplace-specific logic and nothing else.

**SellerSalt intelligence engines** (`src/services/intelligence/`,
`src/services/seo-engine.ts`, `src/services/listing-generation.ts`, etc.)
consume canonical data and marketplace *rules* (not marketplace *code*).
They must never import a connector directly or hardcode a marketplace's
constraints as if universal — see `MarketplaceOptimizationRules` (§9).

Full technical reference: `docs/SELLERSALT-MARKETPLACE-ARCHITECTURE.md`.
Full canonical architecture (product → intelligence → connectors):
`docs/SELLERSALT-ARCHITECTURE.md`.

## 4. Connected Business Data vs. Market Research

Two fundamentally different concepts. Do not collapse them.

**Connected business data** — a merchant's own authorized data (their own
listings, orders, shop info, inventory/analytics where supported). Requires
marketplace OAuth. Lives behind `SellerChannel` (Prisma) /
`getShops`/`getOrders`/`createListing` on a `MarketplaceConnector`.

**Market research** — public marketplace data (products, categories,
keywords, demand/competition/price signals). Does **not** require the
merchant to connect their own shop. Lives behind the platform-owned
`Connector` (Prisma, nullable `organizationId`) /
`searchPublicListings`/`searchProducts`/`getCategories` on a
`MarketplaceConnector`. Verified architecturally and by test
(`src/tests/marketplace-research-migration.test.ts`) that none of the
research services import from `src/seller-channels/*`.

## 5. Marketplace Registry

`src/marketplaces/core/registry/index.ts`'s `MarketplaceRegistry` is the
single source of truth for what a marketplace can do.

- Connectors register via `registerAllConnectors()` (idempotent, called at
  the top of any entry point that needs the registry — routes, workers,
  tests).
- `MarketplaceRegistry.getConnector(id)` / `.tryGetConnector(id)` /
  `.list()` / `.listActive()` (only connectors with ≥1 real capability).
- `assertCapability(connector, "research")` throws
  `MarketplaceCapabilityUnavailableError` for a capability-gate bypass —
  used for programming-error cases; the normal "not available yet" path
  returns a structured `CapabilityUnavailable` object instead (see
  `src/marketplaces/core/availability.ts`), so a route/UI can render it
  rather than crash.
- The UI never hardcodes a marketplace list — `GET /api/marketplaces`
  exposes the live registry to client components
  (`src/components/ui/MarketplaceSelector.tsx` fetches it).
- "All Marketplaces" fan-out: `runAllMarketplaceProductResearch()` /
  `POST /api/marketplaces/research` — runs the same request against every
  requested marketplace in parallel, each with an independent
  `AVAILABLE | PARTIAL | UNAVAILABLE | NOT_IMPLEMENTED` status. One
  connector failing/erroring never removes another's results.

## 6. Normalization

`NormalizedProduct` (`src/marketplaces/core/types.ts`) is the canonical,
marketplace-neutral product-research record — richer than the lighter
`SearchResult`/`Listing` types, carrying the shop/seller metrics
(reviews, sales, shop age) opportunity scoring needs.

**Never invent a value a marketplace didn't provide.** A missing field is
`null`/`undefined`, not `0` and not a guess. Missing signals reduce
confidence (`OpportunityScore.confidence`) or make a factor
`available: false` — they never silently become part of a plausible-looking
number. No Etsy-prefixed field name (`etsyShopId`, `etsyListingId`, etc.)
belongs in a canonical type — enforced by a repo-search test
(`src/tests/marketplace-research-migration.test.ts`).

## 7. Research Pipeline

`src/marketplaces/core/research-pipeline.ts` exports (verify current
signatures in code — this list can drift):

- `runMarketResearch(request)` — single marketplace, thin `SearchResult[]`.
- `runProductResearch(request)` — single marketplace, rich
  `NormalizedProduct[]`, returns the 4-state status envelope.
- `runAllMarketplaceProductResearch(marketplaces, request)` — fan-out,
  array of per-marketplace `ProductResearchResult`.
- `runOpportunityResearch(request)` — `runMarketResearch` + best-effort
  opportunity scoring per result (skipped, not fabricated, when there's
  insufficient data).
- `runMultiMarketResearch(marketplaces, request)` — the thinner
  multi-marketplace variant using `SearchResult`.
- `fanOutMarketplaceRequest<T>(marketplaces, fn)` — the generic version of
  the fan-out/status-classification logic the functions above use
  internally, extracted so other services don't reimplement it. Backs
  `fetchAllMarketplaceKeywordResearch` (`src/services/keyword-research.ts`)
  and `fetchAllMarketplaceCategoryTree` (`src/services/category-hunting.ts`)
  — reuse this before writing a new fan-out anywhere else.

Every entry point registers connectors, resolves the target
connector(s), checks capabilities, and — critically — **catches
per-connector errors internally** so one marketplace's failure (missing
credentials, network error, thrown exception) becomes an `UNAVAILABLE`
status object, never an exception that takes down a `Promise.all` batch or
a route.

## 8. Intelligence Engines

| `src/services/intelligence/product-opportunity-workspace-engine.ts` | **Product Opportunity Workspace Engine** — orchestrates end-to-end Opportunity → Sourcing → Launch Intelligence workspace | Multi-marketplace, public web primary | **Canonical, Live** |
| `src/services/intelligence/unit-economics-scenario-engine.ts` | **Unit Economics Scenario Engine 2.0** — models Conservative, Base, and Optimistic financial sensitivity scenarios | User-input grounded, zero synthetic costs | **Canonical, Live** |
| `src/services/intelligence/launch-readiness-engine.ts` | **Launch Readiness Engine** — multi-dimensional assessment across 10 commercial readiness vectors | Marketplace-neutral | **Canonical, Live** |
| `src/services/intelligence/commercial-decision-tree.ts` | **Commercial Decision Tree** — deterministic verdict engine (`PURSUE`, `INVESTIGATE`, `TEST`, `WAIT`, `REJECT`) | Marketplace-neutral | **Canonical, Live** |
| `src/services/intelligence/product-attribute-intelligence.ts` | **Product Attribute Intelligence Engine** — observable attribute prevalence %, seller concentration, and median price association | Multi-marketplace | **Canonical, Live** |
| `src/services/intelligence/differentiation-builder-2.ts` | **Differentiation Builder 2.0** — builds concrete differentiation candidates from saturated vs gap attribute clusters | Marketplace-neutral | **Canonical, Live** |
| `src/services/intelligence/market-positioning-engine.ts` | **Market Price Positioning Engine** — empirical quantiles ($P_{10}, P_{25}, P_{50}, P_{75}, P_{90}$) and 5 strategic positioning tiers | Marketplace-neutral | **Canonical, Live** |
| `src/services/intelligence/autonomous-discovery-engine.ts` | **Autonomous Opportunity Discovery Engine** — orchestrates broad multi-marketplace discovery ("Discover For Me"), seed expansion, detection rules, and persistence | Multi-marketplace, public web primary | **Canonical, Live** |
| `src/services/intelligence/opportunity-scoring-3.ts` | **Opportunity Scoring 3.0** — multi-factor deterministic scoring (Demand, Competition, Momentum, Differentiation, Price, Evidence Depth) | Marketplace-neutral | **Canonical, Live** |
| `src/services/intelligence/product-idea-engine.ts` | **Product Idea Engine** — evidence-grounded product synthesis distinguishing observed metrics and derived strategy angles | Marketplace-neutral | **Canonical, Live** |
| `src/services/intelligence/opportunity-radar-2.ts` | **Opportunity Radar 2.0 Feed Engine** — categorizes opportunities into 7 structured decision sections with pulse statistics | Marketplace-neutral | **Canonical, Live** |
| `src/services/intelligence/canonical-opportunity.ts` | **Canonical Opportunity Intelligence Engine** — evaluates multi-factor signal groups with explicit metric availability (`OBSERVED`, `ESTIMATED`, `DERIVED`, `UNAVAILABLE`), dynamic weight redistribution, and calibrated confidence | Marketplace-neutral, parameterizable by `MarketplaceOptimizationRules` | **Canonical, Live** |
| `src/services/intelligence/universal-scoring.ts` | Deterministic product/shop opportunity scoring | Fee schedule parameterized (defaults to Etsy's real fees) | Live, backwards-compatible |
| `src/marketplaces/core/opportunity-engine.ts` | Wraps canonical and universal scoring in an `available`/`confidence`-aware envelope (`scoreProductOpportunity`, `scoreNormalizedProductOpportunity`, `scoreShopCompetition`) | None | Live |
| `src/services/seo-engine.ts` | `auditListingSeo(input, rules?)` — title/tag/synergy/taxonomy audit | Rules-parameterized (`MarketplaceOptimizationRules`), Etsy default | Live, marketplace-neutral signature |
| `src/services/listing-generation.ts` | AI listing draft generation + `sanitizeTitle`/`sanitizeTags` | Rules-parameterized, Etsy default; AI prompt itself still Etsy-worded (only marketplace with live write) | Live |
| `src/services/originality-engine.ts` | N-gram/Jaccard similarity gate (<15% overlap) vs. source listing | None — pure text comparison | Live |
| `src/services/product-hunting.ts` | Etsy product search + its own 5-factor scoring (`computeProductOpportunity`) | Etsy-specific by design (own scoring engine for live search/radar) | Live |
| `src/services/keyword-research.ts` | Standalone keyword research/tag harvesting | Etsy-only implementation; marketplace-aware entry points (`fetchMarketplaceKeywordResearch` single, `fetchAllMarketplaceKeywordResearch` fan-out) wrap it; both wired into `/keyword-research` | Live |
| `src/services/category-hunting.ts` | Etsy buyer taxonomy exploration | Etsy-only implementation; marketplace-aware entry points (`fetchMarketplaceCategoryTree` single, `fetchAllMarketplaceCategoryTree` fan-out) wrap it; both wired into `/categories` | Live |
| `src/services/intelligence/opportunity-scoring.ts` | Old/superseded opportunity scoring engine | **Deprecated** — superseded by `canonical-opportunity.ts` | Deprecated (test compatibility only) |

## 9. Marketplace-Specific Rules

`src/marketplaces/core/optimization-rules.ts`'s `MarketplaceOptimizationRules`
holds title/tag/description/fee constraints per marketplace. **Etsy is the
only marketplace with real values** (140-char title, 13 tags, 20-char tag
max, real fee schedule) — every other marketplace has `null`/`false`
fields. Never invent a number for Amazon/eBay/TikTok Shop's constraints;
`null` means "unknown," and every consumer (`seo-engine.ts`,
`listing-generation.ts`, `universal-scoring.ts`) is written to skip that
dimension rather than guess when it sees `null`.

## 10. Etsy Compliance History

**Historical/architectural context — not the identity of the app.** Etsy's
Commercial API application was declined; a forensic remediation pass
followed. See `docs/SELLERSALT-ARCHITECTURE-AUDIT.md` (the original audit)
and `docs/CHANGELOG.md` for the full account. Summary, with status:

| Item | Status |
|---|---|
| Least-privilege OAuth scopes | **IMPLEMENTED** — `listings_w listings_r shops_r transactions_r` |
| Removal of `shops_w` | **IMPLEMENTED** — no feature ever needed it |
| Removal of `billing_r` | **IMPLEMENTED** — confirmed this was never a real Etsy v3 scope at all |
| Removal of surveillance/spy positioning | **IMPLEMENTED** across dashboard, marketing, emails, admin UI |
| Extension Etsy DOM-write removal | **IMPLEMENTED** — files deleted, not disabled |
| Data retention bounded | **IMPLEMENTED** — tied to `Package.maxTrackingDays`, not an invented Etsy rule |
| Disconnect cleanup | **IMPLEMENTED** — tokens + channel-specific records purged, independent drafts preserved |
| Human approval for AI/write | **IMPLEMENTED** — permanent design constraint |
| Encrypted token storage, PKCE, rate limiting | **IMPLEMENTED** (pre-existing) |
| Etsy trademark disclaimer | **IMPLEMENTED** — verbatim required text, footer + FAQ |
| Etsy re-approval | **REQUIRES CONFIRMATION FROM ETSY** — nothing in this repo can confirm Etsy will approve a reapplication; do not claim otherwise |

## 11. Browser Extension

Current state (verify against `extension/manifest.json` — this can drift):
Manifest V3, requests host permissions only for `sellersalt.com` /
`staging.sellersalt.com` / `localhost:3000` — **no `*.etsy.com`
permission, no Etsy content script.** The DOM read/write bridge that used
to run on Etsy's Shop Manager pages was deleted outright (not disabled) in
the compliance pass. Remaining panels (Listing/Shop/Search) call only
SellerSalt's own backend with user-supplied input.

**The extension is not published to the Chrome Web Store.** Do not assume
it was part of any Etsy review — the record indicates Etsy reviewers never
tested it. If in-editor DOM assistance is wanted again, it requires Etsy's
written authorization first (product/business decision, not an engineering
TODO).

## 12. Data Retention

| Entity | Source | Storage | Retention | Purpose |
|---|---|---|---|---|
| `ShopSnapshot` | Public Etsy shop stats (periodic) | Postgres | Bounded to `max(active Package.maxTrackingDays)` via `src/lib/data-retention.ts` — pruned on every new snapshot write | Market research trend tracking |
| `ListingSnapshot` | Public Etsy listing stats | Postgres | Same mechanism as above | Listing-level tracking |
| `Prospect` | Public Etsy search results | Postgres | **No explicit prune job found** — VERIFY IN CODE if this has changed | Product research history |
| `SellerChannel` tokens | Seller's own OAuth | Postgres, `encryptedCredentials` | Until disconnect (deleted immediately on disconnect) | Own-shop feature access |
| `ListingDraft` | Seller's own AI-generated drafts | Postgres | Retained after channel disconnect (decoupled, not deleted — it's the seller's own content) | Draft review/history |

There is **no 30-day (or any other fixed-day) Etsy-mandated retention rule
implemented** — that number was explicitly avoided as an invention during
the compliance pass. Retention is tied to actual product need
(`Package.maxTrackingDays`), which happens to top out at 30 on the Agency
tier today, but is a business/product number, not an assumed Etsy policy
requirement.

## 13. API Status

See `docs/MARKETPLACE-INTEGRATION-MATRIX.md` for the full, code-verified
table (marketplace × research/product-search/keyword/category/shop/
listings-read/listings-write/orders/analytics/status/credentials-required).

## 14. Current Product Surfaces

Verify against `src/services/navigation.ts` (the actual nav builder) if
uncertain — this list can drift. Current top-level groups: Dashboard,
Research (Discovery, Product/Category/Keyword Research, Trends, Dropped
Shops, Favorites, University), Intelligence (Opportunity Radar, Market
Research, Demand Signals), Optimize (SEO Audit, AI Listing Studio,
Workspace Planner), My Business (Execution Workspace, Own Shop Operations,
Listing Drafts, Analytics), Marketplaces (Marketplace Overview at
`/marketplaces`, Connected Accounts at `/settings/channels`), Manage
(Roadmap, What's New, Support, Settings, + Agency/Institute items).

## 15. Database Architecture

Multi-tenant: every user-facing query must scope by `organizationId`. Key
models (verify field-level detail in `prisma/schema.prisma` — it's the
source of truth, this is a map, not a copy):

- `SellerChannel` (+ `SellerChannelPlatform` enum) — one customer's own
  OAuth-connected store. `organizationId` required.
- `Connector` (+ `ConnectorType` enum) — platform-owned research
  credentials, `organizationId` nullable (null = shared platform
  connector, the normal case).
- `ListingDraft` — AI-generated or manually created listing content,
  `sellerChannelId` nullable (decoupled on channel disconnect, not
  deleted). Schema-level Etsy-only by design today (field comments read
  "Etsy limit: 140 chars", `etsyListingId`, `etsyDraftUrl`) — there is no
  cross-listing/multi-marketplace draft creation flow yet, so don't
  generalize this model without a real second-marketplace write path to
  back it.
- `SellerOrder` — synced orders, cascades from `SellerChannel`.
- `ResearchRun`, `ProductObservation`, `ProductObservationSnapshot`, `KeywordObservation`, `CategoryObservation`, `AcquisitionSourceHealth`, `SavedOpportunity`, `ProductValidation` — first-class persistent observation workbench models, opportunity watchlist, and commercial product validation reports with SHA-256 fingerprinting and longitudinal snapshot time-series.
- `ShopSnapshot` / `ListingSnapshot` — periodic public research captures,
  pruned per §12.
- `Prospect` — product research results, `marketplace` field tags which
  `ConnectorType` produced each row.

## 16. Security

- OAuth PKCE (Etsy) — `checks: ["pkce", "state"]` in `src/lib/auth.ts`.
- `redirect_uri` built only from `NEXTAUTH_URL`, never request headers
  (see root `CLAUDE.md` Lesson #5 for the incident this prevents).
- Credentials encrypted at rest (`src/lib/encryption.ts`, AES-256-GCM).
- Organization-scoped queries throughout (non-negotiable, §20).
- Etsy API queue-rate-limited (see `src/connectors/etsy/client.ts` /
  `executeWithRetry`).
- 2FA (TOTP) enforced at login, passkeys (WebAuthn), email verification
  gate on dashboard access.
- Disconnect immediately purges OAuth tokens + channel-specific records.

## 17. AI Architecture

- `src/services/assistant/llm-provider.ts` — provider-neutral (`AiProvider`/
  `AiModel` DB-driven registry, zero hardcoded model strings), iterates
  active providers by priority.
- `src/services/listing-generation.ts`'s `generateOriginalListingDraft` —
  **verified by direct code read and by test** that the LLM prompt never
  interpolates a competitor's raw title/description text (`sourceTitle`/
  `sourceDescription` are only used locally by `originality-engine.ts`'s
  N-gram comparison, never sent to the LLM).
- Human approval gate: every AI-generated listing is created in `draft`
  state; publishing requires an explicit, separate, human-confirmed action.
  Permanent, not a WIP limitation (§3/§10).

## 18. Current Test/Build Baseline
 
Re-verify before trusting this — it's a snapshot from this documentation
pass, not a live value:

```
Tests:      1241/1241 passing (npm run test:all — 361 suites)
TypeScript: clean            (npx tsc --noEmit)
Prisma:     valid, synchronized (npx prisma@5.22.0 validate)
Next.js:    clean build      (npx next build — 183 static and dynamic routes compiled)
```

(As of Batch 38, 2026-08-21 — see `BATCH-38-MARKETPLACE-NATIVE-PRODUCT-RESEARCH.md`.
Batch 39, same date, was a documentation/architecture-audit-only pass —
no code changed, so these numbers still apply unchanged; see
`docs/BATCH-39-ACQUISITION-STRATEGY-AUDIT.md`.)

## 19. Known Technical Debt

Verified against current code as of this pass:

- `src/services/intelligence/opportunity-scoring.ts` and `computeProductWinningSignals` (`winning-signals.ts`) — superseded by `canonical-opportunity.ts`. Zero production callers remain.
- Prospect Export (CSV & Google Sheets), Opportunity Radar (`/radar` & `opportunities.ts`), Product Detail (`/products/[listingId]`), and Shop Intelligence (`/shops/[shopExternalId]`) are all unified onto the canonical intelligence architecture.
- Category Hunting (`category-hunting.ts`) and SaltBot tool cards (`tool-registry.ts`) strictly obey the Zero-Fabrication Rule (zero synthetic fallbacks).
- Pre-existing drift between `prisma/schema.prisma` (source of truth) and
  the actual staging database: the schema file already declares
  `Announcement.updatedAt`'s default, `Coupon.type`/`value` defaults, and
  an `AnnouncementRead` FK, but a fresh `prisma migrate dev --create-only`
  diff shows the live database is still missing them — i.e. no migration
  file ever actually applied those specific column/constraint changes.
  Deliberately excluded from the marketplace-migration's own migration;
  needs its own reviewed migration to bring the database in line with the
  schema file.
- Amazon/eBay/TikTok Shop need real developer-program credentials before
  any capability flag can go `true` — external dependency, not an
  engineering task.
- `Prospect` table has no confirmed prune/retention job (VERIFY IN CODE).
- **Amazon's `PublicPageFetcher` requests use a real, honestly self-
  identifying User-Agent** (`src/marketplaces/core/acquisition/
  compliance.ts`'s `defaultUserAgent`, ends with `"(SellerSalt Commerce
  Research Bot/1.0; +https://sellersalt.com/bot; research@sellersalt.com)"`).
  Verified live during Batch 37 that Amazon serves a real, successful
  `200` to this UA but **withholds price, per-card rating/reviewCount,
  and per-card category** specifically for it — the identical request
  with a plain browser UA (no bot signature) returns full data for the
  same ASIN. This is Amazon's own access-control response to the
  disclosure, not a parser bug (the parsers are proven correct against
  the plain-browser response). Founder decision (2026-08-21): **keep the
  honest bot disclosure** — do not drop the UA's bot signature to work
  around this without a fresh, explicit founder decision; see
  `BATCH-37-PRODUCT-RESEARCH-DATA-VALIDATION.md` §13 for the full
  evidence before ever touching that UA string.
- **Review-count/rating filters, multi-keyword search, real sort-order
  enforcement, and real pagination were built in Batch 38** (`docs/
  PRODUCT-RESEARCH-DATA-CONTRACT.md`) — the line above from Batch 37 about
  these being `NOT_IMPLEMENTED` is now stale for those specific items.
  **Category filtering remains `NOT_IMPLEMENTED`** — still no field for it
  in `EtsySearchFilters`/`PublicSearchQuery`, still no UI control on any
  marketplace including Etsy. Shop-age filtering is not built either, for
  a different reason: shop age itself is confirmed `UNAVAILABLE` from
  every legitimate source this app acquires from (Batch 37) — there is
  nothing real to filter on.
- **The legacy `Prospect.price` column is non-nullable, forcing a
  fabricated `0` for genuinely unobserved Amazon/Walmart prices** — found
  live on the Dashboard's "Top Opportunity Discoveries" widget during
  Batch 38's browser verification (several Amazon items showed literal
  `$0.00`). Root cause: `persistence.ts`'s backward-compatible `Prospect`
  sync path (`price: p.price !== null && p.price !== undefined ? p.price
  : 0`) has no other option given the schema. **Not fixed** — making
  `Prospect.price` nullable is a real schema change with an unaudited
  blast radius across other call sites that assume a non-null price; flag
  this for a dedicated, carefully-scoped follow-up rather than touching it
  as a side effect of unrelated work.
- **`KeywordObservation`/`CategoryObservation` have no snapshot/history
  table** (confirmed, Batch 39 audit) — unlike `ProductObservation`
  (extended in Batch 38), every re-observation `upsert()`s the same row,
  overwriting prior stats in place. This is the concrete blocker for any
  keyword/category trend intelligence — see `docs/
  MARKET-INTELLIGENCE-ROADMAP.md` and `docs/
  KEYWORD-INTELLIGENCE-ARCHITECTURE.md` §3. Recommended fix: mirror
  `ProductObservationSnapshot`'s existing change-detection pattern, not a
  new design.
- **No sales/revenue/demand estimation model exists anywhere in this
  codebase** (Batch 39 audit, re-confirmed by direct inspection). If one
  is ever built, it must follow the input-signals→model→range→confidence→
  provenance shape in `docs/BATCH-39-ACQUISITION-STRATEGY-AUDIT.md` §9 —
  a bare number, ever, is the one thing this document exists to prevent.
- **Competitor research (8 companies, `docs/
  COMPETITOR-DATA-ACQUISITION-RESEARCH.md`) found no company using an
  official marketplace API as its primary source of competitor data** —
  independent validation that public-web-first (SellerSalt's existing
  architecture) is the category norm, not a compromise.

## 20. Development Rules for Future Agents

1. Never fabricate marketplace data — a missing field is `null`, not a
   guess.
2. Never claim an API is integrated when it's only architecture-ready.
   `capabilities.<x> = true` must always be backed by a real
   implementation.
3. Never make Etsy's rules (140/13/20, its fee schedule) universal —
   they're `ETSY_OPTIMIZATION_RULES`, consumed via a parameter, never a
   hardcoded literal inside a "universal" engine.
4. Never make another marketplace's rules universal either, once they
   exist.
5. Use `MarketplaceRegistry` as the single source of truth for what a
   marketplace can do — never a hardcoded `if (marketplace === "etsy")`
   list scattered through the app.
6. Use the canonical types in `src/marketplaces/core/types.ts` for
   cross-marketplace intelligence — normalize at the connector boundary,
   not downstream.
7. Preserve existing working marketplace adapters — verify current
   behavior with a test before refactoring, not after.
8. Keep connected-shop data (`SellerChannel`) and public market research
   (`Connector`) architecturally separate (§4) — never make research
   require OAuth unless the specific feature genuinely needs first-party
   data.
9. Preserve multi-tenant `organizationId` scoping on every user-facing
   query, no exceptions.
10. Preserve OAuth/PKCE/encryption/rate-limiting protections as they exist
    — don't simplify them away to unblock a feature.
11. Do not reintroduce "spy"/"surveillance"/"stalk"/"scrape" positioning
    into user-visible copy.
12. Do not build around scraping as a shortcut around a real API
    integration — official APIs and legitimate public endpoints only.
13. Do not rewrite a working system merely to make it prettier or more
    "consistent" — verify a concrete defect first.
14. Add or update tests with every architectural change — this repo's
    test suite is the actual behavioral contract, treat it as such.
15. **Update documentation whenever architecture changes.** This is not
    optional going forward — a significant implementation batch that
    doesn't touch `docs/SELLERSALT-ARCHITECTURE.md`,
    `docs/MARKETPLACE-INTEGRATION-MATRIX.md`, and
    `docs/SELLERSALT-ROADMAP.md` where relevant is incomplete.

---

For older, project-specific engineering rules (data provenance badging,
explainable scoring, originality thresholds, external-link handling)
predating the marketplace work, see the legacy rule set preserved in
`docs/22-compliance/SELLERSALT_COMPLIANCE_GUIDELINES.md` and the numbered
`docs/00-26` specification series — those remain valid product-quality
bars, just superseded as the *primary* onboarding document by this file
and `docs/SELLERSALT-HANDOFF.md`.
