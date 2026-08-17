# SellerSalt Model Context Protocol (MCP) Architecture Spec

## 1. Overview
The SellerSalt Model Context Protocol (MCP) server provides a standardized, secure interface allowing AI assistants, developer tooling, and automated workflows to interact directly with SellerSalt's intelligence and execution services.

The MCP layer shares the exact same underlying business logic, deterministic scoring formulas, rate limits, and multi-tenant security guarantees as the SellerSalt Web UI.

---

## 2. Architecture & Service Layer Alignment

```
+─────────────────────────────────────────────────────────────────────────+
|                           CLIENT INTERFACES                             |
|    [Web Application]        [SaltBot Agent]        [External MCP AI]    |
+────────────┬───────────────────────┬──────────────────────┬─────────────+
             │                       │                      │
             ▼                       ▼                      ▼
+─────────────────────────────────────────────────────────────────────────+
|                    CENTRALIZED SERVICE & CAPABILITY LAYER               |
|                                                                         |
|  ├── 1. Product Hunting Engine        (/services/product-hunting.ts)    |
|  ├── 2. Shop Intelligence & SEO       (/services/shop-seo-audit.ts)     |
|  ├── 3. Keyword Research Engine       (/services/keyword-engine.ts)     |
|  ├── 4. Listing Studio & AI Generator (/services/studio-generator.ts)  |
|  ├── 5. Surveillance & Tracking       (/services/tracking-engine.ts)    |
|  └── 6. Workspace Planner             (/services/planner-service.ts)    |
+────────────────────────────────────┬────────────────────────────────────+
                                     │
                                     ▼
+─────────────────────────────────────────────────────────────────────────+
|                       DATABASE & MULTI-TENANT ISOLATION                 |
|             PostgreSQL via Prisma ORM (where: { organizationId })       |
+─────────────────────────────────────────────────────────────────────────+
```

---

## 3. Core MCP Tool Catalog

| MCP Tool Name | Description | Required Parameters | Entitlement Tier |
| :--- | :--- | :--- | :--- |
| `sellersalt_audit_listing_seo` | Deterministic 0-100 SEO audit of an Etsy listing or draft | `listingId` or `{ title, tags, description }` | FREE / STARTER / PRO / AGENCY |
| `sellersalt_audit_shop_seo` | Whole-store SEO audit evaluating 13-tags, branding & quality | `shopQuery` (Shop URL, slug, or ID) | STARTER / PRO / AGENCY |
| `sellersalt_search_opportunity_radar` | Searches marketplace opportunities by keyword/niche | `query`, `category?`, `minScore?` | STARTER / PRO / AGENCY |
| `sellersalt_get_shop_intelligence` | Fetches verified sales velocity, catalog size & yield | `shopId` | FREE / STARTER / PRO / AGENCY |
| `sellersalt_add_to_planner` | Saves a product concept or SEO action into Workspace Planner | `title`, `type`, `targetKeywords`, `notes` | FREE / STARTER / PRO / AGENCY |
| `sellersalt_generate_listing_draft` | Generates original (<15% overlap) listing title & 13 tags | `productConcept`, `targetAudience`, `keywords` | PRO / AGENCY |
| `sellersalt_get_tracking_delta_report`| Returns longitudinal before/after sales delta report | `shopId`, `windowDays` (3, 7, 30) | STARTER / PRO / AGENCY |

---

## 4. MCP Security & Token Lifecycle

1. **Authentication**: Uses cryptographic API keys (`sk_live_...`) issued per organization in Settings.
2. **Organization Scoping**: Every MCP tool execution automatically injects `organizationId` from the verified API key into the service layer.
3. **Usage Metering**: Tool executions decrement monthly plan quotas (`prospectsPerMonth`, `searchConfigs`, `trackedShops`) and record audit logs.
4. **Data Provenance Preservation**: All output returned through MCP carries explicit metadata tags:
   - `[ACTUAL ETSY DATA]`
   - `[ESTIMATED]`
   - `[SELLERSALT SCORE]`
   - `[EXTERNAL DATA]`
