# SellerSalt — Browser Extension Specification
**Companion In-Context Assistant for Etsy Sellers**

- **Document Version:** 2.0.0
- **Status:** Canonical Specification
- **Architecture Classification:** Chrome Manifest V3 Companion Extension

## Implementation Status (2026-08-16)

§2.1 (Etsy Listing Editor context) is implemented: real-time SEO scoring
and tag/title suggestion injection, per Phase P1–P4 in
`docs/25-roadmap/SELLERSALT_IMPLEMENTATION_ROADMAP.md`. Code, `extension/`
directory, `POST /api/extension/{pair,pair/exchange,session,seo-audit,
suggestions}`, `src/lib/extension-pairing.ts`. All 71 focused Phase P
tests + the full 226-test repository suite pass, `tsc --noEmit` is clean,
and `next build` succeeds. **Not yet run against a live, authenticated
Etsy Shop Manager session** — the DOM selectors in
`extension/etsy/selectors.js` are best-effort heuristics pending live
verification; do this before Chrome Web Store submission.

§2.2 (public listing/shop page — "Quick Inspiration Capture") is **not
implemented** — out of scope for P1–P4, remains open for a future phase.

§3.1's pairing description (Chrome Identity / OAuth session handoff) was
implemented differently than originally specified here: instead of Chrome
Identity, the extension exchanges a short-lived, single-use pairing code
(minted from an authenticated web session at `/settings/extension`) for
an opaque session token, both hashed at rest in Redis rather than a JWT.
The effect is the same (no server secret ever reaches the extension,
identity is always server-resolved) via a simpler mechanism that needed
no new OAuth client registration. Token storage matches §3.1 exactly:
`chrome.storage.session`, memory-only.

---

## 1. Executive Purpose & Architectural Principles

The **SellerSalt Browser Extension** is an in-context seller companion designed to assist sellers directly while they are working inside **Etsy Shop Manager** (`etsy.com/your/shops/...`). 

### Core Architectural Principles:
1. **Companion, Not Independent Database**: The extension contains no proprietary database; it is a thin client communicating securely with the SellerSalt cloud backend via authenticated REST APIs.
2. **Strictly No Unauthorized Scraping**: The extension does **NOT** conduct mass background scraping, harvest buyer data, or bypass Etsy anti-bot protections. It operates exclusively in the context of the authenticated seller's active browser session to evaluate their own listing drafts and display SellerSalt optimization recommendations.
3. **Official Data Integration**: All market intelligence, competition ratings, and keyword suggestions rendered by the extension originate from SellerSalt's official backend APIs.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BROWSER EXTENSION ARCHITECTURE                           │
│                                                                             │
│  [ Chrome Browser (Etsy Shop Manager) ]                                     │
│  ├── Content Script (Context Detector & UI Overlay)                         │
│  ├── Side Panel (SellerSalt Optimization Workbench)                         │
│  │                                                                          │
│  ▼ (Encrypted HTTPS / JWT Bearer)                                            │
│                                                                             │
│  [ SellerSalt Cloud Backend ]                                               │
│  ├── /api/extension/session (Auth & License Verification)                   │
│  ├── /api/extension/audit-listing (SEO Diagnostic Engine)                   │
│  ├── /api/extension/keyword-suggestions (Keyword Assistance)                │
│  └── /api/planner/items (Planner Sync)                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. In-Context Capabilities & UI Overlay

When active on Etsy, the extension detects the current page context and renders a non-intrusive side panel or drawer:

### 2.1 Context 1: Etsy Listing Editor (`/your/shops/me/listing-editor/...`)
- **Real-Time SEO Scoring**: Evaluates the title, description, and tags currently entered in the Etsy DOM.
- **Tag Helper**: Displays how many tags of the 13 are used and alerts if any tag exceeds 20 characters.
- **1-Click Tag Injection**: Allows inserting keyword clusters from the user's SellerSalt Planner directly into Etsy's tag input field.
- **Title Optimizer**: Suggests high-intent modifier keywords to reach the 120–140 character sweet spot.

### 2.2 Context 2: Public Etsy Listing / Shop Page (`etsy.com/listing/...` or `etsy.com/shop/...`)
- **Quick Inspiration Capture**: Allows saving the public listing or shop concept into the SellerSalt Planner with 1 click (`[ + Send to SellerSalt Planner ]`).
- **Instant Opportunity Snapshot**: Displays the listing/shop's SellerSalt Opportunity Score and review velocity without navigating away.

---

## 3. Authentication, Security & Permissions

### 3.1 Session Linking
- **Pairing Flow**: The user signs into SellerSalt on the web. The extension requests a secure pairing token via Chrome Identity or OAuth session handoff (`POST /api/extension/auth/pair`).
- **Token Storage**: Encrypted JWT stored in `chrome.storage.session` (memory-only, not persisted to unencrypted local storage).

### 3.2 Manifest V3 Permissions
```json
{
  "manifest_version": 3,
  "name": "SellerSalt — Etsy Seller Intelligence",
  "version": "1.0.0",
  "permissions": [
    "storage",
    "sidePanel",
    "activeTab"
  ],
  "host_permissions": [
    "https://*.etsy.com/*",
    "https://sellersalt.com/*",
    "https://staging.sellersalt.com/*"
  ]
}
```

---

## 4. Legal & Compliance Risk Assessment

| Potential Risk | Policy / Mitigation |
| :--- | :--- |
| **Etsy Terms § 2.5 (Automated Access)** | The extension only reads the active page DOM when explicitly invoked by the user clicking the extension or editing a listing. No automated bot crawling. |
| **User Privacy & PII** | Zero buyer PII is accessed or transmitted. The extension strictly inspects product metadata (titles, tags, descriptions, prices). |
| **Chrome Web Store Compliance** | Clear single-purpose description ("Etsy Listing SEO & Keyword Assistant"), detailed privacy policy, minimal required permissions. |
