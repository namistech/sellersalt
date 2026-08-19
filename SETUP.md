> **PARTIALLY SUPERSEDED (2026-08-19).** This document predates the
> SellerSalt rebrand (still says `anadash-web`/`anadash.netdrix.com` —
> the actual Coolify resources were renamed; see root `CLAUDE.md`'s
> "Repo & deployment" section for the current resource names, UUIDs, and
> domains) and predates the marketplace abstraction (its "Adding
> marketplace #2" section describes the old `src/connectors/registry.ts`-
> only pattern — see `docs/SELLERSALT-MARKETPLACE-ARCHITECTURE.md` "How
> to add a new marketplace" for the current process instead). The general
> Coolify deployment shape (Postgres + Redis + separate web/worker
> resources, migrate-on-deploy) is still directionally correct. For
> current infrastructure specifics, always defer to root `CLAUDE.md`.

# Deploying SellerSalt on Coolify

SellerSalt runs as **three Coolify resources** under one project, plus your Etsy API
key from the app you already submitted for review:

1. **Postgres** — Coolify-managed Database resource
2. **Redis** — Coolify-managed Database resource
3. **`anadash-web`** — the Next.js dashboard (Application, `docker/Dockerfile.web`)
4. **`anadash-worker`** — the BullMQ job processor (Application, `docker/Dockerfile.worker`)

Web and worker are deliberately separate services: a slow or failed Etsy scrape
run never blocks or slows down someone loading the dashboard, and you can scale
or restart them independently.

## 1. Push this repo

Push the `anadash/` folder to a Git repo Coolify can pull from (same pattern as
your other Netdrix Coolify apps).

## 2. Create the databases

In Coolify: **New Resource → Database → PostgreSQL**, and separately **New
Resource → Database → Redis**. Note the internal connection strings Coolify
gives you — they typically look like:

```
postgresql://<user>:<pass>@<service-name>:5432/<db>
redis://<service-name>:6379
```

Use the **internal** hostnames (not public URLs) since web/worker will talk to
these over Coolify's internal network.

## 3. Create `anadash-web`

- **New Resource → Application → Dockerfile**, point at this repo, set
  Dockerfile path to `docker/Dockerfile.web`.
- **Domain:** `anadash.netdrix.com` (point your DNS A record at the VPS if you
  haven't already).
- **Port:** 3000.
- **Environment variables** (mark secrets accordingly):

  ```
  DATABASE_URL=<internal postgres URL from step 2>
  REDIS_URL=<internal redis URL from step 2>
  NEXTAUTH_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))">
  NEXTAUTH_URL=https://anadash.netdrix.com
  ENCRYPTION_KEY=<generate the same way, a different value>
  ```

- **Post-deploy command / entrypoint:** run migrations once on first deploy
  (and on every deploy after schema changes):

  ```
  npx prisma migrate deploy
  ```

  Coolify lets you set this as a "Pre-deployment command" or you can run it
  once manually via Coolify's terminal into the container after first deploy.

## 4. Create `anadash-worker`

- **New Resource → Application → Dockerfile**, same repo, Dockerfile path
  `docker/Dockerfile.worker`.
- **No domain/port needed** — this is a background process, not web-facing.
- **Environment variables:** same `DATABASE_URL`, `REDIS_URL`, and
  `ENCRYPTION_KEY` as web (the worker decrypts connector credentials to run
  jobs, so it needs the same key). It does **not** need `NEXTAUTH_SECRET` or
  `NEXTAUTH_URL`.

## 5. First run

1. Deploy `anadash-web`, wait for it to build, run `prisma migrate deploy`
   once against it.
2. Deploy `anadash-worker`.
3. Visit `https://anadash.netdrix.com`, sign up (creates your workspace).
4. Go to **Connectors → Add connector**, paste your Etsy Keystring once your
   SellerSalt app is approved.
5. Go to **Prospects → New search**, define keywords/price/filters, save, hit
   **Run now**. Watch progress on the **Jobs** page — the worker picks it up
   off the Redis queue within seconds.

## Generating your first Prisma migration

Since the schema is new, you need an initial migration before `migrate deploy`
has anything to apply. Do this once, locally or in a Coolify terminal session
with `DATABASE_URL` pointed at your real Postgres:

```
npx prisma migrate dev --name init
```

Commit the generated `prisma/migrations/` folder to the repo — `migrate deploy`
in production only *applies* existing migrations, it doesn't generate new ones.

## Notes

- **Scheduled runs:** `SearchConfig.scheduleCron` exists in the schema but
  isn't wired up yet — right now all runs are "Run now" (user-triggered). Add
  a BullMQ repeatable job when a `SearchConfig` is saved with a cron string,
  as the next increment.
- **Data honesty:** Etsy's public API doesn't expose lifetime sales counts.
  "Review Ratio" and "Review Velocity" in the dashboard are proxy signals from
  review volume — real, documented fields, but not a stand-in for verified
  sales. This caveat is shown directly in the Prospects page UI.
- **Adding marketplace #2:** write a new file under `src/connectors/<name>/`
  implementing the `MarketplaceConnector` interface (`src/connectors/types.ts`),
  register it in `src/connectors/registry.ts`, add the enum value to
  `ConnectorType` in `prisma/schema.prisma`, migrate. Nothing else in the app —
  jobs, worker, dashboard — needs to change.
