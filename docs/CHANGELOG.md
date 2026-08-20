# SellerSalt — Architectural Changelog

Chronological record of *why* the architecture is shaped the way it is —
for a future agent (or human) wondering "why does this exist" rather than
just "what exists." For user-facing feature history, see
`docs/whats-new`-style content in the app itself
(`src/services/changelog.ts`); this document is engineering-decision-
focused.

## Etsy-origin architecture (pre-2026-08)

Built and deployed as "Anadash" on `anadash.netdrix.com` for months —
Etsy-only product research (product hunting, keyword research, category
hunting, shop tracking), platform-wide research via one shared Etsy
Personal Access connector, admin-gated Shopify/WooCommerce "own shop"
connectors added later. `SETUP.md` still documents this era's deployment
process; see its own superseded-notice for what's changed since.

## SellerSalt rebrand

Rebranded from "Anadash" to "SellerSalt," migrated to `sellersalt.com`.
The GitHub repo name and some internal identifiers still reference
"anadash" in places that don't affect users — intentional, not something to
"finish" by renaming everything (root `CLAUDE.md` explains which
references are deliberate).

## Etsy Commercial API rejection & compliance remediation (2026-08-19)

**Why**: Etsy declined a Commercial API access request with a generic
rejection reason. A forensic audit (`docs/SELLERSALT-ARCHITECTURE-AUDIT.md`
predecessor pass — see that doc's own history) found several concrete,
plausible causes:

- The pricing page literally advertised "Etsy search scrapers" and
  "Dedicated Scraper Capacity" as paid features — directly contradicting
  Etsy's API Terms, which prohibit screen-scraping.
- The app requested a `billing_r` OAuth scope that, on verification against
  Etsy's live, current documentation, **isn't a real Etsy v3 scope at
  all** — a technical red flag independent of the scraping-language issue.
- "Spy on Competitor" / "Surveillance" / "Stalk" branding throughout the
  dashboard, marketing site, and transactional emails — legally fine
  (the underlying feature reads only public data) but a self-inflicted
  optics risk against a reviewer already primed to look for scraping-
  adjacent language.

**What changed**: OAuth scopes narrowed to `listings_w listings_r shops_r
transactions_r` (removed `shops_w`, `billing_r`). The Chrome extension's
Etsy-page DOM read/write bridge was deleted outright (not disabled) —
`extension/etsy-content-script.js`, `extension/etsy/*`, and their
background-worker message handlers are gone; the extension now only talks
to SellerSalt's own backend. "Spy/Surveillance/Stalk" terminology replaced
with "Market Research" across every user-visible surface found. Snapshot
retention bounded to actual product need (`Package.maxTrackingDays`, not
an invented Etsy rule). Disconnect lifecycle audited and confirmed sound.
A real regression from a prior session's partial edit was found and fixed
(a missing OAuth `token:` endpoint that would have broken all Etsy sign-in).

**Why this matters for future work**: the correct claim is "remediated
against currently identifiable Etsy API policy risks and prepared for
review" — not "Etsy approved this." Re-approval requires Etsy's own
confirmation, which nothing in this repository can produce.

## Marketplace abstraction (2026-08-19, same day, following remediation)

**Why**: the compliance work surfaced a deeper structural question —
SellerSalt's *positioning* said "market intelligence platform," but its
*code* was Etsy-only end to end (raw Etsy client calls scattered directly
into `product-hunting.ts`, `keyword-research.ts`, `category-hunting.ts`;
two separate ad-hoc connector registries that both only had Etsy behind
them). The founder decision: reposition as a genuinely marketplace-agnostic
ecommerce intelligence platform, with Etsy as the first (not only)
connector.

**What changed**: `src/marketplaces/core/` built as described in
`docs/SELLERSALT-MARKETPLACE-ARCHITECTURE.md` — a `MarketplaceConnector`
interface, capability flags, a central registry, canonical types, and
six connector adapters (Etsy real, Shopify/WooCommerce partial,
Amazon/eBay/TikTok Shop honest stubs). This *wrapped* the existing working
Etsy code rather than rewriting it — the two pre-existing registries
(`src/connectors/`, `src/seller-channels/`) remain in place underneath.

## Research pipeline migration + normalization

**Why**: having the abstraction exist doesn't help if nothing calls
through it. The three main research routes and the scheduled Prospects
worker were migrated to check capabilities via the new registry first,
with Etsy's actual behavior required to stay byte-identical (verified by
the existing test suite, not just asserted). A `NormalizedProduct` type
was added because the original thin `SearchResult` type couldn't carry
the shop/review/sales metrics the Prospects pipeline actually needs — an
honest gap found while doing the migration, not decided up front.

## All-Marketplace research UX

**Why**: an abstraction that only one marketplace can use isn't
demonstrating the point. Built `runAllMarketplaceProductResearch()` and
wired a real "All Marketplaces" mode into the Prospects page as the
reference implementation — deliberately one flagship surface rather than
a shallow pass across every page, to keep the error-isolation and
honest-status guarantees (AVAILABLE/PARTIAL/UNAVAILABLE/NOT_IMPLEMENTED)
real and tested rather than aspirational everywhere at once.

## SEO engine parameterization

**Why**: `seo-engine.ts`'s `auditListingSeo` was the last major
"universal"-named engine still hardcoding Etsy's 140-char/13-tag/20-char
limits as bare literals. Parameterized via `MarketplaceOptimizationRules`,
with the exact same derived-threshold math Etsy's defaults always
implied — so passing no rules argument reproduces the original behavior
precisely (verified by test, not just visually similar). A third, unused,
similarly-mislabeled "Universal Opportunity Scoring Engine" was discovered
during the audit sweep for this work and fixed the same way for
consistency, despite having zero live callers.

## Marketplace context extended to Keyword Research, Category Hunting, and SEO Audit (2026-08-19)

**Why**: the prior "All-Marketplace research UX" pass was deliberately
scoped to one flagship surface (Prospects) to keep the error-isolation
and honest-status guarantees real rather than aspirational everywhere at
once. This pass extended the same, already-proven pattern to the three
other intelligence surfaces still coupled directly to Etsy.

**What changed**: Keyword Research (`/keyword-research`) and Category
Hunting (`/categories`) both got a functional `MarketplaceSelector`
(single marketplace + "All Marketplaces"), backed by
`fetchAllMarketplaceKeywordResearch`/`fetchAllMarketplaceCategoryTree` —
new fan-out entry points that reuse a newly-extracted generic
`fanOutMarketplaceRequest<T>()` helper (`src/marketplaces/core/
research-pipeline.ts`) instead of reimplementing the Prospects page's
error-isolation logic a second and third time. A new
`MarketplaceStatusCard` component renders their per-marketplace status,
mirroring `AllMarketplacesResults`' treatment for a different payload
shape. `POST /api/seo/audit` was parameterized to resolve and return the
marketplace it scored against — `getOptimizationRules(marketplace)`
threaded into `auditListingSeo`, with a new `resolveMarketplaceForAudit`
that derives the marketplace from a connected `SellerChannel` (via a new
`marketplaceFromSellerChannelPlatform` mapping) when one is supplied,
falling back to a manual pick otherwise. The `/seo` Draft Playground tab
got a real "Connected Store" picker and dynamic rubric/title/tag targets
instead of a hardcoded Etsy 140/13; the Live Listing and Shop SEO tabs
were left untouched (both only ever fetch real, live Etsy data, so
generalizing them would be dishonest). Etsy's behavior verified
byte-identical throughout (existing + 16 new tests, including a real
DB-backed test that creates and cleans up a throwaway seller channel to
verify org-scoped marketplace derivation).

**What did not change**: no marketplace's capability flags. Amazon/eBay/
TikTok Shop remain `ARCHITECTURE READY` (zero live capability); Shopify/
WooCommerce remain `PARTIAL` (account/orders only, no research/taxonomy/
SEO). A marketplace being selectable on these surfaces is a UI/routing
fact, not a capability claim — see the new "Marketplace-aware UI vs.
marketplace capability vs. implementation" section in
`docs/SELLERSALT-ARCHITECTURE.md`, added specifically because this
distinction is easy to blur once a selector appears on more pages.

## Documentation synchronization checkpoint (2026-08-19, second pass)

**Why**: after the batch above, before any further feature work, the
canonical documentation set needed re-verification against the actual
code (not just extension) so a fresh agent — Google Antigravity is the
named next agent — can pick up work with zero ambiguity about what's
real versus what's UI-wired versus what's still architecture-only.

**What changed**: `docs/SELLERSALT-ROADMAP.md` (Phases 3/4 marked DONE,
Phase 5 corrected to IN PROGRESS), `docs/MARKETPLACE-INTEGRATION-MATRIX.md`
(notes section only — no capability row changed), `docs/SELLERSALT-
HANDOFF.md` (new "what's next" reflecting the batch above, refreshed
baseline, new checkpoint section), `docs/SELLERSALT-MARKETPLACE-
ARCHITECTURE.md` (fixed a now-stale claim that only Prospects had
functional selector wiring; documented the fan-out helper and SEO
marketplace-derivation logic), `docs/SELLERSALT-ARCHITECTURE.md` (added
the UI-vs-capability-vs-implementation distinction and a fan-out
reference), `AGENTS.md` (research-pipeline export list, intelligence
engine table, `ListingDraft` Etsy-only note, refreshed test baseline,
removed a stale technical-debt bullet), this changelog. One previously
unflagged legacy document (`docs/MASTER_BLUEPRINT.md`, predates the
entire marketplace-abstraction effort and claimed to be "the entry point
for the docs/ tree" with no pointer to the current canonical set) got a
superseded-style notice — content otherwise untouched.
`docs/SELLERSALT-ARCHITECTURE-AUDIT.md` and the other already-marked
historical documents were deliberately left as-is; they're accurate
snapshots of their own moment in time, not claims about current state.

## Launch Readiness, Quota Enforcement & Onboarding Activation (2026-08-19)

**Why**: Launch audit identified four critical gaps in SaaS operational readiness:
1. SaltBot fallback paths returned fabricated demo listings/categories tagged `ACTUAL_ETSY_DATA`.
2. `checkQuota()` existed but had zero call sites, allowing unlimited usage on free tiers.
3. PlanUsageCard and pricing pages had drifted quota numbers and fabricated defaults.
4. The onboarding wizard was orphaned from checkout, and dashboard activation relied on client-side `localStorage`.

**What changed**:
- **SaltBot Data Integrity**: Fabricated fallback responses physically removed from `search_products`, `explore_category`, and `search_keywords` in `src/services/assistant/tool-registry.ts`. Failed upstream calls now return honest `success: false` errors.
- **Real Plan Quota Enforcement**: Wired `checkQuota()` into all 5 paid-action routes (`/api/keywords/search`, `/api/products/search`, `/api/seo/audit`, `/api/studio/generate`, `/api/planner/items`) after authentication and before expensive operations. Idempotency is preserved on Planner items before quota checks.
- **Pricing & Quota Single Source of Truth**: Removed stale `prospectsThisMonth` resource. `PLAN_DEFINITIONS` is now the single authority across pricing, checkout, marketing homepage, in-app billing, and `PlanUsageCard`. `PlanUsageCard` renders an honest unavailable state when data cannot be retrieved.
- **Onboarding Activation Flow**: Added `onboardingCompletedAt`, `onboardingCategory`, `onboardingGoal`, and `onboardingNiche` to `User` model. `POST /api/onboarding/complete` persists real choices with input validation. `/onboarding` features a server-side guard bouncing completed users to `/dashboard`. `checkout-client.tsx` routes new free signups to `/onboarding` and existing logins to `/dashboard`. `DashboardOnboardingGuide` calculates checklist completion from real server props, eliminating `localStorage` for business facts.
- **Regression Test Coverage**: Added dedicated test suites (`saltbot-no-fabricated-data.test.ts`, `quota-enforcement.test.ts`, `plan-usage-consistency.test.ts`, `onboarding-activation-and-routing.test.ts`). Full test baseline reaches 724/724 passing.

## Intelligence Core Foundation — Implementation Batch 1 (2026-08-19)

**Why**: SellerSalt's intelligence layer had multiple overlapping/unconsolidated scoring implementations:
1. `universal-scoring.ts` (4-factor product/shop opportunity scoring)
2. `product-hunting.ts` (5-factor Etsy search & radar scoring)
3. `opportunity-scoring.ts` (orphaned 5-factor scoring engine with zero live callers)
4. `opportunity-engine.ts` (capability-aware wrapper)

Furthermore, missing data was sometimes implicitly assumed to be 0 or defaulted rather than honestly declared unavailable with calibrated confidence, and individual metric containers lacked explicit granularity distinctions (`OBSERVED` vs `ESTIMATED` vs `DERIVED` vs `UNAVAILABLE`).

**What changed**:
- **Single Canonical Opportunity Intelligence Model (`src/services/intelligence/canonical-opportunity.ts`)**:
  - Established `MetricAvailability` (`"OBSERVED" | "ESTIMATED" | "DERIVED" | "UNAVAILABLE"`).
  - Created standardized `OpportunityMetric<T>` container so missing signals carry `value: null` with `availability: "UNAVAILABLE"` rather than fabricating 0.
  - Implemented `evaluateCanonicalOpportunity(input)`: 100% marketplace-neutral scoring engine parameterized by `MarketplaceOptimizationRules`. Dynamically redistributes weights proportionally when signal groups are unavailable and calibrates confidence score accordingly.
  - Added `extractOpportunityInputFromNormalizedProduct(product, rules)` for zero-boilerplate ingestion of canonical `NormalizedProduct` entities.
- **Scoring Engine Consolidation**:
  - `opportunity-engine.ts` updated to export `scoreNormalizedProductOpportunity` using the canonical intelligence model.
  - `research-pipeline.ts` (`runProductResearch`) automatically attaches canonical opportunity scores to normalized products when missing.
  - Legacy `opportunity-scoring.ts` explicitly marked `@deprecated` in favor of `canonical-opportunity.ts`.
  - `universal-scoring.ts` and `product-hunting.ts` behavior preserved with 100% backwards compatibility for existing live callers and tests.
- **Test Baseline**:
  - Created `src/tests/canonical-opportunity-engine.test.ts` with 14 comprehensive tests covering determinism, Etsy backwards compatibility, absence of hardcoded fee literals, unavailable signal handling, calibrated confidence, marketplace isolation, and envelope generation.
  - All 738 tests passing across 92 test suites.

## Cross-Marketplace Intelligence & Opportunity Radar Consolidation — Batch 2 (2026-08-19)

**Why**: Opportunity Radar (`/radar`) lacked functional cross-marketplace wiring, and `POST /api/marketplaces/research` outputs needed rich, standardized canonical opportunity metrics (score, tier, confidence, and signal availability tags) for cross-marketplace comparison.

**What changed**:
- **Multi-Marketplace Opportunity Reports (`src/marketplaces/core/research-pipeline.ts` & `src/marketplaces/core/types.ts`)**:
  - Extended `OpportunityScoreRef` with `tier`, `verdict`, `verdictVariant`, `availableSignals`, and `unavailableSignals`.
  - Added `MarketplaceOpportunitySummary` to `ProductResearchResult` exposing aggregated average opportunity score, average calibrated confidence, and evaluated signal groups.
  - `runProductResearch` now evaluates canonical opportunity for every normalized product and generates the marketplace-level intelligence summary.
- **Cross-Marketplace Opportunity Radar (`src/app/(dashboard)/radar/radar-client.tsx`)**:
  - Wired `MarketplaceSelector` with "All Marketplaces" support and persistent state.
  - In "All Marketplaces" mode, executes cross-marketplace research via `POST /api/marketplaces/research` and renders comparable marketplace opportunity cards.
  - In non-Etsy single-marketplace mode (Amazon, eBay, TikTok Shop), renders an honest `MarketplaceStatusCard` with `NOT_IMPLEMENTED` status, never fabricating fake data.
  - In Etsy mode, preserves the full rich live Etsy radar items and pulse metrics.
- **Enhanced AllMarketplacesResults Component (`src/components/intelligence/AllMarketplacesResults.tsx`)**:
  - Renders marketplace summary bars with average opportunity score, confidence percentage, and evaluated signal group badges.
  - Displays opportunity score badges, confidence indicators, and price/metric provenance on each product card without defaulting missing numbers to 0.
## Product Detail & Shop Intelligence Canonical Migration — Batch 3 (2026-08-19)

**Why**: Product Detail (`/products/[listingId]`), Shop Intelligence (`/shops/[shopExternalId]`), and Market Research Tracking (`handleShopWatchJob`) maintained disparate scoring paths or fallback constants:
1. Product Detail (`page.tsx`) used an ad-hoc inline calculation `(estDailySales / 4) * 60 + ...` on the server while the client recomputed formulas via `evaluateProductOpportunity`.
2. Shop Detail (`shop-detail-client.tsx`) contained hardcoded fallback literals (`12500` sales, `48` listings, `1420` reviews, `$24.5` avg price) for missing values.
3. Market Research shop-tracking worker (`handleShopWatchJob` in `src/workers/index.ts`) bypassed `MarketplaceRegistry` and directly imported the legacy connector registry.

**What changed**:
- **Product Detail Canonical Intelligence Migration**:
  - `src/app/(dashboard)/products/[listingId]/page.tsx` now evaluates `evaluateCanonicalOpportunity()` server-side with explicit metric provenance (`ACTUAL_DATA`, `ESTIMATED`, `UNAVAILABLE`) and attaches the structured `CanonicalOpportunityReport` to `ProductDetailData`.
  - `src/app/(dashboard)/products/[listingId]/product-detail-client.tsx` directly consumes the server-evaluated canonical intelligence result (score, confidence, tier, verdict label, verdict variant, summary, and explanation) rather than importing or recalculating scoring formulas in React.
- **Shop Intelligence & Competition Migration**:
  - `src/services/shop-intelligence.ts` computes shop competition via `scoreShopCompetition()` bridge from `@/marketplaces/core/opportunity-engine` and attaches `competition?: OpportunityScore` to `CompleteShopIntelligenceProfile`.
  - `src/app/shops/[shopExternalId]/shop-detail-client.tsx` removed all hardcoded fallback constants (`12500`, `48`, `1420`, `24.5`), safely defaulting missing fields to `0` or `null` and consuming `scoreShopCompetition`.
  - `src/app/(dashboard)/spy/page.tsx` migrated to consume `scoreShopCompetition` via the centralized opportunity envelope.
- **Market Research Tracking / Shop Watch Migration**:
  - `handleShopWatchJob` in `src/workers/index.ts` migrated to `MarketplaceRegistry.tryGetConnector(marketplace)` with `registerAllConnectors()`.
  - Extended `MarketplaceConnector` with `getPublicShopStats(shopExternalId, organizationId)` returning normalized `MarketplaceShopStats`.
  - Updated Etsy connector (`src/marketplaces/etsy/connector.ts`) and normalizer (`src/marketplaces/core/normalizers/etsy.ts`) to return canonical shop stats.
- **Regression Test Coverage**:
  - Created `src/tests/product-detail-and-shop-intelligence-migration.test.ts` (12 tests) verifying product detail canonical routing, shop competition scoring, zero-fabrication of missing metrics, and shop-watch worker registry dispatch.
  - Full test baseline reaches **760/760 passing across 102 test suites**.

## Prospect Export, Radar Data & Category Zero-Fabrication Consolidation — Batch 5 (2026-08-19)

**Why**: Remaining data-integrity and scoring inconsistencies were audited and resolved across several downstream and side-service paths:
1. Prospect Export (CSV export at `src/app/api/prospects/export/route.ts` and Google Sheets export at `src/services/connectors/google-sheets.ts`) called a separate legacy calculation `computeProductWinningSignals()` instead of reading/evaluating canonical opportunity intelligence.
2. Category Hunting (`src/services/category-hunting.ts`) contained synthetic fallback constants (`500` sales, `25` listings, `30` reviews, `4.9` rating, `3.5` daily sales, `22.0` yield, `120` reviews) when shop profile data was omitted.
3. SaltBot tool cards (`src/services/assistant/tool-registry.ts`) used default fallbacks (`|| 75`, `|| 1.2`, `|| '5.0 ★'`) for missing product opportunity scores and ratings.
4. Opportunity Radar data service (`src/services/opportunities.ts` `getOpportunityRadarData()`) evaluated a private 5-factor loop with arbitrary weights rather than the canonical opportunity intelligence engine.
5. Listing Strategy (`src/services/listing-strategy.ts`) hardcoded Etsy fee percentages and fallback values (`1200` sales, `150` reviews, `2.2` velocity), and Listing Assistant (`src/services/listing-assistant.ts`) duplicated Jaccard similarity calculations.

**What changed**:
- **Prospect CSV & Google Sheets Export**:
  - Migrated both `src/app/api/prospects/export/route.ts` and `src/services/connectors/google-sheets.ts` to `evaluateCanonicalOpportunity()`.
  - Replaced legacy 50-base score with canonical `overallScore`, structured demand signal, competition signal, and explanation.
  - `computeProductWinningSignals()` in `src/services/intelligence/winning-signals.ts` marked `@deprecated` with zero production callers remaining.
- **Category Hunting Zero-Fabrication**:
  - Removed all synthetic fallback values in `src/services/category-hunting.ts`.
  - Missing shop metrics safely evaluate to `0` proxies with zero fabrication, adjusting category composite opportunity score based on observed price health when shop data is absent.
  - Product samples map actual shop metrics without inventing fake lifetime sales or ratings.
- **SaltBot Data Honesty**:
  - In `src/services/assistant/tool-registry.ts`, replaced synthetic score fallbacks (`|| 75`) with honest `Score: —` markers and `No rating` when ratings are absent.
- **Opportunity Radar Data Service Consolidation**:
  - `getOpportunityRadarData()` in `src/services/opportunities.ts` now routes all prospect scoring through `evaluateCanonicalOpportunity()`, unifying Radar scores with Prospects, Product Detail, and All Marketplaces research.
- **Listing Strategy & Assistant Consolidation**:
  - `buildOpportunityPackage` in `src/services/listing-strategy.ts` parameterized by `MarketplaceOptimizationRules` (default `ETSY_OPTIMIZATION_RULES`), computing fee schedules dynamically and eliminating hardcoded fallback constants.
  - `calculateJaccardSimilarity` in `src/services/listing-assistant.ts` delegates to `src/services/originality-engine.ts`.
- **Regression Test Coverage & Baseline**:
## Data Acquisition & Intelligence Pipeline Audit — Batch 6 (2026-08-19)

**Why**: To provide an exhaustive architectural trace and empirical verification of where SellerSalt obtains data across all 10 intelligence features, separate Connected Seller Data (Domain A) from Market Intelligence (Domain B), audit all marketplace connector capabilities, and harden data acquisition pipelines against rate limits and timestamp edge cases.

**What changed**:
- **Data Supply Chain Audit**:
  - Traced UI → API → Service → Pipeline → Connector → External API → Normalized Model → Intelligence Engine → PostgreSQL/Redis → UI for all 10 intelligence features (Product Research, Keyword Research, Category Hunting, Shop Research, Product Detail, Shop Intelligence, Opportunity Radar, Listing Optimization, Market Research / Shop Watch, SaltBot).
  - Explicitly classified each metric as `OBSERVED`, `ESTIMATED`, `DERIVED`, or `UNAVAILABLE`.
- **Connector Capability Matrix Verification**:
  - Verified `src/marketplaces/core/registry/index.ts` against `docs/MARKETPLACE-INTEGRATION-MATRIX.md`: Etsy is the single `IMPLEMENTED` research marketplace; Shopify and WooCommerce are `PARTIAL` (account auth + order sync only); Amazon, eBay, and TikTok Shop are `ARCHITECTURE READY` with zero live credentials and all capability flags `false`.
- **Domain Separation Guard**:
  - Proved Connected Seller Data (`SellerChannel`, `SellerOrder`, `syncSellerChannel`) is completely isolated from Market Intelligence (`Connector`, `Prospect`, `ShopSnapshot`, `ListingSnapshot`).
- **Etsy Data Acquisition Bugfix & Hardening**:
  - Fixed shop age calculation in `src/connectors/etsy/index.ts` to support both `shop.create_date` and `shop.created_timestamp`, preventing `NaN` month calculations.
  - Optimized image acquisition during search by reusing embedded `listing.images` from active listing search results before falling back to extra HTTP requests, avoiding unnecessary API calls against Etsy rate limits.
## Cross-Marketplace Intelligence & Comparison Engine — Batch 7 (2026-08-19)

**Why**: To establish the canonical multi-channel evaluation, ranking, and comparison engine that evaluates a product/niche across all registered commerce ecosystems, ranking only live channels, maintaining calibrated confidence, and enforcing zero fabrication of stub or unavailable marketplaces.

**What changed**:
- **Cross-Marketplace Domain Models**:
  - Added `MarketplaceEvaluation`, `CrossMarketplaceRanking`, and `CrossMarketplaceComparison` to `src/marketplaces/core/types.ts`.
- **Comparison Engine Service**:
  - Created `src/services/intelligence/cross-marketplace-comparison.ts` (`buildCrossMarketplaceComparison`, `compareAllMarketplaceProducts`).
  - Evaluates each marketplace independently from `ProductResearchResult`.
  - Strictly ranks **only** live available marketplaces with real canonical opportunity scores (never ranks unavailable channels and never assigns them 0).
  - Determines `bestAvailableMarketplace` and `highestConfidenceMarketplace`.
  - Generates transparent, zero-fabrication system limitations explaining channel status and estimation proxies.
- **API & UI Layer Integration**:
  - `POST /api/marketplaces/research` returns both `{ results, comparison }`.
  - Upgraded `src/components/intelligence/AllMarketplacesResults.tsx` with an Executive Cross-Marketplace Intelligence section, Best Available Channel spotlight, and Channel Verdict matrix.
  - Wired `radar-client.tsx` and `live-search-tab.tsx` to pass cross-marketplace comparison data to `AllMarketplacesResults`.
## Niche Discovery & Demand Signal Aggregation — Batch 8 (2026-08-19)

**Why**: To turn individual product, keyword, shop, and taxonomy observations into a coherent Niche Discovery and Demand Signal Aggregation layer, providing aggregated niche opportunity scores, demand strength gauges, competition barrier metrics, and listing freshness signals without manufacturing search volume or multi-month historical momentum.

**What changed**:
- **Niche Domain Models**:
  - Added `NicheDemandSignal`, `NicheCompetitionSignal`, `NicheMomentumSignal`, `NicheSubcategory`, `NicheKeywordCluster`, `NicheOpportunity`, and `NicheDiscoverySummary` to `src/marketplaces/core/types.ts`.
- **Niche Discovery Service**:
  - Created `src/services/intelligence/niche-discovery.ts` (`discoverNichesFromProducts`, `discoverNichesFromDatabase`, `discoverLiveMarketplaceNiches`).
  - Clusters normalized products by taxonomy/category paths and keyword stems.
  - Reuses canonical opportunity scoring (`evaluateCanonicalOpportunity`) across each product.
  - Aggregates demand proxy signals (observed daily velocity, favorites count, catalog sales yield).
  - Aggregates competition signals (review thresholds, top shop concentration, incumbent dominance).
  - Evaluates listing freshness velocity while strictly keeping historical momentum growth percentage `null` when multi-window snapshots are not present.
- **API & UI Layer Integration**:
  - Added API route `src/app/api/niches/discover/route.ts` supporting both live marketplace search and organization prospect aggregation.
  - Upgraded Discovery Hub (`src/app/(dashboard)/discovery/page.tsx` and `src/app/(dashboard)/discovery/discovery-client.tsx`) with an interactive Niche Explorer, Score Badges, 3-Pill Signal Cards, Sub-branch breakdown, and Data Provenance notes.
## Data Acquisition & Research Pipeline Deep Audit & Hardening (2026-08-20)

**Why**: To perform an exhaustive technical audit of SellerSalt's data acquisition and research pipelines across all 10 intelligence capabilities, verify empirical connector reality vs. architecture-ready stubs, harden average calculations against null-coercion bugs, and guarantee honest zero-fabrication labeling across user-facing surfaces.

**What changed**:
- **Data Supply Chain Audit**:
  - Traced Query → Connector → Normalizer → Intelligence Engine → Persistence → UI for all 10 features (Product Research, Keyword Research, Shop Intelligence, Category Hunting, Niche Discovery, Opportunity Radar, Live Search, Shop Watch, Product Detail, AI Listing Studio).
  - Explicitly classified all data points into `OBSERVED`, `ESTIMATED`, `DERIVED`, or `UNAVAILABLE`.
- **Connector Reality Matrix Verification**:
  - Verified `src/marketplaces/core/registry/index.ts`: Etsy is the single `LIVE / IMPLEMENTED` public research connector; Shopify and WooCommerce are `PARTIAL` (account connect + order sync); Amazon, eBay, and TikTok Shop are `ARCHITECTURE READY` with all capabilities `false`.
- **Keyword Research Aggregation Bugfix**:
  - Fixed average calculations in `src/app/api/keyword-research/route.ts` to filter out `null` metrics before averaging instead of coercing missing values to 0 with `?? 0`, preventing artificial downward skewing of price, review, and sales yields.
- **Zero-Fabrication & Honest Terminology Verification**:
  - Verified absence of hardcoded fallback constants (e.g. 4,850 searches/mo) across all tool registries and services.
  - Confirmed keyword demand is transparently branded as "Demand Proxy / Estimated Demand Signal (Avg Favorites)" rather than exact search volume.
## Marketplace-Independent Data Acquisition Foundation — Batch 9A (2026-08-20)

**Why**: To establish a clean, source-agnostic data acquisition layer that decouples SellerSalt's canonical intelligence engines from hard runtime dependencies on official marketplace APIs, allowing intelligence to ingest from live APIs, public web, user imports, connected stores, and historical SellerSalt observations with explicit provenance.

**What changed**:
- **Source-Agnostic Acquisition Domain Contracts**:
  - Added `DataSourceType` (`MARKETPLACE_API`, `PUBLIC_WEB`, `USER_IMPORT`, `CONNECTED_STORE`, `HISTORICAL_OBSERVATION`, `EXTERNAL_PROVIDER`, `DEV_FIXTURE`) to `src/marketplaces/core/types.ts`.
  - Added `ObservationMetadata` and `NormalizedObservation<T>` envelopes.
  - Extended `NormalizedProduct` with `acquisitionMethod`, `observedAt`, and `isHistorical`.
- **Multi-Source Acquisition Service**:
  - Created `src/marketplaces/core/acquisition.ts` with `acquireProductObservations`, `acquireHistoricalProductObservations`, and `deduplicateProductObservations`.
  - Implemented automatic graceful fallback to verified historical SellerSalt observations from PostgreSQL `Prospect` records when live APIs are unconfigured or fail.
  - Ensured deterministic deduplication preferring fresh live observations while preserving historical lineage.
- **Research Pipeline Integration**:
  - Updated `src/marketplaces/core/research-pipeline.ts`'s `ResearchRequest` to support `allowHistoricalFallback` and `preferredSources`.
  - Wired `runProductResearch` to return historical observations on connector failure when fallback is enabled, eliminating unnecessary `UNAVAILABLE` errors.
## Public Web Data Acquisition Engine & Foundation — Batch 9B (2026-08-20)

**Why**: To build SellerSalt's primary marketplace-independent public web acquisition layer, extracting legitimate public commerce observations from public web pages, JSON-LD structured schemas (`schema.org/Product`, `BreadcrumbList`, `AggregateRating`, `Offer`), and OpenGraph metadata without requiring official marketplace API keys.

**What changed**:
- **Public Web Acquisition Contracts (`src/marketplaces/core/acquisition/contracts.ts`)**:
  - Defined `PublicWebAcquisitionAdapter`, `PublicSearchQuery`, `PublicAcquisitionResult<T>`, `PageFetchOptions`, `ParsedJsonLdProduct`, `ParsedOpenGraphData`, `ParsedListingCard`, `PublicKeywordHarvestResult`, and `MergedProductObservation`.
- **Responsible Rate Limiting & Throttling (`src/marketplaces/core/acquisition/rate-limiter.ts`)**:
  - Implemented `DomainRateLimiter` with token-bucket algorithm, per-domain request concurrency limits, and exponential backoff with jitter.
- **Safe Public Page Fetcher (`src/marketplaces/core/acquisition/page-fetcher.ts`)**:
  - Implemented `PublicPageFetcher` with honest `User-Agent: SellerSaltBot/1.0`, timeout management, response size limits (5MB max), transparent in-memory/Redis response caching (6-hour TTL), and transient error retries.
- **Structured Data & HTML Parser (`src/marketplaces/core/acquisition/structured-parser.ts`)**:
  - Implemented `extractJsonLdBlocks`, `parseProductFromJsonLd`, `parseCategoryBreadcrumbsFromJsonLd`, `parseOpenGraphData`, `extractListingIdFromUrl`, and `parseEtsyListingCardsFromHtml`.
- **Multi-Source Observation Merger (`src/marketplaces/core/acquisition/merger.ts`)**:
  - Implemented `mergeProductObservations` providing non-destructive signal enrichment with explicit field lineage tracking (`sources: [PUBLIC_WEB, MARKETPLACE_API]`).
- **Historical Observation Persistence (`src/marketplaces/core/acquisition/persistence.ts`)**:
  - Created `persistPublicProductObservations` saving normalized research observations into PostgreSQL (`Prospect` table) to build longitudinal datasets.
- **Etsy Public Web Adapter (`src/marketplaces/etsy/public-adapter.ts`)**:
  - Implemented `EtsyPublicWebAdapter` supporting `searchPublicProducts`, `fetchPublicProduct`, `fetchPublicShop`, and `harvestPublicKeywords` with canonical opportunity score evaluation.
## Marketplace-Independent Web Acquisition Expansion & Source Orchestrator — Batch 9C (2026-08-20)

**Why**: To expand SellerSalt's marketplace-independent data acquisition layer across Amazon, eBay, Walmart, and TikTok Shop, establish a formal Research Source Policy with multi-source orchestration, introduce temporal freshness calibration with domain-specific degradation rules, and build empirical keyword observation capabilities without requiring official keyword API dependencies.

**What changed**:
- **Walmart First-Class Integration**:
  - Registered `walmart` in `MarketplaceId`, `SELLER_CHANNEL_PLATFORM_TO_MARKETPLACE`, `MarketplaceRegistry`, `MarketplaceSelector`, and `cross-marketplace-comparison`.
  - Implemented `WalmartPublicWebAdapter` (`src/marketplaces/walmart/public-adapter.ts`) with semantic search card parser (`data-item-id`) and JSON-LD structured product extraction.
- **Amazon & eBay Public Web Semantic Parsers**:
  - Enhanced `AmazonPublicWebAdapter` (`src/marketplaces/amazon/public-adapter.ts`) with card-level ASIN (`data-asin`), price, rating, and review extraction, alongside keyword harvesting.
  - Enhanced `EbayPublicWebAdapter` (`src/marketplaces/ebay/public-adapter.ts`) with `.s-item` card extraction and keyword harvesting.
- **MarketplaceRegistry Single Entry Point**:
  - Upgraded `MarketplaceRegistry` (`src/marketplaces/core/registry/index.ts`) to manage both official `MarketplaceConnector` instances and `PublicWebAcquisitionAdapter` instances.
- **Research Source Orchestrator (`src/marketplaces/core/acquisition/orchestrator.ts`)**:
  - Implemented `orchestrateProductResearch` with configurable `ResearchSourcePolicy` supporting `preferredSources`, `allowHistoricalFallback`, `minimumFreshness`, and observation merging.
- **Standardized Freshness Model (`src/marketplaces/core/acquisition/freshness.ts`)**:
  - Standardized observation validity statuses: `LIVE`, `FRESH`, `STALE`, `HISTORICAL`, `UNKNOWN` with domain-specific lifetime windows (Price: 6h, Reviews: 48h, Taxonomy: 7d).
- **Empirical Keyword Research Pipeline (`src/marketplaces/core/acquisition/keywords.ts`)**:
  - Built marketplace-independent keyword harvester calculating listing frequencies, price distributions, and demand proxy scores.
  - Strictly preserves `exactSearchVolume = null` unless backed by licensed external volume providers.
## Real Marketplace Research & Observation Intelligence Foundation — Batch 9D (2026-08-20)

**Why**: To turn SellerSalt's multi-source acquisition infrastructure into a genuine ecommerce research engine capable of delivering product, keyword, shop, category, niche, and opportunity intelligence without requiring official marketplace API accounts, while strictly enforcing zero-fabrication guarantees and observation provenance.

**What changed**:
- **Canonical Multi-Source Research Pipeline Integration**:
  - Integrated `orchestrateProductResearch` into `runProductResearch`, `searchMarketplaceProducts`, and `fetchMarketplaceKeywordResearch`.
  - Unified multi-source acquisition cascades: `PUBLIC_WEB` $\to$ `MARKETPLACE_API` $\to$ `HISTORICAL_OBSERVATION`.
- **Longitudinal Observation & Trend Foundation (`src/marketplaces/core/acquisition/trends.ts`)**:
  - Implemented `calculateObservationTrendsFromPoints` and `acquireLongitudinalTrends`.
  - Calculates genuine empirical price deltas, review velocities, and lifecycle persistence statuses (`NEW`, `PERSISTENT`, `STALE`).
  - Zero-Fabrication Rule: if $n \le 1$ observation, trend deltas and velocities are strictly `null`.
- **Empirical Keyword Harvesting & Deterministic Intent Clustering (`src/marketplaces/core/acquisition/keywords.ts`)**:
  - Implemented `buildDeterministicKeywordClusters` sorting keywords into `MATERIAL_STYLE`, `RECIPIENT_OCCASION`, `PRODUCT_MODIFIER`, and `GENERAL` clusters.
  - Harvests keywords directly from observable public listing titles and tags across Amazon, eBay, Walmart, and Etsy.
- **Public Shop & Seller Research Engine (`src/marketplaces/core/acquisition/shops.ts`)**:
  - Implemented `fetchPublicShopResearch` extracting seller profile metrics, calculating price distributions, and evaluating canonical shop competition barriers (`scoreShopCompetition`) without seller OAuth.
- **Public Category Aggregation Engine (`src/marketplaces/core/acquisition/categories.ts`)**:
  - Implemented `aggregatePublicCategoryIntelligence` calculating empirical price percentiles (min, max, median, 10th/90th percentiles) and opportunity score distributions.
- **Cross-Marketplace Research Coverage Model (`src/marketplaces/core/types.ts` & `src/services/intelligence/cross-marketplace-comparison.ts`)**:
  - Added `ResearchCoverage` model tracking total products, fresh counts, available signal groups, and coverage confidence.
- **Live Smoke Testing Harness (`src/tests/live-smoke/live-research-smoke.ts`)**:
  - Added opt-in development smoke test facility gated behind `SELLERSALT_LIVE_RESEARCH_SMOKE=true`.
- **Verified Quality Baseline**:
  - Test suite: **895/895 passing across 160 suites** (`npx tsx --env-file=.env.local --test src/tests/*.test.ts`).
  - TypeScript: Clean (`npx tsc --noEmit`).
  - Prisma: Valid, 29 migrations up to date.
  - Next.js: Clean production build (**161/161 routes compiled**).









