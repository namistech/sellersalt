Status: Draft
Owner: [ASSUMPTION] Founder (Aliyan)
Last Updated: 2026-08-15
Decision State: Factual — describes current code. "Service layer
terminology" below is a documentation-hygiene clarification (not a new
architecture decision) resolving a naming collision found during the
Final Architecture Reconciliation pass.

# System Architecture

## Stack

Next.js 15.5.22 (App Router), TypeScript, Prisma 5.22.0 (client pinned to
`^5.20.0` in `package.json` — **always run `npx prisma@5.22.0`** per root
`CLAUDE.md`, unpinned `npx prisma` resolves to latest and breaks against
this schema), NextAuth v4 (JWT sessions, credentials provider only —
see [security/security-model.md](../security/security-model.md)), BullMQ +
Redis (`ioredis`), Tailwind (CSS-variable dark mode), Recharts v3,
lucide-react, nodemailer v7, Stripe SDK, PayPal via direct REST (no SDK).

## Process topology

Two runtime processes share one Postgres database and one Redis instance:

1. **Web** (`next start`, `HOSTNAME=0.0.0.0` required at runtime — see
   root `CLAUDE.md` Lessons Learned) — Next.js App Router, serves both
   the marketing site and the authenticated app, and all `src/app/api/*`
   routes.
2. **Worker** (`tsx src/workers/index.ts`, `npm run worker`) — BullMQ
   consumer. Runs marketplace searches (`Job`) and scheduled shop
   snapshots (`ShopWatch` → `ShopSnapshot`) off the request path.

Both are deployed as separate Coolify applications per environment
(`sellersalt:main-web` / `sellersalt:main-worker` in production,
`sellersalt-staging-web` / `sellersalt-staging-worker` in staging — see
root `CLAUDE.md` for exact UUIDs/domains).

## Route groups

- `src/app/(auth)/*` — login, signup (now redirects into checkout — see
  [billing/billing-lifecycle.md](../billing/billing-lifecycle.md)),
  forgot/reset password, accept-invite. Unauthenticated.
- `src/app/(dashboard)/*` — the authenticated app. `dashboard`,
  `prospects`, `spy` (+ `spy/tracked`), `trends`, `inactive`,
  `favorites`, `connectors`, `jobs`, `settings` (+ `billing`,
  `channels`, `profile`, `team`), `shops/[shopExternalId]`, `analytics`
  (admin-only), `admin` (admin-only). Layout composes `Sidebar`
  (`src/app/(dashboard)/sidebar.tsx`) which branches nav items on
  `isAdmin`.
- `src/app/checkout/*` — public checkout/signup-merged page (see
  [billing/billing-lifecycle.md](../billing/billing-lifecycle.md)).
- `src/app/api/*` — all backend routes; mirrors the dashboard route
  groups plus `auth`, `webhooks/{stripe,paypal}`, `admin/*`, `health`.
- `src/app/page.tsx` — marketing homepage (own scoped CSS, see
  [design/design-system.md](../design/design-system.md)).

## Domain module layout

- `src/connectors/` — marketplace research connectors (Etsy today).
  `types.ts` defines the `MarketplaceConnector` contract,
  `registry.ts` maps `ConnectorType` → implementation. See
  [architecture/marketplace.md](marketplace.md).
- `src/seller-channels/` — customer's-own-store connectors (Shopify,
  WooCommerce, Etsy-seller). `types.ts` defines
  `SellerChannelConnector`, `registry.ts` maps platform → implementation.
  Deliberately a **separate interface and registry** from
  `src/connectors/` — see [architecture/marketplace.md](marketplace.md)
  for why these are not collapsed into one generic connector.
- `src/lib/` — cross-cutting services: `auth.ts` (NextAuth config),
  `db.ts` (Prisma client singleton), `encryption.ts` (credential
  encryption at rest), `app-settings.ts` (generic admin config
  key-value store), `plan-limits.ts`, `require-admin-org.ts` /
  `is-admin.ts` (admin gating), `queue.ts` (BullMQ setup),
  `competition-scoring.ts`, `subscription.ts`, `coupons.ts`,
  `send-email.ts`, `sync-seller-channel.ts`,
  `payment-providers/` (Stripe/PayPal client + credential resolution).
- `src/workers/index.ts` — BullMQ worker entrypoint.

## Service layer terminology — two distinct things, same phrase

**[LOCKED — documentation hygiene fix, 2026-08-15]** "Service layer" had
drifted into naming three different things across
[design/frontend-execution-plan-v1.md §27](../design/frontend-execution-plan-v1.md#27-backend-integration-boundary),
the real `src/services/` directory (built in the Application Shell
task), and [architecture/mcp.md](mcp.md)'s proposed shared business-
logic boundary. This section is the canonical distinction; every other
document should link here rather than re-defining the term.

### 1. Frontend Data/Service Adapter (client-side, partially real today)

The layer components call to read data, without knowing or caring
whether that data is mocked or real:

```
Components → UI state → Frontend Data/Service Adapter → Mock implementation OR real implementation
```

- **Where it lives**: `src/services/*.ts` (e.g. `services/prospects.ts`,
  `services/session.ts`). **Already real, but narrower than originally
  planned**: the Application Shell task built `src/services/types.ts`,
  `navigation.ts`, `session.ts`, and `mock/workspace.ts` for workspace/
  navigation context specifically — via direct function calls
  (`buildRealWorkspaceContext()` in the real dashboard layout,
  `MOCK_*_CONTEXT` imported directly in `/dev/shell/*` demo pages),
  **not** the unified `NEXT_PUBLIC_DATA_MODE`-driven env switch
  [design/frontend-execution-plan-v1.md §27](../design/frontend-execution-plan-v1.md#27-backend-integration-boundary)
  documents (confirmed: that env var does not exist anywhere in the
  repo). Every other frontend-simulator data domain (prospects, shops,
  billing, intelligence, reports) described in that section is still
  **[FUTURE]** — not built yet, and when built, should either follow the
  documented per-service env-switch convention or that convention should
  be revised to match the simpler direct-call pattern actually used so
  far. **[DECISION REQUIRED]** which direction reconciles this — not
  decided here, only named so the drift doesn't compound as more
  services get added.
- **Purpose**: let the frontend simulator (and, later, the real app) be
  built against a stable, typed contract regardless of whether a real
  backend exists yet for that data domain — the mock/real swap-in
  mechanism [design/frontend-execution-plan-v1.md §27](../design/frontend-execution-plan-v1.md#27-backend-integration-boundary)
  describes in full.
- **Scope**: client-facing. Never itself the source of business logic —
  it either reads a mock module or calls a real API route, it does not
  compute intelligence/scoring/eligibility itself.

### 2. Backend Domain Services (server-side, not built yet)

The layer a future Web UI route handler, the SellerSalt AI Assistant,
and SellerSalt MCP would **all** call into for actual business logic —
named and required by [architecture/mcp.md §The three consumers of one
service layer](mcp.md#the-three-consumers-of-one-backend-domain-services-layer), but
**explicitly not implemented in any pass to date**. This is a distinct
concern from the Frontend Data/Service Adapter above — different code,
different side of the network boundary, different purpose (computing
results vs. fetching/caching them for a component).

```
                    SellerSalt Backend Domain Services
                    /              |               \
               Web UI route     SellerSalt AI      MCP tool
               handlers          Assistant tools    handlers
```

- **What it should be**: a named boundary between "route handler" and
  "domain logic" — e.g. a function like `searchProspects(orgId, filters)`
  or (once built) `getShopHealth(shopId)` that a Next.js API route, an
  AI Assistant tool, and an MCP tool all call identically, rather than
  each reimplementing the query/scoring logic. Today's closest real
  analog is partial: `connectorRegistry.ETSY.runSearch()` and
  `competition-scoring.ts` (see [Data flow — research
  pipeline](#data-flow--research-pipeline-current-etsy-only) above) are
  already callable independent of any specific route handler, but
  nothing enforces that shape for new features, and no dedicated
  `src/services/` (backend sense) or `src/domain/` directory exists.
- **Not implemented**: no code, module, or convention for this exists
  today. **This document does not implement it now** — only names and
  locates the requirement, per [architecture/mcp.md](mcp.md)'s own
  explicit deferral ("[DECISION REQUIRED]: whether this is a formal
  refactor... or an incremental discipline applied only to new code
  going forward").
- **Naming, to avoid re-colliding with #1**: when this boundary is
  eventually built, it should **not** be placed at `src/services/` (that
  path is already claimed by the Frontend Data/Service Adapter above,
  and is client-importable code today). A distinct location — e.g.
  `src/domain/` or `src/server/services/` — is recommended so the two
  concepts never share a directory, but the exact path is
  **[DECISION REQUIRED]**, not locked by this document.

### Which docs mean which

| Document | Means |
|---|---|
| [design/frontend-execution-plan-v1.md §27](../design/frontend-execution-plan-v1.md#27-backend-integration-boundary) | Frontend Data/Service Adapter (#1) |
| Real `src/services/*.ts` | Frontend Data/Service Adapter (#1), workspace/nav scope only so far |
| [architecture/mcp.md §The three consumers of one Backend Domain Services layer](mcp.md#the-three-consumers-of-one-backend-domain-services-layer) | Backend Domain Services (#2) |
| [architecture/ai.md §Relationship to SellerSalt MCP](ai.md#relationship-to-sellersalt-mcp) | Backend Domain Services (#2) |

## Data flow — research pipeline (current, Etsy-only)

```
User creates SearchConfig (keywords, price/age/review filters)
  → Job enqueued (BullMQ) on submit or scheduleCron
  → worker calls connectorRegistry.ETSY.runSearch(credentials, config)
  → results written as Prospect rows (one per shop×listing×keyword run)
  → dashboard reads Prospect via search/filter/sort queries
  → competition-scoring.ts computes Difficulty/Demand badges client-/server-side from raw Prospect fields
```

Note: scoring reads `Prospect` fields (which are Etsy-shaped) directly —
there is no normalization layer today. This is the specific gap the
brief asks to be planned for. See [architecture/marketplace.md](marketplace.md).

## Data flow — shop tracking

```
User tracks a shop (from Prospects or a cold "Spy on Competitor" lookup)
  → ShopWatch row created, BullMQ repeatable job scheduled
  → worker calls connector.getShopStats() on schedule
  → ShopSnapshot appended
  → shop detail page renders the snapshot series as a sales-trend graph
```

## Data flow — seller channel sync (admin-only)

```
Admin connects a SellerChannel via OAuth (Shopify/WooCommerce) or PKCE (Etsy-seller)
  → credentials encrypted, stored on SellerChannel
  → src/lib/sync-seller-channel.ts fetches orders via SellerChannelConnector.fetchRecentOrders()
  → SellerOrder rows written
  → Analytics dashboard renders per-store, per-currency (never blended)
```

## Cross-references

- [architecture/data.md](data.md) — full data model walkthrough
- [architecture/marketplace.md](marketplace.md) — connector architecture
  and the normalization-layer gap
- [architecture/organizations.md](organizations.md) — tenancy model
- [architecture/billing.md](billing.md) — billing system architecture
- [security/security-model.md](../security/security-model.md) — auth,
  encryption, admin gating
