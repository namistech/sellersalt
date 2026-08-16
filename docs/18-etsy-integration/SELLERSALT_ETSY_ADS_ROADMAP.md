# SellerSalt — Etsy Ads Capability Audit & Roadmap

- **Document Version:** 2.0.0
- **Status:** Canonical Compliance & Roadmap Policy
- **Authoritative Reference:** Etsy Open API v3 Capability Audit

---

## 1. Executive Statement & Anti-Fabrication Policy

### Absolute Truth:
**Etsy Open API v3 provides NO official API endpoints for Etsy Ads campaign management, budget adjustments, keyword bidding, or listing-level ad performance metrics (impressions, clicks, CTR, CPC, ROAS).**

SellerSalt will **NEVER** market, promise, or fabricate a "Full Etsy Ads Management Tool" or "Automated Etsy Ads Bidder" under current official API capabilities. Doing so would violate both engineering honesty standards and Etsy API Terms of Service.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ETSY ADS CAPABILITY REALITY                           │
├──────────────────────────────────────┬──────────────────────────────────────┤
│ ❌ NOT AVAILABLE IN ETSY API v3      │ ✅ LEGITIMATELY AVAILABLE            │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ • No Ads Campaign Creation API       │ • Aggregate Advertising Fees via     │
│ • No Daily Budget Adjustment API     │   Etsy Payment/Billing Ledger        │
│ • No Listing-Level Ad Impressions    │   (`GET /shops/{id}/payment-account/ │
│ • No Listing-Level Ad Clicks         │    ledger-entries`)                  │
│ • No Ad Click-Through-Rate (CTR)     │ • Deducting total ad spend from      │
│ • No Cost-Per-Click (CPC) Metrics    │   store net profit calculations      │
│ • No Return on Ad Spend (ROAS) API   │                                      │
│ • No Keyword Search Term Bid API     │                                      │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

---

## 2. What Is Legally & Technically Possible Today

### 2.1 Aggregate Ad Fee Reconciliation (Financial Intelligence)
Using the `billing_r` scope granted via Etsy Seller OAuth:
- SellerSalt queries `GET /v3/application/shops/{shop_id}/payment-account/ledger-entries`.
- Filters for entries categorized as `type: "advertising"`, `type: "offsite_ads"`, or `type: "etsy_ads"`.
- Calculates total monthly advertising expenditure across the shop.
- Injects this aggregate expense into the **Profit Waterfall** (`docs/12-revenue/SELLERSALT_REVENUE_INTELLIGENCE_SPEC.md`) to compute true net operating profit after advertising costs.

---

## 3. Legitimate Future Roadmap Options

If SellerSalt expands advertising features in future phases, it will do so strictly through legitimate, compliant mechanisms:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LEGITIMATE FUTURE ADVERTISING OPTIONS                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ OPTION 1: SELLER-PROVIDED CSV REPORT IMPORT                                 │
│ • Seller exports their official Etsy Ads CSV from Etsy Shop Manager.         │
│ • SellerSalt parses the CSV to analyze listing ROAS, CPC, and conversion.   │
│ • Zero scraping required; 100% compliant with Etsy terms.                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ OPTION 2: OFF-PLATFORM SOCIAL ADS (Meta / Pinterest Ads API)               │
│ • Direct integrations with official Meta Ads API and Pinterest Ads API.     │
│ • Drive off-platform targeted traffic to Etsy listings with UTM tracking.   │
├─────────────────────────────────────────────────────────────────────────────┤
│ OPTION 3: FUTURE OFFICIAL ETSY ADS API INTEGRATION                          │
│ • If Etsy releases official Ads management endpoints in a future API        │
│   version, SellerSalt will integrate immediately under official developer   │
│   partnerships.                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```
