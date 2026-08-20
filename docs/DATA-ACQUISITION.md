# DATA-ACQUISITION.md — SellerSalt Data Acquisition Architecture

## 1. Core Philosophy: Marketplace-Independent Intelligence

SellerSalt is **the Ecommerce Intelligence Platform**.

### Fundamental Rules:
1. **Marketplace APIs are secondary sources.**
2. **SellerSalt's own public web data acquisition system is the primary research source.**
3. **The intelligence layer never depends directly on official API credentials to perform market research.**
4. **Zero fabrication of missing marketplace metrics**: Missing fields remain `null`/`undefined` with calibrated confidence.
5. **No anti-bot evasion / CAPTCHA bypasses**: Standard, polite, rate-limited public web ingestion (JSON-LD, microdata, OpenGraph, semantic search cards) with transparent caching and honest User-Agent headers.

---

## 2. Multi-Source Hierarchy & Fallback Cascades

```
                         USER QUERY
                             │
                             ▼
                    RESEARCH ORCHESTRATOR
                             │
                             ▼
                     ACQUISITION ROUTER
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
      PUBLIC WEB       MARKETPLACE API     HISTORICAL DB
  (Public Adapters)   (Official Connectors) (Prospects/Snapshots)
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                             ▼
                  OBSERVATION MERGER
             (Non-destructive enrichment)
                             │
                             ▼
                     FRESHNESS ENGINE
             (LIVE / FRESH / STALE / HISTORICAL)
                             │
                             ▼
                  CANONICAL INTELLIGENCE
            (evaluateCanonicalOpportunity)
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
          PRODUCT          KEYWORD         SHOP
        INTELLIGENCE     INTELLIGENCE   INTELLIGENCE
              │              │              │
              └──────────────┼──────────────┘
                             ▼
                    CROSS-MARKETPLACE
                       COMPARISON
                             │
                             ▼
                         SELLERSALT
                          INTELLIGENCE
```

---

## 3. Supported Data Source Types

| Source Type | Description | Priority |
|---|---|---|
| `PUBLIC_WEB` | Platform-owned public web ingestion via JSON-LD, OpenGraph, and semantic HTML parsers | **1 (Primary)** |
| `MARKETPLACE_API` | Official partner/developer API (e.g. Etsy Open API v3) for secondary enrichment | **2 (Enrichment)** |
| `HISTORICAL_OBSERVATION` | Longitudinal observations persisted in PostgreSQL (`Prospect` table) | **3 (Fallback)** |
| `USER_IMPORT` | Merchant-imported CSV or manual listing datasets | Optional |
| `CONNECTED_STORE` | Authorized merchant store OAuth connection (`SellerChannel`) | 1st-Party Store Ops |
| `EXTERNAL_PROVIDER` | Third-party licensed data providers (future Rainforest, DataForSEO) | Optional |
| `DEV_FIXTURE` | Offline sanitized development/test fixtures | Testing/CI |

---

## 4. Public Web Adapters & Capability Matrix

| Marketplace | Adapter Class | Capabilities | Live Status |
|---|---|---|---|
| **Etsy** | `EtsyPublicWebAdapter` | Product Search, Product Detail, Shop Research, Keyword Harvest, Category Taxonomy | **LIVE AND VERIFIED** |
| **Amazon** | `AmazonPublicWebAdapter` | Product Search, Product Detail, Keyword Harvest, JSON-LD Parser | **ARCHITECTURE READY** (Parser verified via recorded fixtures) |
| **eBay** | `EbayPublicWebAdapter` | Product Search, Product Detail, Keyword Harvest, JSON-LD Parser | **ARCHITECTURE READY** (Parser verified via recorded fixtures) |
| **Walmart** | `WalmartPublicWebAdapter` | Product Search, Product Detail, JSON-LD Parser | **ARCHITECTURE READY** (Parser verified via recorded fixtures) |
| **TikTok Shop** | `TikTokShopPublicWebAdapter` | Contract Stub | **ARCHITECTURE READY** |

---

## 5. Temporal Freshness Model

Observations are calibrated against metric-specific natural lifetimes:

- **Price**: Fresh up to 6 hours (`maxFreshHours: 6`).
- **Reviews / Ratings**: Fresh up to 48 hours (`maxFreshHours: 48`).
- **Taxonomy / Categories**: Fresh up to 7 days (`maxFreshHours: 168`).
- **Shop Profiles**: Fresh up to 24 hours (`maxFreshHours: 24`).

### Freshness Statuses:
- `LIVE`: Captured < 1 hour ago (0% confidence penalty).
- `FRESH`: Captured within metric lifetime (5% confidence penalty).
- `STALE`: Beyond fresh lifetime but within retention window (15% penalty).
- `HISTORICAL`: Historical snapshot from database (30% penalty).
- `UNKNOWN`: Missing timestamp (35% penalty).

---

## 6. Empirical Keyword Research Without Official APIs

- Analyzes public search result titles, tags, and category taxonomies.
- Calculates:
  - **Observed Listing Frequency** (%)
  - **Marketplace Result Density**
  - **SellerSalt Demand Proxy Score** (0-100 derived from listing penetration and review volume)
  - **Competition Proxy** (`LOW` | `MODERATE` | `HIGH`)
- **Zero Fabrication**: `exactSearchVolume = null` with `searchVolumeProvenance: "UNAVAILABLE"` unless backed by a licensed keyword volume provider.

---

## 7. Compliance & Safety Safeguards

1. **SSRF Guard**: Prohibits requests to localhost, private IP ranges, and internal network metadata endpoints.
2. **Private Dashboard Protection**: Blocks scraping of authenticated seller portals (`/your/shops`, `sellercentral.amazon.com`, `seller.walmart.com`).
3. **Honest User-Agent**: Identifies requests as `SellerSalt Commerce Research Bot/1.0 (+https://sellersalt.com/bot; research@sellersalt.com)`.
4. **Token-Bucket Rate Limiting**: Per-domain request concurrency and throttling (`DomainRateLimiter`).
5. **Bounded Payloads & Timeouts**: 8s default timeout, 5MB max payload size.

---

## 8. Longitudinal Trend & Persistent Observation Store (Batch 11)

### Database Observation Schema:
- **`ResearchRun`**: First-class record of research executions across domains (`PRODUCT`, `KEYWORD`, `SHOP`, `CATEGORY`, `NICHE`, `RADAR`), tracking sources attempted, status, item counts, duration, and diff summaries.
- **`ProductObservation`**: Canonical persistent observation table with SHA-256 fingerprinting for deterministic deduplication.
- **`ProductObservationSnapshot`**: Longitudinal time-series snapshot capturing historical metric shifts (price, rating, reviews, favorites, sales) only when values change.
- **`KeywordObservation`**: Persistent keyword prevalence, average prices, and intent clusters.
- **`CategoryObservation`**: Persistent category catalog yield, price distributions, and opportunity score distributions.
- **`AcquisitionSourceHealth`**: Live operational health metrics per marketplace and source type (consecutive failures, latencies, rate limits, access restrictions).

### Longitudinal Diff & Change Detection:
- `computeProductObservationFingerprint`: SHA-256 hash of normalized price, currency, rating, reviews, favorites, sales, title, shop, and status.
- `evaluateObservationChange`: Distinguishes unchanged observations (which only touch `observedAt`) from changed records (which trigger a new `ProductObservationSnapshot`).
- `calculateProductObservationDiff`: Calculates exact price drops, dollar deltas, review gains, and monthly review velocity across snapshots.
- `compareResearchRuns`: Computes appearing, disappearing, and persisting listing sets between two runs of a query.
- **Zero Fabrication Rule**: Strictly returns `null` for price deltas, review velocities, or historical trends when $n \le 1$ observations exist.

---

## 9. Research Budgets, Safety Bounds & Cache

- **Research Budgets (`ResearchBudgetTracker`)**: Enforces strict execution bounds to prevent runaway crawling (max 3 pages, max 50 listings, max 15 shops, max 20s timeout, max 5MB payload).
- **Multi-Tier Research Cache (`ResearchCache`)**: Domain-specific in-memory TTLs:
  - Product Research: 6 hours
  - Keyword Research: 12 hours
  - Shop Research: 24 hours
  - Category Intelligence: 7 days
- **Acquisition Source Health Engine (`SourceHealthTracker`)**: Tracks per-source success rates and flags `RATE_LIMITED` or `ACCESS_RESTRICTED` statuses to inform orchestrator routing.

---

## 10. Unified Research Workbench Orchestration

`executeResearchRun()` in `src/marketplaces/core/acquisition/workbench.ts`:
- Unified entry point for executing `PRODUCT`, `KEYWORD`, `SHOP`, `CATEGORY`, `NICHE`, and `RADAR` research runs.
- Handles cache checks, execution budgets, source health tracking, dual persistence, and diff comparisons.

### Research API Endpoints:
- `POST /api/research/run`: Execute on-demand research runs.
- `GET /api/research/runs`: List historical research runs with item counts and statuses.
- `GET /api/research/runs/[id]`: Retrieve run details and associated product observations with historical snapshots.
- `GET /api/research/sources/health`: Inspect live health and status across all marketplace acquisition sources.
- `POST /api/research/compare`: Compare two research runs or fetch longitudinal observation deltas.

---

## 11. UI Transparency & Provenance Card

- **`ResearchWorkbenchCard.tsx`**: Renders signal availability, source badges (`PUBLIC_WEB`, `MARKETPLACE_API`, `HISTORICAL_OBSERVATION`), temporal freshness tiers (`LIVE`, `FRESH`, `STALE`, `HISTORICAL`), confidence scores, and longitudinal diff highlights.

---

## 12. Live Smoke Testing Facility

- Dedicated development/manual testing harness at `src/tests/live-smoke/live-research-smoke.ts`.
- Gated behind `SELLERSALT_LIVE_RESEARCH_SMOKE=true`.
- Never executes in CI or automated unit test runs.
- Runs small (5-item) sample requests against public adapters to verify live HTML markup compatibility.

