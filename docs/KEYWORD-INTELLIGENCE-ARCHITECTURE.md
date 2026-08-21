# KEYWORD-INTELLIGENCE-ARCHITECTURE.md

Batch 39. Defines Keyword Research as a system related to, but distinct
from, Product Research — sharing the same historical intelligence
foundation, never forced into the same acquisition call or the same UI
data shape.

## 1. Why these are two systems, not one

Product Research answers "what products exist for this query." Keyword
Research answers "what terms are worth targeting, and how do they relate
to products/competition." They currently already run through **separate**
service-layer entry points in this codebase
(`src/services/product-hunting.ts` vs. `src/services/keyword-research.ts`)
— this document formalizes that separation as intentional architecture,
not an accident of how the code grew.

They do share one thing deliberately: the same `MarketplaceRegistry`/
`PublicWebAcquisitionAdapter` acquisition layer, and (per Batch 38) the
same historical-observation philosophy. A keyword harvest and a product
search against the same marketplace/query can, and often do, read the
same underlying `NormalizedProduct[]` sample — `AmazonPublicWebAdapter.
harvestPublicKeywords()` literally calls `this.searchPublicProducts()`
internally today. That's a shared *acquisition* dependency, not a shared
*data model* — `KeywordSearchResponse` and `ProductHuntingSearchResponse`
remain distinct shapes.

## 2. Current real capability (verified against code, not assumed)

- **Single keyword**: real, works today for every marketplace with a
  `PublicWebAcquisitionAdapter.capabilities.keywordDiscovery === true`
  (Amazon: real, derives keyword frequency from a real search sample;
  Etsy: real, via the official API when credentialed, or public-web
  fallback).
- **Multiple keywords**: **not implemented for Keyword Research** —
  Batch 38 built multi-keyword OR-fanout for *Product Research*
  (`orchestrateProductResearch`'s `MultiKeywordSearchQuery`) but
  `fetchMarketplaceKeywordResearch`/`fetchAllMarketplaceKeywordResearch`
  (`keyword-research.ts`) still take one `query: string`. This is a real,
  confirmed gap, not a duplicate of the Product Research fix — porting
  the same OR-fanout pattern here is a scoped, well-understood follow-up
  (see `docs/BATCH-39-ACQUISITION-STRATEGY-AUDIT.md` §16).
- **Related keywords**: partially real — `harvestTagsAndNgrams()`
  (`keyword-research.ts`) derives co-occurring terms from the same search
  sample's titles (n-gram frequency), which is a real, disclosed-as-
  derived signal, not a licensed keyword-relation database. No "search
  suggestions"/"autocomplete"-sourced related-keyword feature exists.
- **Keyword/product relationship**: real at the moment of harvest (every
  harvested keyword's `occurrenceCount`/`listingFrequencyPercent` is
  computed directly from the specific products it was derived from), but
  **not persisted as a queryable relationship** — `KeywordObservation`
  (the historical table, see §3) stores the keyword's own stats, not a
  link back to which specific `ProductObservation` rows produced it. A
  real gap for "show me the products currently ranking for this keyword."
- **Observed ranking products**: not implemented as a distinct feature —
  the harvested keyword's source sample *is* effectively "the products
  observed for this keyword" at harvest time, but there's no persisted,
  re-queryable "keyword → current top products" view.
- **Search demand**: **UNAVAILABLE** for Amazon/Walmart — no legitimate
  public source (Amazon Ads' real Search Term Report requires an
  authenticated advertiser account and campaign spend history, not a
  research-only credential; no public search-volume API exists for either
  marketplace). Etsy also does not expose real search volume via its
  Open API v3. `demandProxyScore` (`KeywordObservation.demandProxyScore`)
  is an explicit, disclosed proxy derived from occurrence count and
  listing frequency — never presented as a real search-volume number
  (verified: no code path assigns it to a field labeled "search volume").
- **Keyword opportunity / trend**: not implemented — `KeywordObservation`
  captures one point-in-time snapshot per `(org, marketplace, keyword)`
  (upserted, not historized — see §3's gap) — there is no trend
  computation over repeated observations yet.

## 3. Historical storage — real, but thinner than Product Research's

`KeywordObservation` (`prisma/schema.prisma`) exists and is written to by
`persistKeywordObservations()` (`persistence.ts`) — but unlike
`ProductObservation`, it has **no snapshot table**. Every re-observation
`upsert()`s the same row, overwriting `listingFrequencyPercent`/
`occurrenceCount`/`observedAveragePrice`/`demandProxyScore` in place —
there is no `KeywordObservationSnapshot` to reconstruct "how has this
keyword's observed frequency changed over time." This is the single
clearest missing piece for real keyword trend intelligence, and the
concrete, minimal migration recommendation for a future batch: add a
`KeywordObservationSnapshot` table mirroring `ProductObservationSnapshot`'s
pattern (one row per detected change, same change-detection-vs-touch
logic), not a redesign of `KeywordObservation` itself.

**Not building this in Batch 39** — flagged as the identified next
implementation step (see the main audit report §16), not implemented here
per this batch's "audit first" instruction.

## 4. What Keyword Research must never do

Same Zero-Fabrication contract as Product Research (`docs/DATA-TRUST.md`):
no search-volume number without a real source; `demandProxyScore` and
`competitionProxy` (`KeywordObservation`) are already correctly labeled
proxies, never presented as marketplace-native metrics. If a future
estimation model is built for search demand (see
`docs/MARKET-INTELLIGENCE-ROADMAP.md`), it must carry `ESTIMATED`
provenance with disclosed inputs/confidence — never silently upgraded to
look like an OBSERVED number.

## 5. Recommended architecture (not built this batch)

```
KEYWORD RESEARCH ENGINE                    PRODUCT RESEARCH ENGINE
        │                                          │
        └──────────────┬───────────────────────────┘
                        ▼
          SHARED: MarketplaceRegistry /
          PublicWebAcquisitionAdapter
                        │
                        ▼
          SHARED: Historical Observation Store
          (ProductObservation + a new
           KeywordObservationSnapshot)
                        │
                        ▼
          SHARED: DataTrustEngine / SignalClassification
```

Each engine keeps its own request/response shape, its own filters, its
own UI. They share acquisition and historical storage philosophy, not
implementation.
