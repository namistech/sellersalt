# SellerSalt Seller Operating Pipeline Specification (v1.0)

## 1. The Core Operating Loop

The SellerSalt Seller Operating Pipeline unifies research, strategic decision-making, listing creation, and draft execution into a single unbroken workflow:

```text
DISCOVER (Opportunity Radar / Surveillance Streams / Category Hunting)
   ↓
RESEARCH (Product Dossier / Shop Intelligence / Keyword Extraction)
   ↓
SHORTLIST (Frozen Research Snapshot preserved in Planner)
   ↓
SCORE (Universal Intelligence Opportunity & SEO Engines)
   ↓
SELECT OPPORTUNITY (Unit Economics & Margin Modeling)
   ↓
BUILD KEYWORD CLUSTER (Primary, Secondary & Long-Tail Keyword Harvesting)
   ↓
ADD TO PLANNER (Structured Item with Targets & Snapshot)
   ↓
GENERATE LISTING STRATEGY (Positioning, Buyer Intent, Pricing & Risk Mitigation)
   ↓
GENERATE CONTENT (Optimized Title, 13 Compliant Tags, 10-Part Description, Attributes)
   ↓
CREATE MARKETPLACE DRAFT (Pre-Flight Validation & Scope Verification)
   ↓
HUMAN REVIEW GATE (Explicit Seller Approval — Rule 9)
   ↓
OPEN MARKETPLACE (Etsy Listing Manager in New Tab — Rule 8)
   ↓
PUBLISH (Active Storefront)
```

---

## 2. Frozen Research Snapshot Architecture

When an item is shortlisted or added to the Workspace Planner from any research surface (Opportunity Radar, Category Hunting, Keyword Research, Shop Intelligence), a frozen research snapshot is immutably stored in the `researchSnapshot` JSON field of `PlannerItem`.

### Schema Contract:
```typescript
export interface FrozenResearchSnapshot {
  sourceListingId?: string;
  sourceListingUrl?: string;
  sourceListingTitle?: string;
  sourceShopName?: string;
  category?: string;
  observedPrice?: number;
  estDailySales?: number;
  estMonthlyRevenue?: number;
  totalSales?: number;
  reviewCount?: number;
  opportunityScore?: number;
  competitionScore?: number;
  seoScore?: number;
  targetCountry?: string;
  frozenAt: string; // ISO 8601
  provenance: "ACTUAL_ETSY_DATA" | "ESTIMATED" | "SELLERSALT_SCORE";
}
```

This guarantees historical traceability even if live marketplace listings are updated, closed, or altered later.

---

## 3. Opportunity Research Package & Listing Strategy

Before generating copy, the Opportunity Package synthesizes analytical evidence into a 6-pillar strategic plan:

1. **Positioning Strategy**: Defines what the listing competes on (e.g. premium handcrafted materials, customizable monogramming).
2. **Primary Buyer Intent**: Identifies what shoppers are actually searching for.
3. **Keyword Priority**: Places the primary high-intent phrase strictly in the first 40 title characters.
4. **Pricing Strategy**: Targets the median or premium corridor with verified unit profit margin ($) and percentage (%).
5. **Differentiation Points**: Highlights strengths over incumbent competitor stores.
6. **Competitive Risk Mitigation**: Bypasses dominant review moats via long-tail intent clustering.

### Deterministic Recommendation Verdicts:
- `STRONG_OPPORTUNITY`: Score $\ge 80$ and Net Margin $\ge 50\%$
- `GOOD_OPPORTUNITY`: Score $\ge 65$ and Net Margin $\ge 35\%$
- `MODERATE_OPPORTUNITY`: Score $\ge 50$
- `WEAK_OPPORTUNITY` / `AVOID`: High saturation or margin $< 25\%$

---

## 4. Listing Content Assistant 2.0 & Originality Protection

- **Title Formulation**: Maximum 140 characters; primary keyword strictly locked into first 40 characters for mobile display indexing.
- **13 Policy-Compliant Tags**: Exactly 13 unique tags, each strictly $\le 20$ characters, sanitized of special characters.
- **10-Part High-Converting Description**:
  1. Hook
  2. Product Benefits
  3. Main Features
  4. Detailed Specifications
  5. Materials & Craftsmanship
  6. Use Cases & Gifting
  7. Personalization Instructions
  8. Shipping & Packaging
  9. Care Instructions
  10. FAQs & Objection Handling
- **Originality Engine (Rule 6)**: Token-level Jaccard similarity evaluation against competitor titles, enforcing $< 15\%$ overlap.

---

## 5. Etsy Draft Creation & Human Review Gate

- **Pre-Flight Validation**: Verifies all required marketplace fields before API execution.
- **OAuth Scope Check (Rule 7)**: Requires `listings_w` write permissions on the connected `SellerChannel`.
- **Human Approval Gate (Rule 9)**: Listing drafts are created strictly in `draft` state (`requiresHumanApproval: true`). Drafts are never published live to marketplace customers without explicit seller confirmation.
- **External Links (Rule 8)**: Marketplace listing links open externally in a new tab (`target="_blank" rel="noopener noreferrer"`).

---

## 6. Multi-Marketplace Abstraction

The SellerSalt operating pipeline is designed around a unified connector interface:
- **Etsy**: Active primary marketplace.
- **Amazon, eBay, TikTok Shop, Walmart**: Defined as future coming-soon marketplaces with explicit capability flags.
