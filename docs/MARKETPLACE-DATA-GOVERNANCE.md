# SellerSalt — Marketplace Data Governance Reference

Authoritative technical documentation for the **Marketplace Data Policy Registry, Source Policy Enforcement, Source Boundaries, Retention Governance, and Data Trust System** (Batch 22).

---

## 1. Governance Architecture

```
                    Acquisition Request (Query / URL / Marketplace)
                                          │
                                          ▼
                         ┌────────────────────────────────┐
                         │      SourcePolicyEnforcer      │
                         │  - Allowed Sources Check       │
                         │  - Prohibited Path Intercept   │
                         │  - Domain Allowlist Validation │
                         └────────────────┬───────────────┘
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    │                                           │
             [Allowed: TRUE]                             [Allowed: FALSE]
                    │                                           │
                    ▼                                           ▼
      ┌───────────────────────────┐                ┌──────────────────────────┐
      │  Public Web / API Fetch   │                │ Return POLICY_RESTRICTED │
      └─────────────┬─────────────┘                │  (Zero stealth fallback) │
                    │                              └──────────────────────────┘
                    ▼
      ┌───────────────────────────┐
      │      SourceBoundary       │
      │  - Strips Seller/Buyer PII│
      │  - Attaches Provenance    │
      │  - Enforces Multi-Tenancy │
      └─────────────┬─────────────┘
                    │
                    ▼
      ┌───────────────────────────┐
      │     DataTrustEngine       │
      │  - Diversity, Freshness   │
      │  - Observed vs Unknown    │
      │  - Zero-Fabrication Guard │
      └─────────────┬─────────────┘
                    │
                    ▼
      ┌───────────────────────────┐
      │ RetentionGovernanceService│
      │  - Max Snapshot Retention │
      │  - Periodic Prune Service │
      └───────────────────────────┘
```

---

## 2. Core Modules & Subsystems

| Module | Location | Purpose |
|---|---|---|
| `MarketplaceGovernanceRegistry` | `src/marketplaces/core/governance/registry.ts` | Authoritative policy registry across all 7 registered platforms |
| `SourcePolicyEnforcer` | `src/marketplaces/core/governance/source-policy-enforcer.ts` | Evaluates permission before network requests; blocks prohibited private portals |
| `SourceBoundary` | `src/marketplaces/core/governance/source-boundary.ts` | Sanitizes observations, strips private contact PII, enforces tenant isolation |
| `RetentionGovernanceService` | `src/marketplaces/core/governance/retention-governance-service.ts` | Calculates cutoff dates, tracks expired observations, and executes safe snapshot pruning |
| `DataTrustEngine` | `src/services/intelligence/data-trust-engine.ts` | Evaluates data trust score (0–100), source diversity, freshness, and transparent disclosures |
| `MarketplaceGovernanceMatrix` | `src/components/governance/MarketplaceGovernanceMatrix.tsx` | Operational diagnostic UI for marketplace data policies and compliance status |

---

## 3. Policy Permission Statuses

- `ALLOWED`: Acquisition is actively permitted by policy.
- `CONDITIONALLY_ALLOWED`: Permitted under specific preconditions (e.g. active API credentials or OAuth authorization).
- `RESTRICTED`: Architecture-ready but gated pending developer registration.
- `PROHIBITED`: Explicitly disallowed (e.g. scraping private seller portals or decentralized stores).
- `UNKNOWN` / `REQUIRES_REVIEW`: Permission unconfirmed; conservative rejection applied.
