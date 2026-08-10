# CLAUDE.md — Anadash Project Context

Read this file fully before doing anything else in this project. It replaces
needing to re-explain context every session.

## What this is

A SaaS product-hunting tool for Etsy (eBay planned) sellers/dropshippers, now
expanding into a second pillar: connecting customers' own WooCommerce/Shopify
stores for real order analytics and (later) cross-listing.

**Repo:** `namistech/anadash` (private) — auto-deploys `main` via Coolify
**Live:** https://anadash.netdrix.com (domain will change later — code reads
`NEXTAUTH_URL` rather than hardcoding it, so a domain swap is a one-line env
var update)

## Stack

Next.js 15.5.22 (App Router), TypeScript, Prisma 5.22.0 (**pinned** — `npx
prisma` unpinned resolves to latest, breaks against this schema format),
NextAuth (JWT), BullMQ + Redis, Tailwind (CSS-variable dark mode), Recharts
v3, lucide-react, nodemailer v7 (pinned — v9 conflicts with next-auth's
optional peer dependency).

## Non-negotiable workflow rules

1. **Before any edit**, view the real file from disk — never trust a
   "remembered" version. Files drift between sessions/tools. Compare an
   md5sum against what you're about to edit if unsure.
2. **Before any commit**, run `npx tsc --noEmit` and fix everything. Run
   `npx next build` as a second check for nontrivial changes.
3. **Schema changes need `npx prisma generate` first**, or tsc gives false
   type errors that look like real bugs but aren't.
4. **Any schema change needs a real migration**, run manually:
   - Temporarily enable Postgres's public port in Coolify
   - Get the connection string, run `npx prisma migrate dev --name X`
     against it
   - Immediately disable the public port again — never leave it open
5. Production migrations for `anadash-web` also run automatically via a
   Coolify post-deployment command (`npx prisma@5.22.0 migrate deploy`) on
   every push — the manual step above is only for *generating* the
   migration locally.
6. **JSX gotcha**: some editor/clipboard flow has repeatedly stripped opening
   `<a` tags when followed by attributes on the next line. If a build throws
   a JSX parse error after a patch, check for orphaned `href=`/`target=`
   props with no `<a` above them.
7. **Config/credentials belong in `/admin` → Site settings (`AppSetting`
   table), not hardcoded in code.** If a new feature needs an API key, a
   link, or any admin-editable value, add it to `SETTING_DEFINITIONS` in
   `src/lib/app-settings.ts` rather than a constant in a component or an env
   var — this was a deliberate architecture fix after hardcoding a few
   things early on.

## Architecture — key things to know before touching code

- **Platform-owned connectors** (`Connector` model): `organizationId` is
  nullable — `null` means shared by every customer (the normal case), non-
  null means an org brought its own key (opt-in). `getActiveConnectorWithCredentials()`
  in `src/lib/get-active-connector.ts` checks org-owned first, falls back to
  platform.
- **Seller channels** (`SellerChannel`/`SellerOrder` models) — **completely
  separate system from Connector.** Connector is platform-wide research data
  (shared). SellerChannel is one specific customer's own authenticated store
  (their own credentials, their own orders). Never conflate these even
  though both may reference "Shopify" or "Etsy." Powers the Analytics
  dashboard now, Cross-Listing later. Interface in
  `src/seller-channels/types.ts`, registry in `src/seller-channels/registry.ts`.
  - WooCommerce is live, connected via WooCommerce's own built-in
    app-authorization redirect flow (`/wc-auth/v1/authorize`) — the customer
    approves on their own site, WooCommerce POSTs credentials directly to
    our callback. No manual key copying.
  - Shopify is in progress — needs a registered Shopify Partner **Public
    app** (not Custom app — custom apps only connect to one store). Client
    ID/Secret go in `/admin` → Site settings, not hardcoded, not pasted into
    chat.
  - Analytics dashboard (`/analytics`) is deliberately currency-aware —
    revenue is shown per-store in its own currency, never blended into one
    misleading total across different currencies.
- **Package/limits system**: `Package` model, DB-editable, enforced via
  `checkLimit()` in `src/lib/plan-limits.ts` on every resource-creation
  route, including `sellerChannels` now. Admin manages via `/admin`.
- **App settings** (`AppSetting` model, new): generic key-value store for
  admin-editable config — affiliate links, order-form URLs, platform app
  credentials. Encrypted at rest when marked secret. `src/lib/app-settings.ts`
  has the `SETTING_DEFINITIONS` list — add a line there for any new
  configurable value, no migration needed for new *values*, only for new
  *fields* if you outgrow the generic key-value shape.
- **Two separate scoring axes** in `src/lib/competition-scoring.ts` — do not
  conflate: **Difficulty** (age, lifetime sales, reviews, listings,
  favorites) green=weak/easy, red=entrenched/avoid. **Demand** (sales
  velocity, sell-through) green=strong proven demand, red=weak — inverted
  color meaning, uses `demandMeta` not `levelMeta`. "Competition Rating"
  aggregate uses only the difficulty family.
- **Dark mode**: CSS-variable-based (`globals.css` `:root`/`.dark`), not
  per-component classes — new pages get it for free using existing tokens
  (`text-ink`, `bg-surface`, `bg-paper`, `border-line`, `text-muted`).
- **Marketing homepage** has its own separate design system, scoped under
  `.anadash-marketing` in `src/app/marketing.css` — never touches the
  dashboard's tokens. Pricing pulls live from the real `Package` table.
- **Admin gate**: `ADMIN_EMAILS` env var (comma-separated allowlist), not a
  real role system.
- **SMTP**: admin-configurable via `/admin`, generic, degrades gracefully
  (`{sent: false, reason}`) rather than throwing when unconfigured.

## What's built (don't rebuild these)

Etsy connector, scheduled searches, Trends, Dropped-shops, shop detail pages
(live-fetched, work cold via Spy on Competitor), sales tracking, long-tail
keyword extraction, CSV export (Prospects/Trends/Dropped-shops), pagination,
dark mode, sidebar/topbar, dashboard charts, Package/limits/admin system,
platform connectors, payment provider credential storage (Stripe/PayPal/
Safepay/PayFast — credentials + activation only, no live checkout), profile
settings, password reset, team invites, scheduled-search email
notifications, public marketing homepage, WooCommerce seller-channel
connection (real app-authorization flow, no manual keys) with order sync and
a currency-aware Analytics dashboard, generic admin-editable Site settings
system.

## What's explicitly NOT built yet

- Shopify seller-channel connection — waiting on a registered Partner app
  (Public app) and its Client ID/Secret, to go in `/admin` → Site settings
  once available.
- Live payment checkout — all four providers now have real credentials from
  the founder. Still real, careful, sequenced work (shared subscription/
  webhook framework built once, each provider plugged in), not a single
  patch.
- Cross-listing (push listings Etsy ↔ Shopify ↔ WooCommerce) — the
  SellerChannel foundation this needs already exists; the actual push/field-
  mapping logic doesn't yet.
- Chrome extension, AI assistant, eBay research connector, category
  leaderboards, audit log, mobile-responsive pass, automated backups, real
  Privacy Policy/Terms pages (still `mailto:` placeholders on the homepage —
  real legal gap), login/register security hardening (disposable-email
  blocking, device fingerprinting, social login).

## Known scaling constraint (not solved, just flagged)

Every customer shares one Etsy Personal Access connector (5 req/sec, 5,000
requests/day total, combined across all customers).

## How to work efficiently in this project

- Don't paste large context blocks into chat — this file + reading the real
  code covers it.
- Batch related features into one patch rather than one file per round-trip.
- **Keep this file updated.** After a significant session, ask Claude to
  move what changed from "not built yet" into "what's built" here. That's
  what keeps future sessions cheap — an out-of-date file is worse than no
  file, since it actively misleads.
