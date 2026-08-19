# SellerSalt — Architectural Changelog

Chronological record of *why* the architecture is shaped the way it is —
for a future agent (or human) wondering "why does this exist" rather than
just "what exists." For user-facing feature history, see
`docs/whats-new`-style content in the app itself
(`src/services/changelog.ts`); this document is engineering-decision-
focused.

## Etsy-origin architecture (pre-2026-08)

Built and deployed as "Anadash" on `anadash.netdrix.com` for months —
Etsy-only product research (product hunting, keyword research, category
hunting, shop tracking), platform-wide research via one shared Etsy
Personal Access connector, admin-gated Shopify/WooCommerce "own shop"
connectors added later. `SETUP.md` still documents this era's deployment
process; see its own superseded-notice for what's changed since.

## SellerSalt rebrand

Rebranded from "Anadash" to "SellerSalt," migrated to `sellersalt.com`.
The GitHub repo name and some internal identifiers still reference
"anadash" in places that don't affect users — intentional, not something to
"finish" by renaming everything (root `CLAUDE.md` explains which
references are deliberate).

## Etsy Commercial API rejection & compliance remediation (2026-08-19)

**Why**: Etsy declined a Commercial API access request with a generic
rejection reason. A forensic audit (`docs/SELLERSALT-ARCHITECTURE-AUDIT.md`
predecessor pass — see that doc's own history) found several concrete,
plausible causes:

- The pricing page literally advertised "Etsy search scrapers" and
  "Dedicated Scraper Capacity" as paid features — directly contradicting
  Etsy's API Terms, which prohibit screen-scraping.
- The app requested a `billing_r` OAuth scope that, on verification against
  Etsy's live, current documentation, **isn't a real Etsy v3 scope at
  all** — a technical red flag independent of the scraping-language issue.
- "Spy on Competitor" / "Surveillance" / "Stalk" branding throughout the
  dashboard, marketing site, and transactional emails — legally fine
  (the underlying feature reads only public data) but a self-inflicted
  optics risk against a reviewer already primed to look for scraping-
  adjacent language.

**What changed**: OAuth scopes narrowed to `listings_w listings_r shops_r
transactions_r` (removed `shops_w`, `billing_r`). The Chrome extension's
Etsy-page DOM read/write bridge was deleted outright (not disabled) —
`extension/etsy-content-script.js`, `extension/etsy/*`, and their
background-worker message handlers are gone; the extension now only talks
to SellerSalt's own backend. "Spy/Surveillance/Stalk" terminology replaced
with "Market Research" across every user-visible surface found. Snapshot
retention bounded to actual product need (`Package.maxTrackingDays`, not
an invented Etsy rule). Disconnect lifecycle audited and confirmed sound.
A real regression from a prior session's partial edit was found and fixed
(a missing OAuth `token:` endpoint that would have broken all Etsy sign-in).

**Why this matters for future work**: the correct claim is "remediated
against currently identifiable Etsy API policy risks and prepared for
review" — not "Etsy approved this." Re-approval requires Etsy's own
confirmation, which nothing in this repository can produce.

## Marketplace abstraction (2026-08-19, same day, following remediation)

**Why**: the compliance work surfaced a deeper structural question —
SellerSalt's *positioning* said "market intelligence platform," but its
*code* was Etsy-only end to end (raw Etsy client calls scattered directly
into `product-hunting.ts`, `keyword-research.ts`, `category-hunting.ts`;
two separate ad-hoc connector registries that both only had Etsy behind
them). The founder decision: reposition as a genuinely marketplace-agnostic
ecommerce intelligence platform, with Etsy as the first (not only)
connector.

**What changed**: `src/marketplaces/core/` built as described in
`docs/SELLERSALT-MARKETPLACE-ARCHITECTURE.md` — a `MarketplaceConnector`
interface, capability flags, a central registry, canonical types, and
six connector adapters (Etsy real, Shopify/WooCommerce partial,
Amazon/eBay/TikTok Shop honest stubs). This *wrapped* the existing working
Etsy code rather than rewriting it — the two pre-existing registries
(`src/connectors/`, `src/seller-channels/`) remain in place underneath.

## Research pipeline migration + normalization

**Why**: having the abstraction exist doesn't help if nothing calls
through it. The three main research routes and the scheduled Prospects
worker were migrated to check capabilities via the new registry first,
with Etsy's actual behavior required to stay byte-identical (verified by
the existing test suite, not just asserted). A `NormalizedProduct` type
was added because the original thin `SearchResult` type couldn't carry
the shop/review/sales metrics the Prospects pipeline actually needs — an
honest gap found while doing the migration, not decided up front.

## All-Marketplace research UX

**Why**: an abstraction that only one marketplace can use isn't
demonstrating the point. Built `runAllMarketplaceProductResearch()` and
wired a real "All Marketplaces" mode into the Prospects page as the
reference implementation — deliberately one flagship surface rather than
a shallow pass across every page, to keep the error-isolation and
honest-status guarantees (AVAILABLE/PARTIAL/UNAVAILABLE/NOT_IMPLEMENTED)
real and tested rather than aspirational everywhere at once.

## SEO engine parameterization

**Why**: `seo-engine.ts`'s `auditListingSeo` was the last major
"universal"-named engine still hardcoding Etsy's 140-char/13-tag/20-char
limits as bare literals. Parameterized via `MarketplaceOptimizationRules`,
with the exact same derived-threshold math Etsy's defaults always
implied — so passing no rules argument reproduces the original behavior
precisely (verified by test, not just visually similar). A third, unused,
similarly-mislabeled "Universal Opportunity Scoring Engine" was discovered
during the audit sweep for this work and fixed the same way for
consistency, despite having zero live callers.

## Marketplace context extended to Keyword Research, Category Hunting, and SEO Audit (2026-08-19)

**Why**: the prior "All-Marketplace research UX" pass was deliberately
scoped to one flagship surface (Prospects) to keep the error-isolation
and honest-status guarantees real rather than aspirational everywhere at
once. This pass extended the same, already-proven pattern to the three
other intelligence surfaces still coupled directly to Etsy.

**What changed**: Keyword Research (`/keyword-research`) and Category
Hunting (`/categories`) both got a functional `MarketplaceSelector`
(single marketplace + "All Marketplaces"), backed by
`fetchAllMarketplaceKeywordResearch`/`fetchAllMarketplaceCategoryTree` —
new fan-out entry points that reuse a newly-extracted generic
`fanOutMarketplaceRequest<T>()` helper (`src/marketplaces/core/
research-pipeline.ts`) instead of reimplementing the Prospects page's
error-isolation logic a second and third time. A new
`MarketplaceStatusCard` component renders their per-marketplace status,
mirroring `AllMarketplacesResults`' treatment for a different payload
shape. `POST /api/seo/audit` was parameterized to resolve and return the
marketplace it scored against — `getOptimizationRules(marketplace)`
threaded into `auditListingSeo`, with a new `resolveMarketplaceForAudit`
that derives the marketplace from a connected `SellerChannel` (via a new
`marketplaceFromSellerChannelPlatform` mapping) when one is supplied,
falling back to a manual pick otherwise. The `/seo` Draft Playground tab
got a real "Connected Store" picker and dynamic rubric/title/tag targets
instead of a hardcoded Etsy 140/13; the Live Listing and Shop SEO tabs
were left untouched (both only ever fetch real, live Etsy data, so
generalizing them would be dishonest). Etsy's behavior verified
byte-identical throughout (existing + 16 new tests, including a real
DB-backed test that creates and cleans up a throwaway seller channel to
verify org-scoped marketplace derivation).

**What did not change**: no marketplace's capability flags. Amazon/eBay/
TikTok Shop remain `ARCHITECTURE READY` (zero live capability); Shopify/
WooCommerce remain `PARTIAL` (account/orders only, no research/taxonomy/
SEO). A marketplace being selectable on these surfaces is a UI/routing
fact, not a capability claim — see the new "Marketplace-aware UI vs.
marketplace capability vs. implementation" section in
`docs/SELLERSALT-ARCHITECTURE.md`, added specifically because this
distinction is easy to blur once a selector appears on more pages.

## Documentation synchronization checkpoint (2026-08-19, second pass)

**Why**: after the batch above, before any further feature work, the
canonical documentation set needed re-verification against the actual
code (not just extension) so a fresh agent — Google Antigravity is the
named next agent — can pick up work with zero ambiguity about what's
real versus what's UI-wired versus what's still architecture-only.

**What changed**: `docs/SELLERSALT-ROADMAP.md` (Phases 3/4 marked DONE,
Phase 5 corrected to IN PROGRESS), `docs/MARKETPLACE-INTEGRATION-MATRIX.md`
(notes section only — no capability row changed), `docs/SELLERSALT-
HANDOFF.md` (new "what's next" reflecting the batch above, refreshed
baseline, new checkpoint section), `docs/SELLERSALT-MARKETPLACE-
ARCHITECTURE.md` (fixed a now-stale claim that only Prospects had
functional selector wiring; documented the fan-out helper and SEO
marketplace-derivation logic), `docs/SELLERSALT-ARCHITECTURE.md` (added
the UI-vs-capability-vs-implementation distinction and a fan-out
reference), `AGENTS.md` (research-pipeline export list, intelligence
engine table, `ListingDraft` Etsy-only note, refreshed test baseline,
removed a stale technical-debt bullet), this changelog. One previously
unflagged legacy document (`docs/MASTER_BLUEPRINT.md`, predates the
entire marketplace-abstraction effort and claimed to be "the entry point
for the docs/ tree" with no pointer to the current canonical set) got a
superseded-style notice — content otherwise untouched.
`docs/SELLERSALT-ARCHITECTURE-AUDIT.md` and the other already-marked
historical documents were deliberately left as-is; they're accurate
snapshots of their own moment in time, not claims about current state.

## Documentation synchronization (2026-08-19)

**Why**: development is transitioning to a different coding agent
(Google Antigravity). The architecture had evolved substantially across
the sessions above; the existing documentation (60+ files under `docs/`,
plus `AGENTS.md`/`GEMINI.md`/`CLAUDE.md`) had not kept pace — some of it
(`docs/25-roadmap/SELLERSALT_CAPABILITY_MATRIX.md`,
`docs/marketplace/marketplace-abstraction.md`, `SETUP.md`) actively
described a pre-marketplace-abstraction or pre-compliance-remediation
state that no longer matches the code, which risks misleading a fresh
agent working from documentation alone. This pass built the canonical
document set (`docs/SELLERSALT-ARCHITECTURE.md`,
`docs/SELLERSALT-HANDOFF.md`, this changelog, the refreshed roadmap and
matrix, a rewritten `AGENTS.md`) and added superseded-notices to the
specific legacy documents found to be actively stale, without deleting
any of them — see the documentation inventory in this session's final
report for the full classification.
