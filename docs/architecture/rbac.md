Status: Draft
Owner: [ASSUMPTION] Founder (Aliyan)
Last Updated: 2026-08-15
Decision State: Current-state factual; future RBAC [DECISION REQUIRED].
A third axis — MCP tool/credential permissions — is now named below; see
[architecture/mcp.md](mcp.md) for full detail. A fourth, independent
axis — Affiliate Program access — is also now named below; see
[architecture/affiliate.md](affiliate.md) for full detail.

# Role-Based Access Control

## Current model — two independent, unconnected mechanisms

There is no unified RBAC system today. Two separate, simple mechanisms
do all access control:

### 1. `Membership.role` — org-level role

`OWNER` | `ADMIN` | `MEMBER` (`MembershipRole` enum,
`prisma/schema.prisma`). [VERIFY] exactly which routes/UI branch on
this — not exhaustively traced in this pass. It governs normal in-org
permission differences (e.g. presumably team management, billing
access), scoped to a single organization.

### 2. `ADMIN_EMAILS` — platform-level superuser allowlist

`isAdminEmail()` (`src/lib/is-admin.ts`) is a flat, env-var-driven
allowlist — not a database table, not a role. Comment in the source is
explicit about the tradeoff: *"Deliberately simple for now — an env-var
allowlist rather than a full RBAC system. Fine while there's one founder
managing packages; worth replacing with a real role system once there's
a team behind SellerSalt itself."*

`requireAdminOrg()` (`src/lib/require-admin-org.ts`) wraps this to gate
seller-channel routes — checks `isAdminEmail(session.user.email)`,
returns the admin's `organizationId` or `null`. Used to reject
Shopify/WooCommerce/Etsy-seller/Analytics/Cross-listing routes
server-side for non-admins, and `Sidebar` (`src/app/(dashboard)/sidebar.tsx`)
uses an `isAdmin` prop to hide the same items from nav. This is the
mechanism behind the MVP scope decision described in
[product/product-map.md](../product/product-map.md) and root
`CLAUDE.md`.

**This one flat allowlist is also what gates `/admin`** (packages,
organizations, coupons, payment providers, email settings) — the same
mechanism used to hide unreleased customer features is also the
platform's only super-admin gate. There is no distinction today between
"can see the admin-only seller-channels preview" and "can change live
payment provider credentials."

## Gaps vs. the brief's platform administration model

The brief describes: super admin, sub-admins, role-specific teams
(onboarding, SEO, accounts/billing, support, content,
platform/integrations, permissions, audit logs, system settings). None
of this exists. Specifically missing:

- **Any admin role granularity.** Today it's binary: in `ADMIN_EMAILS`
  or not. A support-team sub-admin who should see organizations but not
  payment provider credentials is not representable.
- **Audit log.** No `AuditLog` model or equivalent exists anywhere in
  the schema. Every admin action today (granting a subscription,
  changing a package price, rotating payment credentials) is
  unrecorded except in Postgres's own `updatedAt` timestamps.
  [DECISION REQUIRED] — audit logging is explicitly listed as "not
  built yet" in root `CLAUDE.md`.
- **System settings as a distinct admin surface** — `AppSetting`
  already provides a generic mechanism (see
  [architecture/integrations.md](integrations.md)); a "system settings"
  admin *role* on top of it doesn't exist, but the storage layer is
  ready.

## Design direction for a real RBAC system

> **[LOCKED — Decision 1, 2026-08-14]** `Role`, `Permission`, and `Seat`
> are named as shared primitives across the Agency and Institute domain
> models — see [architecture/organizations.md](organizations.md). This
> locks that a real `Role`/`Permission` system (replacing the flat
> `MembershipRole` enum) is the intended direction, not an optional
> future enhancement. The exact schema is still [DECISION REQUIRED]
> (below) — the decision fixes *that* fine-grained, resource-scoped
> permissions are coming, not their literal table design.

Two independent axes need resolving before implementation (a further two
— MCP and Affiliate Program access — are named separately below, since
both depend on axis #1 existing rather than needing independent
resolution of their own):

1. **Org-level roles** (`Membership.role` → `Role`/`Permission`) —
   needs to grow beyond OWNER/ADMIN/MEMBER now that Agency/Institute
   account types are a locked direction (see
   [architecture/organizations.md](organizations.md)): an agency
   employee's permissions over *their* clients vs. another employee's
   clients, and a staff member's permissions over *their* cohorts, is a
   resource-scoped permission, not a flat role. [DECISION REQUIRED]:
   exact `Permission` schema (dedicated table vs. structured grant list).
2. **Platform-level admin roles** (replacing `ADMIN_EMAILS`) — needs a
   real table (e.g. `AdminRole`/`AdminPermission`) with at minimum the
   sub-admin domains named in the brief (onboarding, SEO, billing,
   support, content, integrations, permissions themselves, audit,
   system settings), each independently grantable per admin user. This
   is a separate axis from #1 (platform employees vs. org members) —
   see the framing below.

Recommend NOT conflating these two axes into one system — org-level
roles answer "what can this member do inside their own org," platform
roles answer "what can this platform employee do across all orgs." They
have different blast radii and should probably remain structurally
separate even if implemented with similar patterns.

## A third axis: MCP tool/credential permissions

**[LOCKED — Decision 4, 2026-08-15]** External AI agent access (MCP —
see [architecture/mcp.md](mcp.md)) introduces a third, independent
permission axis alongside the two named above:

1. Org-level roles (`Membership.role` → future `Role`/`Permission`) —
   "what can this member do inside their own org."
2. Platform-level admin roles (`ADMIN_EMAILS` → future `AdminRole`) —
   "what can this platform employee do across all orgs."
3. **MCP tool/credential grants** — "what can this specific external
   agent credential do," which must always be a **subset** of what its
   owning `User` could do via axis #1 (an MCP credential is never
   granted more than its creator already has, and is scoped narrower by
   default).

An MCP credential's authorization check therefore composes axis #1 (does
the owning `User` have org/Client/Cohort-scoped permission for this
action) with the new axis #3 (is this specific tool granted to this
specific credential) — it does not bypass axis #1, and it is never
checked against axis #2 (MCP has no path to platform-admin actions).
This directly reuses, rather than duplicates, the `Permission`
primitive's resource-scoping once axis #1 is implemented — see
[architecture/mcp.md](mcp.md#agency-isolation--the-specific-failure-mode-to-avoid)
for why this specifically matters for Agency employee/Institute staff
scoping.

## A fourth axis: Affiliate Program access

**[LOCKED — Decision 5, 2026-08-15]** The future Affiliate Program
([architecture/affiliate.md](affiliate.md)) introduces a fourth
permission axis, independent of the three above:

1. Org-level roles — "what can this member do inside their own org."
2. Platform-level admin roles — "what can this platform employee do
   across all orgs."
3. MCP tool/credential grants — "what can this specific external agent
   credential do."
4. **Affiliate Program access** — "does this `User` have an approved
   Affiliate relationship, and (separately) does a platform-admin user
   have permission to operate the Admin Affiliate Console."

This axis is genuinely independent of #1: an Affiliate relationship is
not an org-level role and does not require any `Membership` at all (see
[architecture/organizations.md §Affiliate is not an account type](organizations.md#affiliate-is-not-an-account-type)) —
a `User` with zero Memberships can still have full Affiliate-Dashboard
access. The Admin Affiliate Console side of this axis, by contrast, is
simply a specific application of axis #2 (a strong candidate for its own
sub-admin department, per
[product/complete-product-surface.md §18](../product/complete-product-surface.md#18-sub-admin--department-system)) —
not a fifth axis. **[LOCKED]**: Affiliate status and MCP entitlement
(axis #3's gating capability, `mcp_access`) are independent — approval
as an Affiliate never implies MCP access, and vice versa.

## Audit log — minimum shape to plan for [DECISION REQUIRED]

Not built. When it is, at minimum needs: actor (`User.id`), action type,
target entity + id, timestamp, and enough context to reconstruct "what
changed" (before/after values or a structured payload) — since this is
explicitly called out as protecting against exactly the kind of
incident described in root `CLAUDE.md`'s Lessons Learned (a migration
run against the wrong environment, a public DB port left open) by
making admin actions traceable after the fact.

MCP call logging ([architecture/mcp.md](mcp.md#audit-logging)) is a
third, independent motivation for this same primitive — every MCP tool
call (actor, credential, tool, target, before/after for
PREPARE/APPLY/AUTOMATE tools) should log through the same Activity/Audit
mechanism this section describes, not a fourth, MCP-specific log table.

The Affiliate Program's admin-facing actions (application
approved/rejected, affiliate suspended, manual ledger adjustment) are a
fourth motivation for the same primitive — though the affiliate
program's own financial ledger
([architecture/affiliate.md §Affiliate ledger](affiliate.md#affiliate-ledger-event-sourced-not-a-balance-field))
is a dedicated, append-only table in its own right (being financial, not
just an activity record), not merely a row in this general Activity/
Audit log.
