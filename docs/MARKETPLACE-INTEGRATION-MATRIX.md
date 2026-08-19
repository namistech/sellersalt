# Marketplace Integration Matrix

Authoritative status table. Source of truth is each
`src/marketplaces/<id>/connector.ts`'s `capabilities` object plus which
methods it actually implements — this table must never claim a status the
code doesn't back. Regenerate/review whenever a connector's capabilities
change; treat a stale row here as a bug, not housekeeping.

**Status legend (used everywhere below, no other wording):**
- **IMPLEMENTED** — real, live, working today.
- **PARTIAL** — some real capability exists, the rest doesn't yet.
- **NOT IMPLEMENTED** — no code path for this at all.
- **ARCHITECTURE READY** — the connector, types, and registration exist;
  zero live API calls because no credentials/integration exist yet.

| Marketplace | Connector | Research | Product Search | Keyword Research | Category Research | Shop Connection | Listings Read | Listings Write | Orders | Analytics | Current Status | Credential Required? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Etsy** | IMPLEMENTED | IMPLEMENTED (`searchPublicListings`, `searchProducts` — real Etsy Open API v3) | IMPLEMENTED | IMPLEMENTED (Etsy-only, via `fetchMarketplaceKeywordResearch`) | IMPLEMENTED (Etsy-only, via `fetchMarketplaceCategoryTree`) | IMPLEMENTED (OAuth PKCE) | NOT IMPLEMENTED (no generic `getListings()`; reads happen via dedicated Studio/SEO routes, not the connector interface) | PARTIAL (`createListing` makes a local draft only; live push requires a separate human-approved action — permanent, not a gap) | IMPLEMENTED (`getOrders` via `/shops/{id}/receipts`) | NOT IMPLEMENTED (no `getAnalytics()` on the connector; analytics dashboard reads orders directly) | **Live, production** | Yes — platform-owned key (shared) or org-specific key, resolved automatically |
| **Shopify** | PARTIAL | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT IMPLEMENTED | IMPLEMENTED (OAuth via GraphQL Admin API) | NOT IMPLEMENTED | NOT IMPLEMENTED | IMPLEMENTED (`getOrders`) | NOT IMPLEMENTED | **Live for account connect + order sync only; admin-only in the product** | Yes — per-org OAuth (MVP scope: admin-only, not customer-facing) |
| **WooCommerce** | PARTIAL | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT IMPLEMENTED | IMPLEMENTED (app-authorization OAuth + manual-key fallback) | NOT IMPLEMENTED | NOT IMPLEMENTED | IMPLEMENTED (`getOrders`) | NOT IMPLEMENTED | **Live for account connect + order sync only; admin-only in the product** | Yes — per-org OAuth or manual keys (MVP scope: admin-only) |
| **Amazon** | ARCHITECTURE READY | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT IMPLEMENTED | **No live API integration** — every method throws `MarketplaceNotImplementedError` | Would need Amazon SP-API developer app + LWA OAuth credentials (none exist in this repo) |
| **eBay** | ARCHITECTURE READY | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT IMPLEMENTED | **No live API integration** — every method throws `MarketplaceNotImplementedError` | Would need an eBay Developer Program application (none exist in this repo) |
| **TikTok Shop** | ARCHITECTURE READY | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT IMPLEMENTED | **No live API integration** — every method throws `MarketplaceNotImplementedError` | Would need a TikTok Shop Partner Center application (none exist in this repo) |

Notes:
- `SellerChannelPlatform.EBAY_SELLER` existed in the Prisma schema with no
  connector registered for it at all until the marketplace-abstraction
  work — now backed by an honest architecture-ready stub instead of a
  silently-unreachable enum value.
- Etsy's OAuth scopes: `listings_w listings_r shops_r transactions_r`.
  `shops_w` and a non-existent `billing_r` scope (confirmed against
  Etsy's live, current scope list — it was never a real Etsy v3 scope)
  were removed during the compliance remediation.
- "All Marketplaces" fan-out (`POST /api/marketplaces/research`) queries
  every registered connector's Research/Product Search capability in
  parallel and reports each one's real status — it does not change any row
  in this table, it just surfaces these statuses in one UI request. The
  same fan-out pattern (via the shared `fanOutMarketplaceRequest<T>()`
  helper) now also backs Keyword Research (`/keyword-research`) and
  Category Hunting (`/categories`)'s "All Marketplaces" mode — still no
  row changes here, since the underlying Keyword/Category Research
  capability is still Etsy-only per the table above.
- SEO/listing-optimization rules (`getOptimizationRules`, not a row in
  this table — it's a rules lookup, not a connector capability) now derive
  from a connected `SellerChannel`'s real platform when a draft is tied to
  one, instead of only a manually-picked marketplace. Still no capability
  flag changed — Etsy is still the only marketplace with real
  title/tag/fee values; every other marketplace's rules are still `null`.

## Browser extension (separate axis, not a marketplace)

| Aspect | Status |
|---|---|
| Etsy page DOM access | **REMOVED** — `extension/etsy-content-script.js` and `extension/etsy/*` deleted outright; `manifest.json` requests no `*.etsy.com` host permission. Verify current state against `extension/manifest.json` if this document is old. |
| SellerSalt backend calls | **IMPLEMENTED** — Listing/Shop/Search panels call SellerSalt's own API with user-supplied input, isolated from marketplace core architecture. |
| Published to Chrome Web Store | **NO** |
| Required by core product | **NO** — SellerSalt works fully without the extension installed. |

## What "IMPLEMENTED"/"PARTIAL" does not mean here

Etsy's Listing Write is marked **PARTIAL**, not IMPLEMENTED, on purpose:
it creates a reviewable local draft and can push/update Etsy only after a
human approves it inside SellerSalt — there is no capability, and there
will not be one, for silent/automatic publish. This is a permanent design
constraint, not a current limitation to "complete" later — see `AGENTS.md`
§10/§17.

## Related documents

`docs/SELLERSALT-ARCHITECTURE.md` (canonical) ·
`docs/SELLERSALT-MARKETPLACE-ARCHITECTURE.md` (technical reference) ·
`AGENTS.md` (rules) · `docs/SELLERSALT-ROADMAP.md` (what changes this next)
