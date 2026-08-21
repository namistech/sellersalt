# MARKETPLACE-RESEARCH-MODEL.md — One Marketplace at a Time

Batch 38, founder direction. SellerSalt's Product Research is
**marketplace-native**, not a simultaneous all-marketplace live-search
aggregator. This document defines what that means architecturally and what
it does not mean.

## 1. The strategy

```
MARKETPLACE-SPECIFIC RESEARCH
      → REAL OBSERVATIONS
      → NORMALIZED DATA
      → HISTORICAL DATABASE
      → LONGITUDINAL SIGNALS
      → INTELLIGENCE
      → CROSS-MARKETPLACE ANALYSIS LATER
```

A search selects one marketplace. That marketplace's own adapter, source
policy, normalization rules, and observable-field set govern the whole
request — no marketplace's research success or failure depends on any
other marketplace being reachable. "All Marketplaces" mode (fan-out across
every registered connector in parallel, `POST /api/marketplaces/research`)
still exists and is still selectable in the UI, but it is **no longer the
default** (`/prospects`' marketplace selector now defaults to `"amazon"`,
reversed from Batch 35's `"all"` default — see `docs/CHANGELOG.md`'s Batch
38 entry for why that earlier choice was made and why it's being reversed
now).

The long-term intent: a future cross-marketplace intelligence layer should
primarily query **SellerSalt's own accumulated database**
(`ProductObservation` and its historical snapshots — see
`docs/HISTORICAL-INTELLIGENCE.md`) rather than requiring Amazon, Etsy, and
Walmart to all be live-searchable at the exact moment a merchant asks a
cross-marketplace question. That layer does not exist yet (see
`docs/HISTORICAL-INTELLIGENCE.md` §Phase 4) — this document describes the
target shape, not a shipped feature.

## 2. Why Amazon first

Per founder direction: Amazon currently has the strongest, most complete
acquisition path of any marketplace in this codebase (verified across
Batches 34-38). Etsy's official API credential is genuinely rejected
(`403`, unresolved, external — see `BATCH-34-REAL-ACQUISITION-RUNTIME-FORENSICS.md`)
and its public-web access is blocked. Walmart's public-web path is also
genuinely rich (see `docs/PRODUCT-RESEARCH-DATA-CONTRACT.md`'s field
matrix) but Amazon was chosen as the default per explicit founder
instruction, not because Walmart is worse.

This batch did not add any new marketplace, and did not attempt to repair
Etsy's credential (out of scope per explicit instruction) or make Amazon
depend on an official Amazon API (none is configured; Amazon's research
path is, and remains, public-web only).

## 3. The marketplace capability contract

Each marketplace already declares, independently:

- **`PublicWebCapabilities`** (`src/marketplaces/core/acquisition/
  contracts.ts`) — `productSearch`, `productDetail`, `shopResearch`,
  `keywordDiscovery`, `categoryDiscovery`, `reviews`, `ratings`, `pricing`,
  `images`, `taxonomy`, `engagement`, `salesEstimation`. Amazon and Walmart
  each set these truthfully based on what their adapter actually
  implements — `salesEstimation: false` for both, always, since neither
  legitimately exposes sales data (see `docs/PRODUCT-RESEARCH-DATA-CONTRACT.md`
  §6).
- **A dedicated adapter** (`src/marketplaces/<marketplace>/public-adapter.ts`)
  implementing `PublicWebAcquisitionAdapter` — its own parser, its own
  observable/unavailable field set, its own failure-reason classification.
- **`SourcePolicyEnforcer`** (`src/marketplaces/core/governance/
  source-policy-enforcer.ts`) — per-marketplace, per-source-type access
  decisions, evaluated before every acquisition attempt. Unmodified by
  this batch (§"Do not touch" governance list).
- **`MarketplaceRegistry`** (`src/marketplaces/core/registry/`) — the
  single source of truth for "which marketplace can do what," looked up by
  `MarketplaceId`, never a hardcoded `if (marketplace === "amazon")` list
  scattered through the app.

This contract already existed before Batch 38 (established across the
marketplace-agnostic architecture work, see `docs/
SELLERSALT-MARKETPLACE-ARCHITECTURE.md`) — this document names it
explicitly as the mechanism that makes "one marketplace at a time"
architecturally real, not just a UI default.

## 4. Per-marketplace isolation, proven

`orchestrateProductResearch(request, policy)`
(`src/marketplaces/core/acquisition/orchestrator.ts`) takes exactly one
`marketplace: MarketplaceId` per call — there is no code path where a
single-marketplace request's success or failure is gated on another
marketplace. Verified live during Batch 37/38: a real Amazon search
succeeds and returns real observations regardless of Etsy's rejected
credential or eBay's blocked access (see the field-presence matrices in
both batches' reports). "All Marketplaces" mode is a thin fan-out
(`fanOutMarketplaceRequest`, `src/marketplaces/core/research-pipeline.ts`)
that calls the same single-marketplace path once per marketplace with
per-marketplace error isolation — it does not change or weaken the
single-marketplace guarantee, it just calls it several times in parallel.

## 5. What this batch changed vs. what it didn't

**Changed:**
- `/prospects`' default marketplace selection: `"all"` → `"amazon"`.
- Multi-keyword search, review/rating filters, real sort-order enforcement,
  and real pagination — all marketplace-agnostic improvements to the
  single-marketplace research path (see `docs/
  PRODUCT-RESEARCH-DATA-CONTRACT.md`).
- New `ProductResearchRecord` canonical shape and `ProductObservation`
  schema fields for richer historical persistence (see `docs/
  HISTORICAL-INTELLIGENCE.md`).

**Not changed:**
- No new marketplace was added.
- Etsy's credential was not touched.
- "All Marketplaces" mode's underlying fan-out logic
  (`fanOutMarketplaceRequest`) is unmodified — it was already correctly
  isolated per-marketplace before this batch; only its UI default moved.
- No governance layer (`SourcePolicyEnforcer`, `AntiCircumventionGuard`,
  `SourceBoundary`, `DataTrustEngine`) was touched.
