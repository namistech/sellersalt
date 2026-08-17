# SellerSalt Enterprise Integrations Architecture Spec

## 1. Overview & Vision
SellerSalt is designed to scale from an Etsy seller intelligence tool into a comprehensive, multi-marketplace commerce intelligence and operations operating system for brands, high-volume merchants, and e-commerce agencies.

This specification documents the future integration contracts, authentication lifecycles, webhook architectures, permission models, retry strategies, rate-limiting frameworks, and multi-tenant isolation rules.

---

## 2. Supported Future Integration Categories

```
+-----------------------------------------------------------------------------------------+
|                              SELLERSALT INTEGRATION HUB                                 |
+-----------------------------------------------------------------------------------------+
       │
       ├─► 1. Multi-Marketplace Channels
       │    ├── Etsy (Native Open API v3 OAuth 2.0 with PKCE)
       │    ├── Shopify (Admin REST & GraphQL API / Webhooks)
       │    ├── WooCommerce (REST API v3 / Consumer Secret)
       │    ├── Amazon (Selling Partner SP-API / LWA OAuth)
       │    ├── eBay (Buy/Sell REST API / OAuth 2.0)
       │    ├── TikTok Shop (Open Platform API)
       │    └── Walmart (Marketplace Developer API)
       │
       ├─► 2. Workflow & Automation
       │    ├── Zapier (REST Hooks / Dynamic Triggers)
       │    ├── Make / Integromat (Custom App / Instant Webhooks)
       │    ├── Slack (Incoming Webhooks & Bot Notifications)
       │    ├── Asana / ClickUp / Monday.com (Task Sync & Strategy Pipeline)
       │    └── Google Sheets (Bi-directional Live Sync)
       │
       ├─► 3. Financial & Accounting
       │    ├── QuickBooks Online (Intuit OAuth 2.0)
       │    ├── Xero (Accounting API)
       │    └── Zoho Books
       │
       ├─► 4. CRM & Customer Intelligence
       │    ├── HubSpot (CRM Contacts & Deal Pipelines)
       │    ├── Salesforce (Enterprise Sync)
       │    └── Zoho CRM
       │
       └─► 5. Sourcing & Supply Chain
            ├── Global Barcode Registry (UPC / EAN / GTIN / ASIN Validation)
            ├── Print-on-Demand (Printify, Printful Webhook Sync)
            └── 3PL Fulfillment Integrations (ShipStation, ShipBob)
```

---

## 3. Integration Lifecycle & Security Rules

### Rule 1 — Strict Multi-Tenant Scoping
Every external connection, credential token, and webhook event is scoped strictly to `organizationId`. Cross-tenant credential sharing or webhook leakage is mathematically impossible.

### Rule 2 — Token Storage & At-Rest Encryption
All OAuth access tokens, refresh tokens, shared secrets, and webhook signing secrets must be encrypted using AES-256-GCM via `src/lib/encryption.ts`. Unencrypted secrets must never be stored in databases, logs, or telemetry.

### Rule 3 — Deterministic Webhook Verification & HMAC Signatures
All inbound webhooks must verify incoming cryptographic signatures (`X-Hub-Signature-256`, `X-Shopify-Hmac-Sha256`, etc.) before queuing or dispatching.
All outbound webhooks from SellerSalt must include `X-SellerSalt-Signature` using the organization's dedicated HMAC secret.

### Rule 4 — Idempotency & Replay Protection
All webhook consumers enforce idempotency using unique event IDs (`eventId`) stored in `WebhookDeliveryLog` with 7-day TTL deduplication.

### Rule 5 — Exponential Backoff & Dead Letter Queue (DLQ)
Failed outbound deliveries follow a 5-step exponential backoff schedule (30s, 2m, 10m, 1h, 6h). After 5 failed attempts, events transition to `DEAD_LETTER` state with an admin/user notification.

---

## 4. Integration Specifications by Provider

### Multi-Marketplace Sync Contracts:
* **Shopify**: OAuth 2.0 with offline access tokens. Listens for `products/create`, `products/update`, `orders/paid`. Syncs product catalog into SellerSalt Catalog Intelligence.
* **Amazon SP-API**: Login with Amazon (LWA) token exchange with AWS IAM role delegation. Syncs ASIN catalog, BSR rankings, and estimated fee breakdowns.
* **TikTok Shop**: TikTok Open Platform authorization. Syncs trending creator listings and fast-moving video commerce items.

### Financial & Accounting Sync:
* **QuickBooks / Xero**: Pushes verified net margins, marketplace fee deductions, listing creation fees, and COGS estimates to match bank feeds with penny-precision accounting.

### Workflow & Task Management:
* **Asana / ClickUp / Monday**: When a listing opportunity is finalized in the SellerSalt Planner, it automatically provisions an execution task assigned to copywriters or photographers with full keyword research snapshots attached.
