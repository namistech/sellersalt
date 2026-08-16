# SellerSalt — Unified Research Engine Architecture

- **Document Version:** 2.0.0
- **Status:** Canonical Intelligence Specification
- **Scope:** Universal Discovery, Scoring, Evidence Generation & Planner Handoff

---

## 1. Universal Research Pipeline

Rather than implementing fragmented, one-off research logic across different pages, SellerSalt employs a single **Universal Research Pipeline** that standardizes data ingestion, scoring, and actionable insight delivery across all research dimensions:

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                      THE 10-STEP UNIVERSAL RESEARCH PIPELINE                      │
│                                                                                   │
│  1. RESEARCH QUERY                                                                │
│     (Keyword, Shop Name/ID, Category Node, Listing URL, or Automated Stream)      │
│  2. DATA SOURCES                                                                  │
│     (Etsy Open API v3, Local Org Database, External Search Indexes)               │
│  3. FETCH STRATEGY                                                                │
│     (PQueue Rate Limiting, Redis TTL Caching, Deduplication, Error Handling)      │
│  4. NORMALIZATION                                                                 │
│     (Canonical Entity Mapping, Currency Conversion, ISO Date Formatting)          │
│  5. ENRICHMENT                                                                    │
│     (Derived Metrics: Velocity, Yield, Ratios, Historical Time-Series Deltas)     │
│  6. SCORING                                                                       │
│     (Opportunity Score 0-100, Competition Level 1-5, SEO Score 0-100)             │
│  7. RANKING & FILTERING                                                           │
│     (Multi-factor Sorting, Price Thresholds, Shop Age, Review Saturation)         │
│  8. EVIDENCE EXTRACTION                                                           │
│     (Transparent Fact List: Sold Counts, Review Velocities, Catalog Ratios)       │
│  9. STRATEGIC TAKEAWAYS                                                           │
│     (Deterministic "Why it wins", Market Verdicts, Risk Warnings)                 │
│ 10. PLANNER ACTION                                                                │
│     (One-Click Handoff: Save to Planner, Bookmark, Generate Listing Draft)        │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Research Modalities

The engine powers 6 core research modalities with shared normalization and scoring modules:

### 2.1 Product Research (Product Hunting)
- **Input**: Keyword search string, price bracket ($min - $max), category filter.
- **Data Extracted**: Active listings (title, price, image, favorers, creation date), parent shop profile (`transaction_sold_count`, `review_count`, `listing_active_count`).
- **Calculated Signals**: Estimated daily sales (`estDailySales`), selling ratio (`avgSellingRatio`), review barrier.
- **Output Artifact**: `OpportunityItem` (Score 0–100, Type: `EMERGING`, `HIDDEN_GEM`, `GROWING`, `COMPETITION_RISING`).

### 2.2 Shop Research (Shop Hunting & Spy)
- **Input**: Shop name, Etsy shop URL, or discovery query.
- **Data Extracted**: Full shop profile, top 50 active listings (ordered by Etsy relevance `score`), shop age in months.
- **Calculated Signals**: Daily sales velocity, average order value (AOV) estimate, review velocity, catalog composition.
- **Output Artifact**: `ResearchShopDetail` (Opportunity verdict: "Easy to Start", "Established Authority", "Saturated Giant").

### 2.3 Category Research (Category Hunting)
- **Input**: Etsy taxonomy node (e.g. `Jewelry & Accessories -> Rings -> Stackable Rings`).
- **Data Extracted**: Category listing count, price distribution, active seller density.
- **Calculated Signals**: Category saturation index, median price point, average review threshold.
- **Output Artifact**: `CategoryOpportunitySummary` (Top sub-niches, market difficulty).

### 2.4 Keyword Research
- **Input**: Arbitrary keyword query (e.g. "personalized leather keychain").
- **Data Extracted**: Etsy listing supply count, top 50 listing sample, external search volume index (if available).
- **Calculated Signals**: Word count, competition level, demand proxy (avg favorers across top listings), long-tail classification.
- **Output Artifact**: `KeywordOpportunityRecord` (Supply, Competition, Word Count, Intent Type).

### 2.5 Listing Intelligence
- **Input**: Specific listing URL or ID.
- **Data Extracted**: Listing title, description, all 13 tags, image count, price, materials, renewal settings.
- **Calculated Signals**: SEO score, title keyword density, tag keyword duplication, character length audits.
- **Output Artifact**: `ListingAuditReport` (Strengths, Weaknesses, Recommended Title/Tag Fixes).

### 2.6 SEO Research
- **Input**: Discovered keyword or competitor listing.
- **Data Extracted**: Competitor tag cloud, search placement rank.
- **Calculated Signals**: High-overlap tag clusters, low-competition long-tail tag opportunities.
- **Output Artifact**: `SeoKeywordCluster` (Primary keywords, secondary modifiers, 13-tag recommendation set).

---

## 3. The 4 UI Pillars of Every SellerSalt Intelligence Card

Every research screen and intelligence card across the entire SellerSalt platform must answer four fundamental seller questions:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           THE 4 USER QUESTIONS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. "WHAT DID SELLERSALT FIND?"                                              │
│    • Clear entity identification: Product, Shop, Keyword, or Listing        │
│    • Direct Etsy link (always opens in a NEW TAB)                           │
│    • Key actual metrics: Price, Total Sales, Review Count, Shop Age         │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. "WHY DOES IT MATTER?"                                                    │
│    • Explainable scoring breakdown (e.g., Score 84/100)                      │
│    • Bulleted Evidence points based on real data:                           │
│      - "High sales velocity: 8.4 estimated sales/day"                       │
│      - "Low competition barrier: Only 34 reviews"                           │
│      - "Lean catalog yield: 420 sales across only 12 listings"              │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. "WHAT SHOULD I DO?"                                                      │
│    • Concrete strategic recommendation:                                     │
│      - "Create listing in this price sweet spot ($24-$32)"                  │
│      - "Target long-tail modifier tags: 'minimalist', 'custom gift'"         │
│      - "Study competitor photo styling & bundle offers"                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. "HOW CAN I SAVE IT?"                                                     │
│    • Actionable workspace buttons:                                          │
│      - [⭐ Favorite] -> Adds to quick favorites                             │
│      - [📋 Add to Planner] -> Bridges research into execution               │
│      - [✨ Generate AI Listing] -> Launches SaltBot originality draft flow   │
│      - [👁️ Spy / Track] -> Schedules automated daily monitoring            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Technical Architecture & Code Reusability

### 4.1 Shared Service Modules
- `src/services/intelligence/winning-signals.ts`: Universal algorithmic scoring for products and shops.
- `src/services/opportunities.ts`: Opportunity Radar translation, filtering, and composite metric aggregation.
- `src/lib/competition-scoring.ts`: Two-axis competition evaluation (`Demand` vs `Difficulty`).
- `src/connectors/etsy/index.ts`: Standardized rate-limited API gateway.

### 4.2 Data Flow from Research to Planner
When a user clicks **"Add to Planner"** on any research card:
1. The frontend invokes `POST /api/planner/items`.
2. A new `PlannerItem` record is created with:
   - `type`: `PRODUCT_IDEA` | `KEYWORD_CLUSTER` | `SEO_OPTIMIZATION_TASK`
   - `sourceShopExternalId` & `sourceListingUrl`: Preserved for origin provenance.
   - `researchSnapshot`: Serialized JSON storing price, velocity, tags, and category at the exact moment of discovery.
3. The item appears instantly in the user's Planner workbench, ready for SaltBot listing creation.
