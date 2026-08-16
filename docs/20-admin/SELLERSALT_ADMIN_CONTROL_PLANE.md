# SellerSalt — Admin Control Plane Specification

- **Document Version:** 2.0.0
- **Status:** Canonical Specification
- **System Classification:** Platform Operations & Tenant Management

---

## 1. Executive Purpose & Security Boundary

The **Admin Control Plane** (`/admin`) is the central operations hub for platform administrators. It is strictly secured via the `ADMIN_EMAILS` environment variable allowlist and `isAdminEmail()` checks across all `/api/admin/*` routes.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ADMIN CONTROL PLANE ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  ADMIN DASHBOARD NAVIGATION TABS:                                           │
│  [ Users ]  [ Workspaces ]  [ Packages ]  [ AI Providers ]  [ Payments ]   │
│  [ Email Settings ]  [ Etsy & Connectors ]  [ Branding & System ]           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Operational Control Modules

### 2.1 User Management (`/admin/users`)
- **Account Actions**:
  - Suspend / Unsuspend user account (`User.suspendedAt`).
  - Delete / Purge user account with cascade rules.
  - Manually mark email as verified (`User.emailVerified`).
  - Send / Resend email verification link with rate limit bypass.
  - Change user email address with conflict checking and re-verification.
  - Trigger password reset email.
- **Subscription Management**:
  - Assign / Upgrade / Downgrade package tier manually.
  - Override specific usage limits (e.g. increase tracked shops limit for beta testers).
  - Inspect auth history (`User.authMethods`, `lastLoginAt`).

### 2.2 Workspace / Organization Management (`/admin/organizations`)
- List all tenant organizations with member counts, active streams, and linked connected shops.
- Inspect workspace usage quotas against package limits.
- Suspend / Restore workspace access.

### 2.3 Package & Tier Management (`/admin/packages`)
- Database-backed package configuration (`Package` table):
  - Tier Name, Key, and Display Price (USD).
  - Quotas: `maxConnectors`, `maxSearchConfigs`, `maxScheduledSearches`, `maxTrackedShops`, `maxProspectsPerMonth`, `maxSellerChannels`.
  - Trial Period Settings: `trialDays`, `trialPriceUsd`.
  - Visibility Toggle: `isActive` (Hides inactive tiers from public checkout while grandfathering existing subscribers).

### 2.4 AI Provider & Model Management (`/admin/ai-providers`)
- Configure credentials for OpenRouter, NVIDIA, Google Gemini, and OpenAI.
- Live **"Test Connection"** and **"Refresh Models"** actions querying official model discovery endpoints.
- Select active **Default Model** per provider from real discovered catalogs.
- Configure priority-based fallback order.

### 2.5 Payment Gateway Configuration (`/admin/payments`)
- Platform-level multi-gateway management (Stripe, PayPal, SafePay, PayFast).
- Simultaneous storage of **Sandbox** and **Live** credentials with instant toggle.
- Live test connection pings and webhook verification health checks (`PaymentWebhookEvent` log).

### 2.6 Transactional Email Management (`/admin/email`)
- SMTP configuration (`EmailSettings` model): Host, Port, Secure SSL, Username, Encrypted Password, From Email, From Name.
- Live **"Send Test Email"** button to verify SMTP deliverability.

### 2.7 Etsy & Marketplace Connectors (`/admin/connectors`)
- Global Platform Connector status (Etsy Personal Access Key for market-wide discovery).
- Etsy Seller App configuration (Client ID & Secret for OAuth seller store connection).
- Live API health ping (`/openapi-ping`) and shared daily rate-limit budget tracker.

### 2.8 System Configuration & Audit Logs (`/admin/system`)
- Dynamic App Settings (`AppSetting` table): Site Name, Logo URL, Support Email, Affiliate Links.
- Security Audit Log Viewer (`AuditLog` model): Filterable by event type (`EMAIL_VERIFIED`, `ADMIN_EMAIL_CHANGED`, `PASSWORD_RESET`).
