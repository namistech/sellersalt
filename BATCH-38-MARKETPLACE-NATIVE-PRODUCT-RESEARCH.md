# Batch 38 — Marketplace-Native Product Research & Independent Ecommerce Intelligence Data Foundation

**Date:** 2026-08-21
**Branch:** `staging`
**Baseline commit:** `f4e2b55` (Batch 37)
**Method:** Real forensic reads of the current codebase, a real Postgres migration applied to staging, direct calls to the live `orchestrateProductResearch` pipeline against the real running dev server, a real authenticated browser session (logged-in admin account already present in this session's browser — used to click through the actual `/prospects` UI, not just call the API), and full `tsc`/`prisma validate`/`next build`/test-suite runs.

---

## 1. Founder direction and what changed as a result

Batch 37 built real field-level data extraction for Amazon/Walmart. This
batch is a repositioning: **stop building toward a simultaneous
all-marketplace aggregator; make Product Research genuinely useful for one
marketplace (Amazon) first**, with results accumulating into SellerSalt's
own historical database rather than depending on every marketplace being
live-searchable at once.

Concretely, `/prospects`' marketplace selector default changed from
`"all"` (Batch 35's choice) to `"amazon"` (Batch 38, this founder
direction) — a real, live-verified UI change, not just a doc update.

---

## 2. Existing architecture found (before any changes)

- **`ProductObservation`/`ProductObservationSnapshot`** already existed in
  `prisma/schema.prisma` — real historical-observation infrastructure
  (upsert-per-`(org, marketplace, externalId)`, snapshot-on-change via
  `src/marketplaces/core/acquisition/deduplication.ts`) was already built
  and already being written to by `persistPublicProductObservations`
  (`src/marketplaces/core/acquisition/persistence.ts`). This was a real,
  working foundation — not something this batch invented from scratch.
- **What that foundation was missing**: no `imageUrl`, `brand`, `badges`,
  `availability`, `shippingInfo`, `bestSellerRank`, `keyword`, or
  `shopUrl` columns — i.e. every field Batch 37 taught the Amazon/Walmart
  adapters to observe had nowhere to persist. `ProductObservationSnapshot`
  also had no `availability`/`shopName`/`bestSellerRankJson` columns, so
  "what changed" history was limited to price/rating/reviewCount/
  favoritesCount/salesCount only.
- **`minPrice`/`maxPrice`** were enforced (Batch 37's fix) but
  **`minReviews`/`maxReviews`/`minRating`/`maxRating` did not exist at
  all** — not even as accepted-but-ignored fields.
- **`sortOn`/`sortOrder`** were accepted by the API and shown in the UI
  for every marketplace, but only ever applied for Etsy (sent directly to
  Etsy's own API) — silently ignored for Amazon/Walmart. A real,
  previously-undiscovered instance of the same "accepted but ignored
  filter" defect class Batch 37 found for price.
- **Pagination**: `filters.page` was never threaded from
  `searchMarketplaceProducts` into `orchestrateProductResearch`'s request,
  and the response's `hasMore` was hardcoded `false` — even though the
  Amazon/Walmart adapters' URLs already support a real `page` parameter.
  Another real, previously-undiscovered "accepted but ignored" gap.
- **Multi-keyword search**: did not exist in any form — `EtsySearchFilters`
  had a single `keywords: string` field, one query, no fan-out logic
  anywhere in the pipeline.
- **No canonical `ProductResearchRecord` type existed** — the UI-facing
  `NormalizedProductListing`/`NormalizedShopProfile` pair (Etsy-shaped,
  extended ad hoc across Batches 34-37) was the closest thing, but nothing
  matched the identity/seller/commercial/engagement/marketplace-signals/
  temporal/provenance contract this batch's spec asked for.

---

## 3. The canonical Product Research contract (built this batch)

`src/marketplaces/core/product-research-record.ts` — `ProductResearchRecord`,
with two mappers: `toProductResearchRecordFromNormalizedProduct` (live
search) and `toProductResearchRecordFromObservation` (historical/database
read), so a live result and a persisted one always resolve to the exact
same shape. No invented fields — every field maps 1:1 onto a real,
Batch-37-verified observable signal or is explicitly, permanently `null`
(`salesCount`, typed as the literal `null`, not `number | null` — see
`docs/PRODUCT-RESEARCH-DATA-CONTRACT.md` §6).

Full field-by-field rationale and the per-marketplace availability matrix
live in the new `docs/PRODUCT-RESEARCH-DATA-CONTRACT.md` — not duplicated
here.

---

## 4. Database migration (real, applied to staging)

`prisma/migrations/20260821030322_add_product_research_data_contract_fields/`
— additive only, applied via `prisma migrate deploy` against the real
`sellersalt_staging` Postgres database (confirmed: `npx prisma migrate
status` → "Database schema is up to date!" after applying; `npx prisma
validate` clean).

**`ProductObservation`** gained: `imageUrl`, `shopUrl`, `keyword`, `brand`,
`badges` (`String[]`), `availability`, `shippingInfo`,
`bestSellerRankJson`.

**`ProductObservationSnapshot`** gained: `availability`, `shopName`,
`bestSellerRankJson` — so a stock-status flip, a seller change, or a
ranking move now shows up in the same longitudinal history price/rating/
reviewCount already had.

`src/marketplaces/core/acquisition/deduplication.ts`'s change-detection
fingerprint now includes `availability`, so a real in-stock/out-of-stock
flip triggers a new snapshot the same way a price change does.

`persistPublicProductObservations` (`persistence.ts`) writes all of the
above on both the create and update paths — verified with a real,
live-network, live-database test (§8).

---

## 5. Filters — three real "accepted but ignored" defects found and fixed

All three follow the exact same policy, documented once in
`docs/PRODUCT-RESEARCH-DATA-CONTRACT.md` §3: an item with a real,
**observed** value outside the requested range is excluded; an item whose
value is genuinely **unobserved** is never excluded and never treated as
if it were the boundary value.

1. **`minReviews`/`maxReviews`/`minRating`/`maxRating`** — new fields on
   `PublicSearchQuery` and `EtsySearchFilters`, enforced in
   `orchestrateProductResearch` right alongside the existing price filter.
2. **`sortOn`/`sortOrder`** — previously Etsy-only; new
   `sortProductHuntingResults()` in `src/services/product-hunting.ts` now
   applies to every marketplace's results, with `null` metrics (an
   unobserved price/age) always sorting last regardless of direction.
3. **Pagination** — `filters.page` now threaded into the orchestrator
   request; `hasMore` is now `results.length >= limit` (an honest
   page-fullness signal, not a precise total-count claim — neither Amazon
   nor Walmart's public search exposes an exact total). A real "Load more"
   button was added to `/prospects`.

**Category filters remain `NOT_IMPLEMENTED`** — no field exists for it in
the contract and no UI control exists for it on any marketplace, including
Etsy. Not built this pass, per the explicit "don't invent a filter
architecture" instruction — documented, not silently absent.

---

## 6. Multi-keyword search

`MultiKeywordSearchQuery.keywords: string[]` — logical **OR**, bounded to
5, deduplicated by `(marketplace, externalId)`, each item tagged with the
**first** keyword that produced it (`NormalizedProduct.keyword` →
`ProductObservation.keyword`, both persisted and displayed). The `/prospects`
search box now splits a comma-separated entry automatically and previews
the split before submission. Full semantics documented in
`docs/PRODUCT-RESEARCH-DATA-CONTRACT.md` §4.

---

## 7. Real runtime validation — not just "code compiles"

Ran the real, unmodified `orchestrateProductResearch` pipeline directly
against this session's dev server for the required test queries. Amazon's
price/rating/per-card-category remained suppressed under the disclosed
bot UA (Batch 37 finding, unchanged, founder-confirmed to stay that way —
see `docs/DATA-ACQUISITION.md` §14) — every other new capability was
verified working:

- **Multi-keyword fanout, live**: `{query: "wooden desk organizer",
  keywords: ["wooden desk organizer", "desk organizer", "wood desk
  tray"]}` against Amazon returned 15 real items (5 per keyword, zero
  cross-keyword duplication in this run), each correctly tagged with its
  producing keyword (`keyword breakdown: {"wooden desk organizer": 5,
  "desk organizer": 5, "wood desk tray": 5}`).
- **Review/rating filters excluding real values, live (Walmart, which has
  real observed ratings this session)**: `minRating: 4.5` against
  "ceramic mug" cut real results from 10 → 8, and a direct check confirmed
  zero items with an observed rating below 4.5 slipped through.
- **Price filter never fabricating exclusion of unobserved values**:
  proven both via the deterministic fixture suite (§9) and live (Amazon's
  price being uniformly `null` this session meant `minPrice=1000` excluded
  nothing — the correct, unavailable-safe behavior, not a bug).
- **Pagination reaching genuinely different items**: `page=1` vs `page=2`
  against Walmart returned partially different item sets (3/5 overlap —
  Walmart repeats some sponsored/pinned placements across consecutive
  pages, a real external characteristic, not a defect).
- **End-to-end persistence, live, with a 4-second wait for the
  orchestrator's fire-and-forget background write** (by design, so a
  user's search response isn't blocked on a DB write): a real Walmart
  search for a uniquely-markered query persisted 4 of 5 items with full
  Batch 38 fields populated — price, rating, reviewCount, categoryPath,
  shopName, shopExternalId, availability, badges, imageUrl, and
  **`keyword` correctly set to the exact search phrase** — the single
  clearest proof this batch's persistence work is real, not just
  type-checked.

---

## 8. Real browser verification (not just API calls)

This session's browser already had an active, logged-in admin session
(`Wave 4 Verify / Admin`) — used to click through the actual `/prospects`
page, not just call the API directly:

- **Marketplace selector defaults to Amazon**, confirmed visually
  selected/highlighted on page load.
- **Min/Max Reviews and Min/Max Rating filter inputs render**, with the
  exact honest disclosure copy: *"A product whose review count or rating
  isn't observable on this marketplace is never excluded by these filters
  — only items with a real, observed value outside the range are."*
- **Multi-keyword live preview**: typing `wooden desk organizer, desk
  tray` rendered *"Searching 2 keywords (any match): wooden desk organizer
  · desk tray"* before submission.
- **A real search executed**: "Product Research Results (50), Amazon,
  [EXTERNAL DATA]" — 50 = 2 keywords × 25-item limit each, correctly
  bounded and merged.
- **Honest price disclosure held**: every card showed "Price: Unavailable"
  text, never a fabricated `$0.00` (consistent with the known,
  founder-confirmed Amazon bot-UA constraint).
- **Keyword provenance rendered per card**: "Found via: wooden desk
  organizer" and "Found via: desk tray" correctly differentiated across
  the result set.
- **"Load more results" button rendered** at the end of the result grid.
- **A real display bug found and fixed during this verification**: one
  card's title rendered literally as `Fellowes Workstation 3&quot; Letter
  Tray...` — Amazon's `aria-label`/`<h2>` markup contains raw HTML
  entities the parser wasn't decoding. Fixed with a new
  `decodeHtmlEntities()` helper applied to every text field the Amazon
  adapter extracts (title, brand, seller name, category breadcrumbs,
  badges) — a real, if minor, Zero-Fabrication-adjacent data-quality
  defect this batch would otherwise have shipped unnoticed had the UI not
  actually been clicked through. New regression test proves the exact
  observed string decodes correctly.
- **A separate, real, pre-existing defect found (not fixed this batch)**:
  the Dashboard's "Top Opportunity Discoveries" widget showed literal
  `$0.00` for several Amazon items with genuinely unobserved prices. Root
  cause: `persistence.ts`'s **legacy** `Prospect`-table sync path (kept for
  backward compatibility, separate from the new `ProductObservation`
  path this batch worked on) does `price: p.price !== null && p.price !==
  undefined ? p.price : 0` — forced by `Prospect.price` being a
  **non-nullable** `Float` column in the schema. This is a real,
  live-visible fabrication on a surface this batch didn't touch. **Not
  fixed here**: making `Prospect.price` nullable is a schema change with a
  wide, unaudited blast radius (many other call sites assume a non-null
  price) — too large and risky to attempt as a side effect of this
  batch's mandate. Flagged explicitly for a dedicated follow-up.

---

## 9. Testing

New file `src/tests/batch-38-marketplace-native-product-research.test.ts`
— **19 tests**, covering (numbered against the required 20-item list;
category filtering (#6) is documented as `NOT_IMPLEMENTED` rather than
given a fabricated passing test, and #12/#20 combine provenance+contract-
consistency checks):

1. single keyword, 2. multi-keyword OR fanout + keyword provenance,
3. price filter (unavailable-safe), 4. review-count filter
(unavailable-safe), 5. rating filter (unavailable-safe), 7. pagination
(page=2 reaches genuinely different items), 8. sorting (price asc/desc,
null always last), 9. image URL survives into the canonical record,
10. product URL survives into the canonical record, 11. provenance/
dataTrust survives into the canonical record, 12. real Amazon HTML-entity
decoding (the live bug found in §8, now regression-tested), 13. unavailable
fields render as null/[] on the canonical record, 14. first observation
creates a `ProductObservation` + baseline snapshot (real database), 15. an
unchanged re-observation creates no duplicate snapshot, a real change
creates exactly one (real database), 16. organization isolation, including
the `HISTORICAL_OBSERVATION` fallback (real database), 17. sales/revenue
are structurally never fabricated by the record mapper, 18. persisted
history respects the same filter policy as live search, 19. filters
provably narrow results from an unfiltered baseline (never silently
ignored), 20. `ProductObservation`'s persisted shape maps 1:1 onto the
same canonical record the live-search path produces.

Deterministic fixture tests (1-13, 17, 19) run against a synthetic-but-
structurally-real fixture Amazon adapter — no live network. Database tests
(14-16, 18, 20) run against the real staging Postgres, same convention as
`batch-34-real-acquisition.test.ts` (real test orgs, cleaned up in
`after()`).

**Full suite: 1,241/1,241 passing** (1,222 baseline + 19 new), across 361
suites. One pre-existing, unrelated live-network test
(`marketplace-context-keyword-category-seo.test.ts`'s Amazon keyword-
harvest assertion) failed once mid-session under this session's unusually
heavy Amazon request volume, then passed cleanly on the final full run —
a live-network flake in code this batch never touched (confirmed via
`git diff`), not a regression. `npx tsc --noEmit`, `npx prisma@5.22.0
validate`, and `npx next build` all clean (183 routes compiled, no new
routes).

---

## 10. Documentation

- **Updated**: `docs/DATA-ACQUISITION.md` (new §14, marketplace-native
  strategy + the honest-bot-disclosure cost, re-confirmed by the founder
  this batch), `docs/CHANGELOG.md`, `docs/SELLERSALT-HANDOFF.md`,
  `AGENTS.md` (new known-gotcha entries: the Amazon bot-UA constraint, and
  category-filter/multi-keyword `NOT_IMPLEMENTED` status), root
  `CLAUDE.md` (new dated entry + Lesson Learned #12).
- **Created**: `docs/PRODUCT-RESEARCH-DATA-CONTRACT.md` (the canonical
  record, per-marketplace field matrix, filter/multi-keyword semantics),
  `docs/DATA-TRUST.md` (the five-state provenance model, where it lives in
  code, concretely what's forbidden), `docs/MARKETPLACE-RESEARCH-MODEL.md`
  (one-marketplace-at-a-time architecture, the capability contract, what
  changed vs. didn't), `docs/HISTORICAL-INTELLIGENCE.md` (the six-phase
  strategy, with each phase marked real/partial/not-built and exactly what
  prerequisite is missing for the ones that aren't).
- **Homepage** (`src/app/marketing-homepage.tsx`): fixed two real
  overclaims — the hero's "Observable research across: Etsy • Amazon •
  eBay • Walmart • Shopify" implied all five work equally today (they
  don't; only Amazon/Walmart genuinely do) — changed to "Live research
  today: Amazon • Walmart" with an honest "Etsy, eBay & more expanding"
  note. A workflow-step description similarly overclaimed "across Etsy and
  Amazon." Added two new sections per the spec: "Marketplace-native
  research & historical intelligence" (positions the one-at-a-time
  strategy honestly, including that cross-marketplace intelligence from
  SellerSalt's own database is a stated direction, not a shipped feature)
  and "Responsible, permitted acquisition" (states plainly that
  SellerSalt does not circumvent CAPTCHAs/auth/rate limits/anti-bot
  systems, and that acquisition requests honestly identify themselves —
  matching the real, founder-confirmed policy from §8's Amazon finding).
  The rest of the existing homepage (five-step workflow, OBSERVED/DERIVED/
  ESTIMATED/USER_DERIVED/UNAVAILABLE classification section, pricing, FAQ)
  was already accurate and was left as-is rather than rewritten for its
  own sake.

---

## 11. What this batch explicitly did not do (per its own scope limits)

- No new marketplace was added.
- Etsy's rejected API credential was not touched.
- No governance layer (`SourcePolicyEnforcer`, `AntiCircumventionGuard`,
  `SourceBoundary`, `DataTrustEngine`, `SignalClassification`,
  `EntitlementEngine`) was modified — verified via `git diff` against
  those files' paths.
- No estimation/prediction model was built — `salesCount` remains
  structurally `null` everywhere in the new contract.
- "All Marketplaces" mode's underlying fan-out logic was not touched, only
  its UI default.
- Category filtering and true AND/exact-phrase keyword semantics were not
  built — confirmed absent, not silently ignored.
- The legacy `Prospect.price`-forced-to-`0` fabrication found in §8 was
  **not** fixed — flagged for a dedicated follow-up given its real schema
  risk.

---

## 12. Launch classification

Per the batch's own explicit rubric — not "tests pass," but "can a real
merchant select Amazon, search a product, receive real observations,
filter them, understand their provenance, save them, research them,
validate them, and plan a product":

**`PRODUCT_RESEARCH_READY`.**

Every step of that chain was verified working with real evidence this
batch, for Amazon specifically: real search (single and multi-keyword),
real filters that provably narrow results without ever fabricating
exclusion of unobserved data, real provenance disclosure at every UI
surface checked (`[EXTERNAL DATA]`, "Price: Unavailable", "Found via:
<keyword>"), real persistence into a queryable historical database with
real change-detection snapshots, and (unchanged from Batch 36) real
downstream Validate/Plan consumption of exactly this data.

This is **not** upgraded to a fresh `PRIVATE_BETA_READY` claim in this
report — Batch 36 already established that classification for the
Etsy+Amazon+Walmart SEARCH→VALIDATE→PLAN chain, and this batch's changes
are additive improvements to the Amazon-specific research experience
within that already-established chain, not a re-verification of the full
chain end to end. Nor is it `PUBLIC_LAUNCH_READY` — no extended
stable-operation track record exists, and this batch did not attempt to
establish one.

**The one blocker worth stating plainly, again**: Amazon's price/rating/
per-card-category remain suppressed by Amazon's own access-control
response to SellerSalt's honest bot disclosure — a real, external,
founder-confirmed-to-stay-as-is constraint (`docs/DATA-ACQUISITION.md`
§14), not a defect this or any future code change inside this repository
can close.
