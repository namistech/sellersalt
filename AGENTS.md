# AGENTS.md — SellerSalt Agent Guidelines

Welcome to the SellerSalt repository. All AI coding agents, subagents, and contributors operating in this codebase must strictly observe these non-negotiable guidelines.

## Canonical Architecture References
Before proposing or executing code changes, consult the canonical documentation suite in `docs/`:
- **Master Product Spec**: `docs/00-product/SELLERSALT_MASTER_PRODUCT_SPEC.md`
- **Capability Matrix**: `docs/25-roadmap/SELLERSALT_CAPABILITY_MATRIX.md`
- **Etsy API v3 Audit**: `docs/02-etsy/SELLERSALT_ETSY_API_V3_AUDIT.md`
- **Data Architecture**: `docs/23-data-model/SELLERSALT_DATA_ARCHITECTURE.md`
- **Implementation Roadmap**: `docs/25-roadmap/SELLERSALT_IMPLEMENTATION_ROADMAP.md`
- **QA Matrix**: `docs/26-qa/SELLERSALT_FEATURE_QA_MATRIX.md`

## The 12 Non-Negotiable Engineering Rules

1. **Never invent Etsy API capabilities**: Refer strictly to `docs/02-etsy/SELLERSALT_ETSY_API_V3_AUDIT.md`. Never invent or promise keyword volume, search difficulty, trend APIs, or full ads management APIs.
2. **Preserve data provenance**: Explicitly badge all data in UI and services as `[ACTUAL ETSY DATA]`, `[ESTIMATED]`, `[SELLERSALT SCORE]`, or `[EXTERNAL DATA]`. Never present derived metrics as native Etsy metrics.
3. **Never expose cross-tenant data**: Always scope database queries with `where: { organizationId }` on every user-facing route.
4. **Never treat mock data as production data**: Clearly distinguish prototype stubs from real database records.
5. **Every score needs explainable inputs**: Any composite metric (Opportunity Score, SEO Score, Competition Level) must clearly disclose its mathematical formula and point breakdown.
6. **Every AI generation feature needs originality protection**: AI output must never duplicate competitor titles, tags, or copy. Enforce N-gram/Jaccard similarity thresholds (<15% overlap).
7. **Every Etsy write operation requires proper OAuth scope**: Ensure `listings_w`, `shops_w`, `billing_r` scopes are verified before write attempts.
8. **Every third-party external link opens in a new tab**: Always use `target="_blank" rel="noopener noreferrer"` for external Etsy or partner links.
9. **Never silently publish AI-generated Etsy content**: Drafts must be created in `draft` state and require explicit human review/approval before publication.
10. **Do not build around unauthorized Etsy scraping**: Use official SellerSalt backend/API data and legal capabilities only.
11. **Respect API freshness/rate-limit/compliance constraints**: Enforce 8 req/sec queue ceilings and respect caching TTLs (Search: 6h, Shop: 24h, Taxonomy: 7d).
12. **Run typecheck/build/tests after implementation phases**: Execute `npx tsc --noEmit` before committing any code changes.
