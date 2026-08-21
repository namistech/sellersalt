> **PARTIALLY SUPERSEDED (2026-08-19)** — the Etsy-page DOM read/write
> bridge this document describes was removed entirely for Etsy compliance
> reasons; see the notice at the top of
> `docs/17-browser-extension/SELLERSALT_EXTENSION_SPEC.md` for details and
> `docs/MARKETPLACE-INTEGRATION-MATRIX.md` for current state.

# SellerSalt Browser Extension (v1) — Technical Architecture & API Contract

**Canonical Reference for Batch 18 Preparation**

- **Status:** Architectural Baseline
- **Manifest:** Chrome Extensions Manifest V3
- **Primary Audience:** Extension Client Developers & API Integrators

---

## 1. Executive Summary & Design Principles

The SellerSalt Browser Extension allows sellers to access real-time market intelligence, listing SEO scoring, and keyword suggestions directly while browsing Etsy product listings, shop pages, and the Etsy Listing Editor (`/your/shops/me/listing-editor/...`).

### Key Rules:
1. **Single Source of Truth**: The extension must NOT implement separate scoring algorithms or duplicate keyword parsing logic. All opportunity scores, SEO evaluations, and plan entitlements are resolved server-side by SellerSalt backend services.
2. **Strict Multi-Tenant Isolation**: The extension authenticates using an opaque bearer session token (`chrome.storage.session`). The server resolves `organizationId` authoritatively from the token record (never from client input).
3. **Plan-Aware Feature Gating**: Quotas and subscription limits apply uniformly to web and extension requests.

---

## 2. Shared API Contract

| Endpoint | Method | Purpose | Auth |
| :--- | :---: | :--- | :---: |
| `/api/extension/session` | `GET` | Validates session token & returns organization identity | Bearer Token |
| `/api/extension/session` | `DELETE` | Revokes extension session (Disconnect) | Bearer Token |
| `/api/extension/plan-status` | `GET` | Returns active plan tier, limits, and feature access | Bearer Token |
| `/api/extension/seo-audit` | `POST` | Audits active DOM title/tags/description against SEO rules | Bearer Token |
| `/api/extension/suggestions` | `POST` | Generates 13-tag clusters and optimized title recommendations | Bearer Token |
| `/api/planner/items` | `POST` | Saves in-context Etsy listing/shop concept into SellerSalt Planner | Bearer Token / Session |

---

## 3. Plan & Capability Handling in Extension UI

When an extension user attempts an operation:
1. The extension requests `/api/extension/plan-status`.
2. If a feature is locked (e.g. `features.canUseAdvancedTracking === false` for a Free user), the extension displays a sleek in-context card:
   ```
   ┌───────────────────────────────────────────────┐
   │ 🔒 Pro Feature                                │
   │ Unlock longitudinal 6h / 24h sales velocity.  │
   │ [ Upgrade on SellerSalt Web → ]               │
   └───────────────────────────────────────────────┘
   ```
3. Clicking the upgrade CTA opens `https://sellersalt.com/pricing` in a new browser tab (`target="_blank"`).

---

## 4. Manifest V3 Configuration

```json
{
  "manifest_version": 3,
  "name": "SellerSalt — Etsy Seller Intelligence",
  "version": "1.0.0",
  "description": "In-context SEO diagnostics, competitor surveillance, and keyword optimization for Etsy sellers.",
  "permissions": [
    "storage",
    "sidePanel",
    "activeTab"
  ],
  "host_permissions": [
    "https://*.etsy.com/*",
    "https://sellersalt.com/*",
    "https://staging.sellersalt.com/*"
  ],
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```
