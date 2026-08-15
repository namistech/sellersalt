Status: Draft
Owner: [ASSUMPTION] Founder (Aliyan)
Last Updated: 2026-08-14
Decision State: Current-state (two-connector-system split) is factual. The normalization *architecture direction* is [LOCKED] (Decision 3, 2026-08-14). The concrete normalized-entity schema is explicitly [DEFERRED] until a second marketplace is selected — not a gap, a deliberate choice.

# Marketplace Architecture

## Two distinct connector concepts — do not collapse them

SellerSalt has, and must keep, two separate systems that both happen to
touch "Etsy":

### 1. Marketplace research connectors (`src/connectors/`)

Platform-wide, read-only market research. One platform-owned credential
set researches data on behalf of *all* customers (`Connector.organizationId`
is nullable — null means platform-owned, the normal case; non-null means
an org brought its own key, an opt-in premium option).

- Contract: `MarketplaceConnector` in `src/connectors/types.ts` —
  `testConnection`, `runSearch`, optional `getShopStats`,
  `getShopByName`, `getShopTopListings`.
- Registry: `src/connectors/registry.ts` — `Record<ConnectorType,
  MarketplaceConnector>`. Adding a marketplace = write the module,
  register it here; per the code comment, "nothing else in the app
  (jobs, worker, dashboard) needs to change."
- Implemented today: `ETSY` (`src/connectors/etsy/`). `ConnectorType`
  enum comment names eBay as the next planned addition; Amazon/
  AliExpress/Shopify-sourcing are named as later phase-2 candidates in
  the schema comment, not committed work.
- Scaling constraint: every customer shares one Etsy Personal Access
  connector — 5 req/sec, 5,000 requests/day, combined across all
  customers. Not solved, just flagged (root `CLAUDE.md`).

### 2. Seller/channel connectors (`src/seller-channels/`)

One specific customer's own authenticated store. Their own credentials,
their own data — completely separate from marketplace research even
when the platform is the same (e.g. `ETSY_SELLER` here vs. `ETSY` in
`ConnectorType` above are unrelated tables and unrelated credentials).

- Contract: `SellerChannelConnector` in `src/seller-channels/types.ts` —
  `testConnection`, `fetchRecentOrders`. Deliberately minimal — read-only
  today; the code comment states write operations (cross-listing) will
  *extend* this interface later, not replace it.
- Registry: `src/seller-channels/registry.ts` — `Record<platform,
  SellerChannelConnector>`.
- Implemented today: `WOOCOMMERCE`, `SHOPIFY`, `ETSY_SELLER`.
  `SellerChannelPlatform` enum also declares `EBAY_SELLER` — present in
  the schema but [VERIFY] whether a connector module exists for it (not
  found under `src/seller-channels/` in this pass — schema enum member
  without an implementation, i.e. reserved not built).
- Currently gated admin-only at both the nav and API layer
  (`requireAdminOrg()`). See [architecture/rbac.md](rbac.md).

### Why the split matters

A future marketplace research connector (eBay) and a future seller
channel connector (an eBay seller store) are two different pieces of
work with two different interfaces, even though they'd share a platform
name. Do not build "one eBay connector" — build both, independently,
against their respective contracts.

## [LOCKED — Decision 3, 2026-08-14] Target architecture

> The architecture MUST be designed with a marketplace/platform
> abstraction boundary. The current Etsy-specific implementation can
> remain operational. Do not perform a database rewrite or migration
> now, and do not prematurely design an enormous universal schema for
> hypothetical marketplaces — the concrete normalization schema will be
> finalized when the second production marketplace/platform is
> selected. Until then: preserve current Etsy functionality, isolate
> new platform-specific code, avoid introducing additional Etsy
> coupling, and design interfaces/capabilities so future adapters can
> plug in.

Locked target pipeline (this is now the committed direction, not a
proposal):

```
RAW MARKETPLACE DATA
  ↓
MARKETPLACE ADAPTER / CONNECTOR
  ↓
NORMALIZED COMMERCE REPRESENTATION
  ↓
INTELLIGENCE SERVICES
  ↓
SCORES / ANALYSIS / TRENDS
  ↓
RECOMMENDATIONS
  ↓
ACTIONS
```

### What is locked vs. what is deferred

| | Status |
|---|---|
| The existence of an abstraction boundary between raw marketplace data and the intelligence layer | **[LOCKED]** |
| The pipeline shape above (adapter → normalized representation → intelligence → scores → recommendations → actions) | **[LOCKED]** |
| `src/connectors/<marketplace>/` as the adapter seam (already the right location per the existing `MarketplaceConnector` contract) | **[LOCKED]** — this is where "Marketplace Adapter / Connector" in the pipeline already lives today |
| Concrete normalized-entity schema (field names/types for Shop/Listing/Sale) | **[DEFERRED]** until the second marketplace is selected — explicitly not to be designed now against hypothetical marketplaces |
| Whether `Prospect`/`ShopSnapshot` get migrated to the normalized shape, or a new set of tables is added alongside them | **[DEFERRED]** — depends on the deferred schema decision above |
| A schema migration of any kind for this | **Not authorized in this pass** — current Etsy-specific implementation remains fully operational, unchanged |

### Practical guidance until the second marketplace is chosen

Per the locked decision, engineering work in this area between now and
that point should follow these rules:

1. **Preserve current Etsy functionality** — no behavior change to
   `src/connectors/etsy/`, `Prospect`, `ShopWatch`/`ShopSnapshot`, or
   `competition-scoring.ts` is required or expected by this decision.
2. **Isolate new platform-specific code** — if any exploratory work on a
   second marketplace starts before it's formally selected, keep it in
   its own `src/connectors/<marketplace>/` module (per the existing,
   already-correct registry pattern in `src/connectors/registry.ts`) —
   never inline a second marketplace's assumptions into shared code
   paths like `competition-scoring.ts` or the `Prospect` writing logic.
3. **Avoid introducing additional Etsy coupling** — new features built
   against research data between now and the normalization work should
   avoid adding *new* direct dependencies on Etsy-specific field names
   (e.g. `numFavorers`) in code that isn't already Etsy-specific (e.g.
   `src/connectors/etsy/index.ts` itself is fine; a new cross-cutting
   dashboard feature reading `Prospect.numFavorers` directly makes the
   eventual normalization migration larger). Where practical, route new
   cross-cutting reads through `competition-scoring.ts` or a similar
   single seam rather than querying `Prospect` fields directly in
   multiple new places.
4. **Design interfaces so future adapters can plug in** — the existing
   `MarketplaceConnector` interface (`src/connectors/types.ts`) and its
   registry (`src/connectors/registry.ts`) already satisfy this
   ("adding a marketplace = write the module, register it here" per the
   registry's own code comment) — this decision confirms that pattern
   is the right one to keep extending, not something to replace.
5. See [marketplace/etsy.md](../marketplace/etsy.md) for connector-
   specific application of these rules, and
   [marketplace/marketplace-abstraction.md](../marketplace/marketplace-abstraction.md)
   for the product-facing restatement of this same pipeline.

## Background: why this boundary is needed (context for the locked decision)

`Prospect` (the research output table) carries Etsy-shaped fields
directly: `shopExternalId`, `listingExternalId`, `numFavorers`,
`avgSellingRatio`, `estDailySales`, `reviewVelocity`. These field names
and semantics come from Etsy's API shape, not from a marketplace-neutral
commerce vocabulary. `competition-scoring.ts` (the intelligence layer)
reads these fields directly.

This means: **adding a second marketplace today would require either
(a) making every new marketplace's data fit Etsy's field names, which
breaks down fast (a marketplace without a "favorites" concept, for
example), or (b) branching scoring logic per marketplace, which
defeats the purpose of a shared intelligence engine.** This is the
concrete problem the locked pipeline above exists to solve, and the
concrete reason the pipeline's "Normalized Commerce Representation"
stage is necessary rather than optional.

### Questions explicitly deferred until the second marketplace is selected

Per Decision 3, these are **not** to be resolved now — designing them
against a hypothetical marketplace risks guessing wrong and building the
"enormous universal schema" the decision explicitly warns against.
Recorded here so the eventual design work starts from the right
questions instead of re-discovering them:

1. **Where does normalization happen?** Candidates: inside each
   connector's `runSearch()`/`getShopStats()` before returning
   `ProspectResult`/`ShopStats` (the interfaces in `types.ts` already
   look mostly marketplace-neutral in name); a new explicit mapping step
   between connector output and DB writes; or at read time, when the
   intelligence engine queries the DB. The first two avoid re-deriving
   normalized data on every read; the third is simplest to add without a
   migration but pushes cost onto every query.
2. **Does the DB schema itself need to become marketplace-neutral**, or
   can marketplace-specific fields stay on `Prospect` as long as the
   intelligence layer only reads a normalized subset/view?
3. **What counts as a "commerce entity"?** At minimum: Shop/Seller,
   Listing/Product, Sale/Transaction. Whether Review, Favorite, and
   Category also need first-class normalized shapes depends on which
   marketplace ships second and what data it actually exposes — Etsy
   exposes favorites, many marketplaces don't.

None of these block any work between now and the second-marketplace
decision — see "Practical guidance" above for what to actually do in
the meantime.

## Cross-listing (existing foundation, unrelated to the above)

`CrossListing`/`CrossListingEntry` group one logical product across
multiple `SellerChannel` connections (write-side, seller channels only
— has nothing to do with marketplace research normalization above). One
entry per grouping is flagged `isSource`. No push/sync logic exists;
this is schema-only foundation today.
