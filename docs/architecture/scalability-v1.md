# SellerSalt Scalability & Intelligence Pipeline Architecture (v1)

This specification defines the production-grade data pipelines, caching tiers, queue orchestration, multi-tenant database indexing, and compliance constraints governing SellerSalt.

---

## 1. System Topology & Tiering

```
[ Next.js Dashboard Client ]
          │  (SessionStorage / LocalStorage Workspace Persistence)
          ▼
[ Next.js API Layer (App Router) ]
    │                      │
    ▼                      ▼
[ Multi-Tenant Postgres (Prisma) ]  [ Redis / BullMQ Task Queues ]
    - Row-level organizationId           - Prospecting & Hunting Worker
    - Compound Indexes                   - 6-Hour Shop Surveillance Worker
    - Snapshot Deduplication             - 8 req/sec Rate Limit Ceiling
                                               │
                                               ▼
                                    [ Etsy API v3 Connector ]
                                         - Rate-limited queue
                                         - Token refresh & backoff
```

---

## 2. API Freshness & Rate-Limiting Engine

To strictly observe **Rule 11** of the Non-Negotiable Engineering Rules:
- **Rate Limit Ceiling**: Max 8 requests per second per Etsy API credential set.
- **Circuit Breaker**: Exponential backoff upon receiving HTTP 429 or 503 from Etsy API v3.

### Cache TTL Hierarchy
| Surface / Data Domain | Cache TTL | Storage Mechanism | Invalidation Trigger |
| :--- | :--- | :--- | :--- |
| **Marketplace Search Results** | 6 Hours | Redis / Postgres | User forced refresh or 6h expiry |
| **Shop Surveillance Snapshots** | 6 Hours | `ShopSnapshot` (Postgres) | Scheduled BullMQ cron (`0 */6 * * *`) |
| **Shop Intelligence Profiles** | 24 Hours | Redis / Postgres | Manual refresh or 24h expiry |
| **Taxonomy Category Tree** | 7 Days | Redis Cache | Weekly taxonomy sync job |
| **Workspace Planner & State** | Realtime | Multi-Tenant Postgres | Immediate mutation |

---

## 3. Asynchronous Queue Architecture (BullMQ)

### 3.1 Competitor Shop Surveillance (`TRACK_SHOP_JOB_NAME`)
- **Cadence**: Every 6 hours (`0 */6 * * *`).
- **Immediate Capture**: When a user clicks "Spy on this competitor", an initial snapshot is immediately captured and persisted, then scheduled on the recurring 6-hour cron.
- **Snapshot Payload**:
  - `totalSales`: Lifetime verified store orders.
  - `reviewCount`: Customer review volume.
  - `reviewAverage`: Star rating (1.0–5.0).
  - `activeListings`: Current active catalog count.
  - `numFavorers`: Store favoriters.

### 3.2 Longitudinal Delta Calculations
From snapshots captured every 6 hours, SellerSalt calculates deterministic deltas:
- **6-Hour Delta**: Recent transaction velocity within the latest monitoring window.
- **24-Hour Delta**: Trailing daily sales velocity.
- **7-Day Delta**: Trailing weekly growth momentum.
- **Spike Detection**: Triggered when 24-hour velocity exceeds 300% of historical 30-day baseline.

---

## 4. Multi-Tenant Database Indexing Strategy

Every table containing tenant data must enforce multi-tenancy at the query layer (`where: { organizationId }`) and maintain compound indexes for query execution:

```prisma
// Example Index Optimization
model ShopWatch {
  id              String   @id @default(cuid())
  organizationId  String
  shopExternalId  String
  shopName        String
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([organizationId, shopExternalId])
  @@index([organizationId, isActive])
  @@index([shopExternalId])
}

model ShopSnapshot {
  id              String    @id @default(cuid())
  shopWatchId     String
  totalSales      Int?
  reviewCount     Int
  reviewAverage   Float?
  activeListings  Int
  numFavorers     Int?
  capturedAt      DateTime  @default(now())

  @@index([shopWatchId, capturedAt(sort: Desc)])
}
```

---

## 5. Privacy-Preserving Aggregated Intelligence Pipeline

To safeguard tenant privacy while enabling predictive marketplace scoring:
1. **Zero Tenant Cross-Contamination**: User shop credentials, revenue numbers, and private drafts are strictly isolated by `organizationId`.
2. **Public Marketplace Benchmarking**: Category benchmarks (medians, spreads, keyword penetration) are derived solely from sampled public Etsy listings.
3. **Deterministic Scoring Transparency**: Every composite score discloses its exact point weights, mathematical formula, and data provenance badge (`[ACTUAL ETSY DATA]`, `[ESTIMATED]`, `[SELLERSALT SCORE]`, `[EXTERNAL DATA]`).
