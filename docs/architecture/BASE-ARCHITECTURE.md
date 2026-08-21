# SellerSalt Base Architecture & Documentation Plan

Status: planning document. This is the entry point future coding agents should read before starting any batch that touches tenancy, dashboards, research, planner, SEO, analytics, integrations, MCP, or the assistant.

## 0. Non-negotiable constraints (read this first, every time)

1. **No scraping, no unauthorized API use for third-party data.** Marketplace APIs are for the user's own connected shop only. Cross-seller research data comes from: (a) licensed data providers, (b) officially-permitted search/browse APIs (verify per platform before use), (c) extension-based telemetry from consenting users' own browsing sessions, (d) Google Keyword Planner for search-volume data. Never from server-side scraping of marketplace pages.
2. **Zero-Fabrication Contract.** Every metric shown to a user is tagged Observed / Derived / Estimated / User-derived / Unavailable. Estimated values always carry a range, confidence, and basis. Never invent a number a source didn't provide.
3. **Least privilege OAuth, re-scoped only when a shipped feature needs it.** Don't request a scope until the feature using it is actually implemented and shipping.
4. **First-party vs. third-party data are architecturally separate.** A user's own connected-shop data (via their OAuth token) must never be used to enumerate, infer, or track other sellers' shops.
5. **Platform-write actions only where actually authorized.** Etsy/Shopify/WooCommerce: direct API publish/draft is fine (first-party OAuth). Amazon/eBay/Walmart/TikTok Shop/Newegg: no listing-write API access exists for this product — optimization there is extension-assisted (scan + suggest, human applies and saves in their own session).
6. **"AI-powered" claims must be honest.** The core research/scoring/estimation engine is deterministic and statistical, not an LLM, and should be marketed as data-driven/evidence-based. The Platform Assistant and MCP integration are genuinely AI-driven and can honestly carry "AI-powered" language.
7. **Security baseline.** No secrets, DB dumps, or credential files ever committed. Every new integration gets AES-256-GCM-at-rest token storage, no plaintext logging, and a documented scope rationale.

## 1. Tenancy & access model

- **Organization**: the tenant. `type`: `individual | agency | institute | company`.
- **User**: a person. Belongs to one or more Organizations via **Membership**.
- **Membership**: `(user_id, organization_id, role)`. Roles configurable per org type (e.g. `owner`, `admin`, `employee`, `teacher`, `student`, `viewer`).
- **Engagement**: generic connection object. `(grantor_org_id, grantee_org_id OR grantee_user_id, scope[], status, contract_terms, starts_at, ends_at, revoked_at)`. Powers Customer→Agency, Institute→Teacher/Student, and Seller→Influencer relationships — same entity, different configuration.
- **Directory listing** (opt-in): Agencies and Influencers can list themselves publicly with a unique ID; Customers/Sellers search and initiate an Engagement request.
- **Seat**: for Institutes/Agencies on seat-based billing — `(organization_id, seat_type, assigned_user_id nullable)`.

Build Organization + Membership + Engagement + Seat as the first backend milestone, before any dashboard UI is wired to real data. Every dashboard is a view filtered by the current user's Memberships and the Engagements visible to their Organization.

## 2. Feature-to-backend mapping

- **Dashboards**: driven by Membership role + visible Engagements. Agency dashboard aggregates client Organizations' data strictly through active Engagements. Institute dashboard aggregates Teacher/Student seats.
- **Keyword research**: Google Keyword Planner API as primary search-volume source. Store in `KeywordObservation` with a `source` field. Feeds the Planner.
- **Discovery/Product research**: reuse existing `ProductObservation`/filter engine. Render filters dynamically per marketplace based on what that marketplace's data source actually supports.
- **Category research**: reuse `CategoryObservation`/`CategoryObservationSnapshot`, already scaffolded — don't create new models.
- **Planner page**: category/listing creation via existing `PlannerItem`. Publish path: Etsy/Shopify/WooCommerce push draft directly via first-party OAuth (write scopes reinstated when this feature ships); all other platforms via copy-to-clipboard then extension-assisted apply.
- **SEO**: requires connected shop. Etsy/Shopify/WooCommerce get in-app optimize+publish. Amazon/eBay/Walmart/TikTok Shop/Newegg get extension-assisted scan+human-applies-on-marketplace-page — this is the only compliant path there, not a fallback.
- **Analytics**: aggregates connected-shop data only.
- **Integrations**: generic `Integration` model + dispatcher for Zapier/Slack/QuickBooks rather than one-off code per integration.
- **MCP**: scoped MCP server wrapping SellerSalt's internal API, least-privilege per action, OAuth-based user authorization, audit logging on every agent-initiated action.
- **Assistant**: scoped by the same Membership/Engagement model; never sees more than the user it's assisting can see; kept visually distinct from Observed/Derived data so its suggestions are never confused with the deterministic engine's output.

## 3. The "auto-training" algorithm

This is the Estimation Engine (batch-40 doc, Phase H), not a new concept. As `ProductObservation`/`KeywordObservation`/`CategoryObservation` history accumulates: recalibrate thresholds against real observed distributions, on a schedule, versioned (`model_version`, `calibrated_at`). Every output stays inside the Estimated data-state: range, confidence, basis, model version, timestamp. Start with one narrow, bounded model before expanding.

## 4. Documentation structure

```
docs/
  architecture/BASE-ARCHITECTURE.md   <- this file
  architecture/DATA-SOURCING-POLICY.md
  architecture/TENANCY-MODEL.md
  brand/copy-guidelines.md
  legal/terms-of-service-draft.md
  legal/privacy-policy-draft.md
  copy/homepage-copy.md
  features/{dashboards,research-and-discovery,planner,seo,analytics,integrations,mcp,assistant}.md
  security/{oauth-scope-policy,incident-log}.md
  decisions/<ADR-style short files>
```
Keep `CLAUDE.md`/`AGENTS.md` at repo root short, pointing into this tree.
