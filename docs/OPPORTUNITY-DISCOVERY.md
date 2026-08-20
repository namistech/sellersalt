# SellerSalt Autonomous Opportunity Discovery & Market Radar 2.0

This document is the authoritative technical reference for the **Autonomous Opportunity Discovery Engine, Market Radar 2.0, and Product Idea Engine** (Batch 20).

---

## 1. Core Architecture

SellerSalt enables merchants to discover high-value ecommerce opportunities and product ideas directly from observable public market signals without requiring a specific query:

```
                        Autonomous Scope & Seeds
                                   ↓
                   Multi-Marketplace Public Ingestion
                     (Etsy, Amazon, eBay, Walmart)
                                   ↓
             Entity Resolution & Normalization (Deterministic IDs)
                                   ↓
                 Market Intelligence Graph & Memory Ingestion
                                   ↓
                Opportunity Detection Rules (14 Formal Types)
                                   ↓
                 Opportunity Scoring 3.0 & Confidence Model
                                   ↓
               Deduplication & Canonical Grouping (Entity Level)
                                   ↓
             Deterministic Ranking (8 Strategic Ranking Modes)
                                   ↓
                     Evidence-Grounded Product Ideas
                                   ↓
                   Opportunity Radar 2.0 Categorized Feed
                                   ↓
              Watchlist Monitoring & Longitudinal Alerts
```

---

## 2. Zero-Fabrication Contract

SellerSalt maintains strict adherence to transparent, evidence-based data provenance:
1. **Search Volume**: Exact monthly search query volume is strictly `null` with provenance `"UNAVAILABLE"` unless supplied by licensed volume feeds.
2. **Private Store Revenues & Unit Sales**: Unobserved private store revenues are strictly `null` and never fabricated from arbitrary multipliers.
3. **Historical Deltas**: Minimum observation requirement $n \ge 2$ historical snapshots. Single-snapshot delta returns `null` / `INSUFFICIENT_DATA` (never fabricated as 0%).
4. **Product Ideas**: Product concepts clearly differentiate between **Observed Evidence** (prices, frequent keywords, sample size) and **Derived Strategy** (attribute gaps, underrepresented combinations).

---

## 3. Core Engine Components

### 3.1 Autonomous Discovery Engine (`AutonomousDiscoveryEngine`)
Located in [`src/services/intelligence/autonomous-discovery-engine.ts`](file:///Users/aliyanbaig/Downloads/anadash/src/services/intelligence/autonomous-discovery-engine.ts):
- Bounded seed generation across categories and niches (`QUICK` = 1 seed, `STANDARD` = 2 seeds, `DEEP` = 4 seeds).
- Multi-marketplace public ingestion via `MarketplaceRegistry` adapters.
- End-to-end execution returning ranked opportunities, product ideas, radar feed, data quality, and acquisition trace.

### 3.2 Opportunity Scoring 3.0 (`OpportunityScoring3Engine`)
Located in [`src/services/intelligence/opportunity-scoring-3.ts`](file:///Users/aliyanbaig/Downloads/anadash/src/services/intelligence/opportunity-scoring-3.ts):
- Multi-factor deterministic scoring:
  - Demand Evidence (0 - 25)
  - Competition Attractiveness (0 - 25)
  - Market Momentum (0 - 15)
  - Differentiation Potential (0 - 15)
  - Price Positioning (0 - 10)
  - Evidence Depth & Corroboration (0 - 10)
- Explicit weight redistribution when metrics are unobserved.

### 3.3 Product Idea Engine (`ProductIdeaEngine`)
Located in [`src/services/intelligence/product-idea-engine.ts`](file:///Users/aliyanbaig/Downloads/anadash/src/services/intelligence/product-idea-engine.ts):
- Synthesizes product concepts from observed keyword distributions and price bands.
- Distinguishes observed metrics, derived attribute gaps, risks, and next steps.

### 3.4 Opportunity Radar 2.0 (`OpportunityRadar2Engine`)
Located in [`src/services/intelligence/opportunity-radar-2.ts`](file:///Users/aliyanbaig/Downloads/anadash/src/services/intelligence/opportunity-radar-2.ts):
- Organizes opportunities into sections:
  1. Emerging Opportunities
  2. Rising Momentum
  3. Underserved Attributes & Niches
  4. Price Gaps & Margin Windows
  5. Cross-Marketplace Expansion
  6. Differentiation Gaps
  7. Persistent Market Leaders

### 3.5 Watchlist & Alert Engine (`OpportunityWatchEngine`)
Located in [`src/services/intelligence/opportunity-watch-engine.ts`](file:///Users/aliyanbaig/Downloads/anadash/src/services/intelligence/opportunity-watch-engine.ts):
- Monitors watched opportunities, evaluating score shifts ($\ge 5$ pts), price shifts ($\ge 5\%$), and momentum transitions.

---

## 4. API Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/discovery/run` | Executes autonomous discovery | Yes (`organizationId`) |
| `GET` | `/api/discovery/runs` | Lists past discovery runs | Yes (`organizationId`) |
| `GET` | `/api/discovery/runs/[id]` | Gets specific discovery run details | Yes (`organizationId`) |
| `GET` | `/api/discovery/opportunities` | Queries filtered opportunities | Yes (`organizationId`) |
| `POST` | `/api/discovery/opportunities/[id]/save` | Saves opportunity to watchlist | Yes (`organizationId`) |
| `POST` | `/api/discovery/opportunities/[id]/research` | Handoff to Research Center | Yes (`organizationId`) |
| `POST` | `/api/discovery/opportunities/[id]/validate` | Handoff to Product Validation | Yes (`organizationId`) |
| `GET` | `/api/radar` | Opportunity Radar 2.0 Feed | Yes (`organizationId`) |
| `POST` | `/api/radar/refresh` | Refreshes Opportunity Radar | Yes (`organizationId`) |
| `GET` | `/api/watchlist` | Lists watched items | Yes (`organizationId`) |
| `POST` | `/api/watchlist` | Adds item to watchlist | Yes (`organizationId`) |
| `DELETE` | `/api/watchlist/[id]` | Removes item from watchlist | Yes (`organizationId`) |
| `GET` | `/api/watchlist/alerts` | Gets triggered change alerts | Yes (`organizationId`) |
