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
## Production-Grade Research Acquisition Hardening — Batch 10 (2026-08-20)

**Why**: To harden SellerSalt's marketplace-independent research acquisition system into a production-grade acquisition layer that reliably operates as the primary research data source, protecting against SSRF attacks, handling redirects safely, managing rate limits with exponential jitter backoff, tracking granular field-level provenance, and orchestrating product detail resolution.

**What changed**:
- **Centralized Domain Safety & SSRF Guard (`src/marketplaces/core/acquisition/compliance.ts`)**:
  - Implemented `ALLOWED_MARKETPLACE_DOMAINS`, `isAllowedMarketplaceHost`, `isAllowedMarketplaceUrl`, and hardened `validateAcquisitionCompliance`.
  - Strictly blocks IP literals, private networks, cloud metadata endpoints (`169.254.169.254`), non-standard ports, and authenticated seller portals (`/your/shops`, `sellercentral.amazon.com`, `my.ebay.com`, `seller.walmart.com`, `seller-us.tiktok.com`).
- **Production-Hardened Public Page Fetcher (`src/marketplaces/core/acquisition/page-fetcher.ts`)**:
  - Implemented manual safe redirect resolution (`redirect: "manual"`) validating every redirect target against domain safety policy before following.
  - Added bounded redirect limits (max 3) and exponential backoff with randomized jitter for 429 rate limits and 5xx server errors.
  - Enforced content-type verification and response payload size caps (5MB max).
- **Field-Level Provenance & Lineage (`src/marketplaces/core/types.ts` & `src/marketplaces/core/acquisition/merger.ts`)**:
  - Added `FieldProvenanceRecord` and `ProductFieldLineage` to canonical `NormalizedProduct`.
  - Non-destructive observation merger builds explicit field lineage for all individual metrics (`title`, `price`, `rating`, `reviewCount`, `favoritesCount`, `salesCount`, `estimatedDemand`).
- **Product Detail Orchestration (`src/marketplaces/core/acquisition/orchestrator.ts`)**:
  - Added `orchestrateProductDetail` resolving individual product listings across `PUBLIC_WEB` $\to$ `MARKETPLACE_API` $\to$ `HISTORICAL_OBSERVATION`.
- **Public Adapters & Parsers Hardening (`structured-parser.ts`, `amazon`, `ebay`, `walmart`, `etsy`)**:
  - Hardened semantic listing card and container parsers supporting both `data-listing-id` container blocks and standard link anchors.
  - Enhanced category aggregation with overloaded parameter signatures and exact catalog counting.
## Production Research Workbench & Persistent Observation Intelligence — Batch 11 (2026-08-20)

**Why**: To move SellerSalt from having a marketplace-independent acquisition architecture to operating a production-grade persistent research workbench that acquires, normalizes, stores, refreshes, compares, and analyzes marketplace observations over time with deterministic deduplication, automated change detection, execution budgets, and UI transparency.

**What changed**:
- **First-Class Observation Store in PostgreSQL (`prisma/schema.prisma`)**:
  - Added `ResearchRun`, `ProductObservation`, `ProductObservationSnapshot`, `KeywordObservation`, `CategoryObservation`, and `AcquisitionSourceHealth` models.
  - Cleaned up historical staging database anomalies and synchronized schema (`db push`).
- **Observation Identity & Deduplication (`src/marketplaces/core/acquisition/deduplication.ts`)**:
  - Implemented SHA-256 fingerprinting (`computeProductObservationFingerprint`) across normalized price, currency, rating, reviews, favorites, sales, title, shop, and status.
  - Implemented `evaluateObservationChange` to avoid redundant snapshot creation when metrics are unchanged.
- **Product & Query Change Detection Engine (`src/marketplaces/core/acquisition/diff-engine.ts`)**:
  - Implemented `calculateProductObservationDiff` calculating exact price drops, dollar deltas, review gains, and monthly review velocity across snapshots.
  - Implemented `compareResearchRuns` computing appearing, disappearing, and persisting listing sets across research runs.
  - Strictly enforces the Zero-Fabrication Rule: if $n \le 1$ observation, deltas and velocities remain `null`.
- **Research Budgets & Safety Bounds (`src/marketplaces/core/acquisition/research-budgets.ts`)**:
  - Implemented `ResearchBudgetTracker` enforcing pagination limits (max 3 pages), listing quotas (max 50 listings), shop quotas (max 15 shops), timeout bounds (max 20s), and payload size limits (max 5MB).
- **Multi-Tier Research Cache (`src/marketplaces/core/acquisition/research-cache.ts`)**:
  - Implemented `ResearchCache` with domain-specific TTLs (Product: 6h, Keyword: 12h, Shop: 24h, Category: 7d) and targeted invalidation by marketplace and query.
- **Acquisition Source Health Engine (`src/marketplaces/core/acquisition/source-health.ts`)**:
  - Implemented `SourceHealthTracker` tracking success rates, latencies, rate limits, and access restrictions per marketplace and source type.
- **Unified Research Workbench Orchestrator (`src/marketplaces/core/acquisition/workbench.ts`)**:
  - Implemented `executeResearchRun` supporting `PRODUCT`, `KEYWORD`, `SHOP`, `CATEGORY`, `NICHE`, and `RADAR` runs.
  - Handles cache checks, execution budgets, dual persistence (populating both new observation tables and backwards-compatible prospects), and automated diff comparisons.
- **New REST API Endpoints**:
  - `POST /api/research/run`: Execute unified research run with caching and persistence.
  - `GET /api/research/runs`: List historical research runs for an organization.
  - `GET /api/research/runs/[id]`: Retrieve run details and associated product observations with snapshots.
  - `GET /api/research/sources/health`: Inspect live operational health across all marketplace sources.
  - `POST /api/research/compare`: Compare two research runs or fetch longitudinal product diffs.
- **Research Workbench UI Transparency Card (`src/components/research/ResearchWorkbenchCard.tsx`)**:
  - Renders signal provenance, source badges, temporal freshness tiers, confidence scores, and diff highlights.
- **Comprehensive Test Baseline**:
  - Created `src/tests/batch-11-research-workbench.test.ts` (16 test cases).
  - Test suite: **935/935 passing across 179 suites** (`npx tsx --env-file=.env.local --test src/tests/*.test.ts`).
  - TypeScript: Clean (`npx tsc --noEmit`).
  - Prisma: Valid (`prisma validate`).
  - Next.js: Clean production build (**166/166 routes compiled**).

## Research Workbench → Real Ecommerce Intelligence Center — Batch 12 (2026-08-20)

**Why**: To productize SellerSalt's marketplace-independent research architecture into a full-featured, production-grade application surface (`/research`, `/research/runs/[id]`, `/research/history`, `/research/compare`), providing interactive research across all 6 commerce domains (Product, Keyword, Shop, Category, Niche, Radar) with full provenance transparency, honest capability matrices, and zero synthetic defaults.

**What changed**:
- **Full Interactive Research Center UI (`/research` & `src/app/(dashboard)/research/research-client.tsx`)**:
  - Interactive modal-less workspace for executing `PRODUCT`, `KEYWORD`, `SHOP`, `CATEGORY`, `NICHE`, and `RADAR` research runs.
  - Dynamic forms with query guidance, result limit options, price filtering, and cache bypass controls.
  - Deterministic progressive stage timeline (`PREPARING` → `CHECKING_SOURCES` → `ACQUIRING_DATA` → `NORMALIZING` → `EVALUATING_INTELLIGENCE` → `PERSISTING` → `COMPLETED`).
- **Dedicated Multi-Domain Research Report Component (`src/components/research/ResearchReportView.tsx`)**:
  - Renders domain-specific intelligence views for Product Research (cards/grid with canonical opportunity scores and rating breakdown), Keyword Intelligence (empirical listing prevalence %, demand proxy, intent categories, and explicit zero-fabrication search volume status), Shop Research (competition barrier ratings, catalog yield, review pace), Category Taxonomy (percentile price distribution and opportunity score distribution), Niche Discovery (sub-niche opportunities and momentum), and Opportunity Radar (cross-marketplace comparison matrix with Best Available Channel recommendation).
- **Dedicated Run Detail Server & Client Page (`/research/runs/[id]`)**:
  - Direct deep-linking to historical research runs with full observation lineage, snapshots, and signal breakdown.
- **Canonical Marketplace Capability Matrix (`src/lib/marketplace-capability-matrix.ts`)**:
  - Single source of truth for public web and official API capability readiness across Etsy, Amazon, eBay, Walmart, Shopify, WooCommerce, and TikTok Shop.
- **Run History, Comparison, and Source Health Panels**:
  - Embedded history view with search, filter, and quick report inspection.
  - Side-by-side run diff engine (`/research` compare mode) computing appearing/disappearing items and price drops.
  - Real-time acquisition source health monitor backed by `SourceHealthTracker`.
- **Comprehensive Quality & Test Baseline**:
  - Created `src/tests/batch-12-research-center.test.ts` (14 comprehensive test cases).
  - Test suite: **949/949 tests passing across 186 suites**.
  - TypeScript: Clean (`npx tsc --noEmit`).
  - Prisma: Valid (`prisma validate`).
  - Next.js: Clean production build (**168/168 static and dynamic routes compiled**).

## Real-World Marketplace Acquisition Reliability & Coverage Expansion — Batch 13 (2026-08-20)

**Why**: To make SellerSalt's marketplace-independent public web acquisition layer production-grade for actual public research across Etsy, Amazon, eBay, Walmart, and TikTok Shop, enforcing multi-page budget bounds, parser resilience against missing/partial HTML attributes and malformed JSON-LD, structured source status handling, research quality scoring, end-to-end diagnostics tracing, and strict SSRF / redirect protection.

**What changed**:
- **Multi-Marketplace HTML & JSON-LD Parser Robustness**:
  - Validated and hardened semantic listing card extraction for Etsy (`data-listing-id`), Amazon (`data-asin`), eBay (`s-item`), and Walmart (`data-item-id`).
  - Implemented layered parsing strategy (JSON-LD `Product` / `BreadcrumbList`, OpenGraph fallback, semantic HTML) returning valid partial observations when non-critical fields (e.g. rating, review count) are missing.
- **Structured Source Status & Health Telemetry**:
  - Standardized source status (`SUCCESS`, `PARTIAL`, `NO_RESULTS`, `ACCESS_RESTRICTED`, `RATE_LIMITED`, `TIMEOUT`, `PARSER_FAILURE`, `SOURCE_UNAVAILABLE`).
  - Enhanced `SourceHealthTracker` distinguishing in-memory cache hits from live external network successes and access restrictions.
- **Research Quality Evaluation Engine (`src/marketplaces/core/acquisition/research-quality.ts`)**:
  - Created `evaluateResearchQuality()` calculating empirical dataset completeness (Observation Volume 30 pts, Temporal Freshness 25 pts, Signal Coverage 25 pts, Source Diversity 20 pts) strictly separated from commercial opportunity scoring.
- **Acquisition Diagnostics Tracing Engine (`src/marketplaces/core/acquisition/diagnostics.ts`)**:
  - Created `runAcquisitionDiagnostics()` providing end-to-end tracing across adapter resolution, cache state, source health, live query execution, and normalization without exposing sensitive headers.
- **Enhanced Live Smoke Test Facility (`src/tests/live-smoke/live-research-smoke.ts`)**:
  - Updated opt-in manual test harness (`SELLERSALT_LIVE_RESEARCH_SMOKE=true`) covering Product, Keyword, Category, Diagnostics, and Opportunity Radar across supported public marketplaces.
- **Security & SSRF Redirect Guard (`src/marketplaces/core/acquisition/compliance.ts`)**:
  - Implemented `isSafeRedirect()` validating that redirects stay within authorized marketplace public domains and block private IP ranges (127.0.0.1, 169.254.169.254, loopback) and authenticated seller dashboards.
- **Comprehensive Test Baseline**:
  - Created `src/tests/batch-13-acquisition-reliability.test.ts` (20 test cases).
  - Test suite: **969/969 passing across 195 suites** (`npx tsx --env-file=.env.local --test src/tests/*.test.ts`).
  - TypeScript: Clean (`npx tsc --noEmit`).
  - Prisma: Valid (`prisma validate`).
  - Next.js: Clean production build (**168/168 static and dynamic routes compiled**).

## Production Research Intelligence Engine & Autonomous Acquisition Recovery — Batch 14 (2026-08-20)

**Why**: To transform SellerSalt's public acquisition layer into a self-improving, production-grade intelligence acquisition system capable of autonomous strategy resolution, bounded pagination with duplicate detection, query normalization, parser drift detection, multi-tier recovery, longitudinal shop metrics, category comparisons, and structured field-level provenance transparency.

**What changed**:
- **Centralized Acquisition Strategy Engine (`src/marketplaces/core/acquisition/strategy-engine.ts`)**:
  - Implemented `AcquisitionStrategyEngine.resolveStrategyPlan()` coordinating strategies based on marketplace, research type, cost, risk, historical health, and capabilities.
  - Prioritized pipeline: `PUBLIC_SEARCH_HTML` -> `STRUCTURED_JSON_LD` -> `PRODUCT_DETAIL_CRAWL` -> `SECONDARY_OFFICIAL_API` -> `TERTIARY_HISTORICAL_DB`.
- **Autonomous Acquisition Recovery Engine (`src/marketplaces/core/acquisition/recovery-engine.ts`)**:
  - Implemented `AcquisitionRecoveryEngine.executeWithRecovery()` with graceful multi-tier fallback when primary extraction yields poor/empty results or degrades.
  - Strictly enforces compliance by halting immediately upon `ACCESS_RESTRICTED` or `RATE_LIMITED` without attempting forbidden anti-bot evasion.
- **Universal Pagination Engine (`src/marketplaces/core/acquisition/pagination.ts`)**:
  - Reusable multi-page coordinator supporting page numbers, cursors, and next URLs.
  - Features duplicate item saturation termination and strict budget quota enforcement (`maxPages`, `maxItems`, `maxPayload`, `maxDuration`).
- **Query Normalization & Search Variants Engine (`src/marketplaces/core/acquisition/query-normalizer.ts`)**:
  - Cleans whitespace and punctuation noise, strips stop words, and generates bounded semantic research variants (2-3 variants max) without request explosion.
- **Parser Health & Drift Detection Engine (`src/marketplaces/core/acquisition/parser-health.ts`)**:
  - Calculates real-time field fill rates for title, price, rating, review count, seller, category, and image.
  - Detects parser drift and degradation (e.g. price extraction rate < 40% on valid 200 OK HTML) and alerts source health tracking.
- **Intelligence Upgrades across 6 Domains**:
  - *Keywords*: Empirical listing prevalence %, price association, and intent classification (`MATERIAL_STYLE`, `RECIPIENT_OCCASION`, `PRODUCT_MODIFIER`, `GENERAL`) with strictly null search volume.
  - *Shops*: Public seller profiles, catalog yield, competition scoring, and longitudinal catalog/review deltas from database history.
  - *Categories*: Percentile price distributions (10th, median, 90th) and `comparePublicCategories()` cross-category benchmarking.
  - *Niches*: Structured niche profiles with explicit signals and limitations.
- **Enhanced UI Transparency & Research Report Views (`ResearchReportView.tsx`)**:
  - Added field-level signal completeness progress bars (Title, Price, Rating, Reviews, Seller, Category).
  - Added Strategy Resolution Timeline displaying exact step-by-step acquisition and recovery lineage.
- **Comprehensive Test Baseline**:
  - Created `src/tests/batch-14-strategy-and-recovery.test.ts` (23 test cases).
  - Full test suite: **992/992 passing across 208 suites** (`npx tsx --env-file=.env.local --test src/tests/*.test.ts`).
  - TypeScript: Clean (`npx tsc --noEmit`).
  - Prisma: Valid (`prisma validate`).
  - Next.js: Clean production build (**168/168 static and dynamic routes compiled**).

## SellerSalt Intelligence Data Depth & Marketplace Coverage Expansion — Batch 15 (2026-08-20)

**Why**: To transition SellerSalt from acquiring raw public observations to building a structured, reusable, multi-dimensional intelligence memory across products, sellers, categories, keywords, and niches with rigorous provenance, longitudinal tracking, and zero data fabrication.

**What changed**:
- **Longitudinal Intelligence Engine (`src/marketplaces/core/acquisition/longitudinal.ts`)**:
  - Implemented multi-snapshot historical intelligence evaluating price deltas, daily review velocities, rating drift, catalog expansion, and keyword momentum.
  - Strictly adheres to the $n \ge 2$ observation threshold requirement — returns `null` deltas and `INSUFFICIENT_DATA` for $n \le 1$ observations without fabricating 0% changes.
- **Market Memory & Intelligence Snapshot Layer (`src/marketplaces/core/acquisition/market-memory.ts`)**:
  - Created indexing and caching engine for domain intelligence snapshots (`PRODUCT`, `KEYWORD`, `SELLER`, `CATEGORY`, `NICHE`, `RADAR`).
  - Preserves exact observation period, sample size, freshness rating, confidence, derived metrics, and source lineage.
- **Product Demand Intelligence Engine (`src/marketplaces/core/acquisition/demand.ts`)**:
  - Evaluates demand proxy scores (0-100) strictly from observable signals (verified review count, buyer ratings, favorites/saves, velocity).
  - Categorizes all metrics into `OBSERVED`, `ESTIMATED`, `DERIVED`, or `UNAVAILABLE`.
  - Explicitly refuses to fabricate exact monthly search volume or unit sales numbers.
- **Deep Category Intelligence & Multi-Percentile Distribution (`src/marketplaces/core/acquisition/categories.ts`)**:
  - Added 10th, 25th, median, 75th, and 90th percentile price metrics.
  - Added observed seller count, sample-level seller concentration index (Herfindahl-Hirschman proxy), freshness ratio, and review barrier rating.
- **Enhanced Public Seller Research (`src/marketplaces/core/acquisition/shops.ts`)**:
  - Computes observed catalog size, category concentration breakdown, median price, and longitudinal catalog/review deltas from database history.
- **Keyword Intelligence 2.0 (`src/marketplaces/core/acquisition/keywords.ts`)**:
  - Added seller prevalence %, keyword intent classification, price associations, and longitudinal momentum status (`RISING`, `STABLE`, `DECLINING`, `INSUFFICIENT_DATA`).
- **Niche Discovery Market Profiles (`src/services/intelligence/niche-discovery.ts`)**:
  - Generates structured answers addressing the 10 market questions (active status, sample growth, dominant price bands, dominant keywords, dominant subcategories, seller concentration).
- **Enriched Product Observation Depth (`src/marketplaces/core/types.ts`)**:
  - Extended `NormalizedProduct` and `ProductFieldLineage` with `originalPrice`, `discountPercent`, `brand`, `badges`, `shippingInfo`, `availability`, `variantsCount`, and field-level lineage maps.
- **Comprehensive Test Baseline**:
  - Created `src/tests/batch-15-intelligence-depth.test.ts` (11 test cases).
  - Full test suite: **1003/1003 passing across 218 suites** (`npx tsx --env-file=.env.local --test src/tests/*.test.ts`).
  - TypeScript: Clean (`npx tsc --noEmit`).
  - Prisma: Valid (`prisma validate`).
  - Next.js: Clean production build (**168/168 static and dynamic routes compiled**).

## Batch 16: Market Intelligence & Opportunity Discovery Engine 2.0 (2026-08-20)

**Why**: Transform SellerSalt from presenting raw listing metrics into an evidence-based, deterministic opportunity discovery engine across Products, Keywords, Niches, Categories, Sellers, and Marketplaces.

**What changed**:
- **Canonical Opportunity Discovery Engine 2.0 (`src/services/intelligence/opportunity-discovery-engine.ts`)**:
  - Multi-domain orchestrator discovering structured opportunities from live public web ingestion and historical memory.
  - Generates typed `OpportunityItem` objects with calibrated confidence, score tiers, and deterministic ranking.
- **Opportunity Explanation Engine (`src/services/intelligence/opportunity-explanation.ts`)**:
  - Generates deterministic, explainable rationales including headline verdicts, positive drivers, watch/risk friction points, universal unknown signal disclosures, and recommended next actions.
- **Unified Market Momentum Engine (`src/marketplaces/core/acquisition/momentum.ts`)**:
  - Classifies empirical trajectories (`RISING`, `ACCELERATING`, `STABLE`, `COOLING`, `DECLINING`, `INSUFFICIENT_DATA`) using longitudinal snapshots ($n \ge 2$ required; $n \le 1$ strictly yields `INSUFFICIENT_DATA` with `null` velocity).
- **Opportunity Watchlist & Multi-Tenant Persistence**:
  - Added `SavedOpportunity` model to `prisma/schema.prisma` with multi-tenant `organizationId` scoping.
  - Implemented `/api/opportunities/discover`, `/api/opportunities`, `/api/opportunities/[id]`, `/api/opportunities/[id]/save`, `/api/opportunities/saved`, and `/api/opportunities/[id]/refresh`.
- **Interactive UI Components**:
  - `OpportunityCard.tsx`: Rich opportunity card with type/marketplace badges, score tier, calibrated confidence, verdict banner, evidence drawers, and save toggles.
  - `OpportunityFeed.tsx`: Filterable opportunity discovery feed supporting type filtering, marketplace switching, and saved watchlist filtering.
- **Comprehensive Test Baseline**:
  - Created `src/tests/batch-16-opportunity-discovery.test.ts` (11 test cases).
## Batch 17: Product Validation & Commercial Decision Engine (2026-08-20)

**Why**: Build a dedicated commercial feasibility validation layer above Opportunity Discovery to help merchants answer "Is this product worth spending time and money investigating?" with deterministic evidence, price positioning, differentiation vectors, and user-supplied unit economics.

**What changed**:
- **Canonical Product Validation Domain (`src/marketplaces/core/validation/types.ts`)**:
  - Structured entities for `ProductValidationReport`, `ValidationVerdict` (`STRONG_CANDIDATE`, `WORTH_INVESTIGATING`, `HIGH_COMPETITION`, `WEAK_DEMAND_SIGNAL`, `DECLINING_SIGNAL`, `INSUFFICIENT_DATA`), `DemandAssessment`, `CompetitionAssessment`, `EconomicsAssessment`, `MomentumAssessment`, and `SaturationAssessment`.
- **Price Positioning Engine (`src/services/intelligence/price-positioning.ts`)**:
  - Maps candidate prices against empirical market percentiles (P10, P25, Median, P75, P90) into distinct strategic tiers (`BELOW_MARKET`, `LOWER_MID_MARKET`, `MID_MARKET`, `UPPER_MID_MARKET`, `PREMIUM`, `OUTSIDE_OBSERVED_RANGE`).
- **User Unit Economics Calculator (`src/services/intelligence/unit-economics.ts`)**:
  - Interactive calculator computing Gross Profit, Contribution Margin, Margin %, Break-Even Price, and Max Allowable CAC with strict `USER_DERIVED` provenance.
- **Differentiation Analysis Engine (`src/services/intelligence/differentiation-engine.ts`)**:
  - Identifies common attributes ($\ge 40\%$) and underrepresented gaps ($15-25\%$) without synthetic customer mind-reading.
- **Product Validation Engine (`src/services/intelligence/product-validation-engine.ts`)**:
  - End-to-end orchestrator executing bounded multi-marketplace validation with dynamic weight redistribution.
- **PostgreSQL Persistence & API Routes**:
  - Added `ProductValidation` model in `prisma/schema.prisma` with `organizationId` multi-tenant isolation.
  - Implemented `/api/validation/product`, `/api/validation/product/[id]`, `/api/validation/product/[id]/refresh`, `/api/validation/unit-economics`, `/api/validation/price-position`, and `/api/validation/history`.
- **Interactive UI Surfaces**:
  - Created `/validate` and `/validate/product/[id]` pages.
  - Implemented `ValidationStudio.tsx` and `ValidationReportView.tsx` with executive summary, scorecard, and tabbed deep dives.
  - Integrated "Validate Product" direct handoff in `OpportunityCard.tsx`.
- **Comprehensive Test Baseline**:
  - Created `src/tests/batch-17-product-validation.test.ts` (18 test cases).
  - Full test suite: **1032/1032 passing across 233 suites** (`npx tsx --env-file=.env.local --test src/tests/*.test.ts`).
  - TypeScript: Clean (`npx tsc --noEmit`).
  - Prisma: Valid (`prisma validate`).
  - Next.js: Clean production build (**168/168 static and dynamic routes compiled**).

## Batch 18: Product Research Command Center & Research-to-Decision Workflow (2026-08-20)

**Why**: Unify all disjoint research, discovery, validation, and competition tools into a singular, high-performance Product Research Command Center where one search initiates the complete evidence-based research-to-decision pipeline.

**What changed**:
- **Domain Types & Contracts (`src/marketplaces/core/research-command-types.ts`)**:
  - Defined types for `ProductResearchSessionRequest`, `ProductResearchSessionResult`, `MarketOverviewStats`, `MarketplaceResearchStatus`, `KeywordClusterItem`, `CompetitionIntelligenceSummary`, `DominantSellerProfile`, `AcquisitionTraceStep`, `CommercialDecisionSummary`, and `ResearchQueueItem`.
- **Command Center Orchestrator (`src/services/intelligence/product-research-command-center.ts`)**:
  - Full research-to-decision pipeline orchestrating Query Normalization $\to$ Multi-Marketplace Public Ingestion $\to$ Deduplication $\to$ Market Overview Statistics $\to$ Keyword Clustering $\to$ Dominant Seller Profiling $\to$ Opportunity Discovery 2.0 $\to$ Product Validation $\to$ Commercial Decision Verdict $\to$ PostgreSQL Persistence in `ResearchRun` and `ProductObservation`.
- **Research Comparison Engine (`src/services/intelligence/research-comparison-engine.ts`)**:
  - Side-by-side product comparisons across Price, Rating, Reviews, and Marketplace with clean handling of unobserved metrics.
- **Unified Research Queue Manager (`src/services/intelligence/research-queue.ts`)**:
  - Allows merchants to save opportunities, products, and keywords into an organization-scoped queue backed by `SavedOpportunity`.
- **Full API Route Suite**:
  - `POST /api/research/session`, `GET /api/research/session/[id]`, `POST /api/research/session/[id]/refresh`, `POST /api/research/compare`, `GET /api/research/queue`, `POST /api/research/queue`, `DELETE /api/research/queue/[id]`.
- **Command Center Interactive UI (`src/components/research/ProductResearchCommandCenter.tsx`)**:
  - Command Bar with depth switcher (`QUICK`, `STANDARD`, `DEEP`) and marketplace toggles.
  - Market Overview KPIs (Price bands, Opportunity, Demand, Competition, Momentum).
  - 7 interactive deep-dive tabs: Observed Products, Keyword Clusters, Competition & Merchants, Opportunities, Decision & Risks, Data Quality & Trust, and Compliant Acquisition Trace.
  - Dedicated `/research-center` route with navigation link.
- **Verification Baseline**:
  - Full test suite: **1043/1043 passing across 243 suites** (`src/tests/batch-18-product-research-command-center.test.ts`).
  - TypeScript: 100% clean (`npx tsc --noEmit`).
  - Prisma: Valid (`prisma validate`).
  - Next.js: Clean production build (**168/168 routes compiled**).

## Batch 19: Proprietary Market Intelligence Graph & Continuous Market Memory Engine (2026-08-20)

**Why**: Transform accumulated multi-marketplace observations into an interconnected proprietary market intelligence graph that gets smarter from every observation it collects, supporting cross-marketplace entity resolution, continuous market memory, "What Changed?" change detection, and multi-timeframe momentum.

**What changed**:
- **Canonical Market Entity Model (`src/marketplaces/core/graph/entities.ts`)**:
  - Structured canonical entity models for `PRODUCT`, `SELLER`, `CATEGORY`, `KEYWORD`, `NICHE`, and `MARKETPLACE`.
  - Deterministic ID resolution (`prod:mp:extId`, `seller:mp:shop`, `cat:mp:path`, `kw:term`, `niche:name`).
- **Entity Resolution Engine (`src/services/intelligence/entity-resolution-engine.ts`)**:
  - Deterministic cross-marketplace product disambiguation based on Jaccard title token overlap, price band alignment ($\le 15\%$), and brand match (`EXACT`, `HIGH_CONFIDENCE`, `PROBABLE`, `POSSIBLE`, `UNRESOLVED`).
- **Market Intelligence Relationship Graph (`src/marketplaces/core/graph/relationships.ts` & `src/services/intelligence/market-graph-engine.ts`)**:
  - Maintains directed graph connecting Products, Dominant Sellers, Category Taxonomies, and Keywords.
  - Supports interactive subgraph extraction and neighborhood traversal.
- **Continuous Market Memory Engine (`src/services/intelligence/continuous-market-memory.ts`)**:
  - Captures and stores full empirical market snapshots ($P_{10}, P_{25}, P_{50}, P_{75}, P_{90}$, median reviews, seller concentration HHI).
  - Append-only time-series memory ensuring historical integrity.
- **Market Change Detection Engine (`src/services/intelligence/market-change-detection.ts`)**:
  - Evaluates consecutive research runs/snapshots to power the "What Changed?" experience (new products, price movers, review gains, keyword shifts).
  - Zero-Fabrication Contract: For $n < 2$ snapshots, returns `null` / `INSUFFICIENT_DATA` (never 0%).
- **Market Momentum 2.0 (`src/services/intelligence/market-momentum-2.ts`)**:
  - Classifies trajectory into `RISING`, `ACCELERATING`, `STABLE`, `COOLING`, `DECLINING`, or `INSUFFICIENT_DATA` across short-term (<7d), medium-term (7-30d), and long-term (>30d) depths.
- **Opportunity Persistence Engine (`src/services/intelligence/opportunity-persistence.ts`)**:
  - Distinguishes transient score spikes from verified `PERSISTENT_OPPORTUNITY` ($\ge 70$ maintained over $\ge 7$ days).
- **Cross-Marketplace Synthesis & Graph Confidence**:
  - `src/services/intelligence/cross-marketplace-graph.ts` (cross-marketplace price spread and seller overlap).
  - `src/services/intelligence/graph-confidence.ts` (deterministic multi-factor confidence scoring).
- **API Endpoints**:
  - `/api/intelligence/products/[id]`, `/api/intelligence/products/[id]/history`, `/api/intelligence/market/[marketplace]/history`, `/api/intelligence/changes`, `/api/intelligence/cross-marketplace/[id]`, `/api/intelligence/graph`.
- **UI Surfaces**:
  - `/intelligence` page with `MarketIntelligenceGraphView.tsx` and `WhatChangedView.tsx`.
  - Registered in primary navigation.
- **Verification Baseline**:
  - Full test suite: **1060/1060 passing across 254 suites** (`src/tests/batch-19-market-intelligence-graph.test.ts`).
  - TypeScript: 100% clean (`npx tsc --noEmit`).
  - Prisma: Valid (`prisma validate`).
  - Next.js: Clean production build (**168/168 routes compiled**).

## Batch 20: Autonomous Opportunity Discovery, Market Radar 2.0 & Product Idea Engine (2026-08-20)

**Why**: Empower merchants to discover high-value ecommerce opportunities, emerging products, and grounded product concepts directly from observable public market signals without requiring a specific query ("Discover For Me").

**What changed**:
- **Autonomous Discovery Types & Signal Taxonomy (`src/marketplaces/core/autonomous-discovery-types.ts`)**:
  - 15 formal Opportunity Types (`EMERGING_PRODUCT`, `PERSISTENT_PRODUCT`, `RISING_KEYWORD`, `EMERGING_KEYWORD`, `UNDERSERVED_ATTRIBUTE`, `PRICE_GAP`, `CATEGORY_OPPORTUNITY`, `NICHE_OPPORTUNITY`, `LOW_CONCENTRATION_MARKET`, `CROSS_MARKETPLACE_OPPORTUNITY`, `IMPROVING_OPPORTUNITY`, `MOMENTUM_OPPORTUNITY`, `DIFFERENTIATION_OPPORTUNITY`, `NO_ACTIONABLE_OPPORTUNITY`, `INSUFFICIENT_DATA`).
  - Formal Opportunity Signal Taxonomy covering Demand, Competition, Market, Keyword, Differentiation, and Cross-Marketplace signals with field-level provenance.
- **Autonomous Opportunity Discovery Engine (`src/services/intelligence/autonomous-discovery-engine.ts`)**:
  - Bounded seed generation across categories and niches (`QUICK`, `STANDARD`, `DEEP`).
  - Multi-marketplace public ingestion via `MarketplaceRegistry` adapters with full acquisition trace and research quality evaluation.
- **Opportunity Scoring 3.0 & Confidence Model (`src/services/intelligence/opportunity-scoring-3.ts`, `opportunity-confidence.ts`)**:
  - Multi-factor deterministic scoring: Demand (0-25), Competition (0-25), Momentum (0-15), Differentiation (0-15), Price (0-10), Evidence Depth (0-10).
  - Explicit weight redistribution when metrics are unobserved; transparent disclosure of unknown signals.
- **Deterministic Detection Rules (`src/services/intelligence/opportunity-detector.ts`)**:
  - Rule engines evaluating candidates for each specific opportunity type with structured explanations.
- **Opportunity Deduplication & Ranking (`src/services/intelligence/opportunity-deduplication.ts`, `opportunity-ranking.ts`)**:
  - Entity-level deduplication grouping observations around canonical IDs.
  - 8 deterministic ranking modes (`BEST_OPPORTUNITIES`, `FASTEST_RISING`, `LOWEST_COMPETITION`, `BEST_DIFFERENTIATION`, `BEST_PRICE_GAP`, `MOST_PERSISTENT`, `NEWEST_EMERGING`, `CROSS_MARKETPLACE`).
- **Product Idea Engine (`src/services/intelligence/product-idea-engine.ts`)**:
  - Synthesizes evidence-grounded product concepts distinguishing observed metrics, derived strategy angles, and key risks without inventing consumer demand.
- **Opportunity Radar 2.0 Feed Engine (`src/services/intelligence/opportunity-radar-2.ts`)**:
  - Categorized feed organized into 7 decision sections with real-time pulse stats.
- **Watchlist & Alert Engine (`src/services/intelligence/opportunity-watch-engine.ts`)**:
  - Organization-scoped watch items with automated change detection for score shifts ($\ge 5$ pts) and momentum transitions.
- **Discovery History Service (`src/services/intelligence/discovery-history.ts`)**:
  - Persists and lists past autonomous discovery runs in PostgreSQL `ResearchRun`.
- **API Suite**:
  - `POST /api/discovery/run`, `GET /api/discovery/runs`, `GET /api/discovery/runs/[id]`, `GET /api/discovery/opportunities`, `POST /api/discovery/opportunities/[id]/save`, `POST /api/discovery/opportunities/[id]/research`, `POST /api/discovery/opportunities/[id]/validate`, `GET /api/radar`, `POST /api/radar/refresh`, `GET /api/watchlist`, `POST /api/watchlist`, `DELETE /api/watchlist/[id]`, `GET /api/watchlist/alerts`.
- **Interactive UI Surfaces**:
  - `AutonomousDiscoveryCenter.tsx` (Flagship discovery center with "Discover For Me" workflow).
  - `OpportunityRadarFeed.tsx` (Radar 2.0 categorized feed).
  - `OpportunityDetailDrawer.tsx` (Deep-dive drawer with verdict, evidence, risks, handoffs).
  - `ProductIdeaCard.tsx` (Product idea presentation).
  - `WatchlistAlertsView.tsx` (Watchlist & alert center).
- **Verification Baseline**:
  - Full test suite: **1070/1070 passing across 263 suites** (`src/tests/batch-20-autonomous-discovery.test.ts`).
  - TypeScript: 100% clean (`npx tsc --noEmit`).
  - Prisma: Valid (`prisma validate`).
  - Next.js: Clean production build (**168/168 routes compiled**).

## Batch 21: Proprietary Product Opportunity → Sourcing → Launch Intelligence Engine (2026-08-20)

**Why**: Enable merchants to advance from discovering an opportunity into a complete, evidence-grounded decision cockpit with observable attribute intelligence, differentiation angles, empirical price positioning, Bill of Materials, supplier RFQ sourcing specifications, interactive unit economics sensitivity simulator, launch readiness assessment, information value gaps, and prioritized action plan without synthetic supplier pricing.

**What changed**:
- **Domain Contracts (`src/marketplaces/core/opportunity-workspace-types.ts`)**:
  - Structured canonical types for `ProductOpportunityWorkspace`, `EvidenceLedger`, `ProductAttributeIntelligenceSummary`, `DifferentiationBuilderResult`, `MarketPositioningAnalysis`, `ProductConfiguration`, `SourcingSpecification`, `UnitEconomicsAnalysis`, `LaunchReadinessAssessment`, `CommercialDecision`, `ActionPlan`, and `InformationValueReport`.
- **Product Attribute Intelligence Engine (`src/services/intelligence/product-attribute-intelligence.ts`)**:
  - Extracts observable attributes (materials, finishes, styles, formats, bundles, occasions), calculates listing prevalence %, seller concentration, and median price association.
- **Differentiation Builder 2.0 (`src/services/intelligence/differentiation-builder-2.ts`)**:
  - Analyzes saturated market clusters and underrepresented attribute pairs, generating actionable differentiation candidates.
- **Market Positioning Engine (`src/services/intelligence/market-positioning-engine.ts`)**:
  - Evaluates empirical quantiles ($P_{10}, P_{25}, P_{50}, P_{75}, P_{90}$) and structures 5 strategic positioning tiers (Value, Lower-Mid, Mid-Market, Upper-Mid, Premium).
- **Product Configuration Builder (`src/services/intelligence/product-configuration-builder.ts`)**:
  - Constructs structured product configurations strictly separating Observed Combinations from Derived Product Concepts.
- **Sourcing Requirements Intelligence Engine (`src/services/intelligence/sourcing-requirements-engine.ts`)**:
  - Generates comprehensive supplier RFQ checklists, material specs, packaging, and compliance guidelines without fabricating supplier pricing.
- **Unit Economics Scenario Engine 2.0 (`src/services/intelligence/unit-economics-scenario-engine.ts`)**:
  - Models Base, Conservative, and Optimistic financial sensitivity scenarios from user inputs, calculating gross/contribution margin %, marketplace fees, break-even price, and max allowable CAC.
- **Launch Readiness Engine (`src/services/intelligence/launch-readiness-engine.ts`)**:
  - Evaluates readiness across 10 dimensions, assigning structured milestone recommendations.
- **Commercial Decision Tree (`src/services/intelligence/commercial-decision-tree.ts`)**:
  - Higher-level deterministic verdict engine (`PURSUE`, `INVESTIGATE`, `TEST`, `WAIT`, `REJECT`, `INSUFFICIENT_DATA`) detailing positive/negative evidence, unknowns, and risks.
- **Information Value Engine (`src/services/intelligence/information-value-engine.ts`)**:
  - "What should I verify next?" engine ranking information gaps by commercial decision impact.
- **Action Plan Generator (`src/services/intelligence/action-plan-generator.ts`)**:
  - Generates prioritized, uncertainty-reducing 5-step action plan.
- **Evidence Ledger Builder (`src/services/intelligence/evidence-ledger-builder.ts`)**:
  - Compiles traceable evidence records anchoring every score and recommendation in verified observations.
- **Workspace Master Orchestrator (`src/services/intelligence/product-opportunity-workspace-engine.ts`)**:
  - Assembles end-to-end workspaces with multi-tenant organization scoping and persistence.
- **API Suite**:
  - `/api/product-workspaces`, `/api/product-workspaces/[id]`, `/api/product-workspaces/[id]/refresh`, `/api/product-workspaces/[id]/economics`.
- **UI Surfaces**:
  - `ProductOpportunityCockpit.tsx` (Flagship decision cockpit with 15 sections).
  - `/product-workspaces` (Workspace catalog).
  - `/product-workspaces/[id]` (Workspace detail cockpit).
- **Verification Baseline**:
  - Full test suite: **1083/1083 passing across 274 suites** (`src/tests/batch-21-product-opportunity-workspace.test.ts`).
  - TypeScript: 100% clean (`npx tsc --noEmit`).
  - Prisma: Valid (`prisma validate`).
  - Next.js: Clean production build (**168/168 routes compiled**).

## Batch 22: Marketplace Governance + Source-Compliant Intelligence Architecture + Unified Product Intelligence Workspace (2026-08-20)

**Why**: Establish canonical marketplace data governance, explicit source-specific compliance boundaries, policy enforcement, source boundary sanitization, retention governance, and a unified Data Trust transparency system across all ecommerce platforms.

**What changed**:
- **Marketplace Governance Contracts (`src/marketplaces/core/governance/types.ts`)**:
  - Structured canonical types for `MarketplaceDataPolicy`, `PolicyPermissionStatus`, `ComplianceVerificationStatus`, `MarketplaceRetentionRules`, `MarketplaceCachingRules`, `MarketplaceDisplayRules`, `MarketplaceRateLimitRules`, `GovernancePolicyDecision`, `AcquisitionGovernanceLog`, and `DataTrustSummary`.
- **Etsy Data Governance Policy (`src/marketplaces/core/governance/etsy-policy.ts`)**:
  - Explicit compliance boundary separating Public Web, Open API v3, OAuth seller data, and historical memory. Mandates least-privilege OAuth scopes, trademark disclaimers, and zero private portal scraping.
- **Marketplace Governance Registry (`src/marketplaces/core/governance/registry.ts`)**:
  - Authoritative policies for Etsy, Amazon, eBay, Walmart, Shopify, WooCommerce, and TikTok Shop, with strict conservative fallback for unregistered platforms.
- **Source Policy Enforcer (`src/marketplaces/core/governance/source-policy-enforcer.ts`)**:
  - Pre-acquisition policy gate evaluating allowed source types and prohibited private portal paths before network calls. Returns `POLICY_RESTRICTED` on disallow without attempting evasive scraping. Records audit telemetry.
- **Source Boundary Layer (`src/marketplaces/core/governance/source-boundary.ts`)**:
  - Sanitizes product observations to strip seller contact PII (email, phone, address) and buyer data, while enforcing strict tenant isolation.
- **Retention Governance Service (`src/marketplaces/core/governance/retention-governance-service.ts`)**:
  - Evaluates snapshot expiry dates and provides safe snapshot pruning for records past policy retention.
- **Data Trust Engine (`src/services/intelligence/data-trust-engine.ts`)**:
  - Computes transparent trust score (0–100), source diversity, freshness, and completeness metrics, accounting for observed vs derived vs estimated vs unknown signals.
- **UI Surfaces**:
  - `MarketplaceGovernanceMatrix.tsx`: Admin diagnostic matrix for policy, source, retention, and rate limit inspection.
  - `/marketplaces/governance`: Dedicated governance route.
  - `ProductOpportunityCockpit.tsx`: Integrated Data Trust transparency strip and provenance breakdown.
- **Verification Baseline**:
  - Full test suite: **1097/1097 passing across 281 suites** (`src/tests/batch-22-marketplace-governance.test.ts`).
  - TypeScript: 100% clean (`npx tsc --noEmit`).
  - Prisma: Valid (`prisma validate`).
  - Next.js: Clean production build (**168/168 routes compiled**).

## Batch 23: Production Trust, Marketplace-Compliant Acquisition Separation & Intelligence Productization (2026-08-20)

**Why**: Transition SellerSalt from internal intelligence architecture to a production-trustworthy, marketplace-compliant platform with strict anti-circumvention boundaries, canonical access mode resolution, signal classification transparency, Etsy capability matrix, and a public Trust Center.

**What changed**:
- **Marketplace Access Resolver (`src/marketplaces/core/governance/access-modes.ts`)**:
  - Canonical resolution of 9 access modes (`PUBLIC_WEB_ALLOWED`, `PUBLIC_WEB_RESTRICTED`, `API_ALLOWED`, `API_REQUIRES_OAUTH`, `API_REQUIRES_COMMERCIAL_ACCESS`, `CONNECTED_STORE_ONLY`, `HISTORICAL_ONLY`, `NOT_AVAILABLE`, `REQUIRES_PLATFORM_REVIEW`) across 10 capabilities.
- **Anti-Circumvention Guard (`src/marketplaces/core/governance/anti-circumvention.ts`)**:
  - Halts automated fallback to `PUBLIC_WEB` after API restrictions unless public catalog research is independently permitted by policy. Blocks scraping fallback for unauthorized OAuth calls and private seller portal paths.
- **Etsy Capability & Compliance Matrix (`src/marketplaces/core/governance/etsy-capability-matrix.ts`)**:
  - Defines authorized data sources, OAuth scope requirements (`listings_w listings_r shops_r transactions_r`), commercial review paths, and anti-circumvention rules across all 10 capabilities.
- **Signal Classification Contract (`src/marketplaces/core/governance/signal-classification.ts`)**:
  - Standardizes `OBSERVED`, `DERIVED`, `ESTIMATED`, `USER_DERIVED`, and `UNAVAILABLE` metrics with explicit provenance and Zero-Fabrication disclosures.
- **Safe Retention Pruning (`src/marketplaces/core/governance/retention-governance-service.ts`)**:
  - Added dry-run auditing and marketplace-scoped snapshot cleanup.
- **UI Surfaces**:
  - `TrustCenterPage` (`/trust`): Public trust and data methodology center.
  - `UnavailableSignalCard.tsx`: Reusable component explaining transparently why private metrics (search volume, competitor revenue) are unavailable.
  - `MarketplaceAttributionBadge.tsx` & `MarketplaceDisclaimerBox.tsx`: Neutral, compliant marketplace branding and trademark disclaimers.
  - Expanded `MarketplaceGovernanceMatrix.tsx`: Filters for compliance status and access modes.
- **Verification Baseline**:
  - Full test suite: **1112/1112 passing across 289 suites** (`src/tests/batch-23-production-trust.test.ts`).
  - TypeScript: 100% clean (`npx tsc --noEmit`).
  - Prisma: Valid (`prisma validate`).
  - Next.js: Clean production build (**168/168 routes compiled**).

## Batch 24: SellerSalt V1 — Unified Merchant Experience & Product Shell (2026-08-20)

**Why**: Turn the accumulated backend intelligence systems into a unified, intuitive, and cohesive merchant product centered around the 5-step journey (Discover → Research → Validate → Plan → Launch).

**What changed**:
- **Workflow-First Information Architecture (`src/services/navigation.ts`)**:
  - Reorganized primary navigation into job-to-be-done domains (`DASHBOARD`, `DISCOVER`, `RESEARCH`, `DECIDE & VALIDATE`, `BUILD & OPTIMIZE`, `CHANNELS & GOVERNANCE`, `MANAGE & TRUST`) with direct access to `/product-workspaces`.
- **Unified Search Console (`src/components/research/UnifiedSearchEntry.tsx`)**:
  - Central interactive input (*"What are you thinking of selling?"*) with trending sample suggestions, live multi-marketplace capability indicators, and mode selection (Research, Validation, Workspace, Radar).
- **Personalized Continuation & First-Time Experience (`src/components/dashboard/`)**:
  - `PersonalizedContinuationSection.tsx`: Automatically surfaces recent `ResearchRun`, `ProductValidation`, and `SavedOpportunity` records for immediate resumption.
  - `FirstTimeMerchantGuide.tsx`: Friendly 4-phase launchpad for new merchants without fabricating mock data.
- **Seamless Commercial Workflow Connectors (`src/components/workspace/NextCommercialActionBar.tsx`)**:
  - Eliminates dead-ends across `/discovery`, `/research-center`, `/validate`, and `/product-workspaces` with evidence-grounded next actions.
- **Product Specification & Documentation**:
  - Created `docs/SELLERSALT-V1-PRODUCT.md`.
- **Verification Baseline**:
  - Full test suite: **1118/1118 passing across 294 suites** (`src/tests/batch-24-unified-product-shell.test.ts`).
  - TypeScript: 100% clean (`npx tsc --noEmit`).
  - Prisma: Valid (`prisma validate`).
  - Next.js: Clean production build (**168/168 routes compiled**).

## Batch 25: Public Commercial Layer & Launch Readiness Foundation (2026-08-20)

**Why**: Establish a credible, trustworthy, and conversion-ready public marketing foundation centered around SellerSalt's canonical value proposition (*"Know what to sell before you spend money."*), the 5-step workflow journey, and the Zero-Fabrication epistemological contract.

**What changed**:
- **Marketing Homepage (`src/app/page.tsx` & `src/app/marketing-homepage.tsx`)**:
  - Completely rebuilt with canonical messaging, interactive hero search console, problem statement, 5-step workflow showcase, signal classification breakdown, transparent pricing, honest FAQs, and marketplace disclaimers.
- **Product Methodology Page (`src/app/how-it-works/page.tsx`)**:
  - Created comprehensive public walkthrough of the 5-step decision methodology, signal classes, and compliance guardrails.
- **Pricing & Public Shell Updates (`src/app/pricing/page.tsx`, `PublicHeader.tsx`, `PublicFooter.tsx`)**:
  - Modernized with multi-marketplace intelligence copy, clear plan definitions, and working navigation links to `/how-it-works`, `/pricing`, `/trust`, `/marketplaces`.
- **Claim Safety & Trademark Compliance**:
  - Audited all public surfaces to eliminate prohibited speculative claims (*"guaranteed to sell"*, *"exact monthly sales"*, *"spy on competitors"*) and ensure compliant marketplace trademark disclaimers.
- **Documentation & Specifications**:
  - Created `docs/BATCH-25-PUBLIC-PRODUCT-LAUNCH.md`.
- **Verification Baseline**:
  - Full test suite: **1124/1124 passing across 299 suites** (`src/tests/batch-25-public-commercial-launch.test.ts`).
  - TypeScript: 100% clean (`npx tsc --noEmit`).
  - Prisma: Valid (`prisma validate`).
  - Next.js: Clean production build (**169/169 routes compiled**).

## Batch 26: V1 Product Completion & End-to-End Usable SaaS Readiness (2026-08-20)

**Why**: Transition SellerSalt into an end-to-end usable, trustworthy, and continuous V1 SaaS application where real merchants can navigate seamlessly across the entire 5-step commercial decision journey (Discover → Research → Validate → Plan → Launch) without dead ends or synthetic mock metrics.

**What changed**:
- **First-Time Merchant Onboarding (`src/app/(dashboard)/onboarding/`)**:
  - Rewrote `OnboardingClient` to introduce the 5-step workflow, configure focus niches and target marketplaces, explain the Data Trust contract, and route authoritatively into active research.
- **Continuous Workflow Handoffs & Empty States**:
  - Enriched `ProductResearchCommandCenter.tsx` with helpful empty state suggestions and continuous action bars.
  - Verified zero dead ends across Discovery (`OpportunityDetailDrawer.tsx`), Research (`ProductResearchCommandCenter.tsx`), Validation (`ValidationReportView.tsx`), Workspace (`ProductOpportunityCockpit.tsx`), and Studio (`StudioClient.tsx`).
- **Quota & Billing Verification**:
  - Verified `PLAN_DEFINITIONS` alignment with database models and server-side `checkQuota` enforcement across all 4 tiers (Free Explorer, Starter, Pro, Agency).
- **Documentation & Specifications**:
  - Created `docs/BATCH-26-V1-PRODUCT-COMPLETION.md`.
- **Verification Baseline**:
  - Full test suite: **1133/1133 passing across 305 suites** (`src/tests/batch-26-v1-product-completion.test.ts`).
  - TypeScript: 100% clean (`npx tsc --noEmit`).
  - Prisma: Valid (`prisma validate`).
  - Next.js: Clean production build (**169/169 routes compiled**).

## Batch 27: V1 Launch Hardening & Production Usability Readiness (2026-08-20)

**Why**: Transition SellerSalt from technically complete V1 into an activation-hardened, production-ready SaaS for real merchants with validated onboarding, personalized dashboard continuation, query-driven product workspaces, strict multi-tenant isolation, and verified quota enforcement.

**What changed**:
- **Activation & Dashboard Continuation (`src/app/(dashboard)/dashboard/`)**:
  - Validated `DashboardOnboardingGuide` against real database records and refined `PersonalizedContinuationSection` to resume real research without synthetic metrics.
  - Aligned page subtitle with canonical positioning (*"Turn observable marketplace signals into evidence-based product decisions."*).
- **Query-Driven Product Opportunity Workspaces (`src/app/(dashboard)/product-workspaces/`)**:
  - Added support for query parameters (`?q=...`) to filter existing workspaces or seamlessly initialize a new workspace directly from validation results.
- **Launch Studio Policy Alignment (`src/app/(dashboard)/studio/`)**:
  - Updated metadata description to emphasize policy-compliant drafts, SEO scoring, human approval gates, and originality protection.
- **Security & Multi-Tenancy Hardening**:
  - Verified `organizationId` scoping and authentication across all core API endpoints (`/api/product-workspaces`, `/api/product-workspaces/[id]`, `/api/validation/product`, `/api/onboarding/complete`).
- **Documentation & Specifications**:
  - Created `docs/BATCH-27-V1-LAUNCH-HARDENING.md`.
- **Verification Baseline**:
  - Full test suite: **1140/1140 passing across 311 suites** (`src/tests/batch-27-v1-launch-hardening.test.ts`).
  - TypeScript: 100% clean (`npx tsc --noEmit`).
  - Prisma: Valid (`prisma validate`).
  - Next.js: Clean production build (**169/169 routes compiled**).

## Batch 28: Production Billing, Subscription Lifecycle & Commercial Entitlements (2026-08-20)

**Why**: Turn SellerSalt's pricing and quota architecture into a production-grade commercial entitlement, webhook-idempotent subscription lifecycle, and billing reconciliation system.

**What changed**:
- **Authoritative Entitlement Engine (`src/services/billing/entitlement-engine.ts`)**:
  - Implemented `EntitlementEngine` resolving plan definitions, feature flags, marketplace research permissions (Etsy, Amazon, eBay, Walmart, TikTok Shop), discovery depth, and monthly quota counters with exact UTC reset dates.
- **Immutable Billing Event Ledger (`src/services/billing/billing-event-ledger.ts`)**:
  - Built audit ledger recording webhook event IDs, types, organizations, and processing statuses to ensure replay safety and idempotency.
- **Billing Reconciliation Service (`src/services/billing/billing-reconciliation.ts`) & Endpoint (`/api/billing/reconcile`)**:
  - Implemented diagnostic audit engine detecting expired active subscriptions, package mismatches, and missing provider IDs, supporting dry-run and live reconciliation.
- **Deterministic Billing Simulation Harness (`src/services/billing/billing-simulator.ts`)**:
  - Built end-to-end integration test harness simulating complete merchant commercial lifecycles from Free through Starter, Quota Consumption, Renewal, Pro Upgrade, Cancellation, Reactivation, and Past Due fallback.
- **Documentation & Specifications**:
  - Created `docs/BATCH-28-BILLING-COMMERCIAL-READINESS.md`.
- **Verification Baseline**:
  - Full test suite: **1151/1151 passing across 316 suites** (`src/tests/batch-28-billing-and-entitlements.test.ts`).
  - TypeScript: 100% clean (`npx tsc --noEmit`).
  - Prisma: Valid (`prisma validate`).
  - Next.js: Clean production build (**170/170 routes compiled**).

## Batch 29: Production Operations, Observability, Reliability & Real-World Launch Hardening (2026-08-20)

**Why**: Equip SellerSalt with enterprise-grade operational observability, canonical error taxonomy, end-to-end trace correlation, health probes, application rate limiting, and automated stale run recovery for launch reliability.

**What changed**:
- **Canonical Error Taxonomy & Safe Serializer (`src/lib/errors/app-error.ts`)**:
  - Created structured `AppError` class with 18 machine-readable error codes (`AUTHENTICATION_REQUIRED`, `RATE_LIMITED`, `SOURCE_UNAVAILABLE`, `DATABASE_ERROR`, etc.), HTTP status mapping, severity levels, retryability flags, and safe JSON serialization that never leaks stack traces or credentials.
- **Correlation & Distributed Tracing (`src/lib/observability/correlation.ts`)**:
  - Built `CorrelationManager` generating high-entropy trace IDs and extracting `x-sellersalt-correlation-id` / `x-request-id` headers across API routes and services.
- **Structured Production Logger (`src/lib/observability/structured-logger.ts`)**:
  - Implemented `StructuredLogger` emitting JSON logs with automatic recursion-safe redaction of passwords, tokens, API keys, and card numbers.
- **Production Health Endpoints (`src/app/api/health/live/` & `src/app/api/health/ready/`)**:
  - Created `/api/health/live` (process responsiveness and uptime) and `/api/health/ready` (PostgreSQL connectivity check and schema probe).
- **Application Rate Limiter (`src/lib/security/rate-limiter.ts`)**:
  - Built sliding-window token bucket rate limiter with standard tiers for public, auth, research, AI, and billing routes.
- **Operational Diagnostics & Stale Run Recovery (`src/services/admin/operational-diagnostics.ts`) & Endpoint (`/api/admin/diagnostics`)**:
  - Built diagnostic service and endpoint providing health metrics, memory usage, database latency, recent logs, and automated recovery of research runs stuck in `RUNNING` for $>10$ minutes to `TIMED_OUT`.
- **Documentation & Specifications**:
  - Created `docs/BATCH-29-PRODUCTION-OPERATIONS-AND-LAUNCH-HARDENING.md`.
- **Verification Baseline**:
  - Full test suite: **1158/1158 passing across 322 suites** (`src/tests/batch-29-production-operations.test.ts`).
  - TypeScript: 100% clean (`npx tsc --noEmit`).
  - Prisma: Valid (`prisma validate`).
  - Next.js: Clean production build (**173/173 routes compiled**).

## Batch 30: Real-World Production Activation & Launch Readiness Audit (2026-08-20)

**Why**: Complete the production activation pass moving SellerSalt from a production-ready codebase to an actually deployable, externally connectable, operationally verified SaaS with startup configuration validation, transactional email simulation, bounded acquisition smoke testing, and pre-flight launch checklists.

**What changed**:
- **Production Environment Configuration Validator (`src/lib/config/environment-validator.ts`)**:
  - Implemented `EnvironmentValidator` auditing required vs optional environment variables across Boot, Core Research, Billing, Email, and Marketplace integrations without leaking secrets.
- **Transactional Email Service & Simulation Buffer (`src/services/email/transactional-email.ts`)**:
  - Built unified transactional communication layer supporting Nodemailer SMTP, AWS SES, and local simulation capture buffers for test and development runs.
- **Real-Data Acquisition Smoke Test Framework (`src/services/acquisition/acquisition-smoke-test.ts`)**:
  - Created bounded, non-aggressive sanity check harness verifying domain whitelisting, SSRF protections, Data Trust calculations, and research run persistence without prohibited scraping or anti-bot bypass.
- **Canonical Launch Readiness Specifications**:
  - Created `docs/PRODUCTION-ENVIRONMENT.md`.
  - Created `docs/ETSY-INTEGRATION-READINESS.md`.
  - Created `docs/PRODUCTION-LAUNCH-CHECKLIST.md`.
  - Created `docs/V1-LAUNCH-BLOCKERS.md`.
- **Verification Baseline**:
  - Full test suite: **1161/1161 passing across 326 suites** (`src/tests/batch-30-production-activation.test.ts`).
  - TypeScript: 100% clean (`npx tsc --noEmit`).
  - Prisma: Valid (`prisma validate`).
  - Next.js: Clean production build (**173/173 routes compiled**).
