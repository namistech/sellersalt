Status: Draft
Owner: [ASSUMPTION] Founder (Aliyan)
Last Updated: 2026-08-14
Decision State: [DECISION REQUIRED] — direction only, nothing implemented

# AEO (Answer Engine Optimization)

## Current state

Nothing built. No FAQ content model, no structured Q&A content found in
this pass.

## Direction (per this task's brief)

AEO here means content structured to be directly quotable/answerable by
AI answer engines (as distinct from traditional keyword-ranking SEO,
covered in [seo/seo.md](seo.md)) and traditional search engines' answer
boxes:

- **Answer-oriented content** — pages/sections written to directly
  answer a specific question a prospective user would ask (e.g. "How do
  I find winning Etsy products?" answered concretely, not just
  described).
- **FAQ structures** — genuine `FAQPage` structured data (schema.org),
  not just an accordion UI with no markup behind it.
- **Structured knowledge / entity relationships** — consistent,
  machine-parseable descriptions of what SellerSalt is, what it does,
  and how its concepts relate (a "Prospect," a "ShopWatch," a
  "Difficulty score" — the same vocabulary used internally in this docs
  set should be the vocabulary used in public content, so an AI answer
  engine describing SellerSalt gets the terminology right).

## Relationship to internal documentation

This documentation set itself (particularly
[MASTER_BLUEPRINT.md](../MASTER_BLUEPRINT.md) and
[product/product-map.md](../product/product-map.md)) is a reasonable
source of truth for what public AEO content should assert — it should
not accidentally contradict the internal architecture docs (e.g. don't
publicly claim a feature is "AI-powered" if
[architecture/ai.md](../architecture/ai.md) confirms nothing is built).

## Open questions [DECISION REQUIRED]

1. Where does FAQ/answer content live — hand-authored pages, or
   generated from the same content model that would back programmatic
   SEO pages (see [seo/seo.md](seo.md))?
2. Does AEO content need its own review/accuracy process, given it's
   explicitly meant to be quoted verbatim by AI systems (higher
   precision bar than typical marketing copy)?
