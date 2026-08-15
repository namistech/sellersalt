# CLAUDE.md — SellerSalt Project Context

Read this file fully before doing anything else. It replaces needing to
re-explain months of context to a new chat.

## What this is

SellerSalt (formerly "Anadash" during early development) is a SaaS product-
hunting and e-commerce intelligence tool. Core product: Etsy shop/product
research with real sales data. Secondary, currently admin-only pillar:
connecting a customer's own WooCommerce/Shopify/Etsy stores for unified
analytics and (eventually) cross-listing between them.

**Brand history**: built and deployed as "Anadash" on `anadash.netdrix.com`
for months, then rebranded to "SellerSalt" and migrated to `sellersalt.com`.
The GitHub repo name, Coolify resource names (`sellersalt:main-web` etc. —
note these WERE renamed at the Coolify level), and internal identifiers may
still reference "anadash" in places that don't affect users — this is
intentional in some cases (see Rebrand section below), not something to
"finish" by renaming everything.

## Repo & deployment — exact infrastructure

**GitHub**: `namistech/anadash` (private repo — name was NOT changed despite
the rebrand; this is fine, it's not user-facing)
**Coolify project**: "SellerSalt" — uuid `y27hmxosgec8mb0621aptvxm`
**Server**: Contabo VPS, IP `94.72.98.206`, Coolify server uuid
`dq8zbulzymy96wr65g2nkufc`, Docker destination uuid
`v8bukn9mjg4702fxpf0bxtnz`
**GitHub App** (for private repo access in Coolify): uuid
`j46zelps5g40b9znavzvvrr5` ("git-coolify-connection")

### Production — environment uuid `rau5i94esqco3mz1mhoj8756`
- `sellersalt:main-web` — uuid `utugtjibvld7ungoe82urtrf`, domain
  `sellersalt.com`, branch `main`
- `sellersalt:main-worker` — uuid `eivh59azq24dtkf7tikkb59a`, branch `main`
- Postgres — `postgresql-database-n1m8015q4gdcrinysq3lg26i`, internal host
  `n1m8015q4gdcrinysq3lg26i:5432`, public port `5433` (only enable
  temporarily for migrations, **always disable immediately after** — this
  was left open by mistake once already, be careful)
- Redis — `redis-database-xy63geb2r22lycnftbyrg8yu`

### Staging — environment uuid `kj1fyw45j5zpzcdnrpvcezgn`
- `sellersalt-staging-web` — uuid `xhhsknwnsmi5ypyzh6u0mwrt`, domain
  `staging.sellersalt.com` (**HTTP Basic Auth enabled** — it's a public
  DNS name, discoverable via Certificate Transparency logs, so this is the
  only thing preventing it being open to anyone), branch `staging`
- `sellersalt-staging-worker` — uuid `hqdhue9tv0l9pa999kclwtlc`
- Postgres — `sellersalt-staging-postgres`, uuid
  `bcis39ldxm8rcwr52b56o778` — **fresh/empty by design**, never a copy of
  production (real customer data protection + payment sandbox testing
  shouldn't touch real records + avoids burning production's shared Etsy
  API rate limit)
- Redis — `sellersalt-staging-redis`, uuid `yhwwzaum3trs9d30gm36ssrf`

**Branch discipline**: `staging` branch → staging environment, `main` →
production. **A real incident already happened from getting this wrong once**
(see Lessons Learned) — always confirm explicitly which branch a patch
should land on, especially when a database migration is involved, since a
code/schema mismatch between branches is a genuine production risk.

## Accounts (intentional, not a bug)

Two separate user accounts exist:
- `aliyan@sellersalt.com` — primary admin login now, matches
  `ADMIN_EMAILS`. Org: "Seller Salt Administration" — nearly empty (1
  connector, 3 searches).
- `aliyan@netdrix.com` — the original account with ALL the real
  accumulated data (platform connectors, seller channels, months of work).
  Org: "Anadash". Deliberately kept as-is, repurposed as a demo/tutorial
  account.

## Domain, DNS, Email

- `sellersalt.com` — Cloudflare DNS, single A record → `94.72.98.206`,
  **DNS-only (grey cloud)**, not proxied (avoids Cloudflare Bot Fight Mode
  interfering with OAuth callbacks/webhooks)
- Email via Titan Mail — MX/SPF/DKIM/DMARC all correctly configured, DMARC
  reports route through Cloudflare's built-in DMARC Management
- Mailboxes: `aliyan@`, `billing@`, `support@`, `hello@`, `hr@`,
  `notifications@` (transactional email, not yet actually wired to a
  specific alert feature), `tech@` (for third-party service signups —
  Firebase, GitHub, hosting, never personal email)

## Stack

Next.js 15.5.22 (App Router), TypeScript, Prisma 5.22.0 (**always pin** —
`npx prisma` unpinned resolves to latest, breaks against this schema),
NextAuth (JWT), BullMQ + Redis, Tailwind (CSS-variable dark mode), Recharts
v3, lucide-react, nodemailer v7 (pinned), Stripe SDK (`stripe` npm
package), PayPal via direct REST calls (no SDK — see Billing section for
why).

## Non-negotiable workflow rules

1. **View the real file before editing** — my own sandbox can drift from
   the actual repo, especially for files changed via Claude Code directly
   rather than through me. This already caused one real regression
   (`package.json`'s name field reverted during a later patch). For files
   I haven't personally touched recently, ask for current content first.
2. **`npx tsc --noEmit` before every commit.** `npx next build` for
   nontrivial changes.
3. **Schema changes**: `npx prisma generate` first, or tsc gives false
   errors. Real migrations need the temporary-public-port dance against
   the correct environment's database — **state explicitly which branch
   the resulting commit must go to**, matching whichever database was
   migrated.
4. **Post-deployment command** (`npx prisma@5.22.0 migrate deploy`) runs
   automatically on every push via Coolify — already configured on both
   web apps.
5. **JSX gotcha**: opening `<a` tags occasionally get stripped on
   paste/patch — check for orphaned `href=` props with no `<a` above them
   if a build throws a JSX parse error.
6. **Config/credentials belong in `/admin` → Site settings
   (`AppSetting` table via `src/lib/app-settings.ts`), never hardcoded.**
7. **Coolify tool limitations, confirmed real, not worth re-testing**:
   - `coolify:database` only supports `create`/`delete` — no `update`.
     Toggling `is_public` off after a migration must be done manually in
     Coolify's UI every time.
   - `coolify:application` doesn't expose `post_deployment_command` or
     HTTP Basic Auth fields — both must be set manually in the UI when
     creating a new app.
   - `coolify:application create_dockerfile` doesn't work for git-source
     apps — use `create_github` with `build_pack: "dockerfile"` instead.
8. **Next.js standalone builds need `HOSTNAME=0.0.0.0`** as an explicit
   runtime env var, or the server binds to the container's internal
   hostname instead of all interfaces and becomes unreachable despite
   deploying "successfully." Already set on production and staging web
   apps — remember this if a third environment is ever created.

## Data architecture — the distinctions that matter

- **`Connector`** — platform-wide Etsy research data, shared across all
  customers (`organizationId` nullable). Read-only market research.
- **`SellerChannel`/`SellerOrder`** — a specific customer's own
  authenticated store (WooCommerce, Shopify, or Etsy-seller). Completely
  separate system from `Connector` even though both may reference "Etsy."
  **Currently gated admin-only** — see MVP Scope below.
- **`CrossListing`/`CrossListingEntry`** — foundation only, groups one
  logical product across multiple `SellerChannel` connections. No push/
  sync logic built yet.
- **`Package`** — DB-editable plan tiers, enforced via `checkLimit()` in
  `src/lib/plan-limits.ts`.
- **`AppSetting`** — generic admin-editable key-value config (affiliate
  links, order-form URLs, platform app credentials). Add new values to
  `SETTING_DEFINITIONS` in `src/lib/app-settings.ts`, no migration needed
  unless you outgrow the generic shape.
- **`PaymentProvider`** — Stripe/PayPal/Safepay/PayFast credentials,
  **separate live and sandbox credential sets** stored simultaneously with
  a `mode` toggle, so switching modes for testing never requires
  re-entering keys.
- **`Subscription`** — one row per org, driven entirely by webhooks (not
  the initial checkout response — renewals/failures/cancellations are all
  async).
- **`PaymentWebhookEvent`** — idempotency log; both Stripe and PayPal
  retry-deliver events, this prevents double-processing.

## MVP scope decision — Shopify/WooCommerce/cross-listing are admin-only; Etsy-seller connect is now customer-facing

Founder decision (updated 2026-08-15): customer-facing product stays
Etsy-focused. **Etsy-seller store connection (`SellerChannel` platform
`ETSY_SELLER`) is now customer-facing** — any authenticated user can
connect their own Etsy shop from `/settings/channels`, not just admins.
Shopify, WooCommerce, and Cross-listing remain **admin-only**, gated
per-route via individual `isAdminEmail()` checks in each connect route
file (`shopify/connect/route.ts`, `woocommerce/connect/route.ts`) — not
via the `requireAdminOrg()` helper in `src/lib/require-admin-org.ts`,
which exists but is dead code (defined, never actually called anywhere;
a prior version of this file incorrectly claimed it was wired up — it
wasn't). The `/settings/channels` page itself used to hard-redirect all
non-admins to `/dashboard`; that page-level gate is now removed. The
Shopify/WooCommerce section on that page is informational-only text, not
a working connect flow, so no route-level exposure risk from opening the
page.

## What's built (comprehensive — don't rebuild these)

**Etsy research** (customer-facing): search with filters, real lifetime
sales data, shop detail pages (live-fetched, work cold via Spy on
Competitor), two-axis competition scoring (Difficulty vs. Demand —
deliberately separate, inverted color meaning, see
`src/lib/competition-scoring.ts`), Trends, Dropped-shops, long-tail
keyword extraction, sales tracking, CSV export, dark mode.

**Platform/SaaS foundation**: multi-tenant with platform-owned Etsy
connector, DB-editable packages with real limit enforcement, admin console,
team invites, password reset, scheduled-search email notifications, public
marketing homepage (own scoped design system, `.sellersalt-marketing`
prefix, live pricing from `Package` table).

**Seller channels**:
- WooCommerce (admin-only) — real app-authorization OAuth flow
  (`/wc-auth/v1/authorize`, no manual key copying) plus a manual-key
  fallback for stores where the OAuth redirect gets blocked by security
  plugins/Cloudflare
- Shopify (admin-only) — real OAuth via GraphQL Admin API (REST is legacy
  for new apps as of 2025, built correctly for that from day one), write
  scope included for future cross-listing
- Etsy-seller (**customer-facing as of 2026-08-15**, see MVP Scope
  section) — real PKCE OAuth with automatic hourly token refresh (Etsy
  tokens expire in ~1 hour, unlike the others). redirect_uri is built
  from `NEXTAUTH_URL` only (`appUrl()` pattern), never request headers —
  see Lessons Learned #5 if OAuth errors resurface. One Etsy developer
  app backs both this flow and the separate "Sign in with Etsy" NextAuth
  identity provider; both auto-link/upsert into the same `SellerChannel`
  row via a shared `resolveEtsyShopId()` helper so they can't diverge.
- Currency-aware Analytics dashboard — revenue shown per-store in its own
  currency, deliberately never blended into one misleading total
- All three request write scope now (upgraded from read-only) so
  cross-listing won't need customers to reconnect later

**Identity/account security** (as of 2026-08-15, all real — see CLAUDE.md
git history / commit messages for the specific incidents each one fixed):
- **Object storage**: real S3/R2 client (`@aws-sdk/client-s3`) behind
  `src/lib/storage/factory.ts`, credentials via Admin → Site Settings
  (`s3_bucket`/`s3_region`/`s3_access_key_id`/`s3_secret_access_key`/
  `s3_endpoint`/`s3_public_base_url`) with env-var fallback. **Not yet
  configured** — no bucket credentials exist yet, so avatar uploads still
  fall back to local container disk, which does not survive a redeploy.
  This is the actual fix needed to stop avatars from breaking; it's an
  external-credential gap, not a code gap.
- **Passkeys (WebAuthn)** — real end-to-end: `@simplewebauthn/server` +
  `@simplewebauthn/browser`, new `WebAuthnCredential` Prisma model
  (migration `20260815181416_add_webauthn_credentials`, applied to
  staging), registration + a real discoverable-credential login path via
  a `"passkey"` NextAuth CredentialsProvider, list/rename/remove UI.
  `rpID`/`origin` come from `NEXTAUTH_URL` only, same reasoning as the
  Etsy redirect_uri fix.
- **2FA (TOTP)** — setup/QR/backup codes were already real; QR is now
  rendered client-side (`qrcode` package) instead of leaking the secret
  to a third-party image service; secret + recovery codes are encrypted
  at rest; and it's now actually **enforced at login** (previously a
  no-op toggle) via a two-step credentials flow. Regenerate/copy backup
  codes and a real disable-confirmation (password or code required) were
  added — didn't exist before.

**Billing — real, not just credential storage**:
- Stripe: fully dynamic Checkout Sessions (inline `price_data`, no
  pre-created Stripe Price objects — DB-edited package prices stay the
  single source of truth)
- PayPal: lazy Product+Plan creation on first purchase per package
  (cached on the `Package` row), direct REST calls (not the SDK — lower
  confidence in that specific newer SDK's exact method surface than in
  PayPal's stable, well-documented REST API)
- Both webhook handlers **actually verify signatures** — Stripe via local
  HMAC (`stripe.webhooks.constructEvent`), PayPal via a live verification
  API call (how PayPal's model works, no local HMAC option)
- Admin UI: live/sandbox mode toggle per provider, separate credential
  entry per mode, confirmation prompt before switching to LIVE
- Billing page has real "Pay with card" / "Pay with PayPal" buttons, only
  shown for providers actually active; falls back to a mailto link if
  neither is configured for an org

## What's explicitly NOT built yet

- **Cross-listing push/sync logic** — the `CrossListing` data model exists,
  the OAuth write-scope connections exist, but no code actually creates or
  syncs a listing across platforms yet.
- **Webhook registration** — the endpoints exist and verify correctly, but
  they need to be manually registered in Stripe's and PayPal's dashboards
  before a real purchase will actually update someone's plan. **Do this
  before testing a real checkout end-to-end.**
- Safepay/PayFast — credential storage only, no checkout logic (Stripe/
  PayPal were built first per founder priority; same shared
  `Subscription`/webhook framework is ready for them when it's time)
- Chrome extension, AI assistant, eBay research connector, category
  leaderboards, audit log, mobile-responsive pass, automated backups
- Real Privacy Policy/Terms pages (still `mailto:` placeholders — a real
  legal gap, not cosmetic)
- Login/register security hardening (disposable-email blocking, device
  fingerprinting, social login) — discussed, not built
- Standalone Shopify App Store listing ("SaltSync") — scoped (name chosen,
  OAuth scopes decided: `read_products,write_products,read_inventory,
  write_inventory,read_locations,read_orders,read_customers`), architecture
  question (shared backend vs. separate) still open, nothing built

## Known scaling constraint (not solved, just flagged)

Every customer shares one Etsy Personal Access connector — 5 req/sec,
5,000 requests/day, combined across all customers.

## Lessons learned — real incidents worth knowing about

1. **Branch/database mismatch incident**: a billing migration was run
   directly against production's database, but the corresponding code was
   pushed only to the `staging` branch — production's database and running
   code were out of sync (dropped column the old code still expected) until
   caught and fixed by fast-forward-merging `staging` into `main`. Root
   cause: an implicit "push to git" instruction without explicitly stating
   which branch. Always state the target branch explicitly when a
   migration is involved.
2. **Sandbox drift**: my own sandbox copy of files can silently diverge
   from the real repo when changes happen through Claude Code directly
   (not through me). This caused `package.json`'s rebrand to briefly
   revert in a later patch. Ask for current file content before patching
   anything I haven't personally touched recently.
3. **`HOSTNAME=0.0.0.0`** — required explicit runtime env var for Next.js
   standalone builds behind Coolify's proxy, easy to forget when creating
   a new environment. Missing it means the app deploys "successfully" but
   is completely unreachable.
4. **A production database's public port was left open** longer than
   intended after a migration, since the tool available for closing it
   again wasn't discovered until later. Always verify closure via
   Coolify's UI, don't just assume a prior "disabled" claim held.
5. **Etsy OAuth redirect_uri incident (2026-08-15)**: the two Etsy
   seller-channel routes (`src/app/api/seller-channels/etsy/connect|
   callback/route.ts`) built `redirect_uri` from request headers
   (`x-forwarded-host`/`host`) instead of `NEXTAUTH_URL`, unlike every
   other OAuth connector in the app (Shopify, WooCommerce), which
   deliberately avoid `req.url`/headers for exactly this reason — behind
   Coolify's proxy those can reflect the container's internal address, not
   the public domain. A mismatched `redirect_uri` is what Etsy's
   "requested redirect URL is not permitted" error means, and repeated
   failed attempts during testing is the likely cause of the follow-up
   "Temporarily blocked" state. Fixed by switching both routes to the same
   `appUrl()`-from-`NEXTAUTH_URL` pattern already used elsewhere. Also
   found and removed a hardcoded Etsy client ID literal
   (`efxloiz6kn6jhkzzbto4oz3v`) used as a fallback in **four** places
   (`src/lib/auth.ts` ×2, both seller-channels/etsy routes) — a real
   credential-in-source violation independent of the redirect bug. **One
   Etsy developer app serves both flows** (per founder decision): "Sign in
   with Etsy" (NextAuth, `src/lib/auth.ts`, login/identity) and "Connect
   Your Etsy Shop" (`/settings/channels`, dedicated PKCE flow, now
   customer-facing). Because they're separate code paths, **Etsy's app
   dashboard must have BOTH redirect URIs registered, for both
   environments** (4 total): `{NEXTAUTH_URL}/api/auth/callback/etsy` and
   `{NEXTAUTH_URL}/api/seller-channels/etsy/callback`, for
   `https://sellersalt.com` and `https://staging.sellersalt.com`. This is
   an Etsy-dashboard-side config step outside the codebase — verify it's
   done before testing either flow end-to-end.

## How to work efficiently in this project

- This file is the context — don't re-explain history in chat.
- Batch related features into one patch rather than one file per
  round-trip.
- **Keep this file updated** after any significant session — move
  completed items from "not built yet" into "what's built," and add any
  new operational gotcha discovered. An out-of-date file actively misleads
  future sessions, which is worse than no file at all.
