# Batch 26: V1 Product Completion & Usable SaaS Readiness

**Authoritative Specification: End-to-End Merchant Lifecycle, Workflow Continuity, State Completeness & Commercial Readiness**  
**Version:** 1.0 (Batch 26)  
**Status:** Canonical & Production Verified  

---

## 1. Executive Summary

Batch 26 turns SellerSalt into a **complete, coherent, and trustworthy V1 SaaS application** that real ecommerce merchants can immediately sign up for and use to make evidence-based commercial decisions.

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

## 2. End-to-End Workflow Audit & Handoffs

Every transition in SellerSalt is continuous, evidence-grounded, and eliminates dead ends:

1. **Sign Up & Onboarding (`/onboarding`)**:
   - Captures merchant focus (Category, Niche, Relevant Marketplaces) and explains the Data Trust contract.
   - Authoritatively writes to `User` in Postgres via `POST /api/onboarding/complete`.
   - On completion, lands the merchant on the **Command Dashboard** with pre-configured search queries.
2. **Discover (`/discovery`, `/radar`, `/trends`)**:
   - Surfaces real market gaps and breakout niches using permitted public catalog streams.
   - `OpportunityDetailDrawer` offers 1-click routing to **Research**, **Validate**, or **Product Workspace**.
3. **Research (`/research-center`, `/prospects`, `/categories`, `/keyword-research`)**:
   - Unified command center with search suggestions, multi-marketplace toggles, and live acquisition traces.
   - Embedded `NextCommercialActionBar` allows instant handoff to **Validation** or **Product Workspace**.
4. **Validate (`/validate`)**:
   - Deterministic commercial decision tree (`PURSUE`, `INVESTIGATE`, `TEST`, `WAIT`, `REJECT`).
   - Embedded `NextCommercialActionBar` transitions directly to **Product Opportunity Workspace**.
5. **Plan (`/product-workspaces`, `/product-workspaces/[id]`)**:
   - Complete 18-section decision cockpit with RFQ sourcing specifications, 3-tier unit economics (Base, Conservative, Optimistic), and launch readiness scoring.
   - Embedded `NextCommercialActionBar` transitions to **AI Listing Studio**.
6. **Launch (`/studio`, `/planner`, `/store`)**:
   - AI listing generator with originality checking (<15% N-gram overlap) and mandatory human approval gate before channel publishing.

---

## 3. Real Product States & Error Handling

Every major surface supports standard, user-friendly state communication:

- **`LOADING`**: Spinners with transparent progress explanation (e.g. *"Acquiring public observations across Etsy, Amazon..."*).
- **`EMPTY`**: Contextual cards explaining what the section does, why it is empty, and actionable starting suggestions (zero synthetic fake data).
- **`POLICY_RESTRICTED` / `RATE_LIMITED` / `NOT_AVAILABLE`**: Transparent explanations explaining what data was accessible and why private metrics remain unavailable under our Zero-Fabrication Contract.
- **`INSUFFICIENT_DATA`**: Clearly communicated when longitudinal history requires $\ge 2$ snapshots.

---

## 4. Quota Boundaries & Billing Architecture

Synchronized across `PLAN_DEFINITIONS`, `prisma.package`, and server-side `checkQuota`:

- **Free Explorer ($0/mo)**: 10 Product Researches, 15 Keyword Searches, 3 SEO Audits, 2 AI Studio Drafts.
- **Starter ($19/mo)**: 100 Product Researches, 150 Keyword Searches, 25 SEO Audits, 30 AI Studio Drafts.
- **Pro ($49/mo)**: 500 Product Researches, 750 Keyword Searches, 100 SEO Audits, 150 AI Studio Drafts.
- **Agency ($199/mo)**: Unlimited Product Researches, 3,000 Keyword Searches, 500 SEO Audits, 500 AI Studio Drafts.

---

## 5. Verified Production Baseline

- **Tests**: `1133/1133 passing across 305 suites` (`src/tests/*.test.ts`)
- **TypeScript**: `0 errors` (`npx tsc --noEmit`)
- **Prisma**: Valid & synchronized (`prisma validate`)
- **Next.js**: Clean production build (`169/169 routes compiled`)
- **Security**: Strict multi-tenant `organizationId` isolation verified across all user-facing endpoints.
