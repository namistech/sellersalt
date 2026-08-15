Status: Draft
Owner: [ASSUMPTION] Founder (Aliyan)
Last Updated: 2026-08-14
Decision State: [DECISION REQUIRED] — direction only, nothing implemented

# GEO (Generative Engine Optimization)

## Current state

Nothing built.

## Direction (per this task's brief)

GEO here means making SellerSalt's own facts about itself
machine-readable and authoritative enough that generative AI systems
cite it correctly and consistently:

- **Machine-readable product/entity information** — structured data
  (JSON-LD, schema.org `SoftwareApplication`/`Organization`) describing
  what SellerSalt is, consistently across every page that mentions it.
- **Authoritative, reference-worthy content** — content detailed and
  accurate enough (grounded in what's actually built, not aspirational)
  that it's worth an AI system citing over a less authoritative source.
- **Consistent entity information** — the same facts (product name,
  what it does, pricing, plans) stated identically everywhere, since
  inconsistency across pages is exactly what makes an entity
  untrustworthy to both search and generative engines.

## The single biggest risk to GEO here

Publishing content that overstates what's built (e.g. describing the
AI assistant, cross-listing, or Agency/Institute account types as live
features before they exist) is actively counterproductive for GEO —
it creates content that will be wrong the moment a generative engine
indexes it, and inconsistent with the product the moment a user tries
it. This documentation set's discipline of marking `[ASSUMPTION]` /
`[DECISION REQUIRED]` / `[VERIFY]` internally should carry through to
what's published externally: **only publish GEO/AEO content for
features confirmed built** (cross-check against
[product/product-map.md](../product/product-map.md) "Current state"
sections before publishing any capability claim).

## Open questions [DECISION REQUIRED]

1. Same content-model question as [seo/seo.md](seo.md) and
   [seo/aeo.md](aeo.md) — whether GEO-oriented structured data is
   generated from a shared content/entity model or hand-authored per
   page.
2. Whether pricing/plan structured data should be generated directly
   from the live `Package` table (matching how the marketing homepage
   already pulls live pricing) rather than hand-maintained separately —
   this would prevent the exact inconsistency risk described above for
   at least the pricing dimension.
