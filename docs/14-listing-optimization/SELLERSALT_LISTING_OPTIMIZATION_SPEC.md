# SellerSalt — Listing Optimization Specification

- **Document Version:** 2.0.0
- **Status:** Canonical Specification
- **System Classification:** Single-Listing Diagnostic & Optimization Workflow

---

## 1. Executive Purpose

**Listing Optimization** enables sellers to audit, rewrite, and optimize existing active Etsy listings. It pairs the 0–100 SEO diagnostic score with AI-powered suggestions and direct write-back to Etsy.

---

## 2. Before / After Optimization Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LISTING OPTIMIZATION INTERACTION FLOW                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  STEP 1: SELECT LISTING                                                     │
│  • Select any connected shop listing or paste an external listing ID.       │
│                                                                             │
│  STEP 2: RUN AUDIT (Score: 54/100 - Grade: D)                              │
│  • Issue: Title length is 62 chars (-10 pts)                                │
│  • Issue: Only 9 tags used (-15 pts)                                        │
│  • Issue: 3 tags exceed 20 characters (-10 pts)                             │
│  • Issue: No exact-match keywords between title and tags (-7 pts)           │
│                                                                             │
│  STEP 3: AI SUGGESTION GENERATION                                           │
│  • SaltBot rewrites title into a 136-character high-intent string.          │
│  • SaltBot provides a fresh set of 13 tags (all ≤ 20 characters).           │
│                                                                             │
│  STEP 4: SIDE-BY-SIDE REVIEW & EDIT                                         │
│  • Seller edits or approves changes with real-time score projection (96/100)│
│                                                                             │
│  STEP 5: WRITE-BACK APPROVAL GATE                                           │
│  • [ ⚡ Apply Changes to Etsy Listing ]                                      │
│  • Updates Etsy listing via `PATCH /v3/application/shops/{id}/listings/{id}`│
│  • Logs execution in `EtsyExecutionLog`.                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```
