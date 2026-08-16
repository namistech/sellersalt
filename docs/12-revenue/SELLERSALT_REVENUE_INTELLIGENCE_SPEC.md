# SellerSalt — Revenue & Profit Intelligence Specification

- **Document Version:** 2.0.0
- **Status:** Canonical Specification (Implementation: COMPLETE 2026-08-16)
- **System Classification:** Financial Analytics, Fee Reconciliation & Profit Intelligence

> **Implementation Status [2026-08-16]:**
> - **Revenue & Profit Intelligence Engine (Phase K)**: `COMPLETE`.
> - **Core Revenue Engine**: `src/services/revenue-engine.ts` (`calculateProfitWaterfall`, `calculateEtsyFeeBreakdown`, `calculateListingYieldMatrix`, `calculateProfitSimulation`, `generateFinancialInsights`).
> - **Four-Tier Financial Integrity**: Strictly distinguishes `[ACTUAL ETSY DATA]`, `[CALCULATED]`, `[USER INPUT]`, and `[ESTIMATED]`.
> - **Profit & Loss Waterfall**: Reconciles Gross Sales $\to$ Refunds $\to$ Net Sales $\to$ Etsy Fees (Listing, Transaction, Payment, Offsite Ads) $\to$ Seller COGS $\to$ True Net Profit.
> - **Unit Profit Calculator**: Simulates unit economics, break-even unit count, and break-even price.
> - **API Endpoints**: `GET /api/analytics/revenue`, `GET /api/analytics/listings`, `POST /api/analytics/calculator`, `GET/POST /api/analytics/assumptions`.
> - **Upgraded UI**: `/analytics` with 6 interactive tabs (Executive Overview, P&L Waterfall, Listing Yield Matrix, Strategic Insights, Profit Simulator, Cost Assumptions).

---

## 1. Executive Purpose & Four-Tier Financial Integrity

The **Revenue & Profit Intelligence Engine** provides connected Etsy store owners with institutional-grade financial visibility. Unlike typical e-commerce dashboards that conflate gross GMV (Gross Merchandise Value) with take-home earnings, SellerSalt tracks the entire financial waterfall from top-line order receipts down to true net profit.

Every financial figure is classified into one of 4 strict integrity tiers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       THE 4 FINANCIAL INTEGRITY TIERS                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. [ACTUAL] (Etsy API Verified)                                             │
│    • Direct from Etsy receipts, transactions, and payment ledger entries.   │
│    • E.g., Gross Order Total, Currency Code, Transaction Sold Count.        │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. [CALCULATED] (Deterministic Math on Actual Data)                         │
│    • Exact mathematical totals computed from verified receipts.             │
│    • E.g., Units Sold, Refund Reductions, Average Order Value (AOV).        │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. [USER INPUT] (Seller-Provided Cost Parameters)                           │
│    • Seller-entered Unit Cost of Goods Sold (COGS), custom shipping packaging│
│    • E.g., Unit Material Cost ($4.50), Custom Packaging ($1.20).            │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. [ESTIMATED] (Derived Financial Heuristics)                               │
│    • Model-based projections when exact ledger fee itemization is pending.  │
│    • E.g., Estimated Net Profit Margin (68% standard digital margin).       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. The Comprehensive Profit Waterfall

SellerSalt models the complete financial breakdown for connected Etsy shops:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PROFIT & LOSS WATERFALL                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  GROSS REVENUE (Sum of all completed receipt totals)          [ACTUAL]      │
│  (-) Refunds & Cancellations                                  [ACTUAL]      │
├─────────────────────────────────────────────────────────────────────────────┤
│  = NET ORDER REVENUE                                          [CALCULATED]  │
│  (-) Etsy Listing Fees ($0.20 per auto-renewed listing)       [CALCULATED]  │
│  (-) Etsy Transaction Fees (6.5% of item price + shipping)    [CALCULATED]  │
│  (-) Etsy Payment Processing Fees (3% + $0.25 standard)       [CALCULATED]  │
│  (-) Etsy Regulatory Operating Fees (where applicable)        [CALCULATED]  │
│  (-) Etsy Offsite Ads Fees (12%–15% on qualifying orders)     [CALCULATED]  │
│  (-) Advertising Charges (Identified in Billing Ledger)       [ACTUAL]      │
├─────────────────────────────────────────────────────────────────────────────┤
│  = NET PAYOUT / NET ETSY PROCEEDS                             [CALCULATED]  │
│  (-) Product Unit COGS (Seller Entered)                       [USER INPUT]  │
│  (-) Shipping & Packaging Expenses (Seller Entered)           [USER INPUT]  │
├─────────────────────────────────────────────────────────────────────────────┤
│  = TRUE NET PROFIT (Operating Income)                         [CALCULATED]  │
│  = CONTRIBUTION MARGIN (%) (Net Profit / Net Revenue)         [CALCULATED]  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Financial Metrics & Breakdown Dimensions

The Revenue Intelligence dashboard (`/analytics`) breaks down performance across multiple dimensions:

### 3.1 Store-Level Overview
- **Gross Sales Revenue**: Aggregated by native currency (never blended across disparate currencies).
- **Units Sold**: Total volume of items fulfilled.
- **Average Order Value (AOV)**: `Gross Revenue / Total Completed Orders`.
- **Fee Ratio (%)**: `Total Etsy Fees / Gross Revenue`.
- **Contribution Margin (%)**: `True Net Profit / Net Revenue`.

### 3.2 Listing-Level Revenue & Yield Matrix
- Ranks every active listing in the seller's catalog by:
  - Total Revenue Generated
  - Total Units Sold
  - Average Price Realized
  - Refund Rate per Listing
  - Net Profit Contribution

### 3.3 Category / Taxonomy Performance
- Groups revenue by Etsy taxonomy sub-nodes to identify which product categories deliver the highest margins vs which create dead inventory.

### 3.4 Longitudinal Trendlines
- 30-day, 90-day, and 12-month trailing daily revenue curves with moving averages.

---

## 4. Profit Calculator Tool (`/calculator`)

For prospect research and pre-launch pricing evaluation, the standalone **Profit Calculator** allows sellers to simulate unit economics before creating a product:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PROFIT CALCULATOR INTERFACE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  INPUTS:                                                                    │
│  • Target Sale Price:               [ $28.00 ]                              │
│  • Shipping Charged to Customer:    [ $ 0.00 ] (Free Shipping)              │
│  • Unit COGS (Materials/Print):     [ $ 6.50 ]                              │
│  • Shipping Cost Incurred:          [ $ 0.00 ] (Digital File)               │
│  • Offsite Ads Participating:       [✓] Yes (15% on attributed sales)       │
│                                                                             │
│  BREAKDOWN:                                                                 │
│  • Etsy Listing Fee:                $ 0.20                                  │
│  • Etsy Transaction Fee (6.5%):     $ 1.82                                  │
│  • Payment Processing (3% + $0.25): $ 1.09                                  │
│  • Total Platform Fees:             $ 3.11 (11.1%)                          │
│  • Total Product Costs:             $ 6.50 (23.2%)                          │
│                                                                             │
│  RESULT:                                                                    │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ NET PROFIT PER UNIT: $18.39                                           │  │
│  │ NET PROFIT MARGIN:   65.7%                                            │  │
│  │ BREAK-EVEN UNITS:    1 Unit covers listing costs                      │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Technical Implementation & Data Synchronization

1. **Receipt Ingestion**: `src/seller-channels/etsy-seller/index.ts` fetches up to 300 recent receipts via `GET /shops/{shopId}/receipts` during hourly syncs.
2. **Currency Integrity**: `SellerOrder` records maintain the `currency` string provided by Etsy. Dashboard summaries group totals by currency to avoid inaccurate exchange rate distortions.
3. **COGS Storage**: Unit costs are saved against `PlannerItem.estimatedCogs` or linked `SellerChannel` product metadata.
