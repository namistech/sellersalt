# SellerSalt — Product Hunting Specification

- **Document Version:** 2.1.0
- **Status:** Canonical Specification (Implementation Status: COMPLETE — 2026-08-16)
- **System Classification:** Automated Market Discovery & Opportunity Detection
- **Implementation Modules:** `src/services/product-hunting.ts`, `src/services/product-hunting-client.ts`, `src/app/api/products/search/route.ts`, `src/app/api/products/compare/route.ts`, `src/app/api/planner/items/route.ts`, `src/components/intelligence/ProductResearchDrawer.tsx`, `src/components/intelligence/ProductComparisonModal.tsx`, `src/app/(dashboard)/prospects/live-search-tab.tsx`

---

## 1. Executive Purpose

**Product Hunting** is SellerSalt's market discovery and opportunity detection engine. It combines:
1. **Live Marketplace Search**: Real-time ad-hoc Etsy searches using official query parameters, cached across Redis with an 8 req/sec queue ceiling.
2. **Automated Search Streams**: Background scanning (`SearchConfig`) producing continuous prospects.
3. **Opportunity Radar**: A 5-factor mathematical rubric generating transparent 0–100 scores (`[SELLERSALT SCORE]`) and actionable classifications.
4. **1-Click Planner Handoff**: Direct creation of `PlannerItem` records capturing research snapshots and origin provenance.

---

## 2. Core Features & Filtering Engine

### 2.1 Live Marketplace Search (`POST /api/products/search`)
- **Query Inputs**: `keywords`, `taxonomy_id`, `min_price`, `max_price`, `shop_location`, `sort_on` (`score` | `created` | `price`), `sort_order` (`asc` | `desc`), `limit`, `page`.
- **Shop Enrichment**: Ingests active listings and enriches parent shop metadata (`transaction_sold_count`, `review_count`, `active_listings`, `shop_age_months`) with 24-hour caching.
- **Estimated Metrics** (`[ESTIMATED]`):
  - `estDailySales`: `totalSales / (shopAgeMonths * 30.44)`
  - `avgSellingRatio`: `totalSales / activeListings`
  - `reviewConversionRate`: `reviewCount / totalSales`

### 2.2 5-Factor Opportunity Radar Rubric (`[SELLERSALT SCORE]`)
Opportunity score is strictly computed and clamped between 10 and 99 using conservative mathematical weights:
1. **Market Velocity (30% weight)**: Measures estimated daily sales momentum.
2. **Catalog Density / Yield (25% weight)**: Measures sales volume per active listing in the store.
3. **Competition Barrier (20% weight)**: Evaluates incumbent review saturation and catalog breadth.
4. **Buyer Engagement (15% weight)**: Evaluates review conversion rates and favorite momentum.
5. **Launch Freshness (10% weight)**: Evaluates listing age recency.

### 2.3 Opportunity Classifications
- **`EMERGING` (🔥)**: Young stores (≤18 months) generating ≥3 sales/day with fresh market traction.
- **`HIDDEN_GEM` (💎)**: Lean catalogs (≤250 listings) achieving ≥14 sales/listing in low-competition segments.
- **`GROWING` (📈)**: Consistent baseline transaction volume with balanced catalog efficiency.
- **`COMPETITION_RISING` (⚠️)**: Saturated niches where stores face large catalog competition (≥400 listings).

---

## 3. UI Controls & Table Interactions

- **Live Product Search Tab** (`/prospects`): Real-time Etsy search with instant Opportunity Radar scoring, price/sort filters, and comparison selection.
- **Product Research Drawer** (`ProductResearchDrawer`): Slide-out drawer displaying listing specs, high-res photos, shop benchmark cards, 5-factor meter bars, factual evidence, and strategic takeaways.
- **Multi-Product Comparison Modal** (`ProductComparisonModal`): Side-by-side evaluation of 2 to 4 products with shared/unique tag analysis and pricing statistics.
- **1-Click Planner Handoff** (`POST /api/planner/items`): Saves product to Planner with rich `PlannerResearchSnapshot`, source listing URL, and shop provenance.
- **Data Provenance Badges**: All metrics badged with `[ACTUAL ETSY DATA]`, `[ESTIMATED]`, or `[SELLERSALT SCORE]`.
