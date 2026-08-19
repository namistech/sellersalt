> **HISTORICAL — different roadmap, different era.** This document's
> Phase A–S sequence describes the pre-marketplace-abstraction build
> order (product research through the browser extension) and is now
> largely complete history, not a forward-looking plan. For the current
> roadmap (marketplace abstraction onward, Phase 0–9), see
> `docs/SELLERSALT-ROADMAP.md` instead — the two use different phase
> letters/numbers on purpose and are not meant to be read as one
> continuous sequence.

# SellerSalt — Phased Implementation Roadmap

- **Document Version:** 2.0.0
- **Status:** Canonical Engineering Roadmap
- **Strategy:** Phased, Test-Driven Execution Sequence

---

## Roadmap Overview & Dependency Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ROADMAP PHASE DEPENDENCY GRAPH                        │
│                                                                             │
│  [PHASE A: Foundation & Data Contracts]                                     │
│        │                                                                    │
│        ▼                                                                    │
│  [PHASE B: Etsy Data Engine & Ingestion]                                    │
│        │                                                                    │
│        ├────────────────────────┬────────────────────────┐                  │
│        ▼                        ▼                        ▼                  │
│  [PHASE C: Product Hunting] [PHASE D: Shop Hunting] [PHASE E: Category Hunt]│
│        │                        │                        │                  │
│        └────────────────────────┼────────────────────────┘                  │
│                                 ▼                                           │
│  [PHASE F: Standalone Keyword Research & Clustering]                        │
│        │                                                                    │
│        ▼                                                                    │
│  [PHASE G: SEO Diagnostic Engine]                                           │
│        │                                                                    │
│        ▼                                                                    │
│  [PHASE H: Unified Workspace Planner]                                       │
│        │                                                                    │
│        ├────────────────────────┬────────────────────────┐                  │
│        ▼                        ▼                        ▼                  │
│  [PHASE I: Content Engine] [PHASE J: AI Listing Gen] [PHASE K: Etsy Write]  │
│        │                        │                        │                  │
│        └────────────────────────┼────────────────────────┘                  │
│                                 ▼                                           │
│  [PHASE L: Shop Health & Growth Optimization]                               │
│        │                                                                    │
│        ▼                                                                    │
│  [PHASE M: Revenue, Profit & Fee Intelligence]                              │
│        │                                                                    │
│        ▼                                                                    │
│  [PHASE N: Longitudinal Tracking (Shops & Listings)]                        │
│        │                                                                    │
│        ▼                                                                    │
│  [PHASE O: SaltBot Domain Copilot Integration]                              │
│        │                                                                    │
│        ▼                                                                    │
│  [PHASE P: Browser Extension Companion]                                     │
│        │                                                                    │
│        ▼                                                                    │
│  [PHASE Q: Admin, Billing & Operations Hardening]                           │
│        │                                                                    │
│        ▼                                                                    │
│  [PHASE R & S: Advanced Analytics & External Ads Feeds]                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase Breakdown & Specifications

### PHASE A — FOUNDATION & DATA CONTRACTS [STATUS: COMPLETE (2026-08-16)]
- **Objective**: Establish unified TypeScript interfaces, Prisma schema extensions (`PlannerItem`, `ListingDraft`, `ListingSeoAudit`, `EtsyExecutionLog`), and data provenance badges.
- **Status**: `COMPLETE`.
- **Delivered**:
  - Prisma Models: `PlannerItem`, `ListingDraft`, `ListingSeoAudit`, `EtsyExecutionLog` added to `prisma/schema.prisma`.
  - Migration: `20260816104000_add_phase_a_foundation_models` (Non-destructive).
  - TypeScript Domain Contracts: `src/types/provenance.ts`, `src/types/planner.ts`, `src/types/seo.ts`, `src/types/originality.ts`, `src/types/listing-draft.ts`, `src/types/execution.ts`, `src/types/index.ts`.
  - UI Primitive: `src/components/data/DataProvenanceBadge.tsx` (`[ACTUAL ETSY DATA]`, `[ESTIMATED]`, `[SELLERSALT SCORE]`, `[EXTERNAL DATA]`).
  - Unit/Contract Tests: `src/tests/phase-a-contracts.test.ts` (7/7 passing).
  - Validation: `npx tsc --noEmit` (0 errors) and `npx next build` (100% build pass).

### PHASE B — ETSY DATA ENGINE & RATE-LIMITING [STATUS: COMPLETE (2026-08-16)]
- **Objective**: Upgrade `src/connectors/etsy/` client with robust Redis TTL caching, structured error recovery, rate budget tracking, and buyer taxonomy ingestion.
- **Status**: `COMPLETE`.
- **Delivered**:
  - Centralized Cache: `src/connectors/etsy/cache.ts` with Redis TTL caching (Search: 6h, Shop Profile: 24h, Reviews: 24h, Taxonomy: 7d) and transparent in-memory fallback.
  - Rate Budget Queue: `src/connectors/etsy/client.ts` with configurable `ETSY_REQUESTS_PER_SECOND` (default: 8 req/sec).
  - Structured Retries: Exponential backoff with jitter and `Retry-After` header parsing for HTTP 429 and 5xx errors; immediate rejection on non-retryable 4xx errors.
  - Buyer Taxonomy: `src/connectors/etsy/taxonomy.ts` with `getBuyerTaxonomyNodes()` and `getPropertiesByBuyerTaxonomyId()`.
  - Multi-Tenant & Credential Safety: Private seller channels use isolated cache namespaces (`etsy:v1:tenant:{orgId}:...`); credentials are never logged or hashed into public keys.
  - Tests: `src/tests/phase-b-data-engine.test.ts` (16/16 passing, 23 total passing across all suites).
  - Validation: `npx tsc --noEmit` (0 errors) and `npx next build` (100% build pass).

### PHASE C — PRODUCT HUNTING & OPPORTUNITY RADAR [STATUS: COMPLETE (2026-08-16)]
- **Objective**: Deliver production-ready live marketplace search, 5-factor Opportunity Radar scoring, product research drawer, comparison modal, and 1-click "Add to Planner".
- **Status**: `COMPLETE`.
- **Delivered**:
  - Live Search API: `src/app/api/products/search/route.ts` executing rate-limited, cached Etsy searches with shop enrichment.
  - Multi-Product Comparison API: `src/app/api/products/compare/route.ts` analyzing shared/unique tag clusters and pricing distributions.
  - Planner Integration: `src/app/api/planner/items/route.ts` creating `PlannerItem` records with rich `PlannerResearchSnapshot` and provenance.
  - Opportunity Radar Engine: `src/services/product-hunting.ts` computing 5-factor deterministic scores (`[SELLERSALT SCORE]`) and classifications (`EMERGING`, `HIDDEN_GEM`, `GROWING`, `COMPETITION_RISING`).
  - Research Drawer: `src/components/intelligence/ProductResearchDrawer.tsx` with high-res photos, shop benchmarks, 5-factor meter bars, evidence, and actions.
  - Comparison Modal: `src/components/intelligence/ProductComparisonModal.tsx` supporting side-by-side analysis of 2–4 products.
  - Live Search UI: `src/app/(dashboard)/prospects/live-search-tab.tsx` and updated `/prospects` & `/radar` pages.
  - Tests: `src/tests/phase-c-product-hunting.test.ts` (6/6 passing, 29 total across all test suites).
  - Validation: `npx tsc --noEmit` (0 errors) and `npx next build` (100% build pass, 105 pages generated).

### PHASE D — SHOP HUNTING & REVERSE-ENGINEERING [STATUS: COMPLETE (2026-08-16)]
- **Objective**: Deliver institutional-grade 8-section Shop Intelligence profile, catalog yield analytics, long-tail tag frequency extraction, and strategic reverse-engineering recommendations.
- **Status**: `COMPLETE`.
- **Delivered**:
  - Domain Types: `src/types/shop-research.ts` exporting normalized contracts for the 8-section profile, KPIs, catalog yield, and strategic verdicts.
  - Shop Intelligence Engine: `src/services/shop-intelligence.ts` providing `extractLongTailTagFrequencies`, `computeCatalogYield`, `computeStrategicShopVerdict`, and `fetchCompleteShopIntelligence`.
  - API Route: `src/app/api/shops/[shopExternalId]/route.ts` delivering live Etsy shop ingestion, top 50 listing harvesting, and cached shop profile data.
  - Institutional UI: `src/app/shops/[shopExternalId]/shop-detail-client.tsx` and `page.tsx` rendering all 8 distinct sections with strict data provenance badges.
  - Planner & ShopWatch Integrations: 1-Click "Add to Planner" on top listings and keywords, and automated daily snapshot tracking.
  - Tests: `src/tests/phase-d-shop-intelligence.test.ts` (6/6 passing, 35 total across all suites).
  - Validation: `npx tsc --noEmit` (0 errors) and `npx next build` (100% build pass, 105 pages generated).

### PHASE E — CATEGORY HUNTING & TAXONOMY EXPLORATION [STATUS: COMPLETE (2026-08-16)]
- **Objective**: Deliver interactive taxonomy tree exploration, category-level market benchmarks (price distribution percentiles, catalog yields, saturation indices), taxonomy property discovery, and direct Product Hunting & Planner bridges.
- **Status**: `COMPLETE`.
- **Delivered**:
  - Domain Contracts: `src/types/category-hunting.ts` defining hierarchy nodes, price percentiles, market benchmarks, and category profiles.
  - Category Intelligence Engine: `src/services/category-hunting.ts` calculating exact median/10th/90th price percentiles, store catalog yields, niche saturation index, and composite opportunity score.
  - API Endpoints: `GET /api/categories` (taxonomy tree traversal & search) and `GET /api/categories/[taxonomyId]` (deep category profiling with active listing samples and properties).
  - Client Service Adapter: `src/services/category-hunting-client.ts` handling client requests and 1-Click "Add Category to Planner".
  - Interactive UI: `/categories` directory page (`src/app/(dashboard)/categories/page.tsx` & `category-hunting-client.tsx`) and expandable `TaxonomyTreeBrowser.tsx`.
  - Bridges: Direct 1-Click handoffs to Product Hunting (`/prospects?taxonomyId=...`) and Workspace Planner (`POST /api/planner/items`).
  - Tests: `src/tests/phase-e-category-hunting.test.ts` (9/9 passing, 44 total repository tests).
  - Validation: `npx tsc --noEmit` (0 errors) and `npx next build` (100% build pass, 106 pages generated).

### PHASE F — STANDALONE KEYWORD RESEARCH [STATUS: COMPLETE (2026-08-16)]
- **Objective**: Deliver decoupled, on-demand standalone keyword research querying live Etsy marketplace supply, harvesting all 13 tags and title n-grams, categorizing tail/intent dimensions, and bridging into Planner and Planned Keywords.
- **Status**: `COMPLETE`.
- **Delivered**:
  - Domain Types: `src/types/keyword-research.ts` exporting strong domain structures for standalone search requests, summaries, harvested tags, and listing evidence.
  - Tag Harvesting & NLP Engine: `src/services/keyword-research.ts` providing `harvestTagsAndNgrams`, `calculateTokenOverlap`, `classifyIntent`, `computeKeywordCompetition`, and `fetchStandaloneKeywordResearch`.
  - Standalone API Route: `POST /api/keywords/search` returning real Etsy supply count (`[ACTUAL ETSY DATA]`), price averages (`[ACTUAL ETSY DATA]`), demand proxies (`[ESTIMATED]`), and harvested keyword clusters.
  - Interactive UI: Upgraded `/keyword-research` page (`src/app/(dashboard)/keyword-research/page.tsx`) with search input, match modes, word count filters, tag compliance toggles (≤ 20 chars), competition ratings, CSV exports, and Planner integrations.
  - Client Service Adapter: `src/services/keyword-research-client.ts` handling `POST /api/keywords/search`, bookmarking to `PlannedKeyword`, and 1-Click "Add Keyword to Planner".
  - Tests: `src/tests/phase-f-keyword-research.test.ts` (6/6 passing, 53 total repository tests).
  - Validation: `npx tsc --noEmit` (0 errors) and `npx next build` (100% build pass, 107 pages generated).

### PHASE G — SEO DIAGNOSTIC ENGINE [STATUS: COMPLETE (2026-08-16)]
- **Objective**: Implement rule-based 0-100 SEO scoring rubric analyzing title character length (120-140), 13-tag completeness, tag length (≤20 ch), keyword placement, keyword synergy, and description structures.
- **Status**: `COMPLETE`.
- **Delivered**:
  - Domain Contracts: `src/types/seo.ts` providing full dimensional structures (`SeoScoreBreakdown`, `SeoTitleAnalysis`, `SeoTagAnalysis`, `SeoSynergyAnalysis`, `SeoDescriptionAnalysis`, `SeoTaxonomyAnalysis`, `SeoDiagnostic`, `SeoRecommendation`, `CompleteListingSeoAudit`).
  - Deterministic SEO Engine: `src/services/seo-engine.ts` implementing the canonical 5-pillar rubric (Title 30 pts, 13 Tags 35 pts, Synergy 15 pts, Description 10 pts, Taxonomy 10 pts) with exact point breakdowns and actionable issue catalog.
  - API Routes: `POST /api/seo/audit` supporting live Etsy listing audit by ID/URL or draft payload audit with multi-tenant database persistence.
  - Client Service Adapter: `src/services/seo-engine-client.ts` with `auditListing` and 1-Click "Add SEO Task to Planner" (`POST /api/planner/items`).
  - Interactive UI: `/seo` hub page (`src/app/(dashboard)/seo/page.tsx`) with Live Listing audit tab, Draft Playground, circular score meter, 5-pillar metric cards, issue catalog with severity pills, 13 numbered tag slots, title/tag synergy matrix, and optimization checklist.
  - Research Surface Integration: Added 1-Click "SEO" audit link inside Shop Intelligence winning listings table (`/shops/[shopExternalId]`).
  - Tests: `src/tests/phase-g-seo-engine.test.ts` (19/19 passing, 72 total repository tests).
  - Validation: `npx tsc --noEmit` (0 errors) and `npx next build` (100% build pass, 109 pages generated).

### PHASE H — UNIFIED WORKSPACE PLANNER [STATUS: COMPLETE (2026-08-16)]
- **Objective**: Build Kanban, Table/List view, Detail Inspection Drawer, and Multi-Discipline Research Snapshots backed by `PlannerItem` table.
- **Status**: `COMPLETE`.
- **Delivered**:
  - Domain Types: `src/types/planner.ts` providing full domain contracts (`PlannerItem`, `PlannerResearchSnapshot`, `PlannerProvenance`, `PlannerItemCreateInput`, `PlannerItemUpdateInput`, `PlannerFilterOptions`).
  - Multi-Tenant CRUD APIs: `GET /api/planner/items` (filtering by type, status, search, includeArchived), `POST /api/planner/items` (idempotent creation), `GET /api/planner/items/[id]`, `PATCH /api/planner/items/[id]`, `DELETE /api/planner/items/[id]`.
  - Client Service Adapter: `src/services/planner-client.ts` with `fetchPlannerItems`, `fetchPlannerItemDetail`, `createPlannerItem`, `updatePlannerItem`, and `deletePlannerItem`.
  - Interactive UI: `/planner` hub page (`src/app/(dashboard)/planner/page.tsx` & `planner-client.tsx`) featuring Kanban Board across all 6 canonical stages, Table View, quick stage progression buttons, filter bar, quick create modal, and inspection drawer with target prices, profit calculations, target keywords, and frozen research snapshot provenance.
  - Research Bridges: Fully unified handoffs from Product Hunting (`/prospects`), Shop Intelligence (`/shops`), Category Hunting (`/categories`), Standalone Keyword Research (`/keyword-research`), and SEO Audit (`/seo`).
  - Tests: `src/tests/phase-h-workspace-planner.test.ts` (10/10 passing, 82 total repository tests).
  - Validation: `npx tsc --noEmit` (0 errors) and `npx next build` (100% build pass, 110 pages generated).

### PHASE I — AI LISTING STUDIO & ORIGINALITY ENGINE [STATUS: COMPLETE (2026-08-16)]
- **Objective**: SaltBot AI generator creating 140-char titles, 13 tags (≤20 ch), and structured descriptions with automated n-gram/Jaccard originality validation (<15% overlap gate) and Human Review Gate.
- **Status**: `COMPLETE`.
- **Delivered**:
  - Deterministic Originality Engine: `src/services/originality-engine.ts` computing Jaccard token similarity, 3-gram overlap, longest common matching phrase, and enforcing `<15%` competitor overlap ceiling.
  - Multi-Provider Copywriter Engine: `src/services/listing-generation.ts` with dynamic LLM provider routing, deterministic title length boundary repair (≤140 chars), 13-tag format repair (≤20 chars, lowercase, deduplicated), and integrated SEO audit (Phase G).
  - API Routes: `POST /api/studio/generate` (generates draft, runs originality + SEO audit, creates `ListingDraft` and `ListingSeoAudit`), `GET /api/studio/drafts`, `POST /api/studio/drafts`, `GET/PATCH/DELETE /api/studio/drafts/[id]`, and `POST /api/studio/drafts/[id]/validate`.
  - Client Service Adapter: `src/services/listing-generation-client.ts`.
  - Interactive UI: `/studio` workspace (`src/app/(dashboard)/studio/page.tsx` & `studio-client.tsx`) with split-screen SEO meter, originality checker, title/tag/description live editors, materials tagger, price/stock inputs, and human review approval gate.
  - Planner Integration: 1-Click "Open in Studio" from `/planner` for items in `READY_FOR_DRAFT`.
  - Tests: `src/tests/phase-i-listing-studio.test.ts` (14/14 passing, 96 total repository tests).
  - Validation: `npx tsc --noEmit` (0 errors) and `npx next build` (100% build pass, 113 pages generated).

### PHASE J — ETSY EXECUTION & WRITE-BACK ENGINE [STATUS: COMPLETE (2026-08-16)]
- **Objective**: Safe, auditable write-back engine creating Etsy drafts (`POST /v3/application/shops/{shop_id}/listings`) and updating/publishing listings with strict Human Review Gate, Pre-flight validation, and Idempotent audit logs.
- **Status**: `COMPLETE`.
- **Delivered**:
  - Pre-flight Validation & Payload Mapper: `src/services/etsy-execution/mapper.ts` (Title $\le 140$, 13 tags $\le 20$, price, quantity, state: draft).
  - Execution Service: `src/services/etsy-execution/execution-service.ts` (`createEtsyDraftListing`, `updateEtsyListing`, `publishEtsyListing`, `getDraftExecutionLogs`).
  - Human Approval Gate: Only `ListingDraftStatus.APPROVED` can enter execution.
  - Explicit Publish Gate: Dedicated two-step confirmation modal before activating listing live.
  - Idempotency & Audit Logs: Unique `idempotencyKey` per mutation, recording sanitized request payloads, HTTP response codes, and status transitions in `EtsyExecutionLog`.
  - API Routes: `POST /api/studio/drafts/[id]/approve`, `POST /api/studio/drafts/[id]/push-etsy`, `POST /api/studio/drafts/[id]/publish`, `GET /api/studio/drafts/[id]/logs`, `GET /api/studio/channels`.
  - Client Service Adapter: `src/services/etsy-execution-client.ts`.
  - Studio UI: `/studio` execution controls, Etsy Shop Manager direct link, and Execution Audit Logs modal.
  - Tests: `src/tests/phase-j-etsy-execution.test.ts` (16/16 passing, 112 total repository tests).
  - Validation: `npx tsc --noEmit` (0 errors) and `npx next build` (100% build pass, 114 pages generated).

### PHASE L — SHOP HEALTH & GROWTH OPTIMIZATION
- **Objective**: Diagnostic scan of connected Etsy shops identifying missing tags, dead listings, and catalog gaps with 1-click optimization tasks.
- **Dependencies**: Phases G, K.
- **Missing UI**: `/shop-health` audit dashboard with prioritized growth roadmap.
- **Acceptance Criteria**: Scan produces overall Shop Health Score and generates actionable tasks in the Planner.

### PHASE K — REVENUE & PROFIT INTELLIGENCE [STATUS: COMPLETE (2026-08-16)]
- **Objective**: Complete financial dashboard with Gross Revenue, Fee Deductions, Seller COGS, and Net Profit Waterfall.
- **Status**: `COMPLETE`.
- **Delivered**:
  - Core Revenue Engine: `src/services/revenue-engine.ts` (`calculateProfitWaterfall`, `calculateEtsyFeeBreakdown`, `calculateListingYieldMatrix`, `calculateProfitSimulation`, `generateFinancialInsights`).
  - Four-Tier Financial Integrity: Clearly distinguishes `[ACTUAL ETSY DATA]`, `[CALCULATED]`, `[USER INPUT]`, and `[ESTIMATED]`.
  - Profit & Loss Waterfall: Step-down reconciliation from Gross Sales $\to$ Refunds $\to$ Net Sales $\to$ Platform Fees (Listing, Transaction, Payment, Offsite Ads) $\to$ Seller COGS $\to$ True Net Profit.
  - Unit Profit Calculator: Interactive unit economics simulation with break-even unit count and break-even price.
  - Organization Cost Assumptions: Multi-tenant configuration for default COGS %, packaging, shipping, and offsite ads.
  - API Endpoints: `GET /api/analytics/revenue`, `GET /api/analytics/listings`, `POST /api/analytics/calculator`, `GET/POST /api/analytics/assumptions`.
  - Client Service Adapter: `src/services/revenue-client.ts`.
  - Upgraded UI: `/analytics` with 6 interactive tabs, multi-currency isolation, and date range filters (7D, 30D, 90D, 12M, ALL).
  - Tests: `src/tests/phase-k-revenue-engine.test.ts` (15/15 passing, 127 total repository tests).
  - Validation: `npx tsc --noEmit` (0 errors) and `npx next build` (100% build pass, 118 pages generated).

### PHASE L — TRACKING ENGINE & HISTORICAL INTELLIGENCE [STATUS: COMPLETE (2026-08-16)]
- **Objective**: Longitudinal Competitor & Listing Time-Series Intelligence (`ShopWatch`, `ListingWatch`, `TrackingAlert`) with automated daily snapshot capture, deterministic sales deltas, daily sales velocity calculations (`[ESTIMATED]`), breakout spike detection (>300% baseline), 24h deduplicated alerts, quota enforcement, and interactive time-series growth curves.
- **Status**: `COMPLETE`.
- **Delivered**:
  - Prisma Schema Enhancements: Added `ListingWatch`, `ListingSnapshot`, and `TrackingAlert` models with organization indexing.
  - Canonical Domain Contracts: `src/types/tracking.ts` defining `TrackedShopSummary`, `TrackedListingSummary`, `ShopDeltas`, `ShopVelocity`, `TrackingAlertItem`, and `TrackingQuotaInfo`.
  - Core Tracking Engine: `src/services/tracking-engine.ts` calculating multi-period sales deltas (today, 7d, 30d), review velocity, deterministic estimated daily velocity (`(latest - oldest) / days`), breakout sales spikes, rapid catalog growth, price drops, and 24-hour alert deduplication cooldown.
  - Multi-Tenant API Endpoints: `GET /api/tracking/shops`, `POST /api/tracking/shops`, `DELETE /api/tracking/shops/[shopExternalId]`, `GET /api/tracking/shops/[shopExternalId]/history`, `GET /api/tracking/listings`, `POST /api/tracking/listings`, `DELETE /api/tracking/listings/[listingExternalId]`, `GET /api/tracking/alerts`, `GET /api/tracking/quota`.
  - Client Service Adapter: `src/services/tracking-client.ts`.
  - Upgraded UI: `/spy/tracked` (`src/app/(dashboard)/spy/tracked/page.tsx`) with 3 interactive surveillance tabs (Competitor Shops, Tracked Listings, Alerts Feed), health state indicators (`HEALTHY`, `STALE`, `COLD`), quota usage progress, and detailed Longitudinal History dialog with interactive Recharts sales trajectory curves.
  - Tests: `src/tests/phase-l-tracking-engine.test.ts` (14/14 passing, 141 total repository tests).
  - Validation: `npx tsc --noEmit` (0 errors) and `npx next build` (100% build pass, 122 pages generated).

### PHASE O — SALTBOT DOMAIN COPILOT EXPANSION
- **Objective**: Equip SaltBot with tool-calling capabilities to trigger searches, audit listings, generate drafts, and query store analytics via chat.
- **Dependencies**: Phases C, F, G, H, J.
- **Code to Reuse**: `src/services/assistant/`, `src/components/assistant/SaltBot.tsx`.
- **Acceptance Criteria**: Asking SaltBot to "Draft a listing for my planner concept" creates a verified draft in the Planner.

### PHASE P — BROWSER EXTENSION COMPANION [STATUS: IMPLEMENTATION COMPLETE — LIVE QA PENDING (2026-08-16)]
- **Objective**: Chrome Manifest V3 companion extension for real-time SEO scoring and tag/title suggestion injection directly inside Etsy Shop Manager.
- **Dependencies**: Phases G, H, K — all `COMPLETE`, not blocking.
- **Status**: Implemented across four sub-phases (P1–P4), each independently tested and code-reviewed. **Not yet verified in a live Chrome browser against a real, authenticated Etsy Shop Manager session** — no such session was available while building this; see "Known limitation" below before treating this as customer-ready.
- **Delivered**:
  - **P1 — Foundation & Pairing**: `extension/manifest.json` (MV3, side panel, background service worker), short-lived single-use pairing codes (`POST /api/extension/pair`) exchanged for an opaque, revocable, Redis-hashed session token (`POST /api/extension/pair/exchange`, `GET/DELETE /api/extension/session`) via `src/lib/extension-pairing.ts`. No NextAuth secret, DB credential, or Etsy OAuth secret ever reaches extension code; the server always resolves `organizationId` itself, never accepts one from the extension.
  - **P2 — Etsy Listing Editor Detection & DOM Bridge**: `extension/etsy-content-script.js` + `extension/etsy/{page-detector,selectors,payload}.js`. Detects listing-editor vs. other Etsy pages vs. non-Etsy, tracks SPA navigation (interval polling + `popstate`), waits out async editor rendering (mount polling), extracts title/tags/description/category-name via fail-safe name/aria-label heuristics (never hardcoded classes), debounces (400ms) and deduplicates before messaging the background worker. `taxonomyId` is always reported unavailable by design — never present in visible Etsy markup.
  - **P3 — Real-Time SEO Scoring Overlay**: `POST /api/extension/seo-audit` is a stateless pass-through to the existing `auditListingSeo()` (`src/services/seo-engine.ts`) — no scoring logic duplicated. `extension/background.js` orchestrates per-tab dedup + debounced-by-construction requests (piggybacking on P2's own debounce); side panel renders score/breakdown/diagnostics/recommendations, explicitly labeled "SellerSalt Score" and "not an Etsy-provided ranking, demand, or keyword-volume metric."
  - **P4 — Tag/Title Suggestion Injection**: `POST /api/extension/suggestions` composes the existing SEO engine's diagnostics with the existing standalone keyword research engine (`fetchStandaloneKeywordResearch`, `src/services/keyword-research.ts`) — real, marketplace-harvested tag candidates, not a new keyword engine and not AI-generated. Side panel implements an explicit **Suggestion → Preview → Apply** flow per field: the recommendation is always rendered (Preview, before/after diff) before an "Apply" button is clickable; clicking it sends a single `APPLY_SUGGESTION` message that the Etsy content script alone acts on, writing exactly one field via a React-aware native-value setter. Tag suggestions are strictly additive (merge into existing tags, capped at 13, case-insensitive dedup) — never a destructive replace. **No code path anywhere in the extension calls Etsy's Save/Publish controls; every DOM write is triggered only by that one explicit user click.**
- **Tests**: `phase-p1-extension-pairing.test.ts` (15), `phase-p2-etsy-bridge.test.ts` (22), `phase-p3-seo-overlay.test.ts` (18), `phase-p4-suggestions.test.ts` (16) — 71 focused tests, all passing; full repository suite 226/226 passing; `npx tsc --noEmit` 0 errors; `npx next build` 100% pass (all `/api/extension/*` routes and `/settings/extension` compiled).
- **Known limitation (not solved, flagged deliberately)**: the DOM selector heuristics in `extension/etsy/selectors.js` were built without access to an authenticated Etsy Shop Manager session and are **unverified against Etsy's live markup**. Extraction is fail-safe (returns unavailable rather than throwing/guessing) and injection uses a standard React-controlled-input technique, but both must be validated/tuned against the real editor — via `chrome://extensions` "Load unpacked" + a real Shop Manager session — before this ships to real sellers. Loading as MV3, the pairing flow, live editor detection, and live score updates were verified at the code/test/build level only, not via an actual browser+Etsy session (checklist items 1, 3, 4, 5, 7 in the Phase P completion report).
- **Acceptance Criteria**: Extension pairs with a SellerSalt account, detects the Etsy listing editor, computes and displays a live SellerSalt SEO score with correct provenance, and lets the seller preview and explicitly apply title/tag suggestions — all satisfied at the implementation level; live-session confirmation is the one remaining gate.

### PHASE Q — ADMIN, BILLING & OPERATIONS HARDENING
- **Objective**: Finalize multi-gateway payments, plan limit enforcement, security audit logs, and email verification workflows.
- **Dependencies**: All prior phases.
- **Code to Reuse**: `src/app/api/admin/`, `src/lib/plan-limits.ts`.
- **Acceptance Criteria**: Admin can manage users, modify packages, review audit logs, and test AI/Payment/Email integrations seamlessly.

### PHASE R & S — ADVANCED INTELLIGENCE & EXTERNAL ADS RECONCILIATION
- **Objective**: Ingest advertising ledger expenses into profit calculations; provide CSV import tools for Etsy Ads reports.
- **Dependencies**: Phase M.
- **Acceptance Criteria**: Ad spend correctly deducted from store profit calculations.
