# DATA-TRUST.md — How SellerSalt Discloses Certainty

Every number SellerSalt shows a merchant carries an explicit classification
of how it was obtained. This document defines the four (five, counting the
explicit "none") states and where each one shows up in the codebase — it
does not introduce a new system, it documents the one that already governs
every metric in the app (`SignalProvenance`,
`src/marketplaces/core/types.ts`).

## 1. The five states

| State | Meaning | Example |
|---|---|---|
| **OBSERVED** (`ACTUAL_DATA`) | Read directly from the marketplace's own response — a real price, a real review count, a real seller name. | Amazon's "Best Sellers Rank: #8 in Mugs" |
| **DERIVED** | Computed from one or more OBSERVED fields via a disclosed, deterministic formula — never a model, never a guess. | Etsy's `estDailySales = totalSales / (shopAgeMonths × 30.44)` |
| **ESTIMATED** (`ESTIMATED`) | A model-based inference, explicitly labeled as such, never presented as if directly observed. | (No live estimation model exists yet for Amazon/Walmart demand — see §4.) |
| **USER_DERIVED** | Supplied by the merchant themselves (e.g. their own COGS in the Unit Economics calculator), not acquired from any marketplace. | Planner's Unit Economics inputs |
| **UNAVAILABLE** | The legitimate source does not expose this field — confirmed by inspection, not assumed. | Amazon/Walmart shop age; Amazon/Walmart sales count |

`SellerSalt Score` (`SELLERSALT_SCORE`) is a fifth, distinct label reserved
for SellerSalt's own composite scoring output (e.g. the Opportunity Radar
score) — a deliberately different label from `ESTIMATED`, since a composite
score is not "the same kind of number, just modeled" as a missing metric;
it's a different kind of artifact entirely (see
`src/services/intelligence/universal-scoring.ts`'s `ProvenanceBadgeType`
convention, which this file's four/five-state model matches).

## 2. Where this shows up in code

- **`NormalizedProduct.source: SignalProvenance`** — every acquired product
  carries one of these states for its overall observation.
- **`ProductResearchRecord.dataTrust: { provenance, confidence }`** — the
  canonical Product Research record's explicit trust envelope (Batch 38,
  `docs/PRODUCT-RESEARCH-DATA-CONTRACT.md`).
- **`ProductFieldLineage`** (`src/marketplaces/core/types.ts`) — an
  optional, more granular per-field provenance record (`title`, `price`,
  `rating`, etc. each independently tagged), used where an engine needs to
  disclose that some fields on the same record came from different sources
  or methodologies. Not populated by every adapter today — see §5.
- **`DataProvenanceBadge`** (`src/components/data/DataProvenanceBadge.tsx`)
  — the UI-facing badge (`[ACTUAL ETSY DATA]` / `[ESTIMATED]` /
  `[SELLERSALT SCORE]` / `[EXTERNAL DATA]`) — this repo's original,
  Etsy-era provenance convention (see root `CLAUDE.md` non-negotiable rule
  #2), extended marketplace-aware in Batch 36 so Amazon/Walmart results
  never show a hardcoded `[ACTUAL ETSY DATA]` badge.

## 3. Confidence, distinct from provenance

`confidence: number | null` (0-100) is a *separate* axis from provenance —
two `ACTUAL_DATA` records can have different confidence if one is fresher
or more completely observed than the other (see
`src/marketplaces/core/acquisition/freshness.ts`'s confidence-penalty
logic, which reduces confidence for `HISTORICAL_OBSERVATION`-sourced
records). Confidence is never used to *hide* a low-trust number — it's
disclosed alongside it, same as provenance.

## 4. What "no fabrication" actually forbids

Concretely, forbidden patterns this codebase's tests actively guard
against (see `src/tests/batch-36-end-to-end-commercial-intelligence.test.ts`,
`src/tests/batch-37-product-research-data-contract.test.ts`,
`src/tests/batch-38-marketplace-native-product-research.test.ts`):

- `p.price ?? 0` (or any numeric field) rendered where the real value is
  `null` — a real `$0.00` must be indistinguishable from nothing only if
  Amazon/Walmart actually returned a real `$0.00`, which they don't; a
  missing price renders as "Unavailable" text, never a number.
- A hardcoded fallback sales/velocity number (Batch 36 found and removed a
  literal `2.0 sales/day` fallback in the Planner's Unit Economics
  calculator) standing in for a genuinely unobserved value.
- A marketplace-mismatched provenance badge (Batch 36 found `[ACTUAL ETSY
  DATA]` shown for Amazon/Walmart results).
- A currency assumed rather than parsed (Batch 37 found Amazon's adapter
  hardcoding `currency: "USD"` regardless of the real, sometimes
  geo-localized, currency Amazon actually returned).
- A filter silently ignored while the API still returns `200` (Batch
  37/38 found and fixed three instances of this: price, then
  review-count/rating, then sort order — see `docs/
  PRODUCT-RESEARCH-DATA-CONTRACT.md` §3).

## 5. Known, disclosed gaps in this system today

- `ProductFieldLineage` (per-field provenance) is defined but not
  populated by the Amazon/Walmart public-web adapters today — they set the
  coarser, record-level `source` field only. A future pass could thread
  per-field lineage through (e.g. "price observed via
  `#apex-pricetopay-accessibility-label`, category via HTML breadcrumb")
  for full field-level audit trails; not built yet, not claimed as built.
- No live `ESTIMATED` demand model exists for Amazon/Walmart — see
  `docs/HISTORICAL-INTELLIGENCE.md` §Phase 5 for what would need to exist
  (validated longitudinal evidence) before one could honestly ship.
