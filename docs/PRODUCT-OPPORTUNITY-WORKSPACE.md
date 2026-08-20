# SellerSalt Product Opportunity Workspace & Launch Intelligence

Authoritative technical reference for the **Product Opportunity Workspace, Evidence Ledger, Sourcing Specification, and Launch Intelligence Engine** (Batch 21).

---

## 1. Overview & Architecture

The Product Opportunity Workspace transforms discovered market opportunities into actionable, evidence-grounded launch roadmaps:

```
                      Discovered Opportunity / Query
                                     ↓
                  Multi-Marketplace Public Ingestion
                                     ↓
             Product Attribute Intelligence (Prevalence, P50)
                                     ↓
             Differentiation Builder 2.0 (Saturated vs Gaps)
                                     ↓
             Market Positioning Engine (P10, P25, P50, P75, P90)
                                     ↓
             Product Configuration Builder (Observed vs Derived)
                                     ↓
             Sourcing Specification & RFQ Checklist (No Fake Suppliers)
                                     ↓
             Unit Economics Scenario Simulator (Base / Conservative / Optimistic)
                                     ↓
             Launch Readiness Engine (10 Dimensions)
                                     ↓
             Information Value Engine ("What to verify next?")
                                     ↓
             Commercial Decision Tree (PURSUE / INVESTIGATE / TEST / REJECT)
                                     ↓
             Prioritized 5-Step Action Plan & Evidence Ledger
```

---

## 2. Zero-Fabrication Contract in Sourcing & Economics

SellerSalt enforces strict boundaries between what is **Observed**, what is **User-Supplied**, and what is **Unknown**:
- **Supplier Pricing**: SellerSalt does NOT invent supplier factory costs, MOQs, or shipping fees. Unit economics requires explicit user inputs or marks the analysis `NEEDS_USER_INPUT`.
- **Search Volume & Exact Sales**: Exact private monthly search queries and private store revenue are strictly `null` with provenance `"UNAVAILABLE"`. Listing prevalence and review counts are used as observable proxies.
- **Deltas & Pricing**: Empirical quantile distributions ($P_{10}, P_{25}, P_{50}, P_{75}, P_{90}$) require $\ge 3$ price observations; otherwise `INSUFFICIENT_DATA` is returned.

---

## 3. Subsystem Modules

| Module | Location | Purpose |
|---|---|---|
| `ProductAttributeIntelligenceEngine` | `src/services/intelligence/product-attribute-intelligence.ts` | Observable attribute extraction, prevalence %, and price association |
| `DifferentiationBuilder2Engine` | `src/services/intelligence/differentiation-builder-2.ts` | Saturated patterns, attribute gaps, differentiation candidate generator |
| `MarketPositioningEngine` | `src/services/intelligence/market-positioning-engine.ts` | Empirical quantiles and 5 positioning tiers (Value to Premium) |
| `ProductConfigurationBuilder` | `src/services/intelligence/product-configuration-builder.ts` | Bill of Materials synthesizing observed and derived attributes |
| `SourcingRequirementsEngine` | `src/services/intelligence/sourcing-requirements-engine.ts` | RFQ questions, material lists, packaging, and compliance checklists |
| `UnitEconomicsScenarioEngine` | `src/services/intelligence/unit-economics-scenario-engine.ts` | 3-scenario financial sensitivity calculator (Conservative, Base, Optimistic) |
| `LaunchReadinessEngine` | `src/services/intelligence/launch-readiness-engine.ts` | Multi-dimensional readiness assessment across 10 dimensions |
| `InformationValueEngine` | `src/services/intelligence/information-value-engine.ts` | Uncertainty evaluation ranking "What to verify next" by decision impact |
| `CommercialDecisionTree` | `src/services/intelligence/commercial-decision-tree.ts` | Deterministic verdict with positive/negative evidence, unknowns, risks |
| `ActionPlanGenerator` | `src/services/intelligence/action-plan-generator.ts` | Prioritized 5-step action plan guiding next merchant actions |
| `EvidenceLedgerBuilder` | `src/services/intelligence/evidence-ledger-builder.ts` | Traceable evidence ledger anchoring all recommendations in data |

---

## 4. API Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/product-workspaces` | Create or refresh workspace | Yes (`organizationId`) |
| `GET` | `/api/product-workspaces` | List organization workspaces | Yes (`organizationId`) |
| `GET` | `/api/product-workspaces/[id]` | Fetch workspace details | Yes (`organizationId`) |
| `POST` | `/api/product-workspaces/[id]/refresh` | Refresh with live observations | Yes (`organizationId`) |
| `POST` | `/api/product-workspaces/[id]/economics` | Update user economics & recalculate scenarios | Yes (`organizationId`) |
