# PRODUCT-RESEARCH-DATA-CONTRACT.md — The Canonical Product Research Record

Batch 38. Defines the single canonical shape a Product Research surface
(API response, UI table, saved/persisted row) reads from —
`ProductResearchRecord`, `src/marketplaces/core/product-research-record.ts`
— and the exact, evidence-based rules for what each field means, when it's
real, and when it's honestly absent. This document does not describe an
aspirational architecture; every field and every "UNAVAILABLE" classified
here was verified against a real, live marketplace response during Batch
37/38's forensic audits (see `BATCH-37-PRODUCT-RESEARCH-DATA-VALIDATION.md`
and `BATCH-38-MARKETPLACE-NATIVE-PRODUCT-RESEARCH.md`).

## 1. The record shape

```ts
interface ProductResearchRecord {
  // IDENTITY
  id: string;                 // `${marketplace}:${productId}` for a live record, the DB row id for a persisted one
  marketplace: MarketplaceId;
  productId: string;          // ASIN, Walmart item ID, Etsy listing ID, etc.
  title: string;
  productUrl: string | null;
  imageUrl: string | null;

  // SELLER
  sellerName: string | null;
  sellerUrl: string | null;
  sellerId: string | null;

  // COMMERCIAL
  price: number | null;
  currency: string | null;
  availability: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "UNAVAILABLE" | null;
  fulfillmentType: string | null;   // real, verbatim marketplace text (e.g. "Fulfilled by Walmart")

  // ENGAGEMENT
  rating: number | null;
  reviewCount: number | null;

  // MARKETPLACE SIGNALS
  category: string[];               // most-general first; [] when unavailable
  brand: string | null;
  badges: string[];                 // real on-page labels only
  bestsellerRank: Array<{ rank: number; category: string }>;
  attributes: Record<string, string>; // reserved, currently always {} — see §5

  // TEMPORAL
  observedAt: Date;
  firstObservedAt: Date | null;     // null for a live, not-yet-persisted record
  lastObservedAt: Date | null;

  // PROVENANCE
  source: SignalProvenance;         // "ACTUAL_DATA" | "ESTIMATED" | "SELLERSALT_SCORE" | "UNAVAILABLE"
  acquisitionMethod: DataSourceType | null;
  sourceUrl: string | null;
  observationStatus: "LIVE" | "HISTORICAL";
  dataTrust: { provenance: SignalProvenance; confidence: number | null };
  keyword: string | null;           // which search keyword produced this record — see §4

  // Sales/demand is always literally `null` here — see §6.
  salesCount: null;
}
```

Two mappers build this shape, never a third independent one:
- `toProductResearchRecordFromNormalizedProduct(p: NormalizedProduct)` — the
  live-search path (a fresh, not-yet-persisted acquisition result).
- `toProductResearchRecordFromObservation(obs: ProductObservation)` — the
  historical/database-read path.

## 2. Per-marketplace field availability (verified, not assumed)

| Field | Amazon | Walmart | Etsy |
|---|---|---|---|
| title, productUrl, imageUrl | OBSERVED | OBSERVED | OBSERVED |
| price, currency | OBSERVED on a plain-browser fetch; **suppressed for SellerSalt's disclosed bot UA** (see `docs/DATA-ACQUISITION.md` §14) | OBSERVED | OBSERVED |
| rating, reviewCount | Same bot-UA constraint as price, on search cards | OBSERVED | Not per-listing (Etsy exposes shop-level review stats only, not per-listing) |
| sellerName/Url/Id | UNAVAILABLE on search cards; OBSERVED on product-detail page (works under the bot UA) | OBSERVED on both | OBSERVED (shop) |
| category | OBSERVED per-card code on a plain-browser fetch (bot-UA-suppressed on cards); OBSERVED as a breadcrumb on product-detail (works under bot UA) | OBSERVED | OBSERVED (taxonomy) |
| brand | UNAVAILABLE on cards; OBSERVED on product-detail | OBSERVED on product-detail; often null on cards for 3rd-party listings | UNAVAILABLE (not exposed) |
| badges | OBSERVED (Sponsored/Best Seller/Amazon's Choice/material) | OBSERVED (Sponsored/merchandising) | UNAVAILABLE |
| bestsellerRank | OBSERVED ("Best Sellers Rank", product-detail only) | UNAVAILABLE (no equivalent field found) | UNAVAILABLE |
| availability | OBSERVED (product-detail) | OBSERVED (cards + detail) | UNAVAILABLE (not modeled) |
| fulfillmentType | UNAVAILABLE | OBSERVED (`fulfillmentType`: MARKETPLACE/FC/STORE, mapped to real text) | UNAVAILABLE |
| **shop age** | **UNAVAILABLE — confirmed, no registration-date field on Amazon's public seller page** | **UNAVAILABLE — confirmed, no such field in ~130 real inspected item/product JSON keys** | OBSERVED (`create_date`) |
| **sales/revenue** | **UNAVAILABLE — no legitimate public source** | **UNAVAILABLE — same** | Real lifetime count (`transaction_sold_count`) is the one exception across all three marketplaces |

## 3. Filter semantics

`PublicSearchQuery` (`src/marketplaces/core/acquisition/contracts.ts`)
accepts `minPrice`/`maxPrice`/`minReviews`/`maxReviews`/`minRating`/
`maxRating`. All six share one policy, enforced in
`orchestrateProductResearch` (`src/marketplaces/core/acquisition/
orchestrator.ts`):

- An item with a **real, observed** value outside the requested range is
  excluded.
- An item whose value is **genuinely unobserved** (`null`) is **never**
  excluded and **never** treated as `0` to decide inclusion — a filter can
  only judge what was actually measured.

This was a real, confirmed defect before Batch 37/38: `minPrice`/`maxPrice`
were accepted by the API contract and threaded all the way to the
orchestrator, but nothing ever applied them — a search returned an
unfiltered `200` with no indication the filter was ignored. Fixed in Batch
37 (price) and Batch 38 (reviews, rating), each with regression tests
proving both the exclusion and the never-excludes-unavailable guarantee.

**Category filters** are not yet implemented — `EtsySearchFilters` has no
category-bound field, and no UI control exists for it on any marketplace,
including Etsy. Not built this pass; see `docs/SELLERSALT-ROADMAP.md`.

**Sorting** (`sortOn`/`sortOrder`) previously only applied for Etsy (sent
directly to Etsy's own API) — silently ignored for every other marketplace
acquired via the orchestrator. Fixed in Batch 38
(`sortProductHuntingResults` in `src/services/product-hunting.ts`): a
`null` metric (e.g. an unobserved price) always sorts last, regardless of
direction.

**Pagination**: `PublicSearchQuery.page` is threaded through to the
adapter (Amazon/Walmart's search URLs already support a real `page`
parameter). `ProductHuntingSearchResponse.hasMore` is a real,
page-fullness-based signal (`results.length >= limit`) — neither
marketplace's public search page exposes an exact total-result count, so
this is honestly "there may be more," not a precise count. A live check
during Batch 38 confirmed page 2 reaches genuinely different items than
page 1, though some overlap is expected (marketplaces frequently repeat
sponsored/pinned placements across consecutive pages — an external,
real characteristic, not a bug).

## 4. Multi-keyword semantics

`MultiKeywordSearchQuery.keywords: string[]` (alongside the existing single
`query: string`) — logical **OR**, bounded to 5 keywords, one public-web
request per keyword. Results are merged and deduplicated by
`(marketplace, externalId)`, keeping the **first** keyword that produced a
given item as its `keyword` provenance field — both on the in-memory
`NormalizedProduct.keyword` and the persisted `ProductObservation.keyword`
column. A single-keyword request (the common case, and every pre-Batch-38
caller) makes exactly the one request it always did — this is strictly
additive, never a silent semantics change for existing callers.

The UI (`/prospects`) splits a comma-separated search box entry into a
keyword list automatically and previews the split before submitting.

**AND / exact-phrase semantics are not implemented.** OR was chosen because
it matches how a merchant actually explores a niche — related phrasings of
the same product idea — not because AND was considered and rejected for a
technical reason.

## 5. Attributes — reserved, not fabricated

`ProductResearchRecord.attributes` (structured properties like size/color/
material beyond the single `brand`/`categoryPath` fields already modeled)
is reserved for a future marketplace-specific properties model. No current
adapter populates it — it is always `{}`. Do not fill it with a guess or a
regex-extracted fragment; add it only once a real, verified source exists
for a specific field, the same way `badges`/`bestsellerRank` were added in
Batch 37/38 only after live verification.

## 7. Formal field inventory (Batch 39)

Full classification per the six-state model (OBSERVED / HISTORICAL_OBSERVED
/ DERIVED / ESTIMATED / USER_DERIVED / UNAVAILABLE — see
`docs/BATCH-39-ACQUISITION-STRATEGY-AUDIT.md` §4 for the model's definition).
"MVP status" marks whether the field is required for the
`PRODUCT_RESEARCH_READY` bar (Batch 38) a merchant needs to decide "does
this deserve further investigation" — not every real field is MVP-required.

| Field | Type | Source (Amazon / Walmart / Etsy) | Classification | Required for MVP? | Freshness | Confidence |
|---|---|---|---|---|---|---|
| title | string | card / card / API | OBSERVED | Yes | Live per-search | High |
| productUrl | string | card / card / API | OBSERVED | Yes | Live per-search | High |
| imageUrl | string | card / card / API | OBSERVED | Yes | Live per-search | High |
| brand | string\|null | detail-only / card+detail / — | OBSERVED where present | No | Live per-search | High when present |
| sellerName/Id | string\|null | detail-only / card+detail / API | OBSERVED where present | Yes (Walmart), No (Amazon cards) | Live per-search | High when present |
| category | string[] | detail-only¹ / card / API | OBSERVED where present | No | Live per-search | High when present |
| price | number\|null | detail-only¹ / card+detail / API | OBSERVED where present | **Yes** | Live per-search | High when present |
| currency | string\|null | with price | OBSERVED where present | Yes (with price) | Live per-search | High |
| availability | enum\|null | detail-only¹ / card+detail / — | OBSERVED where present | No | Live per-search | High when present |
| fulfillmentType | string\|null | — / card / — | OBSERVED (Walmart only) | No | Live per-search | High |
| rating | number\|null | detail-only¹ / card / — | OBSERVED where present | **Yes** | Live per-search | High when present |
| reviewCount | number\|null | detail-only¹ / card / — | OBSERVED where present | **Yes** | Live per-search | High when present |
| review velocity | number\|null | — | UNAVAILABLE (no history yet accumulated for any product) | No | — | — |
| bestsellerRank | array | detail-only¹ / — / — | OBSERVED (Amazon detail only) | No | Live per-search | High when present |
| rank history | array | — | UNAVAILABLE (schema supports it — `ProductObservationSnapshot.bestSellerRankJson`, Batch 38 — but no product has 2+ real observations over meaningful elapsed time yet) | No | — | — |
| sales count | number | — | **UNAVAILABLE**, all three marketplaces except Etsy's real lifetime `transaction_sold_count` | No (Amazon/Walmart), Yes (Etsy) | — | — |
| sales/revenue estimate | number | — | **NOT BUILT** — no estimation model exists (see §6, `docs/MARKET-INTELLIGENCE-ROADMAP.md`) | No | — | — |
| price history | array | `ProductObservationSnapshot` | HISTORICAL_OBSERVED (schema real, needs repeated real-world observation) | No | Per-snapshot | High once accumulated |
| listing age | number | detail (Etsy: `created_timestamp`; Amazon/Walmart: not exposed) | OBSERVED (Etsy only) / UNAVAILABLE (Amazon/Walmart) | No | — | — |
| competing listing count | number | derived from search sample size | DERIVED (sample-bounded, not a true catalog count — see caveat below) | No | Per-search | Medium (sample-size-limited) |
| price/review/rating distribution | stats | derived from search sample | DERIVED | No | Per-search | Medium (sample-size-limited) |
| keyword (which search found this) | string\|null | orchestrator | DERIVED (Batch 38 multi-keyword tagging) | No | Per-search | High |

¹ "detail-only" fields are additionally constrained by Amazon's bot-UA
suppression (`docs/DATA-ACQUISITION.md` §14) — even the detail-page path
only recovers these under specific conditions verified in Batch 37; treat
as "observed when the page allows it," not guaranteed every request.

**Competing-listing-count/distribution caveat**: these are computed from
whatever sample size the current search returned (typically ≤25-50 items
per request), not a true "how many listings exist for this query"
catalog count — neither Amazon nor Walmart's public search page exposes
an exact total. Labeling this DERIVED-from-a-bounded-sample (not a full
census) is itself part of the provenance contract — a future UI surface
must not present it as "X total competing listings" without that caveat.

## 6. Sales, revenue, and demand — the one rule that matters most

`ProductResearchRecord.salesCount` is typed as the literal `null` — not
`number | null`. This is deliberate: no current acquisition source (Amazon
or Walmart's public web surfaces) legitimately exposes a sales count or
sales velocity, so there is no code path that could ever assign it a
number. Amazon's real "Best Sellers Rank" (`bestsellerRank`) is the
closest legitimate demand-proxy signal available today and is captured
verbatim — **never** converted into an estimated sales/day number by this
layer. A future validated estimation model (see `docs/
HISTORICAL-INTELLIGENCE.md` §Phase 5) may one day derive a disclosed
`ESTIMATED` demand figure from longitudinal signals (rank movement, review
velocity, price stability) — that model does not exist yet, and until it
does, sales is `UNAVAILABLE`, not a guess.
