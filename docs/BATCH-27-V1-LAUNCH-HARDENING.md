# Batch 27: V1 Launch Hardening & Production Usability Readiness

**Authoritative Specification: End-to-End Merchant Lifecycle, Workflow Continuity, State Completeness & Commercial Readiness**  
**Version:** 1.0 (Batch 27)  
**Status:** Canonical & Production Verified  

---

## 1. Executive Summary

Batch 27 moves SellerSalt from **"Technically Complete V1"** to **"Launchable V1 SaaS"**. It validates the entire merchant lifecycle from initial homepage arrival, account signup, 4-step onboarding, and first research execution through product validation, sourcing workspace configuration, and listing launch preparation.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        THE 5-STEP JOURNEY                              │
├────────────┬────────────┬─────────────┬──────────────┬─────────────────┤
│ 1. DISCOVER│ 2. RESEARCH│ 3. VALIDATE │ 4. PLAN      │ 5. LAUNCH       │
├────────────┼────────────┼─────────────┼──────────────┼─────────────────┤
│ Opportunity│ Observable │ Commercial  │ Sourcing     │ Policy-Compliant│
│ Radar 2.0  │ Pricing,   │ Feasibility │ Specs, BOM,  │ SEO Listing     │
│ & Niche Gaps│ Reviews &  │ Decision    │ & 3 Scenario │ Studio Drafts   │
│            │ Saturation │ (PURSUE)    │ Economics    │ & Execution Plan│
└────────────┴────────────┴─────────────┴──────────────┴─────────────────┘
```

---

## 2. Comprehensive Audits & Implementations

### 2.1 First-Time vs Returning Merchant Activation (`/dashboard`)
- **First-Time Users**: Guided by `DashboardOnboardingGuide` which tracks real PostgreSQL records (`onboardingCompletedAt`, `onboardingCategory`, `onboardingGoal`, draft counts) and offers direct starting paths into Discovery and Research.
- **Returning Merchants**: Greeted by `PersonalizedContinuationSection` surfacing real recent research runs, active product opportunities, and commercial decision verdicts without synthetic statistics.

### 2.2 Query-to-Result Experience & Workspaces (`/product-workspaces`)
- Enhanced `/product-workspaces` with query-driven search parameters (`?q=...`), allowing merchants to filter existing workspaces or seamlessly transition from Validation into a newly initialized workspace with a single click.

### 2.3 Quota Boundaries & Server-Side Enforcement (`checkQuota`)
- Synchronized and verified authoritative quota checks across all 5 restricted resources:
  - `PRODUCT_RESEARCH`: 10 (Free), 100 (Starter), 500 (Pro), Unlimited (Agency)
  - `KEYWORD_SEARCH`: 15 (Free), 150 (Starter), 750 (Pro), 3,000 (Agency)
  - `SEO_AUDIT`: 3 (Free), 25 (Starter), 100 (Pro), 500 (Agency)
  - `AI_GENERATION`: 2 (Free), 30 (Starter), 150 (Pro), 500 (Agency)
  - `PLANNER_ITEM`: 3 (Free), 25 (Starter), 100 (Pro), Unlimited (Agency)

### 2.4 Security, IDOR Protection & Multi-Tenant Isolation
- Strict multi-tenant `organizationId` scoping verified across all core API endpoints (`/api/product-workspaces`, `/api/product-workspaces/[id]`, `/api/validation/product`, `/api/onboarding/complete`).
- Zero IDOR vulnerability: users from Organization A cannot query or mutate data from Organization B.

### 2.5 Claim Safety & Honest Data Trust
- Canonical positioning: *"Know what to sell before you spend money."*
- Zero-Fabrication Contract: Epistemological signal classifications (`OBSERVED`, `DERIVED`, `ESTIMATED`, `USER_DERIVED`, `UNAVAILABLE`) strictly preserved.
- Anti-circumvention: `MarketplaceAccessResolver` and `SourcePolicyEnforcer` ensure restricted platforms degrade safely without illicit scraping fallbacks.

---

## 3. Verified Production Baseline

- **Tests**: `1140/1140 passing across 311 suites` (`src/tests/*.test.ts`)
- **TypeScript**: `0 errors` (`npx tsc --noEmit`)
- **Prisma**: Valid & synchronized (`prisma validate`)
- **Next.js**: Clean production build (`169/169 routes compiled`)
- **Security**: Strict multi-tenant `organizationId` isolation verified across all user-facing endpoints.
