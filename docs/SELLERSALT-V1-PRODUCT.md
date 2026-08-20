# SellerSalt V1 — Unified Merchant Experience & Product Shell

**Authoritative Product Architecture, Workflow Journeys, Navigation & UI Specification**  
**Version:** 1.0 (Batch 24)  
**Status:** Canonical & Production Verified  

---

## 1. Product Identity & Value Proposition

**SellerSalt is the Ecommerce Intelligence & Decision-Support Platform.**  
Core Promise: **"Know what to sell before you spend money."**

SellerSalt bridges the critical gap between market curiosity and commercial investment. Rather than overwhelming merchants with disjointed metrics or speculative predictions, SellerSalt transforms observable marketplace signals into deterministic commercial feasibility verdicts and concrete launch blueprints.

---

## 2. The 5-Step Canonical Workflow Journey

SellerSalt organizes the entire merchant journey into five sequential, evidence-grounded phases:

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

1. **Discover (`/discovery`, `/radar`, `/trends`)**:
   - Surfaces high-potential opportunities, emerging niches, and underrepresented attribute gaps across public commerce catalogs without fabricating demand.
2. **Research (`/research-center`, `/prospects`, `/categories`, `/keyword-research`)**:
   - Inspects empirical market structures: $P_{10}, P_{25}, P_{50}, P_{75}, P_{90}$ price distributions, review count barriers, dominant seller share, and keyword cluster prevalence.
3. **Validate (`/validate`)**:
   - Executes multi-dimensional commercial feasibility analysis across Demand, Competition Density, Price Positioning, Trajectory, and Differentiation Gaps to produce deterministic verdicts (`PURSUE`, `INVESTIGATE`, `TEST`, `WAIT`, `REJECT`).
4. **Plan (`/product-workspaces`, `/product-workspaces/[id]`)**:
   - Converts validated ideas into a comprehensive 18-section decision cockpit: Product Configuration, Sourcing Requirements, Supplier RFQ Specifications, 3-tier Unit Economics (Base, Conservative, Optimistic), 10-dimension Launch Readiness, and Information Value Gaps.
5. **Launch (`/studio`, `/planner`, `/store`)**:
   - Generates original, policy-sanitized listing drafts with human approval gates, SEO synergy audits, and prioritized 5-step execution roadmaps.

---

## 3. Information Architecture & Navigation

The primary navigation reflects user workflow rather than backend engineering modules:

```
DASHBOARD
  └── Overview (/dashboard)

DISCOVER
  ├── Opportunity Discovery (/discovery)
  ├── Opportunity Radar (/radar)
  └── Market Trends (/trends)

RESEARCH
  ├── Product Research (/prospects)
  ├── Command Center (/research-center)
  ├── Category Research (/categories)
  ├── Keyword Intelligence (/keyword-research)
  └── Market Research (/spy)

DECIDE & VALIDATE
  ├── Product Validation (/validate)
  ├── Product Workspaces (/product-workspaces)
  ├── Intelligence Graph (/intelligence)
  └── Saved Opportunities (/favorites)

BUILD & OPTIMIZE
  ├── AI Listing Studio (/studio)
  ├── SEO Audit (/seo)
  └── Workspace Planner (/planner)

CHANNELS & GOVERNANCE
  ├── Marketplace Overview (/marketplaces)
  ├── Data Governance (/marketplaces/governance)
  └── Connected Accounts (/settings/channels)

MANAGE & TRUST
  ├── Trust Center (/trust)
  ├── Public Roadmap (/roadmap)
  ├── What's New (/whats-new)
  ├── Support & Help (/support)
  └── Settings (/settings)
```

---

## 4. Command Dashboard & User Entry Points

### 4.1 Unified Product Search Console (`UnifiedSearchEntry.tsx`)
- Central hero input: *"What are you thinking of selling?"* with sample suggestions (*"wooden desk organizer"*, *"personalized wedding gifts"*, *"minimalist ceramic dripper"*).
- Multi-marketplace selector with live capability indicators (Etsy, Amazon, eBay, Walmart).
- Workflow mode switches allowing direct handoffs to Research, Validation, Workspace, or Radar.

### 4.2 Personalized Continuation (`PersonalizedContinuationSection.tsx`)
- Automatically queries and aggregates recent `ResearchRun`, `ProductValidation`, and `SavedOpportunity` records scoped strictly to the merchant's `organizationId`.
- Provides instant resumption cards with exact query, timestamps, empirical verdicts, and 1-click navigation.

### 4.3 First-Time Merchant Launchpad (`FirstTimeMerchantGuide.tsx`)
- Displayed when no previous history exists, introducing the 4 actionable phases with clear descriptions, zero synthetic mock metrics, and direct exploration buttons.

---

## 5. Workflow Continuity & Zero Dead-Ends

Every primary screen includes the **`NextCommercialActionBar`**, providing clear next steps:
- **From Discovery** $\to$ *Research Market Signals* or *Validate Feasibility*.
- **From Research** $\to$ *Validate Product Opportunity* or *Open Product Workspace*.
- **From Validation** $\to$ *Build Sourcing & Economics in Workspace* or *Explore Keyword Intelligence*.
- **From Workspace** $\to$ *Generate AI Listing Draft in Studio* or *Add to Execution Planner*.

---

## 6. Trust, Compliance & Epistemological Transparency

1. **Signal Classification Contract**:
   - `OBSERVED`: Live listing data (Price, Reviews, Rating).
   - `DERIVED`: Deterministic formulas ($P_{50}$ Median Price, Attribute Prevalence %).
   - `ESTIMATED`: Statistical models with confidence ratings (Opportunity Score 3.0).
   - `USER_DERIVED`: User-entered landed costs, quotes, and target CAC.
   - `UNAVAILABLE`: Private data (e.g. competitor store revenues, exact search volumes) remains strictly `null` with transparent explanations (`UnavailableSignalCard`).
2. **Anti-Circumvention Rule**:
   - Automated scraping fallback after API restrictions is strictly halted unless independently policy-permitted.
   - Private seller portals (`sellercentral.amazon.com`, `etsy.com/your/shops`) are strictly blocked.
3. **Data Retention & Privacy**:
   - Periodic research snapshots pruned safely according to policy with dry-run support.
   - PII and buyer contact details are stripped on ingest by `SourceBoundary`.
