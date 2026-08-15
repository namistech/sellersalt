Status: Draft
Owner: [ASSUMPTION] Founder (Aliyan)
Last Updated: 2026-08-14
Decision State: Factual — verified against src/connectors/etsy. Subject to [LOCKED] Decision 3 coupling-isolation guidance below.

# Etsy Marketplace Connector

## Coupling guidance under Decision 3 (2026-08-14) — [LOCKED]

Decision 3 locks a marketplace abstraction boundary as the target
architecture (see [architecture/marketplace.md](../architecture/marketplace.md))
but explicitly defers the concrete normalized schema until a second
marketplace is selected, and explicitly states the current Etsy
implementation "can remain operational" — **no change to this connector
is required or expected by that decision.** What the decision does
require going forward:

- **Preserve current Etsy functionality** — this connector's behavior
  (search, shop stats, derived metrics below) is not in scope for
  change from Decision 3 alone.
- **Avoid introducing *additional* Etsy coupling** — new cross-cutting
  features (dashboard views, future AI-assistant tools, etc.) should
  avoid taking on *new* direct dependencies on this connector's
  Etsy-shaped output fields (`numFavorers`, `avgSellingRatio`, etc.) in
  code outside this module. This connector itself is exactly where
  Etsy-specific logic is supposed to live — that's not the coupling to
  avoid. The coupling to avoid is a *new* file elsewhere in the codebase
  reaching into `Prospect.numFavorers` directly instead of going through
  a shared read path.
- **Isolate any future second-marketplace exploration** — if
  preliminary work on a second marketplace (eBay is the only one named
  anywhere in code, per the `ConnectorType` enum comment) starts before
  it's formally selected, it belongs in its own
  `src/connectors/<marketplace>/` module, following this file's own
  pattern, never inline into this connector or into shared intelligence
  code.

## Scope of this document

This covers the **research connector** (`src/connectors/etsy/`,
`ConnectorType.ETSY`) — platform-wide market research. It does not cover
the separate Etsy-**seller** connector (`ETSY_SELLER`,
`src/seller-channels/etsy-seller/`), which authenticates a customer's own
shop for analytics/cross-listing. See
[architecture/marketplace.md](../architecture/marketplace.md) for why
these are deliberately different systems despite both being "Etsy."

## Implementation

- `src/connectors/etsy/client.ts` (47 lines) — low-level Etsy API client.
- `src/connectors/etsy/index.ts` (209 lines) — implements the
  `MarketplaceConnector` contract (`testConnection`, `runSearch`,
  `getShopStats`, `getShopByName`, `getShopTopListings`).

## Data honesty note (from the code's own comment)

The connector's header comment documents a real correction: earlier
versions assumed Etsy's public API didn't expose lifetime sales and used
`review_count` as a proxy metric. That was wrong — Etsy's shop resource
includes `transaction_sold_count`, a real lifetime sales figure.
`totalSales` is that real number; `avgSellingRatio` and `estDailySales`
are computed directly from it. `reviewRatio`/`reviewVelocity` are kept as
*secondary* engagement signals, not the primary sales metric. Any future
marketplace connector should hold to this same standard — prefer a
platform's real transaction/sales data over a review-count proxy
wherever the platform's API actually exposes it.

## Derived metrics computed client-side of the API response

All computed in `src/connectors/etsy/index.ts`, not returned by Etsy
directly:

- `shopAgeMonths` — from `created_timestamp`, `/(30.44 days/month)`.
- `reviewRatio` — `reviewCount / activeListings`.
- `reviewVelocity` — `reviewCount / shopAgeMonths`.
- `avgSellingRatio` — `totalSales / activeListings`.
- `estDailySales` — `totalSales / (shopAgeMonths × 30.44)`.

These are exactly the fields flagged in
[architecture/marketplace.md](../architecture/marketplace.md) as
Etsy-shaped assumptions baked into `Prospect`. A future marketplace
without an equivalent to, say, `activeListings` (a marketplace that
doesn't expose per-shop listing counts) would need either a different
derived-metric strategy or explicit "not available for this marketplace"
handling — not a forced substitution.

## Rate/quota constraint

Every customer shares one platform-owned Etsy Personal Access connector:
5 requests/sec, 5,000 requests/day, combined across **all** customers
(root `CLAUDE.md`, "Known scaling constraint"). Not solved — flagged.
Any feature that increases per-search or per-tracked-shop API call
volume (e.g. a richer AI-assistant tool that re-fetches shop data on
demand) needs to be evaluated against this shared budget before
shipping. [DECISION REQUIRED] on whether/when per-org bring-your-own-key
connectors (already supported by the nullable `Connector.organizationId`
field) become the recommended path for high-volume customers.

## What's NOT covered by this connector

Etsy's own seller-side data (a customer's own shop orders, inventory) —
that's `ETSY_SELLER` in `src/seller-channels/`, a completely separate
credential set and API surface (PKCE OAuth, hourly token refresh since
Etsy tokens expire in ~1 hour, per root `CLAUDE.md`).
