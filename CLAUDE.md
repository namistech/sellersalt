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

## Non-negotiable workflow & Etsy API integrity rules

1. **Never invent Etsy API capabilities**: Refer strictly to `docs/02-etsy/SELLERSALT_ETSY_API_V3_AUDIT.md`. Never invent or promise keyword volume, search difficulty, trend APIs, or full ads management APIs.
2. **Preserve data provenance**: Explicitly badge all data in UI and services as `[ACTUAL ETSY DATA]`, `[ESTIMATED]`, `[SELLERSALT SCORE]`, or `[EXTERNAL DATA]`. Never present derived metrics as native Etsy metrics.
3. **Never expose cross-tenant data**: Always scope database queries with `where: { organizationId }` on every user-facing route.
4. **Never treat mock data as production data**: Clearly distinguish prototype stubs from real database records.
5. **Every score needs explainable inputs**: Any composite metric (Opportunity Score, SEO Score, Competition Level) must clearly disclose its mathematical formula and point breakdown.
6. **Every AI generation feature needs originality protection**: AI output must never duplicate competitor titles, tags, or copy. Enforce N-gram/Jaccard similarity thresholds (<15% overlap).
7. **Every Etsy write operation requires proper OAuth scope**: Ensure `listings_w` is verified before write attempts. Current scope set is `listings_w listings_r shops_r transactions_r` — `shops_w` and `billing_r` were deliberately removed during Etsy compliance remediation (no feature uses them; `billing_r` was never a real Etsy v3 scope). Do not reintroduce either without a real, implemented feature that needs it.
8. **Every third-party external link opens in a new tab**: Always use `target="_blank" rel="noopener noreferrer"` for external Etsy or partner links.
9. **Never silently publish AI-generated Etsy content**: Drafts must be created in `draft` state and require explicit human review/approval before publication.
10. **Do not build around unauthorized Etsy scraping**: Use official SellerSalt backend/API data and legal capabilities only.
11. **Respect API freshness/rate-limit/compliance constraints**: Enforce 8 req/sec queue ceilings and respect caching TTLs (Search: 6h, Shop: 24h, Taxonomy: 7d).
12. **Run typecheck/build/tests after implementation phases**: Execute `npx tsc --noEmit` before committing any code changes.
13. **View the real file before editing** — ask for current content first to prevent sandbox drift.
14. **Schema changes**: `npx prisma generate` first, or tsc gives false errors.
15. **Config/credentials belong in `/admin` → Site settings (`AppSetting` table via `src/lib/app-settings.ts`), never hardcoded.**

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
- **Email confirmation** (2026-08-16) — signup already sent a real
  verification email and a resend page already existed, but nothing
  persisted whether a user actually confirmed: the token-verify route
  only marked the token used, with no field anywhere to record it.
  Added `User.emailVerified` (migration
  `20260815201102_add_user_email_verified`, applied to staging,
  existing accounts backfilled to "verified at signup" so this only
  gates new signups). The verify route now actually sets it; the
  dashboard shows a non-dismissible alert with a working resend button
  until it's set.

**AI provider/model registry** (2026-08-16, Phase 1 of the SaltBot AI
infrastructure rebuild — see `AiProvider`/`AiModel` models): fixes
"AI APIs are failing because the system doesn't know which model to
use" — every provider previously had a hardcoded model ID string in
`llm-provider.ts` (e.g. a specific OpenRouter free-tier slug, Google's
since-deprecated `gemini-1.5-flash`) with no way to know if it still
existed on the provider's side, and no admin UI to see or change it.
- Real, admin-refreshable model catalog per provider (OpenRouter,
  NVIDIA, Gemini, OpenAI), fetched live from each provider's own
  model-list API on demand — never hardcoded/invented. Verified live
  against all four real endpoints while building this (OpenRouter:
  413 real models incl. 19 free; NVIDIA: real catalog, no auth
  required for the list endpoint; Gemini/OpenAI: confirmed reachable).
- Admin UI (`/admin` → AI Providers tab): per-provider API key entry,
  Test Connection (a real model-list call), Refresh Models, a Default
  Model dropdown populated from the live catalog, priority (SaltBot's
  fallback order), "Models last updated: X ago".
- `llm-provider.ts` now iterates active, priority-ordered `AiProvider`
  rows from the DB using each one's selected `defaultModelId` — zero
  hardcoded model strings remain.
- Auto-picks a sane default on every refresh (keeps the current
  selection if it survived the refresh, else cheapest free model, else
  first reported) so a provider is never "connected but no model
  selected."
- Migration `20260815203713_add_ai_provider_model_registry` also
  migrated the already-configured OpenRouter/NVIDIA keys over from
  their old `AppSetting` rows (same encryption module) and removed
  those rows — credentials now live in exactly one place.
- **Not yet built** (later phases, deliberately deferred per explicit
  instruction to stop after Phase 1 and let it get tested): per-model
  health tracking/auto-failover beyond the existing try-next-provider
  fallback, scheduled catalog refresh, auto-recommend (best free/
  cheap/quality/fast), cost-control routing.

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

**Email verification & account activation (2026-08-16)** — email/password
accounts are hard-blocked from the dashboard until verified (redirect in
`(dashboard)/layout.tsx`, not a dismissible nag — the old dashboard alert
was removed). Google/Etsy OAuth logins are auto-verified at sign-in
(provider identity already implies a verified address) and never blocked.
Central helper `src/lib/email-verification.ts` (`sendVerificationEmail`)
is the single send path for signup's first email, the self-serve resend on
`/verify-email`, the two automatic BullMQ-delayed reminders (~6h/~18h,
`scheduleVerificationReminders` in `src/lib/queue.ts`), and the new admin
"Send verification email" action — all share the same `User` counters
(`verificationEmailCount`/`verificationFirstSentAt`/`lastVerificationEmailAt`)
so the cap (3 sends / 24h, plus a 60s per-send cooldown) can't be bypassed
by mixing send paths. `/verify-email` now doubles as the dedicated
verification-required screen (masked email, cooldown countdown, distinct
invalid/expired/already-verified states) when hit by an authenticated user,
not just the old unauthenticated resend form. New admin actions on the
Users tab: "Send verification email" and "Change email" (conflict-checked —
409s and stops rather than merging accounts; resets verification state and
re-sends). New `User` columns: `authMethods` (String[], appended to on
every successful login — there's no NextAuth Account/Session adapter table
in this schema, so this is the only record of which sign-in methods an
account has used) and `lastLoginAt`. New minimal `AuditLog` model
(`src/lib/audit-log.ts`) records `EMAIL_VERIFICATION_SENT`,
`EMAIL_VERIFICATION_RESENT`, `ADMIN_EMAIL_VERIFICATION_SENT`,
`ADMIN_EMAIL_CHANGED`, `EMAIL_VERIFIED` — never secrets/tokens.

**Notifications, canonical branding, tracking backend, marketplace/OAuth
fixes (2026-08-17, batch-29 forensic audit)** — a full re-audit found
several prior "complete" claims didn't hold up against actual code/live
UI, plus one previously-undiscovered production bug:

- **In-app notifications are now real**: new `AnnouncementRead` model
  (per-user, real FK to `User`) replaced a process-memory `Map` that lost
  all read/dismiss state on every deploy and had zero mark-read wiring in
  the UI despite implying a real inbox. `NotificationCenter`/`AppShell`
  now support individual mark-read (click a row) and mark-all-read,
  persisted server-side, verified to survive a page reload. Announcement
  *content* itself is still a small in-code list (no admin authoring UI
  persists new ones across a restart) — only read-state is durable.
- **Etsy OAuth "credentials not configured" bug, fixed**: the connect
  route already merged the AppSetting-configured client ID correctly, but
  gated on a separate `isValid` flag from `resolveEtsyOAuthRedirectUri()`
  that only ever checked env vars — so a client ID configured the
  documented way (via `/admin` → Site Settings only, no matching env var)
  still bounced with "not configured". Fixed by threading the resolved
  client ID into that validator (`overrideClientId` param). Verified live:
  clicking "Connect Etsy Shop" now reaches Etsy's real authorize URL.
- **Schema/migration drift discovered**: `ListingWatch`, `ListingSnapshot`,
  and `TrackingAlert` models existed in `prisma/schema.prisma` — and a
  fully-built API backend already queried them
  (`/api/tracking/listings`, `/api/tracking/alerts`, `/api/tracking/
  quota`) — but no migration had ever created these tables in staging or
  production. The entire per-listing tracking feature was silently
  broken (table-does-not-exist) until migration
  `20260817112443_add_notification_read_and_tracking_days` was applied.
  **If `npx prisma migrate status` ever shows schema fields with no
  corresponding migration again, treat it as a live bug, not just
  housekeeping** — check whether application code already depends on it.
- **Shop cover photo fixed**: `shop-intelligence.ts` used
  `rawShop.banner_url_fullxfull`, not a real Etsy v3 field (always
  `undefined`); corrected to `image_url_760x100`, the field already used
  correctly in `connectors/etsy/index.ts`.
- **Listing detail gallery fixed**: the gallery UI already supported
  multiple images, but the page never called Etsy's multi-image endpoint
  (capped at 1 cached URL) and silently rendered fully fabricated mock
  stats with no `[ESTIMATED]` badge when no local record matched. Now
  does a real live Etsy fetch and 404s honestly instead of fabricating.
- **Password change re-auth alternatives**: `/api/settings/password` now
  accepts a current TOTP/backup code as an alternative to the old
  password (reuses the 2FA route's `verifyPasswordOrCode`, now exported
  from `src/lib/two-factor.ts`), and the profile page offers an
  email-reset-link path for users without 2FA — reuses the existing
  audited forgot-password flow rather than new OTP infrastructure. Also
  fixed a `PUT` vs `PATCH` method mismatch that would have 405'd every
  password change. Added a real client-side strength meter matching the
  server's `checkPasswordStrength` policy.
- **Shop tracking duration is real**: new `Package.maxTrackingDays`
  (Starter=3, Pro=7, Agency=30) backs the 3/7/30-day buttons on the shop
  detail page, previously a literal `onClick={() => {}}` no-op. CSV
  export now uses the pre-existing (previously never-called)
  `tracking-engine.ts` delta calculators for a real before/after report
  instead of dumping current-state data with a fake "report" label.
- **"Search Stream" → "Saved Search"**: prior batch only removed the term
  from the nav sidebar, not actual page copy (prospects, radar,
  dashboard, checkout still said "Create Search Stream" etc.) — renamed
  everywhere it was customer-visible. `SearchConfig` internals/API routes
  unchanged.
- **Trial billing ($1/3-day) disabled**, not deleted: `Package.trialDays`/
  `trialPriceUsd` nulled on staging via `/admin` (fully reversible, zero
  code change to re-enable) and all hardcoded "$1 Trial" marketing copy
  removed from pricing/homepage/header/footer/login/contact/email-
  template. Stripe/PayPal trial-checkout code itself untouched. **Do the
  same null-out on production's `Package` rows via `/admin` when ready**
  — not automated, since it's a live pricing/business decision.
- **Canonical brand asset system, finally exists**: `public/brand/` now
  has real derived assets (`icon-mark.png` transparent, `icon-square.png`
  white-backed, `wordmark.png`) cropped via `sharp` from the real
  SellerSalt logo that was already configured in the `app_logo_url`
  AppSetting (hosted externally on aliyanbaig.com) — that setting existed
  but was never read anywhere in the frontend, and separately, forcing
  its wide wordmark into square icon slots (`object-cover`) produced an
  illegible cropped fragment. `AccountBrand.tsx` now renders the full
  wordmark at `h-8 w-auto` when `app_logo_url` is set (matching the
  working pattern already used on auth pages) instead of force-cropping
  it into a square badge; the square badge always uses the derived
  `icon-mark.png`, never the wide URL directly. Wired into: sidebar,
  `PublicHeader`, SaltBot assistant (launcher + header badge), auth pages,
  `src/app/icon.png`/`apple-icon.png` (real favicon, previously
  nonexistent — the AppSetting-driven favicon had no static fallback),
  and `extension/manifest.json` (previously had no `icons` field at all;
  4 real sizes added).
- **Admin image upload, not just URL paste**: new
  `POST /api/admin/settings/upload-image` (admin-gated, reuses the
  existing `getStorageProvider()` S3/R2-or-local factory, same pattern as
  avatar upload) lets an admin upload a file directly for any of the 6
  image `AppSetting` keys instead of only pasting an external URL. Same
  S3-not-configured caveat as avatars applies — falls back to local
  container disk, doesn't survive a redeploy, until real bucket
  credentials exist.
- **Login page side-image positioning**: new `auth_page_image_position_x`/
  `_y` settings (0-100, admin sliders) drive real CSS `object-position` on
  the auth layout's side image — previously no positioning control
  existed at all (fixed `object-cover`, no override).

**Etsy Commercial API compliance remediation (2026-08-19)** — prepares the
app for a future Etsy Commercial Access reapplication per the *current*
(June 2025) Etsy API Terms and Open API v3 docs. Not a claim of "Etsy
compliant" — see caveats below.
- **OAuth scopes narrowed to least-privilege**: dropped `shops_w` (no
  write-to-shop-metadata feature exists) and `billing_r` (no feature reads
  Etsy's shop billing/payment-account data; `transactions_r` alone backs
  the real order/receipt sync in `src/seller-channels/etsy-seller/
  index.ts`, confirmed still genuinely required). New default:
  `listings_w listings_r shops_r transactions_r`. Canonical value lives in
  `DEFAULT_ETSY_SCOPES` (`src/services/connectors/etsy-oauth-helper.ts`).
- **OAuth user resolution fixed**: both Etsy provider blocks in
  `src/lib/auth.ts` no longer call the non-existent
  `openapi.etsy.com/v3/application/users/me` — they resolve the numeric
  user ID from the access token prefix and call the real
  `/v3/application/users/{user_id}` endpoint.
- **Etsy-hosted browser extension content script fully removed**, not
  merely disabled: `extension/etsy-content-script.js` and the
  `extension/etsy/` directory (`page-detector.js`, `payload.js`,
  `selectors.js` — including the `_setNativeValue` DOM write path used to
  inject title/tag edits directly into Etsy's Shop Manager editor) are
  deleted outright, `manifest.json` no longer requests `*.etsy.com` host
  permissions or registers any content script there, and every
  background-worker message handler that only existed to serve that
  bridge (`ETSY_EDITOR_SNAPSHOT`, `GET_SEO_AUDIT_STATE`,
  `GET_SUGGESTIONS_STATE`, `APPLY_SUGGESTION`) plus their now-orphaned
  support modules (`extension/lib/seo-request.js`,
  `extension/lib/suggestions.js`) are gone. The extension's remaining
  Listing/Shop/Search panels only ever called SellerSalt's own backend
  (`extension/lib/api-client.js`) — they never read or wrote Etsy page
  DOM and were left as-is. **If real-time in-editor SEO scoring is wanted
  again, it needs Etsy's written authorization first** (their API Terms
  prohibit browser extensions accessing/analyzing/scraping Etsy's site
  without it) — this is a product decision, not a code TODO.
- **Snapshot retention is now bounded, not indefinite**: new
  `src/lib/data-retention.ts` (`getSnapshotRetentionCutoff()`) derives a
  prune cutoff from the *widest tracking window any active `Package`
  actually sells* (`Package.maxTrackingDays`, currently up to 30 on
  Agency) rather than a fixed/invented number — deliberately avoids
  hardcoding an Etsy-derived retention rule that doesn't exist in their
  docs. Wired into both `ShopSnapshot` capture (`src/workers/index.ts`)
  and `ListingSnapshot` capture (`src/app/api/tracking/listings/
  route.ts`); both prune on every new snapshot write.
- **Surveillance/spy/stalk terminology removed from user-visible
  surfaces**: marketing homepage, root metadata/JSON-LD, public footer,
  login/checkout/contact copy, transactional emails
  (`src/services/email/template-registry.ts`), changelog/announcements,
  and the full dashboard (nav, quick actions, onboarding, university,
  support FAQ, admin Integrations/Plans views) now say "Market Research"
  instead of "Spy on Competitor"/"Competitor Surveillance". Internal code
  identifiers (`COMPETITOR_SURVEILLANCE` opportunity source,
  `SURVEILLANCE` feature-request category key, `canUseAdvancedSurveillance`
  entitlement field) were **deliberately left unrenamed** — they're
  DB-shape-adjacent string literals with test-file coupling, not
  user-visible, and renaming them wasn't necessary for the compliance
  goal. Also removed literal "scraper"/"scraping" claims from pricing and
  billing copy (SellerSalt doesn't scrape Etsy — it uses the official API
  — so marketing shouldn't claim otherwise).
- **Full remediation test suite**:
  `src/tests/etsy-commercial-compliance-remediation.test.ts` (14 checks —
  scope set, user resolution, extension removal, retention, disconnect
  lifecycle, AI data isolation, terminology). All 608 tests across the
  suite pass; `npx tsc --noEmit` and `npx next build` are clean.
- **Not addressed, needs a human decision**: `EmailSettings.fromName`
  still `@default("Anadash")` at the schema level (the admin creation
  route already overrides this with `"SellerSalt"` — see
  `src/app/api/admin/email-settings/route.ts` — but if a live
  `EmailSettings` row predates that safeguard, outbound email could still
  show "Anadash" as the sender name). Verify via `/admin` → Email
  Settings on both environments; changing the schema default itself
  needs a migration, out of scope for this pass per the schema-change
  rule above.

**Marketplace-agnostic architecture (2026-08-19, four-phase build following
the Etsy compliance remediation above)** — SellerSalt repositioned from an
Etsy-centric app into a marketplace-agnostic ecommerce intelligence
platform architecturally, without changing the customer-facing product
scope (Etsy was the only fully live marketplace at the time this was
written; **as of Batch 35, 2026-08-21, Amazon and Walmart's PUBLIC_WEB
research is also genuinely live** — see the Batch 35 entry further down
and the MVP Scope section above, which still governs which marketplaces
are *customer-facing-selectable* vs. admin-only regardless of which ones
have real acquisition capability under the hood). Full detail lives in the
docs listed below — this entry is a pointer, not a duplicate.

- **`src/marketplaces/core/`** — a `MarketplaceConnector` interface,
  `MarketplaceCapabilities` flags, a central `MarketplaceRegistry`,
  canonical types (`NormalizedProduct`, `Listing`, `Order`, etc.), and a
  `research-pipeline.ts` orchestration layer
  (`runProductResearch`/`runAllMarketplaceProductResearch`/etc.) — wraps
  the pre-existing `src/connectors/` (platform research) and
  `src/seller-channels/` (OAuth accounts) rather than replacing them.
- Six connector adapters registered: Etsy (real), Shopify/WooCommerce
  (partial — real account+orders, no research), Amazon/eBay/TikTok Shop
  (honest architecture-ready stubs, zero live capabilities, throw
  `MarketplaceNotImplementedError` rather than fabricate data).
- `/api/products/search`, `/api/keywords/search`, `/api/categories`, and
  the scheduled Prospects worker now capability-check via the registry
  before doing Etsy-specific work — Etsy's actual behavior verified
  byte-identical throughout.
- A real "All Marketplaces" research mode
  (`POST /api/marketplaces/research`) exists and is wired into the
  Prospects page — fans a request across every registered connector in
  parallel, each independently `AVAILABLE`/`PARTIAL`/`UNAVAILABLE`/
  `NOT_IMPLEMENTED`, with per-connector error isolation.
- `seo-engine.ts`'s `auditListingSeo` and `universal-scoring.ts`'s margin
  factor now accept marketplace rules (`MarketplaceOptimizationRules`)
  instead of hardcoding Etsy's 140-char/13-tag/20-char/fee numbers —
  Etsy's default behavior unchanged (verified by test).
- One additive Prisma migration (`ConnectorType`/`SellerChannelPlatform`
  enum expansion for the new marketplaces) — no destructive schema
  changes. A separate, pre-existing, unrelated schema drift
  (`Announcement`/`Coupon`/`AnnouncementRead`) was found during this work
  and deliberately excluded — needs its own reviewed migration.
- **Full canonical documentation set added/rewritten this pass**: root
  `AGENTS.md` (now the primary cross-agent instruction file — `GEMINI.md`
  now just points to it instead of duplicating), `docs/SELLERSALT-
  HANDOFF.md`, `docs/SELLERSALT-ARCHITECTURE.md`,
  `docs/SELLERSALT-MARKETPLACE-ARCHITECTURE.md`,
  `docs/MARKETPLACE-INTEGRATION-MATRIX.md`, `docs/SELLERSALT-ROADMAP.md`,
  `docs/CHANGELOG.md`, and a new root `README.md` (none existed before).
  Several actively-stale legacy docs (`SETUP.md`,
  `docs/25-roadmap/SELLERSALT_CAPABILITY_MATRIX.md`,
  `docs/marketplace/marketplace-abstraction.md`,
  `docs/architecture/marketplace.md`, the `docs/17-browser-extension/*`
  specs) got superseded-notices rather than rewrites or deletion — they
  described a pre-remediation or pre-abstraction state that could mislead
  a new agent reading them in isolation.
- **Known remaining gaps** (see `docs/SELLERSALT-ROADMAP.md`/`AGENTS.md`
  §19 for the full, current list): "All Marketplaces" mode isn't wired
  into Keyword Research/Category Hunting/Studio yet (Prospects only);
  `handleShopWatchJob` (shop-tracking worker) still uses the old connector
  registry directly; a third, unused, mislabeled-"universal"
  `opportunity-scoring.ts` engine was found and parameterized but never
  adopted anywhere; Amazon/eBay/TikTok Shop need real developer
  credentials before any capability can go live — external dependency,
  not an engineering task.

**Real acquisition runtime forensics (2026-08-20, Batch 34)** — a real
merchant search for a product on SellerSalt currently returns zero
results. Root-caused end-to-end against the live staging environment (see
`BATCH-34-REAL-ACQUISITION-RUNTIME-FORENSICS.md` for the full trace):
Etsy's `PUBLIC_WEB` source is genuinely blocked by Cloudflare/DataDome
(known, unchanged, must not be bypassed), and Etsy's `MARKETPLACE_API`
source is genuinely rejected by Etsy itself — a real, live `403 "API key
not found or not active..."` from the AppSetting-configured
`etsy_seller_client_id`/`secret`. **This is the actual, current launch
blocker**: the configured Etsy API credential needs to be re-verified or
reissued in the Etsy Developer Console; nothing in the codebase can fix
it. Three real code defects found and fixed while tracing this:
1. `src/connectors/etsy/index.ts`'s `runSearch()` silently discarded that
   403 (`catch { continue; }`) instead of surfacing it — the orchestrator
   never saw *why* the official API failed, only an empty array
   indistinguishable from a genuine zero-result search. Fixed: rethrows
   the real `EtsyApiError` when every keyword attempt fails.
2. **Cross-tenant data leak**: `orchestrateProductResearch`'s
   `HISTORICAL_OBSERVATION` fallback
   (`src/marketplaces/core/acquisition/orchestrator.ts`) queried the
   org-scoped `Prospect` table with **no `organizationId` filter** — any
   org's search could return another org's saved research. A sibling
   implementation of the same historical-fallback concept
   (`acquireHistoricalProductObservations` in
   `src/marketplaces/core/acquisition.ts`) already scoped correctly; the
   orchestrator's independent inline duplicate did not. Fixed in both
   `orchestrateProductResearch` and the previously-dead-code
   `orchestrateProductDetail` (now takes an `organizationId` param).
3. **Fabricated data found and removed**: 40 `Prospect` rows on staging
   were literally titled `"Simulated Product Research 1-5"`/`"Simulated
   Shop 1-5"` (left over from a Batch 28 test run against
   `test_org_batch28_*` orgs) and were reachable through the real
   historical-fallback search path as genuine-looking observations —
   deleted with founder confirmation.

New: `AcquisitionReport.unavailableReason` (`REQUIRES_CREDENTIALS` /
`RATE_LIMITED` / `UPSTREAM_ERROR` / `POLICY_RESTRICTED` / `PARSER_ERROR`),
computed from real HTTP status codes and each public-web adapter's own
already-computed `failureReason` (previously silently discarded) — never
inferred from item count alone, so a genuine empty search is never
misreported as a failure and vice versa. Wired into
`CapabilityUnavailable` (`src/marketplaces/core/availability.ts`) and
`src/services/product-hunting.ts`'s user-facing messages. Same fix
incidentally corrected Amazon/Walmart's public-web adapters, which were
silently reporting unhelpful emptiness on a real, unparseable `200`
response (now honestly `PARSER_ERROR`) — these are real,
UI-selectable-today marketplaces via `MarketplaceSelector`, not
hypothetical. New `npm run diagnose:acquisition -- "<query>"` command
(`src/scripts/diagnose-acquisition.ts`) runs the real orchestrator against
every registered marketplace and prints the full per-source trace,
bounded and non-destructive. Safe structured telemetry added to the
orchestrator via the existing `StructuredLogger`/`CorrelationManager`
(no new logging system). 7 new real integration tests
(`src/tests/batch-34-real-acquisition.test.ts`), full suite
1,182/1,182 passing.

**Launch classification at the time (2026-08-20): NOT_USABLE** — see the
Batch 35 entry immediately below for how this changed one day later by
fixing non-Etsy sources instead of the Etsy credential.

**Independent (non-Etsy) acquisition now genuinely works (2026-08-21,
Batch 35)** — Batch 34 correctly diagnosed Etsy's blocker but, per
founder redirection, had over-focused on Etsy specifically; SellerSalt's
own architecture (`docs/DATA-ACQUISITION.md`) was already designed to be
marketplace-independent (PUBLIC_WEB acquisition is documented as the
*primary* source, official marketplace APIs as secondary enrichment) but
had never actually been exercised end-to-end for any marketplace besides
Etsy. Found and fixed (full detail, real traces, and before/after counts
in `BATCH-35-INDEPENDENT-ACQUISITION-AND-RESEARCH-VALIDATION.md`):
- **Amazon's public-web card parser** (`src/marketplaces/amazon/
  public-adapter.ts`) used a fixed 2,500-character window to isolate each
  product card's HTML — a real live fetch showed Amazon's current markup
  puts the `<h2>` title 3,000-6,000 characters after the card's
  `data-asin` attribute, so the adapter always silently found zero
  titles despite Amazon returning a completely real, successful `200`
  response with real product data already in hand. Fixed: window is now
  bounded by the next card's own match, not a fixed size.
- **Walmart's public-web parser** (`src/marketplaces/walmart/
  public-adapter.ts`) was rewritten entirely — its old HTML-regex
  approach was structurally incapable of capturing real card content
  (matched up to the first nested `</div>`, a few characters in) and
  targeted a build-specific hashed CSS class name that no longer exists
  on the live site. Now parses the page's own embedded `__NEXT_DATA__`
  Next.js hydration JSON instead — real field names
  (`usItemId`/`name`/`priceInfo`/`averageRating`/etc.), far more
  reliable than scraping obfuscated classes, and not client-side JS
  execution or anti-bot evasion (it's structured data the server already
  sent in the response we already fetch).
- **"All Marketplaces" mode and its default marketplace list both
  silently excluded Amazon/Walmart** even after the two parser fixes
  above, because `runProductResearch`
  (`src/marketplaces/core/research-pipeline.ts`) and the `/api/
  marketplaces/research` route's default-marketplace computation both
  gated on the *official API connector's* `capabilities.research` flag
  alone, before ever checking whether a real `PUBLIC_WEB` adapter
  existed — exactly backwards from this codebase's own documented
  priority order. Fixed: gate on either capability.
- **The marketplace picker UI** (`MarketplaceSelector.tsx`) and `GET
  /api/marketplaces` had the identical bug, hard-disabling the
  Amazon/Walmart buttons ("Coming soon", not clickable) even after the
  above fixes. Fixed via a new `researchAvailable` field
  (official-API-OR-public-web) the UI now gates on instead of
  `capabilities.research` alone.
- **Cross-marketplace data mislabeling + cross-tenant gap found while
  updating stale tests**: `acquireHistoricalProductObservations`
  (`src/marketplaces/core/acquisition.ts` — a sibling implementation to
  the one Batch 34 fixed in `orchestrator.ts`) queried `Prospect` with no
  `marketplace` filter at all, then unconditionally relabeled every row
  it found with whatever marketplace was requested — a query for a
  zero-capability marketplace could return another marketplace's real
  historical data mislabeled as that marketplace's own. Also ran
  unscoped when no `organizationId` was given (same class of bug Batch
  34 fixed in the other engine). Fixed the same way: require
  `organizationId`, filter by the correct `marketplace`.
- **Default marketplace on `/prospects`' "Search Marketplace" changed
  from `etsy` (currently blocked) to `all`** — a search must not depend
  on one marketplace; "All Marketplaces" fans out in parallel with each
  source's own honest status, verified live in the browser.
- 7 new deterministic unit tests (`src/tests/batch-35-independent-
  acquisition.test.ts`, minimal-but-structurally-real fixtures, no live
  network — CI-safe) plus 6 existing test files updated where their
  assertions encoded the *old, now-incorrect* premise that Amazon/eBay
  were unconditionally unsupported (never weakened — retargeted at a
  genuinely zero-capability marketplace like TikTok Shop where that was
  the test's real intent, or updated to the new correct contract where
  the underlying behavior legitimately changed). Full suite:
  1,196/1,196 passing.
- **Verified live in the running app, not just the CLI**: a real browser
  session searching "wooden desk organizer" with the new "All
  Marketplaces" default shows Etsy/eBay honestly "Currently unavailable"
  (with real, specific reasons) and Amazon/Walmart "Available" with real
  product cards — real titles, real prices, real ratings, real review
  counts, real images, computed Opportunity Radar scores.
- **Not fabricated, disclosed honestly**: Amazon's current search-card
  markup doesn't render price/rating in static HTML (confirmed zero
  occurrences of the relevant CSS classes anywhere on a real captured
  page) — those fields stay `null` for Amazon, never estimated. Amazon's
  live response also isn't perfectly deterministic under concurrent
  multi-marketplace load (occasional real `200` with no parseable
  listings, honestly classified `PARSER_ERROR`) — sequential,
  reasonably-paced requests succeeded 5/5 across all four required test
  queries during this batch's verification; Walmart showed no such
  variability in any test performed.

**Launch classification (2026-08-21): ACQUISITION_READY_FOR_BETA** — at
least two legitimate, independent, credential-free acquisition paths
(Amazon, Walmart) work end-to-end today with real, provenanced
observations. Etsy's external credential blocker (Batch 34) is
unchanged. The full downstream `RESEARCH → VALIDATE → PLAN` chain was
**not** re-verified against this newly-real non-Etsy data in this
batch — that's the next concrete step toward a `PRIVATE_BETA_READY`
claim, and the data now exists to actually perform that test.

**End-to-end commercial intelligence validation (2026-08-21, Batch
36)** — traced Batch 35's real Amazon/Walmart data all the way through
SEARCH → RESEARCH → VALIDATE → PLAN, per an explicit "prove it, don't
just pass tests" mandate. Full detail and evidence in
`BATCH-36-END-TO-END-COMMERCIAL-INTELLIGENCE-VALIDATION.md`. Found and
fixed four real Zero-Fabrication Contract violations — all latent until
Batch 35 made non-Etsy data real, since these code paths previously
never received real observations at all:
- **Fabricated `$0.00` price and fabricated shop stats** ("~0.0
  sales/day · 0 reviews") shown for Amazon/Walmart search results whose
  real price/shop-level data genuinely isn't in the source markup.
  Root cause: `p.price ?? 0`, `p.shop?.activeListings ?? 1`, etc. in
  `src/services/product-hunting.ts`'s results mapping silently
  defaulted unobserved fields to plausible-looking numbers. Fixed by
  widening `NormalizedProductListing.price` to `number | null` and
  adding a new `shopMetricsObserved: boolean` to `NormalizedShopProfile`
  that gates whether shop-level stats render at all — now correctly
  shows "Price unavailable" / hides the stats block instead of a fake
  number. Threaded through ~9 render sites (`live-search-tab.tsx`,
  `ProductComparisonModal.tsx`, `ProductResearchDrawer.tsx`,
  `category-hunting-client.tsx`, `product-detail-client.tsx`,
  `planner-client.tsx`) and every `NormalizedShopProfile` construction
  site.
- **Hardcoded `[ACTUAL ETSY DATA]` badge shown for Amazon/Walmart
  results** — a direct violation of non-negotiable rule #2 above. Fixed
  by making the badge marketplace-aware everywhere in the real
  Amazon/Walmart-reachable path (`marketplace === "etsy" ?
  ACTUAL_ETSY_DATA : EXTERNAL_DATA`); `ProductComparisonModal`/
  `ProductResearchDrawer` gained an explicit `marketplace` prop for
  this since they didn't previously receive per-item marketplace
  context.
- **Hardcoded `2.0` sales/day fallback in the Planner's Unit Economics
  calculator** (`planner-client.tsx`) silently turned "we don't know
  the real sales velocity" into a specific, believable monthly-profit
  dollar figure with zero disclosure. Assessed as this batch's most
  severe finding. Fixed: the fallback is gone; monthly profit now shows
  "Unavailable" unless a real (`shopMetricsObserved`) velocity exists.
- **Walmart's public search page genuinely serves a `"price not yet
  loaded"` sentinel** (`priceInfo: { linePrice: "", minPrice: 0 }`,
  confirmed live under repeated-request load) that the Batch 35 parser
  accepted as a real `$0` price. Fixed in
  `src/marketplaces/walmart/public-adapter.ts` with `> 0` guards on
  both `linePrice` and `minPrice` acceptance — verified this does not
  over-correct and still accepts genuine low real prices (e.g. $0.99).
- Also fixed: `product-detail-client.tsx` had literal hardcoded
  `activeListings: 45, reviewAverage: 4.8` constants (not even a `??`
  fallback) that were getting persisted into a real
  `PlannerItem.researchSnapshot` on "Add to Planner" — replaced with
  honest zero/null + `shopMetricsObserved: false`.

**Proven working end-to-end, with real runtime evidence** (script
calls, a real authenticated browser session, and the diagnostic
command below — not just passing tests): real Amazon/Walmart search
results → real `ProductValidationEngine` verdicts with disclosed
evidence and unobserved-signal lists → real
`ProductOpportunityWorkspaceEngine` workspaces with real opportunity
scores/data-trust percentages → real "Add to Planner" persisting a
real `PlannerItem` row with the exact Amazon listing. Full suite:
**1,203/1,203 passing** (7 new deterministic regression tests added,
`src/tests/batch-36-end-to-end-commercial-intelligence.test.ts`, no
live network). `npx tsc --noEmit`, `npx prisma validate`, `npx next
build` all clean. No schema changes.

`npm run diagnose:acquisition` (Batch 34/35's script) extended with
real RESEARCH → VALIDATION → PLAN stages: pass `--org
<organizationId>` to also run the real `ProductValidationEngine` and
`ProductOpportunityWorkspaceEngine` after the existing acquisition
trace (writes real `ProductValidation`/`SavedOpportunity` rows, same
as a real user action); pass `--no-persist` to skip those two stages
and keep the original acquisition-only trace.

**Launch classification (2026-08-21): upgraded to PRIVATE_BETA_READY**
— a real merchant can now search, receive real observations, research
them, validate them with a truthful evidence chain, and plan them
(save opportunity, add to Planner), with truthful provenance enforced
at every UI surface checked in this critical path. Not a claim of
`PUBLIC_LAUNCH_READY` — that needs demonstrated stable operation over
time, which one verification session can't establish. Known
architecture debt flagged for the next batch (not fixed here, no live
wrong-behavior today): three independent "go acquire products for this
query" implementations now exist (`orchestrateProductResearch`,
`ProductValidationEngine`'s and `ProductOpportunityWorkspaceEngine`'s
own inline acquisition loops) rather than the latter two consuming
results the orchestrator already produced — the repeated root cause of
these bugs surfacing independently in each engine across Batches
34-36; `ProductValidationEngine`'s acquisition loop also skips
`SourcePolicyEnforcer` (unlike the workspace engine), harmless today
since every live marketplace's policy is `ALLOWED`, but worth closing
for consistency.

**Product Research data contract repair (2026-08-21, Batch 37)** — founder
review correctly flagged that Batch 36's `PRIVATE_BETA_READY` data was too
thin: real searches were close to title + URL only, missing image, price,
reviews, rating, seller, category, and any demand signal. Full detail,
evidence, and field-availability matrix in
`BATCH-37-PRODUCT-RESEARCH-DATA-VALIDATION.md`. Root cause was three
compounding gaps: (1) real parser defects — Amazon's card-window cap was
still too small for a real sponsored card's title (measured live at
offset 9,771, past the 9,000-char cap), and its price regex only matched
a leading `$`, silently failing (and risking mislabeling) a real
geo-localized non-USD price this session's IP actually received; (2) a
UI-facing type/mapping gap — `NormalizedProduct` already had
`category`/`brand`/`badges`/`availability`, just never populated by the
adapters, and separately `NormalizedProductListing` had no field at all
for a product's own rating/review count, so even observed data got
shoehorned into an Etsy-shop-shaped field gated behind a flag that's
structurally always false for Amazon/Walmart; (3) **Amazon's own
anti-bot response to SellerSalt's honest, self-identifying
`PublicPageFetcher` User-Agent** — verified live (same ASIN, minutes
apart) that the identical request with a plain browser UA returns full
price/rating/category that the disclosed bot UA never receives. (3) was
investigated and proven, then raised directly to the founder as a real
decision rather than worked around; **founder chose to keep the honest
bot disclosure**, so Amazon's price/rating/per-card-category remain
genuinely unavailable in production — a disclosed external constraint,
not a bug. Fixed: Amazon's window cap, currency-honest price parsing (new
`parseAmazonPriceAndCurrency`, never assumes USD), real per-card category/
badges, and a rebuilt product-detail path (Amazon's JSON-LD confirmed
dead on live pages — 0 `Product` blocks — replaced with real HTML
breadcrumb/brand/seller/availability/Best-Sellers-Rank parsing). Walmart:
real seller name/ID, category, availability, badges, and fulfillment type
now read from fields already present in `__NEXT_DATA__` but never parsed;
its product-detail JSON-LD also confirmed dead, replaced with a parser
for the page's real product JSON. Both marketplaces' public seller/item
data confirmed to expose **no shop-registration-date field anywhere** —
shop age is genuinely `UNAVAILABLE`, not unparsed, for both. Also fixed: a
real "filter exists, request 200s, filter silently ignored" bug —
`orchestrateProductResearch` accepted `minPrice`/`maxPrice` but never
applied them; now enforced with UNAVAILABLE-price-safe semantics (a
`null` price is never excluded or treated as `$0`). Also fixed: the UI
layer itself (not just adapters) hardcoded a `$` price prefix in four
render sites regardless of the item's real currency — new shared
`src/lib/format-price.ts` fixes all four. Review-count/shop-age filters
and multi-keyword search confirmed genuinely `NOT_IMPLEMENTED` (not
merely broken) — deliberately not built this pass, a real feature
addition out of scope for a data-contract repair batch. 19 new
deterministic tests, full suite 1,222/1,222 passing. **Launch
classification unchanged: `PRIVATE_BETA_READY`** — the chain still works,
the evidence backing it is now real and richer (esp. Walmart), Amazon's
gap is disclosed rather than hidden. **Not independently re-verified in a
real browser this pass** (no working dashboard credentials in this
session) — flagged as an open follow-up, not claimed as done.

## What's explicitly NOT built yet

- **Cross-listing push/sync logic** — the `CrossListing` data model exists,
  the OAuth write-scope connections exist, but no code actually creates or
  syncs a listing across platforms yet.
- **Webhook registration** — the endpoints exist and verify correctly, but
  they need to be manually registered in Stripe's and PayPal's dashboards
  before a real purchase will actually update someone's plan. **Do this
  before testing a real checkout end-to-end.**
- Safepay/PayFast — checkout logic actually exists (`src/lib/payment-
  providers/{safepay,payfast}-client.ts`, wired into
  `/api/billing/checkout`) — a prior version of this file's claim that
  it was "credential storage only" was stale. What's still missing: a
  lightweight live test-connection ping for either (the admin UI's
  "Test Connection" button only validates required fields are present
  for these two, unlike Stripe/PayPal which do a real API call).
- eBay research connector, category leaderboards, mobile-responsive pass,
  automated backups
- **Production trial-disable**: trial billing was disabled (nulled
  `Package.trialDays`/`trialPriceUsd`) on **staging only** as part of the
  2026-08-17 batch — do the same via `/admin` → Packages on production
  before/when this ships, or production checkout will still show trial
  terms while marketing copy no longer mentions them (a real
  copy/behavior mismatch until done).
- **Discretionary visual redesign** (per-page contextual dark-section
  theming instead of one repeated pattern, a global spacing/typography
  pass) — explicitly scoped out of the 2026-08-17 batch per founder
  direction; the audit found no concrete defects in current
  spacing/typography/button-contrast, just stylistic opinion, so this
  is a "want" not a "broken."
- Real Privacy Policy/Terms pages (still `mailto:` placeholders — a real
  legal gap, not cosmetic)
- Login/register security hardening (disposable-email blocking, device
  fingerprinting, social login) — discussed, not built
- Standalone Shopify App Store listing ("SaltSync") — scoped (name chosen,
  OAuth scopes decided: `read_products,write_products,read_inventory,
  write_inventory,read_locations,read_orders,read_customers`), architecture
  question (shared backend vs. separate) still open, nothing built
- **Google Sheets export** — real Sheets v4 API call exists
  (`src/services/connectors/google-sheets.ts`) but has no UI entry
  point anywhere in the app and no OAuth flow ever requests Sheets
  write scope, so it's unreachable in practice. Was also silently
  fake-succeeding on failure (fixed to report real errors instead —
  see 2026-08-16 completion pass). CSV export covers this need today.
- **Google (login) OAuth admin config** — client ID/secret are env-var
  only, unlike every other integration in this app. Deliberate: making
  it AppSetting-backed would require restructuring NextAuth's
  `authOptions` (currently a static module export) to build per-
  request, a real risk to the most sensitive code path for a
  credential that rarely changes.
- **"App research"** — referenced in the 2026-08-16 master completion
  pass instructions but not defined anywhere in this file or `docs/`.
  Needs founder clarification before anything is built for it.
- **Product Research review-count/shop-age filters and multi-keyword
  search** — confirmed (2026-08-21, Batch 37) genuinely absent from
  `EtsySearchFilters`/the search UI on every marketplace, not merely
  broken. `minPrice`/`maxPrice` filtering was repaired this batch;
  building new filter dimensions or multi-keyword fan-out was
  deliberately out of scope for a data-contract repair pass.
- **Amazon price/rating/per-card-category via `PUBLIC_WEB`** — confirmed
  (2026-08-21, Batch 37) real and correctly parsed whenever Amazon's
  response contains them, but Amazon currently withholds them from
  SellerSalt's honestly self-identifying bot User-Agent specifically
  (verified live, same ASIN, plain-browser UA returns full data). Founder
  decision: keep the honest disclosure. See Lessons Learned #12 before
  touching `compliance.ts`'s `defaultUserAgent`.
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
6. **Public data leak (2026-08-16)**: the unauthenticated `/shops`
   directory page queried `prisma.prospect.findMany()` with **no
   `organizationId` filter at all** — every customer's own paid
   research (specific shops/keywords they searched for) was visible to
   any anonymous visitor, including their competitors. Confirmed as an
   oversight, not a design choice. Fixed by scoping the query to admin-
   owned organizations only (resolved via the `ADMIN_EMAILS` allowlist
   → their org memberships). If a future public "showcase" page pulls
   from `Prospect` again, scope it the same way — never query that
   table without an `organizationId` filter on a route that doesn't
   require a session.
7. **Admin backend/frontend drift**: a recurring pattern found across
   the 2026-08-16 completion pass — Organizations, Packages, and Email
   Settings all had fully real PATCH/POST/test API routes with **zero**
   frontend calling them (Users had neither side). The Payments admin
   tab was worse: entirely hardcoded fake JSX (`••••••••_live_99f2`, a
   permanent "✓ Platform Connected" badge) with no connection to the
   real state already being fetched. When auditing a feature that looks
   done, check both sides independently — a working-looking admin panel
   is not evidence the buttons in it do anything.
8. **Schema-declared-but-never-migrated models** (2026-08-17): three
   tracking models (`ListingWatch`/`ListingSnapshot`/`TrackingAlert`) sat
   in `schema.prisma` with real application code already querying them,
   but no migration had ever created the tables — silently broken in
   both environments until caught during a routine `prisma migrate dev
   --create-only` diff. `npx prisma migrate status` doesn't get run
   habitually enough to catch this on its own; worth a periodic check
   whenever picking up tracking/surveillance work.
9. **`isValid` computed from a narrower source than the value actually
   used** (2026-08-17): the Etsy connect route merged an AppSetting
   client ID correctly but validated a *different*, env-var-only value —
   a general shape to watch for whenever two variables are meant to
   represent "the same" config but are computed by separate code paths.
10. **Local dev DB connection differs from the documented tunnel**: the
    working `.env.local` / this session's `DATABASE_URL` connects
    directly to `94.72.98.206:15432` (staging Postgres), not via an SSH
    tunnel to a `127.0.0.1` port as an earlier session's notes describe.
    Confirmed reachable directly from a local machine — worth verifying
    with the founder whether `15432` is intentionally publicly exposed
    (separate from the documented `5433` production public-port toggle)
    or is a leftover that should be closed, same category as Lesson #4.
11. **Uncommitted cross-session work must be re-verified, not just
    resumed (2026-08-19)**: a prior session had already started the Etsy
    Commercial API compliance remediation and left real, uncommitted
    changes in the working tree — but its edit to `src/lib/auth.ts`'s
    Etsy `userinfo` resolver had accidentally deleted the `token:
    "https://api.etsy.com/v3/public/oauth/token"` line from the
    `getAuthOptions()` provider block (the one actually wired to
    `src/app/api/auth/[...nextauth]/route.ts` — the static `authOptions`
    export still had it, which made the drift easy to miss on a partial
    read). That would have silently broken all Etsy OAuth sign-in. Caught
    only by diffing both Etsy provider blocks side-by-side and noticing
    only one had `token:`. Same category as Lesson #2 (sandbox/session
    drift) — when picking up another session's in-progress uncommitted
    diff, diff every touched block against its sibling/equivalent rather
    than assuming a partial edit was applied consistently everywhere.
12. **Amazon withholds price/rating/per-card-category from SellerSalt's
    disclosed bot User-Agent (2026-08-21)**: `PublicPageFetcher`'s UA
    honestly self-identifies as `"SellerSalt Commerce Research Bot/1.0"`
    (a deliberate prior compliance choice). Batch 37 found — via a
    controlled fetch of the identical live ASIN minutes apart — that
    Amazon serves a real, successful `200` to this UA but strips price
    and per-card rating/reviewCount/category from it, while the same
    request with a plain browser UA (no bot signature) returns full data.
    Product-detail-page fields (brand, seller, category breadcrumb, Best
    Sellers Rank) are *not* affected — only price/rating/per-card-category
    are. This looked, at first, like a parser bug; it was proven to be
    Amazon's own access-control response to bot disclosure instead. Raised
    directly to the founder rather than silently working around it (this
    batch's instructions explicitly prohibited anti-bot evasion on my own
    authority) — founder chose to keep the honest disclosure. If a future
    session is asked to "fix" Amazon's missing price/rating again, check
    this lesson before assuming it's a parser regression — verify with a
    controlled UA A/B fetch first, and treat changing the UA's bot
    signature as a founder decision, not a routine code fix.

## How to work efficiently in this project

- This file is the context — don't re-explain history in chat.
- Batch related features into one patch rather than one file per
  round-trip.
- **Keep this file updated** after any significant session — move
  completed items from "not built yet" into "what's built," and add any
  new operational gotcha discovered. An out-of-date file actively misleads
  future sessions, which is worse than no file at all.
