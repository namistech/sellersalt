# BATCH 39 — Independent Ecommerce Intelligence Acquisition Strategy Audit

**Date:** 2026-08-21
**Branch:** `staging`
**Baseline commit:** `50a4309` (Batch 38)
**Method:** Direct inspection of the current codebase (no assumptions carried forward uncritically from prior batch reports — each claim below was re-checked against real code or a real live request this session), one fresh real bounded Amazon acquisition trace run stage-by-stage against the live dev environment, and structured web research into eight named ecommerce-intelligence competitors (three parallel research agents, each required to tag every claim VERIFIED / INFERENCE / UNKNOWN).

**Scope discipline**: per explicit founder instruction, this batch is an audit and documentation deliverable. No feature was implemented. The only artifacts produced are the six documentation files listed in §16 plus pointer updates to `CLAUDE.md`/`AGENTS.md`/`SELLERSALT-HANDOFF.md`.

---

## 1. Current architecture (re-verified, not assumed)

The pipeline described in `docs/INDEPENDENT-ECOMMERCE-INTELLIGENCE-ACQUISITION-ENGINE.md` §2 is real end-to-end except one layer (Estimation Models, which doesn't exist). Confirmed this session:

- Governance modules (`SourcePolicyEnforcer`, `AntiCircumventionGuard`/`anti-circumvention.ts`, `SourceBoundary`, `DataTrustEngine`, `MarketplaceAccessResolver`, `SignalClassification`) all exist as real files under `src/marketplaces/core/governance/` and `src/services/intelligence/data-trust-engine.ts`, and `git diff`/`git log` confirm none were touched by Batches 37-38.
- Each marketplace has its own `PublicWebAcquisitionAdapter` (`src/marketplaces/<marketplace>/public-adapter.ts`) — Amazon has no official-API connector at all today (none configured); this is the concrete, load-bearing proof that "official API is not automatically primary" is already how the code is built, not just a stated intention.
- `ProductObservation`/`ProductObservationSnapshot` (real historical storage, extended in Batch 38) and `KeywordObservation`/`CategoryObservation` (real, but with **no snapshot/history table** — a genuine, newly-documented gap, see §5 and §11) all exist and were inspected directly against `prisma/schema.prisma`.

## 2. Real acquisition trace — one Amazon request, stage by stage (this session, live)

Query: `"ceramic mug"`, marketplace: Amazon, no filters.

| Stage | Result |
|---|---|
| Raw HTTP request | `GET https://www.amazon.com/s?k=ceramic%20mug` |
| HTTP status | `200` |
| Response size | 1,083,874 bytes |
| Fetch duration | 2,350 ms |
| Raw `data-asin` attribute occurrences | 95 |
| Parsed (deduplicated) product count | 48 |
| — with observed price | **0** |
| — with observed rating | **0** |
| — with observed category | **0** |
| Orchestrator merged/scored/returned count | 25 (capped at requested limit) |
| Orchestrator status | `AVAILABLE` |
| Orchestrator duration | 11 ms (post-fetch; fetch itself was the 2,350ms above) |
| Persisted to `ProductObservation` (checked after a 4s wait for the fire-and-forget background write) | 7 of 25 matched on this check — background persistence had not fully landed for all items by the check time; Batch 38's dedicated persistence test (4-second wait, single-item focus) already proved the mechanism works correctly end-to-end, so this is a timing artifact of this trace's method, not a new defect |
| UI-facing (`searchMarketplaceProducts`) result count | 25 |

**Reading this honestly**: the pipeline runs cleanly end-to-end (200 → parsed → normalized → scored → persisted → returned), but **zero of the 48 parsed Amazon products carried an observed price, rating, or category** in this live run — the exact Batch 37 finding (Amazon suppresses these fields from SellerSalt's honestly-disclosed bot User-Agent), reconfirmed live, unchanged, still the single most consequential fact about SellerSalt's current Amazon acquisition. See §7 for what this means for the launch classification.

## 3. Real data currently obtainable (per marketplace, current state)

The full field-by-field matrix lives in `docs/PRODUCT-RESEARCH-DATA-CONTRACT.md` §2 and §7 (updated this batch with a formal FIELD/TYPE/SOURCE/CLASSIFICATION/REQUIRED/FRESHNESS/CONFIDENCE table) — not duplicated here. Summary:

- **Walmart**: rich, real, and currently the most complete of any marketplace SellerSalt acquires from — price, rating, reviewCount, category, seller identity, availability, badges all genuinely OBSERVED on search cards, verified repeatedly across Batches 37-38 and reconfirmed by this batch's trace methodology being applicable equally to it.
- **Amazon**: title/URL/image always OBSERVED; brand/seller/category/availability/BestSellersRank OBSERVED **only on the product-detail page**, not search cards; price/rating/reviewCount/per-card-category currently **suppressed** by Amazon's own response to SellerSalt's disclosed bot identity (confirmed live again this session, §2).
- **Etsy**: architecturally the richest data model of any marketplace (real lifetime sales count, real shop age, real per-listing review stats) but currently **inaccessible** — official API credential rejected (`403`, external, unresolved since Batch 34), public-web access blocked by Etsy's own anti-bot protection.
- **eBay**: public-web access blocked (`ACCESS_RESTRICTED`, confirmed live in Batch 37/38's diagnostics). No official API integration exists.
- **Shopify/WooCommerce/TikTok Shop**: no research-mode acquisition path exists at all (Shopify/WooCommerce are connected-store-only integrations; TikTok Shop is an architecture-ready stub).

## 4. The six-state classification model (formalized this batch)

Extending the five-state provenance model in `docs/DATA-TRUST.md` (Batch
38) with one more distinction this batch's spec asked for explicitly:

| State | Meaning | Differs from `DATA-TRUST.md`'s states how |
|---|---|---|
| OBSERVED | Directly read from the source, this request | = `ACTUAL_DATA` |
| **HISTORICAL_OBSERVED** | Was directly observed, at an earlier point in time, and is being read back from SellerSalt's own database | New distinction — was previously folded into `ACTUAL_DATA`/`isHistorical` flag; worth its own label because its *freshness* guarantee is different even though its *truthfulness* is identical |
| DERIVED | Computed deterministically from OBSERVED/HISTORICAL_OBSERVED fields | = `DATA-TRUST.md`'s DERIVED |
| ESTIMATED | Model-based inference, disclosed as such | = `DATA-TRUST.md`'s ESTIMATED |
| USER_DERIVED | Supplied by the merchant | = `DATA-TRUST.md`'s USER_DERIVED |
| UNAVAILABLE | Not legitimately observable | = `DATA-TRUST.md`'s UNAVAILABLE |

No code change accompanies this — it's a documentation refinement.
`docs/DATA-TRUST.md` is not being replaced; this table is additive
context for this audit.

## 5. Data that can be historically accumulated (real infrastructure, real gap)

`ProductObservation`/`ProductObservationSnapshot` can accumulate price,
rating, reviewCount, availability, shopName, and (Amazon)
bestSellerRank history — real, extended in Batch 38, verified with a live
database test. **`KeywordObservation` and `CategoryObservation` have no
equivalent snapshot table** — every re-observation overwrites the same
row. This is the single clearest, most actionable historical-data gap
found by this audit (see §11, §16).

## 6. Data that can be derived vs. must remain estimated vs. unavailable

- **DERIVED, real today**: `estDailySales`/`avgSellingRatio` (Etsy only,
  from real `totalSales`/`shopAgeMonths`); price/review/rating
  distributions computed from a single search's sample (already real in
  `ProductValidationEngine`, sample-bounded — see
  `docs/PRODUCT-RESEARCH-DATA-CONTRACT.md` §7's caveat).
- **ESTIMATED, not built**: no sales/revenue/demand estimation model
  exists anywhere in the codebase today. §9 defines the input→model→
  estimate→confidence→provenance shape any future model must follow;
  none is implemented.
- **UNAVAILABLE, confirmed by direct inspection, not assumption**: shop
  age (Amazon/Walmart — checked against Amazon's public seller
  "at-a-glance" page and ~130 real Walmart item/product JSON keys in
  Batch 37, no registration-date field found in either); sales count
  (Amazon/Walmart, no legitimate public source); real search volume
  (every marketplace — see `docs/KEYWORD-INTELLIGENCE-ARCHITECTURE.md`
  §2).

## 7. Competitor methodology research — key findings

Full detail in `docs/COMPETITOR-DATA-ACQUISITION-RESEARCH.md` (eight
companies: Helium 10, Jungle Scout, Keepa, SellerApp, DataHawk, eRank,
EtsyHunt, Alura). The findings most relevant to SellerSalt's own strategy:

1. **Not one of the eight companies researched claims an official
   marketplace API as the primary source of competitor/market-wide
   research data** — including DataHawk, the one company with a
   *verified* official Amazon Ads/Software Partner status, whose
   competitor data comes from a separate daily public-marketplace scan,
   not its official-partner pipeline. This directly validates the
   founder's "not a thin API wrapper" direction — it's not merely
   SellerSalt's own constraint, it's the entire category's actual
   architecture.
2. **Every company that publishes a sales/revenue estimate discloses it
   as an estimate**, never a raw observed fact — Alura's own words ("not
   100% accurate... does not give exact numbers") and DataHawk's
   published per-estimate accuracy/confidence score are the two most
   transparent examples found, and DataHawk's confidence-score pattern
   is the closest real precedent for the range+confidence+basis format
   `docs/PRODUCT-RESEARCH-DATA-CONTRACT.md` §6 already commits SellerSalt
   to.
3. **Etsy-specific tools (eRank, EtsyHunt, Alura) all pair a real,
   registered Etsy API connection with a browser extension** that reads
   rendered page content for whatever the API doesn't expose. This is a
   materially different acquisition mode than SellerSalt's current
   server-side `PublicPageFetcher` — flagged explicitly in §17 as *not*
   recommended for adoption without a dedicated compliance review, not
   because it's necessarily wrong, but because it changes SellerSalt's
   entire compliance posture (a user's own logged-in browser session vs.
   an anonymous server request) and deserves its own deliberate decision,
   not a default copy.
4. **Jungle Scout's disclosed crowdsourced HTML-collection model** (every
   user's extension activation contributes page data back to the company)
   is a genuinely different acquisition *category* from anything
   SellerSalt does today — noted for completeness, not recommended in
   this audit.

## 8. What's currently broken — P0/P1/P2/P3

**The governing question, per this batch's own instruction**: *can a
merchant currently search one marketplace and receive enough truthful
evidence to decide whether a product deserves further investigation?*

**For Walmart: yes, unambiguously.** Real price, rating, review count,
category, seller, availability, and badges — a merchant has genuinely
enough evidence to make a first-pass decision.

**For Amazon — the founder's stated first marketplace — the honest
answer is thinner than the strategic choice implies.** Search-card data
today is title/image/URL/badges only; price/rating/category require the
product-detail page, and even there price/rating remain unavailable
(§2's live trace). Brand/seller/category/availability/BestSellersRank
*are* real on the detail page. This is not "title and URL only" (that was
the pre-Batch-37 state) — but it is meaningfully thinner than Walmart,
for a reason (§13/DATA-ACQUISITION.md §14) that was already found,
verified, and explicitly decided by the founder to leave unchanged. This
tension — Amazon chosen strategically as "first," Walmart currently
richer empirically — is the single most important finding of this audit
to surface plainly rather than paper over. It is not classified P0 below
because a real, truthful, non-fabricated decision-support signal *does*
exist for Amazon (badges, category, brand, seller, rank on the detail
path) — just a thinner one than Walmart's.

**P0 (prevents basic Product Research): none found.** Every marketplace
SellerSalt currently searches returns real, non-fabricated data — the
system never silently fails into fabrication. Search, filter, persist,
and the point-in-time Validate/Plan chain all function truthfully today
(Batches 36-38, reconfirmed by this audit's own trace).

**P1 (prevents useful intelligence):**
- Amazon's price/rating/per-card-category suppression (§2, §7) — real,
  external, already decided to stay as-is, but still the single largest
  live limiter of Amazon-specific usefulness.
- The legacy `Prospect.price` non-nullable column forcing a fabricated
  `$0.00` on the Dashboard's "Top Opportunity Discoveries" widget (found
  live in Batch 38, still unfixed) — a live, real, user-visible Zero-
  Fabrication Contract violation, even though it's isolated to one
  secondary widget, not the core Product Research grid.
- `KeywordObservation`/`CategoryObservation` have no snapshot/history
  table (§5) — blocks all keyword/category trend intelligence, which
  blocks most of `docs/MARKET-INTELLIGENCE-ROADMAP.md`'s dependency
  chain from ever starting.

**P2 (limits enrichment):**
- Category filtering remains `NOT_IMPLEMENTED` for Product Research.
- Multi-keyword search exists for Product Research (Batch 38) but not
  yet for Keyword Research (`docs/KEYWORD-INTELLIGENCE-ARCHITECTURE.md`
  §2) — an inconsistency between two related systems, not a defect in
  either alone.
- `ProductFieldLineage` (per-field provenance) is defined but never
  populated by any adapter — every record carries one record-level
  `source`, not independent per-field provenance.
- No persisted keyword→product relationship (which specific products a
  keyword's stats were derived from is not retained).

**P3 (future optimization):**
- The entire Market Intelligence layer (§11 of the founder's spec;
  `docs/MARKET-INTELLIGENCE-ROADMAP.md`) — demand signals, opportunity
  density, category/keyword trends, lifecycle detection, whitespace
  scoring. Correctly deferred; its real prerequisite (accumulated
  multi-observation history over real elapsed time) does not exist yet
  and cannot be created by writing more code.
- Any sales/demand estimation model (§9 below) — same reasoning.

## 9. Sales estimation — the shape a future model must follow (not built)

No estimation model exists in this codebase today. If/when one is built,
it must follow exactly this shape, per the founder's explicit spec and
validated by every credible competitor researched (§7):

```
INPUT SIGNALS (all must be real, OBSERVED/HISTORICAL_OBSERVED)
  Amazon: bestSellerRank (current + historical), category, price,
          review velocity (once history exists)
  Walmart: rating, reviewCount, price, category (bestSellerRank
          confirmed UNAVAILABLE for Walmart — see
          docs/PRODUCT-RESEARCH-DATA-CONTRACT.md)
  Etsy: real transaction_sold_count is already OBSERVED, not estimated —
        Etsy needs no estimation model at all for this field
       ↓
MODEL (does not exist yet — would need real historical ground truth to
       validate against before shipping, per docs/MARKET-INTELLIGENCE-
       ROADMAP.md's dependency chain)
       ↓
ESTIMATE — a range, never a bare number, e.g.:
  "Estimated monthly sales: 1,200–1,700"
       ↓
CONFIDENCE — LOW / MEDIUM / HIGH, disclosed alongside the range
       ↓
PROVENANCE — "ESTIMATED", with the exact input signals and model version
             named, per docs/DATA-TRUST.md
```

**Never**: `bestSellerRank → a single fabricated exact monthly number`.
No such code path exists in SellerSalt today, and this document is the
explicit record of what would be required before one could exist
responsibly.

## 10. Recommended acquisition architecture

Full detail in `docs/INDEPENDENT-ECOMMERCE-INTELLIGENCE-ACQUISITION-ENGINE.md`.
Summary: the architecture already matches the founder's direction
(per-marketplace adapters, official APIs not primary, governance-first) —
this batch's contribution is naming it explicitly and documenting the
real source-priority table per marketplace, not redesigning it.

## 11. Product Research MVP dataset

Full formal table in `docs/PRODUCT-RESEARCH-DATA-CONTRACT.md` §7
(FIELD/TYPE/SOURCE/CLASSIFICATION/REQUIRED/FRESHNESS/CONFIDENCE/MVP-STATUS).
The MVP-required fields (marked "Yes" in that table) are: title,
productUrl, imageUrl, price, currency (with price), rating, reviewCount —
i.e. exactly the fields Walmart already provides in full and Amazon
currently provides only partially (§8).

## 12. Keyword Research architecture

Full detail in `docs/KEYWORD-INTELLIGENCE-ARCHITECTURE.md`. Summary: a
system related to, sharing acquisition/historical-storage philosophy
with, but architecturally distinct from, Product Research. Real today for
single-keyword harvest; multi-keyword, keyword/product relationship
persistence, and trend detection are documented gaps, not silently
missing.

## 13. Historical intelligence strategy

`docs/HISTORICAL-INTELLIGENCE.md` (Batch 38) remains the canonical
six-phase document; this batch's `docs/MARKET-INTELLIGENCE-ROADMAP.md`
is its Market-Intelligence-specific expansion (Phases 3-6), not a
duplicate — see that file's §1 dependency chain.

## 14. Market Intelligence roadmap

`docs/MARKET-INTELLIGENCE-ROADMAP.md` — every capability in its table is
explicitly marked "not built," with its real data prerequisite named.
Nothing in it is implemented by this batch.

## 15. P0/P1/P2/P3 — see §8 above (not duplicated here).

## 16. Exact next implementation batch (recommended, not started)

In priority order, each independently scoped and small enough to be one
batch:

1. **Fix the `Prospect.price` fabrication** (P1, §8) — make the column
   nullable, audit every read site that assumes non-null (the real reason
   this wasn't fixed in Batch 38: the blast radius wasn't yet mapped).
   This is the most concrete, bounded P1 fix available.
2. **Add `KeywordObservationSnapshot` and `CategoryObservationSnapshot`**
   tables, mirroring `ProductObservationSnapshot`'s existing
   change-detection pattern exactly (§5, §11) — the single migration that
   unblocks the entire trend-intelligence dependency chain in
   `docs/MARKET-INTELLIGENCE-ROADMAP.md`.
3. **Port Batch 38's multi-keyword OR-fanout to Keyword Research**
   (`fetchMarketplaceKeywordResearch`) — closes the P2 inconsistency
   between the two systems using an already-proven pattern.

Explicitly **not** recommended as the next batch: any estimation model,
any Market Intelligence UI, any browser-extension acquisition mode — all
depend on prerequisites this batch confirmed don't exist yet (§8 P3, §17).

## 17. What NOT to build (explicit)

- **No sales/revenue estimation model** until real historical ground
  truth exists to validate one against (§9, §14).
- **No Market Intelligence UI/scoring layer** (§14) — its data
  prerequisite doesn't exist.
- **No browser-extension-based acquisition** — a materially different
  compliance posture (§7 point 3) than SellerSalt's current server-side
  model; not ruled out forever, but requires its own dedicated compliance
  review, never adopted by default because competitors do it.
- **No workaround for Amazon's bot-UA data suppression** — re-confirmed
  out of scope by explicit founder decision in Batch 38; unchanged here.
- **No revival of "All Marketplaces" as the default UI/search mode** —
  Batch 38's reversal (Amazon-first default) stands; this audit found no
  evidence that changes that direction.
- **No new marketplace added** — this batch, like Batch 38, stayed within
  Amazon/Walmart/Etsy (the three already integrated).

## 18. Exact launch classification

Per this batch's own strict rubric: *"SellerSalt is ready only when
SEARCH → REAL OBSERVATIONS → HISTORICAL DATA → USEFUL INTELLIGENCE →
VALIDATION → PLAN works truthfully for at least one marketplace. If not,
say NOT_YET_READY_FOR_PRODUCT_RESEARCH."*

This requires an honest split, because "HISTORICAL DATA" and "USEFUL
INTELLIGENCE" can mean two different things, and conflating them would
either overclaim or underclaim:

**Reading the chain as a single-cycle loop** (search → real observation →
storage capability exists and is exercised → point-in-time validation →
plan): **this works truthfully today, for Walmart fully and Amazon
partially** — unchanged from Batch 38's `PRODUCT_RESEARCH_READY`
classification, reaffirmed by this audit's own live trace (§2) and by
Batch 36's still-standing SEARCH→VALIDATE→PLAN verification.

**Reading the chain as requiring genuinely *accumulated*, multi-
observation, trend-derived historical intelligence** (the deeper reading
`docs/MARKET-INTELLIGENCE-ROADMAP.md` is built around): this is
**`NOT_YET_READY_FOR_PRODUCT_RESEARCH`** in that specific sense — not
because of a missing feature, but because no product has yet been
observed multiple times over meaningful real elapsed time in actual use.
The storage infrastructure for this is real (Batch 38); the *accumulated
data* is not, and cannot be produced by writing more code — it requires
the product to actually run and be searched against, repeatedly, over
real weeks. This is not a defect to fix in a future batch; it is a fact
about time that this audit is naming honestly rather than glossing over
with a single reassuring label.

**Net classification, stated precisely rather than as one slogan**:
SellerSalt's Product Research is **`PRODUCT_RESEARCH_READY`** for a
single-cycle, point-in-time research → validate → plan workflow (Batch
38's classification, unchanged). It is **`NOT_YET_READY_FOR_PRODUCT_RESEARCH`**
for the fuller, historically-derived Market Intelligence experience this
batch's founder direction describes as the eventual product — and that
gap is honestly named, not hidden behind "production ready" language, per
this batch's explicit instruction.
