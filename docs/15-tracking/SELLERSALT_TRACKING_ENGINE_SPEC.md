# SellerSalt — Tracking Engine Specification
**Longitudinal Competitor & Listing Time-Series Intelligence**

- **Document Version:** 2.0.0
- **Status:** Complete (Phase L)
- **System Classification:** Time-Series Surveillance & Alerting

---

## 1. Executive Purpose & Data Architecture

The **Tracking Engine** provides longitudinal intelligence by periodically capturing snapshots of competitor shops (`ShopWatch` / `ShopSnapshot`) and high-priority listings (`ListingWatch` / `ListingSnapshot`).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       TIME-SERIES TRACKING PIPELINE                         │
│                                                                             │
│  BULLMQ REPEATABLE JOB (Daily 00:00 UTC)                                    │
│        │                                                                    │
│        ├──► 1. ETSY API FETCH (`GET /shops/{id}`)                           │
│        │    • Current `transaction_sold_count`                              │
│        │    • Current `review_count` & `review_average`                     │
│        │    • Current `listing_active_count`                                │
│        │                                                                    │
│        ├──► 2. SNAPSHOT PERSISTENCE (`ShopSnapshot` Table)                  │
│        │    • Computes Daily Sales Delta (`todaySold - yesterdaySold`)      │
│        │    • Computes Review Velocity Delta                                │
│        │                                                                    │
│        └──► 3. ALERT ENGINE                                                 │
│             • Detects breakout spikes (>300% normal daily sales)            │
│             • Detects competitor price drops or major catalog expansions    │
│                                                                             │
│        ▼                                                                    │
│  INTERACTIVE 30/60/90-DAY GROWTH CHARTS ON `/spy/tracked`                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Tracking Quotas & Package Enforcement

- **Starter Plan**: Up to 5 tracked shops.
- **Pro Plan**: Up to 30 tracked shops.
- **Agency Plan**: Up to 150 tracked shops.
- Enforced via `checkLimit(orgId, "maxTrackedShops")` before adding new watch targets.
