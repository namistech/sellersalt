Status: Draft
Owner: [ASSUMPTION] Founder (Aliyan)
Last Updated: 2026-08-14
Decision State: The pipeline shape below is [LOCKED] (Decision 3, 2026-08-14). The concrete normalized-entity schema is [DEFERRED] until a second marketplace is selected — deliberately, not an oversight. No implementation started.

# Marketplace Abstraction

> **[LOCKED — Decision 3, 2026-08-14]** The pipeline below is the
> committed target architecture. Do not perform a database rewrite or
> migration now. Current Etsy-specific implementation remains fully
> operational. The concrete normalization schema is finalized when the
> second production marketplace/platform is selected — until then,
> preserve current Etsy functionality, isolate new platform-specific
> code, avoid introducing additional Etsy coupling, and design
> interfaces/capabilities so future adapters can plug in. Full detail
> and practical engineering guidance:
> [architecture/marketplace.md](../architecture/marketplace.md) — that
> is the primary technical reference. This document is the shorter
> conceptual/product-facing summary.

## The pipeline [LOCKED]

```
RAW MARKETPLACE DATA
  Whatever a marketplace's own API returns — Etsy's listing/shop JSON
  today. Lives entirely inside a connector module
  (src/connectors/<marketplace>/).

  ↓

MARKETPLACE ADAPTER
  Translates raw marketplace data into the shapes SellerSalt understands.
  The interfaces in src/connectors/types.ts (SearchConfigInput,
  ProspectResult, ShopStats, TopListing) are close to this already —
  they're marketplace-neutral in name, but their actual field semantics
  (numFavorers, avgSellingRatio) still assume Etsy-like concepts.

  ↓

NORMALIZED COMMERCE ENTITIES
  Does not exist as a distinct layer today. Would be the marketplace-
  neutral representation of Shop/Seller, Listing/Product, and
  Sale/Transaction that every marketplace maps into, regardless of what
  that marketplace calls things or which fields it exposes.

  ↓

INTELLIGENCE ENGINE
  competition-scoring.ts today. Reads Prospect fields directly (see the
  gap above). Should read normalized entities once they exist, so
  scoring logic is written once and applies to every marketplace.

  ↓

SCORES / ANALYSIS / TRENDS
  Difficulty/Demand scores, Trends, Dropped-shops — all exist today for
  Etsy.

  ↓

RECOMMENDATIONS
  Not built. Per the brief, this is where "find opportunities," "find
  products losing momentum," and similar surfaced insights would live —
  likely both a dashboard feature and an AI-assistant tool (see
  ai/assistant.md).

  ↓

ACTIONS
  Not built. Cross-listing push/sync (schema foundation exists —
  CrossListing/CrossListingEntry) is the closest analog today, but that
  writes to a customer's own store (seller channel), not an action taken
  on marketplace research data. Whether "Actions" in the intelligence
  pipeline sense means something else (e.g. "auto-adjust a price," "auto-
  generate a listing description") is undefined. [DECISION REQUIRED]
```

## Why this is a product decision, not just an engineering one

Which fields become "normalized commerce entities" determines which
intelligence features are even possible across marketplaces. If
"favorites" is treated as a first-class normalized field, every future
marketplace connector needs either a real favorites-equivalent or an
explicit "not supported" state that intelligence/UI code must handle
gracefully. Getting this list right requires knowing which marketplace
ships second — deferring the full entity-shape decision until that's
chosen is the recommendation in
[architecture/marketplace.md](../architecture/marketplace.md).

## Relationship to seller channels

This entire pipeline is about **marketplace research** data
(`Connector`/`Prospect`/`ShopWatch`). It has no direct bearing on
**seller channels** (`SellerChannel`/`SellerOrder`) — a customer's own
store data is already reasonably normalized (currency-aware, per-store)
because there was never an Etsy-specific shape imposed on it the way
`Prospect` has one. See
[architecture/marketplace.md](../architecture/marketplace.md) for the
full two-connector-systems explanation.
