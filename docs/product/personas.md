Status: Draft
Owner: [ASSUMPTION] Founder (Aliyan)
Last Updated: 2026-08-14
Decision State: Account-type architecture is [LOCKED] (Decision 1, 2026-08-14 — see MASTER_BLUEPRINT.md); schema/field-level design for Agency and Institute is [DECISION REQUIRED]; nothing in this area is implemented in code yet

# Personas / Account Types

> **[LOCKED — Decision 1, 2026-08-14]** SellerSalt uses shared identity/
> organization primitives (`User`, `Organization`, `Membership`, `Role`,
> `Permission`, `Seat`, `Shop`, `ShopConnection`, Activity/Audit
> concepts) but **distinct domain models** for Agency and Institute —
> they are not to be forced into one generic managed-account model. Full
> rationale and structure: [architecture/organizations.md](../architecture/organizations.md).
> This locks the *shape* of the decision; field-level schema for each
> domain model is still open — see that document's "Still open"
> section.

## Individual Sellers — Starter / Pro

**Current support: full.** This is the only account shape that exists
today. One `User`, one `Membership` (role `OWNER`), one `Organization`.
The `Plan` enum (`FREE`/`PRO`/`AGENCY`) and `Package` model already carry
"AGENCY" as a plan *name*, but nothing in the data model gives an AGENCY-
plan org employees, clients, or client shops — it's priced/limited
differently, not structurally different. See
[architecture/organizations.md](../architecture/organizations.md).

- **Who**: A solo Etsy seller or an aspiring seller doing product research
  before launching a shop.
- **What they need from SellerSalt today**: search, shop tracking,
  favorites, trends, dropped-shops, scheduled alerts.
- **Starter vs Pro**: differentiated purely by `Package` limits
  (`maxConnectors`, `maxSearchConfigs`, `maxTrackedShops`,
  `maxProspectsPerMonth`, etc. — see `src/lib/plan-limits.ts`), not by
  feature gating. [VERIFY] whether any *feature* (not just limit)
  differs between Starter and Pro in the current UI — not confirmed in
  this pass.

## Agencies — owner / employees / clients / client shops

**Current support: none in code.** Domain shape is **[LOCKED]** (Decision
1); implementation not started.

```
Agency Organization
├── Employees
└── Clients
    └── Client Shops
```

- **Who**: An agency org owner who has employees; employees manage
  clients; clients have their own shop(s) that the agency researches/
  optimizes on their behalf.
- **Locked capabilities** (Decision 1): employee management, client
  management, client shop management, employee/client permissions,
  optimization work, before/after proof reports, PDF/shareable reports.
- **Built from shared primitives, not a bespoke identity system**: an
  Employee is a `User` + `Membership` (with a `Role`/`Permission` set
  scoped to which Clients they can act on) inside the Agency
  `Organization`. A Client Shop is a `Shop`/`ShopConnection` (the
  general forms of today's `SellerChannel`) associated with a Client
  record. This is the specific way Decision 1's "shared primitives"
  list applies to the Agency domain — see
  [architecture/organizations.md](../architecture/organizations.md) for
  the full primitive-to-domain mapping.
- **Still open** [DECISION REQUIRED] (field-level, not shape-level):
  1. Does a Client get their own login (a `User`), or is the agency's
     employee the only login and Clients are records/reports the
     employee acts on behalf of?
  2. Exact schema for `Client` and the Client→Shop relationship (a new
     table vs. an extension of `Shop`/`ShopConnection` with a
     `clientId`).
  3. Whether before/after proof reports and PDF/shareable reports share
     one `Report` model or are two distinct capabilities under one UI.

## Institutes — owner/admin / staff / cohorts / students / student shops

**Current support: none in code.** Domain shape is **[LOCKED]** (Decision
1); implementation not started.

```
Institute Organization
├── Staff
└── Cohorts
    └── Students
        └── Student Shops
```

- **Who**: An institute (e.g. a course or bootcamp teaching Etsy
  selling) with an owner/admin, staff who run cohorts, and students
  within a cohort who each have a shop and progress tracking.
- **Locked capabilities** (Decision 1): staff management, cohort
  management, student enrollment, student shop oversight, student
  progress, seat management.
- **Built from shared primitives, plus one Institute-specific concept
  with no Agency analog**: Staff is `User` + `Membership` (`Role`/
  `Permission` scoped to cohorts they run) inside the Institute
  `Organization`. A Student Shop is a `Shop`/`ShopConnection` associated
  with a Student. **Cohort** is genuinely Institute-only — a time-boxed
  grouping of Students with no equivalent in the Agency domain, which is
  the concrete reason Decision 1 rejects a single shared managed-account
  model: Agency and Institute don't just have different names for the
  same shape, Institute has a structural layer (Cohort) Agency doesn't.
  `Seat` (shared primitive) is how cohort/student capacity gets
  allocated and tracked — see
  [architecture/organizations.md](../architecture/organizations.md).
- **Still open** [DECISION REQUIRED] (field-level, not shape-level):
  1. Exact schema for `Cohort`, `Student`, and the Student→Shop
     relationship.
  2. Whether Seat allocation is per-cohort (a cohort has N seats,
     assigned/revoked to specific students) or a simple org-wide cap —
     the shared `Seat` primitive needs to support per-cohort assignment
     for Institutes even if Agencies never use that granularity.
  3. What "student progress" concretely measures (searches run, shop
     health-score improvement, curriculum milestones — the last would
     imply a curriculum-content model that doesn't exist and isn't
     scoped by this decision).

## Why two domain models, not one — the locked rationale

Decision 1 explicitly rejects a single generic managed-account model
(the "ManagedAccount with a `kind` field" option previously proposed as
one option in this doc has been rejected). The concrete reason, made
visible by the trees above: Institute has a real structural layer
(Cohort) that groups Students, with no Agency equivalent — Agency's
Client sits directly under the Organization. Collapsing both into one
model would mean Agency permanently carries a nullable, unused Cohort
concept, or Institute's Cohort grouping gets bolted on awkwardly to a
model that wasn't designed for it. Two distinct domain models, sharing
only the primitives both actually need (User, Organization, Membership,
Role, Permission, Seat, Shop, ShopConnection, Activity/Audit), is the
locked direction. See
[architecture/organizations.md](../architecture/organizations.md) for
the full primitive-sharing design.

## Platform Administration personas

**Current support: minimal.** `isAdminEmail()` (`src/lib/is-admin.ts`) is
a single flat allowlist read from `ADMIN_EMAILS`. There is no concept of
sub-admins or role-specific admin teams (onboarding, SEO, billing,
support, content, integrations) as described in the brief. See
[architecture/rbac.md](../architecture/rbac.md). [DECISION REQUIRED]
