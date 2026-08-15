Status: Draft
Owner: [ASSUMPTION] Founder (Aliyan)
Last Updated: 2026-08-14
Decision State: Current-state factual; future IA [DECISION REQUIRED]

# Information Architecture

## Current structure (verified against `src/app/(dashboard)/sidebar.tsx`)

```
Product hunting
  Overview            /dashboard
  Prospects           /prospects
  Spy on Competitor   /spy
  Trends              /trends
  Dropped shops       /inactive
  Favorites           /favorites

Workspace
  Connectors          /connectors
  Jobs                /jobs
  Settings            /settings

Your stores (admin)   [admin-only]
  Analytics           /analytics
  Connected stores    /settings/channels

Admin                 [admin-only]
  Packages            /admin
```

Two groups (`ADMIN_ONLY_GROUP` and the `Admin` group) are conditionally
appended only when `isAdmin` is true — the same `isAdminEmail()`
allowlist described in [architecture/rbac.md](../architecture/rbac.md).
Non-admin users never see these groups; the underlying routes are also
server-side rejected (`requireAdminOrg()`), so this isn't just visual
hiding.

`Settings` itself expands into sub-pages not shown in the sidebar
directly: `/settings/billing`, `/settings/channels`, `/settings/profile`,
`/settings/team`.

Outside the sidebar-driven app shell:
- `/` — marketing homepage
- `/checkout` — public, unauthenticated-or-authenticated checkout/signup
  (see [billing/billing-lifecycle.md](../billing/billing-lifecycle.md))
- `/login`, `/forgot-password`, `/reset-password`, `/accept-invite` —
  auth group

## Grouping logic, as implemented

The two-group split ("Product hunting" vs "Workspace") mirrors the
product/product-map.md split between customer-facing intelligence
features and org-management features. This is a reasonable IA pattern to
keep as new marketplaces are added — a third marketplace's research
screens would naturally join "Product hunting" (or a marketplace-scoped
subgroup within it) rather than needing a new top-level group.

## IA questions raised by future direction [DECISION REQUIRED]

1. **Multi-marketplace nav.** If Etsy and eBay both have Prospects/Spy/
   Trends/Dropped-shops, does the sidebar grow a per-marketplace switcher
   (like the existing per-currency-store separation in Analytics), or do
   all marketplaces share one merged "Prospects" view with a
   marketplace filter? The former preserves today's flat nav pattern;
   the latter depends on the normalization layer in
   [architecture/marketplace.md](../architecture/marketplace.md) landing
   first, since a merged view needs marketplace-neutral data to merge.
2. **Agency/Institute nav.** An agency employee managing several clients
   needs some way to switch "whose data am I looking at" — not
   represented in today's flat, single-org-per-session sidebar. Likely
   needs a client/student switcher analogous to an org switcher, once
   [architecture/organizations.md](../architecture/organizations.md)'s
   schema question is resolved.
3. **AI assistant surface.** Persistent chat panel vs. dedicated route vs.
   contextual entry points — see [architecture/ai.md](../architecture/ai.md).
4. **Where do reports (PDF/shareable) live** — a new top-level nav item,
   or nested under each shop/client's detail view? [DECISION REQUIRED]
5. **Seller-channel features graduating out of admin-only** — when
   Shopify/WooCommerce/Analytics/Cross-listing become customer-facing
   (a product decision, not an engineering one — see root `CLAUDE.md`
   MVP scope section), the `ADMIN_ONLY_GROUP` split in `sidebar.tsx`
   simply needs its conditional removed; the code is already structured
   for this to be a small change, not a rebuild.

## Cross-references

[design/navigation.md](navigation.md) for interaction patterns,
[product/product-map.md](../product/product-map.md) for the feature
inventory this structure organizes.
