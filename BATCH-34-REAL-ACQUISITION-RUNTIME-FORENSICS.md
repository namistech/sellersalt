# Batch 34 — Real Acquisition Runtime Forensics, Search Pipeline Repair & V1 Launch Validation

**Date:** 2026-08-20
**Branch:** `staging`
**Baseline commit:** `f9dfad2`
**Environment tested:** live staging PostgreSQL (`sellersalt_staging` at `94.72.98.206:15432`), real Etsy Open API v3 endpoints, real `etsy.com` public pages — every claim below was produced by an actual bounded network call or an actual database read against this environment, not a mock.

---

## 1. Executive Summary

A real merchant search for a product on SellerSalt currently returns **zero results for Etsy** — the only fully live, customer-facing marketplace. The root cause is **not** a search-pipeline design flaw. The architecture (marketplace registry, source orchestrator, governance layer, normalization, scoring) is real and largely sound. The actual causes are:

1. **Both of Etsy's two acquisition sources are genuinely blocked right now**, for two different, real, external reasons:
   - `PUBLIC_WEB` (unauthenticated HTML fetch of `etsy.com/search`) receives a real Cloudflare/DataDome `403` — this was already known and is **not** something this batch bypassed, per instruction.
   - `MARKETPLACE_API` (the official Etsy Open API v3, `/v3/application/listings/active`) receives a real `403 API key not found or not active, or incorrect shared secret for API key.` from Etsy itself, using the API key currently configured in `/admin` → Site Settings (`etsy_seller_client_id` / `etsy_seller_client_secret`). **This is a genuine, external, human-actionable credential problem** — the configured Etsy developer app key is not currently accepted by Etsy. It is not fixable from application code.

2. **A real code bug compounded this**: `src/connectors/etsy/index.ts`'s `runSearch()` silently discarded that `403` (`catch { continue; }`), so the orchestrator never saw *why* the official API failed — it just saw an empty array, indistinguishable from "Etsy genuinely has zero listings for this query." The end-user-facing message was reduced to a bare, unhelpful `"HTTP error 403"` (from the public-web attempt only) with no mention that the official API credential was rejected at all.

3. **A second, independent, more serious bug was found while tracing the fallback path**: the historical-observation fallback (`orchestrateProductResearch`'s `HISTORICAL_OBSERVATION` step, `src/marketplaces/core/acquisition/orchestrator.ts`) queried the org-scoped `Prospect` table **with no `organizationId` filter at all** — a cross-tenant data leak (any organization's search could return another organization's saved research). Verified and fixed.

4. **A live Zero-Fabrication Contract violation was found and removed**: 40 `Prospect` rows in the staging database were literally titled `"Simulated Product Research 1–5"` / `"Simulated Shop 1–5"` (left over from a prior batch's test run against `test_org_batch28_*` orgs) and were reachable through the real historical-fallback search path as if they were genuine Etsy observations. Deleted, with the user's explicit confirmation.

All four findings are fixed in this batch except (1) — the two blocked Etsy sources are external facts (Cloudflare's bot protection, and Etsy's rejection of the configured credential), not code defects, and per this batch's explicit rules they must **not** be worked around. What *is* fixed is that the failure is now honest, specific, and actionable instead of silent.

**A real merchant search for Etsy today still returns zero items.** What changed is *why the user is told it returned zero* — previously an unhelpful, partially-silent `"HTTP error 403"`; now a specific, actionable `REQUIRES_CREDENTIALS` state naming the real Etsy rejection reason, distinct from a genuine empty search.

---

## 2. Root Cause — The Exact Original Failure

Reproduced directly against the real orchestrator (`orchestrateProductResearch`) and the real Etsy API, for all four required queries (`wooden desk organizer`, `ceramic mug`, `wedding gifts`, `leather wallet`), organization-scoped, before any code change:

```
status:            UNAVAILABLE
sourcesAttempted:  PUBLIC_WEB, MARKETPLACE_API, HISTORICAL_OBSERVATION
sourcesSucceeded:  (none)
sourcesFailed:     PUBLIC_WEB, MARKETPLACE_API, HISTORICAL_OBSERVATION
itemCount:         0
limitations:       ["HTTP error 403"]
message:           No observations available for "wooden desk organizer" on etsy.
```

Note `limitations` contains **only one entry** — `"HTTP error 403"` from the public-web attempt. The official-API attempt genuinely failed with a real, informative Etsy error (`API key not found or not active, or incorrect shared secret for API key.`), but that information never reached the report at all. That is the code bug: `src/connectors/etsy/index.ts`'s `runSearch()` caught the error and `continue`d silently.

## 3. Complete Request-to-Render Trace (as of the original, unfixed code)

```
USER INPUT           "wooden desk organizer"
UI SEARCH             /prospects → LiveSearchTab → searchMarketplaceProductsRequest()
API REQUEST           POST /api/products/search  {keywords, marketplace: "etsy", ...}
ORG CONTEXT            resolved from session (organizationId required, 401 otherwise)
MARKETPLACE RES.       "etsy" (validated against supported list)
QUOTA CHECK            checkQuota(orgId, "PRODUCT_RESEARCH") → allowed
ACCESS RESOLUTION      SourcePolicyEnforcer.evaluateRequest(PUBLIC_WEB) → ALLOWED (policy)
SOURCE: PUBLIC_WEB     etsyPublicWebAdapter.searchPublicProducts()
  OUTBOUND URL          https://www.etsy.com/search?q=wooden+desk+organizer
  HTTP STATUS           403 (Cloudflare/DataDome bot-protection page, not JSON)
  PARSER                not reached — non-200 short-circuits before parsing
  → FAILS, error "HTTP error 403" recorded
SOURCE: MARKETPLACE_API researchConnector.runSearch() → GET /v3/application/listings/active
  OUTBOUND HOST          openapi.etsy.com (official Etsy Open API v3)
  HTTP STATUS            403 — "API key not found or not active, or incorrect
                          shared secret for API key."
  → FAILS, but the error was CAUGHT AND DISCARDED inside runSearch() —
    the orchestrator only ever saw an empty array, not the 403.
SOURCE: HISTORICAL_OBSERVATION  prisma.prospect.findMany() → 0 rows match this query
                          for this organization
NORMALIZATION           n/a — 0 items to normalize
PERSISTENCE             n/a — 0 items to persist
API RESPONSE            { available: false, reason: "CONNECTOR_NOT_CONFIGURED",
                          message: "HTTP error 403" }
FRONTEND STATE           unavailableMessage = "HTTP error 403"
RENDERED RESULT          Alert: "Not available for this marketplace yet — HTTP error 403"
```

The frontend (`src/app/(dashboard)/prospects/live-search-tab.tsx`) already correctly distinguished a structured `CapabilityUnavailable` response from a real empty-results search (`isCapabilityUnavailable()` — this was built correctly in an earlier batch) — it never silently rendered "No results found" for this case. The dishonesty was one layer down: the *content* of that honest-looking message was incomplete, because the real failure reason from the official API was never captured.

## 4. First-Zero Analysis

```
Requested:    10
Upstream:     0    ← FIRST ZERO — both PUBLIC_WEB and MARKETPLACE_API rejected
                       the request itself (403s) before any listing was fetched.
Parsed:       n/a (never reached — nothing to parse)
Normalized:   n/a
Persisted:    n/a
Returned:     0
Rendered:     0 (shown as a capability-unavailable alert, not "no results" —
                  correct UI behavior, incomplete message content)
```

**Root cause layer: ACQUISITION (source authentication/access), not parser, not normalization, not persistence, not the API route, not the frontend.** Two independent, external 403s. The code defect was in how the second one's real cause was captured and surfaced.

---

## 5. Acquisition Architecture Map (as found)

```
API route (/api/products/search, /api/marketplaces/research, /api/keywords/search, ...)
  → src/services/product-hunting.ts (searchMarketplaceProducts)
      → src/marketplaces/core/acquisition/orchestrator.ts (orchestrateProductResearch)
          1. PUBLIC_WEB      → MarketplaceRegistry public-web adapter (per marketplace)
                                gated by SourcePolicyEnforcer (governance/source-policy-enforcer.ts)
          2. MARKETPLACE_API → MarketplaceRegistry official connector (per marketplace)
                                Etsy: src/marketplaces/etsy/connector.ts
                                  → src/connectors/etsy/index.ts (runSearch)
                                    → src/connectors/etsy/client.ts (hardened Etsy v3 HTTP client:
                                       8 req/s queue, Redis-backed cache, retry/backoff)
                                  credentials resolved via
                                  src/lib/get-active-connector.ts: org's own Connector row →
                                  shared platform Connector row → AppSetting
                                  (etsy_seller_client_id/secret) → env vars
          3. Merge (src/marketplaces/core/acquisition/merger.ts)
          4. HISTORICAL_OBSERVATION fallback → prisma.prospect (org-scoped, was NOT — fixed)
          5. Canonical opportunity scoring (src/services/intelligence/canonical-opportunity.ts)
          6. Freshness evaluation
          7. Background persistence (src/marketplaces/core/acquisition/persistence.ts —
             already correctly org-scoped)
          8. Status classification → AcquisitionReport (AVAILABLE/PARTIAL/UNAVAILABLE/NOT_IMPLEMENTED
             + new unavailableReason)
      ← SourceBoundary.sanitizeProducts(items) — output sanitization, unchanged
  ← CapabilityUnavailable | ProductHuntingSearchResponse
```

A **second, independent, source-agnostic acquisition engine** also exists (`src/marketplaces/core/acquisition.ts`'s `acquireProductObservations`/`acquireHistoricalProductObservations`, used by `research-pipeline.ts`) — it already scoped its historical query by `organizationId` correctly. The orchestrator's inline duplicate did not. This is the specific inconsistency that produced the cross-tenant leak (see §9). The two engines were **not** merged in this batch (that is a larger architectural consolidation, flagged as a known duplication in `AGENTS.md`/`docs/SELLERSALT-ROADMAP.md` already, out of scope for "smallest correct repair").

Governance layers actually enforced on every acquisition attempt, verified unchanged: `SourcePolicyEnforcer` (domain/path/source-type policy), `SourceBoundary` (output sanitization), the per-marketplace `MarketplaceGovernanceRegistry` policy set (compliance status, allowed sources, rate limits). `AntiCircumventionGuard` and `DataTrustEngine` were not touched. `MarketplaceAccessResolver` (`access-modes.ts`) was confirmed to exist but is **not wired into the live request path anywhere** (dead code, referenced only by one test) — its own resolution logic was checked and agrees with what `SourcePolicyEnforcer` already independently enforces for every marketplace tested, so this is inert, not a live governance gap. Left as-is; wiring it in is a separate, non-urgent cleanup.

---

## 6. Marketplace Runtime Matrix

Produced by the new `npm run diagnose:acquisition -- "wooden desk organizer"` command (§15), a real run against the live environment:

| Marketplace | Official API | Public Web | Credentials | Real HTTP result | Final status |
|---|---|---|---|---|---|
| **Etsy** | Registered, real Etsy v3 client | Registered, real fetch | Configured (AppSetting) but **rejected by Etsy** | API: `403` "API key not found or not active..."; Web: `403` (Cloudflare/DataDome) | **REQUIRES_CREDENTIALS** |
| **Amazon** | Not implemented (throws `MarketplaceNotImplementedError`, `NO_CAPABILITIES`) | Registered, real fetch | N/A | `200`, but no recognizable listing-card/JSON-LD structure found (real page, unparseable shape) | **PARSER_ERROR** |
| **eBay** | Not implemented | Registered, real fetch | N/A | Non-200 / restricted response | **UPSTREAM_ERROR** |
| **Walmart** | Not implemented | Registered, real fetch | N/A | `200`, unparseable shape (same class as Amazon) | **PARSER_ERROR** |
| **TikTok Shop** | Not implemented | Not implemented (`NO_CAPABILITIES`) | N/A | Not attempted | **NOT_IMPLEMENTED** |
| **Shopify** | Not implemented (account/orders only, no research capability) | Prohibited by policy (decentralized storefronts, no public catalog) | N/A | Not attempted | **NOT_IMPLEMENTED** |
| **WooCommerce** | Not implemented (account/orders only) | Prohibited by policy | N/A | Not attempted | **NOT_IMPLEMENTED** |

All seven marketplaces are selectable today in the real `/prospects` UI (`MarketplaceSelector` includes `etsy, amazon, ebay, walmart, tiktok_shop`; "All Marketplaces" fans out across every registered connector, including Shopify/WooCommerce's `NOT_IMPLEMENTED`). Before this batch, selecting Amazon or Walmart would have shown a generic, unhelpful "no results" with zero explanation (the `NO_DATA`/`ACCESS_RESTRICTED` failure reasons the adapters already computed were being discarded, exactly the same bug class as Etsy's). This is now fixed for all marketplaces at once, since the classification lives in the shared orchestrator, not per-marketplace code (§11).

## 7. Source Runtime Matrix

| Source | Governance status | Attempted for Etsy | Result | Classification |
|---|---|---|---|---|
| `PUBLIC_WEB` | `ALLOWED` by policy (Etsy `complianceStatus: REQUIRES_PLATFORM_CONFIRMATION` — scraping was not re-authorized by this batch, matches the existing 2026-08-19 compliance remediation) | Yes | Real `403` from Cloudflare/DataDome | Contributes to `REQUIRES_CREDENTIALS`/`UPSTREAM_ERROR` classification, never silently dropped |
| `MARKETPLACE_API` | `CONDITIONALLY_ALLOWED` (requires active credentials — has them, but Etsy rejects them) | Yes | Real `403` from Etsy's own API | **`REQUIRES_CREDENTIALS`** |
| `HISTORICAL_OBSERVATION` | Always allowed, org-scoped | Yes | 0 matching rows for these 4 fresh queries on staging (staging DB is deliberately fresh/near-empty per `CLAUDE.md`) | Contributes to `NO_RESULTS` when the *only* thing attempted, or silently absorbed into the primary failure otherwise |
| `CONNECTED_STORE` | N/A for anonymous research | Not applicable to product search | — | — |

## 8. Which Sources Actually Work

**None, for Etsy, right now, in this environment, with this credential.** This is stated plainly per Rule 12 — it would be dishonest to claim otherwise. Both real sources were exercised with real, bounded requests and both were genuinely rejected by the external service, not by SellerSalt's own code.

## 9. Which Sources Fail / Require Credentials / Are Policy Restricted / Architecture-Ready

- **Fails (external, not fixable in code):** Etsy `PUBLIC_WEB` (Cloudflare/DataDome), Etsy `MARKETPLACE_API` (Etsy rejects the configured key), eBay `PUBLIC_WEB` (restricted response).
- **Requires credentials (human action required):** Etsy `MARKETPLACE_API` — the AppSetting-configured API key must be re-verified/reissued in the Etsy Developer Console. This is the single highest-leverage unblock for the whole product.
- **Parser gaps (real page fetched, extraction failed):** Amazon and Walmart `PUBLIC_WEB` — both received real `200` responses whose HTML/JSON-LD shape the existing parsers don't recognize. Not fixed in this batch (scope discipline — these are non-customer-facing-priority marketplaces per `CLAUDE.md`; fixing HTML parsers for sites that may reintroduce bot-blocking on the next request is a larger, separate effort), but now **honestly reported** as `PARSER_ERROR` instead of a silent, misleading "no results."
- **Architecture-ready, zero live capability (unchanged, correctly stubbed):** Amazon, eBay, TikTok Shop official APIs (`NO_CAPABILITIES`, throw `MarketplaceNotImplementedError`); Walmart official API (`NO_CAPABILITIES`).
- **Policy-prohibited by design (unchanged, correct):** Shopify/WooCommerce `PUBLIC_WEB` (`publicWebAllowed: PROHIBITED` — decentralized storefronts, no public catalog to scrape).

---

## 10. Exact Code Changes

| File | Change |
|---|---|
| `src/connectors/etsy/index.ts` | `runSearch()` no longer silently swallows every keyword's search error via `catch { continue; }`. It now collects each keyword's error and, if **every** keyword attempt failed (not just "Etsy returned zero listings"), rethrows the real `EtsyApiError` (with its real `statusCode` and Etsy-provided message) instead of returning an indistinguishable `[]`. |
| `src/marketplaces/core/acquisition/orchestrator.ts` | (a) **Cross-tenant fix**: both `orchestrateProductResearch` and `orchestrateProductDetail`'s `HISTORICAL_OBSERVATION` fallback now filter `prisma.prospect` by `organizationId`, and skip the fallback entirely (rather than run unscoped) when no organization context is present. `orchestrateProductDetail` gained an `organizationId` parameter (previously had none at all — the function is not currently called from any live route, but the same defect class was fixed there too for defense in depth). (b) **New `unavailableReason` classification** (`REQUIRES_CREDENTIALS` / `RATE_LIMITED` / `UPSTREAM_ERROR` / `POLICY_RESTRICTED` / `PARSER_ERROR`) derived from real HTTP status codes and each public-web adapter's own already-computed `failureReason` (previously computed by every adapter and silently discarded by the orchestrator) — never inferred from item count alone, so a genuine zero-match search is never misreported as a failure. (c) Both `PUBLIC_WEB` and `MARKETPLACE_API` failure paths now capture and surface the real underlying error/status instead of only a bare `"HTTP error 403"`. (d) Added safe, structured acquisition telemetry via the existing `StructuredLogger`/`CorrelationManager` (§3's requirement) — no new logging system. |
| `src/marketplaces/core/availability.ts` | `CapabilityUnavailable.reason` extended with the same five new values, so callers get a typed, specific reason instead of only `CONNECTOR_NOT_CONFIGURED`. |
| `src/services/product-hunting.ts` | `searchMarketplaceProducts` now branches on the orchestrator's `unavailableReason`: a real failure returns a specific, actionable `CapabilityUnavailable` message (naming the real cause); a **genuine, clean, zero-match search now falls through to a normal empty-results response** instead of being misclassified as a capability failure — this was the other half of the fix, ensuring `NO_RESULTS` and real failures are never conflated in either direction. |
| `package.json` | Added `diagnose:acquisition` script. |
| `src/scripts/diagnose-acquisition.ts` | **New.** The diagnostic command required by §15. |
| `src/tests/batch-34-real-acquisition.test.ts` | **New.** 7 real integration tests (§18). |

**5 files changed, 151 insertions, 8 deletions** (excluding the new script and test file). No existing architecture was rewritten; no governance layer was weakened; no fallback/fake data was introduced.

## 11. Before / After

**Etsy, all 4 required queries, before this batch's fix:**
```
itemCount: 0
limitations: ["HTTP error 403"]
→ CapabilityUnavailable: reason "CONNECTOR_NOT_CONFIGURED", message "HTTP error 403"
```

**Etsy, all 4 required queries, after this batch's fix (same real credentials, same real Etsy state):**
```
itemCount: 0   ← UNCHANGED. Etsy's credential is still genuinely rejected; this
                 batch did not and cannot fix that from application code.
unavailableReason: "REQUIRES_CREDENTIALS"
limitations: [
  "HTTP error 403",
  "Official API connector error: Etsy API request failed on /listings/active (403):
   API key not found or not active, or incorrect shared secret for API key."
]
→ CapabilityUnavailable: reason "REQUIRES_CREDENTIALS",
  message "Connect Etsy to enable etsy marketplace research, or ask an admin to
  check the configured API credentials in Admin -> Site Settings — the marketplace
  rejected the current key. (HTTP error 403; Official API connector error: ...
  API key not found or not active, or incorrect shared secret for API key.)"
```

**Amazon/Walmart, before:** `itemCount: 0`, no limitations captured, no distinguishable reason.
**Amazon/Walmart, after:** `itemCount: 0`, `unavailableReason: "PARSER_ERROR"`, limitations naming the real, specific failure (`NO_DATA` — page fetched, no recognizable listing structure).

**Cross-tenant leak, before:** org B's search for a term matching org A's saved `Prospect` rows returned 1 item belonging to org A. **After:** 0 items — correctly isolated. Verified with a real, isolated, seeded-and-torn-down pair of test organizations (see §18).

**Fabricated data, before:** 40 `Prospect` rows titled `"Simulated Product Research 1–5"` reachable via the live historical-fallback path. **After:** deleted (user-confirmed). Remaining 40 `Prospect` rows on staging spot-checked and are real-looking Etsy listing titles/URLs, not fabricated.

## 12. Real Search Examples (live `diagnose:acquisition` output, unmodified)

```
$ npm run diagnose:acquisition -- "wooden desk organizer"

ETSY
  Official API capability: REGISTERED
  Public web capability:   REGISTERED
  Credentials:             CONFIGURED
  Sources attempted:  PUBLIC_WEB, MARKETPLACE_API, HISTORICAL_OBSERVATION
  Sources succeeded:  none
  Sources failed:     PUBLIC_WEB, MARKETPLACE_API, HISTORICAL_OBSERVATION
  Upstream -> Final:  0 item(s) in 2158ms
  Limitations:
    - HTTP error 403
    - Official API connector error: Etsy API request failed on /listings/active
      (403): API key not found or not active, or incorrect shared secret for API key.
  Result: REQUIRES_CREDENTIALS

AMAZON
  Official API capability: NOT_IMPLEMENTED
  Public web capability:   REGISTERED
  Credentials:             N/A
  Upstream -> Final:  0 item(s) in 2195ms
  Limitations:
    - Public web response could not be used (NO_DATA).
  Result: PARSER_ERROR

EBAY
  Upstream -> Final:  0 item(s) in 958ms
  Limitations:
    - eBay public search is unavailable.
    - Public web response could not be used (ACCESS_RESTRICTED).
  Result: UPSTREAM_ERROR

WALMART
  Upstream -> Final:  0 item(s) in 4028ms
  Limitations:
    - Public web response could not be used (NO_DATA).
  Result: PARSER_ERROR

TIKTOK_SHOP / SHOPIFY / WOOCOMMERCE
  Result: NOT_IMPLEMENTED (architecture-ready stub — no live capability registered)
```

Identical results (same classification, same real error text) confirmed for `ceramic mug`, `wedding gifts`, and `leather wallet` via direct `orchestrateProductResearch()` calls against the live environment.

---

## 13. `AcquisitionResult` Contract

Rather than introduce a **third**, competing acquisition-result shape (the codebase already has two: `orchestrator.ts`'s `AcquisitionReport`, and `acquisition.ts`'s separately-defined `AcquisitionResult<T>`, used by a different, less-adopted pipeline), this batch **extended the one actually wired into every live search route** — `AcquisitionReport` — with the missing piece: `unavailableReason?: "REQUIRES_CREDENTIALS" | "RATE_LIMITED" | "UPSTREAM_ERROR" | "POLICY_RESTRICTED" | "PARSER_ERROR"`, computed by a single, deterministic, testable function (`classifyUnavailableReason`) from real status codes and adapter-reported failure reasons — never from item count alone. This satisfies §8's intent (stop acquisition failures from silently becoming `[]`) without duplicating governance-adjacent architecture that already exists, per §5's explicit instruction not to create duplicate implementations. Consolidating the two existing engines into one canonical contract is a real, separate cleanup already flagged in `docs/SELLERSALT-ROADMAP.md` — out of scope for this repair.

## 14. User-Facing Failure States (now live)

| State | Example message shown to the user |
|---|---|
| `SUCCESS` | *(unchanged — real results rendered normally)* |
| `NO_RESULTS` | "No marketplace products found. Try adjusting your keyword query..." *(unchanged UI copy — now correctly reached only for genuinely clean, zero-match searches)* |
| `REQUIRES_CREDENTIALS` | "Connect Etsy to enable etsy marketplace research, or ask an admin to check the configured API credentials in Admin → Site Settings — the marketplace rejected the current key. (...)" |
| `RATE_LIMITED` | "etsy rate limit reached. Please try again shortly." |
| `UPSTREAM_ERROR` | "The etsy marketplace source returned an error. Please try again later." |
| `POLICY_RESTRICTED` | "This source cannot be accessed under the current marketplace data policy for etsy." |
| `PARSER_ERROR` | "amazon responded, but SellerSalt could not safely interpret the response." |

No internal stack traces, credentials, or infrastructure details are exposed in any of these — verified by test (§18).

## 15. Integration Test Results

`src/tests/batch-34-real-acquisition.test.ts` — **7/7 passing**, run against the real staging database:

1. A real `403` (simulated at the connector boundary with the real Etsy error text, since intentionally triggering Etsy's live rejection twice would be redundant given §16 below already proves it live) classifies as `REQUIRES_CREDENTIALS`, and the real Etsy rejection text survives into the report.
2. A `429` classifies as `RATE_LIMITED`, not `REQUIRES_CREDENTIALS`.
3. A genuine, cleanly-executed zero-match search reports **no** `unavailableReason` — never misclassified as a failure.
4. The historical fallback returns the owning organization's real, seeded `Prospect` row.
5. The historical fallback does **not** leak organization A's row into organization B's search (the cross-tenant fix, verified against real seeded/torn-down data).
6. The historical fallback does not run at all (not merely "runs unscoped") when no `organizationId` is provided.
7. `src/connectors/etsy/index.ts`'s `runSearch()` throws the real `EtsyApiError` (not a silent `[]`) against a real, live, intentionally-invalid-key request to Etsy's actual API — the one bounded, real-network test in this suite, exercising the exact bug this batch fixed against the real official endpoint.

**Full existing suite: 1,182 / 1,182 passing, 344 suites** (1,175 baseline + 7 new), 0 failures, run against the live staging database.

## 16. Diagnostic Command

`npm run diagnose:acquisition -- "<query>" [--org <organizationId>]` — added at `src/scripts/diagnose-acquisition.ts`. Calls the exact same `orchestrateProductResearch` every real search route calls (no separate/duplicate acquisition path), for every registered marketplace, bounded (limit 5, `persistObservations: false`), never logs credential values, and prints the full per-marketplace/per-source trace shown in §12. Confirmed live-working above.

## 17. Worker / Runtime Findings

The interactive search routes (`/api/products/search`, `/api/marketplaces/research`, `/api/keywords/search`) call `orchestrateProductResearch`/`runProductResearch` **synchronously within the Next.js request handler** — no BullMQ job is enqueued for a live search. **A real merchant's search does not depend on the worker process being up.** The worker (`src/workers/index.ts`, `npm run worker`) is only involved in scheduled/background work (the cron-driven Prospects pipeline via `SearchConfig`, shop-tracking snapshots, email delivery) — separate from the live "Search Marketplace" button traced in this report. This was not a factor in the zero-results defect.

## 18. Security & Governance Regression Check

- `organizationId` isolation: **improved**, not weakened — the one real gap found (§9/§10) is now closed, and covered by a real regression test.
- `SourcePolicyEnforcer` / `SourceBoundary`: unchanged, still gate every acquisition attempt exactly as before.
- `AntiCircumventionGuard`, `DataTrustEngine`, `SignalClassification`: not touched.
- Etsy `PUBLIC_WEB` remains blocked by Cloudflare/DataDome; **no bypass, stealth header, proxy rotation, or fingerprint spoofing was added or considered.**
- Rate limiting (`PQueue`, 8 req/s ceiling in `src/connectors/etsy/client.ts`): unchanged.
- Secret redaction: the new telemetry logging uses the existing `StructuredLogger.redactSensitive` path; credential values are never logged (verified — only presence/absence and status codes are recorded).
- Zero-Fabrication Contract: **strengthened** — 40 fabricated `Prospect` rows removed from the live database; no new fabricated data introduced anywhere in this batch's changes.

## 19. Remaining External Dependencies

- **The Etsy API key configured in `/admin` → Site Settings must be re-verified/reissued in the Etsy Developer Console.** This is the single blocker standing between "architecture is correct and honest" and "a real merchant search returns real Etsy data." Nothing in this codebase can resolve it.
- Once a working Etsy key is in place, verify redirect URIs are still correctly registered per the existing Lesson #5 in `CLAUDE.md` (unrelated to this batch, but adjacent — both are Etsy Developer Console configuration, easy to check in the same session).
- Amazon/eBay/Walmart/TikTok Shop official APIs: need real developer credentials before any capability can go live (external dependency, unchanged from prior batches' findings).
- Amazon/Walmart public-web parsers: real page fetched successfully, but the current HTML/JSON-LD extraction doesn't recognize the response shape — a parser-maintenance task, not attempted in this batch (scope discipline; these marketplaces are not the customer-facing priority).

## 20. Remaining Product Risks

- Until the Etsy credential is fixed, **the core, customer-facing product function does not work for any real user**, regardless of how honest the failure message now is.
- The two acquisition engines (`orchestrator.ts` vs. `acquisition.ts`) remain unconsolidated — a maintenance risk (this batch's cross-tenant bug existed specifically because one engine's fix wasn't mirrored into the other's independent reimplementation of the same logic).
- Amazon/Walmart public-web parsers are unmaintained against the sites' current HTML shape; they will continue to report `PARSER_ERROR` (honestly) rather than real data until someone revisits the parser.

## 21. Roadmap Validation — SEARCH → DISCOVER → RESEARCH → VALIDATE → PLAN → LAUNCH

- **SEARCH**: Traced end-to-end (§3). Currently blocked for Etsy by an external credential rejection — now honestly reported, not silently empty.
- **DISCOVER**: `Prospect`/`ProductObservation` persistence path (`persistence.ts`) is real, correctly org-scoped, and was not modified. It has nothing to persist while acquisition itself is blocked — no fabricated opportunities are generated in its place (confirmed by reading the code; it only ever writes what `orchestrateProductResearch` actually returned).
- **RESEARCH**: Same acquisition layer — blocked for the same external reason, honestly reported.
- **VALIDATE**: Not modified in this batch. `ProductValidation`'s dependency on real observations means it will correctly report `INSUFFICIENT_DATA` while acquisition is blocked, rather than fabricate a validation — verified by reading (not modifying) that pipeline; out of scope to re-verify end-to-end in this pass given the acquisition blocker upstream.
- **PLAN / LAUNCH**: Not modified. Downstream of acquisition; unaffected by this batch's changes.

The roadmap is architecturally intact end-to-end; every stage downstream of acquisition is designed to degrade honestly (as found, not invented in this batch) rather than fabricate — but the whole chain is currently gated on the one external Etsy credential problem in §19.

## 22. Final Launch Classification

**NOT_USABLE** — no legitimate live acquisition path currently produces real product observations for Etsy, the only fully live, customer-facing marketplace, because the configured Etsy API credential is rejected by Etsy itself and the public-web fallback is correctly blocked by Cloudflare/DataDome (and must remain blocked — no bypass is permitted).

This is an **external credential/access problem, not an architecture or code-quality problem.** The acquisition pipeline, governance layer, normalization, scoring, and failure-reporting are now real, tested, and honest. The single blocking action is human: obtain or reactivate a working Etsy Open API v3 credential and confirm it in `/admin` → Site Settings. Once that is done, re-run `npm run diagnose:acquisition -- "wooden desk organizer"` — if it reports `SUCCESS` with a real item count, re-classify against the criteria in the original brief (likely `ACQUISITION_READY_FOR_BETA` or better, pending a full re-run of the four required queries with real results).

Per Rule 12: *"SellerSalt is NOT_USABLE because no legitimate live acquisition path currently produces real product observations."*

---

## Verification Commands Run

```
npx tsc --noEmit                                          → clean, 0 errors
npx prisma validate                                        → schema valid
npx prisma migrate status                                  → up to date, 30 migrations
npx next build                                              → success, 264 routes compiled
                                                               (1 pre-existing, unrelated warning:
                                                               optional bullmq peer dep, not
                                                               touched by this batch)
npx tsx --test src/tests/*.test.ts                          → 1,182 / 1,182 passing, 344 suites
npm run diagnose:acquisition -- "wooden desk organizer"     → real run, output in §12
```
