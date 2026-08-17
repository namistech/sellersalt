# SellerSalt Browser Extension V1 — Architecture & Implementation Guide

## 1. Executive Summary

The **SellerSalt Seller Assistant Browser Extension (Manifest V3)** acts as the real-time operational bridge between Etsy and the SellerSalt Seller Intelligence Operating System.

Rather than running isolated heuristics, the extension queries SellerSalt's canonical backend services to provide:
1. **Listing Opportunity Analysis** (`/listing/...`)
2. **Shop Intelligence & Competitor Surveillance** (`/shop/...`)
3. **Search Results Scanner & Breakout Discovery** (`/search?...`)
4. **Etsy Shop Manager Listing Editor SEO Optimizer** (`/listing-editor/...`)
5. **1-Click Save to Opportunity Inbox & Planner**

---

## 2. Manifest V3 Architecture & Security

```text
extension/
├── manifest.json              # MV3 configuration with sidePanel & storage permissions
├── background.js              # Long-running background service worker
├── content-script.js          # Web app pairing token receiver
├── etsy-content-script.js     # Etsy DOM mutation observer & snapshot forwarder
├── sidepanel.html             # Multi-mode Seller Assistant UI
├── sidepanel.js               # Sidepanel controller & message dispatcher
├── etsy/
│   ├── page-detector.js       # Pure URL classification & ID extractor
│   ├── payload.js             # Snapshot deduplication & normalization
│   └── selectors.js           # Etsy Shop Manager editor DOM selectors
└── lib/
    ├── api-client.js          # HTTP API client to SellerSalt backend
    ├── config.js              # Trusted origin whitelist (production/staging/localhost)
    ├── seo-request.js         # Editor snapshot -> SEO audit converter
    └── suggestions.js         # Title & tag suggestion normalization
```

### Security & Multi-Tenant Scoping (Rule 3)
- **Zero Hardcoded Secrets**: Extension source contains no API keys, client secrets, or OAuth credentials.
- **Session Tokens**: Pair exchange returns an opaque 32-byte session token stored exclusively in memory (`chrome.storage.session`), which is automatically cleared on browser close.
- **Server-Authoritative Identity**: The backend resolves `organizationId` and plan tier exclusively from the session token on every request. Client-supplied organization IDs or tier claims are strictly rejected.

---

## 3. Operating Modes & Capabilities

### A. Listing Mode (`etsy.com/listing/...`)
- Automatically detects active listing page.
- Calls `POST /api/extension/analyze-listing` to fetch:
  - Composite Opportunity Score (0–100) `[SELLERSALT SCORE]`
  - Classification (`EMERGING_WINNER`, `HIDDEN_GEM`, `HIGH_DEMAND_CROWDED`, `CONSISTENT_GROWTH`)
  - Daily sales velocity & monthly revenue estimates `[ESTIMATED]`
  - Unit margin % and estimated profit per order
  - 13-tag slots audit
  - Canonical Next Best Action with 4-part explainable reasoning
- **Actions**: "+ Save to Opportunity Inbox & Planner", "Mine Keywords", "Analyze in Studio".

### B. Shop Mode (`etsy.com/shop/...`)
- Automatically detects public shop storefronts.
- Calls `POST /api/extension/analyze-shop` to fetch:
  - Shop Score (0–100) and Catalog Efficiency Index
  - Daily sales velocity & catalog yield (sales per listing)
  - Review moat estimation (days to replicate review authority)
  - Top winning listing highlights
- **Actions**: "Spy on Shop in Surveillance", "Mine Shop Keywords".

### C. Search Results Scanner (`etsy.com/search?...`)
- Analyzes visible search results and computes:
  - Breakout opportunity items (high demand with low competition)
  - Average price distribution
  - High-intent long-tail keyword clusters
- **Freemium Upgrade Gate**: Free Explorer tier receives top 5 results with a non-intrusive upgrade prompt to unlock deeper scan depth.

### D. Listing Editor SEO Mode (`etsy.com/your/shops/me/listing-editor/...`)
- Real-time DOM inspection of active title, 13 tags, and description.
- Evaluates:
  - Title length (max 140 chars) and mobile front-loading (first 40 chars).
  - Exact 13-tag slot compliance and 20-character tag ceilings.
  - Description completeness and structured section guidance.
  - Duplicate tag alerts.

---

## 4. Canonical API Endpoints

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/api/extension/pair/exchange` | `POST` | Exchanges 6-character pairing code for session token |
| `/api/extension/session` | `GET / DELETE` | Resolves authenticated session or revokes pairing |
| `/api/extension/plan-status` | `GET` | Fetches server-authoritative tier & feature limits |
| `/api/extension/analyze-listing` | `POST` | Computes listing opportunity score, demand, economics & NBA |
| `/api/extension/analyze-shop` | `POST` | Computes shop score, catalog yield & winning listings |
| `/api/extension/scan-search` | `POST` | Scans search results for breakout products & keyword clusters |
| `/api/extension/save-opportunity` | `POST` | 1-Click saves/enriches opportunity into Memory and Planner |
| `/api/extension/seo-audit` | `POST` | Executes real SEO diagnostic engine against active editor draft |

---

## 5. Local & Staging Installation Instructions

1. Open Google Chrome and navigate to `chrome://extensions`.
2. Toggle on **Developer mode** in the top right corner.
3. Click **Load unpacked** and select the `/extension` directory in the SellerSalt repository.
4. Open the extension sidepanel by clicking the SellerSalt puzzle icon in the Chrome toolbar.
5. Navigate to `https://staging.sellersalt.com/settings/extension` to generate a 1-click pairing code and connect your workspace.
