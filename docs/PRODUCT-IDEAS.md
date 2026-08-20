# SellerSalt Evidence-Grounded Product Idea Engine

Technical reference for the **Product Idea Engine**, translating observed market clusters into viable product concepts.

---

## 1. Core Principle: Evidence Grounding

SellerSalt **never fabricates consumer demand**. Product ideas are derived strictly from observable market signals:
- **Observed Evidence**: Listing sample size, observed price percentiles ($P_{10}, P_{50}, P_{90}$), and high-frequency keyword tokens.
- **Derived Strategy**: Identifies underrepresented keyword modifiers ($< 15\%$ prevalence) and premium packaging gaps.
- **Explicit Disclosures**: Details unobserved signals (e.g. supplier unit manufacturing cost at low MOQ, exact buyer conversion rates) and key competitive risks.

---

## 2. Product Idea Structure

```typescript
interface ProductIdea {
  id: string;
  title: string;
  targetCategory: string;
  targetNiche: string;
  targetMarketplaces: MarketplaceId[];
  ideaScore: number; // 0 - 100
  confidenceScore: number; // 0 - 100
  whyThisIdea: string;
  observedEvidence: {
    dominantKeywords: string[];
    priceRangeObserved: { min: number | null; median: number | null; max: number | null };
    sellerLandscape: string;
    sampleListingCount: number;
  };
  derivedEvidence: {
    attributeGap: string;
    differentiationAngle: string;
    pricingWindow: string;
  };
  unknowns: string[];
  risks: string[];
  nextSteps: string[];
  provenance: SignalProvenance;
  generatedAt: Date;
}
```
