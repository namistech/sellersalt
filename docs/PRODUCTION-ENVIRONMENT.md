# SellerSalt Production Environment Configuration Reference

**Authoritative Specification: Production Environment Variables, Classification, Secrets Management & Runtime Validation**  
**Version:** 1.0 (Batch 30)  
**Status:** Canonical & Production Verified  

---

## 1. Executive Summary

This document defines the complete set of environment variables required, recommended, or optional for deploying SellerSalt to production. The runtime configuration is strictly validated by `EnvironmentValidator` (`src/lib/config/environment-validator.ts`), guaranteeing that missing critical secrets are caught at boot while preventing secret leakage across error logs and administrative diagnostics.

---

## 2. Environment Variable Directory

### 2.1 Boot Critical (`REQUIRED_FOR_BOOT`)
These variables must be set for the application process to start and handle user sessions.

| Variable | Purpose | Classification | Example Format |
|---|---|---|---|
| `DATABASE_URL` | PostgreSQL connection URI with connection pool parameters (`pgbouncer=true` if using external pooler) | Secret | `postgresql://user:pass@db.example.com:5432/sellersalt?sslmode=require&connection_limit=20` |
| `NEXTAUTH_SECRET` | 32+ byte cryptographic secret for NextAuth JWT session encryption and CSRF signing | Secret | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Canonical public base URL of the deployment | Public | `https://sellersalt.com` |
| `ENCRYPTION_KEY` | 32-byte hexadecimal master key for AES-256-GCM encryption of OAuth tokens and credentials at rest | Secret | `openssl rand -hex 32` (64 hex characters) |

---

### 2.2 Commercial & Billing (`REQUIRED_FOR_BILLING`)
Required for paid checkout, subscription management, and webhook verification.

| Variable | Purpose | Classification | Example Format |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe API Secret Key | Secret | `sk_live_51...` |
| `STRIPE_WEBHOOK_SECRET`| Stripe Webhook Signing Secret | Secret | `whsec_...` |
| `PAYPAL_CLIENT_ID` | PayPal REST API Client ID | Public | `A...` |
| `PAYPAL_CLIENT_SECRET` | PayPal REST API Secret Key | Secret | `E...` |
| `PAYPAL_WEBHOOK_ID` | PayPal Webhook Identifier | Secret | `8...` |

---

### 2.3 Outbound Email & Communication (`REQUIRED_FOR_EMAIL`)
Required for email verification, password reset, billing receipts, and team invites.

| Variable | Purpose | Classification | Example Format |
|---|---|---|---|
| `SMTP_HOST` | Outbound SMTP server hostname | Public | `smtp.postmarkapp.com` / `smtp.resend.com` |
| `SMTP_PORT` | Outbound SMTP server port | Public | `587` |
| `SMTP_USER` | SMTP authentication username | Public | `postmark-api-token` |
| `SMTP_PASS` | SMTP authentication password/key | Secret | `...` |
| `EMAIL_FROM` | Default verified sender address | Public | `SellerSalt <noreply@sellersalt.com>` |

---

### 2.4 Marketplace Integrations (`REQUIRED_FOR_MARKETPLACE_INTEGRATIONS`)
Required for seller-connected OAuth authorization.

| Variable | Purpose | Classification | Example Format |
|---|---|---|---|
| `ETSY_CLIENT_ID` | Etsy OpenAPI v3 Keystring / Client ID | Public | `etsy_client_id_...` |
| `ETSY_CLIENT_SECRET` | Etsy OpenAPI v3 Client Secret | Secret | `etsy_secret_...` |

---

### 2.5 Optional & AI Services (`OPTIONAL`)

| Variable | Purpose | Classification | Default / Fallback |
|---|---|---|---|
| `REDIS_URL` | Redis instance for BullMQ background workers and distributed cache | Secret | `redis://localhost:6379` |
| `ADMIN_EMAILS` | Comma-separated list of superadmin user email addresses | Public | None |
| `OPENAI_API_KEY` | OpenAI API key for AI Listing Studio and SaltBot | Secret | Graceful degradation |
| `ANTHROPIC_API_KEY`| Anthropic Claude API key for secondary LLM provider fallback | Secret | Graceful degradation |

---

## 3. Startup Validation Strategy

The application executes `EnvironmentValidator.validate()` during readiness checks (`GET /api/health/ready`).
- If any `REQUIRED_FOR_BOOT` variable is missing in production, the readiness probe returns HTTP `503 Service Unavailable`.
- Optional variables (e.g., AI keys, secondary billing providers) degrade gracefully with structured warnings.
