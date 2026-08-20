# Batch 28: Production Billing, Subscription Lifecycle & Commercial Entitlements

**Authoritative Specification: Commercial Architecture, Entitlement Engine, Webhook Idempotency, Billing Reconciliation & Simulation Harness**  
**Version:** 1.0 (Batch 28)  
**Status:** Canonical & Production Verified  

---

## 1. Executive Summary

Batch 28 establishes SellerSalt's **production-grade commercial entitlement and subscription lifecycle architecture**. It unifies payment provider webhooks (Stripe, PayPal, SafePay, PayFast) under a canonical provider-neutral subscription state machine, guarantees webhook idempotency, delivers deterministic plan transitions without deleting historical user data, and implements an immutable billing event audit ledger.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   COMMERCIAL ENTITLEMENT ARCHITECTURE                  │
├───────────────────┬───────────────────┬────────────────────────────────┤
│  PROVIDER INGEST  │  CANONICAL ENGINE │      AUTHORITATIVE GATING      │
├───────────────────┼───────────────────┼────────────────────────────────┤
│ Stripe Webhooks   │ Subscription      │ EntitlementEngine              │
│ PayPal Webhooks   │ Lifecycle State   │ - Features & Marketplace Gate  │
│ SafePay & PayFast │ Machine & Ledger  │ - Monthly Quota Accounting     │
│ Manual Admin Sub  │ (FREE/ACTIVE/...) │ - Non-Destructive Downgrades   │
└───────────────────┴───────────────────┴────────────────────────────────┘
```

---

## 2. Canonical Billing Domain & State Machine

The internal subscription lifecycle distinguishes:
- **`FREE`**: Unpaid default tier ($0/mo) with Free Explorer limits (10 product researches, 15 keyword searches, 3 SEO audits, 2 AI drafts).
- **`TRIALING`**: Active trial with temporary full feature access.
- **`ACTIVE`**: Paid subscription with verified server-side payment confirmation.
- **`PAST_DUE`**: Payment failed, falls back to Free entitlements while preserving all merchant data.
- **`CANCELED`**: Active until `currentPeriodEnd` if `cancelAtPeriodEnd` is true, then reverts to Free.
- **`EXPIRED`**: Terminated billing cycle.
- **`INCOMPLETE`**: Checkout started but awaiting initial payment webhook.

### Non-Destructive Invariant
Downgrades and cancellations restrict future capacity (e.g. creating new searches/drafts) but **never delete existing research history, product observations, saved opportunities, validations, or workspaces**.

---

## 3. Core Implemented Modules

### 3.1 `EntitlementEngine` (`src/services/billing/entitlement-engine.ts`)
- Authoritative server-side resolver for:
  - Plan definition and effective tier resolution.
  - Allowed marketplace research access (`FREE`: Etsy; `STARTED`: Etsy, Amazon; `PRO`: Etsy, Amazon, eBay, Walmart; `AGENCY`: All).
  - Discovery depth (`QUICK`, `STANDARD`, `DEEP`).
  - Real-time monthly quota utilization and exact UTC reset date (1st of next month, 00:00 UTC).

### 3.2 `BillingEventLedger` (`src/services/billing/billing-event-ledger.ts`)
- Immutable audit ledger recording provider, external event ID, event type, organization ID, status, and payload summaries.
- Prevents duplicate webhook execution and out-of-order corruption.

### 3.3 `BillingReconciliationService` (`src/services/billing/billing-reconciliation.ts`)
- Diagnostic audit engine detecting discrepancies (e.g. `EXPIRED_STILL_ACTIVE`, `PACKAGE_MISMATCH`, `MISSING_PROVIDER_SUB_ID`).
- Supports dry-run diagnostic mode and live reconciliation.
- Gated API endpoint at `GET /api/billing/reconcile`.

### 3.4 `BillingSimulator` (`src/services/billing/billing-simulator.ts`)
- End-to-end integration test harness simulating the complete commercial lifecycle:
  1. Free Organization Setup
  2. Starter Activation
  3. Quota Consumption
  4. Renewal
  5. Pro Upgrade
  6. Cancel at Period End
  7. Reactivation
  8. Payment Failure & Past Due
  9. Final Expiration

---

## 4. Verified Production Baseline

- **Tests**: `1151/1151 passing across 316 suites` (`src/tests/*.test.ts`)
- **TypeScript**: `0 errors` (`npx tsc --noEmit`)
- **Prisma**: Valid & synchronized (`prisma validate`)
- **Next.js**: Clean production build (`170/170 routes compiled`)
- **Security**: Strict multi-tenant `organizationId` isolation verified across all billing endpoints.
