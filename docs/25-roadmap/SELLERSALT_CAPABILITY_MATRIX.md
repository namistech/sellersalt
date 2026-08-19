> **SUPERSEDED (2026-08-19).** This is a historical snapshot from an
> earlier development phase (predates the Etsy compliance remediation and
> the marketplace abstraction). Two entries below are now factually
> **wrong** if read as current: "Shop Optimization" and "Etsy Ads
> Intelligence" cite `billing_r`/`shops_w` OAuth scopes as required — both
> were deliberately removed from the app's OAuth request during compliance
> remediation (`billing_r` turned out not to even be a real Etsy v3
> scope), so any feature actually built now must not depend on them. The
> "Browser Extension" row describes DOM read/write functionality that has
> since been deleted entirely for compliance reasons. For current,
> verified status, use `docs/MARKETPLACE-INTEGRATION-MATRIX.md` and
> `AGENTS.md` instead. Retained here as a historical record of the
> pre-marketplace-abstraction feature inventory, not as a current
> reference.

# SellerSalt — Product Capability Matrix

- **Document Version:** 2.0.0
- **Status:** Canonical Factual Inventory & Gap Analysis
- **Authoritative Data Source:** Etsy Open API v3 Capability Audit & Live Codebase Inspection

---

## 1. Status Definitions
- **`COMPLETE`**: Fully implemented in backend, database, API, and frontend with production-grade validation.
- **`PARTIAL`**: Backend or frontend partially exists, but features gaps, missing database relations, or unintegrated flows.
- **`BROKEN`**: Code exists but fails at runtime due to misconfigurations, missing credentials, or API drift.
- **`MOCK`**: Frontend UI exists with hardcoded mock/static data not backed by a real database or API.
- **`MISSING`**: No implementation currently exists in the repository.
- **`FAKE/DUMMY`**: UI simulates activity or displays fabricated metrics without real computation.
- **`UNKNOWN`**: Requires further live verification.

---

## 2. Comprehensive Capability Matrix

| Capability | Current Status | Existing Implementation | Missing Gaps | Etsy Data Available | External Data | SellerSalt Derived | OAuth Required | Write Access | Legal/Compliance Concern | Planned Phase |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Product Hunting** | `COMPLETE` | `src/services/product-hunting.ts`, `/api/products/search`, `ProductResearchDrawer`, `ProductComparisonModal` | None | `searchListings`, `getShop`, `listing_active_count`, price, images | None | 5-Factor Opportunity Score (0-100), `estDailySales`, `avgSellingRatio` | No | No | Respect 8 req/s queue ceiling | **Phase C** (Complete) |
| **Category Hunting** | `COMPLETE` | `src/connectors/etsy/taxonomy.ts`, `/categories`, `CategoryHuntingClient`, `src/services/category-hunting.ts` | None | `getTaxonomyNodes`, `getTaxonomyProperties`, `searchListings` | None | Category saturation index, price percentiles, yield benchmarks | No | No | Cache taxonomy tree locally (7d) | **Phase E** (Complete) |
| **Shop Hunting** | `COMPLETE` | `/shops`, `searchShopsByName`, `Spy on Competitor` flow | Multi-factor shop filters (min revenue, shop age, category) | `getShop`, `transaction_sold_count`, `review_count`, age | None | `reviewVelocity`, `estDailySales`, opportunity verdict | No | No | Respect commercial terms; no mass scraping | **Phase D** |
| **Shop Research** | `COMPLETE` | `/shops/[shopExternalId]`, `ShopDetailClient`, `src/services/shop-intelligence.ts` | None | `getShop`, `getShopListings` (top 50), `getShopReviews` | None | 8-Section profile, Catalog yield, tag frequencies, strategic verdicts | No | No | No caching indefinitely of PII | **Phase D** (Complete) |
| **Keyword Research** | `COMPLETE` | `/keyword-research`, `POST /api/keywords/search`, `src/services/keyword-research.ts` | None | `searchListings` (supply count, top listings), 13 tags extraction | None | 13-Tag harvesting, Title n-grams, Competition rating, Intent | No | No | Do NOT claim favorites count is search volume | **Phase F** (Complete) |
| **Keyword Planning** | `PARTIAL` | `PlannedKeyword` model, `/api/planned-keywords` | Integration with Planner workbenches, tag cluster builder, export to listing draft | None | None | Cluster grouping, intent classification | No | No | Tenant isolation | **Phase F / H** |
| **SEO Research** | `COMPLETE` | `/seo`, `POST /api/seo/audit`, `src/services/seo-engine.ts` | None | Listing title, tags, description, materials, taxonomyId | None | 0-100 SEO Score, 5-dimension rubric, issue catalog | No | No | None | **Phase G** (Complete) |
| **SEO Planning** | `COMPLETE` | `ListingSeoAudit` schema, `POST /api/planner/items` (`SEO_TASK`) | None | None | None | Target keyword coverage score, snapshot provenance | No | No | Tenant isolation | **Phase G / H** (Complete) |
| **SEO Optimization** | `COMPLETE` | `/seo` draft playground, `auditListingSeo`, actionable recommendations | None | None | None | SellerSalt 0-100 SEO Score, factor breakdown | No | No | Explainable score rubric | **Phase G** (Complete) |
| **Product Intelligence** | `COMPLETE` | `computeProductWinningSignals`, Opportunity Radar (`/radar`) | Historical price change tracking, image quality audit | Price, favorites, sold count, reviews | None | Opportunity composite score, breakout signal | No | No | None | **Phase C** |
| **Listing Intelligence** | `PARTIAL` | Top listing modal in shop detail (`getShopTopListings`) | Tag inspection, description formatting analysis, historical velocity | Active listing payload, images, price | None | Velocity proxy, tag extraction | No | No | No arbitrary per-listing sales API | **Phase C** |
| **Shop Intelligence** | `COMPLETE` | `/shops/[shopExternalId]`, `computeWinningShopSignals` | Revenue trend decomposition, customer sentiment analysis | Shop creation date, sales, reviews, active count | None | Opportunity rating, shop health verdict | No | No | None | **Phase D** |
| **Competitor Intelligence** | `COMPLETE` | `ShopWatch`, `ShopSnapshot`, `ListingWatch`, `ListingSnapshot`, `TrackingAlert`, `/spy/tracked` | None | Periodic `getShop` / `getListing` snapshots | None | Daily sales delta, review velocity, breakout spike detection (>300%) | No | No | Automated polling rate limits | **Phase L** (Complete) |
| **Shop Tracking** | `COMPLETE` | `ShopWatch` Prisma model, BullMQ snapshot scheduler, `/api/tracking/shops` | None | `getShop` periodic polling | None | Longitudinal sales curve, growth trajectory, 7d/30d deltas, daily sales velocity | No | No | Limit active tracked shops per package | **Phase L** (Complete) |
| **Listing Tracking** | `COMPLETE` | `ListingWatch`, `ListingSnapshot` schema, `/api/tracking/listings` | None | `getListing` periodic polling | None | Listing favorite delta, price change alerts | No | No | Quota consumption per listing check | **Phase L** (Complete) |
| **Favorites / Shortlists** | `COMPLETE` | `Prospect.isFavorite`, `/favorites` page | Grouping into custom folders/projects, export to Planner | None | None | None | No | No | Tenant isolation | **Phase H** |
| **Planner** | `COMPLETE` | `/planner`, `PlannerClient`, `/api/planner/items`, `/api/planner/items/[id]` | None | None | None | Research snapshot binding, execution status, Kanban | No | No | Tenant isolation | **Phase H** (Complete) |
| **Content Planning** | `MISSING` | None | Content calendar, social post concepts, Pinterest pin generator | None | None | Content schedules, campaign tags | No | No | Originality enforcement | **Phase I** |
| **AI Listing Generation** | `COMPLETE` | `/studio`, `StudioClient`, `generateOriginalListingDraft`, `evaluateListingOriginality`, `/api/studio/generate`, `/api/studio/drafts` | None | None | LLM (OpenRouter/NVIDIA/Gemini/OpenAI) | Prompt engineering, tag formatting, uniqueness scoring, <15% overlap gate | No | No | Zero duplication of competitor text | **Phase I** (Complete) |
| **Social Content Gen** | `MISSING` | None | Instagram caption generator, Pinterest descriptions, TikTok hooks | None | LLM | Social media prompt templates | No | No | None | **Phase I** |
| **Revenue Intelligence** | `COMPLETE` | `/analytics`, `AnalyticsClient`, `calculateProfitWaterfall`, `calculateListingYieldMatrix`, `/api/analytics/revenue`, `/api/analytics/listings` | None | `getShopReceipts` (grand total, currency, status) | None | Revenue by channel, fee breakdown, P&L waterfall, listing yield | Yes (`transactions_r`) | No | Accurate currency isolation | **Phase K** (Complete) |
| **Profit Calculator** | `COMPLETE` | `/analytics` Simulator, `calculateProfitSimulation`, `/api/analytics/calculator`, `/api/analytics/assumptions` | None | Etsy Payment Ledger charges | User COGS | Net profit, true gross margin, contribution margin, break-even | Yes (`billing_r`) | No | Disclose calculation assumptions | **Phase K** (Complete) |
| **Shop Health Audit** | `MISSING` | None | Full diagnostic of missing tags, short titles, inactive listings, review rating | `getShop`, `getShopListings`, `getShopReviews` | None | Overall Shop Health Score (0-100), issue checklist | Yes (`shops_r`, `listings_r`) | No | Actionable recommendations | **Phase L** |
| **Shop Growth Plan** | `MISSING` | None | Step-by-step milestone checklist based on audit deficiencies | None | None | Prioritized growth tasks linked to Planner | No | No | None | **Phase L** |
| **Listing Optimization** | `MISSING` | None | Listing-level audit, before/after score comparison, one-click fix push | `getListing` (title, tags, description, materials) | None | Optimization Score, tag recommendations | Yes (`listings_w`) | Yes | Explicit user confirmation before write | **Phase L** |
| **Shop Optimization** | `MISSING` | None | Shop banner, policy, section, announcement completeness review | `getShop` (sections, announcements, policies) | None | Shop Completeness Score | Yes (`shops_w`) | Yes | User confirmation | **Phase L** |
| **Etsy Draft Creation** | `COMPLETE` | `createEtsyDraftListing`, `validateEtsyListingPayload`, `/api/studio/drafts/[id]/push-etsy`, `/studio` | None | None | None | Payload builder, tag validation, image formatting, rate queue | Yes (`listings_w`) | Yes | Drafts only — never silent publish | **Phase J** (Complete) |
| **Etsy Publishing** | `COMPLETE` | `publishEtsyListing`, `/api/studio/drafts/[id]/publish`, `/studio` Publish Modal | None | None | None | State transition logger, audit trail, explicit confirmation modal | Yes (`listings_w`) | Yes | Mandatory human confirmation | **Phase J** (Complete) |
| **SaltBot Assistant** | `PARTIAL` | `intent-engine.ts`, `MultiProviderLLMService`, `SaltBot.tsx` UI | Tool-calling architecture, Planner/Listing generator tools, context grounding | Active workspace data (Prospects, Shops, Channels) | LLMs | Domain intent classification, response structuring | Optional | No | Grounded domain prompts; no hallucination | **Phase O** |
| **Browser Extension** | `COMPLETE`¹ | `extension/` (MV3), `src/lib/extension-pairing.ts`, `/api/extension/{pair,pair/exchange,session,seo-audit,suggestions}`, `/settings/extension` | Chrome Web Store packaging/icons; "Quick Inspiration Capture" on public listing/shop pages (spec §2.2); live-DOM verification of `extension/etsy/selectors.js` against a real authenticated Etsy Shop Manager session | Listing title/tags/description read from the editor DOM (no new Etsy API calls) | None | Reuses existing `auditListingSeo()` (SEO score/breakdown/diagnostics) and `fetchStandaloneKeywordResearch()` (harvested tag candidates) — no duplicated scoring/keyword logic | No (pairing token, not OAuth) | Yes — explicit user-confirmed Apply only; never auto-saves/publishes | Extension never receives NextAuth/DB/Etsy secrets; org identity always server-resolved from the paired token, never client-supplied; no automated DOM writes outside one explicit user click | **Phase P** (Implementation Complete — see ¹) |

¹ *Verified: MV3 manifest validity, all 4 sub-phase test suites (71 tests) + full repo suite (226/226), `tsc --noEmit`, `next build`, and static code-review of the security/human-control invariants (no auto-publish, additive-only tag apply, server-side org isolation, no secrets in extension code). **Not yet verified**: an actual `chrome://extensions` "Load unpacked" run against a live, authenticated Etsy Shop Manager session — the DOM selector heuristics are unconfirmed against Etsy's real markup. Required before Chrome Web Store submission or customer rollout.*
| **Etsy Ads Intelligence**| `MISSING` | None | Aggregate ad spend reporting from Etsy billing ledger | Etsy Billing Ledger entries | None | Total monthly ad spend deduction from net profit | Yes (`billing_r`) | No | Clarify: NO Etsy Ads API exists for CPC/ROAS | **Phase S** |
| **Etsy Ads Management**  | `MISSING` | None (Impossible via Open API v3) | Clarified as impossible via official Etsy API v3 | None (No Etsy Ads API) | None | None | N/A | N/A | **COMPLIANCE RISK**: Never fake or promise ads API | **Phase S** |
| **Admin Control Plane** | `COMPLETE` | `/admin` (Users, Orgs, Packages, AI Providers, Payments, Settings) | Automated user impersonation/support tools, deep audit log viewer | None | None | Usage metric aggregation | No | No | Restricted to `ADMIN_EMAILS` | **Phase Q** (Polish) |
| **Billing & Plans** | `COMPLETE` | Stripe dynamic checkout, PayPal REST, DB-backed packages, webhook verify | Automated plan downgrade handling, seat overage billing | None | Stripe / PayPal APIs | Plan limit verification (`checkLimit`) | No | No | Secure webhook signature validation | **Phase Q** |
| **Transactional Email** | `COMPLETE` | Nodemailer with SMTP, templates, verification reminders via BullMQ | In-app notification feed, web push alerts | None | SMTP (Titan Mail) | Rate-limited send engine (3/24h) | No | No | DMARC/SPF compliance | **Phase Q** |
| **Authentication & 2FA**| `COMPLETE` | NextAuth JWT, TOTP (client QR), Passkeys (WebAuthn), email verify | Social login (Google / Etsy SSO exists), session revocation | Etsy OAuth profile (for login) | WebAuthn APIs | Encrypted secret storage | Optional | No | Encrypt credentials at rest | **Phase Q** |
| **Passkeys (WebAuthn)** | `COMPLETE` | `@simplewebauthn`, `WebAuthnCredential` model, `/settings/profile` UI | Multi-device sync indicators | None | Browser WebAuthn API | Challenge replay prevention counter | No | No | Spec compliant | **Phase Q** |

---

## 3. Top Architectural & Functional Gaps

1. **The Planner Bridge**: The biggest architectural gap between research and execution. The repository has discovery tools and connected shop tables, but lacked a unified `PlannerItem` entity to hold product concepts, target tags, and drafts.
2. **Independent Keyword Search**: Currently `/api/keyword-research` only queries an organization's existing stored `Prospect` records. It must be decoupled to execute live Etsy keyword queries and external volume lookups.
3. **Etsy Write Engine**: While `ETSY_SELLER` OAuth requests write scopes (`listings_w`), zero service methods exist to push drafts, upload images, or update live listing tags.
4. **AI Generation & Originality**: SaltBot currently acts as a general Q&A bot. It must be equipped with specialized prompt templates for 140-char titles, 13 tags, and structured descriptions, backed by an n-gram originality validator.
5. **SEO & Health Diagnostic Engine**: No rule-based audit engine exists to analyze listing tags, titles, description structure, or shop completeness.
