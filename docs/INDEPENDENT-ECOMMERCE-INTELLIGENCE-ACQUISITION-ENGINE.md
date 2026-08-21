# INDEPENDENT-ECOMMERCE-INTELLIGENCE-ACQUISITION-ENGINE.md

Batch 39. Defines SellerSalt's acquisition architecture as an explicit,
named system — most of it already exists (built across Batches 1-38);
this document is the first time it's described end-to-end as one
coherent engine rather than scattered across per-batch reports. Where a
layer doesn't exist yet, that's stated plainly, not implied.

## 1. Why this document exists

Founder direction (Batch 39): SellerSalt must not become a thin
marketplace-API wrapper. Official marketplace APIs are one possible
source per marketplace, not the default or required one. This document
names the architecture that makes that true today (it already is, for
Amazon) and defines how it generalizes to every future marketplace
without forcing them into one shared implementation.

## 2. The engine, end to end

```
MARKETPLACE
    │
    ▼
ACQUISITION SOURCES (source-priority ordered per marketplace)
    │
    ▼
RAW OBSERVATION CAPTURE  (PublicPageFetcher — rate-limited, cached, compliant)
    │
    ▼
PARSER  (marketplace-specific, e.g. Amazon card/JSON parser, Walmart __NEXT_DATA__ parser)
    │
    ▼
CANONICAL NORMALIZATION  (NormalizedProduct — src/marketplaces/core/types.ts)
    │
    ▼
PROVENANCE  (SignalProvenance + DataSourceType, attached at normalization time)
    │
    ▼
HISTORICAL OBSERVATION STORE  (ProductObservation / ProductObservationSnapshot)
    │
    ▼
ENRICHMENT  (canonical opportunity scoring, field lineage — partial, see §7)
    │
    ▼
DERIVED SIGNALS  (deterministic math only — e.g. estDailySales from real Etsy totalSales/shopAge)
    │
    ▼
ESTIMATION MODELS  (does not exist yet for Amazon/Walmart demand — see §6, docs/MARKET-INTELLIGENCE-ROADMAP.md)
    │
    ▼
INTELLIGENCE LAYER  (ProductValidationEngine, ProductOpportunityWorkspaceEngine)
```

Every layer above already exists in code except **Estimation Models**
(§6) — that gap is not filled by this batch; it requires a validated
model built from real historical evidence this engine is only now
positioned to accumulate (Batch 38's `ProductObservationSnapshot`
extensions).

## 3. Per-marketplace acquisition, not one shared implementation

Each marketplace has its own `MarketplaceNativeAcquisitionAdapter` —
in this codebase, `PublicWebAcquisitionAdapter`
(`src/marketplaces/core/acquisition/contracts.ts`) implemented once per
marketplace (`src/marketplaces/<marketplace>/public-adapter.ts`), plus an
optional official-API `MarketplaceConnector`
(`src/marketplaces/<marketplace>/connector.ts`). Neither is required for
the other to exist — Amazon has a real, working `PublicWebAcquisitionAdapter`
and **no** official-API connector at all (none is configured; Amazon
Ads/SP-API integration is a real external dependency, not built). Etsy
has both, with the official API currently credential-blocked. This is the
concrete proof that "official API is not automatically the primary
source" is already how the code is shaped, not just a stated intention.

### Source priority, per marketplace (current, real)

| Marketplace | Priority 1 | Priority 2 | Priority 3 |
|---|---|---|---|
| Amazon | `PUBLIC_WEB` (real, works) | `MARKETPLACE_API` (not implemented — no credential exists) | `HISTORICAL_OBSERVATION` (real, `ProductObservation`) |
| Walmart | `PUBLIC_WEB` (real, works) | — (no official API integration exists) | `HISTORICAL_OBSERVATION` |
| Etsy | `PUBLIC_WEB` (blocked — Etsy's anti-bot protection) | `MARKETPLACE_API` (real, currently credential-rejected, `403`) | `HISTORICAL_OBSERVATION` |
| eBay | `PUBLIC_WEB` (blocked — `ACCESS_RESTRICTED`, confirmed live) | — | `HISTORICAL_OBSERVATION` |
| Shopify/WooCommerce | — (no research capability; these are **connected-store**, not **research**, integrations — see §4) | — | — |
| TikTok Shop | — (architecture-ready stub, `NOT_IMPLEMENTED`) | — | — |

This table is the real, current state of `preferredSources` in
`orchestrateProductResearch`'s `DEFAULT_SOURCE_POLICY`
(`src/marketplaces/core/acquisition/orchestrator.ts`) cross-referenced
with each adapter's actual, live-tested behavior (Batches 34-38).

## 4. A boundary this document must restate: research vs. connected stores

`Connector` (platform-owned market research, `organizationId` nullable)
and `SellerChannel` (a customer's own authenticated store) are
architecturally separate (root `CLAUDE.md`'s "Data architecture" section,
unchanged by this batch). Shopify/WooCommerce exist only as
`SellerChannel` integrations (a merchant's own store data) — they have
**no** research-mode acquisition path, and this document does not invent
one. A future Shopify/WooCommerce *research* adapter (if ever built) would
need its own public-web or partner-API strategy, same as Amazon/Walmart —
it would not inherit anything from the existing `SellerChannel` OAuth
connection.

## 5. Compliance boundary (unchanged, re-stated for this document)

`PublicPageFetcher` (`src/marketplaces/core/acquisition/page-fetcher.ts`)
uses an honestly self-identifying User-Agent, respects
`src/marketplaces/core/acquisition/rate-limiter.ts`'s per-domain rate
limits, and every request passes through
`validateAcquisitionCompliance()` (`compliance.ts`) before being sent.
`SourcePolicyEnforcer` evaluates every acquisition attempt against a
per-marketplace, per-source-type policy before it's allowed to run.
`AntiCircumventionGuard` (`anti-circumvention.ts`) and `SourceBoundary`
(`source-boundary.ts`) were not modified by this batch — verified via
`git diff` showing no changes to `src/marketplaces/core/governance/`.
This is the real, load-bearing reason Amazon's price/rating/per-card-
category are currently unavailable (Batch 37 §13, re-confirmed by the
founder in Batch 38): the engine will not spoof its identity to recover
data a marketplace is actively withholding from a disclosed bot.

## 6. What "independent" does NOT mean here

Independent does not mean "SellerSalt invents data no one gave it." It
means: SellerSalt's *primary* research signal comes from its own
acquisition + accumulation, not from being contractually dependent on any
one marketplace's API approval. Every field this engine produces still
traces to one of exactly five provenance states — see `docs/DATA-TRUST.md`
(Batch 38) and `docs/PRODUCT-RESEARCH-DATA-CONTRACT.md` — there is no
sixth "independently determined" category that bypasses OBSERVED/DERIVED/
ESTIMATED/USER_DERIVED/UNAVAILABLE.

## 7. What exists vs. what's genuinely new in this document

**Already real** (built across Batches 1-38, described here for the first
time as one named system): the full pipeline diagram in §2 minus
Estimation Models; per-marketplace adapter isolation (§3); the governance
boundary (§5); `ProductObservation`/`ProductObservationSnapshot`
historical storage with change-detection snapshots (Batch 38).

**Genuinely new in this batch**: nothing implemented — this document is
the named architecture description the founder direction asked for,
explicitly not a new feature. The one gap worth flagging as a real,
not-yet-built layer: **field-level provenance** (`ProductFieldLineage`,
`src/marketplaces/core/types.ts`) is defined but not populated by any
adapter today — every observation carries one record-level `source`, not
independent per-field provenance (e.g. "price observed via X, category
via Y"). Not built this batch; noted in `docs/DATA-TRUST.md` §5 already.
