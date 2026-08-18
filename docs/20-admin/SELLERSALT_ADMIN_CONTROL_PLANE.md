# SellerSalt — Admin Control Plane & Operations Architecture

- **Document Version:** 3.0.0
- **Status:** Canonical Architecture Specification
- **System Classification:** Platform Operations, Tenant Governance & Integration Architecture

---

## 1. Executive Purpose & Security Boundary

The **Admin Control Plane** (`/admin`) is the mission-critical operations and governance hub for SellerSalt. It manages multi-tenant organizations, commercial plan quotas, marketplace OAuth integrations, Cloudflare R2 media storage, AI provider credentials, and system-wide broadcast communications.

### Security Boundaries & Invariants
- **RBAC Enforcement**: Access is restricted strictly to administrators verified via `ADMIN_EMAILS` allowlists and database role checks.
- **Data Isolation**: Administrative queries have global visibility over platform telemetry, but all tenant-facing operations strictly preserve tenant isolation scoping (`organizationId`).
- **Secret Protection**: All OAuth client secrets, API tokens, S3/R2 keys, and SMTP passwords stored in `AppSetting` or provider tables are masked in the UI with write-only updates.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           CONSOLIDATED 7-GROUP INFORMATION ARCHITECTURE                 │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  [1. Overview]        → Operations Overview Telemetry, Diagnostics & System Health      │
│  [2. Configuration]   → App Settings (Global Flags, Abuse), Branding & SEO (R2 Assets)  │
│  [3. Integrations]    → Integration Hub (18+ Channels), API & Model Providers Directory │
│  [4. Commerce]        → Plans & Quotas, Commercial Multi-Behavior Coupons, Gateways     │
│  [5. Users & Orgs]    → User Directory, Workspaces, Direct User Provisioning            │
│  [6. Communication]   → Announcements & Broadcast Notifications, Transactional Email    │
│  [7. Infrastructure]  → Media & Asset Storage (R2), Abuse Risk Telemetry, Audit Logs    │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Information Architecture & Group Breakdown

### Group 1: Overview
- **Operations Overview**: High-density telemetry cards displaying Total Users (verified/unverified/recent signups), Tenant Workspaces, Estimated MRR, Active Subscriptions, Connected Etsy Stores, and live audit feed.
- **Diagnostics & Health**: Live system pings for PostgreSQL database latency, Redis BullMQ cluster status, S3/R2 storage connectivity, and Etsy Open API rate-limit headroom.

### Group 2: Configuration
- **App Settings**: Global application variables (`app_name`, `app_url`, `support_email`, `currency`, `default_signup_package_key`), registration toggles, and disposable domain abuse rules.
- **Branding & SEO**: Dedicated asset manager for application logos, dark-mode logos, square app icons, browser favicons, chrome extension icons, login artwork focal sliders (X/Y axis positioning with live preview), and JSON-LD schema metadata.

### Group 3: Integrations
- **Integration Hub**: Centralized configuration hub for 18+ integrations:
  - *Marketplaces*: Etsy Open API v3, Shopify Partner API, Amazon SP-API, TikTok Shop Partner, eBay REST API, WooCommerce REST API, Walmart Marketplace API.
  - *Authentication*: Google OAuth & Sign-in (dynamic NextAuth resolution).
  - *Productivity & Automation*: Google Sheets & Drive API, Zapier Developer Webhooks, Make (Integromat), Slack Bot & Incoming Webhooks.
  - *Accounting & CMS*: QuickBooks Online, Xero Accounting, WordPress & WooCommerce Bridge.
  - *AI & MCP*: OpenAI API, Anthropic Claude API, Google Gemini Developer API, Model Context Protocol (MCP) Server.
- **API Providers Directory**: Segmented view classifying providers into Free/Generous Tiers (Gemini 15 RPM, OpenRouter Free), Production AI (GPT-4o, Claude 3.5 Sonnet, NVIDIA NIM), and Infrastructure.

### Group 4: Commerce
- **Plans & Quotas**: Grouped plan matrix managing Commercial Pricing ($/mo), Quota Limits (Saved searches, Scheduled searches, Tracked shops, Monthly prospects, Connected stores), Trial Days, and Feature Entitlements.
- **Commercial Coupons**: Multi-behavior promotion engine supporting:
  - *Type A*: 100% Free Trial ($0 Today at Checkout, recurring normal).
  - *Type B*: Paid Trial ($1 Today at Checkout → First Recurring Month Free).
  - *Type C*: Completely Free / Direct Account Provisioning ($0 Lifetime Checkout Bypass).
  - *Type D*: Percentage Discount (e.g., 20% or 50% Off recurring charge).
  - *Type E*: Fixed Dollar Discount (e.g., $10 Off recurring charge).
  - *Duration Cycles*: Once, Repeating (1–12 months), Forever.
  - *Eligibility*: All Plans, Starter Only, Pro Only, Agency Only, First-Time Customers Only.
- **Payment Gateways**: Stripe, PayPal, SafePay, and PayFast multi-merchant credential storage with separate Live and Sandbox credential isolation.

### Group 5: Users & Organizations
- **User Directory**: Inline action drawer supporting User Inspection, Email Editing, Manual Email Verification, Instant Verification Resends, Direct Password Reset Dispatches, Plan Assignment Dropdowns, Account Suspension, and User Deletion.
- **Workspaces & Organizations**: Multi-tenant workspace listing with member allocation, search configurations, and connected stores.
- **User Provisioning**: Direct admin creation tool for pre-verified customer and enterprise accounts.

### Group 6: Communication
- **Announcements & Notification Center**: Database-backed broadcast system (`Announcement` model) supporting:
  - *Placements*: Top Global Banner, Dashboard Banner, Checkout Banner, Pricing Banner, Notifications Panel, Modal Popup.
  - *Audiences*: All Visitors, Logged-In Sellers, Logged-Out Only, Free Tier Only, Paid Subscribers Only.
  - *Dismissal Tracking*: Individual read-tracking via `AnnouncementRead` model to respect frequency caps and dismissal states.
- **Email / SMTP**: Transactional SMTP server configuration and live HTML template preview tester.

### Group 7: Infrastructure
- **Media & Asset Storage (R2)**: S3-compatible asset store powered by Cloudflare R2 with structured folders (`branding/`, `media/`, `announcements/`, `avatars/`, `channels/`, `listings/`) and zero egress fee delivery.
- **Abuse & Risk Telemetry**: Multi-signal scoring monitoring disposable domain registrations, multi-account generation abuse, and rapid search rate anomalies.
- **Security Audit Logs**: Immutable chronological record of administrator modifications, credential rotations, and security events.

---

## 3. Storage Architecture: Cloudflare R2 & S3 Provider

SellerSalt uses a pluggable storage interface (`StorageProvider`) supporting Cloudflare R2 (production default) and S3-compatible object stores:

```typescript
export interface StorageProvider {
  name: string;
  isConfigured(): boolean;
  upload(
    file: Buffer,
    filename: string,
    mimeType: string,
    options?: UploadOptions
  ): Promise<UploadResult>;
  delete(fileKeyOrUrl: string): Promise<boolean>;
}
```

### Folder Structure
- `branding/` — App logos, dark-mode logos, browser favicons, marketing artwork.
- `media/` — General platform imagery and documentation assets.
- `announcements/` — Broadcast banner images and promotional creatives.
- `avatars/` — User profile pictures and organization logos.
- `listings/` — Cached listing photo mirrors for visual analysis and OCR extraction.

---

## 4. OAuth Callback & Redirect URI Canonical Registry

For all OAuth integrations across staging and production, use the canonical callback matrix below:

| Integration | Production Redirect URI | Staging Redirect URI |
| :--- | :--- | :--- |
| **Google OAuth** | `https://sellersalt.com/api/auth/callback/google` | `https://staging.sellersalt.com/api/auth/callback/google` |
| **Etsy Open API v3** | `https://sellersalt.com/api/auth/callback/etsy` | `https://staging.sellersalt.com/api/auth/callback/etsy` |
| **Shopify Partner** | `https://sellersalt.com/api/integrations/shopify/callback` | `https://staging.sellersalt.com/api/integrations/shopify/callback` |
| **TikTok Shop** | `https://sellersalt.com/api/integrations/tiktok/callback` | `https://staging.sellersalt.com/api/integrations/tiktok/callback` |
| **Amazon SP-API** | `https://sellersalt.com/api/integrations/amazon/callback` | `https://staging.sellersalt.com/api/integrations/amazon/callback` |
| **eBay REST API** | `https://sellersalt.com/api/integrations/ebay/callback` | `https://staging.sellersalt.com/api/integrations/ebay/callback` |
| **QuickBooks** | `https://sellersalt.com/api/integrations/quickbooks/callback` | `https://staging.sellersalt.com/api/integrations/quickbooks/callback` |
| **Xero Accounting** | `https://sellersalt.com/api/integrations/xero/callback` | `https://staging.sellersalt.com/api/integrations/xero/callback` |
| **Slack OAuth** | `https://sellersalt.com/api/integrations/slack/callback` | `https://staging.sellersalt.com/api/integrations/slack/callback` |

> [!IMPORTANT]
> The deprecated domain `anadash.namis.tech` must never be used in any OAuth callback configuration, developer portal setting, or test suite.
