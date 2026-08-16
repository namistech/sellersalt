# SellerSalt — Keyword Research Specification

- **Document Version:** 2.1.0
- **Status:** Canonical Specification (Implementation Status: COMPLETE — 2026-08-16)
- **System Classification:** Standalone Discovery & SEO Intelligence Engine
- **Implementation Modules:** `src/types/keyword-research.ts`, `src/services/keyword-research.ts`, `src/app/api/keywords/search/route.ts`, `src/app/(dashboard)/keyword-research/page.tsx`, `src/services/keyword-research-client.ts`

---

## 1. Executive Purpose & Independence

The **Keyword Research Engine** is an independent, on-demand intelligence system. Unlike early implementations that merely queried previously scanned local `Prospect` database records, the standalone keyword system allows any user to enter **any arbitrary keyword** (e.g. `"minimalist walnut desk organizer"`) and immediately receive comprehensive Etsy supply metrics, competition scoring, extracted long-tail phrases, and external search demand indicators.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    KEYWORD RESEARCH ARCHITECTURE                            │
│                                                                             │
│  USER QUERY: "leather passport holder"                                      │
│        │                                                                    │
│        ├──► 1. ETSY API SEARCH (Public Active Listings)                    │
│        │    • Real listing supply count (count / pagination total)          │
│        │    • Top 50 relevant listings (Etsy default relevance `score`)     │
│        │    • Extraction of all 13 tags from top 50 listings                │
│        │    • Calculation of average price & average favorites              │
│        │                                                                    │
│        ├──► 2. EXTERNAL SEARCH ENRICHMENT (Optional / Third-Party)          │
│        │    • External monthly search volume index                          │
│        │    • 12-month search trend curve                                   │
│        │                                                                    │
│        └──► 3. SELLERSALT DERIVATION & SCORING                              │
│             • Word count & Long-tail classification (1, 2, 3, 4+ words)     │
│             • Competition Score (Very Low to Very High)                     │
│             • Relevance Score vs Primary Query                              │
│             • Demand Proxy (Avg Favorers across top ranking listings)       │
│                                                                             │
│        ▼                                                                    │
│  UNIFIED KEYWORD WORKBENCH WITH FILTERS & "ADD TO PLANNER"                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Provenance & Metric Classification

Every metric presented in Keyword Research carries an explicit, non-negotiable provenance badge:

| Metric Displayed | Provenance Badge | Calculation / Source | Strict Integrity Rule |
| :--- | :--- | :--- | :--- |
| **Etsy Result Count (Supply)** | `[ACTUAL ETSY DATA]` | Total results count returned by `GET /v3/application/listings/active?keywords={q}`. | Actual active listings on Etsy competing for this search term. |
| **Average Price** | `[ACTUAL ETSY DATA]` | Arithmetic mean of `listing.price` across top 50 ranking results. | Direct Etsy currency-normalized pricing. |
| **Demand Proxy (Avg Favorers)**| `[ESTIMATED]` | Arithmetic mean of `num_favorers` across top 50 ranking results. | **NEVER label as "Etsy Search Volume"**. Explicitly labeled as buyer favorite engagement signal. |
| **Competition Level** | `[SELLERSALT SCORE]` | Multi-factor rating (Very Low, Low, Moderate, High, Very High) computed from supply count, review barriers, and seller concentration. | Heuristic rating explaining ease of ranking on page 1. |
| **Relevance Score** | `[SELLERSALT SCORE]` | Semantic token overlap index between user query and extracted long-tail phrases (0–100%). | Measures topical closeness to search intent. |
| **Search Volume Index** | `[EXTERNAL DATA]` | Sourced from external search engine data providers (e.g. Google Keyword Planner index). | Clearly labeled with external source name. |
| **Search Trend (12 Mo)** | `[EXTERNAL DATA]` | Historical 12-month search volume trajectory from external search index. | Shows seasonality and momentum. |

---

## 3. Related Term & Long-Tail Extraction Engine

When a keyword search is executed, SellerSalt extracts hundreds of related terms through a multi-stage NLP aggregation pipeline:

1. **Tag Harvesting**: Collects all 13 tags from every listing in the top 50 results (up to 650 raw tag strings).
2. **Title N-Gram Tokenization**: Extracts 2-word, 3-word, and 4-word contiguous n-grams from top listing titles.
3. **Frequency Aggregation**: Counts occurrences of each unique phrase across competing listings.
4. **Length & Structure Validation**: 
   - Flags phrases that fit Etsy's 20-character tag limit.
   - Calculates word counts (1-word, 2-word, 3-word, 4+ word / long-tail).
5. **Intent Classification**: Categorizes keywords into:
   - **Product Type**: e.g., `"travel wallet"`, `"passport cover"`
   - **Recipient / Occasion**: e.g., `"gift for him"`, `"groomsmen gift"`
   - **Material / Style**: e.g., `"full grain leather"`, `"vintage minimalist"`

---

## 4. UI Filters & Query Capabilities

The Keyword Research UI provides real-time client-side and server-side filtering:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         KEYWORD FILTER CONTROLS                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ • Search Term Input: [ "leather passport holder"           ] [ 🔍 Search ]  │
│                                                                             │
│ • Match Modes:                                                              │
│   (•) Contains    ( ) Exact Match    ( ) Starts With    ( ) Ends With       │
│                                                                             │
│ • Word Count Filters:                                                       │
│   [ All Words ] [ 1 Word ] [ 2 Words ] [ 3 Words ] [ 4+ Words (Long-Tail) ] │
│                                                                             │
│ • Tag Character Length Filter:                                              │
│   [✓] Show only tags ≤ 20 characters (Ready for Etsy Tags)                  │
│                                                                             │
│ • Competition Filter:                                                       │
│   [✓] Very Low   [✓] Low   [ ] Moderate   [ ] High   [ ] Very High          │
│                                                                             │
│ • Price Range ($): [ Min: 15 ] to [ Max: 60 ]                               │
│                                                                             │
│ • Bulk Actions:                                                             │
│   [ Select All (24) ]  ──► [ 📋 Add to Planner ]  ──► [ 📥 Export CSV ]      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Technical Implementation & API Contracts

### 5.1 Standalone Search Route: `POST /api/keywords/search`
```typescript
// Request Payload
interface KeywordSearchRequest {
  query: string;
  categoryTaxonomyId?: number;
  minPrice?: number;
  maxPrice?: number;
  limit?: number; // Default: 50 listings sampled
}

// Response Payload
interface KeywordSearchResponse {
  query: string;
  summary: {
    totalEtsySupply: number;          // [ACTUAL ETSY DATA]
    sampledListingCount: number;
    avgPrice: number;                 // [ACTUAL ETSY DATA]
    avgFavorers: number;              // [ESTIMATED]
    competitionLevel: "VERY_LOW" | "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH"; // [SELLERSALT SCORE]
    competitionScore: number;         // 0-100
  };
  keywords: Array<{
    term: string;
    wordCount: number;
    charCount: number;
    isTagCompliant: boolean;          // charCount <= 20
    frequency: number;                // occurrences in top listings
    relevanceScore: number;           // 0-100
    estimatedDemandSignal: number;    // avg favorers of listings with this tag
    competitionLevel: string;
    externalMonthlyVolume?: number;   // [EXTERNAL DATA]
    externalTrend?: number[];         // [EXTERNAL DATA]
    provenance: "ETSY_EXTRACTED_TAG" | "TITLE_NGRAM" | "EXTERNAL_INDEX";
  }>;
}
```

### 5.2 Planner Handoff Route: `POST /api/planned-keywords`
Allows saving selected keywords individually or in bulk into the active organization's `PlannedKeyword` table, preserving the query provenance.
