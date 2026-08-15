Status: Draft
Owner: [ASSUMPTION] Founder (Aliyan)
Last Updated: 2026-08-14
Decision State: Factual — mirrors prisma/schema.prisma as of 2026-08-14

# Data Architecture

This document summarizes `prisma/schema.prisma` by concern. It is a
map, not a replacement — always read the actual schema file for exact
field types/defaults before writing code against it (see root
`CLAUDE.md` rule #1: view real files before editing, this doc can drift).

## Identity & tenancy

- `Organization` — tenant root. `plan` (legacy `Plan` enum — [VERIFY]
  still read), `packageId` → `Package` (real limit/entitlement source).
- `User` — email + bcrypt `passwordHash`. No social login.
- `Membership` — join table, `role` (`OWNER`/`ADMIN`/`MEMBER`),
  `@@unique([userId, organizationId])`.

## Marketplace research

- `Connector` — platform-wide, `organizationId` **nullable** (null =
  platform-owned, shared; non-null = org brought its own key).
  `encryptedCredentials` at rest. `type: ConnectorType` (`ETSY` today).
- `SearchConfig` — user-defined prospecting parameters: `keywords[]`,
  price range, shop-age range, `minReviewCount`, optional
  `scheduleCron`.
- `Job` — one background run of a `SearchConfig`. `status`
  (`QUEUED`/`RUNNING`/`SUCCESS`/`FAILED`), `triggeredBy`
  (`USER`/`SCHEDULE`).
- `Prospect` — the actual research output, one row per
  shop×listing×keyword-run. Etsy-shaped fields throughout (see
  [architecture/marketplace.md](marketplace.md) for why this matters for
  multi-marketplace plans). `status`
  (`PENDING_REVIEW`/`SHORTLISTED`/`CONTACTED`/`REJECTED`),
  `isFavorite`. Repeated runs of the same search naturally form a time
  series per shop/listing without a separate snapshot table, per the
  schema comment.
- `ShopWatch` / `ShopSnapshot` — independent of `SearchConfig`; a user
  can track any shop found in Prospects. One repeatable BullMQ job per
  `ShopWatch` appends `ShopSnapshot` rows on schedule; the shop
  detail-page sales-trend graph is built entirely from this table.

## Plans & billing

See [architecture/billing.md](billing.md) for the full picture.
`Package`, `PaymentProvider`, `Subscription`, `Coupon`,
`PaymentWebhookEvent`.

## Config

- `AppSetting` — generic key-value admin config, `isSecret` flag
  triggers encryption at rest. New settings are additive (a new entry in
  `SETTING_DEFINITIONS`, `src/lib/app-settings.ts`), no migration
  required. See [architecture/integrations.md](integrations.md).
- `EmailSettings` — effectively a singleton: one SMTP config sends all
  transactional email. `isActive` flag. No template model — see the
  gap noted in [product/product-map.md](../product/product-map.md).

## Auth support

- `PasswordResetToken` — stores `tokenHash`, never the raw token (same
  principle as a password hash — a DB read alone can't reset an
  account).
- `Invite` — team invites, `tokenHash`, `status`
  (`PENDING`/`ACCEPTED`/`REVOKED`), `role` to grant on acceptance.

## Seller channels (customer's own stores)

- `SellerChannel` — `platform` (`SHOPIFY`/`WOOCOMMERCE`/`ETSY_SELLER`/
  `EBAY_SELLER` — last one is a reserved enum value with [VERIFY] no
  confirmed connector implementation), `storeUrl`,
  `encryptedCredentials`, `lastSyncedAt`/`lastSyncError`.
  `@@unique([organizationId, storeUrl])`.
- `SellerOrder` — `@@unique([sellerChannelId, externalOrderId])`,
  `currency` per row (never blended across stores — see
  [product/product-map.md](../product/product-map.md) Analytics note).

## Cross-listing (foundation only)

- `CrossListing` — groups one logical product across `SellerChannel`
  connections.
- `CrossListingEntry` — one row per (crossListing, sellerChannel) pair,
  `isSource` flag, `externalListingId` nullable until actually pushed.
  No sync/push code exists; see [architecture/marketplace.md](marketplace.md).

## What the schema does NOT yet represent

Cross-referenced from [product/personas.md](../product/personas.md) and
[architecture/organizations.md](organizations.md) — flagging here so a
future migration author sees it in the data-layer doc too:

- **Agency clients / client shops, Institute cohorts / students /
  student shops / student progress** — the *domain shape* is now
  **[LOCKED]** (Decision 1, 2026-08-14 — two distinct domain models
  sharing `User`/`Organization`/`Membership`/`Role`/`Permission`/`Seat`/
  `Shop`/`ShopConnection`/Activity-Audit primitives). Field-level table
  design is still [DECISION REQUIRED] — see
  [architecture/organizations.md](organizations.md) "Still open."
- **Marketplace normalization** (a normalized commerce representation
  distinct from `Prospect`'s Etsy-shaped fields) — the *pipeline/
  boundary* is now **[LOCKED]** (Decision 3, 2026-08-14). The concrete
  entity schema is **explicitly deferred** until a second marketplace is
  selected — this is a deliberate choice per the decision, not an open
  question awaiting product input right now. See
  [architecture/marketplace.md](marketplace.md).
- Audit log (any admin action history)
- Transactional email templates (versions, variables, activation,
  delivery logs)
- Reports (optimization proof / PDF-shareable) — now named as a locked
  Agency capability (Decision 1) and an AI-assistant example query, but
  no schema designed
- Any AI-assistant-related storage (conversation history, tool-call
  logs) — see [architecture/ai.md](ai.md)
- Billing interval (monthly/annual) on `Package`

All still [DECISION REQUIRED] at the field/table level before a
migration is written for any of them, even where the higher-level
direction is now locked — per this task's constraints, no schema
changes were made in this pass.
