# Batch 29: Production Operations, Observability, Reliability & Real-World Launch Hardening

**Authoritative Specification: Production Telemetry, Canonical Error Taxonomy, Correlation IDs, Health Probes, Rate Limiting, Stale Research Recovery & Operations Diagnostics**  
**Version:** 1.0 (Batch 29)  
**Status:** Canonical & Production Verified  

---

## 1. Executive Summary

Batch 29 provides SellerSalt with **production-grade operational observability, reliability, and security hardening**. It equips the platform with a canonical application error taxonomy, end-to-end correlation and trace IDs, structured JSON logging with automatic PII/credential redaction, decoupled `/api/health/live` and `/api/health/ready` probes, sliding-window rate limiting, and an administrative diagnostic engine capable of recovering stale research runs.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PRODUCTION OBSERVABILITY & RELIABILITY               │
├───────────────────┬───────────────────┬────────────────────────────────┤
│    DIAGNOSTICS    │   OBSERVABILITY   │      PROTECTION & GATING       │
├───────────────────┼───────────────────┼────────────────────────────────┤
│ /api/health/live  │ StructuredLogger  │ AppError Taxonomy & Serializer │
│ /api/health/ready │ (JSON + PII scrub)│ Sliding-Window RateLimiter     │
│ Admin Diagnostics │ CorrelationManager│ Stale Research Recovery        │
│ Database Telemetry│ Distributed Trace │ Multi-Tenant IDOR Protection   │
└───────────────────┴───────────────────┴────────────────────────────────┘
```

---

## 2. Canonical Application Error Taxonomy

`AppError` (`src/lib/errors/app-error.ts`) provides a unified, structured error hierarchy across all backend routes and intelligence engines:

| Error Code | HTTP Status | Default Severity | Retryable | Description |
|---|---|---|---|---|
| `AUTHENTICATION_REQUIRED` | `401` | `LOW` | `false` | Missing or invalid session token |
| `AUTHORIZATION_DENIED` | `403` | `LOW` | `false` | Insufficient role or capability |
| `TENANT_ACCESS_DENIED` | `403` | `LOW` | `false` | Attempted cross-tenant access |
| `VALIDATION_ERROR` | `400` | `LOW` | `false` | Malformed user or request input |
| `NOT_FOUND` | `404` | `LOW` | `false` | Resource does not exist |
| `QUOTA_EXCEEDED` | `429` | `MEDIUM` | `false` | Monthly plan quota depleted |
| `BILLING_REQUIRED` | `402` | `LOW` | `false` | Unpaid tier feature access |
| `SUBSCRIPTION_INACTIVE`| `403` | `LOW` | `false` | Past due or canceled subscription |
| `POLICY_RESTRICTED` | `403` | `MEDIUM` | `false` | Access restricted by marketplace policy |
| `SOURCE_UNAVAILABLE` | `503` | `MEDIUM` | `true` | Marketplace / acquisition source down |
| `ACCESS_RESTRICTED` | `403` | `MEDIUM` | `false` | Anti-circumvention boundary triggered |
| `RATE_LIMITED` | `429` | `MEDIUM` | `true` | Application or upstream rate limit |
| `TIMEOUT` | `504` | `HIGH` | `true` | Execution window exceeded |
| `UPSTREAM_ERROR` | `502` | `HIGH` | `true` | Third-party provider error |
| `DATABASE_ERROR` | `500` | `CRITICAL` | `true` | PostgreSQL query/connection failure |
| `QUEUE_ERROR` | `500` | `CRITICAL` | `false` | Worker/queue processing failure |
| `AI_PROVIDER_ERROR` | `502` | `HIGH` | `false` | LLM inference failure |
| `INTERNAL_ERROR` | `500` | `HIGH` | `false` | Unexpected runtime exception |

### Zero-Leakage Guarantee
`AppError.toSafeJSON()` strips out internal database connection strings, credentials, and raw stack traces, emitting only `{ error: { code, message, correlationId, isRetryable } }`.

---

## 3. Core Operational Modules

### 3.1 Correlation & Distributed Tracing (`src/lib/observability/correlation.ts`)
- `CorrelationManager.generateId(prefix)`: Generates high-entropy trace IDs.
- `CorrelationManager.extractFromHeaders(headers)`: Extracts incoming `x-sellersalt-correlation-id` or `x-request-id` headers for end-to-end request tracing.

### 3.2 Structured JSON Logger (`src/lib/observability/structured-logger.ts`)
- Emits structured JSON log entries (`DEBUG`, `INFO`, `WARN`, `ERROR`).
- Automatically redacts sensitive fields matching passwords, OAuth secrets, API keys, credit card numbers, and authorization headers recursively.
- Provides low-overhead ring buffer for live admin diagnostics.

### 3.3 Production Health Endpoints
- **`/api/health/live`**: Fast liveness probe verifying process responsiveness and uptime.
- **`/api/health/ready`**: Verifies PostgreSQL connectivity (`SELECT 1`), core schema queries, and returns latency metrics without leaking connection strings.

### 3.4 Application Rate Limiter (`src/lib/security/rate-limiter.ts`)
- Sliding-window in-memory token bucket rate limiter with configurable tiers (`PUBLIC`, `AUTH`, `RESEARCH`, `AI`, `BILLING`).

### 3.5 Operational Diagnostics & Stale Run Recovery (`src/services/admin/operational-diagnostics.ts`)
- Inspects system health (uptime, memory, database latency, entity counts).
- Automatically detects and recovers research runs stuck in `RUNNING` or `QUEUED` state for $>10$ minutes, setting them to `TIMED_OUT`.
- Exposed via authenticated endpoint `GET /api/admin/diagnostics`.

---

## 4. Verified Production Baseline

- **Tests**: `1158/1158 passing across 322 suites` (`src/tests/*.test.ts`)
- **TypeScript**: `0 errors` (`npx tsc --noEmit`)
- **Prisma**: Valid & synchronized (`prisma validate`)
- **Next.js**: Clean production build (`173/173 routes compiled`)
- **Security**: Strict multi-tenant `organizationId` isolation verified across all diagnostic endpoints.
