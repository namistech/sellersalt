# SellerSalt

Ecommerce intelligence platform. Product research, keyword research,
market/demand/competition signals, listing SEO auditing, and AI-assisted
listing generation — built on a marketplace-agnostic architecture where
Etsy, Shopify, WooCommerce, Amazon, eBay, and TikTok Shop are connectors
into one shared intelligence layer, not the identity of the app.

Etsy is the only marketplace with a fully live integration today. See
`docs/MARKETPLACE-INTEGRATION-MATRIX.md` for the exact, current,
code-verified status of every marketplace.

## Architecture at a glance

```
Dashboard UI
  -> Intelligence layer (scoring, SEO audit, AI generation, keyword/category research)
  -> Marketplace abstraction (src/marketplaces/core/ — registry, capabilities, canonical types)
  -> Marketplace connectors (src/marketplaces/<id>/ — one per marketplace)
  -> External marketplace APIs
```

Full detail: `docs/SELLERSALT-ARCHITECTURE.md` (canonical) and
`docs/SELLERSALT-MARKETPLACE-ARCHITECTURE.md` (marketplace layer deep-dive).

## Tech stack

Next.js 15 (App Router) · TypeScript · Prisma 5.22.0 (pinned — always use
`npx prisma@5.22.0`, an unpinned `npx prisma` resolves to latest and
breaks against this schema) · PostgreSQL · NextAuth (JWT) · BullMQ + Redis
· Tailwind CSS · Recharts · Stripe + PayPal (direct REST, no PayPal SDK).

## Local setup

```bash
npm install
cp .env.example .env.local   # if present — otherwise ask for the working env values
npx prisma@5.22.0 generate
```

Required environment variables (see `src/lib/db.ts`, `src/lib/auth.ts`,
and `.env.local` if you have access to a working copy — do not invent
values): `DATABASE_URL`, `REDIS_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`,
`ENCRYPTION_KEY`, plus Etsy/Google OAuth credentials for the features that
need them (many are DB-driven via `/admin` → Site Settings instead of env
vars — see `src/lib/app-settings.ts`).

`DATABASE_URL` should point at a **staging** database for local
development — never point local dev at a production connection string.

## Development commands

```bash
npm run dev              # start the Next.js dev server
npm run worker           # start the BullMQ background worker (separate process)
npx prisma@5.22.0 generate       # regenerate the Prisma client after any schema change
npx prisma@5.22.0 migrate dev    # create + apply a new migration
npx prisma@5.22.0 migrate deploy # apply pending migrations (what runs in production)
npx prisma@5.22.0 studio         # browse the database
```

## Test / validation commands

Run all of these before considering any change complete:

```bash
npx tsc --noEmit                                              # typecheck
npx prisma@5.22.0 validate                                    # schema syntax
npx prisma@5.22.0 migrate status                               # pending migrations
npx tsx --env-file=.env.local --test src/tests/*.test.ts       # full test suite
npx next build                                                 # production build
```

(`npm test` alone only runs one launch-readiness test file — use the
`test:all` script or the direct `tsx` command above for the real suite.)

## Documentation

Start here, in order:

1. **`docs/SELLERSALT-HANDOFF.md`** — fastest practical orientation for a new agent/developer
2. **`AGENTS.md`** — non-negotiable engineering rules for anyone (human or AI) working in this repo
3. **`docs/SELLERSALT-ARCHITECTURE.md`** — canonical architecture
4. **`docs/MARKETPLACE-INTEGRATION-MATRIX.md`** — current per-marketplace capability status
5. **`docs/SELLERSALT-MARKETPLACE-ARCHITECTURE.md`** — marketplace connector layer deep-dive
6. **`docs/SELLERSALT-ROADMAP.md`** — what's next, phase by phase
7. **`docs/CHANGELOG.md`** — how the architecture evolved and why
8. **`docs/SELLERSALT-ARCHITECTURE-AUDIT.md`** — Etsy compliance forensic audit (historical)
9. Root **`CLAUDE.md`** — infrastructure/deployment specifics (Coolify, servers, DNS, incident history)

The `docs/00-*` through `docs/26-*` numbered specifications and
`docs/architecture/`, `docs/design/`, `docs/product/` folders are an
earlier, more granular planning-document series. Several are now
historical (superseded by the documents above); a few still contain
actively stale information and carry their own superseded-notices at the
top. When a numbered spec and the canonical docs above disagree, trust the
canonical docs — and trust the code over both if something still seems
inconsistent.
