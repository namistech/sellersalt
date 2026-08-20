# SellerSalt Product Research Command Center & Research-to-Decision Architecture

This document is the authoritative technical reference for the **SellerSalt Product Research Command Center** (Batch 18), providing unified discovery, market observation, keyword clustering, competition density, commercial opportunity scoring, and product validation workflows.

---

## 1. Overview & Core Mission

SellerSalt functions as an independent **Ecommerce Intelligence Platform**. The Product Research Command Center provides merchants with a single, end-to-end evidence-based research command surface:

```
Merchant Query (e.g. "ceramic coffee mug")
       ↓
Query Normalization & Semantic Variants (QueryNormalizer)
       ↓
Multi-Marketplace Public Ingestion (PUBLIC_WEB Primary, Etsy, Amazon, eBay, Walmart)
       ↓
Market Overview & Empirical Distributions (Min, Median, Max, Price Bands, Review Distributions)
       ↓
Keyword Clustering & Intent Segmentation (Material/Style, Recipient/Occasion, Modifiers)
       ↓
Competition Density & Dominant Merchant Profiling (HHI, Catalog Shares, Barrier Ratings)
       ↓
Opportunity Discovery Engine 2.0 (Structured Opportunity Cards)
       ↓
Product Validation & Decision Verdict (ProductValidationEngine, Go / Caution / Avoid)
       ↓
Unified Research Queue & Comparison Engine (Side-by-side product metrics & org-scoped watchlist)
```

---

## 2. Zero-Fabrication Contract

SellerSalt strictly adheres to transparent, evidence-based data provenance:
1. **Search Volume**: Exact monthly search query volume is strictly `null` with provenance `"UNAVAILABLE"` unless supplied by licensed volume feeds.
2. **Private Unit Sales & Revenues**: Unobserved private store revenues are strictly `null` and never fabricated from arbitrary multipliers.
3. **Price Bands & Medians**: Calculated deterministically from actual observed public product prices ($P_{min}, P_{med}, P_{max}$).
4. **Comparison Metrics**: Missing signals in side-by-side comparison are reported as `INCOMPARABLE` or `null`, never substituted with `0`.

---

## 3. Core Engine Architecture

### 3.1 Orchestrator (`ProductResearchCommandCenter`)
Located in [`src/services/intelligence/product-research-command-center.ts`](file:///Users/aliyanbaig/Downloads/anadash/src/services/intelligence/product-research-command-center.ts):
- Standardizes user queries into clean tokens and semantic variants.
- Dispatches parallel public acquisitions across selected marketplaces with timeout guards.
- Deduplicates observations using SHA-256 fingerprinting.
- Calculates market overview KPIs, keyword clusters, and dominant merchant profiles.
- Formulates an executive commercial decision summary with top drivers, risks, and unobserved signals.
- Persists session telemetry into `ResearchRun` and observations into `ProductObservation`.

### 3.2 Research Comparison Engine (`ResearchComparisonEngine`)
Located in [`src/services/intelligence/research-comparison-engine.ts`](file:///Users/aliyanbaig/Downloads/anadash/src/services/intelligence/research-comparison-engine.ts):
- Compares products side-by-side across Price, Rating, Review Count, and Marketplace.
- Identifies winners per metric, formats deltas, and gracefully tags unobserved metrics as `INCOMPARABLE`.

### 3.3 Unified Research Queue (`ResearchQueueManager`)
Located in [`src/services/intelligence/research-queue.ts`](file:///Users/aliyanbaig/Downloads/anadash/src/services/intelligence/research-queue.ts):
- Enables sellers to save opportunities, products, keywords, and categories into an organization-scoped research queue.
- Persists into `SavedOpportunity` with fallback in-memory cache for test isolation.

---

## 4. API Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/research/session` | Executes end-to-end multi-marketplace research command | Yes (`organizationId`) |
| `GET` | `/api/research/session/[id]` | Retrieves research session details | Yes (`organizationId`) |
| `POST` | `/api/research/session/[id]/refresh` | Re-executes research session with fresh data | Yes (`organizationId`) |
| `POST` | `/api/research/compare` | Compares entities side-by-side | Yes (`organizationId`) |
| `GET` | `/api/research/queue` | Lists items in the user's research queue | Yes (`organizationId`) |
| `POST` | `/api/research/queue` | Adds an item to the research queue | Yes (`organizationId`) |
| `DELETE` | `/api/research/queue/[id]` | Removes an item from the research queue | Yes (`organizationId`) |

---

## 5. UI & Navigation Integration

1. **Command Center UI** ([`src/components/research/ProductResearchCommandCenter.tsx`](file:///Users/aliyanbaig/Downloads/anadash/src/components/research/ProductResearchCommandCenter.tsx)):
   - Unified search bar with marketplace checkboxes and depth modes (`QUICK`, `STANDARD`, `DEEP`).
   - High-level overview cards: Opportunity, Demand, Competition, Momentum, and Price bands.
   - Comprehensive tabs: Observed Products, Keyword Clusters, Competition & Merchants, Opportunities, Decision & Risks, Data Quality & Trust, and Compliant Public Acquisition Trace.
2. **Route** (`/research-center`):
   - Dedicated full-screen Product Research Command Center page (`src/app/(dashboard)/research-center/page.tsx`).
   - Registered in primary navigation (`src/services/navigation.ts`).
