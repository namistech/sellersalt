Status: Draft
Owner: [ASSUMPTION] Founder (Aliyan)
Last Updated: 2026-08-15
Decision State: Entirely [DECISION REQUIRED] — nothing built. (MCP —
external AI agents, as distinct from the internal Assistant this
document covers — is a separate, [LOCKED]-as-first-class-capability
surface; see "Relationship to SellerSalt MCP" below and
[architecture/mcp.md](mcp.md).)

# AI Architecture

## Current state

Nothing exists. No AI SDK dependency in `package.json`, no
`src/ai`/`src/lib/ai` module, no conversation-storage model in
`prisma/schema.prisma`. Confirmed by dependency and schema inspection in
this pass. Root `CLAUDE.md` lists "AI assistant" under "What's
explicitly NOT built yet."

See [ai/assistant.md](../ai/assistant.md) for the product-level intent
(tool set, example queries). This document is the implementation-
architecture placeholder.

## Design constraints implied by the rest of the system

Whatever gets built should respect the architecture that already exists
rather than bypass it:

- **Data access**: the assistant's "tools" should call into existing
  query patterns (`Prospect` search, `ShopWatch`/`ShopSnapshot` trend
  data, `competition-scoring.ts`) rather than duplicate that logic. This
  is the main reason the brief frames it as "predefined tools... capable
  of using SellerSalt's own data and intelligence systems" rather than a
  generic chatbot with raw DB access.
- **Multi-tenancy**: every tool call must be scoped to the calling
  user's `organizationId` — the same discipline every existing API route
  already follows (Prisma queries filtered by `organizationId`). An AI
  layer that queries across orgs would be a severe data-isolation bug.
- **Marketplace-neutrality**: per Decision 3 (see
  [architecture/marketplace.md](marketplace.md)), the concrete
  normalized-entity schema is deferred until a second marketplace is
  chosen, so assistant tools built before then will necessarily read
  today's Etsy-shaped `Prospect` fields. The mitigation is a narrow,
  single read seam (see Recommendation below) — not waiting for
  normalization to land first.
- **Background work**: some assistant actions (e.g. "generate a report,"
  "analyze my shop") are plausibly slow enough to want the existing
  BullMQ worker pattern (`src/workers/index.ts`) rather than blocking a
  request — [DECISION REQUIRED] whether assistant actions run
  synchronously in the web process or get queued like `Job`/`ShopWatch`
  work today.

## Open questions [DECISION REQUIRED]

1. **Model/provider choice** — not decided. No vendor SDK installed yet.
2. **Tool surface** — the brief's examples (find winning products,
   analyze my shop, find SEO problems, compare with competitors, find
   opportunities, explain a performance change, find products losing
   momentum, generate a report) imply roughly 6-8 discrete tools. Each
   should be scoped and speced individually before implementation — this
   doc intentionally does not invent tool signatures, since that's
   implementation detail that should follow from actual UX decisions in
   [ai/assistant.md](../ai/assistant.md).
3. **Conversation persistence** — does chat history need to survive a
   page reload / be resumable? If yes, needs a new schema (conversation,
   message, tool-call-log models) — none exist today.
4. **Cost/rate limiting** — no existing pattern in this codebase for
   metering AI usage per org/plan tier. Would likely reuse the
   `checkLimit()` pattern (`src/lib/plan-limits.ts`) with a new
   `LimitResource` if usage caps are wanted per plan.
5. **Where results surface** — inline chat UI, a dedicated `/assistant`
   route, or contextual insertions into existing pages (e.g. an
   "Ask about this shop" affordance on the shop detail page)? Affects
   [design/information-architecture.md](../design/information-architecture.md).

## Relationship to SellerSalt MCP

This document covers the **internal** AI Assistant — an AI experience
*inside* SellerSalt's own UI. It is a distinct surface from **SellerSalt
MCP** — external AI agents (Claude, ChatGPT, a customer's own
automation) calling into SellerSalt from *outside* its UI via the
standardized MCP protocol. Full detail: [architecture/mcp.md](mcp.md).

**[LOCKED — Decision 4, 2026-08-15]** Both surfaces, plus the Web UI,
consume **one shared service/intelligence layer** — neither the
Assistant nor MCP should reimplement business logic independently. The
"single, narrow read seam" recommendation below (written for the
Assistant, before MCP was locked as a requirement) applies identically
to MCP tool implementations — both should call the same underlying
service functions, not two parallel ones. Practically, this means the
tool-registry work described below and MCP's own tool catalog
([architecture/mcp.md](mcp.md#tool-philosophy)) are the same
underlying engineering effort viewed from two callers, not two separate
projects — a "get shop health" capability, once built, should power an
Assistant tool and an MCP tool from the same function.

## Recommendation

> Updated per **[LOCKED — Decision 3, 2026-08-14]**: the marketplace
> normalization *direction* is now locked (see
> [architecture/marketplace.md](marketplace.md)), but the concrete
> normalized-entity schema is deliberately deferred until a second
> marketplace is selected — it is not going to land imminently. This
> changes the recommendation below from "wait for an answer" to "build
> against today's Etsy-shaped data now, with an explicit seam."

Do not block AI implementation on the normalized-entity schema — per
Decision 3, that schema won't exist until a second marketplace is
chosen, which could be a long wait. Instead: if/when assistant tools are
built, route their data access through a single, narrow read layer
(ideally the same seam `competition-scoring.ts` already is for
scoring — see the "Avoid introducing additional Etsy coupling" guidance
in [architecture/marketplace.md](marketplace.md)) rather than querying
`Prospect`'s Etsy-shaped fields from multiple new tool implementations
directly. That keeps the assistant's data-access surface small enough
to re-point at normalized entities later, without requiring the
normalization work to happen first. The tool surface in
[ai/assistant.md](../ai/assistant.md) still needs product-owner
sign-off before implementation starts — that dependency is unchanged.
