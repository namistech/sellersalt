# SellerSalt Browser Extension V1 — Release & Distribution Guide

## 1. Extension Architecture Overview

The **SellerSalt Seller Assistant (Manifest V3)** is packaged as a standalone Chrome extension operating alongside Etsy.

```text
extension/
├── manifest.json              # Manifest V3 configuration (MV3 compliant)
├── background.js              # Background service worker (API relays & session cache)
├── content-script.js          # Web app pairing token listener (sellersalt.com)
├── etsy-content-script.js     # Etsy DOM bridge (page observer & editor extractor)
├── sidepanel.html             # High-contrast multi-mode Assistant UI
├── sidepanel.js               # Sidepanel client state & event handler
├── etsy/
│   ├── page-detector.js       # URL classifier (Listing, Shop, Search, Editor)
│   ├── payload.js             # Snapshot deduplication & data normalization
│   └── selectors.js           # Etsy Shop Manager editor DOM selectors
└── lib/
    ├── api-client.js          # Server-authoritative HTTP API client
    ├── config.js              # Environment base URLs (production, staging, local)
    ├── seo-request.js         # DOM snapshot to SEO audit converter
    └── suggestions.js         # Tag & title suggestion normalizer
```

---

## 2. Minimal Permissions Audit & Rationale

| Permission | Scope / Rationale |
| :--- | :--- |
| `sidePanel` | Displays the SellerSalt Assistant panel directly in the browser sidebar without blocking Etsy page content. |
| `storage` | Stores short-lived pairing tokens in `chrome.storage.session` (memory-only, cleared automatically on browser close). |
| `tabs` | Resolves active tab URL to automatically toggle between Listing Mode, Shop Mode, Search Scanner, and Editor SEO. |
| `host_permissions` | `https://*.etsy.com/*` for contextual DOM inspection; `https://*.sellersalt.com/*` & `http://localhost:3000/*` for API access. |

**Zero Sensitive Secrets**: No API keys, OAuth client secrets, or server database credentials exist in extension source code or DOM scripts.

---

## 3. Environment Configuration & Target Switcher

The extension resolves the SellerSalt API base from `extension/lib/config.js`:
- **Production**: `https://sellersalt.com`
- **Staging**: `https://staging.sellersalt.com`
- **Local Dev**: `http://localhost:3000`

Pairing is origin-verified: The extension verifies pairing codes only against authorized origins in `ALLOWED_ORIGINS`.

---

## 4. Production Packaging & Release Command

To create a clean release bundle for the Chrome Web Store:

```bash
# From the repository root
zip -r sellersalt-extension-v1.0.0.zip extension/ \
  -x "extension/.DS_Store" \
  -x "extension/**/.DS_Store" \
  -x "extension/tests/*"
```

---

## 5. Chrome Web Store Release Checklist

- [x] Manifest Version: `3`
- [x] Extension Version: `1.0.0`
- [x] Background worker defined as `service_worker` in `manifest.json`
- [x] Zero `eval()` or dynamic remote script execution (strict CSP)
- [x] Memory-only session management via `chrome.storage.session`
- [x] Content security policy allows only trusted SellerSalt API endpoints
- [x] Clear data provenance badges (`[ACTUAL ETSY DATA]`, `[ESTIMATED]`, `[SELLERSALT SCORE]`)
- [x] Rule 9 compliance: Prohibits automated live Etsy publishing without user review
- [x] High-contrast responsive sidepanel layout for all screen sizes
