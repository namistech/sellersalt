Status: Draft
Owner: [ASSUMPTION] Founder (Aliyan)
Last Updated: 2026-08-14
Decision State: [DECISION REQUIRED] — product intent only, no implementation plan

# AI Assistant

See [architecture/ai.md](../architecture/ai.md) for the implementation-
architecture view (constraints, open technical questions). This document
covers product intent.

## What it must not be

Per the brief: **not a generic chatbot.** A commerce-intelligence
copilot with predefined tools and natural-language queries, operating
over SellerSalt's own data and intelligence systems — not a wrapper
around a general-purpose LLM with no grounding in real account data.

## Example queries named in the brief

- Find winning products
- Analyze my shop
- Find my biggest SEO problems
- Compare my shop with competitors
- Find opportunities
- Explain a performance change
- Find products losing momentum
- Generate a report

## Mapping example queries to what exists today

This grounds each example against real data/features, so a future
implementer knows what's genuinely available to build a tool on top of
vs. what needs new intelligence work first:

| Example query | Backed by today | Gap |
|---|---|---|
| Find winning products | `Prospect` search/filter, competition scoring | None — closest to "just wrap the existing search/scoring in a tool" |
| Analyze my shop | `ShopWatch`/`ShopSnapshot` (tracked shop trend data), `SellerChannel`/`SellerOrder` (own-store analytics, admin-only today) | "My shop" implies the seller-channel side, which is admin-gated — see [architecture/rbac.md](../architecture/rbac.md); would need that gate lifted or the tool restricted accordingly |
| Find my biggest SEO problems | Nothing | No listing/shop SEO-intelligence feature exists yet (see [product/product-map.md](../product/product-map.md) future direction) — this tool has no data to call |
| Compare my shop with competitors | Shop detail pages + competition scoring exist for competitor shops; "my shop" side has the same seller-channel gap as above | Needs both sides connected — no existing feature does this comparison directly |
| Find opportunities | Partially — Trends/Dropped-shops surface some of this today as static views | Not phrased as a queryable "opportunity" concept yet |
| Explain a performance change | `ShopSnapshot` time series exists (the raw data) | No "explain the delta" logic exists — would be new analysis, not just a query wrapper |
| Find products losing momentum | `ShopSnapshot` time series exists | Same as above — momentum/trend-direction analysis is new logic |
| Generate a report | Nothing — no PDF/report generation exists anywhere in the codebase | Fully new capability; also named separately in the brief as "optimization proof reports / PDF-shareable reports" for Agencies — likely the same underlying capability, two different trigger points (assistant-generated vs. agency-workflow-generated) |

## Implication

Roughly half the example queries are close to "wrap an existing feature
as a tool"; the other half require new intelligence work
(SEO-problem detection, momentum/trend-direction analysis,
report generation) that doesn't yet exist independent of the assistant.
**The assistant shouldn't be scoped as one project** — it's better
understood as a natural-language front end that gets more capable as the
underlying intelligence features it wraps get built. [DECISION REQUIRED]
on sequencing: build the assistant shell first with only the "already
backed" tools, or wait until more underlying intelligence features exist
so the first release covers more of the example list credibly.

## Open questions

Deferred to [architecture/ai.md](../architecture/ai.md) — model/provider
choice, tool signatures, conversation persistence, cost/rate limiting,
and where the assistant surfaces in the UI (see
[design/information-architecture.md](../design/information-architecture.md)).
