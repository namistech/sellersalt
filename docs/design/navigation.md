Status: Draft
Owner: [ASSUMPTION] Founder (Aliyan)
Last Updated: 2026-08-14
Decision State: Current-state factual; future patterns [DECISION REQUIRED]

# Navigation

## Current pattern (verified against `src/app/(dashboard)/sidebar.tsx`)

- **Fixed left sidebar**, `w-64`, persistent across the authenticated
  app. Grouped nav with uppercase group labels, active-state highlight
  via `bg-accent-soft`/`text-accent`, prefix-match active detection
  (`pathname === item.href || pathname?.startsWith(item.href + "/")`) so
  a nested route like `/shops/[shopExternalId]` doesn't fall under any
  sidebar item (it's not itself in the nav — reached via a link from
  Prospects/Spy), while `/settings/*` sub-pages correctly keep
  `/settings` highlighted.
- **No top nav bar** was located in this pass beyond the sidebar itself
  — [VERIFY] whether a header/breadcrumb component exists separately
  (not found under `src/app/(dashboard)` by filename search); if not,
  page-level breadcrumbing/context is handled per-page rather than by a
  shared shell component.
- **Settings uses its own sub-navigation** across
  `/settings/{billing,channels,profile,team}` rather than being flattened
  into the main sidebar — a reasonable pattern to keep for any future
  settings-shaped area (e.g. per-client or per-student settings, if
  Agency/Institute ships).
- **Admin console** (`/admin`) is a single route with client-side
  sections inside `admin-client.tsx` (936 lines — [VERIFY] whether it
  has internal tab/section navigation; not read in full this pass)
  rather than being split into multiple `/admin/*` routes with their own
  sidebar entries. Worth revisiting if the brief's platform-admin
  sub-domains (SEO, billing, support, content, integrations) each grow
  enough surface area to want their own route + breadcrumb.

## Marketing site navigation

Separate from the app shell entirely — `src/app/marketing-homepage.tsx`
under its own scoped `.sellersalt-marketing` styles. [VERIFY] its
internal nav structure; not inspected in this pass. Per
[seo/seo.md](../seo/seo.md), a future programmatic-SEO content set
(feature pages, marketplace pages, integration pages, use-case pages,
comparison pages, glossary) will need its own nav/sitemap strategy
distinct from the app sidebar — likely a marketing-site header nav +
footer sitemap, not the dashboard pattern.

## Open questions for future navigation work [DECISION REQUIRED]

1. Does a multi-marketplace or multi-account-type future need a top-of-
   sidebar context switcher (marketplace switcher, client/student
   switcher)? Neither exists today — the sidebar assumes exactly one
   context (today: the logged-in org) for its entire lifetime per
   session. See [design/information-architecture.md](information-architecture.md)
   for the specific IA questions this raises.
2. Mobile-responsive navigation — root `CLAUDE.md` lists "mobile-
   responsive pass" under "What's explicitly NOT built yet." The current
   fixed `w-64` sidebar has no documented collapse/drawer behavior for
   small viewports; [VERIFY] before assuming one exists.
