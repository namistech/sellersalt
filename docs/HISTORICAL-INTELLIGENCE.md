# HISTORICAL-INTELLIGENCE.md — The Database-First Intelligence Strategy

Batch 38. Documents the six-phase strategy SellerSalt's data architecture
is building toward, and precisely which phases are real today versus
aspirational.

## The six phases

```
PHASE 1  Marketplace-native acquisition
PHASE 2  Historical observation accumulation
PHASE 3  Marketplace intelligence
PHASE 4  Cross-marketplace intelligence (from SellerSalt's own database)
PHASE 5  Validated estimation models
PHASE 6  Predictive opportunity intelligence
```

### Phase 1 — Marketplace-native acquisition. **Real, live.**

One marketplace, one request, real observations — see `docs/
MARKETPLACE-RESEARCH-MODEL.md`. Amazon and Walmart's public-web adapters
genuinely work (Batches 34-38); Etsy's official API is credential-blocked
(external, unresolved).

### Phase 2 — Historical observation accumulation. **Real, live, extended in Batch 38.**

Every acquisition (when `persistObservations: true`, the default policy)
writes into two tables:

- **`ProductObservation`** — one row per `(organizationId, marketplace,
  externalId)`, upserted on every re-observation. Carries the full
  `ProductResearchRecord`-shaped field set as of Batch 38: price, currency,
  rating, reviewCount, favoritesCount, salesCount (always null — see
  `docs/PRODUCT-RESEARCH-DATA-CONTRACT.md` §6), estimatedDemand, shopName/
  shopExternalId/shopUrl, categoryPath, brand, badges, availability,
  shippingInfo, bestSellerRankJson, keyword (which search produced it),
  imageUrl, sourceType/sourceUrl/provenance/confidence/fieldLineageJson.
  `createdAt` is the row's real first-observed timestamp (never updated);
  `observedAt` is the most recent re-observation timestamp.
- **`ProductObservationSnapshot`** — one row per *detected change*, not
  per re-observation. `src/marketplaces/core/acquisition/deduplication.ts`'s
  `computeProductObservationFingerprint`/`evaluateObservationChange`
  compare price, currency, rating, reviewCount, favoritesCount, salesCount,
  title, shopName, and (new in Batch 38) `availability` — a genuinely
  unchanged re-observation only touches `observedAt` on the main row and
  creates no new snapshot; a real change (price move, rating shift, a
  restock/out-of-stock flip, a seller change) creates one. Snapshots carry
  price/currency/rating/reviewCount/favoritesCount/salesCount plus (new in
  Batch 38) `availability`, `shopName`, and `bestSellerRankJson`, so "what
  changed" is reconstructable field-by-field, not just "something changed."

This means the questions Batch 38's spec asked for are **already
answerable today**, from real accumulated data, once a query has been run
more than once over time:

- *Price increased/decreased* — compare consecutive `ProductObservationSnapshot.price` values for one `productObservationId`.
- *Review velocity increased* — compare consecutive `reviewCount` snapshots against elapsed time.
- *Availability changed* — compare consecutive `availability` snapshots.
- *Seller changed* — compare consecutive `shopName` snapshots (also directly flagged in `evaluateObservationChange`'s `changedFields`).
- *Ranking improved* — compare consecutive `bestSellerRankJson` snapshots (Amazon only — see the field matrix).
- *Product disappeared* — a row whose `observedAt` stops advancing across repeated searches for its keyword/category is inferable, though no dedicated "delisted" detector exists yet (see Phase 3 below).

Real, verified end-to-end during Batch 38: a fresh observation creates a
baseline row + snapshot; a byte-identical re-observation creates neither a
new row nor a new snapshot (only touches `observedAt`); a real price
change creates exactly one new snapshot and updates the main row — proven
with a live database test (`src/tests/batch-38-marketplace-native-product-research.test.ts`,
"first observation..."/"...creates a new snapshot").

**Not built**: a scheduled/repeating job that re-observes a saved product
on a cadence (the way `ShopWatch`/`ListingWatch` already do for Etsy shops/
listings — see root `AGENTS.md` §7). Today, a new snapshot only happens
when a user-initiated search happens to re-surface the same product. A
"track this Amazon product over time" feature would need its own
BullMQ-scheduled job, analogous to the existing Etsy tracking
infrastructure — architecturally straightforward given the schema already
supports it, but not implemented.

### Phase 3 — Marketplace intelligence. **Partially real.**

`ProductValidationEngine` and `ProductOpportunityWorkspaceEngine` already
compute real, disclosed-evidence verdicts from a single acquisition sample
(see `BATCH-36-END-TO-END-COMMERCIAL-INTELLIGENCE-VALIDATION.md`). What's
*not* built yet: intelligence that reads the **longitudinal** signal
(`ProductObservationSnapshot` history) rather than one point-in-time
sample — e.g. "this product's price has been stable for 3 months" or "this
category's review velocity is accelerating." The data foundation for this
exists (Phase 2); the engines that read it historically do not yet.

### Phase 4 — Cross-marketplace intelligence from SellerSalt's own database. **Not built; explicitly the target architecture.**

Today, "All Marketplaces" mode (`POST /api/marketplaces/research`) is a
live fan-out — it calls every marketplace's own acquisition path in
parallel at request time (see `docs/MARKETPLACE-RESEARCH-MODEL.md` §4).
The target architecture (per Batch 38's founder direction) is for a future
cross-marketplace view to primarily query `ProductObservation` filtered
across marketplaces — i.e. "what does SellerSalt already know about this
niche across Amazon and Walmart" — rather than requiring every marketplace
to answer a live HTTP request at the moment a merchant asks. This shifts
the reliability story: a marketplace being temporarily rate-limited or
blocked stops being a live-search-time failure and becomes "this
marketplace's data is a few hours/days old," which is both more honest and
more resilient. **Not implemented this batch** — it requires a real query/
aggregation layer over `ProductObservation` that doesn't exist yet, plus a
decision about acceptable staleness per marketplace.

### Phase 5 — Validated estimation models. **Not built.**

Any future `ESTIMATED` sales/demand figure must be built from Phase 2's
real longitudinal evidence (rank movement, review velocity, price
stability, listing age) and validated against ground truth before
shipping — not a formula invented and shipped without evidence it
correlates with anything real. See `docs/DATA-TRUST.md` §4 for the
specific prior incident (a hardcoded `2.0 sales/day` fallback, found and
removed in Batch 36) this rule exists to prevent from recurring.

### Phase 6 — Predictive opportunity intelligence. **Not built.**

Depends on Phase 5 existing and being validated first. Not scoped, not
started.

## Where this leaves the roadmap

Phases 1-2 are real and were meaningfully extended in Batch 38 (richer
`ProductObservation` schema, keyword provenance, availability/seller-change
history). Phase 3 is partially real (point-in-time, not yet longitudinal).
Phases 4-6 are explicitly future work with real prerequisites, not vague
aspirations — each phase's "not built" note above states exactly what
would need to exist first.
