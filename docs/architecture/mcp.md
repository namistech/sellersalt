Status: Draft
Owner: [ASSUMPTION] Founder (Aliyan)
Last Updated: 2026-08-15
Decision State: MCP support as a first-class platform capability, and
premium-only initial availability, are **[LOCKED]** (Decision 4,
2026-08-15 — see [MASTER_BLUEPRINT.md](../MASTER_BLUEPRINT.md)).
Everything else in this document — the Agent Gateway's internal
composition, the tool catalog and its signatures, the exact
capability/plan matrix, the credential/token model, and the product
surface — is [DECISION REQUIRED]/[ASSUMPTION]/[FUTURE] as marked
throughout. **Nothing in this document is implemented.** No application
code, Prisma schema, migration, dependency, or route was changed to
produce it — this is architecture/documentation only, per this task's
explicit constraint.

# SellerSalt MCP — External AI Agent Architecture

This document is the primary technical reference for MCP (Model Context
Protocol) access to SellerSalt. It extends, and cross-references rather
than duplicates, [architecture/ai.md](ai.md) (the *internal* SellerSalt
AI Assistant), [architecture/rbac.md](rbac.md),
[architecture/billing.md](billing.md),
[architecture/organizations.md](organizations.md), and
[security/security-model.md](../security/security-model.md).

## What this is

MCP is the mechanism by which **external AI agents** (Claude, ChatGPT,
a customer's own internal automation, a future third-party agent) can
call into SellerSalt's own commerce intelligence on a user's behalf,
through a standardized tool-calling protocol, rather than through the
SellerSalt web UI. This is distinct from — but architecturally a sibling
of — the SellerSalt AI Assistant (an AI experience *inside* SellerSalt,
see [architecture/ai.md](ai.md) and [ai/assistant.md](../ai/assistant.md)).
See [Distinguishing the three AI/agent surfaces](#distinguishing-the-three-aiagent-surfaces)
below.

## Current state

**Nothing exists.** Verified against the repository in this pass: no
MCP SDK dependency in `package.json`, no `src/mcp`/`src/lib/mcp` module,
no agent-credential model in `prisma/schema.prisma` (no `ApiKey`,
`AgentToken`, `McpConnection`, or equivalent — confirmed by a full model
inventory of the schema). This document is the architecture/product
placeholder for work that has not started, in the same spirit as
[architecture/ai.md](ai.md) was for the (also unbuilt) AI Assistant.

## Why MCP, and why now

The product owner has locked (Decision 4, below) that SellerSalt must
support external AI agents through MCP as a first-class capability
before any major new product surface (Agency/Institute screens, the AI
Assistant wave, etc.) is implemented — not because MCP ships before
those, but because the **service-layer boundary** MCP requires
(business logic reachable independent of the web UI, with a real
authorization/entitlement stack in front of it) is exactly the boundary
every other future surface should be built against too. Getting this
architecture right now is cheaper than retrofitting it after three more
product surfaces have been built assuming direct, UI-coupled data
access.

---

## Architecture

### The three consumers of one Backend Domain Services layer

**Terminology note**: "service layer" is used precisely here to mean
the **Backend Domain Services** boundary defined in
[architecture/system.md §Service layer terminology](system.md#service-layer-terminology--two-distinct-things-same-phrase) —
**not** the client-side Frontend Data/Service Adapter
(`src/services/*.ts`, [design/frontend-execution-plan-v1.md §27](../design/frontend-execution-plan-v1.md#27-backend-integration-boundary)),
which is a different layer on the other side of the network boundary.
Read that section first if the distinction isn't already clear — this
document assumes it.

```
                    SellerSalt Backend Domain Services
                    /        |        \
                   /         |         \
               Web UI    SellerSalt AI   MCP
```

**[LOCKED — Decision 4]** MCP must not create a separate implementation
of business intelligence. There is exactly one place that should know
how to search Prospects, score a shop's Difficulty/Demand, read a
`ShopSnapshot` trend series, or (once built) diagnose a Connected Shop's
health — the Backend Domain Services layer, called by the Web UI's route
handlers. SellerSalt AI (internal) and SellerSalt MCP (external) are
both **new callers of that same layer**, not new implementations of it.

Concretely, grounded in what exists today: the research pipeline
described in [architecture/system.md](system.md) ("Data flow — research
pipeline") already has *most* of the shape this requires —
`connectorRegistry.ETSY.runSearch()` and `competition-scoring.ts` are
callable independent of any specific route handler. What's genuinely
missing is a **named Backend Domain Services boundary** between "route
handler" and "domain logic" that both a future MCP tool and a future AI Assistant
tool can call identically. [DECISION REQUIRED]: whether this is a
formal refactor (e.g. extracting `src/services/`) or an incremental
discipline applied only to new code going forward — this document does
not resolve that, only names it as the prerequisite. The existing
[architecture/marketplace.md](marketplace.md) guidance to "route new
cross-cutting reads through `competition-scoring.ts` or a similar single
seam" is the same principle already recommended for the AI Assistant
(see [architecture/ai.md](ai.md) "Recommendation") — MCP inherits that
exact recommendation, not a new one.

### The MCP request path (Agent Gateway)

```
External AI Agent
        ↓
     MCP
        ↓
SellerSalt Agent Gateway
        ↓
Authentication
        ↓
Plan Entitlement
        ↓
Organization / User Permissions
        ↓
Shop / Client / Cohort Scope
        ↓
Tool Permissions
        ↓
Rate Limits
        ↓
Usage Tracking
        ↓
Audit Logging
        ↓
SellerSalt Intelligence / Service Layer
```

**[LOCKED — Decision 4]** This is the committed shape of the request
path. Every stage below the Gateway is a **gate**, not a formality — a
request that fails any stage is rejected before it reaches the service
layer, the same discipline `requireAdminOrg()` already applies today for
admin-only routes (see [architecture/rbac.md](rbac.md)). No stage may be
skipped for convenience, including during early/limited-availability
MCP rollout.

| Stage | What it checks | Grounded in / extends |
|---|---|---|
| **Authentication** | Is this a valid, non-revoked SellerSalt agent credential? | New credential model — see [Credential / token lifecycle](#credential--token-lifecycle) below. Not NextAuth's session cookie (an external agent has no browser session) — a token-based scheme, closer in spirit to `PasswordResetToken`/`Invite`'s `tokenHash` pattern than to session auth. |
| **Plan Entitlement** | Does this org's current `Package`/`Subscription` include `mcp_access` at all? | Extends `checkLimit()` (`src/lib/plan-limits.ts`) and the access-control rule in [architecture/billing.md](billing.md) — `Subscription.status IN (ACTIVE, TRIALING)` already gates *whether* an org has real access; this adds *which capabilities* that access includes. See [Commercial model](#commercial-model--capability-based-entitlement). |
| **Organization / User Permissions** | Does the authenticated principal (the `User` who created this credential) have the org-level role/permission to do what the tool is asking? | `Membership.role` today; the locked-but-unimplemented `Role`/`Permission` primitives (Decision 1 — [architecture/organizations.md](organizations.md)) once they exist. MCP must check the **same** permission the web UI would check for the equivalent action — never a separate, looser check. |
| **Shop / Client / Cohort Scope** | For Agency/Institute contexts, is the specific Client Shop / Student Shop this tool call targets one the principal is actually scoped to? | The new `Permission` primitive's resource-scoping (Decision 1). This is the single highest-risk stage — see [Agency isolation](#agency-isolation--the-specific-failure-mode-to-avoid) below. |
| **Tool Permissions** | Is this specific tool (e.g. `apply_listing_optimization`) enabled for this credential? | New, MCP-specific: a credential's tool grant list is narrower than "everything the principal's role allows" — see [Tool-level permissions](#tool-level-permissions). |
| **Rate Limits** | Has this credential/org exceeded its MCP call-rate ceiling? | New. Independent of, and *in addition to*, the existing shared Etsy research quota (5 req/sec, 5,000 req/day platform-wide — [marketplace/etsy.md](../marketplace/etsy.md)) that any Etsy-backed tool call still consumes downstream. |
| **Usage Tracking** | Log this call against the org's/credential's usage counters. | Extends the `checkLimit()`/`Package` pattern with a new `LimitResource`, exactly as [architecture/ai.md](ai.md) already recommended for the AI Assistant — MCP and the AI Assistant plausibly share this same usage-tracking mechanism. |
| **Audit Logging** | Record actor, tool, target, timestamp, and (for APPLY/AUTOMATE tools) before/after state. | The same not-yet-built Activity/Audit primitive locked in Decision 1 ([architecture/organizations.md](organizations.md)) and independently needed for platform-admin audit logging ([architecture/rbac.md](rbac.md)) — MCP is a third, independent motivation for building this primitive, not a fourth separate audit mechanism. |

Every stage after Authentication is **entitlement/scope data the service
layer itself should never need to re-derive** — the Gateway resolves
"who is this, what can they do, what can they see" once, and passes a
resolved authorization context into the shared service layer, the same
shape of context a web request's `getServerSession()` + `organizationId`
scoping already produces today. This keeps the service layer itself
caller-agnostic (Web UI, SellerSalt AI, and MCP all supply the same
shape of authorization context), which is what makes "MCP must not
duplicate business intelligence" actually achievable rather than
aspirational.

---

## Tool philosophy

**[LOCKED — Decision 4]** MCP tools expose meaningful SellerSalt
capabilities — "find winning products," "get this shop's health score,"
"generate an optimization report" — never raw database operations
("run this SQL," "list rows from table X"). A tool is a named,
purpose-built capability with a defined input/output shape, matching
the same "predefined tools, not a generic interface" principle already
locked for the internal AI Assistant (see [ai/assistant.md](../ai/assistant.md)
"What it must not be").

### Action lifecycle: ADVISE / PREPARE / APPLY / AUTOMATE

Reuses, does not reinvent, the action lifecycle already established for
Optimization in [design/information-architecture-v1.md](../design/information-architecture-v1.md)
("Optimization IA") and its explicit **Advise / Prepare / Apply** CTA
language (see [design/frontend-execution-plan-v1.md §15](../design/frontend-execution-plan-v1.md#15-optimization-wave),
"no button anywhere in it may use the bare word 'Act'"). MCP tools
extend that same vocabulary with a fourth stage:

| Stage | Meaning | Currently exists? |
|---|---|---|
| **ADVISE** | The tool returns information/analysis; nothing changes in SellerSalt or the customer's store. | Everything [CURRENT] in the product today (research, scoring, trends) is ADVISE-only. |
| **PREPARE** | The tool stages a proposed change (a draft title, a proposed price) for human review — visible in SellerSalt's own UI before anything is applied. | Nothing exists yet — depends on Optimization ([product/complete-product-surface.md §9](../product/complete-product-surface.md#9-listing--seo-intelligence)) existing first. |
| **APPLY** | The tool actually writes a change — to SellerSalt's own data, or (further out) to the customer's connected store via the seller-channel write scopes already requested ([architecture/integrations.md](integrations.md)). | **[FUTURE] — do not assume this exists.** No push/apply logic exists anywhere in the codebase today, including in the web UI itself. |
| **AUTOMATE** | The tool (or a scheduled equivalent) applies changes on a recurring basis without a human review step per occurrence. | **[FUTURE] — do not assume this exists.** Explicitly the highest-risk, lowest-priority tier; not scoped by this pass. |

**Explicit instruction restated as a hard rule**: do not assume APPLY or
AUTOMATE capabilities currently exist, in this document or in any tool
built against it. Every tool catalogued below is classified against
this lifecycle so a future implementer never accidentally wires an
APPLY-tier tool before the underlying apply mechanism (which doesn't
exist yet, in the web UI or anywhere else) is real.

### Tool classification: READ / ANALYZE / PREPARE / APPLY / AUTOMATE

A second, orthogonal classification — every tool is tagged with the
*kind* of operation it performs, independent of the action lifecycle
above (a tool can be lifecycle-ADVISE and classification-ANALYZE at the
same time, e.g. competitor scoring):

- **READ** — returns existing data verbatim (a shop's stats, a saved
  search's results).
- **ANALYZE** — computes/derives something from existing data
  (competition scoring, trend detection) without storing a new
  recommendation object.
- **PREPARE** — stages a proposed change for review (see lifecycle
  above).
- **APPLY** — writes a change (see lifecycle above).
- **AUTOMATE** — recurring/unattended APPLY (see lifecycle above).

### Candidate tool catalog

**[FUTURE]** — none of these are built; names/signatures are
illustrative, not specified. Each is mapped against
[product/complete-product-surface.md](../product/complete-product-surface.md)'s
own CURRENT/FUTURE status so a future implementer knows which tools
could be built against real data today vs. which are blocked on
unbuilt intelligence work — the same exercise [ai/assistant.md](../ai/assistant.md)
already did for the internal Assistant's example queries; MCP's catalog
should stay in sync with that document rather than re-deriving it
independently.

| Category | Tool | Lifecycle | Classification | Backed today? |
|---|---|---|---|---|
| Research | `search_products` | ADVISE | READ | Yes — wraps `SearchConfig`/`Prospect` search, same data as Prospects |
| Research | `research_shop` | ADVISE | READ | Yes — wraps "Spy on Competitor" (`getShopByName`) |
| Research | `analyze_competitor` | ADVISE | ANALYZE | Yes — wraps `competition-scoring.ts` |
| Research | `compare_shops` | ADVISE | ANALYZE | Partial — per-shop data exists; a "my shop vs. competitor" comparison needs Shop Intelligence (below) for the "my shop" side |
| Research | `get_product_trends` | ADVISE | READ | Yes — wraps the Trends view |
| Shop Intelligence | `get_shop_health` | ADVISE | ANALYZE | **No** — Shop Intelligence (health score for the user's *own* Connected Shop) does not exist ([product/complete-product-surface.md §7](../product/complete-product-surface.md#7-shop-intelligence)) |
| Shop Intelligence | `get_shop_benchmarks` | ADVISE | ANALYZE | **No** — same dependency |
| Shop Intelligence | `get_shop_metrics` | ADVISE | READ | Partial — `SellerOrder`/Analytics data exists (admin-only access today), no health/benchmark layer over it |
| Optimization | `get_listing_optimization` | ADVISE | ANALYZE | **No** — Listing/SEO Intelligence does not exist ([product/complete-product-surface.md §9](../product/complete-product-surface.md#9-listing--seo-intelligence)) |
| Optimization | `get_keyword_opportunities` | ADVISE | ANALYZE | **No** — same dependency |
| Optimization | `get_recommendations` | ADVISE | READ | **No** — nothing prescriptive exists in the product today (see [complete-product-surface.md "Core Product Loops"](../product/complete-product-surface.md#core-product-loops), "no CURRENT loop closes with a concrete in-product action") |
| Optimization | `prepare_listing_update` | PREPARE | PREPARE | **No** — depends on Optimization existing first, in the web UI, before an MCP tool wraps it |
| Optimization | `apply_listing_update` | APPLY | APPLY | **No** — explicitly not to be assumed; depends on real APPLY infrastructure existing anywhere in the product first |
| Reporting | `generate_optimization_report` | ADVISE | READ | **No** — Reporting doesn't exist ([product/complete-product-surface.md §12](../product/complete-product-surface.md#12-reporting)) |
| Reporting | `create_report` | ADVISE | READ | **No** — same dependency |
| Reporting | `compare_before_after` | ADVISE | ANALYZE | **No** — depends on Optimization history existing, which depends on Optimization existing |

**Reading this table**: roughly the same split [ai/assistant.md](../ai/assistant.md)
already found for the internal Assistant applies here — the Research
category could be built against real data essentially immediately once
the Gateway/entitlement stack exists; every other category is blocked
on intelligence work ([product/complete-product-surface.md](../product/complete-product-surface.md)
Sections 7–9, 12) that doesn't exist yet, independent of MCP itself.
**[DECISION REQUIRED]**: whether an MCP v1 ships with only the
Research category (honest about what's real) or waits for more
categories to be buildable — the same sequencing question
[ai/assistant.md](../ai/assistant.md) already poses for the internal
Assistant, now asked a second time for the external-facing surface. This
document recommends treating both questions as the same decision, not
two — an MCP tool and an Assistant tool wrapping the same underlying
capability should ship together, since they'd call the identical service
function (see [The three consumers of one Backend Domain Services layer](#the-three-consumers-of-one-backend-domain-services-layer)).

---

## Security model

Full authentication/encryption/webhook baseline already documented in
[security/security-model.md](../security/security-model.md) applies
unchanged — this section covers what's specific to external agent
access. [security/security-model.md](../security/security-model.md) has
been updated with a summary and a pointer back to this section; this is
the fuller detail.

### Authentication

**[DECISION REQUIRED]** An external agent has no browser and no NextAuth
session cookie — a new authentication mechanism is needed. Two
candidate shapes, not decided:

1. **API-key/token-based** (recommended default for v1) — a long-lived,
   revocable credential, generated in-product (Settings → Developer &
   Integrations → AI/MCP), presented by the agent on every call.
   Structurally closer to `Connector`'s bring-your-own-key credential
   pattern than to a session: stored **hashed**, not encrypted-reversible
   (same principle as `PasswordResetToken.tokenHash`/`Invite.tokenHash`
   — a raw DB read should not be able to authenticate as the credential).
2. **OAuth 2.0 dynamic client registration** (per MCP's own
   authorization spec) — lets a third-party agent platform (e.g. an
   agent marketplace) obtain scoped access without the user
   copy-pasting a static key. Higher implementation cost, more
   appropriate once/if SellerSalt lists MCP publicly to multiple
   third-party agent platforms rather than "paste this key into your
   own agent config."

[ASSUMPTION]: v1 is API-key/token-based, matching the simplicity of
every other credential pattern already in this codebase; OAuth-based
agent registration is [FUTURE], not to be built until a concrete
third-party-agent-platform need is identified.

### Authorization layering (the full stack)

Restates the Gateway pipeline above, phrased as the authorization
question at each layer:

1. **Is this credential valid and not revoked?**
2. **Does the org this credential belongs to have `mcp_access` on its
   current plan entitlement, right now** (not "did they at some point" —
   entitlement must be re-checked per call, not cached indefinitely,
   consistent with how `Subscription.status` already drives access
   dynamically today per [architecture/billing.md](billing.md)).
3. **Does the `User` who created this credential have the org-level
   permission to perform this action** — the exact same
   `Membership.role`/future `Role`/`Permission` check the web UI would
   apply for the equivalent screen/action. MCP is never a side door with
   looser permissions than the web app.
4. **Is the specific Shop/Client/Cohort this call targets one this
   principal can see** — see Agency isolation below.
5. **Is this specific tool granted to this credential** — see
   Tool-level permissions below.
6. **Rate limit / usage limit not exceeded.**

A request failing any layer is rejected with no side effects and (for
APPLY/AUTOMATE-classified tools especially) no partial state change —
[DECISION REQUIRED]: exact error/retry semantics, deferred to
implementation.

### Agency isolation — the specific failure mode to avoid

**This is the single most important security requirement named in this
document, and it inherits directly from the existing highest-risk area
already flagged in [security/security-model.md](../security/security-model.md)
"Recommendation for future account-model work."**

> An agency employee must not automatically gain access to every client
> shop merely because the employee belongs to the agency.

Concretely: if an Agency's Employee generates an MCP credential (e.g. to
let their own internal automation query SellerSalt), that credential
must carry **exactly the same Client scope** the Employee has in the web
app — the `Permission` rows (Decision 1, [architecture/organizations.md](organizations.md))
that already limit which Clients/Client Shops that Employee can see and
act on, not the Agency Organization's full client roster. A credential
is never org-wide by default for a non-Owner principal; it inherits the
creating principal's existing scope, narrowed further if the credential
itself is scoped to fewer tools/shops than the principal could
technically reach.

**The specific failure mode this must avoid** (named explicitly per this
task's brief): implementing MCP's scope check as "does this
`organizationId` match" and stopping there — that check is sufficient
for every access-control decision the product has needed *until now*
(per [security/security-model.md](../security/security-model.md), "today
every `organizationId` filter is sufficient because there's no concept
of 'some data within my org I can't see'"). MCP is the second named
motivation (after the general Agency/Institute web UI itself) for
building the `Permission` primitive's resource-level scoping as a
first-class check, not an application-code afterthought layered on top
of an `organizationId` filter.

### Institute isolation

Same structural requirement, Institute-shaped: a Staff member's MCP
credential must be scoped to their assigned Cohorts, never institute-wide
by default; a Student's MCP credential (if Students are ever given
credential-issuing ability — [DECISION REQUIRED], ties to
[architecture/organizations.md](organizations.md)'s open "do
Clients/Students get their own login" question) must be scoped to
exactly their own single Connected Shop, matching the Student's
already-narrowest-of-any-role web UI scope
([design/information-architecture-v1.md](../design/information-architecture-v1.md)
"Institute IA").

### Connected-shop scope

Independent of Agency/Institute Client/Cohort scoping: any credential's
access to Connected Shop data (Analytics, future Shop Intelligence) is
additionally bounded by which specific `SellerChannel` row(s) the
credential is scoped to — relevant even for an Individual org with (in
the future) more than one Connected Shop, and orthogonal to plan
entitlement (having `mcp_access` doesn't imply access to every shop the
org has ever connected, if the credential itself was scoped narrower at
creation time).

### Tool-level permissions

A credential's tool grant list is a **subset** of what the principal's
role/permission would allow, never a superset, and defaults to the
narrowest useful set at creation time (READ/ANALYZE tools only, e.g.)
rather than defaulting to "every tool this plan/role could ever access."
[DECISION REQUIRED]: whether tool grants are chosen per-credential at
creation time (user picks which tools this specific agent connection
gets), or derived automatically from role (simpler, less flexible). This
document recommends per-credential choice, consistent with the
principle of least privilege, but does not lock it.

### Credential / token lifecycle

- **Issuance**: in-product, via the future Settings → Developer &
  Integrations → AI/MCP surface (see [Product surface](#product-surface)) —
  never issued by SellerSalt support/admin on a customer's behalf without
  the customer's own action, mirroring how `Connector`/`SellerChannel`
  credentials are always customer-initiated today.
- **Storage**: hashed at rest (see Authentication above) — the actual
  bearer value is shown to the user exactly once, at creation, and never
  retrievable again (standard API-key UX; matches the "raw value only at
  creation" principle already used for `PasswordResetToken`/`Invite`).
- **Revocation**: immediate and unilateral — the org owner (and, per
  Agency/Institute scoping, potentially the specific Employee/Staff
  member who created it) can revoke a credential at any time; a revoked
  credential fails Authentication on its very next call, not
  eventually. [DECISION REQUIRED]: whether revocation is soft
  (`revokedAt` timestamp, matching `Invite.status = REVOKED`'s existing
  pattern) or hard-deleted; this document recommends soft revocation for
  audit-trail continuity, consistent with how `Invite` already works.
- **Expiry**: [DECISION REQUIRED] whether credentials are long-lived
  until explicitly revoked (simpler, matches how `Connector` bring-your-
  own-key credentials work today) or carry a mandatory expiry
  (more secure default, requires a renewal UX). No existing pattern in
  this codebase does mandatory rotation for a similar long-lived
  credential today, so [ASSUMPTION]: long-lived-until-revoked is the
  likely v1 default, same as every other credential type in the schema.
- **Rotation**: [FUTURE] — a "regenerate this credential" action,
  invalidating the old value immediately, is a reasonable v1.1 addition
  but not required for a first implementation.

### Rate limiting & usage tracking

Two independent ceilings, both new:

1. **MCP-specific rate limits** — per-credential and/or per-org request
   rate (e.g. requests/minute), preventing a single misbehaving or
   compromised agent from hammering the Gateway. Independent of plan
   entitlement — even a credential with full `mcp_access` is still
   rate-limited.
2. **The existing shared platform Etsy quota** (5 req/sec, 5,000
   req/day, combined across *all* SellerSalt customers —
   [marketplace/etsy.md](../marketplace/etsy.md)) — any MCP tool call
   that resolves to an Etsy-backed research query still consumes this
   same shared budget downstream, exactly as a web-UI-initiated search
   does. MCP does not get its own separate Etsy allowance. This makes
   the already-[RECOMMENDED] "Etsy quota visibility for high-volume
   orgs, Agencies especially"
   ([product/complete-product-surface.md](../product/complete-product-surface.md)
   Product Gaps table) more urgent, not less — an Agency running
   automated MCP-driven research across many client shops is exactly the
   usage pattern most likely to exhaust the shared quota, and would do
   so with less human-in-the-loop pacing than a person clicking through
   the UI.

Usage tracking (distinct from rate limiting — this is metering, not
throttling) extends the `checkLimit()`/`Package` pattern with a new
`LimitResource`, per [architecture/ai.md](ai.md)'s existing
recommendation for the AI Assistant — MCP calls and (once built) AI
Assistant tool calls plausibly share one usage-tracking mechanism rather
than two parallel ones, since both ultimately call the same service
layer (see [The three consumers of one Backend Domain Services layer](#the-three-consumers-of-one-backend-domain-services-layer)).

A sustained rate-limit rejection pattern (not a single throttled call)
is exactly the kind of event that should surface via the "MCP / Agent
alerts" Notification Center category — see [Audit logging](#audit-logging)
above for the distinction between the durable log and the user-facing
alert surface.

### Audit logging

Every MCP tool call — success or failure, and especially every
PREPARE/APPLY/AUTOMATE-classified call — must be recorded: actor
(the `User` who owns the credential), the credential used, the tool
called, the target entity, timestamp, and (for APPLY/AUTOMATE) enough
context to reconstruct what changed. This is the same minimum shape
already specified for the platform-admin audit log in
[architecture/rbac.md](rbac.md) — MCP is a third independent motivation
(alongside platform-admin actions and, once built, Agency/Institute
Employee/Staff actions on Clients/Cohorts) for building the one
Activity/Audit primitive Decision 1 already locked as a shared
primitive, not a reason to build a fourth, MCP-specific logging
mechanism.

**Distinct from user-facing notifications**: this audit log is the
durable, complete record of every call — it is not itself a
notification. The subset of these events a user should actually be
*alerted* to (credential revoked, sustained rate-limit rejection, a
tool call failing repeatedly) surfaces separately through the existing
unified Notification Center as an "MCP / Agent alerts" category — see
[design/information-architecture-v1.md §Notifications IA](../design/information-architecture-v1.md#notifications-ia).
The Notification Center reads from a subset of this audit log; it does
not maintain its own separate copy of these events.

### Suspicious activity handling

**[FUTURE], [DECISION REQUIRED]** — no security-event
logging/alerting exists anywhere in the product today
([security/security-model.md](../security/security-model.md), "What's
explicitly not built"). A reasonable minimum bar once built: automatic
flag (not necessarily automatic revocation) on patterns like a sudden
spike in APPLY-classified calls, calls against Client/Cohort scopes the
credential hasn't touched before, or a rate-limit-rejection burst — but
none of this is scoped or committed by this document; it is named so a
future security-hardening pass has a starting list rather than
discovering the requirement from scratch.

### Least privilege / data isolation summary

Every layer above compounds toward one rule: **an MCP credential can
never see or do more than the `User` who created it could see or do in
the web app, and by default sees/does meaningfully less** (narrowed tool
grants, explicit scope selection at creation). Data isolation is
enforced identically to the web app's `organizationId` discipline, with
the Client/Cohort/Shop-level narrowing Decision 1's `Permission`
primitive is specifically being built to support — MCP does not
introduce a new isolation model, it is a second, equally strict consumer
of the same one.

---

## Commercial model — capability-based entitlement

**[LOCKED — Decision 4]** MCP access is represented as a capability/
entitlement, never as a hardcoded plan-name check anywhere in the
codebase. Do not write `if (package.key === "PRO")` (or any
plan-key-string comparison) to gate MCP or any future entitlement —
this is an explicit anti-pattern this document rules out, not a style
preference.

Intended capability model (**[FUTURE]** — no schema exists yet):

```
capabilities:
  research
  connected_shop
  optimization
  reports
  ai_assistant
  mcp_access
  ...
```

Each `Package` row would carry a set of enabled capabilities (a
`features: String[]`, a join table, or a structured JSON field — schema
shape [DECISION REQUIRED], not designed in this pass), and `checkLimit()`
(`src/lib/plan-limits.ts`) or a sibling function would grow a
capability-check alongside its existing numeric-limit checks
(`connectors`, `searchConfigs`, `scheduledSearches`, `trackedShops`,
`prospectsThisMonth`, `sellerChannels`). This is the **exact same gap**
already independently flagged in [product/plans.md](../product/plans.md)
("Feature-gated tiers... nothing in the current `Package` shape supports
boolean feature flags per tier") — `mcp_access` is now the first
concrete, locked-requirement example of that previously-abstract gap,
not a new, separate need. Building the capability model to satisfy MCP
should satisfy `ai_assistant`/`reports`/etc. gating too, once those ship,
rather than being MCP-specific plumbing.

**[LOCKED — Decision 4]** Cheaper plans do not receive MCP access
initially — `mcp_access` is enabled only on eligible premium plan(s).
**[DECISION REQUIRED]**: which specific `Package` key(s) are "eligible
premium" — today's seed tiers are `STARTED`/`PRO`/`AGENCY`
([product/plans.md](../product/plans.md)); whether `mcp_access` starts at
`PRO`, only `AGENCY`, or a new tier entirely is not decided by this
document. Also unresolved, and explicitly flagged in
[product/plans.md](../product/plans.md) already: the `AGENCY`
**pricing-tier key** and the now-locked Agency **domain model**
(Decision 1) are two different things sharing one confusing name — an
`mcp_access`-eligible "Agency" plan and an Agency-*type* `Organization`
are not necessarily the same population, and this document does not
assume they are.

The exact final plan-to-capability matrix remains **[DECISION
REQUIRED]**, per this task's instruction — this document intentionally
does not invent one.

---

## Distinguishing the three AI/agent surfaces

1. **SellerSalt AI Assistant** — an AI experience *inside* SellerSalt
   (chat/conversation UI, contextual "Ask AI" entry points). Full detail:
   [architecture/ai.md](ai.md), [ai/assistant.md](../ai/assistant.md).
   Nothing built.
2. **SellerSalt MCP** (this document) — external AI agents calling into
   SellerSalt from *outside* SellerSalt's own UI, via the standardized
   MCP protocol. Nothing built.
3. **Future SellerSalt API** — [FUTURE], not scoped by this pass.
   Developer/system integrations (e.g. a customer's own backend pulling
   SellerSalt data programmatically) that may have nothing to do with AI
   agents and may not use MCP as the transport at all — a REST/GraphQL
   API is a plausible future need independent of the AI-agent use case
   MCP specifically serves. Named here only so a future implementer
   doesn't conflate "build an API" with "build MCP" — they are related
   but not the same project, and this document scopes MCP only.

**[LOCKED — Decision 4]** All three ultimately consume the same
underlying SellerSalt service/intelligence layer (see
[The three consumers of one Backend Domain Services layer](#the-three-consumers-of-one-backend-domain-services-layer)).
A future SellerSalt API, if built, should be a fourth consumer of that
same layer, not a fourth reimplementation.

---

## Multi-marketplace neutrality

**[LOCKED — Decision 4, consistent with the already-locked Decision 3]**
MCP tools must not be Etsy-specific. Tool input/output shapes should
speak in normalized commerce concepts — `product`, `shop`, `listing`,
`order`, `keyword`, `competitor`, `trend`, `metric`, `benchmark`,
`recommendation` — never in Etsy-specific field names
(`numFavorers`, `avgSellingRatio`) at the tool-interface boundary, even
though today's actual data underneath is entirely Etsy-shaped.

This is not a new architectural requirement — it is Decision 3's
existing locked pipeline (raw data → adapter → normalized representation
→ intelligence → scores → recommendations → actions,
[architecture/marketplace.md](marketplace.md)) applied to a new caller.
Per that decision, the **concrete** normalized-entity schema remains
explicitly [DEFERRED] until a second marketplace is selected — MCP does
not change that deferral or force it to happen sooner. Practically, this
means: MCP tool implementations, like any other new cross-cutting
feature built before normalization lands, should read through the same
single narrow seam already recommended (`competition-scoring.ts` or
equivalent) rather than reading `Prospect`'s Etsy-shaped fields directly
from multiple new tool handlers — the same mitigation
[architecture/ai.md](ai.md) already recommends for the internal
Assistant, applied identically here. Marketplace-specific adapters
(`src/connectors/<marketplace>/`) remain strictly below this
normalization layer, per [architecture/marketplace.md](marketplace.md) —
an MCP tool never talks to a connector directly.

---

## Product surface

Nothing below is implemented; this section defines where MCP will
eventually live in the product so future frontend work (see
[design/information-architecture-v1.md](../design/information-architecture-v1.md),
now updated with this addition) has a settled target. Full detail is in
that document — summarized here as the MCP-side view of the same
decision.

### Settings surface (customer-facing, once built)

```
Settings
  → Developer & Integrations   (new Settings category)
      → AI / MCP
          - Overview / eligibility state (shows whether this org's plan includes mcp_access)
          - Connect / setup instructions (how to point an external agent at SellerSalt)
          - Agent connections (list of issued credentials)
          - Credentials (create/reveal-once/revoke)
          - Tool permissions (per-credential grant list)
          - Scope permissions (per-credential Client/Cohort/Shop scope, Agency/Institute only)
          - Usage (calls this period, against plan/rate limits)
          - Rate limits (current ceiling, visibility into throttling if any)
          - Activity / audit (this org's own MCP call history)
          - Revoke access (per-credential and "revoke all")
          - Documentation (links to protocol-level docs, likely external)
          - Example queries (seeded from the tool catalog above, mirroring ai/assistant.md's example-query approach)
```

Status: **[FUTURE]** for every screen listed — none are to be built as
part of this documentation pass. This inventory exists so a future
frontend wave (see [How this fits the implementation order](#how-this-fits-the-implementation-order))
has a complete brief, the same purpose
[product/complete-product-surface.md](../product/complete-product-surface.md)'s
Screen Inventory already serves for every other area.

### Public/marketing surface (once built)

```
Public Website
  → AI & MCP                     (new public page)
      - "Connect SellerSalt to your AI"
      - MCP documentation (protocol-level, likely links to a docs subdomain or external reference rather than being fully hand-authored here)
      - Supported agents           — [DECISION REQUIRED]/[VERIFY]: do not name
                                      specific third-party AI products as
                                      "supported" until that support is actually
                                      built and verified; this document does not
                                      invent a supported-agent list
      - Example workflows            (mirrors the tool catalog's ADVISE-tier examples)
      - Security explanation           (a plain-language version of this document's
                                         Security model section)
```

Status: **[FUTURE]**. Per [seo/geo.md](../seo/geo.md)'s existing hard
rule (never publish a capability claim ahead of what's built), this page
must not go live before `mcp_access` and at least one real tool are
actually shipped — the same discipline already applied to every other
not-yet-built feature named in
[product/complete-product-surface.md §1](../product/complete-product-surface.md#1-public--marketing-experience).

---

## Database implications (no schema changes made)

Named so a future migration author sees the shape of what's coming, in
the same style as [architecture/data.md](data.md)'s existing "What the
schema does NOT yet represent" section — **no migration was written or
authorized in this pass**:

- An agent-credential model (token hash, owning `User`, owning
  `Organization`, tool grants, scope grants, `revokedAt`, `expiresAt`? —
  exact shape [DECISION REQUIRED], see [Credential / token lifecycle](#credential--token-lifecycle)).
- A capability/entitlement model on `Package` (see [Commercial model](#commercial-model--capability-based-entitlement)) —
  shared need with `ai_assistant`/`reports`/every other future
  feature-gated capability, not MCP-specific.
- A usage-tracking table/counter for MCP calls (new `LimitResource`,
  extending the existing `checkLimit()` pattern — likely no new *table*
  if usage counters can be derived the same way `prospectsThisMonth` is
  today, though a per-call log is a plausible alternative shape;
  [DECISION REQUIRED]).
- The Activity/Audit primitive (Decision 1, already locked as needed
  independent of MCP — MCP is a third motivation, not a new
  requirement).
- Every dependency above is **also** needed by other already-planned
  work (Agency/Institute `Role`/`Permission`, platform-admin audit
  logging, the AI Assistant's usage metering) — this document
  deliberately does not propose MCP-specific tables where a shared
  primitive already covers the need, consistent with Decision 1's
  "shared primitives" philosophy.

---

## How this fits the implementation order

Per this task's explicit framing: this architecture must exist **before**
Wave 10 (AI — [design/frontend-execution-plan-v1.md §16](../design/frontend-execution-plan-v1.md#16-ai-wave))
or any other major product surface is implemented, because the
service-layer boundary it requires (see [The three consumers of one
service layer](#the-three-consumers-of-one-backend-domain-services-layer)) should be the
boundary every future surface is built against, not retrofitted later.
This does **not** mean MCP itself ships before Waves 5–9
([design/frontend-execution-plan-v1.md §29](../design/frontend-execution-plan-v1.md#29-implementation-order)) —
most of the tool catalog above is explicitly blocked on intelligence
work (Shop Intelligence, Optimization, Reporting) that those earlier
waves are what actually builds. What this locks is the **architectural
discipline** (service-layer boundary, capability-based entitlement,
scope-aware permission checks) that those waves, and the eventual MCP
implementation itself, must both honor from the start.

Recommended sequencing implication for
[design/frontend-execution-plan-v1.md](../design/frontend-execution-plan-v1.md)
(cross-referenced there, not re-decided here): the Settings →
Developer & Integrations → AI/MCP screens are frontend-only surfaces
that can be mocked in Wave 13 (Settings) exactly like every other
not-yet-real Settings category already is — this does not require the
real Gateway/entitlement backend to exist first, the same "mock now,
wire to real backend later" discipline already applied throughout
[design/frontend-execution-plan-v1.md](../design/frontend-execution-plan-v1.md).
The **real** Agent Gateway, credential model, and tool implementations
are backend work, sequenced independently of the frontend simulator
waves, and not scoped by this document.

---

## Open questions [DECISION REQUIRED]

Consolidated from throughout this document:

1. Exact service-layer boundary mechanics (formal `src/services/`
   extraction vs. incremental discipline).
2. Authentication mechanism: API-key/token (this document's
   [ASSUMPTION] for v1) vs. OAuth 2.0 dynamic client registration.
3. Tool grant model: per-credential explicit choice (recommended) vs.
   role-derived.
4. Credential expiry/rotation policy.
5. Credential revocation: soft (`revokedAt`, recommended) vs. hard
   delete.
6. Capability/entitlement schema shape on `Package`.
7. Which specific `Package` key(s) get `mcp_access` initially.
8. Usage-tracking storage shape (derived counter vs. per-call log).
9. MCP v1 tool scope: Research category only, or wait for more
   intelligence work to land (mirrors [ai/assistant.md](../ai/assistant.md)'s
   identical open sequencing question for the internal Assistant).
10. Suspicious-activity detection rules and response (flag vs.
    auto-revoke).
11. Whether a future SellerSalt API (non-MCP) is ever built, and its
    relationship to this same service layer.
