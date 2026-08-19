# SellerSalt — Development Roadmap

Status reflects actual code as of 2026-08-19. Re-verify before trusting a
"DONE" — check the referenced files, don't take this document's word for
it if it looks stale.

## PHASE 0 — Foundation
**Status: DONE**

Multi-tenant SaaS core: Next.js 15 App Router, NextAuth (JWT), Prisma/
Postgres, BullMQ/Redis, organizations/packages/plan limits, admin console,
billing (Stripe + PayPal, real), 2FA/passkeys/email verification, public
marketing site. Pre-dates the marketplace work; not touched by it.

## PHASE 1 — Marketplace Abstraction
**Status: DONE**

`src/marketplaces/core/` built: `MarketplaceConnector` interface,
`MarketplaceCapabilities` flags, `MarketplaceRegistry`, canonical types
(`types.ts`), per-marketplace adapters for Etsy (real, wraps pre-existing
working code), Shopify/WooCommerce (partial, real account+orders),
Amazon/eBay/TikTok Shop (architecture-ready stubs, zero live calls). One
additive Prisma migration (`ConnectorType`/`SellerChannelPlatform` enum
expansion) — no destructive schema changes.

## PHASE 2 — Research Normalization
**Status: DONE**

`/api/products/search`, `/api/keywords/search`, `/api/categories`, and the
scheduled Prospects worker migrated to check `MarketplaceRegistry`
capabilities before doing Etsy-specific work, returning a structured
`CapabilityUnavailable` response for unsupported marketplaces instead of
crashing. `NormalizedProduct` (richer than the original `SearchResult`)
added to carry the shop/seller metrics the Prospects pipeline needs. A real
defect was found and fixed in this phase: the Etsy connector's research
methods were calling Etsy's API with empty `{}` credentials — now resolve
real per-org/platform credentials. Etsy's existing behavior verified
byte-identical via the pre-existing test suite.

## PHASE 3 — All-Marketplace Research UX
**Status: DONE**

`runAllMarketplaceProductResearch()` / `POST /api/marketplaces/research`
— fans a request across every registered connector in parallel, each
independently tagged `AVAILABLE | PARTIAL | UNAVAILABLE | NOT_IMPLEMENTED`.
Error isolation verified by test (one connector throwing never removes
another's results). Wired into the UI on the Prospects page
(`MarketplaceSelector`'s "All Marketplaces" option +
`AllMarketplacesResults` component) as the reference implementation, then
extended to Keyword Research (`fetchAllMarketplaceKeywordResearch`, wired
into `/keyword-research`) and Category Hunting
(`fetchAllMarketplaceCategoryTree`, wired into `/categories`) using the
same generic `fanOutMarketplaceRequest<T>()` helper
(`src/marketplaces/core/research-pipeline.ts`) rather than a second
fan-out implementation per surface. Both single-marketplace and
"All Marketplaces" modes are real on all three surfaces; Etsy's behavior
verified byte-identical throughout.

## PHASE 4 — Intelligence Layer
**Status: DONE**

`universal-scoring.ts`'s margin factor and `seo-engine.ts`'s
`auditListingSeo` both accept marketplace rules instead of hardcoding
Etsy's numbers, defaulting to Etsy's exact current behavior (verified
unchanged by test). A third, previously-undiscovered scoring engine
(`opportunity-scoring.ts`, self-labeled "Universal" while hardcoding Etsy
fees, zero live consumers) was found and parameterized for consistency.
`POST /api/seo/audit` now resolves the *selected* marketplace's rules and
returns which marketplace it scored against; the Draft Playground tab on
`/seo` shows "Optimizing for [Marketplace]" (dynamic rubric targets,
title/tag limits) instead of a hardcoded Etsy 140/13. When a draft is tied
to a real connected `SellerChannel`, that channel's actual platform is
authoritative over a manually-picked marketplace
(`resolveMarketplaceForAudit` in `src/services/seo-engine.ts`,
org-scoped) — a listing bound for a real store is never scored against
the wrong marketplace's rules.

## PHASE 5 — Listing/Shop Optimization
**Status: IN PROGRESS**

SEO Audit is now marketplace-aware end to end (Phase 4). Still open: a
shop-completeness audit for marketplaces beyond Etsy (Shop SEO Audit tab
is still Etsy-only, correctly — no other marketplace has a live shop-data
connector yet), the AI Listing Studio's actual draft-generation/push flow
staying Etsy-only by design (`ListingDraft` is schema-level Etsy-shaped —
see `AGENTS.md` §15), and eventually reconciling `product-hunting.ts`'s
own 5-factor Etsy scoring with `universal-scoring.ts`'s 4-factor engine
(currently two real, separate, undocumented-as-intentional-duplicates
scoring paths — see `AGENTS.md` §8 and the technical debt list).

## PHASE 6 — Connected Marketplace Accounts
**Status: DONE (Etsy, Shopify, WooCommerce) / PLANNED (rest)**

OAuth connect flows exist and are real for Etsy (customer-facing),
Shopify/WooCommerce (admin-only, per MVP scope decision — not a technical
limitation). Amazon/eBay/TikTok Shop connect flows don't exist because
their underlying API credentials/integrations don't exist yet (Phase 7).

## PHASE 7 — Marketplace API Expansion
**Status: BLOCKED (external dependency)**

Amazon SP-API, eBay Developer Program, and TikTok Shop Partner Center
applications need to actually be submitted and approved outside this
repository before any of their connectors can move past
`ARCHITECTURE READY`. This is not an engineering task that can be
completed by writing more code — the architecture is already built to
receive real credentials and flip capability flags with no other changes
required (see `AGENTS.md` §2, `docs/SELLERSALT-MARKETPLACE-ARCHITECTURE.md`
"How Amazon / eBay / TikTok Shop plug in").

## PHASE 8 — Cross-Marketplace Intelligence
**Status: PLANNED**

The long-term model: a single product can have a different opportunity
score, confidence, and recommendation per marketplace (Amazon: 82/High,
Etsy: 74/Medium, eBay: 61/Low — not one universal number). The current
`NormalizedProduct`/`OpportunityScore`/`ProductResearchResult` types
already support this shape (each result is independently
marketplace-tagged) — no blocking redesign needed, but the actual
cross-market comparison UI and any weighting/ranking logic across
marketplaces doesn't exist yet. Meaningful progress here is gated on
Phase 7 (need ≥2 live research-capable marketplaces for comparison to mean
anything beyond Etsy-vs-nothing).

## PHASE 9 — Commercial/Partner Ecosystem
**Status: PLANNED**

Not started. Would cover things like a public API, partner integrations,
or a marketplace-app-store-style listing (e.g. the previously-scoped
"SaltSync" Shopify app — see root `CLAUDE.md`'s "What's explicitly NOT
built yet"). No architecture decisions made yet.

---

## How to update this document

Every significant implementation batch that touches
`src/marketplaces/`, `src/services/intelligence/`, `src/services/seo-engine.ts`,
`src/services/listing-generation.ts`, or adds/changes a connector **must**
update the relevant phase's status here, plus
`docs/MARKETPLACE-INTEGRATION-MATRIX.md` if a capability flag changed. Don't
mark something DONE unless the code and its tests actually back it — see
`AGENTS.md` §20 rule 15.
