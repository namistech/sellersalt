Status: Draft
Owner: [ASSUMPTION] Founder (Aliyan)
Last Updated: 2026-08-14
Decision State: Directional — not yet approved by product owner

# Vision

## What SellerSalt is today

SellerSalt is an e-commerce intelligence SaaS. The live, customer-facing
product is **Etsy product/shop research**: search Etsy for winnable
products, see real lifetime sales data, score shop competition, track
shops over time, spot dropped shops, and get scheduled-search alerts.
This is the entire paid experience today — see [product-map.md](product-map.md)
for the full current surface.

A second pillar — customers connecting their **own** Shopify, WooCommerce,
or Etsy-seller store for unified analytics and eventual cross-listing — is
fully built (real OAuth, real data sync) but deliberately gated to
admin-only. It is not a half-finished feature; it is a positioning
decision. See `MVP scope decision` in the root `CLAUDE.md` and
[product-map.md](product-map.md).

## Where it's going

The long-term intent (per this task's brief) is for SellerSalt to grow
along two axes simultaneously:

1. **More marketplaces.** Etsy is marketplace #1. The architecture must
   let a second and third marketplace (eBay is explicitly planned per
   `src/connectors/types.ts`; Amazon/AliExpress are named as later
   candidates) plug into the same research → scoring → trends → alerts
   pipeline without a rewrite. See
   [architecture/marketplace.md](../architecture/marketplace.md).

2. **More account types.** Today every organization is the same flat
   shape (a `Membership` with `OWNER`/`ADMIN`/`MEMBER`). The future
   product needs to serve three distinct buyer profiles with materially
   different data shapes:
   - **Individual sellers** (Starter/Pro) — single seller, single focus.
   - **Agencies** — an org owner managing employees, who in turn manage
     *clients* and *client shops* they don't personally own.
   - **Institutes** — an org admin managing staff, who manage *cohorts* of
     *students*, each with their own shop and progress tracking.

   None of the client/cohort/student concepts exist in the schema today.
   See [architecture/organizations.md](../architecture/organizations.md)
   for the gap analysis. [DECISION REQUIRED]

3. **A normalization/intelligence layer.** Core research data
   (`Prospect`, `ShopWatch`/`ShopSnapshot`) currently carries Etsy-shaped
   fields directly (e.g. `shopExternalId`, `numFavorers`,
   `avgSellingRatio`). Before a second marketplace ships, raw
   marketplace data needs to flow through an adapter into normalized
   commerce entities that the intelligence engine (scoring, trends,
   recommendations) operates on — not marketplace-specific fields. See
   [architecture/marketplace.md](../architecture/marketplace.md).

4. **An AI copilot**, not a chatbot wrapper — a commerce-intelligence
   assistant with predefined tools over SellerSalt's own data. See
   [ai/assistant.md](../ai/assistant.md).

## What this vision explicitly does not mean (yet)

- No commitment that all three account types ship in a particular order.
  [DECISION REQUIRED]
- No commitment to a specific second marketplace or timeline. eBay is the
  only one named as "planned" in code comments
  (`src/connectors/types.ts`); this is not a roadmap promise.
- No redesign of current screens. Existing visual direction
  (light-theme-first, `#141B16`/`#16C784`/`#FFB020`, Inter, restrained
  radius) is the *starting point* for future design work, not something
  applied retroactively in this pass. See
  [design/design-system.md](../design/design-system.md) for the gap
  between that target palette and what's actually implemented today.

## How to use this document

This file states intent, not a committed roadmap. Treat every forward-
looking statement here as subordinate to
[MASTER_BLUEPRINT.md](../MASTER_BLUEPRINT.md)'s "Unresolved decisions"
section and to whatever the product owner says in a given working
session. When in doubt, [architecture/*.md](../architecture/) documents
about *current* code are the source of truth for what exists; this file
is the source of truth for *why* it's being built.
