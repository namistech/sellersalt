# SellerSalt Marketplace Architecture

> **This is the specialized technical reference for the `src/marketplaces/`
> layer specifically** — interfaces, the registry API, per-marketplace
> adapter status, and "how to add a marketplace." For the product-wide
> canonical architecture (how this layer fits under the intelligence layer
> and the rest of the product), start at
> **`docs/SELLERSALT-ARCHITECTURE.md`** instead. The two are not
> competing sources of truth: that document is the map, this one is the
> zoomed-in detail for one region of it. If something looks inconsistent
> between them, trust the code and file an update to whichever doc is
> stale.

## Architectural model

**SellerSalt is an intelligence platform first and a marketplace connector
platform second.** Marketplace APIs are data providers the intelligence
layer consumes — never the thing SellerSalt is organized around.

```
                       SELLERSALT
                           │
             ┌─────────────┴─────────────┐
             │                           │
       INTELLIGENCE                  OPERATIONS
     (works without OAuth)         (requires a connected
             │                      MarketplaceAccount)
     ┌───────┼────────┐             ┌───────┼────────┐
     │       │        │             │       │        │
  Product  Keyword  Market       Listings Orders  Analytics
 Research Research Research      (write)  (read)  (seller's
     │       │        │             │       │       own shop)
     └───────┴────┬───┘             └───────┴────┬───┘
                   │                              │
            NORMALIZED DATA (src/marketplaces/core/types.ts)
                   │
     ┌─────┬───────┼───────┬──────┬──────────┐
     │     │       │       │      │          │
   Etsy  Amazon  eBay   Shopify WooCommerce TikTok Shop
   LIVE  ARCH.   ARCH.  PARTIAL PARTIAL      ARCH. READY
         READY   READY
     │     │       │       │      │          │
     └─────┴───────┴───────┴──────┴──────────┘
              APIs / Public Data / Seller Data
```

See `/docs/MARKETPLACE-INTEGRATION-MATRIX.md` for the current status of
every box in the bottom row.

## Phase 2 — research routes migrated onto this core (2026-08-19)

Three of the app's Etsy-only research services now route through a
capability check before doing any marketplace-specific work, instead of
unconditionally instantiating a raw Etsy client:

| Service | New marketplace-aware entry point | Old entry point (unchanged, still used internally) |
|---|---|---|
| Product research | `searchMarketplaceProducts(marketplace, orgId, filters)` (`src/services/product-hunting.ts`) | `searchEtsyMarketplaceProducts` |
| Keyword research | `fetchMarketplaceKeywordResearch(marketplace, orgId, request)` (`src/services/keyword-research.ts`) | `fetchStandaloneKeywordResearch` (also called directly by the SaltBot tool registry and the extension suggestions route — left untouched) |
| Category research | `fetchMarketplaceCategoryTree(marketplace, orgId)` (`src/services/category-hunting.ts`) | `fetchCategoryTree` (also called directly by the categories page and tool registry — left untouched) |

Each new entry point calls `checkMarketplaceCapability()`
(`src/marketplaces/core/availability.ts`) first. For Etsy, it then calls the
pre-existing implementation completely unchanged — same raw Etsy client,
same caching, same scoring, same error behavior. For any other marketplace,
it returns a structured `CapabilityUnavailable` object:

```ts
{ available: false, marketplace: "amazon", capability: "research",
  reason: "CONNECTOR_NOT_IMPLEMENTED", message: "..." }
```

The three routes (`/api/products/search`, `/api/keywords/search`,
`/api/categories`) accept an optional `marketplace` query/body param
(default `"etsy"` — zero behavior change for every existing caller that
doesn't send one) and return that structured object as normal JSON (not a
5xx) when a marketplace can't serve the request, so the UI renders a
message instead of crashing.

### Why not migrate every research route in one pass

`fetchStandaloneKeywordResearch` and `fetchCategoryTree` are also called
directly (not through HTTP) by `src/services/assistant/tool-registry.ts`
(SaltBot) and two other UI entry points. Changing their signatures would
have meant updating those call sites too, for zero behavior change (they're
Etsy-only callers that aren't getting a marketplace picker in this pass) —
higher blast radius for no benefit. The new marketplace-aware functions
wrap them instead, so both the new and old call sites work unchanged.

### Marketplace selector is now registry-driven

`src/components/ui/MarketplaceSelector.tsx` — previously used decoratively
(`className="w-fit"` with no props) on several pages, and previously
imported a hardcoded `MARKETPLACE_DEFINITIONS` map. It now fetches
`GET /api/marketplaces` (reads `MarketplaceRegistry.list()` directly) and
renders each marketplace's live `research` capability instead of an
asserted `status` field.

**Wired functionally** (marketplace state → API call → capability-aware
empty/unavailable state) on four surfaces as of 2026-08-19:
Prospects/Product Research (the original flagship), Keyword Research
(`/keyword-research`), Category Hunting (`/categories`), and the SEO
Audit's Draft Playground tab (`/seo`, plus an optional connected-store
picker there that overrides the manual selector — see "SEO Audit
marketplace derivation" below). **Being wired here is a UI/routing fact,
not a capability claim** — Amazon/eBay/TikTok Shop appear in the selector
and can be picked on all four surfaces, but selecting them still returns
`NOT_IMPLEMENTED`/`CapabilityUnavailable`, never fabricated data. Selecting
a marketplace in the UI and that marketplace actually having a working API
integration are two different facts; only `docs/MARKETPLACE-INTEGRATION-
MATRIX.md`'s status table is authoritative for the latter.

### Multi-marketplace research

Two related but distinct fan-out mechanisms exist — both real, neither a
duplicate of the other (different response shapes for different consumers):

- `runMultiMarketResearch(marketplaces, request)` /
  `runAllMarketplaceProductResearch(marketplaces, request)`
  (`src/marketplaces/core/research-pipeline.ts`) — the original product-
  research fan-out, wired into Prospects via `POST /api/marketplaces/
  research`. Returns one independently-marked `ProductResearchResult`/
  `ResearchDataset` per marketplace.
- `fanOutMarketplaceRequest<T>(marketplaces, fn)` (same file) — a generic
  extraction of that fan-out's error-isolation/status-classification
  logic (`AVAILABLE | PARTIAL | UNAVAILABLE | NOT_IMPLEMENTED`, one
  connector throwing never removes another's result), reusable for any
  per-marketplace request shape via the `MarketplaceFanOutResult<T>`
  return type. Two consumers as of 2026-08-19:
  `fetchAllMarketplaceKeywordResearch` (`src/services/keyword-research.ts`,
  wired into `POST /api/keywords/search`'s `marketplace === "all"` branch)
  and `fetchAllMarketplaceCategoryTree` (`src/services/category-hunting.ts`,
  wired into `GET /api/categories`'s `marketplace === "all"` branch,
  stripping the non-serializable `flattenedMap` before returning). Both
  render via `src/components/intelligence/MarketplaceStatusCard.tsx` — a
  generic per-marketplace status shell (same AVAILABLE/PARTIAL/
  UNAVAILABLE/NOT_IMPLEMENTED treatment as the Prospects page's
  `AllMarketplacesResults`, but with a children slot instead of an
  assumed product-grid shape, since keyword/category payloads differ).

Reach for `fanOutMarketplaceRequest` before writing a new per-surface
fan-out — the error-isolation logic is meant to live in exactly one place.

### SEO Audit marketplace derivation

`POST /api/seo/audit` (Mode B — a supplied draft/payload, not a live Etsy
listing fetch) resolves which marketplace's `MarketplaceOptimizationRules`
to score against via `resolveMarketplaceForAudit` (`src/services/
seo-engine.ts`, org-scoped): a connected `SellerChannel` id, when supplied,
is authoritative (mapped via `marketplaceFromSellerChannelPlatform` in
`src/marketplaces/core/types.ts`) over a manually-picked marketplace — a
draft bound for a real store is scored against that store's real platform,
not a guess. Falls back to the manual pick (default Etsy) when no channel
id is given or it doesn't resolve under the caller's org. Mode A (fetching
and auditing a real live Etsy listing) stays pinned to Etsy's rules
regardless, since it only ever audits real Etsy data.

### Research works without a connected seller account

Confirmed architecturally (and by test —
`src/tests/marketplace-research-migration.test.ts`): none of
`product-hunting.ts`, `keyword-research.ts`, `category-hunting.ts` import
from `src/seller-channels/*`. They resolve credentials via
`getActiveConnectorWithCredentials`, which reads the platform-owned
`Connector` table (nullable `organizationId` — shared across every
customer), not a per-seller OAuth `SellerChannel` row. A brand-new user with
no connected marketplace account can already run product/keyword/category
research; disconnecting a seller's own Etsy shop only removes their
first-party analytics, never this shared research path.

SellerSalt is an ecommerce intelligence platform. Etsy, Shopify,
WooCommerce, Amazon, eBay, and TikTok Shop are **connectors** into one
research/optimization engine — not the foundation of the product. This
document describes the architecture that makes that true in code, added
2026-08-19. See `/docs/SELLERSALT-ARCHITECTURE-AUDIT.md` for what existed
before this change, and `/docs/MARKETPLACE-INTEGRATION-MATRIX.md` for the
per-marketplace status table.

## Directory structure

```
src/marketplaces/
  core/
    types.ts              canonical entities (Listing, Order, Product, ...)
    capabilities.ts        MarketplaceCapabilities flags
    interfaces.ts           the MarketplaceConnector interface
    errors.ts                capability/not-implemented error types
    optimization-rules.ts     per-marketplace listing constraints
    opportunity-engine.ts       scoring envelope (wraps universal-scoring.ts)
    research-pipeline.ts          Request -> Provider -> Dataset -> Insight
    normalizers/
      etsy.ts                       Etsy-shape -> canonical-shape mappers
    registry/
      index.ts                        MarketplaceRegistry + registerAllConnectors()
  etsy/connector.ts        IMPLEMENTED
  shopify/connector.ts     PARTIAL
  woocommerce/connector.ts PARTIAL
  amazon/connector.ts      ARCHITECTURE READY
  ebay/connector.ts        ARCHITECTURE READY
  tiktok-shop/connector.ts ARCHITECTURE READY
```

## Canonical data model

`src/marketplaces/core/types.ts` defines marketplace-neutral entities:
`MarketplaceAccount`, `MarketplaceShop`, `Product`, `Listing`, `Order`,
`Inventory`, `Category`, `Keyword`, `SearchResult`, `MarketSignal`,
`DemandSignal`, `PriceSignal`, `ListingPerformance`, `SellerAnalytics`.

Every one extends `MarketplaceRef`:

```ts
interface MarketplaceRef {
  marketplace: MarketplaceId;      // "etsy" | "shopify" | "woocommerce" | "amazon" | "ebay" | "tiktok_shop"
  externalId: string;              // the ID as that marketplace's own API returns it
  marketplaceAccountId?: string;   // the connected SellerChannel.id, when seller-authorized
}
```

**This does not replace the Prisma schema.** `SellerChannel`, `Connector`,
`ListingDraft`, `SellerOrder`, `Prospect`, etc. remain the database source of
truth. These types are the in-memory shape a connector normalizes *into* at
the service-call boundary — see `src/marketplaces/core/normalizers/etsy.ts`
for the pattern (maps `ProspectResult`/`ShopStats`/`SellerOrderResult` from
the pre-existing `src/connectors/etsy` and `src/seller-channels/etsy-seller`
modules into canonical `SearchResult`/`MarketplaceShop`/`Order`).

Why not a new canonical `Listing`/`Order` table replacing the existing
Etsy-flavored models? Because `ListingDraft.sellerChannelId` /
`SellerOrder.sellerChannelId` already carry marketplace identity via the
`SellerChannel.platform` enum, and a destructive schema rewrite was judged
higher-risk than the value it would add while only one marketplace (Etsy)
actually writes listings. Revisit once a second marketplace needs real
listing writes — see the audit doc's migration map.

## The MarketplaceConnector interface

```ts
interface MarketplaceConnector {
  marketplace: MarketplaceId;
  displayName: string;
  capabilities: MarketplaceCapabilities;

  authenticate?(...): Promise<MarketplaceAuthResult>;
  disconnect?(account): Promise<void>;
  getAccount?(marketplaceAccountId): Promise<MarketplaceAccount | null>;
  getShops?(marketplaceAccountId): Promise<MarketplaceShop[]>;
  getProducts?(marketplaceAccountId): Promise<Product[]>;
  getListings?(marketplaceAccountId): Promise<Listing[]>;
  getOrders?(marketplaceAccountId, since?): Promise<Order[]>;
  getInventory?(marketplaceAccountId): Promise<Inventory[]>;
  getAnalytics?(marketplaceAccountId, start, end): Promise<SellerAnalytics | null>;
  createListing?(marketplaceAccountId, listing): Promise<Listing>;
  updateListing?(marketplaceAccountId, externalId, patch): Promise<Listing>;
  searchPublicListings?(query): Promise<SearchResult[]>;
  getPublicShopStats?(shopExternalId): Promise<MarketplaceShop | null>;
  getCategories?(): Promise<Category[]>;
}
```

Every method is optional — a connector only implements what it actually
supports, and `capabilities` says so before any method is called. A method
being `undefined` and a capability flag being `false` must always agree;
tests in `src/tests/marketplace-architecture.test.ts` enforce this for every
registered connector.

### Capability gating

```ts
import { MarketplaceRegistry, assertCapability } from "@/marketplaces/core/registry";

const connector = MarketplaceRegistry.getConnector("amazon");
assertCapability(connector, "readOrders"); // throws MarketplaceCapabilityUnavailableError — capability is false
```

`assertCapability` is the one place this check happens — callers never
hand-roll an `if (connector.capabilities.x)` check that could drift from
what the method actually does.

## How Etsy works as a connector

`src/marketplaces/etsy/connector.ts` is the fullest example — it does not
call Etsy's API directly. It adapts three pre-existing, working pieces:

1. `src/connectors/etsy` (platform-owned public research)
2. `src/seller-channels/etsy-seller` (one customer's OAuth-connected shop)
3. `src/services/etsy-execution` (draft creation/update, human-approval-gated)

**`createListing` does not push to Etsy.** It creates a local `ListingDraft`
row only. Etsy requires a human-approved draft
(`ListingDraftStatus.APPROVED`) before `createEtsyDraftListing` will push
anything live — that gate is a hard product/compliance rule (no silent
publish), so the generic connector interface cannot skip it. The returned
`Listing` carries `metadata: { pendingHumanApproval: true }` so a caller
always knows it isn't live yet.

OAuth itself is **not** reachable through `connector.authenticate()` — Etsy's
PKCE flow is redirect-based and lives in
`src/app/api/seller-channels/etsy/{connect,callback}/route.ts`. Those fields
are left `undefined` on the Etsy connector rather than faked.

## How Amazon / eBay / TikTok Shop plug in (today: they don't, honestly)

Each has a connector file registered in the registry with **every capability
flag false** and **every method throwing `MarketplaceNotImplementedError`**
— no fake API calls, no fabricated data, no invented credentials. This lets
the rest of the app (registry, `/marketplaces` UI, capability checks) treat
"amazon" as a known-but-inactive marketplace instead of an unhandled case.

Activating one later means, in `src/marketplaces/<id>/connector.ts`:

1. Register a real developer app with that marketplace and obtain OAuth
   credentials (store via `AppSetting`, same pattern as every other
   integration — never hardcoded).
2. Implement the methods against that marketplace's real API.
3. Flip the relevant flags in `capabilities` to `true` — only for methods
   that are actually implemented.
4. Add real values to `src/marketplaces/core/optimization-rules.ts` if it
   supports listing writes.

Nothing else in the app needs to change — the registry, the research
pipeline, and the opportunity engine are already marketplace-neutral.

## Shopify / WooCommerce today

Both have real OAuth + order sync (pre-existing, via
`src/seller-channels/{shopify,woocommerce}`), wrapped as `PARTIAL`
connectors: `accountAuth`, `readShops`, `readOrders` are `true`; everything
else is `false` because no generic listing/product read path exists for
them yet (the app doesn't currently expose Shopify/WooCommerce listing
management to admins beyond the informational settings page).

## Intelligence layer

`src/marketplaces/core/opportunity-engine.ts` wraps the pre-existing
`src/services/intelligence/universal-scoring.ts` (kept in place, not
reimplemented) in a `OpportunityScore` envelope:

```ts
interface OpportunityScore {
  score: number | null;
  factors: OpportunityFactor[];   // each has `available: boolean` — never fabricated when false
  confidence: number;             // drops automatically as factors go unavailable
  dataSources: MarketplaceId[];
  calculatedAt: Date;
}
```

A factor with no real data behind it (e.g. no category median price
supplied) is marked `available: false, score: null` and excluded from the
weighted total — never defaulted to a plausible-looking number.

`universal-scoring.ts`'s margin factor now accepts an optional `feeSchedule`
(defaults to Etsy's real 9.5%+$0.20 combined rate — unchanged behavior for
every existing caller). Passing `feeSchedule: null` drops the margin factor
entirely and redistributes its weight across the remaining three factors,
rather than scoring a margin against the wrong marketplace's fees.

## Listing optimization

`src/marketplaces/core/optimization-rules.ts` holds
`MarketplaceOptimizationRules` per marketplace (title length, tag count/max
length, description length, fee schedule, taxonomy support). Etsy has real
values (140/13/20, matching the platform exactly); every other marketplace
has `null`/`false` fields rather than a guess.

`src/services/listing-generation.ts`'s `sanitizeTitle`/`sanitizeTags` now
accept an optional third `rules` argument (default: Etsy's rules — zero
behavior change for existing callers) instead of hardcoding 140/13/20 as
literals. `sanitizeTags` returns `[]` for a marketplace with
`supportsTags: false` rather than padding with filler tags that don't apply.

## Research pipeline

`src/marketplaces/core/research-pipeline.ts` implements:

```
ResearchRequest -> connector.searchPublicListings() -> normalize -> ResearchDataset -> (optional) opportunity scoring
```

`runMarketResearch({ marketplace: "etsy", keywords: [...] })` is the new,
marketplace-neutral entry point. It does not replace
`src/services/product-hunting.ts` / `src/services/keyword-research.ts` —
those keep serving their existing Etsy-only callers unchanged. New UI
surfaces (or a future second research-capable marketplace) should call this
instead of reaching for a connector directly, so the intelligence layer
downstream never has to know which marketplace the data came from. A request
against a marketplace whose connector doesn't support research returns
`{ unavailable: true }` rather than an empty-results state that would read
as "zero matches."

## AI layer

Already provider-neutral before this work
(`AiProvider`/`AiModel`/`llm-provider.ts`) — no changes needed. Listing
generation (`src/services/listing-generation.ts`) now consumes
marketplace-specific title/tag rules (above) instead of Etsy literals, so
its *constraints* are marketplace-aware even though its *prompt wording*
still targets Etsy specifically (the only marketplace with a live write
path today).

## Data ownership boundaries

Three categories, referenced from `src/lib/data-retention.ts` and this
document (no new enforcement code added this session beyond what already
existed — see the audit doc):

- **First-party seller data**: `SellerChannel`, `SellerOrder`,
  `ListingDraft` (once decoupled from a channel on disconnect) — the
  seller's own authorized data, kept until they delete their account or
  disconnect the channel.
- **Public market research data**: `Prospect`, `ShopSnapshot`,
  `ListingSnapshot` — read via a marketplace's public API, retained only as
  long as the widest active `Package.maxTrackingDays` requires (see
  `src/lib/data-retention.ts`, added in the prior 2026-08-19 compliance
  pass), pruned automatically on every new snapshot write.
- **Derived SellerSalt intelligence**: opportunity scores, SEO audits —
  computed on demand from the above, not separately retained beyond the
  audit/draft records that already store them for the user's own reference.

## How to add a new marketplace (checklist)

1. Add the ID to `MarketplaceId` in `src/marketplaces/core/types.ts`.
2. Create `src/marketplaces/<id>/connector.ts` implementing
   `MarketplaceConnector` — start with `NO_CAPABILITIES` and a
   `MarketplaceNotImplementedError` stub if credentials aren't available
   yet (see `amazon/connector.ts` for the template).
3. Register it in `src/marketplaces/core/registry/index.ts`'s
   `registerAllConnectors()`.
4. Add a row to `src/marketplaces/core/optimization-rules.ts` once it
   supports listing writes.
5. Add a row to `/docs/MARKETPLACE-INTEGRATION-MATRIX.md`.
