# SellerSalt Beta Learning Loop & Issue Prioritization Framework

**Authoritative Specification: Closed Beta Feedback Collection, Categorization & Impact Prioritization Engine**  
**Version:** 1.0 (Batch 32)  
**Status:** Canonical & Production Operational  

---

## 1. The 7-Step Beta Learning Cycle

To systematically transform real merchant experiences into measurable product enhancements without noise or scope creep, SellerSalt adheres to the 7-step learning loop:

```
OBSERVE ───► COLLECT ───► CLASSIFY ───► PRIORITIZE ───► FIX ───► VERIFY ───► RELEASE
```

1. **OBSERVE:** Monitor deterministic telemetry events (`SIGNUP_COMPLETED` $\to$ `FIRST_RESEARCH` $\to$ `WORKSPACE_CREATED` $\to$ `SUBSCRIPTION_ACTIVATED`) and Data Trust engine logs.
2. **COLLECT:** Gather structured in-app merchant feedback (`BetaFeedbackService`) and error telemetry (`AppError` taxonomy).
3. **CLASSIFY:** Tag every report into one of 9 canonical problem categories.
4. **PRIORITIZE:** Calculate the Priority Score via the canonical formula:
   $$\text{Priority Score} = \text{User Impact} \times \text{Frequency} \times \text{Commercial Importance}$$
5. **FIX:** Address root cause without creating duplicate scoring systems or violating marketplace governance.
6. **VERIFY:** Validate fix with automated unit/integration tests and zero-fabrication regression guards.
7. **RELEASE:** Deploy to staging and production with synchronized changelogs and documentation.

---

## 2. Issue Taxonomy

Every feedback item, friction point, or error is classified strictly into one of the following categories:

| Code | Category | Description | Example |
|---|---|---|---|
| `BUG` | Functional Regression | Feature does not execute its deterministic specification | 500 error on workspace save |
| `UX_FRICTION` | Usability Blocker | Merchant is confused about next steps or metrics | Missing explanation on opportunity tier |
| `DATA_QUALITY` | Evidence Coverage | Missing public observations or stale snapshots | Niche query returns <5 listings |
| `TRUST` | Provenance / Transparency | Metric explanation is ambiguous | Merchant questions why sales volume is null |
| `ACQUISITION` | Source Connectivity | Public research endpoint rate-limited or shifted | HTML structure change on public tag |
| `PERFORMANCE` | Latency / Timeout | Research or validation takes >10 seconds | Slow multi-marketplace fan-out query |
| `BILLING` | Commercial Lifecycle | Stripe checkout or entitlement sync issue | Quota counter not updating after upgrade |
| `MISSING_CAPABILITY`| Architecture Stubs | Integration capability requested by merchant | Merchant requests eBay write connection |
| `FEATURE_REQUEST` | Out-of-Scope Idea | Suggestions not part of V1 canonical workflow | Automated PPC ad manager |

---

## 3. Prioritization Rule: Reliability & Trust First

> [!IMPORTANT]
> Feature requests (`FEATURE_REQUEST` / `MISSING_CAPABILITY`) must **NEVER** outrank `DATA_QUALITY`, `TRUST`, `BUG`, or `BILLING` issues.
> 
> **Zero-Fabrication Contract Invariant:** If a merchant complains that estimated monthly revenue or sales volume is unavailable, the resolution is **improved transparent education**, never synthetic metric fabrication.
