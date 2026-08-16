# SELLERSALT_SELLER_OPERATING_SYSTEM_V2.md
# Seller Operating System V2 — Architecture Specification

## 1. Executive Summary & Vision

SellerSalt V2 is a unified **Seller Operating System** that continuously connects:

$$\text{Discover} \to \text{Research} \to \text{Evaluate} \to \text{Shortlist} \to \text{Score} \to \text{Keywords} \to \text{Strategy} \to \text{Content} \to \text{Draft} \to \text{Review} \to \text{Publish} \to \text{Monitor} \to \text{Learn} \to \text{Recommend}$$

Rather than functioning as isolated data views, every research discovery is converted into a canonical **SellerSalt Opportunity** that seamlessly progresses toward live Etsy publishing and longitudinal performance monitoring.

---

## 2. The 10-Stage Operating Pipeline

```mermaid
flowchart LR
    A[1. Researched] --> B[2. Shortlisted]
    B --> C[3. Opportunity]
    C --> D[4. Keywords]
    D --> E[5. Strategy]
    E --> F[6. Content]
    F --> G[7. Draft]
    G --> H[8. Review Gate]
    H --> I[9. Published]
    I --> J[10. Monitoring]
```

### Stage Definitions & Transition Rules

1. **Researched**: Raw marketplace listings discovered via Opportunity Radar, Prospects, or Category Hunting.
2. **Shortlisted**: Products flagged by the seller, capturing a frozen immutable `researchSnapshot`.
3. **Opportunity**: Evaluated with composite Opportunity Score (0-100) and net margin economics.
4. **Keywords**: 13-tag compliant keyword cluster harvested and mapped.
5. **Strategy**: 6-pillar strategic listing blueprint synthesized.
6. **Content**: Title ($\le 140$ chars), 13 tags ($\le 20$ chars), 10-part description, and attributes generated.
7. **Draft**: Prepared listing draft created in tenant database (`ListingDraft`).
8. **Review (Rule 9 Gate)**: Human review & validation. Drafts remain in `draft` state and require manual confirmation.
9. **Published**: User confirms publication in Etsy Listing Manager; associated with live `etsyListingId`.
10. **Monitoring**: 6-hour longitudinal snapshots tracking sales velocity, reviews, and search rank stability.

---

## 3. Universal Opportunity Scoring Mathematical Formula

Per Engineering Rule 5, composite scores must clearly disclose their mathematical point breakdown:

$$\text{Opportunity Score} = 0.30 \times \text{Demand} + 0.25 \times \text{Margin} + 0.20 \times \text{Competition} + 0.15 \times \text{Keyword} + 0.10 \times \text{Review Barrier}$$

### Point Breakdown
- **Demand Score (30%)**: Derived from estimated daily sales velocity ($v \ge 5/\text{day} \to 95+$).
- **Margin Score (25%)**: Net margin after COGS and Etsy transaction fees (6.5% transaction + 3% processing + $0.20 flat).
- **Competition Score (20%)**: Page 1 listing density ($<200 \text{ listings} \to 90$).
- **Keyword Score (15%)**: 13-tag cluster availability and character compliance ($\le 20$ chars).
- **Review Barrier Score (10%)**: Incumbent store review concentration ($<100 \text{ reviews} \to 95$).

---

## 4. Post-Publish Listing Intelligence & Drift Detection

Once an opportunity reaches the **Monitoring** stage, the engine evaluates performance against initial projections:

- $\text{Velocity Index} = \frac{\text{Actual Daily Velocity}}{\text{Forecast Velocity}}$
- If $\text{Velocity Index} \ge 1.20$: Status is `OUTPERFORMING` $\to$ Recommendation: Create product variation in Planner.
- If $\text{Velocity Index} < 0.70$ or tags $<13$: Status is `NEEDS_OPTIMIZATION` $\to$ Recommendation: Audit tags and title front-loading in Studio.

---

## 5. Security, Multi-Tenancy & Compliance

1. **Provenance Enforcement (Rule 2)**: All analytical outputs badge data provenance explicitly (`[ACTUAL ETSY DATA]`, `[ESTIMATED]`, `[SELLERSALT SCORE]`).
2. **Tenant Scoping (Rule 3)**: All database queries enforce `where: { organizationId }`.
3. **Anti-Silent Publish Gate (Rule 9)**: Listing generation endpoints strictly create drafts with `requiresHumanApproval: true`. Direct automatic publication to live marketplace channels is impossible.
4. **Originality Guarantee (Rule 6)**: N-gram similarity between competitor listings and generated copy is constrained to $<15\%$.
