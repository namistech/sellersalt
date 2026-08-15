Status: Draft
Owner: [ASSUMPTION] Founder (Aliyan)
Last Updated: 2026-08-15
Decision State: Current-state ("Current model") is factual. Target account-type architecture is [LOCKED] (Decision 1, 2026-08-14). Field-level schema for Agency/Institute domain models is [DECISION REQUIRED] — not yet designed or migrated. MCP's dependency on the `Permission` primitive is [LOCKED] (Decision 4, 2026-08-15) — see "MCP and the `Permission` primitive" below. That Affiliate is explicitly NOT a third value on this account-type axis is also [LOCKED] (Decision 5, 2026-08-15) — see "Affiliate is not an account type" below.

# Organizations

> **[LOCKED — Decision 1, 2026-08-14]** SellerSalt will use shared
> identity/organization primitives but **distinct domain models** for
> Agency and Institute — they are not to be forced into one generic
> managed-account model. This document's "Current model" section below
> remains factual (nothing has been built yet). The "Locked target
> architecture" section replaces the earlier gap-analysis/open-framing
> content from before this decision.

## Current model

```
User ──< Membership >── Organization ── Package (plan)
                            │
                            ├─< Connector (nullable orgId — platform-owned when null)
                            ├─< SearchConfig
                            ├─< Prospect
                            ├─< Job
                            ├─< ShopWatch
                            ├─< Invite
                            ├─< SellerChannel
                            ├─< CrossListing
                            └── Subscription (1:1)
```

- `Organization` — `plan` (legacy `Plan` enum: `FREE`/`PRO`/`AGENCY`),
  `packageId` (the real, DB-editable limit source — see
  [product/plans.md](../product/plans.md)). [VERIFY] whether the `Plan`
  enum on `Organization` is still read anywhere or fully superseded by
  `Package` — root `CLAUDE.md` describes `Package` as the source of
  truth; the enum may be a leftover.
- `User` — email/password only (`passwordHash`, bcrypt). No social
  login. A `User` can belong to multiple orgs via multiple `Membership`
  rows, but `authOptions.authorize()` (`src/lib/auth.ts`) picks
  `memberships[0]` as "the" org at login — **today's session model
  effectively assumes one primary org per user**, even though the schema
  allows more.
- `Membership` — `role` is `OWNER` | `ADMIN` | `MEMBER`. Flat: no
  resource-scoped permissions (e.g. "can see billing" vs "can run
  searches"). See [architecture/rbac.md](rbac.md).

Every org, regardless of size or plan, has the identical shape today.
There is no organizational hierarchy, no sub-account, no concept of one
org managing another.

## Two real, intentional accounts (not a bug)

Per root `CLAUDE.md`: `aliyan@sellersalt.com` (org "Seller Salt
Administration", primary admin login, matches `ADMIN_EMAILS`) and
`aliyan@netdrix.com` (org "Anadash", the original account with all
accumulated real data, kept as a demo/tutorial account). This is
operational history, not a modeling pattern to replicate.

## Locked target architecture (Decision 1, 2026-08-14)

Per [product/personas.md](../product/personas.md), Agencies need
employees managing clients with client shops; Institutes need staff
managing cohorts of students with student shops. **The decision is that
these are two distinct domain models built on a shared set of
primitives — not one generic managed-account model.** Nothing below is
implemented in code yet; this section documents the locked shape so
future schema/implementation work builds toward it directly rather than
re-deriving it.

### Shared primitives (used by both domains, and by the rest of the app)

| Primitive | Today | Role in the locked architecture |
|---|---|---|
| `User` | Exists (email/bcrypt) | Unchanged — an Employee, Staff member, or (if given login) a Client/Student is still a `User`. |
| `Organization` | Exists | Unchanged as the tenant root. An Agency org and an Institute org are both `Organization` rows — likely distinguished by a `kind`/`type` discriminator (Individual/Agency/Institute) rather than separate tables, since org-level concerns (billing, plan, subscription) are identical across all three. [VERIFY]/[DECISION REQUIRED]: exact discriminator field, not yet designed. |
| `Membership` | Exists (`role`: OWNER/ADMIN/MEMBER) | Needs to grow — see [architecture/rbac.md](rbac.md). An Employee/Staff `Membership` needs scoped `Permission`s (which Clients/Cohorts they can act on), which today's flat `role` enum can't express alone. |
| `Role` | Does not exist as a distinct model (today it's an enum on `Membership`) | New concept: a named, assignable set of `Permission`s, likely replacing or extending the current `MembershipRole` enum. |
| `Permission` | Does not exist | New concept: fine-grained, resource-scoped grants (e.g. "manage this specific Client," "view this specific Cohort"). This is the mechanism that makes "employee/client permissions" and "student shop oversight" actually enforceable, not just a UI-level filter. |
| `Seat` | Does not exist (closest analog: `Package`'s numeric limit fields, e.g. `maxTrackedShops`) | New concept: an allocatable unit of capacity, needed specifically for Institute seat management (assign/revoke a seat to a specific student, not just cap a count). See [product/plans.md](../product/plans.md) for how this relates to `Package` limits. |
| `Shop` | Closest analog: `SellerChannel` | Generalizes today's `SellerChannel` — a Client Shop and a Student Shop are both, structurally, "a shop belonging to a sub-entity the org manages," which `SellerChannel` (1:1 with `Organization`, no sub-entity owner concept) doesn't support today without an added FK. |
| `ShopConnection` | Closest analog: the OAuth-connected state of a `SellerChannel` | The authenticated-connection concept (credentials, sync state) — likely stays close to today's `SellerChannel` implementation, just needs an owning sub-entity reference added. |
| Activity/Audit | Does not exist | New concept, also independently needed for platform-admin audit logging — see [architecture/rbac.md](rbac.md). Employee/Staff actions on Clients/Students are a natural first consumer once it exists. |

### Agency domain (locked shape)

```
Agency Organization
├── Employees
└── Clients
    └── Client Shops
```

Capabilities (locked): employee management, client management, client
shop management, employee/client permissions, optimization work,
before/after proof reports, PDF/shareable reports. Full detail:
[product/personas.md](../product/personas.md).

### Institute domain (locked shape)

```
Institute Organization
├── Staff
└── Cohorts
    └── Students
        └── Student Shops
```

Capabilities (locked): staff management, cohort management, student
enrollment, student shop oversight, student progress, seat management.
Full detail: [product/personas.md](../product/personas.md).

### Why two models, not one

`Cohort` is the concrete, structural reason. It's a real grouping layer
between Institute and Student with no Agency equivalent — a Client sits
directly under the Agency `Organization`. A single shared model would
force Agency to carry a permanently-unused Cohort concept, or force
Institute's grouping need to be bolted onto a model not designed for it.
Two domain models sharing only the primitives table above avoids both.

### Still open [DECISION REQUIRED] — field-level design, not shape-level

The decision above locks the *domain split* and the *primitive list*.
It does not yet resolve:
1. Exact table/field design for `Client`, `ClientShop`, `Cohort`,
   `Student`, `StudentShop`.
2. Whether Clients/Students get their own `User` login or are
   record-only.
3. Exact `Role`/`Permission` schema (a permissions table, a JSON grant
   list on `Membership`, or something else).
4. Exact `Seat` allocation mechanics (per-cohort assignment vs. org-wide
   cap — see [product/plans.md](../product/plans.md)).
5. The `Organization.kind`/`type` discriminator field name and whether
   Individual/Agency/Institute is an enum or a more extensible
   mechanism.

None of these require a decision before continuing other work — they
require a decision before the first migration in this area is written.

## MCP and the `Permission` primitive

**[LOCKED — Decision 4, 2026-08-15]** External AI agent access (MCP —
[architecture/mcp.md](mcp.md)) is a second, independent motivation
(alongside the Agency/Institute web UI itself) for building the
`Permission` primitive's resource-level scoping as a first-class check,
not an afterthought. An Agency Employee's MCP credential must carry
exactly the Client-scoped permissions that Employee has in the web
app — never the Agency Organization's full client roster by default,
and never derived from a check that only asks "does `organizationId`
match." The same applies to Institute Staff and Cohort scope. This does
not change anything about the domain shape locked above — it's a
downstream consumer of the same `Permission` primitive already required,
now with a second reason it must be resource-scoped from the start. Full
detail:
[architecture/mcp.md §Agency isolation](mcp.md#agency-isolation--the-specific-failure-mode-to-avoid).

## Affiliate is not an account type

**[LOCKED — Decision 5, 2026-08-15]** The future Affiliate Program
([architecture/affiliate.md](affiliate.md)) is **not** a fourth value on
this document's account-type axis (Individual/Agency/Institute) and must
never be modeled as `User.type = AFFILIATE` or an `Organization.kind`
value. It is a separate, orthogonal commercial relationship attached to
`User`. The same applies to the future, unscoped **Partner** relationship
(resolved 2026-08-15 — see
[architecture/affiliate.md §Affiliate vs. Partner vs. Agency vs. Institute](affiliate.md#affiliate-vs-partner-vs-agency-vs-institute)):
never `User.type = PARTNER`, never an `Organization.kind` value, and
independent of Affiliate — a Partner may also be an Affiliate, but
neither implies the other:

```
User
 ├── Account / Organization Membership   (Individual / Agency / Institute)
 ├── Affiliate Relationship               (independent)
 └── Partner Relationship                  (independent, [FUTURE])
```

A `User` can hold an Organization `Membership` (in any of the three
account types above) **and** an `Affiliate` relationship at the same
time — an Agency Owner who is also an Affiliate is unremarkable under
this model, and so is a pure Affiliate with **no** Organization
Membership at all (the concrete reason this can't be an `Organization`-
level attribute — there may be no Organization to attach it to). This
reuses the same "`User` stays the one identity primitive, new concepts
attach to it rather than branching it" principle this document already
applies to Employee/Staff/Client/Student. Full detail:
[architecture/affiliate.md §Core architectural principle](affiliate.md#core-architectural-principle--affiliate-is-not-an-account-type).

## What does NOT need to change

`Connector` (platform-wide research) is orthogonal to all of the above —
Agencies and Institutes still just query platform-owned Etsy research
data like any other org. Only `SellerChannel`-related (customer's own
store) and permission-related modeling needs to grow.
