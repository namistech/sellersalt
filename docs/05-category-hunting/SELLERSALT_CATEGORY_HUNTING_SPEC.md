# SellerSalt — Category Hunting Specification

- **Document Version:** 2.1.0
- **Status:** Canonical Specification (Implementation Status: COMPLETE — 2026-08-16)
- **System Classification:** Category Taxonomy Exploration & Market Saturation Analysis
- **Implementation Modules:** `src/types/category-hunting.ts`, `src/services/category-hunting.ts`, `src/app/api/categories/route.ts`, `src/app/api/categories/[taxonomyId]/route.ts`, `src/app/(dashboard)/categories/page.tsx`, `src/app/(dashboard)/categories/category-hunting-client.tsx`, `src/components/intelligence/TaxonomyTreeBrowser.tsx`

---

## 1. Executive Purpose

**Category Hunting** (`/categories`) enables sellers to discover underserved niches by navigating Etsy's official buyer taxonomy tree (`GET /v3/application/taxonomy/buyer/getNodes`). Instead of searching blindly by keyword, sellers explore structured category branches to analyze supply density, average pricing, and sales velocity across sub-categories.

---

## 2. Taxonomy Hierarchy & Data Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ETSY TAXONOMY EXPLORATION TREE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  LEVEL 1: Root Category (e.g. "Paper & Party Supplies")                     │
│  └── LEVEL 2: Mid-Category (e.g. "Paper -> Stationery")                    │
│      └── LEVEL 3: Deep Leaf Node (e.g. "Stationery -> Planners & Refills")  │
│          ├── Total Active Listings: 84,200 [ACTUAL ETSY DATA]               │
│          ├── Median Price: $18.50 [ACTUAL ETSY DATA]                        │
│          ├── Average Review Saturation: 240 reviews/shop                    │
│          └── Niche Saturation Index: MODERATE (Score: 58/100)               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. UI Features & Workflows

1. **Taxonomy Tree Browser**: Left-hand sidebar displaying hierarchical category categories with listing count indicators.
2. **Category Benchmark Matrix**: Displays price distribution (10th, 50th, 90th percentile) and top performing shops within that specific node.
3. **Sub-Niche Recommendations**: Identifies low-supply leaf nodes that have high average sales velocity.
4. **Export to Planner**: Add category taxonomy IDs directly into `PlannerItem.targetCategory` to ensure new listing drafts use the deepest appropriate node.
