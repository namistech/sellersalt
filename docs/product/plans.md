Status: Draft
Owner: [ASSUMPTION] Founder (Aliyan)
Last Updated: 2026-08-15
Decision State: Current-state factual; future tiering [DECISION
REQUIRED]. Feature-gated capabilities (previously an open gap, below)
now have a locked forcing function — MCP access — see "Future
direction" below and [architecture/mcp.md](../architecture/mcp.md).

# Plans

## Current state

Plans are the `Package` model (`prisma/schema.prisma`), admin-editable,
enforced via `checkLimit()` in `src/lib/plan-limits.ts`. Three tiers seed
automatically and idempotently on first use (`ensureDefaultPackages()`):

| Key | Name | Price/mo | Trial | Connectors | Search configs | Scheduled searches | Tracked shops | Prospects/mo | Seller channels |
|---|---|---|---|---|---|---|---|---|---|
| `STARTED` | Started | $19 | 3 days @ $1 | 2 | 5 | 2 | 10 | 500 | 1 |
| `PRO` | Pro | $49 | 3 days @ $1 | 3 | 20 | 10 | 50 | 5,000 | 5 |
| `AGENCY` | Agency | $199 | 3 days @ $1 | 10 | 100 | 50 | 250 | 50,000 | 25 |

Notes:
- All defaults are seed values only — actual live pricing/limits are
  whatever's currently in the `Package` table via `/admin`; **do not treat
  the table above as live pricing**, it's the code-defined fallback.
  [VERIFY] current live values against `/admin` before quoting a price
  anywhere customer-facing.
- Every current plan uses a real trial charge (not $0) as both a card-
  verification step and a genuine trial fee, converting to full price
  automatically when the trial ends (`Package.trialDays` /
  `trialPriceUsd`).
- `isCustom` rows are one-off overrides an admin assigns to a specific
  org (special deals, beta customers) — not shown on the public
  pricing/checkout page (`src/app/checkout/page.tsx` only queries
  `STARTED`/`PRO`/`AGENCY`).
- The "AGENCY" key/name is a **pricing tier name only** today — it does
  not grant the multi-employee/multi-client structural capabilities
  described in [product/personas.md](personas.md). Now that the Agency
  *domain model* is locked (Decision 1, 2026-08-14 — see
  [architecture/organizations.md](../architecture/organizations.md)),
  this naming collision needs an explicit resolution before both ship:
  is `Package` key `AGENCY` the pricing tier that an Agency-type
  `Organization` is expected to be on, or an unrelated coincidence that
  should be renamed to avoid confusion (e.g. `PRO_PLUS`)? [DECISION
  REQUIRED]

## Limit dimensions enforced today

From `checkLimit()`: `connectors`, `searchConfigs`, `scheduledSearches`,
`trackedShops`, `prospectsThisMonth`, `sellerChannels`. Each returns
`{ allowed, limit, current }`; callers reject the action if `!allowed`.

## Future direction — not built

- **Seat limits for Institute cohorts/students** — no `maxStudents` /
  seat-allocation concept exists yet. The `Seat` primitive is now a
  **[LOCKED]** part of the shared-primitives set (Decision 1 — see
  [architecture/organizations.md](../architecture/organizations.md)),
  but how it plugs into `Package`/limit-checking is still [DECISION
  REQUIRED]: a new `Package` limit field (same pattern as
  `maxTrackedShops`) if seats are just a cap, or a genuinely new
  allocation model if seats need per-cohort assignment (see
  [product/personas.md](personas.md)).
- **Per-employee or per-client limits for Agencies** (e.g. "Pro-Agency
  includes 5 client shops") — same dependency, same `Seat` primitive.
- **Feature-gated tiers** (not just numeric limits) — e.g. AI assistant
  access, PDF reports, only on higher tiers. Nothing in the current
  `Package` shape supports boolean feature flags per tier; would need a
  schema addition (a `features: String[]` or per-feature boolean set).
  [DECISION REQUIRED] on the exact schema shape — but the *need* for
  this mechanism is now **[LOCKED]** (Decision 4, 2026-08-15): MCP
  access (`mcp_access`) must be gated as a capability, is available only
  on eligible premium plan(s), and cheaper plans do not receive it
  initially — never a hardcoded plan-key check in code. This is the
  concrete first consumer of the capability model this bullet already
  named as a gap; building it for MCP should serve `ai_assistant`/
  `reports`/etc. too. Which specific `Package` key(s) count as "eligible
  premium" remains undecided. Full detail:
  [architecture/mcp.md §Commercial model](../architecture/mcp.md#commercial-model--capability-based-entitlement).
- **Monthly vs. annual billing** — `Package.priceUsd` is a single number
  with no billing-interval field. See
  [billing/billing-lifecycle.md](../billing/billing-lifecycle.md).
  [DECISION REQUIRED]
