# COMPETITOR-DATA-ACQUISITION-RESEARCH.md

Batch 39. Research into how established ecommerce intelligence platforms
publicly describe acquiring/deriving their data — to inform, not copy,
SellerSalt's own architecture. Every claim below is tagged:

- **VERIFIED PUBLICLY DOCUMENTED FACT** — sourced to the company's own
  page/docs, or a consistent, specific third-party citation, linked inline.
- **INFERENCE** — a reasonable deduction from available evidence, not
  directly stated by the company.
- **UNKNOWN** — genuinely undisclosed; not guessed at.

No proprietary internal system any of these companies hasn't publicly
disclosed is claimed here. Research was conducted via live web search in
2026; company practices may have changed since any cited page was written.

---

## Helium 10 (Amazon)

**Official marketplace APIs**: Xray "sources its data directly from
Amazon's API" (self-reported; exact API — SP-API vs. Advertising API vs.
neither formally — unspecified). **VERIFIED PUBLICLY DOCUMENTED FACT**
([Chrome Extension page](https://www.helium10.com/tools/product-research/chrome-extension/)).
Seller-Central-connected features (Adtomic, Inventory Management) likely
use Advertising API/SP-API — **INFERENCE**, not directly sourced.

**Public web acquisition**: "collects publicly available Amazon and
Walmart marketplace data" — **VERIFIED PUBLICLY DOCUMENTED FACT**
(consistent third-party summary of Helium10's own positioning:
[gofbahub.com](https://www.gofbahub.com/helium10/xray/),
[Helium10 KB](https://kb.helium10.com/hc/en-us/categories/20543704378139-Helium-10-s-Chrome-Extension)).
Amazon↔Walmart product matching via public UPC codes — **VERIFIED
PUBLICLY DOCUMENTED FACT** ([Walmart extension KB](https://kb.helium10.com/hc/en-us/articles/4404323161371)).

**Browser extension**: Xray overlays estimated sales/revenue, price
ranges, competing-seller counts, reviews, BSR directly on live Amazon/
Walmart pages — **VERIFIED PUBLICLY DOCUMENTED FACT**
([Xray KB](https://kb.helium10.com/hc/en-us/articles/360048281774-How-Do-I-Set-Up-and-Navigate-Xray)).

**Historical database**: not quantified anywhere found. **UNKNOWN**.

**Keyword database**: "database of keyword rankings, keyword search
volumes (and trends over time)" feeds the sales estimator — **VERIFIED
PUBLICLY DOCUMENTED FACT** ([Sales Estimator](https://www.helium10.com/tools/free/amazon-sales-estimator/)).
Exact search-volume source method not disclosed.

**Sales/revenue estimation**: self-described as "a mix of machine
learning, proprietary algorithms, and historical sales trend data,"
inputs = keyword rankings + estimated search volumes + estimated
conversion rates + estimated sales volume — **VERIFIED PUBLICLY
DOCUMENTED FACT** (marketing-level disclosure, no formula). Stated
accuracy claims ("within 22 units," "38.2% perfectly correct") are
**self-reported, unaudited** ([accuracy blog post](https://www.helium10.com/blog/helium-10s-estimates-compared-to-amazon-data/)).
The actual model (e.g. BSR-to-sales coefficients) is **UNKNOWN**.

**Third-party providers, user-contributed data, refresh cadence**: none
disclosed. **UNKNOWN**.

---

## Jungle Scout (Amazon)

**Official marketplace APIs**: optional Seller Central connection
ingests the account's own business-report/ad data — **VERIFIED PUBLICLY
DOCUMENTED FACT** ([ecompath review citing JS's own disclosure](https://www.ecompath.com/articles/jungle-scout-review)).
Likely SP-API-based mechanically — **INFERENCE**.

**Public web acquisition — a real, disclosed crowdsourced model**:
Jungle Scout's own words: *"Jungle Scout sends HTML data of the Amazon
pages you choose to activate the add-on with to do backend processing"*
— **VERIFIED PUBLICLY DOCUMENTED FACT**
([ecompath](https://www.ecompath.com/articles/jungle-scout-review)). Every
user's extension activation contributes page HTML back to Jungle Scout —
an explicit, disclosed, opt-in collective-data-collection architecture.

**Historical database**: "11 years" of sales-estimate refinement, "600M+
products tracked across 24 categories," claimed "16x more GMV coverage"
and "20% more accurate" than unnamed competitors — **VERIFIED PUBLICLY
DOCUMENTED FACT**, self-reported marketing figures, comparison
methodology not shown ([Amazon Data page](https://www.junglescout.com/amazon-data/)).

**Keyword database**: a real "Historical Search Volume" API endpoint
returns weekly volume by keyword — **VERIFIED PUBLICLY DOCUMENTED FACT**
([API docs](https://support.junglescout.com/hc/en-us/articles/21641823937943)).
Underlying source of the volume number itself is **UNKNOWN** (a
third-party industry blog notes, independent of Jungle Scout, that
*Amazon shut down its own public search-volume API in December 2018* and
every third-party number since is estimated from PPC impressions/
clickstream panels/Brand-Analytics correlation — [keywords.am](https://keywords.am/blog/amazon-search-volume/)
— applying that mechanism specifically to Jungle Scout is **INFERENCE**).

**Sales/revenue estimation — "AccuSales Algorithm"**: "crunches billions
of data points daily," based on "the last 30 days of a product's
performance," inputs described as "orders, shipments, Best Seller Rank,
inventory, pricing, categories, and subcategories," via "advanced machine
learning techniques" — **VERIFIED PUBLICLY DOCUMENTED FACT** (self-
reported, high-level, no formula) ([Amazon Data page](https://www.junglescout.com/amazon-data/)).
Notably claims real **orders/shipments** as an input, not BSR alone — a
materially richer claim than a pure BSR-curve estimator, plausible given
opt-in Seller-Central-connected users feed real order data back in. Exact
real-vs-modeled blend ratio: **UNKNOWN**.

**User-contributed data**: yes, in two disclosed forms — opt-in Seller
Central business reports, and per-user extension HTML — both **VERIFIED
PUBLICLY DOCUMENTED FACT**.

**Refresh cadence**: not disclosed. **UNKNOWN**.

---

## Keepa (Amazon)

**Official marketplace APIs**: none disclosed as a primary source; Keepa
is itself a paid data API, not primarily a consumer of Amazon's official
APIs as far as available sources show. **UNKNOWN** whether Keepa uses
SP-API internally to seed crawl targets.

**Public web acquisition — Keepa's actual core business**: continuous
tracking of live Amazon product pages, recording price/Buy-Box/Sales-Rank
"straight from the listing" — **VERIFIED PUBLICLY DOCUMENTED FACT** per
consistent independent summaries ([sellerassistant.app](https://www.sellerassistant.app/blog/keepa-amazon/);
Keepa's own API docs page returned a 403 on direct fetch this session).
This is the most scraping-centric of the three Amazon tools researched —
Keepa's entire product is a continuously-refreshed public-page crawl, not
an API-first offering.

**Browser extension**: embeds price-history charts/deal comparisons on
live Amazon product pages — **VERIFIED PUBLICLY DOCUMENTED FACT**
([Chrome Web Store listing](https://chromewebstore.google.com/detail/keepa-amazon-price-tracke/neebplgakaahbhdphmkckjjcegoiijjo)).

**Historical database**: "data going back over a decade," "tracks over 5
billion products" — **VERIFIED PUBLICLY DOCUMENTED FACT** per consistent
third-party sourcing ([goaura.com](https://goaura.com/blog/keepa-chrome-extension)),
though no source retrieved this session gave an exact start year — the
widely-repeated "since 2011" figure is **not independently confirmed** in
this research pass and is marked **UNKNOWN** here on that basis, even
though it's commonly cited elsewhere.

**Sales/revenue estimation**: Keepa does **not** appear to offer a sales/
revenue estimator as a core feature (unlike Helium 10/Jungle Scout) — its
product is price/rank/offer **history**, not derived sales. **VERIFIED
PUBLICLY DOCUMENTED FACT by omission** (no estimator feature found in any
source). Some third-party seller tools layer sales estimation on top of
Keepa's raw BSR history — that layering is third-party, not Keepa's own.

**Refresh cadence**: "updated at least once every hour" for
actively-tracked products, "several times daily" for others; free tier
has a ~12-hour delay, paid tier near-real-time — **VERIFIED PUBLICLY
DOCUMENTED FACT**, sourced via consistent third-party description (direct
Keepa FAQ fetch returned 403 this session; representative source
[jordiob.com](https://jordiob.com/amazon-tools/product/keepa/)).

---

## eRank (Etsy)

**Official marketplace APIs**: eRank states plainly "This app uses the
Etsy API but is not endorsed or certified by Etsy" — **VERIFIED PUBLICLY
DOCUMENTED FACT** ([help.erank.com](https://help.erank.com/features/)). A
real, registered, API-key-holding Etsy app for its core "connect your
shop" functionality.

**Browser extension**: a Chrome Extension explicitly marketed to "Gather
keywords, trends, and data from other shops directly on Etsy.com" with a
"Shortcut Button" for analyzing shops/listings while browsing —
**VERIFIED PUBLICLY DOCUMENTED FACT** (same source). Etsy's Open API v3
only exposes certain public fields per listing/shop — eRank's competitor
research likely combines API calls for those fields with the extension
reading rendered page content for anything the API doesn't expose —
**INFERENCE**, not explicitly confirmed in eRank's own docs.

**Historical database**: Monthly Trends retains "15 months of historical
data for terms" — **VERIFIED PUBLICLY DOCUMENTED FACT** (same source).

**Keyword database / search-volume methodology**: **UNKNOWN** whether
"search volume" is Etsy-observed, Google-Trends-derived, or eRank's own
modeled figure — no primary source found disclosing this. A third-party
review's claim of trend data "across Etsy, Google, Amazon, and eBay" is
**third-party-reported**, not independently verified against an eRank
primary source.

**Sales estimation methodology**: **UNKNOWN** — no formula disclosed; not
confirmed whether competitor "sales" shown is Etsy's real
`transaction_sold_count` (which Etsy's API does expose per shop) or a
derived figure.

**Third-party providers, user-contributed data, refresh cadence**:
**UNKNOWN** for all three.

---

## eHunt / EtsyHunt (Etsy)

**Acquisition mechanism**: markets itself as displaying "hidden data on
Etsy search pages, product pages, and shop pages" — phrasing consistent
with reading rendered Etsy page content, not only calling Etsy's official
API, since "hidden" implies data Etsy's API doesn't expose to third
parties (e.g. per-listing view counts) — **INFERENCE**, not explicitly
confirmed either way.

**Browser extension mechanics — confirmed page-reading**: on first use on
any Etsy page, EHunt shows an authorization popup requiring the user to
"Accept"/"Allow" page-data access, without which "key metrics will not
display" — **VERIFIED PUBLICLY DOCUMENTED FACT** (ehunt.ai tutorial page;
[chrome-stats.com listing](https://chrome-stats.com)). Confirms the core
mechanism is reading the currently-loaded Etsy page's data, not a pure
backend API call.

**Historical database**: per-listing/per-keyword aggregates computed from
"the top 100 products ranked by views for that keyword"; **favorites/
reviews update weekly, price/discount update daily** — **VERIFIED
PUBLICLY DOCUMENTED FACT** (help.etsyhunt.com, "About Keywords &
Parameters Meaning"). Markets "historical data across four dimensions —
sales, price, favorites, and reviews."

**Sales estimation methodology — real, explicit disclosure**: "estimated
weekly revenue... is calculated based on the average price and the
estimated weekly sales," and "conversion rate is calculated as Total
Sales divided by Total Views" — **VERIFIED PUBLICLY DOCUMENTED FACT**
(help.etsyhunt.com). Confirms sales/revenue are explicitly derived/
estimated, not claimed as Etsy-native raw numbers — though the "Total
Sales" input's own provenance (real Etsy count vs. EHunt's own estimate)
is not stated.

**Keyword database, third-party providers, user-contributed data**:
**UNKNOWN**.

---

## Alura (Etsy)

**Official marketplace APIs — real, disclosed**: sales estimates are
"based on listing information from Etsy's API such as the number of
views, favorites, category, when the listing was created, and more," with
"direct access to 60 million Etsy products" via that API — **VERIFIED
PUBLICLY DOCUMENTED FACT** ([alura.io/features/alura-extension](https://alura.io/features/alura-extension)).
A third-party review site's claim that Alura is "an official Etsy app"
was **not** independently confirmed on Alura's own primary pages checked
— tagged **third-party-reported**, not company-confirmed here.

**Sales estimation methodology — the most transparent disclosure found
across all six companies researched**: *"The sales numbers provided are
estimates... not 100% accurate, but it gives a good indication... It does
not give exact numbers"* — **VERIFIED PUBLICLY DOCUMENTED FACT** (same
source). Modeled from views/favorites/category/listing-age.

**Browser extension**: also reads page-level data directly, populating
"key listing insights on the products on your page" — **VERIFIED
PUBLICLY DOCUMENTED FACT** — a hybrid of API calls plus live page
reading, same pattern as eRank/EHunt.

**Historical database, keyword methodology, third-party providers**:
**UNKNOWN** — not disclosed on the pages checked.

---

## SellerApp (Amazon)

**Official APIs**: SellerApp markets its own "Amazon Scraping API" product
to customers, but its own site does not disclose whether its core
Product/Keyword Research features run on SP-API, the Advertising API,
scraping, or a mix — **UNKNOWN**. No evidence found of official Amazon
SP-API/Ads-API partner status either way — **UNKNOWN**, not confirmed in
either direction ([sellerapp.com/amazon-seller-api.html](https://www.sellerapp.com/amazon-seller-api.html)).

**Public web acquisition**: SellerApp publicly associates itself with
scraping via that "Amazon Scraping API" product — **VERIFIED PUBLICLY
DOCUMENTED FACT** that the association exists; whether the same mechanism
powers SellerApp's own core research features (vs. being a separate,
externally-sold data SKU) is **INFERENCE**.

**Browser extension**: overlays "Opportunity Score," "BSR and revenue
estimates," "Category and competitor analysis" on live Amazon product
pages — **VERIFIED PUBLICLY DOCUMENTED FACT** the extension exists and
surfaces these fields; the extraction mechanism (DOM read vs. an API call
made by the extension) is **UNKNOWN**
([sellerapp.com/sellerapp-chrome-extension.html](https://www.sellerapp.com/sellerapp-chrome-extension.html)).

**Sales estimation methodology**: the free Sales Estimator takes
marketplace + category + BSR as inputs, returns a category-calibrated
units/day estimate — **VERIFIED PUBLICLY DOCUMENTED FACT** that the
architecture is BSR+category-based (the standard shape across this whole
product category). A commonly-cited "~89% max accuracy" figure is
**third-party-reported**, not independently found on SellerApp's own site
([sellerapp.com/amazon-sales-estimator.html](https://www.sellerapp.com/amazon-sales-estimator.html)).

**Keyword database, historical depth, refresh cadence**: **UNKNOWN** —
not disclosed on the pages checked.

---

## DataHawk (Amazon)

**Official APIs — verified partner status, self-claimed**: DataHawk
states directly on its own site that it is *"an official Amazon Software
and Ads Verified Partner"* meeting *"rigorous security and reliability
standards"* — **VERIFIED PUBLICLY DOCUMENTED FACT as DataHawk's own
claim**; this could not be independently cross-confirmed against Amazon's
own partner directory this session (the directory page fetched rendered
only navigation chrome, no listings) — treat as company-asserted, not
independently cross-verified
([datahawk.co/marketplaces/amazon-analytics](https://datahawk.co/marketplaces/amazon-analytics/)).

**Official-data mechanics**: *"Amazon provides DataHawk with actual data
for use in preferred BI tools... Data backfills typically complete within
24 hours at the first account connection, providing up to 60 days of
historical insights and refreshed every day moving forward"* (connects to
Snowflake/BigQuery/Tableau/Power BI/Looker Studio) — **VERIFIED PUBLICLY
DOCUMENTED FACT** (same source). This is real, account-connected,
first-party data — for the connecting seller's **own** account, same
category as Amazon SP-API generally (not competitor-product data).

**Public web acquisition, separate from the official-partner pipeline**:
*"DataHawk scans the Amazon marketplace daily"* for competitor detection —
products co-occurring on listing pages, keyword search results, and
category listings over a trailing 7-day window — **VERIFIED PUBLICLY
DOCUMENTED FACT** of daily own-marketplace scanning specifically for
competitive/SERP data, distinct from the official-partner pipeline above
([docs.datahawk.co — Automated Competitors Detection](https://docs.datahawk.co/help-center/data-metrics-guides/competition/auto-competitors-detection)).

**Sales estimation methodology — the most rigorous disclosure found
across all eight companies researched**: *"DataHawk calculates sales
estimates by correlating sales rank data with historical sales
performance,"* with *"continuous maintenance and retraining,"* *"multiple
quality checks and benchmarking,"* computed at the parent-ASIN level.
Critically, **DataHawk publishes a per-estimate accuracy/confidence score
alongside every sales estimate**: *"DataHawk provides an accuracy score
with each estimate, helping you gauge how close the results are to actual
figures,"* explicit that *"exact dollar values may vary"* though *"trends
are highly reliable."* Coverage: up to 2 years of history for the top 100
products per category, or forward-looking estimates for user-selected
products — all **VERIFIED PUBLICLY DOCUMENTED FACT**, DataHawk's own
claims ([datahawk.co/use-cases/amazon-sales-estimates](https://datahawk.co/use-cases/amazon-sales-estimates/)).
Independent industry reporting (not DataHawk-specific) describes this
general estimator class as using "logarithmic, root category
best-seller-rank-based models," consistent across most competitors —
**INFERENCE/third-party characterization**, not attributed to DataHawk
specifically ([emplicit.co](https://emplicit.co/best-amazon-competitor-benchmarking-tools/)).

**Keyword database**: real-time SERP scanning reveals "which ASINs rank
for specific keywords" combined with "search volume, competitiveness, and
estimated sales potential" per keyword — **VERIFIED PUBLICLY DOCUMENTED
FACT** the feature exists; the underlying search-volume source (Amazon's
own Brand Analytics/Ads data via verified-partner access, vs. an
independent estimate) is **UNKNOWN**.

**Design precedent worth carrying forward**: DataHawk's pattern of
publishing a **per-estimate confidence/accuracy score alongside every
sales estimate**, rather than a bare number, is the closest publicly-
documented precedent for exactly what `docs/BATCH-39-ACQUISITION-STRATEGY-AUDIT.md`
§5's estimation-format requirement (a range + confidence + basis, never a
bare exact number) already independently arrived at — cited here as
evidence that this format is a real, industry-credible pattern, not an
invented constraint unique to SellerSalt.

---

## Cross-cutting patterns (synthesis, not attributed to any one company)

**Amazon tools (Helium 10, Jungle Scout, Keepa, SellerApp, DataHawk)**:
even DataHawk — the one company here with a *verified, self-claimed*
official Amazon Ads/Software Partner status — draws its **competitor**
data from a separate, daily public-marketplace scan, not from its
official-partner pipeline (which serves the connecting seller's *own*
account data, the same SP-API-shaped scope every marketplace's official
API is limited to). This is a materially important, consistent finding:
**no company researched, including the one with genuine, verified
official-partner status, claims that official partner status as the
source of its competitor/market-wide research data.** SP-API-class
access is fundamentally scoped to a seller's own account; the actual
product-research value proposition, for all five Amazon tools, comes from
public-page observation, and (Jungle Scout specifically) an explicitly
disclosed opt-in crowdsourced browser-extension HTML-collection model.
This is the same architectural shape SellerSalt already has (public-web-
first, not API-first) — none of the five disclose anything SellerSalt's
governance model would currently prohibit (no confirmed CAPTCHA bypass,
credential theft, or similar), though none disclose their anti-detection
posture either (**UNKNOWN** for all five, deliberately not guessed at).

**Etsy tools (eRank, EHunt, Alura)**: a consistent three-part pattern —
(1) real, registered Etsy Open API access for the fields Etsy exposes
publicly, (2) a **browser extension** as the second acquisition leg,
reading rendered Etsy page content the API doesn't expose to third
parties, (3) sales/revenue figures explicitly disclosed as *estimates*
derived from views/favorites/category/listing-age — none claim exact
observed competitor sales (Alura states this most explicitly). This
API+extension+disclosed-estimate pattern is a materially different
acquisition mode than SellerSalt's current server-side `PublicPageFetcher`
— a **user-installed browser extension reading pages while the user is
themselves logged into/browsing the marketplace** is a different legal
and compliance posture than an anonymous server-side fetch, and adopting
it is a real architecture decision, not a drop-in improvement. Not
recommended for adoption in this document — flagged as a distinct
architectural family worth a dedicated compliance review before ever
considering it, not something to copy by default. See
`docs/BATCH-39-ACQUISITION-STRATEGY-AUDIT.md` §17 ("what NOT to build").

**Sales estimation, universally**: every company researched that
publishes a sales/revenue number discloses it as an **estimate** with
some combination of BSR/rank, views/favorites, category, price, and
(for Jungle Scout specifically) real connected-account order data as
inputs — never as a raw observed marketplace fact. This matches exactly
the model `docs/PRODUCT-RESEARCH-DATA-CONTRACT.md` §6 and
`docs/MARKET-INTELLIGENCE-ROADMAP.md` already commit SellerSalt to: no
estimation model ships until built and disclosed the same way.
