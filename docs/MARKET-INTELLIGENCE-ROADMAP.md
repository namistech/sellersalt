# MARKET-INTELLIGENCE-ROADMAP.md

Batch 39. Product Research answers "what products exist." Market
Intelligence answers "what is happening in this market." This document
defines the roadmap and — critically — the real data dependency each
future capability needs before it can be built honestly. Nothing in this
document is implemented by this batch; it is explicitly a roadmap, not a
feature list disguised as one.

## 1. The dependency chain

Every item below depends on the one above it. Building out of order means
either fabricating the missing layer or shipping something that looks
like intelligence but isn't grounded in real accumulated evidence.

```
1. Marketplace-native acquisition             — REAL (Batches 34-38)
2. Historical observation accumulation        — REAL, extended in Batch 38
3. Per-product/per-keyword derived signals     — PARTIAL (point-in-time only)
4. Cross-observation trend signals             — NOT BUILT (needs #2 to run over real time)
5. Cross-marketplace comparison from OWN data  — NOT BUILT (needs #4)
6. Validated estimation models (e.g. demand)   — NOT BUILT (needs #4 + ground truth)
7. Predictive/opportunity intelligence         — NOT BUILT (needs #6)
```

This mirrors `docs/HISTORICAL-INTELLIGENCE.md`'s six-phase strategy
(Batch 38) — this document is the Market Intelligence-specific expansion
of that roadmap's Phases 3-6, not a duplicate.

## 2. What Market Intelligence would eventually derive, and its real prerequisite

| Capability | Real prerequisite | Status |
|---|---|---|
| Demand signals (beyond a single sample) | Repeated observations of the same product/category over real time (weeks, not one search) | Not built — data foundation exists (Batch 38), no repeat-observation scheduler exists yet |
| Competition density | Real, already computable per-search (review/price distribution of a live sample) — see `ProductValidationEngine`'s existing P10-P90 price percentiles | **Partially real today**, per-search only, not accumulated across searches |
| Price distribution | Same as above | Partially real today |
| Review distribution | Same as above | Partially real today |
| Seller concentration | Requires seller identity on every observation — real for Walmart (sellerId always captured, Batch 37), real but only on Amazon's product-detail page (not search cards, per the bot-UA constraint), never on Etsy search results at scale | Partially real, marketplace-dependent |
| Opportunity density (niche-level) | Aggregation across many `ProductObservation` rows for a category/keyword over time | Not built — needs #4 |
| Category trends | `CategoryObservation` exists (Batch <38) but has no snapshot/history table either — same gap class as `KeywordObservation` (see `docs/KEYWORD-INTELLIGENCE-ARCHITECTURE.md` §3) | Not built |
| Keyword trends | Needs the `KeywordObservationSnapshot` table recommended in `docs/KEYWORD-INTELLIGENCE-ARCHITECTURE.md` §3 | Not built |
| Product lifecycle (emerging/declining) | Needs #4 — a product must be observed at least twice, ideally many times, with real elapsed time between | Not built |
| Whitespace / saturation scoring | Needs #4 + #5 | Not built |
| Opportunity scores (market-level, not per-listing) | Needs #6 — a validated model, not a formula invented and shipped | Not built. **The per-listing Opportunity Radar score already exists and is real** (`canonical-opportunity.ts`) — this row is specifically about a *market/niche-level* score derived from accumulated evidence, a different and harder thing. |

## 3. The one rule this roadmap exists to enforce

**No row in the table above ships before its prerequisite is real.**
Concretely: do not build "Category Trends" UI before `CategoryObservation`
has a real snapshot history to compute a trend from. Do not build a
market-level "Opportunity Score" before there's a validated relationship
between the signals feeding it and a real outcome. This is the same
discipline that prevented the hardcoded `2.0 sales/day` Planner fallback
(found and removed in Batch 36) from recurring — a plausible-looking
number with no real evidence behind it is worse than an honest
"insufficient data" state.

## 4. What's explicitly NOT being built next

Per this batch's own instruction ("do not implement this entire layer
now"), none of §2's table is implemented in Batch 39. The next concrete,
scoped implementation step — if a future batch picks this up — is **not**
any Market Intelligence capability; it's the two schema additions that
unblock the entire "cross-observation trend" tier: a
`KeywordObservationSnapshot` table (§ above, and
`docs/KEYWORD-INTELLIGENCE-ARCHITECTURE.md` §3) and a
`CategoryObservationSnapshot` table (same pattern). Everything in §2's
table sits behind those two additions plus enough elapsed real-world time
for repeated observations to accumulate — no amount of code alone
produces that; it requires the product to actually run and be searched
against, repeatedly, over weeks.
