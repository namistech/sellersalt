# SellerSalt Production Launch Checklist

**Authoritative Specification: Pre-Flight Operational Verification, Infrastructure, Security, Billing & Launch Controls**  
**Version:** 1.0 (Batch 30)  
**Status:** Complete & Ready for Launch Execution  

---

## Pre-Flight Verification Matrix

| Section | Item | Status | Owner / Action / Evidence |
|---|---|---|---|
| **A. Infrastructure** | Node.js 18+ runtime with Next.js 14 production build | `COMPLETE` | Next.js build clean (173/173 routes compiled) |
| **A. Infrastructure** | Load Balancer Health Probe (`/api/health/live`) | `MANUAL_VERIFICATION_REQUIRED` | Point Coolify / ALB health probe to `/api/health/live` |
| **B. Database** | PostgreSQL 15+ instance with connection pooling | `CONFIGURATION_REQUIRED` | Configure `DATABASE_URL` with PgBouncer connection limit |
| **B. Database** | Prisma Schema Valid & Migrations Synchronized | `COMPLETE` | Validated via `prisma validate` |
| **C. Redis / Queues** | BullMQ background workers and distributed caching | `CONFIGURATION_REQUIRED` | Provision production Redis instance via `REDIS_URL` |
| **D. Marketplaces** | Etsy OAuth API Client ID & Secret | `CONFIGURATION_REQUIRED` | Set `ETSY_CLIENT_ID` and `ETSY_CLIENT_SECRET` |
| **D. Marketplaces** | Trademark Disclaimers on Public Pages | `COMPLETE` | Rendered across all footer and FAQ surfaces |
| **E. Billing** | Stripe Production API Keys & Webhook Secret | `CONFIGURATION_REQUIRED` | Configure `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET` |
| **E. Billing** | Webhook Idempotency & Replay Protection | `COMPLETE` | Verified via `PaymentWebhookEvent` & `BillingEventLedger` |
| **F. Email** | Outbound SMTP / AWS SES Credentials | `CONFIGURATION_REQUIRED` | Set `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` |
| **G. Security** | Multi-tenant IDOR isolation across all API routes | `COMPLETE` | Verified via automated test suites |
| **G. Security** | AES-256-GCM Encryption Key | `CONFIGURATION_REQUIRED` | Generate 64-char hex key via `openssl rand -hex 32` |
| **G. Security** | Anti-Circumvention Domain Boundary & SSRF Protection | `COMPLETE` | Enforced via `SourcePolicyEnforcer` & `isAllowedDomain` |
| **H. Observability** | Structured JSON Logging & PII/Secret Redaction | `COMPLETE` | Implemented in `StructuredLogger` |
| **H. Observability** | Correlation & Distributed Trace IDs | `COMPLETE` | Implemented in `CorrelationManager` |
| **I. Backups** | Daily automated PostgreSQL snapshots + PITR | `CONFIGURATION_REQUIRED` | Configure cloud backup policy (e.g. AWS RDS 7-day PITR) |
| **J. Legal / Policy** | Terms of Service, Privacy Policy & Trust Center | `COMPLETE` | Public pages live at `/terms`, `/privacy`, `/trust` |
| **K. Public Website** | Marketing claims aligned with evidence-based intelligence | `COMPLETE` | Verified across `/`, `/pricing`, `/how-it-works` |
| **L. Onboarding** | Interactive 4-step merchant onboarding flow | `COMPLETE` | Live at `/onboarding` |
| **M. Real Data Smoke**| Non-aggressive acquisition smoke test framework | `COMPLETE` | Implemented in `AcquisitionSmokeTestRunner` |
| **N. Incident Response**| Stale research run auto-recovery to `TIMED_OUT` | `COMPLETE` | Implemented in `OperationalDiagnosticsService` |
| **O. Rollback** | Instant rollback deployment procedure | `COMPLETE` | Supported via Git deployment tag rollback |
