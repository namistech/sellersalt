# SellerSalt Product Validation & Commercial Decision Engine

## 1. Overview & Architecture

The **Product Validation & Commercial Decision Engine** sits above the existing Acquisition, Observation, and Intelligence layers to provide deterministic, evidence-backed commercial decision support for ecommerce merchants.

```
ACQUISITION (Public Web & Secondary APIs)
  ↓
OBSERVATIONS (ProductObservation, Fingerprinting, Snapshots)
  ↓
INTELLIGENCE (Demand, Competition, Economics, Momentum, Categories)
  ↓
OPPORTUNITIES (Multi-Domain Opportunity Discovery 2.0)
  ↓
PRODUCT VALIDATION & COMMERCIAL DECISION ENGINE
  - Verdicts (STRONG_CANDIDATE, WORTH_INVESTIGATING, HIGH_COMPETITION, etc.)
  - Price Positioning (Percentile-based)
  - Differentiation Vectors (Observed Attribute & Price Gaps)
  - User-Supplied Unit Economics (100% USER_DERIVED)
  - Unknown Signal Disclosures & Next Action Recommendations
```

---

## 2. Validation Verdicts

The system evaluates all observable market signals and assigns a deterministic verdict:

| Verdict | Condition | Action Recommendation |
|---|---|---|
| `STRONG_CANDIDATE` | Score $\ge 78$, Confidence $\ge 60\%$, Low/Moderate Competition | Proceed to AI listing drafting, supplier quotes, and unit economics validation |
| `WORTH_INVESTIGATING` | Score $\ge 60$, Moderate signals, viable price economics | Benchmark top competitors and test differentiated price tier |
| `HIGH_COMPETITION` | Seller concentration index $\ge 75$ or high review barrier | Requires strong differentiation or specialized niche angle to penetrate incumbent dominance |
| `WEAK_DEMAND_SIGNAL` | Low review engagement and demand proxy score $< 40$ | Verify if secondary keywords or adjacent categories exhibit stronger review engagement |
| `DECLINING_SIGNAL` | Trajectory cooling or declining across observation windows | Monitor market over next 14 days before committing capital |
| `MIXED_SIGNALS` | Conflicting demand and competition signals | Conduct deeper keyword and supplier cost research |
| `INSUFFICIENT_DATA` | Sample listing count $< 2$ | Broaden search keywords or expand to additional marketplaces |
| `UNAVAILABLE` | Marketplace has zero public data coverage | Marketplace public access currently unavailable |

---

## 3. Price Positioning Engine

Evaluates a candidate product's price against empirical percentile distributions (10th, 25th, Median/50th, 75th, 90th):

- **`OUTSIDE_OBSERVED_RANGE`**: $< P10$ (Value/Quality risk) or $> P90$ (Ultra Premium outlier).
- **`BELOW_MARKET`**: $< P25$ (Budget tier with compressed margins).
- **`LOWER_MID_MARKET`**: $P25$ to Median (Competitive sweet spot for market entry).
- **`MID_MARKET`**: Directly aligned with median ($\pm 5\%$).
- **`UPPER_MID_MARKET`**: Median to $P75$ (Requires bundle or value-add).
- **`PREMIUM`**: $P75$ to $P90$ (Requires superior branding, materials, or features).
- **`INSUFFICIENT_DATA`**: Market median is unavailable.

---

## 4. User Unit Economics vs. Observed Marketplace Data

### The Strict Provenance Boundary:
1. **Observed Marketplace Metrics** (`ACTUAL_DATA`): Prices, verified reviews, active merchant count, percentiles.
2. **User-Supplied Inputs & Calculations** (`USER_DERIVED`): COGS, packaging, shipping, marketplace fee %, advertising spend %, returns allowance.
3. **Calculations**:
   - Gross Profit = $\text{Selling Price} - (\text{Direct Costs} + \text{Marketplace Fees} + \text{Payment Fees})$
   - Contribution Margin = $\text{Selling Price} - \text{Total Variable Costs}$
   - Margin % = $(\text{Contribution Margin} / \text{Selling Price}) \times 100$
   - Break-Even Price = $\text{Direct Costs} / (1 - \text{Total Fee Percentage})$
   - Max Allowable CAC = $\text{Selling Price} - (\text{Direct Costs} + \text{Fees} + \text{Returns})$

---

## 5. Differentiation Analysis

Surfaces empirical catalog attributes without pretending to read consumer minds:
- **Common Attributes**: Keywords/materials present in $\ge 40\%$ of observed listings.
- **Underrepresented Attributes**: Present in $15-25\%$ of listings (differentiation vectors).
- **Price Gaps**: Sparse offering tiers between minimum and median or median and maximum.
- **Keyword Gaps**: Secondary search terms with lower incumbent saturation.

---

## 6. Zero-Fabrication Guarantees

- Exact monthly search query volume is strictly `null` (never fabricated from listing count).
- Unobserved supplier margins, conversion rates, and private merchant revenues are strictly `UNAVAILABLE`.
- Missing signal groups trigger dynamic weight redistribution without injecting fake zero scores.
- Calibrated confidence measures data completeness separately from commercial opportunity.
