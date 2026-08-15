Status: Draft
Owner: [ASSUMPTION] Founder (Aliyan)
Last Updated: 2026-08-15
Decision State: Validation exercise against [design/information-architecture-v1.md](information-architecture-v1.md). Findings below are honest — some journeys expose real gaps, not just confirmations. **Fold-in status (2026-08-15): all ten items in [IA CHANGES REQUIRED BEFORE DESIGN](#ia-changes-required-before-design) have now been folded into `information-architecture-v1.md`** (a Final Architecture Reconciliation pass found four had already leaked into `frontend-execution-plan-v1.md`'s wave descriptions without ever reaching the source IA document itself; all ten now also live in the IA document directly, per this document's own original recommendation). This document's own historical record below is left as-written.

# IA Journey Validation

## Purpose

This document traces nine end-to-end user journeys through
[information-architecture-v1.md](information-architecture-v1.md) to
test whether the proposed IA actually holds up in practice, before any
visual design work begins. It does not modify the IA — where a gap is
found, it's recorded here as a finding and, where warranted, carried
into [IA Changes Required Before Design](#ia-changes-required-before-design)
as a small, additive clarification. The IA document itself is not
touched.

**A note on honesty**: several journeys below expose real, specific
gaps — some structural (the IA doesn't say what happens), some
feature-scope (the underlying capability doesn't exist yet, which is a
[product/complete-product-surface.md](../product/complete-product-surface.md)
concern, not an IA defect). This document is careful to distinguish the
two — see each journey's "IA friction" vs. "Missing IA elements" fields,
and the explicit distinction drawn in
[IA Changes Required](#ia-changes-required-before-design).

---

## 1. INDIVIDUAL — PRODUCT DISCOVERY

**Goal**: "I want to find a promising product to sell."

| Field | Detail |
|---|---|
| Starting context | Individual (Starter or Pro), freshly logged in, single-org workspace, no Workspace/Scope switcher shown |
| Entry point | Login → Dashboard Overview → DISCOVER → Prospects |
| Navigation path | Global → Workspace (Individual, no switcher) → DISCOVER → Prospects (primary nav) |
| Screens required | Login, Dashboard Overview, Prospects (Results + Filters panel), Competitor Shop detail (optional drill-in), Favorites |
| Important objects | `SearchConfig`, `Prospect`, Competitor Shop (Research Shop), Favorite |
| Required permissions | Individual = MANAGE on Discover (per Role Visibility Matrix) |
| Primary actions | Set filters (keyword/price/shop-age/review-count), run search, view Score badges (competition scoring), favorite, track, export CSV |
| Expected outcome | User identifies one or more promising listings/shops and has a way to keep track of them |
| IA friction | The loop's "Compare" stage has no built action ([FUTURE] per the IA and product surface) — a user can favorite multiple prospects but cannot view them side-by-side, so "save/compare" collapses to "save only" today. Also: the Dashboard Overview's actual content is unspecified in the IA — a brand-new user with zero saved searches has no defined first-run guidance (ties to the [FUTURE] onboarding checklist noted in [product/complete-product-surface.md §2](../product/complete-product-surface.md#2-authentication--account-onboarding)) |
| Missing IA elements | `Prospect.status` (`PENDING_REVIEW`/`SHORTLISTED`/`CONTACTED`/`REJECTED`) is real, [CURRENT] schema, but the IA never explicitly places it as a contextual action or filter within Prospects — this is arguably the actual "Decide" step of the loop, and it exists today but isn't surfaced anywhere in the IA document |
| Recommended change | Add `Prospect.status` as an explicit contextual action (Shortlist/Reject/Mark Contacted) and filter within DISCOVER → Prospects — see [IA Changes Required](#ia-changes-required-before-design) |

---

## 2. CONNECTED SELLER — SHOP DIAGNOSIS

**Goal**: "I connected my shop and want to understand what is wrong."

| Field | Detail |
|---|---|
| Starting context | A user with a `SellerChannel` connection. **Today this is admin-only** — a regular Individual cannot reach this journey at all; tracing it below assumes the [FUTURE] state where Operate is customer-facing |
| Entry point | Settings → Connections → Connect flow (OAuth), OR OPERATE → Connected Shops → Connect |
| Navigation path | MANAGE → Settings → Connections (initial connect) → OPERATE → Connected Shops → [shop workspace] → Overview |
| Screens required | Connect flow (OAuth), Connected Shop Overview, Optimization tab (Issues/Priorities) |
| Important objects | `SellerChannel`, (future) Health Score, Issue, Recommendation |
| Required permissions | Today: NONE for a regular Individual (admin-gated). Target: MANAGE |
| Primary actions | Connect (OAuth), (implicit) sync, (future) trigger/await scan, view health score, view issue list |
| Expected outcome | User understands their shop's health at a glance and sees a ranked list of problems |
| IA friction | **The entire journey is untestable today** — OPERATE access is admin-gated and Shop Intelligence (health score, issues) is entirely [FUTURE]. Beyond that headline gap: the IA never distinguishes **Sync** (order data import, `sync-seller-channel.ts`, [CURRENT]) from **Scan** (a health/issue audit, described under Optimization IA as "audit") as two separate triggers. It's unclear whether they run together, independently, or on different schedules — a newly-connected shop's Overview would be empty with no explanation of when a score will appear |
| Missing IA elements | No defined "first scan" moment — does connecting a shop auto-trigger an initial audit, or does the user have to find and press a manual "Scan now" action with no prompt to do so? |
| Recommended change | Explicitly define the Sync/Scan relationship in Operate IA, including whether first scan auto-triggers on first successful sync — see [IA Changes Required](#ia-changes-required-before-design) |

---

## 3. CONNECTED SELLER — OPTIMIZATION

**Goal**: "I found problems and want to improve my shop."

| Field | Detail |
|---|---|
| Starting context | Continuation of Journey 2 — an Issue is already visible |
| Entry point | OPERATE → Connected Shop → Optimization tab |
| Navigation path | (already in shop workspace) → Optimization → Issue card → Recommendation card |
| Screens required | Optimization tab (Issues/Priorities/Recommendations/History), before/after comparison view |
| Important objects | Issue, Recommendation, Action (log entry), two audit snapshots, Outcome (score delta) |
| Required permissions | Shop owner, or an assigned Employee/Staff with `Permission` |
| Primary actions | Triage/prioritize issues, view a recommendation, apply/mark-done, wait for or trigger re-scan, view before/after |
| Expected outcome | User applies a fix and can later confirm it improved their score |
| IA friction | Aligns cleanly with the Optimization IA structure (audit/issues/priorities/recommendations/action/before-after/outcome/history) as already designed — no structural mismatch. The real gap is a **product ambiguity the IA surfaces but doesn't resolve**: does "apply" a recommendation mean SellerSalt *advises* the user (they go fix it themselves on the actual marketplace, then re-scan proves it), or does SellerSalt *execute* the change via the seller-channel's write scope (already granted per [architecture/integrations.md](../architecture/integrations.md), but no push logic exists — closest analog is the schema-only `CrossListing`)? |
| Missing IA elements | No distinct labeling for "advisory" vs. "automated" recommendations — the IA treats "Action" as one undifferentiated step |
| Recommended change | Distinguish **Advise** (SellerSalt tells you what to do) from **Apply** (SellerSalt does it for you) as two explicitly labeled action types wherever a loop's "Act"/"Optimize" stage appears — see [IA Changes Required](#ia-changes-required-before-design) |

---

## 4. COMPETITOR INTELLIGENCE

**Goal**: "I want to understand and monitor a competitor."

| Field | Detail |
|---|---|
| Starting context | Individual+ user in DISCOVER, either arriving from a Prospects search or a direct shop-name lookup |
| Entry point | DISCOVER → Prospects (discover) or Spy on Competitor (direct inspect) |
| Navigation path | DISCOVER → Spy on Competitor → Competitor Shop detail (Overview/Listings/History/Keywords tabs) → Track → (later) Spy → Tracked |
| Screens required | Spy search, Competitor Shop detail (4 tabs), Tracked Shops list, (future) Compare view |
| Important objects | Prospect, Research/Competitor Shop, `ShopWatch`, `ShopSnapshot`, (future) Alert |
| Required permissions | MANAGE (Individual+) |
| Primary actions | Search/lookup, inspect tabs, Track (creates `ShopWatch`), view trend graph over time, (future) Compare, (future) receive Alert |
| Expected outcome | User understands a specific competitor and gets notified when something meaningful changes |
| IA friction | The loop's final two stages — **Alert** and **Act** — are both [FUTURE]. A user monitoring a competitor today must manually revisit the tracked-shop page; there is no push notification for "competitor dropped price" or similar. Separately, "Act" is ambiguous in the same way Journey 3 found: does it mean acting on the *competitor research itself* (e.g., dismiss/archive) or acting on *the user's own shop* in response (price-match, bridging into OPERATE)? The Core Product Loops table in the IA resolves this as "bridges into OPERATE," but that resolution isn't visible from inside the Competitor Intelligence journey itself |
| Missing IA elements | No defined alert-trigger criteria (price change? new listing? rank shift?) anywhere — this is a feature-scope gap, not strictly an IA-structure gap, since Notifications IA already reserves a "Competitor alerts" slot; the *content* of that alert is undefined |
| Recommended change | None required to the IA structure itself (the slot for competitor alerts already exists in Notifications IA); the "Act" ambiguity is covered by the same Advise/Apply distinction recommended in Journey 3 |

---

## 5. AGENCY

**Goal**: "I onboard a new client and need to produce measurable optimization results."

| Field | Detail |
|---|---|
| Starting context | Agency Owner or Agency Employee, inside an Agency org, Scope selector available |
| Entry point | MANAGE → Clients → Add Client |
| Navigation path | MANAGE → Clients → [new Client] → Shops tab → Connect Shop → Optimization (diagnose/optimize) → Reports (contextual "Generate report") → Share |
| Screens required | Client list, Client detail (Overview/Shops/Optimization/Reports/Activity tabs), Connect flow, Optimization tab, Report generation, external shared-report view |
| Important objects | Client, Client Shop (Connected Shop), Issue, Recommendation, Report, share-token |
| Required permissions | Owner = MANAGE across all clients; Employee = LIMITED, scoped to assigned clients only (validated against Role Visibility Matrix — consistent) |
| Primary actions | Add client, connect client's shop, diagnose, optimize, generate report, share |
| Expected outcome | A client's shop measurably improves and the agency can prove it happened |
| IA friction | **The largest gap found in this validation pass**: the OAuth connection mechanism (Shopify/WooCommerce/Etsy-seller) requires the *actual store owner* to approve the authorization — an Agency Employee cannot complete OAuth on behalf of a Client unless the Client personally does it (or hands over admin credentials, which the product doesn't design for or want). The IA places "Connect Shop" as a simple step inside the Client workspace with no acknowledgment of this real mechanical constraint |
| Missing IA elements | No defined "invite client to connect their own shop" flow — this is the concrete form the still-open "does a Client get their own login" question ([product/personas.md](../product/personas.md)) takes in practice: at minimum, a Client needs *some* mechanism (a connect-link, even without a full login) to complete OAuth themselves. Separately (minor): Client detail doesn't show which employee(s) are assigned to it — only Employee detail shows assigned Clients; this should be bidirectionally visible |
| Recommended change | Add an explicit "Client-initiated connect" flow to Agency IA — the agency sends a scoped connect link, the client completes OAuth themselves, the resulting `SellerChannel` attaches to that Client record. This does not require resolving the full "does a Client get a login" question — a connect-link can work without one — see [IA Changes Required](#ia-changes-required-before-design) |

---

## 6. INSTITUTE

**Goal**: "I manage 30 students and need to understand student progress."

| Field | Detail |
|---|---|
| Starting context | Institute Admin (or Staff, scoped to fewer cohorts), one Cohort with 30 enrolled Students |
| Entry point | MANAGE → Cohorts → [cohort] → Students |
| Navigation path | MANAGE → Cohorts → [cohort] detail (Overview/Students/Progress rollup/Analytics tabs) → individual Student workspace (drill-down) |
| Screens required | Cohort detail, Students list (30 rows), Progress rollup, Student workspace |
| Important objects | Cohort, Student, Student Shop, Progress (undefined) |
| Required permissions | Admin = MANAGE; Staff = LIMITED to assigned cohorts |
| Primary actions | View cohort roster, scan progress rollup, drill into an individual student |
| Expected outcome | Admin/Staff can quickly identify which students are on track and which need attention |
| IA friction | **The goal cannot actually be satisfied by any navigation structure** — "Progress" is explicitly [DECISION REQUIRED] with no defined metric (searches run? score improvement? milestones?). The IA correctly *places* a Progress view, but its content is fundamentally blocked on an unresolved product decision, not a navigation problem. Separately: the IA never specifies a view pattern for scanning 30 students at once — does the Students tab support sort/filter/at-a-glance flagging, or does it assume a small roster? |
| Missing IA elements | No "at-risk student" flagging concept anywhere — a natural extension of the existing Alert intelligence-object pattern, applied to Students, rather than a new mechanism |
| Recommended change | Two additive, non-structural clarifications: (1) the Students tab should explicitly reuse Prospects' proven sortable/filterable list pattern rather than needing a new one invented for scale; (2) at-risk flagging should be scoped as an application of the existing Alert pattern to Student objects, once Progress itself is defined. Neither requires restructuring the IA — see [IA Changes Required](#ia-changes-required-before-design) |

---

## 7. AI COPILOT

**Goal**: "Show me the biggest opportunities in my shop this month."

| Field | Detail |
|---|---|
| Starting context | Individual+ user with a Connected Shop, inside any DISCOVER/OPERATE screen or the global AI launcher |
| Entry point | Global AI launcher, or contextual "Ask AI" on the Connected Shop's Overview (more natural fit for this specific query) |
| Navigation path | Global/Contextual entry → Conversation surface → (internally) tool selection → result cards rendered in place |
| Screens required | AI conversation surface (wherever it's docked), result cards (reusing Intelligence component vocabulary) |
| Important objects | Conversation (no schema exists), Query, Tool call, Opportunity (undefined), Recommendation |
| Required permissions | LIMITED (plan/role-gated); additionally blocked entirely if the asking user's plan doesn't include Connected Shop access |
| Primary actions | Ask, (system) retrieve + analyze + recommend, view results, act on a recommendation |
| Expected outcome | User gets a credible, data-grounded answer about their own shop's biggest opportunities |
| IA friction | **This is the least buildable journey tested** — this exact example query requires ALL of: OPERATE being customer-facing ([FUTURE]), Shop Intelligence/health existing ([FUTURE]), an "Opportunity" object/tool existing (undefined even at the Product Intelligence level), and the AI tool registry itself existing ([FUTURE]). This echoes [ai/assistant.md](../ai/assistant.md)'s own gap analysis, which already flags "opportunity"-type queries as among the harder half of the brief's example list — this validation confirms that assessment end-to-end. **A genuine positive finding**, though: the IA's naming discipline (never say bare "Shop") means an AI implementation that respects the same discipline internally will correctly resolve "my shop" to the Connected Shop every time, with no structural ambiguity to design around |
| Missing IA elements | No defined behavior for "AI is asked something it has no tool/data to answer yet" — with this much of the AI's target capability still [FUTURE], this will be a *common* case for a long time, not an edge case |
| Recommended change | Define a graceful-degradation response pattern as a first-class part of AI IA (not new screens — a rule that "capability not available yet" is an explicit, honest response state, consistent with the existing UX principle that editorial judgment must be labeled as such, not silently absent or hallucinated) — see [IA Changes Required](#ia-changes-required-before-design) |

---

## 8. SUPER ADMIN

**Goal**: "Verify an agency and inspect its subscription."

| Field | Detail |
|---|---|
| Starting context | Super Admin, in the Admin tree |
| Entry point | Admin → Organizations |
| Navigation path | Admin → Organizations (filtered to Agencies) → [org] detail → Verification → Subscriptions & Billing → Account details → Audit trail |
| Screens required | Organizations list, Organization detail, Verification panel, Subscription panel, Audit trail view |
| Important objects | Organization, Subscription, (future) Verification record, (future) `AuditLogEntry` |
| Required permissions | Super Admin = MANAGE |
| Primary actions | Filter organizations by type, verify, inspect subscription state, review activity |
| Expected outcome | Admin confirms the agency is legitimate and its billing is in good standing |
| IA friction | Two of the four requested stages are entirely unbuilt: **Verification** (no workflow, states, or criteria defined anywhere — not even at the [FUTURE]-scoped level, just a label in the Admin tree) and **Audit trail** (no `AuditLog` model exists — [architecture/rbac.md](../architecture/rbac.md)). The very first filtering step — Organizations by Individual/Agency/Institute — also depends on the still-undecided `Organization.kind` discriminator field. Subscription inspection alone is [CURRENT] and works today |
| Missing IA elements | No defined relationship between a *specific* organization's detail view and the *global* Audit Logs section — should an org's own activity surface inline, or does the admin navigate away to a separate filtered log? |
| Recommended change | Add a contextual "Activity" tab to Organization detail in Admin IA, reusing the same pattern already defined for an Agency's Client detail — this resolves the placement question without inventing a new pattern, even though the underlying Audit Log itself remains [FUTURE] to build — see [IA Changes Required](#ia-changes-required-before-design) |

---

## 9. SUB-ADMIN

**Goal**: "An Accounts team member needs to resolve a billing issue."

| Field | Detail |
|---|---|
| Starting context | Sub-admin, Accounts/Billing department |
| Entry point | Department-scoped Admin landing (undefined — see friction below) |
| Navigation path | (Department dashboard) → find customer → Subscriptions & Billing → resolution action |
| Screens required | Department landing, customer lookup, Subscription/Billing detail |
| Important objects | Organization, Subscription, `PaymentProvider` state |
| Required permissions | Sub-admin = LIMITED, department-scoped |
| Primary actions | Look up customer, inspect subscription/billing state, take a resolution action |
| Expected outcome | The billing issue is resolved and the customer's access reflects it |
| IA friction | **Tracing this journey exposed a real inconsistency in the Admin IA's own department-scoping table**: Accounts/Billing was scoped to "Subscriptions & Billing, Packages & Pricing, Coupons" only — it did not include any way to *find* a customer in the first place. A billing resolution always starts with "which org is this," which requires Organizations lookup, and that was omitted from the department's scope. Separately, no "resolution" action vocabulary is defined anywhere (refund? credit? grace-period extension? manual subscription grant is the only [CURRENT] mechanism) |
| Missing IA elements | (1) Customer/org lookup within the Accounts/Billing department scope; (2) a defined Sub-admin landing/dashboard concept — Admin IA never specified what a sub-admin sees when they first log in, only that their tree is a subset |
| Recommended change | Add read-scoped Organizations lookup (billing-relevant fields only) to the Accounts/Billing department's scope in Admin IA, and define that every department's landing is that department's first available module (no separate "department dashboard" screen needs inventing) — see [IA Changes Required](#ia-changes-required-before-design) |

---

## CROSS-JOURNEY PROBLEMS

Patterns that repeated across multiple journeys, rather than being
one-off findings:

| Pair | Held up? | Finding |
|---|---|---|
| Research Shop vs. Connected Shop | **Validated — held up well** | No journey produced actual confusion between the two. The one place requiring ongoing vigilance is AI natural-language input (Journey 7): the naming discipline works *if* AI internals also respect it, which is a prompt/tool-design responsibility going forward, not an IA defect. |
| Workspace vs. Client/Cohort vs. Connected Shop scope | **Mostly validated, one gap** | Journey 5 confirmed these nest correctly for Agency Employees (Scope selector, then Shop selector within it) — but this nesting relationship is *implied*, not explicitly stated anywhere in Workspace Model or Operate IA. Journey 8/9 confirmed Admin correctly bypasses this model entirely (uses lookup/search instead), which is consistent, not a bug. |
| Discover vs. Operate | **Validated, with a recurring ambiguity** | The boundary itself held up in every journey. But the word **"Act"** appears in three different loops (Discover, Operate, Competitor) with three subtly different meanings each time (decide externally / apply a fix / respond via Operate) — this is a recurring, not isolated, ambiguity (found independently in Journeys 3 and 4). |
| Contextual vs. global Reports | **Validated** | Journeys 5 and 6 both traced cleanly through the hybrid model as designed. No issues found. |
| Contextual vs. global Optimization | **Mostly validated, one gap** | The rollup (for multi-shop/multi-client triage) exists in the IA, but no journey actually exercised the deep-link from "an issue in the rollup" back to "that issue's contextual detail in a specific shop's Optimization tab" — the path is assumed, not specified. |
| AI entry points | **Validated structurally, one standing gap** | Global and contextual entry points both work conceptually (Journey 7). But because so much of AI's target capability is [FUTURE], "AI doesn't have this yet" will be a *common*, not edge-case, response for a long time — this needs to be a designed-for state, not an afterthought. |
| Notification vs. intelligence alert | **Validated** | Journeys 2/3 (optimization alerts) and 4 (competitor alerts) both route through the same unified Notification Center as designed. No confusion found. |
| Individual vs. organization experience | **New gap found, not visible from any single journey** | No single journey tests *transitioning* between account types. Comparing Journey 1 (Individual) against Journeys 5/6 (Agency/Institute) surfaces a question neither journey alone raises: if an Individual later needs Agency-level structure, is that an in-place conversion of their existing `Organization`, or a new org (losing history)? This ties directly to the open `Organization.kind` discriminator decision but the upgrade-path question itself isn't recorded anywhere yet. |
| Customer vs. admin navigation | **Validated — one of the strongest results** | Journeys 8 and 9 confirm Admin never bleeds into customer navigation, and customer journeys (1–7) never reference or require Admin concepts. This directly fixes a real anti-pattern in today's actual app (admin nav items appended into the same customer `Sidebar` component). |

---

## IA STRESS TEST

| # | Question | Result | Reasoning |
|---|---|---|---|
| 1 | Can a new individual seller understand where to start? | **PASS** | DISCOVER is one clear, singular entry point; the `Prospect.status` surfacing gap (Journey 1) is a content refinement, not a structural flaw. |
| 2 | Can a connected seller quickly understand their shop health? | **NEEDS ADJUSTMENT** | The Sync-vs-Scan relationship is genuinely unspecified, risking a confusing empty-state right after connecting — this is close enough to structural to warrant fixing before design. |
| 3 | Can an agency employee work across multiple clients without confusion? | **PASS** | Scope selector + permission-scoped client list is coherent end-to-end; the rollup deep-linking gap is a refinement, not a source of confusion at the structural level. |
| 4 | Can an institute staff member manage cohorts without seeing irrelevant agency functionality? | **PASS** | Institute IA is structurally independent from Agency IA — no shared "Clients" concept leaks across. Clean separation. |
| 5 | Can AI be accessed without becoming a distracting separate product? | **NEEDS ADJUSTMENT** | The entry-point design (global + contextual) is sound, but the missing graceful-degradation behavior is a real gap given how much of AI's capability is still [FUTURE] — without it, "distracting" risk shifts from "isolated page" (avoided) to "frequently unhelpful/confusing responses" (not yet addressed). |
| 6 | Can reports be found both contextually and globally? | **PASS** | Validated cleanly in two separate journeys (Agency, Institute). |
| 7 | Can an admin operate the platform without contaminating customer navigation? | **PASS** | One of the strongest results in this validation — fully separate tree, confirmed in both admin journeys. |
| 8 | Can another marketplace be added without restructuring the navigation? | **PASS** | Marketplace is designed as a filter/facet within DISCOVER, never a navigational fork — consistent with Decision 3 by construction; no journey exercised a second marketplace directly, but nothing in DISCOVER's structure depends on Etsy specifically. |
| 9 | Can multiple connected shops be managed cleanly? | **NEEDS ADJUSTMENT** | The Shop selector concept exists, but its relationship to the Scope selector (pre-filtering by current Client/Cohort) needs to be made explicit rather than assumed — found via Journey 5. |
| 10 | Does the IA remain usable on mobile? | **PASS** | The general mobile rules (bottom tabs, collapsed switcher, back-stack) are sound. One risk worth watching, not a rule defect: deeply-nested Agency/Institute content (Org → Client → Shop → Listing → Issue) could produce long back-stacks on mobile — a scale question to test once real content exists, not evidence the mobile rules themselves are wrong. |

**Result: 7 PASS / 3 NEEDS ADJUSTMENT.**

---

## IA CHANGES REQUIRED BEFORE DESIGN

Only items that are genuinely necessary — all are **additive
clarifications** to the existing IA, not structural rewrites. Every one
of the eleven `[IA DECISION]`s recorded in
[information-architecture-v1.md](information-architecture-v1.md#ia-decisions)
survives this validation pass intact.

1. **Add `Prospect.status` as an explicit contextual action + filter**
   in DISCOVER → Prospects (Journey 1). Real, [CURRENT] schema that the
   IA simply didn't surface.
2. **Define the Sync vs. Scan relationship** in Operate IA — are they
   independent triggers, and does a first scan auto-run after first
   successful sync? (Journey 2, Stress Test #2.)
3. **Distinguish Advise vs. Apply** as two explicitly labeled action
   types wherever a loop's "Act"/"Optimize" stage appears, resolving the
   recurring ambiguity found in Journeys 3 and 4 and the Cross-Journey
   Problems table.
4. **Make explicit that the Shop selector pre-filters by the current
   Scope (Client/Cohort) when reached from within Agency/Institute
   contexts** (Journey 5, Stress Test #9) — currently implied, not
   stated, in Workspace Model.
5. **Define the deep-link path from the Optimization rollup into a
   specific shop's contextual Optimization detail** (Journey 5,
   Cross-Journey Problems).
6. **Add an Agency "client-initiated connect" flow**: a scoped
   connect-link the agency sends so the Client can complete OAuth
   themselves, without requiring the full "does a Client get a login"
   question to be resolved first (Journey 5 — the single largest gap
   found in this validation).
7. **Reuse Prospects' list pattern for the Institute Students tab**
   rather than leaving roster-scale display unspecified (Journey 6).
8. **Define a graceful-degradation response pattern for AI** as a
   first-class part of AI IA (Journey 7, Stress Test #5).
9. **Add a contextual Activity tab to Organization detail in Admin IA**,
   reusing the pattern already defined for Agency Client detail
   (Journey 8).
10. **Add read-scoped Organizations/customer lookup to the
    Accounts/Billing sub-admin department's scope**, and **define that
    each department's landing is its first available module** rather
    than a separate dashboard needing invention (Journey 9).

### Explicitly NOT changes to the IA

These findings are real but are **feature-scope or product-decision
gaps**, not IA defects, and are already tracked in
[product/complete-product-surface.md](../product/complete-product-surface.md)
or [MASTER_BLUEPRINT.md](../MASTER_BLUEPRINT.md) — adding them here
would conflate "the navigation model is wrong" with "the underlying
capability isn't built yet":

- Undefined "student progress" metric (Journey 6) — a product decision,
  not navigation.
- Unbuilt Verification workflow, unbuilt Audit log (Journey 8) — the IA
  correctly reserves their place; building them is separate work.
- Missing Compare feature (Journeys 1, 4) — already [FUTURE]-tagged.
- Undefined billing "resolution" action vocabulary beyond manual grants
  (Journey 9) — a billing-feature gap, not a navigation gap.
- The Individual→Agency conversion path (Cross-Journey Problems) —
  genuinely worth product-owner attention, but it's a data-migration/
  account-model question tied to the still-open `Organization.kind`
  decision, not something this IA document can resolve by rearranging
  navigation.

---

## IA STATUS

## READY FOR DESIGN

**Why**: all nine journeys were traceable through the proposed IA
without hitting a structural dead end, and every one of the eleven core
`[IA DECISION]`s made in
[information-architecture-v1.md](information-architecture-v1.md)
survived this validation pass unchanged — the Discover/Operate/Manage
split, the Research Shop/Connected Shop distinction, the three-switcher
model, the shared Intelligence component vocabulary, the
contextual+global hybrid pattern for Optimization and Reports, and the
fully separate Admin tree all held up under direct journey testing,
including the two journeys (8, 9) specifically designed to stress the
customer/admin boundary.

The stress test scored 7 PASS / 3 NEEDS ADJUSTMENT, and all three
NEEDS-ADJUSTMENT findings, plus the additional gaps found across the
nine journeys, resolve into **ten small, additive clarifications**
(above) — none require reworking the Core Product Model, the layer
hierarchy, the object model, or any role's IA. The single largest
finding (Journey 5's Agency OAuth-by-proxy gap) is a real and important
addition, but it's additive (a new connect-link flow) rather than
contradictory to anything already designed.

This validation deliberately did **not** downgrade the status to
"REQUIRES IA REVISION" for gaps that are actually unbuilt-feature or
undecided-product-decision problems (undefined student progress,
unbuilt Verification/Audit, missing billing resolution actions,
Individual→Agency conversion path) — those block *building* the
product, not *designing* its navigation, and are already tracked
elsewhere. Conflating the two would have produced a false negative.

**Recommendation — completed 2026-08-15**: the ten additive
clarifications were folded into
[information-architecture-v1.md](information-architecture-v1.md) as a
light update (not a v2 rewrite), per this recommendation. Proceed with
the design system as already recommended in
[information-architecture-v1.md §Recommended Next Design Phase](information-architecture-v1.md#recommended-next-design-phase) —
that dependency is now fully clear.
