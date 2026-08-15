Status: Draft
Owner: [ASSUMPTION] Founder (Aliyan)
Last Updated: 2026-08-14
Decision State: [DECISION REQUIRED] — direction only, nothing implemented or scoped for build order

# SEO

## Current state

The public marketing homepage (`src/app/marketing-homepage.tsx`,
`src/app/page.tsx`) exists with live pricing pulled from `Package`. No
dedicated SEO infrastructure was found in this pass: [VERIFY] whether
`src/app/layout.tsx` or `page.tsx` currently sets `metadata` (Next.js
App Router's built-in metadata API), and whether a `sitemap.xml` /
`robots.txt` route exists (`src/app/sitemap.ts` / `src/app/robots.ts`
would be the Next.js 15 convention — not found under `src/app` by
filename in this pass, but not exhaustively confirmed).

## Direction (per this task's brief)

- **Metadata** — per-page `<title>`/description via Next.js's metadata
  API, consistently applied across marketing and any future
  programmatic-SEO pages.
- **Canonical URLs** — needed once any content type could be reachable
  via more than one path (e.g. a marketplace page and a comparison page
  that both mention the same competitor).
- **Sitemap / robots** — standard Next.js App Router conventions
  (`sitemap.ts`, `robots.ts`), generated rather than hand-maintained once
  programmatic pages exist, so new pages are automatically included.
- **Structured data** — JSON-LD for whichever schema.org types apply
  (likely `SoftwareApplication`/`Product` for the product itself,
  `FAQPage` for AEO content, `Organization` for entity consistency — see
  [seo/geo.md](geo.md)).
- **Feature pages, marketplace pages, integration pages, use-case pages,
  comparison pages, glossary** — programmatic SEO surface. None exist
  today. Each of these page types implies its own content model
  (structured data the pages are generated from) rather than hand-
  written HTML per page, if the intent is genuinely programmatic (the
  brief's word) rather than a handful of static pages. [DECISION
  REQUIRED]: is a CMS/content model needed, or is a small, hand-authored
  set of pages sufficient for the current stage of the business?

## Dependencies on other unresolved decisions

- Marketplace pages (e.g. "SellerSalt for Etsy sellers," "SellerSalt for
  eBay sellers") depend on which marketplaces actually ship — see
  [architecture/marketplace.md](../architecture/marketplace.md). Writing
  a marketplace page for a marketplace that isn't built yet risks
  promising something not live.
- Integration pages (Shopify, WooCommerce) already have a real feature
  to describe today, even though it's currently admin-only/not
  customer-facing (see [product/product-map.md](../product/product-map.md)
  MVP scope section) — publishing integration pages before the feature
  is customer-facing is a marketing/product sequencing decision, not an
  engineering one. [DECISION REQUIRED]

## Recommendation

Don't build programmatic SEO infrastructure speculatively. Start with
correct metadata + sitemap/robots on existing pages (marketing homepage,
`/checkout`) since that's low-risk and immediately useful regardless of
future content strategy, then scope the programmatic content types once
there's enough real feature surface (post-second-marketplace, post-
Agency/Institute) to make comparison/use-case pages honest rather than
aspirational.
