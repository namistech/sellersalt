# BATCH 40 — Data Foundation, Historical Observations & Keyword Research Repair

**Date:** 2026-08-21
**Branch:** `staging`
**Baseline commit:** `5ae2100` (Batch 39)
**Type:** Implementation batch (not an audit) — code, schema, and test changes.

**Scope discipline (per explicit founder instruction, honored)**: no broad new product features, no Market Intelligence UI, no sales/revenue estimation model, no browser-extension acquisition, no Amazon bot/User-Agent workaround, "All Marketplaces" was not revived as any default.

---

## 1. Reproduced starting state (before any fix)

Traced the live code paths (not assumed) before writing any fix:

- **`Prospect.price` fabrication (P0)**: `Prospect.price`/`shopAgeMonths`/`reviewCount`/`activeListings`/`reviewRatio`/`reviewVelocity` were all non-nullable `Float`/`Int` columns. The write sites (`persistPublicProductObservations` in `src/marketplaces/core/acquisition/persistence.ts`, and the scheduled-search worker in `src/workers/index.ts`) both defaulted a genuinely-unobserved value to a fabricated placeholder (`?? 0`, and in the worker's case simply passing through possibly-`undefined` values into non-nullable columns) rather than `null`. This is the exact bug the Dashboard's "Top Opportunity Discoveries" widget surfaced live in Batch 38's browser verification (`$0.00` for Amazon items with unobserved price).
- **Keyword/Category historical observation infrastructure (P1 #2)**: `KeywordObservation`/`CategoryObservation` existed (Batch 34) but had no snapshot/history table — confirmed by inspecting `prisma/schema.prisma`, matching Batch 39's top recommendation.
- **Keyword Research pipeline (P1 #3)**: confirmed via `grep` that `persistKeywordObservations` (the function that writes to `KeywordObservation`) was called from exactly **one** place in the entire codebase — `src/marketplaces/core/acquisition/workbench.ts` (the separate admin/batch `/api/research/run` system). The live, real Keyword Research UI (`/keyword-research`) → API (`POST /api/keywords/search`) → service (`fetchMarketplaceKeywordResearch` in `src/services/keyword-research.ts`) path never persisted anything to the database at all. Also confirmed by reading the code (not inferred):
  - `avgFavorers: 0` was a hardcoded literal in the non-Etsy branch, unconditionally, regardless of whether the marketplace has a "favorites" concept.
  - `competitionLevel: "MODERATE", competitionScore: 50` were hardcoded literals in the same branch, ignoring the real per-keyword competition scores already computed two lines above.
  - `PublicKeywordQuery` (`src/marketplaces/core/acquisition/keywords.ts`) had no `minPrice`/`maxPrice` fields at all, and the two adapter calls inside `harvestPublicMarketplaceKeywords` never passed them even where the underlying `PublicSearchQuery` contract already supported them — an "accepted but silently ignored" filter, the same defect class fixed for Product Research in Batch 37.
  - No multi-keyword support existed for Keyword Research (Product Research got this in Batch 38; Keyword Research never did).
  - Default marketplace on `/keyword-research` was `"etsy"` (Etsy's API credential has been rejected since Batch 34; its public web access is blocked).
  - Hardcoded Etsy-only badges/copy: `DataProvenanceBadge type="ACTUAL_ETSY_DATA"` unconditionally at 4 render sites, "Competing active listings on Etsy", "ETSY" fallback badge, "Etsy" external-link label — the same defect class Batch 36 already fixed for Product Research but never applied here.

## 2. P0 — `Prospect.price` fabrication: root cause fixed at the source

Per the explicit instruction "find the source of the fabricated value, do not simply change a formatter":

- **Schema** (`prisma/schema.prisma`): `Prospect.shopAgeMonths`/`reviewCount`/`activeListings`/`reviewRatio`/`reviewVelocity`/`price` all made nullable.
- **Migration** `prisma/migrations/20260821040000_prospect_nullable_and_keyword_category_history/migration.sql` — hand-written SQL (the standard workflow in this repo; `prisma migrate dev` fails against a pre-existing shadow-DB ordering issue, documented in `CLAUDE.md`), applied via `prisma migrate deploy` to the staging database. Confirmed clean: `prisma migrate status` → "Database schema is up to date!", `prisma validate` → "The schema at prisma/schema.prisma is valid 🚀".
- **Write site 1** (`persistPublicProductObservations` in `persistence.ts`): the `prisma.prospect.create()` block's six fields changed from `?? 0`/implicit-undefined to `?? null`.
- **Write site 2** (`src/workers/index.ts`'s scheduled-search `prisma.prospect.createMany()`): same six fields fixed identically.
- **Consumer sweep**: every downstream reader of these six fields was found and fixed using `npx tsc --noEmit` as an exhaustive audit tool (re-run repeatedly after each schema/type change until zero errors remained) rather than manual grep, so no call site could be missed:
  - `src/services/prospects.ts` (`ProspectRow` type), `src/services/opportunities.ts`, `src/services/dashboard.ts` — types widened to `number | null`.
  - `src/app/(dashboard)/prospect-columns.tsx` — the exact table Batch 38's browser verification found the bug in — all four affected columns now render `"—"`/`"Unavailable"` instead of a fabricated number.
  - `src/app/(dashboard)/dashboard/dashboard-opportunities.tsx`, `src/app/(dashboard)/radar/radar-client.tsx` (also fixed a hardcoded `shopMetricsObserved: true` that would have kept showing stats even when the underlying values were null), `src/app/shops/page.tsx`, `src/app/shops/shops-client.tsx` (found and fixed a separate, previously-undiscovered fabrication: `★{shop.reviewAverage?.toFixed(1) ?? "5.0"}` — a hardcoded fake 5-star rating fallback), `src/app/shops/[shopExternalId]/shop-detail-client.tsx`, `src/app/(dashboard)/trends/page.tsx` (found and fixed a hardcoded `$15` fabricated average-price fallback), `src/app/api/prospects/export/route.ts` and `src/services/connectors/google-sheets.ts` (both CSV-export paths — fixed a provenance-mislabeling bug where `shopReviewCount` was unconditionally reported `"OBSERVED"` even when `reviewCount` was null), `src/app/api/inactive/route.ts`.
  - Sort comparators updated to treat `null` as always-last regardless of sort direction (not simply coerced to `0`/`-Infinity` inconsistently), e.g. `opportunities.ts`'s price sort, `shops-client.tsx`'s reviews/youngest sorts.
- **Deliberately deferred** (documented, not silently skipped): `shop-detail-client.tsx`'s fallback-path object literal (`estDailySales: p.estDailySales ?? 1.2`, `opportunityScore: 78`, `listingAgeDays: 30`) — these hardcoded constants are used unguarded at 8+ render sites in a 1,300+-line file and only activate when `profile?.topListings` itself is unavailable; fixing them properly needs either real replacement computations or a larger refactor, judged out of this batch's scope. `/api/keyword-research`'s (confirmed dead code — zero client callers) own `avgPrice`/`avgReviewCount ?? 0` fabrication was left compile-safe only, since the route is unreachable.

## 3. P1 #2 — Keyword/Category historical observation infrastructure

- **Schema**: `KeywordObservation`/`CategoryObservation` each gained a `fingerprint String?` column and a `snapshots` relation. New tables `KeywordObservationSnapshot`/`CategoryObservationSnapshot`, mirroring `ProductObservationSnapshot`'s existing shape and purpose (one row per **detected change**, not one row per re-observation) — same migration as §2, applied cleanly.
- **Change-detection**: `src/marketplaces/core/acquisition/deduplication.ts` gained `computeKeywordObservationFingerprint`/`computeCategoryObservationFingerprint`, mirroring the existing `computeProductObservationFingerprint` pattern exactly (deterministic SHA-256 hash over the volatile fields).
- **Wiring**: `persistKeywordObservations`/`persistCategoryObservation` (`persistence.ts`) rewritten to fetch the existing row first, compare fingerprints, and only create a snapshot when the fingerprint genuinely differs (or on first observation) — never once per re-observation. Both now return a `snapshotsCreated`/`snapshotCreated` count.
- **Preserved fields**: per the "don't overwrite, create snapshots so trends are calculable later" instruction, both snapshot tables store their own point-in-time copy of every volatile numeric field (`occurrenceCount`, `listingFrequencyPercent`, `observedAveragePrice`, `demandProxyScore`, `competitionProxy` for keywords; `observedCatalogCount`, `minPrice`/`maxPrice`/`medianPrice`/`averagePrice`, `averageOpportunityScore` for categories) — no trend-calculation logic was built on top of this (correctly out of scope this batch, per the founder's explicit "don't implement the future trend calculations themselves this batch" instruction).
- **No duplicate infrastructure**: confirmed the two existing callers of `persistKeywordObservations`/`persistCategoryObservation` (both in `workbench.ts`) are unaffected by the signature/return-type changes (neither destructures the return value in a way that would break).

## 4. P1 #3 — Keyword Research pipeline repair

Audited (not rebuilt), following the existing marketplace-native flow:

- **Real persistence wired in**: a new `persistHarvestedKeywordsNonBlocking` helper in `src/services/keyword-research.ts` calls `persistKeywordObservations` from the live search path (`fetchSingleMarketplaceKeywordResearch`, the refactored single-keyword core), non-blocking (a persistence failure never breaks the user-facing search response) — this is the fix for the central finding in §1: the live UI/API path now actually accumulates history, the same as the admin workbench always did.
- **`avgFavorers` fabrication fixed**: `0` → `null` for every non-Etsy marketplace (Amazon/Walmart's observable public markup has no "favorites" concept — confirmed by grep: no adapter ever populates `NormalizedProduct.favoritesCount` for either). `KeywordSearchSummary.avgFavorers` widened to `number | null`; every UI render site (`keyword-research/page.tsx`) updated to show "Unavailable" instead of `0 favs`.
- **`competitionLevel`/`competitionScore` fabrication fixed**: replaced the hardcoded `"MODERATE"`/`50` with a real aggregate (`Math.round` of the average of the already-computed per-keyword `competitionScore` values, then bucketed through the same VERY_LOW–VERY_HIGH thresholds `computeKeywordCompetition` uses elsewhere in this file) — verified in the new test suite (§7) that the summary value equals the real computed average, not a coincidental match to a hardcoded constant.
- **`minPrice`/`maxPrice` threading fixed**: `PublicKeywordQuery` gained the two fields; both adapter call sites inside `harvestPublicMarketplaceKeywords` (`keywords.ts`) now pass them through — verified in the new test suite that a `minPrice` filter measurably narrows the observed sample, proving the parameters actually reach the adapter (previously silently dropped).
- **Multi-keyword OR-fanout built**: `fetchMarketplaceKeywordResearch` now resolves the request's seed keywords via `resolveSearchKeywords` — exported from `src/marketplaces/core/acquisition/orchestrator.ts` and reused rather than reimplemented, so Keyword Research's bounding/dedup logic is provably identical to Product Research's Batch 38 implementation (bounded to `MAX_FANOUT_KEYWORDS` = 5, deduped case-insensitively, order-preserving). A single query (the common case, and every pre-Batch-40 caller) takes exactly the same single-request path it always did. Multiple seeds run in parallel, merge by keyword term (first-seen-seed-wins provenance, matching the "first keyword that produced a given item wins" rule Batch 38 used for products), and the response reports `matchedKeywords`. If every seed fails, the first real failure is returned honestly rather than a fabricated merged "success".
- **API route updated**: `POST /api/keywords/search` now threads `body.keywords` through to the request object (previously silently dropped even if a client sent it).
- **UI repaired** (`src/app/(dashboard)/keyword-research/page.tsx`):
  - Default marketplace changed from `"etsy"` to `"amazon"`, matching Product Research's Batch 38 default and its documented reasoning (Amazon has the strongest, most complete acquisition path today; Etsy's credential is still rejected).
  - Comma-separated multi-keyword input added, with the same live "Searching N keywords (any match): ..." preview label Product Research already has (`splitKeywordsPreviewLabel`, copied for consistency, not reinvented).
  - Every hardcoded `ACTUAL_ETSY_DATA` badge and "Etsy"/"ETSY" copy/label found in §1 is now marketplace-aware (`isEtsy ? "ACTUAL_ETSY_DATA" : "EXTERNAL_DATA"`, dynamic marketplace label via the existing `MARKETPLACE_LABELS` map).
  - The "Demand Proxy" KPI card and the top summary description string both now render "Unavailable" instead of a fabricated number when `avgFavorers` is null.
- **Field-level provenance (P1 #4, minimal, additive)**: `KeywordSearchSummary` gained an optional `fieldProvenance` object (`avgPrice`/`avgFavorers`, each a `{ value, provenance, source, observedAt }` record) — deliberately reusing the exact shape of the pre-existing `FieldProvenanceRecord`/`ProductFieldLineage` architecture in `src/marketplaces/core/types.ts` (built in an earlier batch for Product Research, confirmed still real and populated by `merger.ts`'s multi-source reconciliation) rather than inventing a second provenance shape. Purely additive — no existing consumer of the raw `avgPrice`/`avgFavorers` fields was changed.

## 5. What was explicitly NOT built this batch (deferred, not silently skipped)

- **`topListings` for non-Etsy marketplaces** remains an empty array — populating it requires deeper plumbing of the underlying product sample through `harvestPublicMarketplaceKeywords`'s return type, out of scope for this pass. The "Observed Competing Listings" UI section was still made marketplace-aware defensively (dynamic badge/label/marketplace name) in case this gets built later, but it currently never renders for non-Etsy since the array stays empty.
- **Category Hunting's own equivalent Keyword-Research-style repair** (default marketplace, multi-keyword, etc.) was not audited this batch — out of the five stated objectives, which named Keyword Research specifically.
- **Sales/revenue estimation models, Market Intelligence UI, browser-extension acquisition, Amazon bot/UA workaround** — none attempted, per explicit founder instruction.
- **Full historical trend calculation** on top of the new snapshot tables — the tables exist and accumulate correctly (verified in §7), but no UI or API surfaces a computed trend from them yet. This was explicit: "don't implement the future trend calculations themselves this batch."

## 6. Tenant isolation

Every new/modified database query was checked by direct inspection (not inference):

- `persistKeywordObservations`/`persistCategoryObservation`: both `findUnique`/`upsert` calls key off the compound unique constraint `organizationId_marketplace_keyword` / `organizationId_marketplace_categoryName` — structurally impossible to read/write another organization's row.
- `persistPublicProductObservations`'s Prospect write path: `findFirst` scoped `where: { organizationId: orgId, listingExternalId: ... }`.
- `KeywordObservationSnapshot`/`CategoryObservationSnapshot` have no `organizationId` column of their own — isolation is enforced transitively through the parent row's FK, verified directly in the new test suite (§7, test 10).
- No new unauthenticated route was added; `POST /api/keywords/search` already required a session-derived `organizationId` before this batch and still does.

## 7. Testing

**New test file**: `src/tests/batch-40-data-foundation-and-keyword-research.test.ts` — 10 tests, all deterministic (a fixture `PublicWebAcquisitionAdapter` for the Keyword Research suite, no live network; a real, cleaned-up test organization for the persistence/snapshot/isolation suite — same pattern as `batch-38-marketplace-native-product-research.test.ts`):

1. Non-Etsy `avgFavorers` is `null`, never a fabricated `0`.
2. Non-Etsy `competitionLevel`/`competitionScore` equal the real computed average of the per-term scores (not a coincidental match to a hardcoded constant).
3. `minPrice` measurably narrows the observed sample, proving it reaches the adapter.
4. Multi-keyword fanout merges real per-seed results and reports `matchedKeywords`.
5. Multi-keyword fanout is bounded to 5 seeds even when 7 are supplied.
6. First keyword observation creates a baseline `KeywordObservationSnapshot`.
7. An unchanged re-observation creates no duplicate snapshot; a real change creates exactly one.
8. Same pattern verified for `CategoryObservationSnapshot`.
9. `Prospect.price`/`reviewCount`/`shopAgeMonths`/`activeListings`/`reviewRatio`/`reviewVelocity` are all written as real `null`, never a fabricated 0/12/1, for a product with no observed values.
10. Organization isolation — `KeywordObservation` rows never cross organizations.

**Full suite results** (this session, staging database):

| Check | Result |
|---|---|
| `npm run test:all` (before this batch's changes, baseline) | 1240/1241 passing (1 pre-existing live-network flake, confirmed unrelated — passed 16/16 on isolated re-run) |
| `npm run test:all` (after P0 + P1 #2/#3/#4, including the new Batch 40 file) | **1251/1251 passing** |
| `npx tsc --noEmit` | 0 errors |
| `npx prisma validate` | Schema valid |
| `npx prisma migrate status` | "Database schema is up to date!" (33 migrations) |
| `npx next build` | See §9 |

## 8. Merchant workflow status

The KEYWORD → PRODUCT RESEARCH → REAL OBSERVATIONS → SAVE OPPORTUNITY → VALIDATE → WORKSPACE → PLAN chain was **not re-verified via a live authenticated browser session this batch** — no working dashboard credentials were available in this session (the same caveat Batch 37 flagged). What **was** verified this batch, with real evidence:

- Real database writes for every new/changed persistence path (§7, tests 6-9), against the actual staging Postgres instance, not a mock.
- Real multi-marketplace, multi-keyword acquisition behavior against a deterministic fixture adapter that exercises the exact same code path the live Amazon adapter uses (§7, tests 1-5).
- `Product Research`'s own Batch 35-38 regression coverage (unrelated to this batch's changes) continues to pass unmodified (1241/1241 baseline, now 1251/1251 with the 10 new tests added).

This is a real gap, stated honestly rather than assumed away — see the classification in the chat-facing final report.

## 9. Files changed this batch

Schema/migration: `prisma/schema.prisma`, `prisma/migrations/20260821040000_prospect_nullable_and_keyword_category_history/`.

Backend: `src/marketplaces/core/acquisition/persistence.ts`, `deduplication.ts`, `keywords.ts`, `orchestrator.ts`, `src/services/keyword-research.ts`, `src/services/prospects.ts`, `src/services/opportunities.ts`, `src/services/dashboard.ts`, `src/services/connectors/google-sheets.ts`, `src/workers/index.ts`, `src/types/keyword-research.ts`, `src/app/api/keywords/search/route.ts`, `src/app/api/keyword-research/route.ts` (dead-code compile-safety only), `src/app/api/prospects/export/route.ts`, `src/app/api/inactive/route.ts`.

Frontend: `src/app/(dashboard)/keyword-research/page.tsx`, `src/app/(dashboard)/prospect-columns.tsx`, `src/app/(dashboard)/dashboard/dashboard-opportunities.tsx`, `src/app/(dashboard)/radar/radar-client.tsx`, `src/app/(dashboard)/trends/page.tsx`, `src/app/shops/page.tsx`, `src/app/shops/shops-client.tsx`, `src/app/shops/[shopExternalId]/shop-detail-client.tsx`.

Tests: `src/tests/batch-40-data-foundation-and-keyword-research.test.ts` (new).

## 10. Classification

See the chat-facing final report for the full classification statement and reasoning.
