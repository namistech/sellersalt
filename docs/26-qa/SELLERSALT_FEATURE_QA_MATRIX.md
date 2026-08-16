# SellerSalt — Feature QA & Reliability Matrix

- **Document Version:** 2.0.0
- **Status:** Canonical Quality Assurance Matrix
- **Testing Standard:** Zero-Defect Production Quality Standard

---

## 1. Quality Assurance Standards & Testing Rigor

Every feature implemented in SellerSalt must satisfy 11 rigorous state validations before being considered production-ready:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          THE 11 STATE CRITERIA                              │
├──────────────────────────────────────┬──────────────────────────────────────┤
│ 1. Happy Path (Primary Flow)         │ 2. Empty State (Helpful Onboarding)  │
│ 3. Loading State (Skeleton Loaders)  │ 4. Error State (Actionable Alerts)   │
│ 5. Unauthorized State (401/403 Gate) │ 6. API Unavailable (Graceful Fallback│
│ 7. Rate-Limit State (429 Backoff)    │ 8. Stale Data State (Refresh Banner) │
│ 9. Tenant Isolation (Multi-Tenancy)  │ 10. Mobile/Responsive (Fluid Layout) │
├──────────────────────────────────────┴──────────────────────────────────────┤
│ 11. Strict Acceptance Criteria & Regression Verification                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Feature QA Matrix

| Feature / Subsystem | Happy Path Verification | Empty State Experience | Error & Rate-Limit Handling | Tenant Isolation Validation | Mobile & UX Consideration | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Product Hunting (`/radar`)** | Query returns sorted opportunity items with correct scores and evidence bullets. | Displays "No listings match criteria. Adjust filters or trigger new stream." | Shows cached results if Etsy API limits reached with "Showing data from Xh ago". | Query strictly scoped to active `organizationId`. | Table shifts to responsive card stack on `<768px`. | Scores render accurately; "Add to Planner" creates record in `<500ms`. |
| **Shop Research (`/shops/[id]`)** | Resolves valid shop URL, extracts top 50 listings, renders 8 sections. | Shows "Shop not found or newly opened" with manual retry option. | Rate-limiting gracefully delays listing extraction with progress spinner. | Tracked status is strictly scoped per organization. | Charts resize dynamically using responsive containers. | All 8 sections display without visual overlap; external links open in new tab. |
| **Keyword Research (`/keyword-research`)** | Arbitrary keyword returns supply count, tag cloud, and long-tail list. | Shows prompt to enter keyword with recommended starter niches. | 429 rate limit triggers queue backoff and alerts user with countdown. | Keyword planner saves only to active org. | Tag pills wrap cleanly without horizontal scroll overflow. | Word count filters (1, 2, 3, 4+) work instantly on client-side. |
| **Workspace Planner (`/planner`)** | Cards move smoothly across Kanban columns; details edit in slide drawer. | Interactive onboarding card: "Create your first product concept or add from research." | Database network errors trigger undo toast. | All items, notes, and drafts strictly partitioned by `organizationId`. | Kanban columns collapse into selectable tabbed views on mobile. | Status transitions persist to DB; research provenance links intact. |
| **AI Listing Studio (`/studio`)** | SaltBot generates 140-char title, 13 tags (≤20 ch), description, originality score. | Shows prompt builder with pre-filled inputs from selected Planner concept. | If primary LLM provider fails, auto-failover seamlessly tries next provider in priority chain. | Generated copy stored strictly in user's organization draft. | Side-by-side editor stacks vertically on smaller screens. | Title ≤ 140 chars; Exactly 13 tags each ≤ 20 chars; Originality score ≥ 85%. |
| **SEO Diagnostics (`/seo-audit`)** | Listing audit returns 0-100 score with exact point deduction explanations. | Shows input to select a connected listing or paste draft text. | Schema parse errors highlight exact failing tag or title character count. | Audits private to workspace. | Score meter and issue checklist scale cleanly. | Every deducted point has an associated actionable recommendation. |
| **Connected Etsy Shops (`/settings/channels`)** | PKCE OAuth redirects, verifies ownership, and syncs receipts on return. | Informational card with clear benefits and single "Connect Etsy Shop" button. | Detailed error banner explaining specific Etsy OAuth failure (e.g. access denied, invalid state). | Credentials stored encrypted at rest with AES-256-GCM. | OAuth popup/redirect works on mobile Safari/Chrome. | Tokens auto-refresh hourly; receipts sync without PII leakage. |
| **Store Revenue & Profit (`/analytics`)** | Displays Gross Sales, Fees, and Net Profit grouped by native store currency. | Premium locked card explaining connection requirements with 1-click connect button. | Missing ledger data falls back to standard fee formula with `[ESTIMATED]` badge. | Revenue data strictly isolated; zero cross-tenant leakage. | Revenue chart tooltips provide touch-friendly inspection. | Multi-currency stores never blend numbers into one false total. |
| **SaltBot Assistant (`SaltBot.tsx`)** | Natural language queries return domain answers and execute tools. | Pre-configured starter suggestions ("Find top niches", "Draft a listing"). | Out-of-scope queries politely rejected without hallucinating. | Context injection strictly reads active organization records only. | Floating widget docks cleanly without blocking primary buttons. | Responds in `<3s`; never provides fake Etsy Ads or search volume metrics. |
| **Admin Control Plane (`/admin`)** | Admins can manage users, AI models, payment gateways, and view audit logs. | Clean empty state for empty filter results. | Failed connection tests show exact upstream HTTP error message. | Route gated strictly by `isAdminEmail()` server-side. | Admin tables support horizontal scrolling with sticky action columns. | Actions record `AuditLog` events; credentials encrypt properly. |
