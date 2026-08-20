# SellerSalt Proprietary Market Intelligence Graph & Continuous Market Memory Engine

This document is the authoritative technical reference for the **SellerSalt Market Intelligence Graph and Continuous Market Memory Engine** (Batch 19), transforming accumulated multi-marketplace observations into an interconnected proprietary market intelligence dataset.

---

## 1. Overview & Core Mission

SellerSalt functions as an independent **Ecommerce Intelligence Platform**. Every research run progressively enhances SellerSalt's understanding of products, dominant merchants, category taxonomies, and keyword clusters across marketplaces:

```
Observed Products (Etsy, Amazon, eBay, Walmart)
       ↓
Entity Resolution Engine (Deterministic ID assignment & cross-marketplace match tiers)
       ↓
Market Intelligence Relationship Graph (Product ↔ Seller ↔ Category ↔ Keyword ↔ Niche ↔ Marketplace)
       ↓
Continuous Market Memory (Append-only immutable snapshots: P10, P25, P50, P75, P90, HHI)
       ↓
Market Change Detection Engine ("What Changed?": New, Disappeared, Price Movers, Review Velocity)
       ↓
Market Momentum 2.0 (Multi-timeframe: Short <7d, Medium 7-30d, Long >30d)
       ↓
Opportunity Persistence (New, Emerging, Persistent >=7d, Improving, Saturated)
       ↓
Cross-Marketplace Cross-Validation & Synthesis (Price comparison & seller overlap without fake multipliers)
```

---

## 2. Zero-Fabrication Contract

SellerSalt adheres strictly to transparent, evidence-based data provenance:
1. **Search Volume**: Exact monthly search query volume is strictly `null` with provenance `"UNAVAILABLE"` unless supplied by licensed volume feeds.
2. **Private Store Revenues & Unit Sales**: Unobserved private store revenues are strictly `null` and never fabricated from arbitrary multipliers.
3. **Historical Deltas**: Minimum observation requirement $n \ge 2$ historical snapshots. For $n \le 1$, historical change is reported as `null` / `INSUFFICIENT_DATA`, never substituted with `0%`.
4. **Cross-Marketplace Equivalence**: Cross-marketplace match confidence tiers (`EXACT`, `HIGH_CONFIDENCE`, `PROBABLE`, `POSSIBLE`, `UNRESOLVED`) are explicitly disclosed with matching token overlap and price alignment.

---

## 3. Core Engine Architecture

### 3.1 Entity Resolution Engine (`EntityResolutionEngine`)
Located in [`src/services/intelligence/entity-resolution-engine.ts`](file:///Users/aliyanbaig/Downloads/anadash/src/services/intelligence/entity-resolution-engine.ts):
- Deterministic canonical ID generators:
  - Products: `prod:{marketplace}:{externalId}`
  - Sellers: `seller:{marketplace}:{normalizedShopName}`
  - Categories: `cat:{marketplace}:{normalizedCategoryPath}`
  - Keywords: `kw:{normalizedKeyword}`
  - Niches: `niche:{normalizedNicheName}`
- Cross-marketplace disambiguation based on Jaccard title token overlap, price band alignment ($\le 15\%$), and brand match.

### 3.2 Market Intelligence Relationship Graph (`MarketGraphEngine`)
Located in [`src/services/intelligence/market-graph-engine.ts`](file:///Users/aliyanbaig/Downloads/anadash/src/services/intelligence/market-graph-engine.ts):
- Ingests observations and connects entities via directed relationship edges (`PRODUCT_SOLD_BY_SELLER`, `PRODUCT_IN_CATEGORY`, `KEYWORD_APPEARS_IN_PRODUCT`, `PRODUCT_MATCHED_ACROSS_MARKETPLACES`).
- Exposes neighborhood traversals and interactive subgraph extractions.

### 3.3 Continuous Market Memory Engine (`ContinuousMarketMemoryEngine`)
Located in [`src/services/intelligence/continuous-market-memory.ts`](file:///Users/aliyanbaig/Downloads/anadash/src/services/intelligence/continuous-market-memory.ts):
- Captures and stores full empirical market snapshots per query/category/keyword/marketplace ($P_{10}, P_{25}, P_{50}, P_{75}, P_{90}$, median reviews, seller concentration HHI).
- Append-only time-series memory ensuring historical records are preserved.

### 3.4 Market Change Detection Engine (`MarketChangeDetectionEngine`)
Located in [`src/services/intelligence/market-change-detection.ts`](file:///Users/aliyanbaig/Downloads/anadash/src/services/intelligence/market-change-detection.ts):
- Powers the user-facing "What Changed?" experience between consecutive research runs.
- Identifies new products, price movers, review velocity shifts, and keyword prevalence movement.

### 3.5 Market Momentum 2.0 (`MarketMomentum2Engine`)
Located in [`src/services/intelligence/market-momentum-2.ts`](file:///Users/aliyanbaig/Downloads/anadash/src/services/intelligence/market-momentum-2.ts):
- Classifies trajectory into `RISING`, `ACCELERATING`, `STABLE`, `COOLING`, `DECLINING`, or `INSUFFICIENT_DATA` across short-term, medium-term, and long-term timeframes.

### 3.6 Opportunity Persistence Engine (`OpportunityPersistenceEngine`)
Located in [`src/services/intelligence/opportunity-persistence.ts`](file:///Users/aliyanbaig/Downloads/anadash/src/services/intelligence/opportunity-persistence.ts):
- Distinguishes transient score spikes from verified `PERSISTENT_OPPORTUNITY` ($\ge 70$ maintained over $\ge 7$ days).

---

## 4. API Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/intelligence/products/[id]` | Product entity details & relationships | Yes (`organizationId`) |
| `GET` | `/api/intelligence/products/[id]/history` | Product longitudinal snapshot history | Yes (`organizationId`) |
| `GET` | `/api/intelligence/market/[marketplace]/history` | Market snapshot time-series history | Yes (`organizationId`) |
| `GET` | `/api/intelligence/changes` | "What Changed?" differential comparison | Yes (`organizationId`) |
| `GET` | `/api/intelligence/cross-marketplace/[id]` | Cross-marketplace synthesized evidence | Yes (`organizationId`) |
| `GET` | `/api/intelligence/graph` | Subgraph extraction for visual graph view | Yes (`organizationId`) |

---

## 5. UI & Navigation Integration

1. **Intelligence Page** ([`src/app/(dashboard)/intelligence/page.tsx`](file:///Users/aliyanbaig/Downloads/anadash/src/app/(dashboard)/intelligence/page.tsx)):
   - Visualized Market Intelligence Graph (`MarketIntelligenceGraphView.tsx`).
   - Interactive "What Changed?" differential comparison view (`WhatChangedView.tsx`).
2. **Navigation** ([`src/services/navigation.ts`](file:///Users/aliyanbaig/Downloads/anadash/src/services/navigation.ts)):
   - Registered "Intelligence Graph" in the primary Intelligence navigation section.
