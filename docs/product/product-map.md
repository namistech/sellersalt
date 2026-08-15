Status: Draft
Owner: [ASSUMPTION] Founder (Aliyan)
Last Updated: 2026-08-14
Decision State: Current-state sections are factual (verified against code); future sections are directional except where marked [LOCKED] (Decisions 1–3, 2026-08-14 — see MASTER_BLUEPRINT.md)

# Product Map

This is the map of what actually exists, grouped by area, cross-referenced
to real routes/files, followed by what the brief says should exist later.
Current-state facts below were verified against `prisma/schema.prisma`,
`src/app/(dashboard)/sidebar.tsx`, and the `src/app` route tree on
2026-08-14. If code has moved since, treat the file paths as [VERIFY].

## Current state — customer-facing (Etsy research)

| Feature | Where it lives | Notes |
|---|---|---|
| Search / filters | `src/app/(dashboard)/prospects`, `src/app/api/search-configs` | `SearchConfig` model: keywords, price range, shop age range, min review count |
| Real lifetime sales data | `Prospect.totalSales` (Etsy `transaction_sold_count`) | Not a proxy metric — see `prisma/schema.prisma` comment on `Prospect` |
| Shop/product research | `src/app/(dashboard)/prospects`, `src/app/api/prospects` | |
| Shop detail pages ("Spy on Competitor") | `src/app/(dashboard)/shops/[shopExternalId]`, `src/app/api/shops/[shopExternalId]`, `src/app/api/shops/resolve` | Live-fetched, works cold (no prior search needed) via `getShopByName` |
| Competition scoring (Difficulty vs Demand) | `src/lib/competition-scoring.ts` | Two deliberately separate axes, inverted color semantics — see [architecture/marketplace.md](../architecture/marketplace.md) |
| Trends | `src/app/(dashboard)/trends`, `src/app/api/trends` | Derived from `Prospect` query patterns, not a dedicated table |
| Dropped shops | `src/app/(dashboard)/inactive`, `src/app/api/inactive` | Derived, not a dedicated table |
| Shop tracking / sales trend graph | `src/app/(dashboard)/spy/tracked`, `src/app/api/shops/[shopExternalId]/track`, `src/app/api/shops/tracked` | `ShopWatch` + `ShopSnapshot`, BullMQ repeatable job per watch |
| Favorites | `src/app/(dashboard)/favorites` | `Prospect.isFavorite` |
| Long-tail keyword extraction | [VERIFY] — not confirmed in this pass; referenced in root `CLAUDE.md` as built | |
| Sales tracking | Same as shop tracking above | |
| CSV export | [VERIFY] — referenced in root `CLAUDE.md`, not directly inspected this pass | |
| Dark mode | `tailwind.config.ts` (`darkMode: "class"`), `src/app/globals.css` CSS vars | Implemented today; **[LOCKED — Decision 2, 2026-08-14]**: the current blue accent (`#2563EB`) and dark-mode implementation are legacy — not part of the approved target design direction. Dark mode is not part of the current target product unless explicitly reintroduced later. See [design/design-system.md](../design/design-system.md). |

## Current state — platform/SaaS foundation

| Feature | Where it lives | Notes |
|---|---|---|
| Multi-tenant org model | `Organization`, `Membership` in `prisma/schema.prisma` | Flat: every org has the same shape today |
| Platform-owned Etsy connector | `Connector` (nullable `organizationId`) | Shared 5 req/s, 5,000 req/day budget — see Known scaling constraint in root `CLAUDE.md` |
| DB-editable packages + limit enforcement | `src/lib/plan-limits.ts`, `Package` model | `checkLimit()` gates connectors, search configs, scheduled searches, tracked shops, monthly prospects, seller channels |
| Admin console | `src/app/(dashboard)/admin`, `src/app/api/admin/*` | Packages, organizations, coupons, payment providers, platform connectors, email settings |
| Team invites | `src/app/(dashboard)/settings/team`, `src/app/api/team/*`, `Invite` model | |
| Password reset | `src/app/(auth)/forgot-password`, `reset-password`, `PasswordResetToken` model | Stores a token hash, not the raw token |
| Scheduled-search email notifications | `SearchConfig.scheduleCron`, `src/lib/send-email.ts`, `EmailSettings` model | |
| Public marketing homepage | `src/app/marketing-homepage.tsx`, `src/app/marketing.css` | Scoped under `.sellersalt-marketing`; live pricing pulled from `Package` |
| Checkout-gated signup | `src/app/checkout/page.tsx`, `src/app/checkout/checkout-client.tsx` | As of the 2026-08-13/14 commits, account creation happens **on** checkout, not before it; the old standalone `/signup` route now redirects into checkout. See [billing/billing-lifecycle.md](../billing/billing-lifecycle.md). |

## Current state — seller channels (admin-only today)

Gated via `requireAdminOrg()` (`src/lib/require-admin-org.ts`) — rejected
server-side, hidden from nav for non-admins. See
[architecture/rbac.md](../architecture/rbac.md).

| Channel | Where it lives | Notes |
|---|---|---|
| WooCommerce | `src/seller-channels/woocommerce`, `src/app/api/seller-channels/woocommerce/*` | App-authorization OAuth (`/wc-auth/v1/authorize`) + manual-key fallback |
| Shopify | `src/seller-channels/shopify`, `src/app/api/seller-channels/shopify/*` | GraphQL Admin API, write scope included |
| Etsy-seller | `src/seller-channels/etsy-seller`, `src/app/api/seller-channels/etsy/*` | PKCE OAuth, hourly token refresh |
| Analytics dashboard | `src/app/(dashboard)/analytics` | Currency-aware, per-store — never blended into one total |
| Cross-listing (data model only) | `CrossListing`, `CrossListingEntry` in schema | No push/sync logic. See [architecture/marketplace.md](../architecture/marketplace.md) |

## Current state — billing

See [architecture/billing.md](../architecture/billing.md) and
[billing/billing-lifecycle.md](../billing/billing-lifecycle.md) for detail.
Stripe (dynamic Checkout Sessions) and PayPal (lazy Product+Plan creation)
are both real, with signature-verified webhooks. Coupons and admin-
grantable subscriptions (`PaymentProviderType.MANUAL`) exist. Safepay/
PayFast are credential-storage only.

## Explicitly not built yet (per root `CLAUDE.md`, spot-checked this pass)

- Cross-listing push/sync logic
- Webhook *registration* in Stripe/PayPal dashboards (endpoints exist and
  verify correctly, but must be registered before a real purchase updates
  a plan)
- Safepay/PayFast checkout logic
- Chrome extension, AI assistant, eBay connector, category leaderboards,
  audit log, mobile-responsive pass, automated backups
- Real Privacy Policy/Terms pages (still `mailto:` placeholders)
- Login/register security hardening (disposable-email blocking, device
  fingerprinting, social login)
- Standalone Shopify App Store listing ("SaltSync")

## Future direction — not yet built, scope per this task's brief

These are aspirational; none exist in the schema or code today. Each has
a corresponding architecture doc:

- **Agency and Institute account types** (employees/clients/client shops;
  staff/cohorts/students/student shops) — domain shape **[LOCKED]**
  (Decision 1, 2026-08-14); field-level schema and implementation not
  started. See [architecture/organizations.md](../architecture/organizations.md).
- **Optimization proof reports / PDF-shareable reports** — no reporting
  or PDF-generation code exists today. [DECISION REQUIRED]
- **Listing/shop optimization intelligence, SEO intelligence, product
  intelligence, recommendations, alerts (beyond scheduled-search email)**
  — beyond today's competition scoring + trends. See
  [architecture/marketplace.md](../architecture/marketplace.md).
- **AI assistant** — see [ai/assistant.md](../ai/assistant.md).
- **Platform administration expansion** (super admin / sub-admins /
  role-specific teams) — today's admin model is a single env-var
  allowlist (`ADMIN_EMAILS`), not a role system. See
  [architecture/rbac.md](../architecture/rbac.md).
- **Programmatic SEO / AEO / GEO content** — see [seo/](../seo/).
- **Transactional email template system** (editor, variables, preview,
  test send, versions, delivery logs) — today `EmailSettings` is SMTP
  connection config only; there is no template-management UI or model.
  [DECISION REQUIRED]
