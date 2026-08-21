# Batch 37 — Product Research Engine Forensics, Data Contract Repair & Real Ecommerce Intelligence Validation

**Date:** 2026-08-21
**Branch:** `staging`
**Baseline commit:** `8411dc3` (Batch 36)
**Method:** Live forensic fetches of real `amazon.com`/`walmart.com` pages (via `curl`, both with SellerSalt's actual production User-Agent and, for controlled comparison, a plain browser UA), the real `orchestrateProductResearch` pipeline invoked directly against the running dev server's code, `npm run diagnose:acquisition`, and full `tsc`/`prisma validate`/`next build`/test-suite runs — every claim below is backed by an actual captured response or test run, not an inference from reading code.

---

## 1. Executive Summary — what was actually wrong

Batch 36 proved the SEARCH → RESEARCH → VALIDATE → PLAN chain works end-to-end with real Amazon/Walmart data, but founder review correctly identified that the *data itself* was too thin to be real ecommerce intelligence: a real search returned close to **title + URL only** — no image, no price, no reviews, no rating, no seller, no category, no demand signal.

Tracing the full pipeline (`Amazon/Walmart raw HTML → parser → NormalizedProduct → orchestrator → product-hunting.ts → NormalizedProductListing → UI`) found the cause was **three independent, compounding problems**, not one:

1. **Real parser defects.** Amazon's card-window cap (raised from 2,500 to 9,000 chars in a prior batch) was still too small — a real sponsored card's title sits at offset **9,771**, just past the cap, so many real cards silently lost their title/price/rating. Amazon's price regex only matched a leading `$`, so a geo-localized non-`$` price (see #2) failed to parse at all and, worse, the surrounding code hardcoded `currency: "USD"` regardless. Walmart's and Amazon's parsers never read ~10 real, already-present fields (seller name/ID, category, availability, badges, Amazon's own Best Sellers Rank) that were sitting unread in the exact HTML/JSON they already fetch.
2. **A UI-facing type-and-mapping gap**, not just a source gap. `NormalizedProduct` (the marketplace-neutral type) already had `category`/`brand`/`badges`/`availability` fields — they were simply never populated by the adapters. Separately, `NormalizedProductListing` (the UI-facing type) had **no field at all** for a product's own rating/review count, so even where the adapter *did* observe them, Batch 34-36's mapping layer stuffed them into the Etsy-shaped `NormalizedShopProfile.reviewCount/reviewAverage`, which the UI only renders when `shopMetricsObserved` is true — a flag that is **always false** for Amazon/Walmart. Real, present data was silently unreachable by the UI.
3. **Amazon's own anti-bot response to SellerSalt's honest bot disclosure** (see §13) — a real, external, and deliberately *not* worked around in this batch — suppresses price/rating/per-card-category specifically for the compliant, self-identifying `PublicPageFetcher` UA, even though the same request with a plain browser UA returns the full data. This is the single largest remaining gap in Amazon's field coverage and is a policy decision, not a code defect (see §24).

All of #1 and #2 are fixed in this batch, with new deterministic tests and a real live-server verification. #3 was investigated, proven with controlled before/after fetches, and **deliberately left unresolved** per explicit founder direction to keep the compliant bot disclosure — captured honestly below rather than worked around.

---

## 2. Real forensic method (not guessed, not inferred from docs)

- Fetched live `amazon.com` and `walmart.com` search + product-detail pages directly (`curl`, real browser UA) for "ceramic mug" and inspected the raw HTML/embedded JSON byte-for-byte.
- Isolated a real sponsored Amazon card and measured the actual offset from `data-asin` to `<h2>`: **9,771 characters** — beyond the existing 9,000-char cap.
- Found the requesting IP for this session gets **PKR-denominated** Amazon prices (`<span class="a-offscreen">PKR 4,159.35</span>`) — proving the existing `currency: "USD"` hardcode was a real, live mislabeling risk, not a hypothetical.
- Found Amazon's real per-card `data-csa-c-product-type="DRINKING_CUP"` attribute (236 occurrences on one page) — a genuine, previously-unread per-item category signal.
- Found Amazon's real product-detail page has **zero** `application/ld+json` `Product` blocks — the existing JSON-LD-based fallback path is dead code on current Amazon pages. Found the real, reliable replacements: `#wayfinding-breadcrumbs_feature_div` (category), `#bylineInfo` (brand), `#desktop-merchant-info`/`sellerProfileTriggerId` (seller name + ID), `#apex-pricetopay-accessibility-label` (price, with real currency), `#availability` (stock status), and the "Best Sellers Rank" detail-bullet row (a real demand-proxy signal, e.g. `"#8 in Mugs"`).
- Found Amazon's public seller "at-a-glance" page (`/gp/help/seller/at-a-glance.html?seller=...`) exposes Business Name/Address and a feedback percentage, but **no registration/member-since date anywhere** — confirmed shop age is genuinely `UNAVAILABLE` from Amazon's public surfaces, not merely unparsed.
- Found Walmart's search page's `__NEXT_DATA__` JSON carries **~130 real fields per item**, including `sellerName`/`sellerId`, `catalogProductType`, `departmentName`, `availabilityStatusV2`, `badges.flags`, `isSponsoredFlag`, `fulfillmentType` — none previously read. Found Walmart's product-detail JSON-LD is now also just a `WebPage`/speakable stub (no `Product` schema) — that fallback path was dead too. Found the real replacement: the product page's own `__NEXT_DATA__.props.pageProps.initialData.data.product` object, which additionally carries `sellerReviewCount`/`sellerAverageRating` (seller-level signals not present on search cards). No seller-registration/age field exists anywhere in this JSON either — Walmart shop age is genuinely `UNAVAILABLE` too.
- Ran the real production `orchestrateProductResearch` pipeline (the exact function every search API route calls) directly against the dev server's code for all 4 required queries, and separately via `npm run diagnose:acquisition`, to verify the fixes work end-to-end, not just against hand-built fixtures.

---

## 3. Field availability matrix (from real, captured evidence)

Classification legend: **OBSERVED** (present verbatim from the source), **DERIVED** (computed from an observed field, disclosed as such), **UNAVAILABLE** (confirmed absent from the legitimate source, not merely unparsed).

| Field | Amazon | Walmart |
|---|---|---|
| Title | OBSERVED | OBSERVED |
| URL | OBSERVED | OBSERVED |
| Image | OBSERVED | OBSERVED |
| Price | OBSERVED on a plain-browser fetch; **suppressed** for our disclosed bot UA (see §13) | OBSERVED |
| Currency | OBSERVED (now parsed honestly — was hardcoded USD) | OBSERVED (USD) |
| Rating | OBSERVED on a plain-browser fetch; **suppressed** for our disclosed bot UA on search cards | OBSERVED |
| Review count | Same as rating | OBSERVED |
| Category | OBSERVED per-card code (`data-csa-c-product-type`) on a plain-browser fetch — **suppressed** for our bot UA on search cards; OBSERVED as a full breadcrumb trail on the product-detail page **even under the bot UA** | OBSERVED (`departmentName` + `catalogProductType`) |
| Seller/shop name + ID | UNAVAILABLE on search cards (Amazon doesn't expose seller on cards); OBSERVED on the product-detail page (works under the bot UA) | OBSERVED on both search cards and detail |
| Shop age | **UNAVAILABLE** — confirmed absent from Amazon's public seller page | **UNAVAILABLE** — confirmed absent from Walmart's item/product JSON |
| Sales / sales velocity | **UNAVAILABLE** — no legitimate public source exposes this | **UNAVAILABLE** — same |
| Best-seller / sales rank | OBSERVED — real "Best Sellers Rank" (e.g. `#8 in Mugs`), works under the bot UA | UNAVAILABLE (no equivalent field found in the JSON) |
| Badges (sponsored/Best Seller/Amazon's Choice/material) | OBSERVED, works under the bot UA | OBSERVED (sponsored flag + merchandising badges), works under the bot UA |
| Availability (in/out of stock) | OBSERVED on the product-detail page (bot UA); not exposed as a static string on search cards | OBSERVED on both search cards and detail |
| Brand | UNAVAILABLE on search cards; OBSERVED on the product-detail page (bot UA) | OBSERVED (`brand` field on the product-detail JSON; largely `null` on search cards for third-party listings) |

**Reading this table honestly:** Walmart's real field coverage is now rich end-to-end. Amazon's parser is fully correct and will surface every one of these fields the moment the response contains them (proven against a plain-browser fetch of the identical page) — but in the **current, deliberately-unmodified** production configuration, Amazon withholds price/rating/per-card-category from SellerSalt's disclosed bot identity specifically. That withholding is real, external, and not a code defect in this batch.

---

## 4. Root cause #1 — the Amazon card-window cap

`parseAmazonListingCardsFromHtml`'s card-isolation window was `Math.min(nextCardStart, cardStart + 9000)`. A real sponsored card (Amazon places a large ad-metadata preamble before sponsored cards' actual content) has its `<h2>` title at offset **9,771** — past the cap. `nextCardStart` was already the authoritative, safe bound (prevents cross-card bleed); the extra fixed cap only mattered for the trailing/only card on a page, so it's raised to 60,000 rather than removed.

**Fix:** `src/marketplaces/amazon/public-adapter.ts` — cap raised, with a new regression test proving a title at exactly the real observed offset is now found (`src/tests/batch-37-product-research-data-contract.test.ts`, "extracts a title from a real sponsored-card gap size").

## 5. Root cause #2 — currency hardcoded to USD

The price regex only matched `\$([0-9,.]+)`, and the surrounding code set `currency: "USD"` unconditionally. A real live fetch from this session's IP returned `PKR`-denominated Amazon prices — under the old code, that price would have **silently failed to parse** (no `$`), and if it had matched via some other path, would have been mislabeled as USD, off by the real FX multiple.

**Fix:** new `parseAmazonPriceAndCurrency()` parses the real currency (3-letter code or `$`/`€`/`£`/`¥`/`₹` symbol) from the actual `a-offscreen` text instead of assuming one. A price is never emitted without its real currency — if currency parsing fails, price is set to `null` rather than guessed. Same fix applied to the product-detail page's price (now sourced from the real `#apex-pricetopay-accessibility-label` accessibility text, the most reliable price element on the current page — the previous JSON-LD/OpenGraph fallbacks are largely dead, see §7).

## 6. Root cause #3 — real fields sitting unread

Extended both adapters to read fields that were already present in the exact HTML/JSON they fetch but never parsed:

- **Amazon search cards:** `data-csa-c-product-type` → `category`; "Sponsored"/"Amazon's Choice"/"Best Seller" text + the material/attribute chip (`puis-medium-weight-text`) → `badges`.
- **Amazon product-detail:** HTML breadcrumb trail (`#wayfinding-breadcrumbs_feature_div`) → `categoryPath`; `#bylineInfo` → `brand`; `#desktop-merchant-info` → `shop.{name, externalId}`; `#availability` → `availability`; the "Best Sellers Rank" detail-bullet row → new `bestSellerRank` field (see §9).
- **Walmart search cards:** `sellerName`/`sellerId` → `shop`; `departmentName` + `catalogProductType` → `categoryPath`; `availabilityStatusV2`/`isOutOfStock` → `availability`; `badges.flags`/`isSponsoredFlag` → `badges`; `fulfillmentType` → `shippingInfo` (e.g. "Fulfilled by Walmart" vs "Sold by third-party marketplace seller").
- **Walmart product-detail:** new `parseWalmartProductFromNextData()` reads the page's real `__NEXT_DATA__.props.pageProps.initialData.data.product` object (replaces the dead JSON-LD path) — real `brand`, `category.path`, `availabilityStatusV2`, and seller identity.

## 7. Root cause #4 (found, not asked for) — both marketplaces' JSON-LD fallback paths are dead code today

Neither Amazon's nor Walmart's current product-detail pages ship a `Product` JSON-LD block (confirmed live: 0 `application/ld+json` blocks with product data on Amazon; Walmart's sole block is a `WebPage`/speakable stub). The pre-existing `fetchPublicProduct` methods' primary reliance on `parseProductFromJsonLd` was **silently non-functional on current live pages** for both marketplaces — this was true before this batch too, just never exercised with real traffic until now. Both are fixed with real HTML/JSON replacements (§6); the JSON-LD path is kept as a secondary fallback in case a future page variant restores it, never removed outright.

---

## 8. Filter semantics — the real "accepted, silently ignored" bug

Traced `minPrice`/`maxPrice` from the UI (`live-search-tab.tsx`'s existing price inputs) → `EtsySearchFilters` → `/api/products/search` → `searchMarketplaceProducts` → `orchestrateProductResearch(request, ...)`. `PublicSearchQuery` already carries `minPrice`/`maxPrice`, and `product-hunting.ts` already threads them into the orchestrator call — but **`orchestrator.ts` never once referenced `request.minPrice`/`request.maxPrice`**. A search with a price range set returned a real `200` with the full, unfiltered result set — exactly the "UI field exists → request 200s → filter ignored" defect this batch's instructions warned about.

**Fix:** `orchestrateProductResearch` now filters `mergedProducts` by the requested range after merging (covers PUBLIC_WEB, MARKETPLACE_API, and HISTORICAL_OBSERVATION sources uniformly, since it runs on the already-merged list). Semantics, per the spec's explicit requirement: an item with a real observed price outside the range is excluded; an item whose price is genuinely `null` (unobserved) is **never** excluded and never treated as `$0` — it passes through untouched. A `limitations` note records how many were excluded, for honest diagnostics. Three new deterministic tests prove all three behaviors against a fixture adapter (`src/tests/batch-37-product-research-data-contract.test.ts`).

**Review threshold and shop-age filters:** confirmed **NOT_IMPLEMENTED** — neither `EtsySearchFilters` (the request type) nor the search UI has ever had these fields, on any marketplace, including Etsy. Per this batch's explicit instruction not to invent a new filter architecture, these were **not built** in this pass — documented honestly here rather than silently left unaddressed.

**Multi-keyword search:** confirmed **NOT_IMPLEMENTED**. The UI takes a single keyword string; `filters.keywords` flows straight through as one query term with no split/fan-out/dedup/provenance logic anywhere in the pipeline. Not built this pass, for the same reason (a real new feature, out of this batch's explicit scope).

---

## 9. New data contract additions (additive, not new architecture)

`NormalizedProduct` (marketplace-neutral core type, `src/marketplaces/core/types.ts`) already had `category`/`categoryPath`/`brand`/`badges`/`availability`/`shop.{name,externalId}` — these were simply unpopulated before this batch (§6 fixes that). One genuinely new field was added:

- **`bestSellerRank?: Array<{ rank: number; category: string }>`** — Amazon's own real, marketplace-computed "Best Sellers Rank" (e.g. `#8 in Mugs`). Never converted into an estimated sales/day number — captured and displayed verbatim as a real demand-proxy signal, exactly per this batch's §5 instruction ("do NOT automatically turn signals into a fake sales number").

`NormalizedProductListing` / `NormalizedShopProfile` (the UI-facing types, `src/types/product-hunting.ts`) gained:

- `rating`/`reviewCount` **on the listing itself** — the critical fix from §1.2: a product's own rating is not a shop-level stat and must not be gated behind `shopMetricsObserved` (which exists to protect Etsy-shop-level aggregates, and is structurally always `false` for Amazon/Walmart). These now render independently.
- `brand`, `categoryPath`, `badges`, `availability`, `bestSellerRank` — passed straight through from the now-populated `NormalizedProduct` fields.
- `shopExternalId` on `NormalizedShopProfile` — the marketplace's own seller ID, when it legitimately exposes one distinct from the shop name.

Every construction site of these types across the app (`product-hunting.ts`'s Etsy and non-Etsy paths, `category-hunting.ts`, `radar-client.tsx`, `product-detail-client.tsx`, `shop-detail-client.tsx`, and 2 test fixture builders) was updated to set honest defaults (`null`/`[]`) rather than fabricate values for marketplaces/paths that don't have them — e.g. Etsy's search results explicitly document *why* `brand`/`categoryPath`/`badges`/`bestSellerRank` stay empty (Etsy's Open API v3 search response doesn't expose them).

---

## 10. Zero-fabrication audit of the change surface

Grepped the touched files and the pre-existing pipeline for `?? 0`, `?? 1`, hardcoded currency symbols, and fabricated defaults:

- Confirmed **no new fabrication was introduced** — every new field defaults to `null`/`[]`/`undefined` when unobserved, never a plausible-looking number.
- Found and fixed a **currency-mislabeling class of bug** in the UI layer, not just the adapter: `live-search-tab.tsx`, `ProductComparisonModal.tsx`, `ProductResearchDrawer.tsx`, and `AllMarketplacesResults.tsx` all hardcoded a `$` prefix (or, in `AllMarketplacesResults.tsx`, defaulted an absent currency to `$`) regardless of the item's real `currency` field. New shared helper `src/lib/format-price.ts` (`formatMarketplacePrice`) renders the real currency symbol/code and is now used at all four sites; `null` price still renders as "Unavailable" copy, never a fabricated `$0.00`.
- Batch 34-36's existing Zero-Fabrication guards (`shopMetricsObserved`, `p.price ?? 0` removed from render paths, `null`-safe price filtering) were re-verified intact — none were weakened by this batch's changes.

---

## 11. UI mapping — Product Research card now surfaces real evidence

Updated `src/app/(dashboard)/prospects/live-search-tab.tsx` (both the top "highest opportunity" card and the results grid), `src/components/intelligence/ProductComparisonModal.tsx`, `src/components/intelligence/ProductResearchDrawer.tsx`, and `src/components/intelligence/AllMarketplacesResults.tsx` to render: brand, category (most-specific level), real merchandising/sponsored badges, product-level rating/review count (independent of the Etsy-only shop-metrics gate), availability (with an "Out of stock" flag), and a marketplace's own Best Sellers Rank when present — never a fabricated placeholder for a field that came back `null`.

---

## 12. Database audit

Checked `Prospect`, `ProductValidation`, `SavedOpportunity`, `PlannerItem.researchSnapshot` against the newly-available fields. **No schema changes were required or made** — every field this batch surfaces (category, badges, availability, seller identity, best-seller rank) is either already representable in the existing JSON `researchSnapshot`/`metadata`-style columns these models already use, or is a search/API-response-only signal (like a live card's `badges`) that was never intended to be persisted as its own column, matching how `keywordSignals`/`competitionSignals` already work on `NormalizedProduct`. `npx prisma validate` confirms the schema is unchanged and valid.

---

## 13. Root cause #3, in full — Amazon's anti-bot response to honest disclosure

`src/marketplaces/core/acquisition/compliance.ts`'s `CENTRAL_COMPLIANCE_POLICY.defaultUserAgent` is a real Chrome UA string with an appended, honest bot signature: `"...Chrome/124.0.0.0 Safari/537.36 (SellerSalt Commerce Research Bot/1.0; +https://sellersalt.com/bot; research@sellersalt.com)"` — a deliberate compliance/transparency choice from an earlier batch (not this one).

**Controlled test, same exact ASIN (`B0FR1FDNSV`), both fetches within minutes of each other:**

| Fetch | Search-card price | Search-card rating/reviewCount | Search-card category code | Product-page price | Product-page brand/seller/breadcrumb/BSR |
|---|---|---|---|---|---|
| SellerSalt's real production UA (bot-disclosed) | absent (`a-offscreen` = 0 occurrences) | absent for this card | absent (`data-csa-c-product-type` = 0) | absent (`apex-pricetopay-accessibility-label` = 0) | **present** — all four |
| Plain browser UA (no bot signature) | `PKR 2,771.98` | `4.6` / `187` | `DRINKING_CUP` | `PKR 2,771.98` | present |

This is Amazon's own server-side access-control decision responding to the disclosed bot identity — not a SellerSalt parsing defect. The adapter code is proven correct against the plain-browser response; it will pass through 100% of price/rating/category the instant the response contains them.

**Per this batch's explicit instructions** ("Do not bypass anti-bot systems... Do NOT use stealth browsers/proxies/CAPTCHAs... detection evasion"), this was **not worked around**. It was raised to the founder directly as a real decision point (keep honest disclosure vs. drop the bot signature to restore the data), and the founder chose to **keep the honest bot disclosure**. Amazon's price/rating/per-card-category therefore remain genuinely unavailable in the current production configuration — an external, disclosed, and now-documented limitation, not a defect left unfixed.

---

## 14. Real-data test matrix (4 required queries, live pipeline, `limit=10` each)

Run via `orchestrateProductResearch` directly against this session's dev server (not fixtures), production UA (i.e. reflecting the real, currently-deployed behavior including §13's constraint):

| Query | Marketplace | Items | With image | With price | With rating | With category | With seller | With badges |
|---|---|---|---|---|---|---|---|---|
| wooden desk organizer | Amazon | 10 | 100% | 0% | 0% | 0% | 0% | 100% |
| wooden desk organizer | Walmart | 10 | 100% | 100% | 80% | 100% | 100% | 80% |
| ceramic mug | Amazon | 10 | 100% | 0% | 0% | 0% | 0% | 100% |
| ceramic mug | Walmart | 10 | 100% | 100% | 70% | 100% | 100% | 100% |
| wedding gifts | Amazon | 10 | 100% | 0% | 0% | 0% | 0% | 60% |
| wedding gifts | Walmart | 10 | 100% | 0%* | 90% | 100% | 100% | 60% |
| leather wallet | Amazon | 10 | 100% | 0% | 0% | 0% | 0% | 20% |
| leather wallet | Walmart | 10 | 100% | 100% | 100% | 100% | 100% | 90% |

\* one query's Walmart page happened to serve the real `"price not yet loaded"` sentinel (`linePrice: ""`, `minPrice: 0`) for every item on that page — correctly rejected as `null` by the Batch 36 `> 0` guard rather than shown as `$0`. This is real, load-bearing behavior from a prior batch, re-verified intact here, not a Batch 37 defect.

**Before this batch**, every one of these Amazon/Walmart columns beyond "with image" was effectively 0% — this table is the honest before/after: Amazon's title+URL+image ceiling under the current UA policy is real, but its badges/brand/seller/category-on-detail-page/BSR are now genuinely richer than before (§3). Walmart went from "title+URL+image+sometimes-price" to comprehensively rich across every column.

---

## 15. Testing

New file `src/tests/batch-37-product-research-data-contract.test.ts` — **19 new deterministic tests**, no live network, built from synthetic-but-structurally-real fixtures modeled on the actual captured markup/JSON above:

- Amazon window-cap fix (proves the exact 9,771-char real-world offset is now handled, plus no cross-card bleed).
- Currency-honest parsing (PKR example, USD example, unparseable-text-returns-null, never price-without-currency).
- Category/badges/sponsored-disclosure extraction, and a "never fabricates when absent" guard.
- Breadcrumb category HTML parsing, including an empty-input guard.
- Walmart seller/category/availability/badges extraction, and a "never fabricates when absent" guard.
- Orchestrator price filter: excludes out-of-range observed prices, never excludes a genuinely-unavailable price, passes everything through when no filter is requested.

**Full suite: 1,222/1,222 passing** (1,203 baseline + 19 new), across 359 suites. `npx tsc --noEmit`, `npx prisma@5.22.0 validate`, and `npx next build` all clean (183 routes compiled, no new routes).

---

## 16. Real verification method used (and its limitation, disclosed honestly)

A real authenticated browser session against the running dashboard was **not performed** in this pass — this session doesn't have a working set of dashboard login credentials, and creating a brand-new signup account for verification was judged out of scope for a data-pipeline batch. Instead, verification used:

1. Direct calls to the exact same `orchestrateProductResearch` function every real search API route calls, against the real, running dev server's compiled code (not a mock) — §14's table.
2. `npm run diagnose:acquisition -- "<query>"` (the project's own established diagnostic tool) for all 4 required queries.
3. Real, live `curl` fetches of `amazon.com`/`walmart.com` (search + detail pages) to establish ground truth for what the parsers should extract, then re-verified the actual parser functions against those exact captured files.

This is real, live, code-path-accurate evidence, but it is not the "click through the actual UI in a real browser" verification the batch instructions asked for. **Flagged honestly as an open item** — a follow-up session with real dashboard credentials (or a fresh signup) should click through `/prospects` with the four required queries and confirm the rendered cards match §11's mapping, before this can be marked as browser-verified.

---

## 17. Remaining limitations (explicit, not glossed over)

- **Amazon price/rating/per-card-category are suppressed by Amazon for our disclosed bot UA** (§13) — external, deliberately not worked around, founder-confirmed to stay as-is.
- **Shop age is genuinely `UNAVAILABLE` for both Amazon and Walmart** — confirmed absent from every legitimate public surface checked (Amazon's seller at-a-glance page; Walmart's ~130-key item/product JSON). No UI filter or display for it was built (there is nothing real to filter/display).
- **Sales count / sales velocity are genuinely `UNAVAILABLE`** for both marketplaces — no legitimate public source exposes them. Amazon's real Best Sellers Rank is the closest legitimate demand-proxy signal and is now captured (§9) — never converted into an estimated sales/day number.
- **Review-count and shop-age filters, and multi-keyword search, remain `NOT_IMPLEMENTED`** — confirmed, not silently ignored, and deliberately not built this pass (§8) per the explicit "don't invent new filter architecture / don't build new features" instruction.
- **No real-browser click-through verification this pass** (§16) — a real, disclosed gap, not claimed as done.
- **Three independent acquisition implementations still exist** (`orchestrateProductResearch`, `ProductValidationEngine`'s own loop, `ProductOpportunityWorkspaceEngine`'s own loop) — this is the same architecture debt Batch 36 flagged and explicitly deferred; not addressed in this batch either, since consolidating them is a larger refactor than this batch's forensic-and-repair mandate.

---

## 18. External dependencies

- Etsy's `MARKETPLACE_API` credential is still rejected (`403`, unchanged since Batch 34) — external, needs reissue in the Etsy Developer Console.
- Amazon/eBay/TikTok Shop have no official developer-program credentials — external, unchanged.
- Amazon's price/rating/category suppression under a disclosed bot UA (§13) is Amazon's own access-control behavior — not something SellerSalt's code can address without changing the bot-disclosure policy, which this batch was explicitly told not to do unilaterally.

---

## 19. Launch classification

**PRIVATE_BETA_READY — unchanged from Batch 36, with materially better evidence quality, not worse.**

The reasoning explicitly required by this batch's instructions: the SEARCH → RESEARCH → VALIDATE → PLAN chain Batch 36 verified still works (this batch didn't touch validation/planning logic), and the *evidence* backing it is now real and richer for Walmart (image, price, rating, reviews, category, seller, badges, availability all genuinely observed and correctly surfaced) and modestly richer for Amazon (brand, seller, category, Best Sellers Rank, and merchandising badges now real, where before this batch it was title+URL+image only). Amazon's price/rating/per-card-category remain unavailable due to a real, external, founder-confirmed policy constraint (§13), not a defect — this is disclosed honestly rather than hidden behind a generic "beta ready" label.

This is **not** `PUBLIC_LAUNCH_READY` — no extended stable-operation track record exists, and this pass didn't attempt to establish one. It is **not** downgraded to `ACQUISITION_READY_FOR_BETA` — a real merchant can still search, get real (if Amazon-constrained) observations, validate them with disclosed evidence, and plan them, which is the bar that classification requires clearing.

---

## 20. Files changed

- `src/marketplaces/core/types.ts` — added `bestSellerRank` to `NormalizedProduct`.
- `src/marketplaces/amazon/public-adapter.ts` — window-cap fix, currency-honest price parsing, category/badges/sponsored extraction (cards), brand/seller/breadcrumb-category/availability/BSR/currency-honest price extraction (detail page).
- `src/marketplaces/walmart/public-adapter.ts` — seller/category/availability/badges/fulfillment extraction (cards), new `parseWalmartProductFromNextData` replacing the dead JSON-LD detail-page path.
- `src/marketplaces/core/acquisition/orchestrator.ts` — real minPrice/maxPrice enforcement with UNAVAILABLE-price-safe semantics.
- `src/types/product-hunting.ts` — new listing-level `rating`/`reviewCount`/`brand`/`categoryPath`/`badges`/`availability`/`bestSellerRank`, new shop-level `shopExternalId`.
- `src/services/product-hunting.ts` — maps the new fields through for both the Etsy and non-Etsy (orchestrator) paths, with honest per-marketplace defaults.
- `src/lib/format-price.ts` — new shared currency-honest price formatter.
- `src/app/(dashboard)/prospects/live-search-tab.tsx`, `src/components/intelligence/ProductComparisonModal.tsx`, `src/components/intelligence/ProductResearchDrawer.tsx`, `src/components/intelligence/AllMarketplacesResults.tsx` — render the new fields; replace hardcoded `$` price prefixes with the shared formatter.
- `src/app/(dashboard)/products/[listingId]/product-detail-client.tsx`, `src/app/(dashboard)/radar/radar-client.tsx`, `src/app/shops/[shopExternalId]/shop-detail-client.tsx`, `src/services/category-hunting.ts` — updated to the new required type fields with honest empty defaults (Etsy-only surfaces).
- `src/tests/batch-37-product-research-data-contract.test.ts` — new, 19 tests.
- `src/tests/batch-36-end-to-end-commercial-intelligence.test.ts`, `src/tests/phase-c-product-hunting.test.ts` — updated fixtures for the new required type fields (no behavioral change).

No Prisma schema changes. No new marketplaces, AI features, or scoring systems were added, per this batch's explicit constraints.
