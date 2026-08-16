# SellerSalt — Shop Intelligence Specification

- **Document Version:** 2.1.0
- **Status:** Canonical Specification (Implementation Status: COMPLETE — 2026-08-16)
- **System Classification:** Competitor Reverse-Engineering & Shop Health Profiling
- **Implementation Modules:** `src/types/shop-research.ts`, `src/services/shop-intelligence.ts`, `src/app/api/shops/[shopExternalId]/route.ts`, `src/app/shops/[shopExternalId]/page.tsx`, `src/app/shops/[shopExternalId]/shop-detail-client.tsx`

---

## 1. Executive Purpose & Professional Experience

The **Shop Intelligence Profile** (`/shops/[shopExternalId]`) is an institutional-grade reverse-engineering dashboard for Etsy shops. It allows sellers, agencies, and coaches to analyze any Etsy shop cold (via URL paste or search discovery) to understand:
- **How fast the shop is making sales** (Sales velocity & daily transactions).
- **How lean their catalog is** (Average sales per listing / Catalog yield).
- **What keywords drive their visibility** (Extracted tag frequency and long-tail patterns).
- **Which specific listings drive the majority of their revenue** (Winning listings ranked by Etsy relevance score).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SHOP INTELLIGENCE PROFILING PIPELINE                     │
│                                                                             │
│  SHOP RESOLUTION (Name, ID, or URL)                                         │
│        │                                                                    │
│        ├──► 1. ETSY SHOP PROFILE INGESTION                                  │
│        │    • `transaction_sold_count` (Real lifetime sales)                │
│        │    • `review_count` & `review_average` (Real rating signals)        │
│        │    • `listing_active_count` & `creation_timestamp`                 │
│        │                                                                    │
│        ├──► 2. TOP CATALOG HARVESTING & EXTRACTION                          │
│        │    • Fetch top 50 active listings (ordered by Etsy `score`)        │
│        │    • NLP keyword extraction from listing titles and tags           │
│        │    • Price distribution & Estimated Average Order Value (AOV)      │
│        │                                                                    │
│        └──► 3. TIME-SERIES TRACKING (ShopWatch & ShopSnapshots)             │
│             • Historical daily sales deltas                                 │
│             • Review growth curve over 30/60/90 days                        │
│                                                                             │
│        ▼                                                                    │
│  STRUCTURED 8-SECTION PROFESSIONAL INTELLIGENCE PROFILE                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Visual Architecture & 8-Section Separation

To maintain strict visual hierarchy and prevent unrelated cards from bleeding together, the shop intelligence profile is organized into **8 cleanly separated sections**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SECTION 1: SHOP IDENTITY HEADER                         │
│  [ Shop Avatar ] Shop Name | Est. 2023 (18 mo) | 📍 USA | [ ⭐ Favorite ]   │
│  Direct Link: etsy.com/shop/Example ↗ (Opens New Tab) | [ 👁️ Track Shop ]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                     SECTION 2: CORE PERFORMANCE KPI GRID                    │
│  ┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐  │
│  │ Lifetime Sales  │ Active Listings │ Est. Daily Sales│ Average Rating  │  │
│  │ 14,250 [ACTUAL] │ 112 [ACTUAL]    │ 25.8/day [EST]  │ 4.92 ★ [ACTUAL] │  │
│  ├─────────────────┼─────────────────┼─────────────────┼─────────────────┤  │
│  │ Review Count    │ Review Velocity │ Selling Ratio   │ Est. Monthly Rev│  │
│  │ 1,840 [ACTUAL]  │ 102/mo [EST]    │ 127 sales/list  │ $14,800/mo [EST]│  │
│  └─────────────────┴─────────────────┴─────────────────┴─────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│                     SECTION 3: STRATEGIC VERDICT & SCORE                    │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Opportunity Score: 86/100 — "EASY TO START / BREAKOUT NICHE"          │  │
│  │ Summary: High sales momentum achieved with a lean catalog in under    │  │
│  │ 18 months. Excellent shop to model for digital template workflows.    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│                     SECTION 4: LONGITUDINAL SALES TRACKING                  │
│  [ Interactive Sales & Review Velocity Chart (ShopSnapshots Time-Series) ]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                     SECTION 5: CATALOG & PRICING INTELLIGENCE               │
│  • Median Price: $18.50  |  Price Range: $6.00 to $45.00  |  AOV Est: $22   │
│  • Category Distribution: Digital Prints (65%), Planners (25%), SVG (10%)  │
├─────────────────────────────────────────────────────────────────────────────┤
│                     SECTION 6: DISCOVERED KEYWORD OPPORTUNITIES             │
│  Tag Cloud & Frequency Table:                                               │
│  • "daily planner" (18x)  • "adhd organizer" (12x)  • "printable pdf" (11x)│
│  [ 📋 Add Selected Keywords to Planner ]                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                     SECTION 7: TOP WINNING LISTINGS (Ranked by Velocity)    │
│  Grid of Top Listings: Thumbnail, Title, Price, Est. Velocity, Direct Link  │
│  Action: [ ⭐ Shortlist ] | [ 📋 Add Concept to Planner ]                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                     SECTION 8: STRATEGIC ACTION RECOMMENDATIONS             │
│  1. "WHAT TO STUDY": Examine their 3-tier bundle pricing structure.         │
│  2. "WHAT TO AVOID": Do not compete directly on single-page printable PDFs. │
│  3. "WHAT TO DO NEXT": Launch a 5-item bundle in their underserved sub-niche│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Provenance Rules for Shop Intelligence

1. **`Lifetime Sales`**: Strictly `[ACTUAL ETSY DATA]` from `transaction_sold_count`.
2. **`Review Count & Average`**: Strictly `[ACTUAL ETSY DATA]` from `review_count` and `review_average`.
3. **`Active Listings`**: Strictly `[ACTUAL ETSY DATA]` from `listing_active_count`.
4. **`Est. Daily Sales`**: `[ESTIMATED]` derived from `totalSales / (shopAgeMonths * 30.44)`.
5. **`Est. Revenue / Gross Profit`**: `[ESTIMATED]` based on average observed listing prices multiplied by sales volume. Clearly flagged as an estimate with disclosed margin assumptions (e.g. 68% standard digital margin).
6. **`Connected Shops vs Competitor Shops`**:
   - For **Connected Shops** (OAuth owned), revenue is calculated from actual `SellerOrder` receipts.
   - For **Competitor Shops** (Research), revenue is mathematically estimated and labeled `[ESTIMATED]`.

---

## 4. Reverse-Engineering Recommendations Algorithm

The Shop Intelligence Engine automatically generates contextual recommendations across three structured quadrants:

### 4.1 "Why This Shop Matters"
- Evaluates if the shop is a:
  - **Lean Breakout**: `<18 months old`, `>10 sales/day`, `<100 active listings`.
  - **Established High-Volume Giant**: `>50,000 sales`, `>500 listings`.
  - **High-AOV Premium Seller**: Average listing price `>$75` with steady velocity.

### 4.2 "What to Study"
- Highlights specific listing strategies:
  - Hero image presentation (lifestyle vs mockup).
  - Use of video listings in top-performing products.
  - Frequency of keyword repetition across listing titles and tags.

### 4.3 "What to Do Next"
- Direct, actionable next steps linked to SellerSalt tools:
  - Click to track this shop in `ShopWatch`.
  - Export top 10 keywords directly into the `Planner`.
  - Launch SaltBot to draft an original competing product concept.
