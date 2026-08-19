# SellerSalt Architecture Audit — Marketplace-Agnostic Repositioning

> **HISTORICAL RECORD, dated 2026-08-19.** This is a point-in-time
> forensic audit taken immediately *before* the marketplace abstraction
> work began — it deliberately captures what the codebase looked like at
> that moment so later readers can tell "pre-existing" from "newly built"
> apart. It is not the current architecture reference. For that, read
> `docs/SELLERSALT-ARCHITECTURE.md` (canonical) and
> `docs/MARKETPLACE-INTEGRATION-MATRIX.md` (current per-marketplace
> status). Facts below about *what existed at the time* remain accurate
> and useful context; anything phrased as "not yet built" or "next step"
> should be checked against the roadmap/matrix, since some of it has since
> shipped.

Forensic inspection performed before the marketplace abstraction work in
this same change (see `docs/SELLERSALT-MARKETPLACE-ARCHITECTURE.md` for
what was built as a result). This document records what already existed,
so later readers can tell "pre-existing" from "new" apart.

## 1. Current application architecture

Next.js 15 App Router, multi-tenant (`organizationId` on every row that
matters), Prisma 5.22.0 / Postgres, BullMQ + Redis for background jobs,
NextAuth (JWT sessions), Tailwind. Two parallel connector patterns already
existed before this work, discovered during inspection:

- **`src/connectors/`** — platform-owned, shared public market-research
  connectors (`Connector` Prisma model, `ConnectorType` enum). Only `ETSY`
  had a real implementation (`src/connectors/etsy/`).
- **`src/seller-channels/`** — one customer's own OAuth-authenticated store
  (`SellerChannel` Prisma model, `SellerChannelPlatform` enum). Three real
  implementations: `etsy-seller`, `shopify`, `woocommerce`.

Both already had a working registry pattern (`src/connectors/registry.ts`,
`src/seller-channels/registry.ts`) — "add a module, register it, nothing
else changes." This audit's job was to unify these two, not invent a
registry pattern from scratch.

## 2. Prisma schema (pre-existing, before this session's migration)

1,127 lines, 36 models, 19 enums. Notable pre-existing facts:

- `SellerChannelPlatform` already included `EBAY_SELLER` with **zero**
  connector ever registered for it — a real architecture gap, closed at the
  new `src/marketplaces/` layer (see integration matrix), not at the older
  `src/seller-channels/registry.ts` layer (out of scope — nothing in the app
  can currently set that enum value via any route, so it was theoretical).
- `ConnectorType` only had `ETSY` — expanded additively this session (see
  §8, "database changes").
- `ListingDraft`, `SellerOrder`, `Prospect` already carry
  marketplace-adjacent identity (`sellerChannelId` → platform, Connector
  relation → type) even though they predate a formal canonical-entity
  concept. This is why Phase 2 of this work did **not** introduce a
  wholesale replacement schema — the existing shape already satisfies
  "marketplace + externalId + account" in spirit, just not as one unified
  interface.

### Pre-existing schema drift (found, not caused by this session)

Running `prisma migrate dev --create-only` for the intended enum-only change
also surfaced unrelated pending drift already present in `schema.prisma`
relative to the live staging database: `Announcement.updatedAt` missing a
`DROP DEFAULT`, `Coupon.type`/`Coupon.value` missing `SET DEFAULT`, and a
missing `AnnouncementRead_announcementId_fkey` foreign key. **This is
pre-existing and unrelated to marketplace work** — it was deliberately
excluded from this session's migration (see
`prisma/migrations/20260819043536_marketplace_connector_enum_expansion/migration.sql`'s
header comment) rather than silently bundled in. Recommend a dedicated,
reviewed migration for it separately.

## 3–4. Existing intelligence / listing-optimization functionality

`src/services/intelligence/` already had a marketplace-agnostic scoring core
(`universal-scoring.ts` — `evaluateProductOpportunity`,
`evaluateShopCompetition`, deterministic 0-100 scores with explainable
factor breakdowns) — this was a major, pleasant discovery: Phase 5's
"centralized opportunity scoring architecture" requirement was already ~80%
built. The only real coupling to Etsy was a hardcoded fee schedule inline in
the margin factor — parameterized this session (see §7).

`src/services/seo-engine.ts` and `src/services/listing-generation.ts`
(`sanitizeTitle`/`sanitizeTags`) had Etsy's 140-char/13-tag/20-char rules as
literal constants. Parameterized this session via
`src/marketplaces/core/optimization-rules.ts`, defaulting to Etsy's exact
values so no existing caller's behavior changed.

## 5. Existing AI functionality

Already provider-neutral: `AiProvider`/`AiModel` Prisma models,
`src/services/assistant/llm-provider.ts` iterates active providers by
priority with zero hardcoded model strings. `src/services/
listing-generation.ts`'s `generateOriginalListingDraft` already never
interpolates competitor raw text into its LLM prompt (verified by direct
code read and by an existing test in
`src/tests/etsy-commercial-compliance-remediation.test.ts`). No changes
needed for Phase 7 beyond the title/tag parameterization already covered by
Phase 6.

## 6–7. Existing Etsy integration / marketplace integrations or stubs

Etsy: OAuth PKCE (`src/lib/auth.ts`, `src/app/api/seller-channels/etsy/`),
encrypted token storage, real read (search/shop-stats/taxonomy via
`src/connectors/etsy/`) and real gated write (draft creation/update/publish
via `src/services/etsy-execution/`, human-approval-gated). Scopes already
correctly minimal (`listings_w listings_r shops_r transactions_r` — `shops_w`
and a non-existent `billing_r` scope had already been removed in a prior
remediation pass this same day).

`src/services/marketplaces/types.ts` already had a `MARKETPLACE_DEFINITIONS`
capability matrix for etsy/amazon/ebay/tiktok_shop/walmart — a
product-marketing/display layer (consumed by
`src/components/ui/MarketplaceSelector.tsx`), left untouched by this work
since it serves a different purpose than the new technical
`MarketplaceCapabilities` gate (see architecture doc) and several existing
tests depend on its exact shape.

## 8–17. Everything else inspected

- **API routes**: `src/app/api/` is already organized by domain
  (`seller-channels/`, `connectors/`, `tracking/`, etc.) — no changes
  required to existing routes for this work; the new `/marketplaces` page is
  additive.
- **Background workers**: `src/workers/index.ts` — untouched.
- **Redis/cache**: BullMQ only; no marketplace coupling found.
- **Auth**: NextAuth JWT, already provider-neutral at the session layer.
- **Extension**: Etsy DOM read/write was already fully removed in an earlier
  pass this same day (`extension/etsy-content-script.js` and
  `extension/etsy/*` deleted, manifest no longer requests `*.etsy.com`).
  Confirmed still isolated — see integration matrix.
- **Multi-tenancy**: `organizationId` scoping verified intact on every new
  connector method that touches the database (Etsy/Shopify/WooCommerce
  adapters all resolve through `SellerChannel` rows scoped by the caller's
  own `marketplaceAccountId`, never a bare marketplace-wide query).
- **Duplicated functionality found**: none introduced; the two pre-existing
  registries (`connectors/`, `seller-channels/`) are intentionally still
  used underneath the new unified layer as adapters, not duplicated logic.
- **Architectural risks**: the new `src/marketplaces/` layer is additive and
  currently only exercised by the new `/marketplaces` page and its own test
  suite — existing routes (`/api/products/search`, `/api/seller-channels/*`,
  etc.) still call the old registries directly. Migrating those call sites
  to go through the new unified registry is real, valuable follow-up work,
  explicitly **not** done in this pass to avoid the blast radius of
  rewriting working, tested routes in the same change that introduced the
  abstraction. See "next prompt" recommendation in the final report.

## Migration map (what changed vs. what's next)

| Layer | Before | After this session | Still to do |
|---|---|---|---|
| Types | Etsy-shaped types scattered (`ProspectResult`, `ShopStats`, etc.) | Canonical types added (`src/marketplaces/core/types.ts`) alongside the old ones | Migrate remaining call sites off the old types incrementally |
| Connectors | Two separate registries, Etsy-only real | One unified registry wrapping both, 6 marketplaces registered (1 full, 2 partial, 3 architecture-ready) | Amazon/eBay/TikTok Shop need real API credentials + implementations |
| Scoring | `universal-scoring.ts`, Etsy fee hardcoded | Fee schedule parameterized, `OpportunityScore` envelope added | Wire more callers through `opportunity-engine.ts`'s envelope |
| Listing rules | Etsy 140/13/20 hardcoded in generator | `MarketplaceOptimizationRules`, Etsy default preserved | Populate real rules once a second marketplace supports listing writes |
| Nav | "Discover"/"Operate" flat groups | Research/Intelligence/Optimize/My Business/Marketplaces, zero href changes | None required — this is complete |
| DB | `ConnectorType`/`SellerChannelPlatform` Etsy/Shopify/WooCommerce-only | Additive enum values for Amazon/eBay/TikTok Shop | A canonical `Listing`/`Order` table set, if/when a second research connector actually ships and the current per-model shape stops being sufficient |
