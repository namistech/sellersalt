Status: Draft
Owner: [ASSUMPTION] Founder (Aliyan)
Last Updated: 2026-08-15
Decision State: This document proposes an Information Architecture built on the five locked product decisions in [MASTER_BLUEPRINT.md](../MASTER_BLUEPRINT.md) and the surface map in [product/complete-product-surface.md](../product/complete-product-surface.md). Decision 4 (2026-08-15, MCP/external AI agent access) added the "Developer & Integrations" Settings category below — see [Settings IA](#settings-ia) and [architecture/mcp.md](../architecture/mcp.md). Decision 5 (2026-08-15, Affiliate Program) added a new, capability-gated [Affiliate IA](#affiliate-ia) — its exact placement is explicitly [DECISION REQUIRED], not locked, per that decision's own scope. A 2026-08-15 documentation-hygiene pass folded all ten [ia-journey-validation.md](ia-journey-validation.md) clarifications in directly (see [IA DECISIONS](#ia-decisions) item 14), resolved Affiliate vs. Partner as independent relationships, and added MCP/Affiliate notification and mobile cross-references. IA structural choices below are marked **[IA DECISION]** (a design call this document is making, open to product-owner review) vs. **[DECISION REQUIRED]** (a genuinely open question this document cannot resolve on its own). No visual design, screens, or components are specified here.

# SellerSalt — Information Architecture v1

## Purpose and scope

This document defines the **product hierarchy and navigation model**
the future frontend will implement — not visual design, not screens,
not components. It answers "what exists, where does it live, who can
reach it, and how is it organized" so that
[docs/design/design-system-v1.md](design-system-v1.md) (the next
artifact) has a settled structural vocabulary to give visual form to,
instead of inventing structure and style simultaneously.

Every capability referenced here inherits its CURRENT/PLANNED/FUTURE/
DECISION REQUIRED status from
[product/complete-product-surface.md](../product/complete-product-surface.md) —
this document does not re-litigate what exists, only how it's organized
and navigated. Where this document proposes a structure for something
not yet built, that structure is itself FUTURE — it is a plan for how
to organize the thing once built, not a claim that it's built.

## Legend

- **[IA DECISION]** — a structural/navigational choice this document
  makes. These are open to challenge but represent a considered,
  reasoned default — not a placeholder.
- **[DECISION REQUIRED]** — a genuinely open question, usually because
  it depends on a product decision this document has no authority to
  make (e.g. billing model, exact permission granularity).
- Feature status tags (**[CURRENT]**/**[PLANNED]**/**[FUTURE]**) are
  inherited from [product/complete-product-surface.md](../product/complete-product-surface.md)
  and repeated here only where the status materially affects an IA
  choice (e.g. "this nav item only appears once X is built").

---

## CORE PRODUCT MODEL

```
SELLERSALT
│
├── DISCOVER   — marketplace/research intelligence (external market)
│
├── OPERATE    — the user's own connected commerce business
│
└── MANAGE     — organizations, people, clients, students, reports, admin

AI — a cross-product intelligence layer, not a fourth sibling area.
     Reachable globally and contextually from within DISCOVER, OPERATE,
     and MANAGE. See "AI IA" below.
```

**[IA DECISION]** This three-area model maps cleanly onto what already
exists, which is a good sign it's the right cut: today's sidebar
"Product hunting" group *is* DISCOVER, the admin-only "Your stores"
group *is* OPERATE (currently gated), and "Workspace"/"Admin" groups
*are* MANAGE. Adopting DISCOVER/OPERATE/MANAGE as the top-level model is
therefore a renaming-and-formalizing of the existing structure, not a
rebuild — see [design/navigation.md](navigation.md) for today's literal
sidebar code.

**[IA DECISION]** AI is deliberately not a fourth top-level area. A
standalone "AI" nav item that opens an isolated dashboard is the exact
anti-pattern the brief warns against (see [IA Anti-Patterns](#ia-anti-patterns)).
AI is designed as infrastructure reachable from everywhere, detailed in
[AI IA](#ai-ia).

---

## CRITICAL SHOP DISTINCTION

SellerSalt has two fundamentally different "shop" concepts, and this IA
is designed so a user can never reasonably confuse them:

| | Research Shop | Connected Shop |
|---|---|---|
| Backing model | `Prospect` / `ShopWatch` / `ShopSnapshot` | `SellerChannel` / `SellerOrder` |
| Belongs to DISCOVER or OPERATE | **DISCOVER** | **OPERATE** |
| Requires the shop owner's credentials | No — works cold, any Etsy shop | Yes — OAuth/API credentials |
| What it represents | Someone else's shop, researched | The user's own authenticated business |
| Status today | [CURRENT] | [CURRENT] (mechanism), admin-only (access) |

**[IA DECISION]** Naming rule: the word "Shop" is never used bare in
navigation, labels, or object references anywhere in the product. Every
surface says either **"Competitor Shop"**/**"Researched Shop"** (Research
Shop, always in DISCOVER) or **"Connected Shop"**/**"Your Store"**
(Connected Shop, always in OPERATE). This is a naming discipline, not
just a documentation convention — it should be enforced in copy review
whenever DISCOVER or OPERATE screens are designed.

**[IA DECISION]** The one place these two intentionally meet is
**Operate → Connected Shop → Competitors**, where a Connected Shop's
"who's my competition" view pulls Research Shop data from DISCOVER. This
is a deliberate bridge, not a merge: the view lives inside OPERATE (it's
about *my* shop's competitive position), but every Research Shop shown
inside it is visually/structurally tagged as Research Shop data (e.g. a
persistent "Research data" badge), and clicking through takes the user
into DISCOVER's Spy on Competitor experience for that shop — it does not
pretend the competitor is "another Connected Shop." See
[Operate IA](#operate-ia).

---

## CORE PRODUCT LOOPS

These are the loops this IA is designed around. They restate and
slightly refine the loops already recorded in
[product/complete-product-surface.md](../product/complete-product-surface.md#core-product-loops) —
treat that document's loop-by-loop CURRENT/FUTURE status as still
authoritative; this section exists to make the IA's structural
alignment to each loop explicit.

| Loop | Stages | Maps to IA area |
|---|---|---|
| Discover | Research → Discover → Analyze → Save → Compare → Decide | DISCOVER |
| Operate | Connect → Sync → Scan → Diagnose → Prioritize → Optimize → Measure → Re-scan | OPERATE |
| Competitor | Discover → Track → Compare → Learn → Act → Monitor | DISCOVER (Track/Compare/Learn/Monitor), bridges into OPERATE (Act, if the action is applied to the user's own shop) |
| Agency | Onboard Client → Connect Shop → Diagnose → Optimize → Report → Demonstrate Outcome → Retain Client | MANAGE (Onboard/Report/Retain), OPERATE (Connect/Diagnose/Optimize, performed *on behalf of* a Client's shop) |
| Institute | Enroll Student → Connect Shop → Learn → Execute → Track Progress | MANAGE (Enroll/Track Progress), OPERATE (Connect Shop, performed *by* the Student), DISCOVER (Learn/Execute — the student's actual research practice) |
| AI | Ask → Retrieve Intelligence → Analyze → Recommend → Act → Measure | Cross-cutting — pulls from DISCOVER/OPERATE data, surfaces results wherever asked, and "Act" routes through the same action mechanisms OPERATE's Optimization loop already defines |

**[IA DECISION]** Every loop except Discover and Competitor eventually
routes through OPERATE's Diagnose/Optimize/Measure stages. This is
intentional: OPERATE's Optimization module (see below) is designed as
the **single shared engine** every other loop calls into, rather than
each loop (Agency, Institute, AI) reimplementing its own
diagnose/optimize/measure logic. Reinforced in
[Optimization IA](#optimization-ia).

---

## USER EXPERIENCES

**[IA DECISION]** The IA is not duplicated per role. There is **one**
DISCOVER, **one** OPERATE, **one** MANAGE structure. Roles differ along
exactly two axes: **which MANAGE sub-trees exist for their org type**
(Agency gets Clients, Institute gets Cohorts/Students, Admin gets the
Admin tree) and **visibility/action scope within those trees**
(Owner/Admin vs. Employee/Staff vs. Client/Student).

| Role | Shared IA | Role-specific extension | Role-specific visibility | Role-specific actions |
|---|---|---|---|---|
| Individual Starter | DISCOVER, MANAGE (Account/Billing/Settings), AI (limited) | None | Own data only | Plan-limited (lower `Package` caps) |
| Individual Pro | Same as Starter | None | Own data only | Plan-limited (higher `Package` caps) |
| Agency Owner | DISCOVER, OPERATE, MANAGE, AI | Clients, Employees, agency Billing/Reports | All clients, all employees | Full manage across Agency org |
| Agency Employee | DISCOVER, OPERATE (for assigned clients), MANAGE (own profile only), AI | Clients (assigned subset) | Only assigned clients/shops | Scoped to assigned clients — no Employee mgmt, no Billing (unless granted) |
| Institute Owner/Admin | DISCOVER, OPERATE, MANAGE, AI | Cohorts, Students, Staff, institute Billing/Reports | All cohorts, all staff, all students | Full manage across Institute org |
| Institute Staff | DISCOVER, OPERATE (for assigned cohorts), MANAGE (own profile only), AI | Cohorts (assigned subset), Students within those cohorts | Only assigned cohorts | Scoped to assigned cohorts — no Staff mgmt, no Billing |
| Institute Student | DISCOVER, OPERATE (own single Connected Shop only), AI | Own Progress view | Only own data; no visibility into other students | Cannot manage org, employees, billing, or other students; **[IA DECISION]** may see anonymized cohort benchmarks (see [Institute IA](#institute-ia)) |
| Super Admin | Admin tree (separate from DISCOVER/OPERATE/MANAGE — see [Admin IA](#admin-ia)) | Full Admin tree | Cross-org, platform-wide | Full platform administration |
| Sub-admin | Admin tree, department-scoped subset | Department-specific tools only | Scoped to department's data domain | Scoped to department's allowed actions — see [product/complete-product-surface.md §18](../product/complete-product-surface.md#18-sub-admin--department-system) |

---

## INFORMATION ARCHITECTURE LAYERS

```
GLOBAL
  ↓
WORKSPACE / ORGANIZATION
  ↓
PRODUCT AREA
  ↓
MODULE
  ↓
OBJECT
  ↓
ACTION
```

| Layer | What belongs here | Examples |
|---|---|---|
| **Global** | Elements available regardless of workspace/product-area context: app shell, AI entry point, notification bell, account menu, (conditionally) workspace switcher | AI launcher, notification center icon, "Ask AI" |
| **Workspace/Organization** | The org context currently active — determines which Product Areas and Modules are even visible | "Seller Salt Administration" org, an Agency org, an Institute org |
| **Product Area** | DISCOVER / OPERATE / MANAGE (customer-facing), Admin (separate tree, admin-only) | |
| **Module** | A coherent group of related screens within a Product Area | Prospects, Connected Shops, Clients, Billing |
| **Object** | A specific, addressable instance | A `Prospect` row, a Connected Shop, a Client, a Report |
| **Action** | A verb performed on an object | Search, Favorite, Track, Connect, Sync, Diagnose, Optimize, Generate report, Invite, Assign permission |

**[IA DECISION]** Nothing above Object level should ever require more
than **3 clicks/taps** to reach from the Global layer for a role that
has access to it (Workspace context is usually already set; Product
Area → Module → Object is the 3-click budget). Anything requiring more
depth than that is a signal the Module needs restructuring, not that
users should tolerate deeper nesting — see [Navigation Principles](#navigation-principles).

---

## WORKSPACE MODEL

### Individual / Agency / Institute / Admin

**[IA DECISION]** These four are **not** rendered as a single unified
shell with conditional sections bolted on. Each is a distinct Workspace
*type*, sharing the same Product Area/Module vocabulary (DISCOVER/
OPERATE/MANAGE) but with MANAGE's sub-tree genuinely different per type.
Admin is structurally separate again — see [Admin IA](#admin-ia).

### Organization detail hierarchy

```
Organization
  → Context        (which org/client/cohort scope is currently active)
  → Members         (people with login access to this org)
  → Clients/Cohorts  (Agency: Clients: Institute: Cohorts — absent for Individual)
  → Shops            (Connected Shops belonging to this org or its clients/students)
  → Intelligence     (health/scores/recommendations — see Intelligence IA)
  → Reports          (see Reporting IA)
  → Settings
```

Individual orgs have a **degenerate version** of this same tree (no
Clients/Cohorts node, at most one Connected Shop today gated to
admin-only) — **[IA DECISION]** this is intentional: Individual is not
a separate IA, it's this same tree with fewer populated branches, which
is what makes "don't duplicate the IA per role" actually true
structurally, not just in principle.

### Switchers — three distinct concepts, not one

**[IA DECISION]** This is the single most important workspace-model
decision in this document. Three genuinely different "which context am
I in" mechanisms exist, and conflating them into one dropdown is a
named anti-pattern (see [IA Anti-Patterns](#ia-anti-patterns)):

| Switcher | Switches between | Who needs it | How often used |
|---|---|---|---|
| **Workspace switcher** | Entire Organizations (e.g. a user who is a member of two separate orgs) | Rare — today's login model picks `memberships[0]` as primary and most users belong to exactly one org (see [architecture/organizations.md](../architecture/organizations.md)) | Rare |
| **Scope selector** | Client (Agency) or Cohort (Institute) *within* one Organization | Agency Employees, Institute Staff, and Owners/Admins working across multiple clients/cohorts | Frequent |
| **Shop selector** | Which Connected Shop's OPERATE workspace is active, when more than one exists | Anyone (Individual, Client, Student) with more than one Connected Shop | Frequent once multi-shop is common |

**[IA DECISION]** The Workspace switcher should **only render at all**
for users who actually have multiple org memberships — it must not be
a permanent chrome element every user sees, since the vast majority have
exactly one org. **[DECISION REQUIRED]**: whether multi-org membership
becomes a real, supported, switcher-driven feature, or stays the
schema-only allowance it is today (the schema permits multiple
`Membership` rows per `User`, but login only ever surfaces one) — see
[architecture/organizations.md](../architecture/organizations.md).

The Scope selector and Shop selector are both expected, frequent UI,
but are **not the same control** — Scope selector changes *whose*
Clients/Cohort data you're viewing (a MANAGE-layer concept); Shop
selector changes *which Connected Shop's* OPERATE workspace is active (a
Product-Area-layer concept), and only matters once inside OPERATE.

**Folded in from [ia-journey-validation.md, Journey 5](ia-journey-validation.md#5-agency)
and Stress Test #9.** **[IA DECISION]**: they nest, not run in parallel
— **the Shop selector's options are pre-filtered by the current Scope
selection** whenever both are active (i.e. inside an Agency/Institute
context). Selecting a different Client/Cohort in the Scope selector
implicitly changes which shops the Shop selector can even offer; the
Shop selector never lists shops belonging to a Client/Cohort outside the
current Scope. This relationship was previously implied, not stated —
it is now explicit so a future implementation doesn't build the two
selectors as independently-populated siblings.

---

## DISCOVER IA

**Current state**: this is SellerSalt's most mature area — see
[product/complete-product-surface.md §3, §6](../product/complete-product-surface.md).
The existing sidebar (`src/app/(dashboard)/sidebar.tsx`) already gets
this largely right; this IA formalizes it rather than replacing it.

```
DISCOVER
├── Prospects              (primary nav)
│     tabs: Results | Filters(as panel, not tab) | Saved Searches
├── Spy on Competitor       (primary nav)
│     → Competitor Shop detail
│         tabs: Overview | Products/Listings | History (ShopSnapshot) | Keywords (long-tail extraction)
├── Trends                 (primary nav)
├── Dropped Shops          (primary nav)
├── Favorites               (primary nav)
└── Collections             (FUTURE — see below)
```

| Item | Placement | Status |
|---|---|---|
| Prospects, Spy, Trends, Dropped Shops, Favorites | **Primary navigation** | [CURRENT] |
| Saved searches (`SearchConfig` list) | **Secondary nav / tab** within Prospects, not its own primary item | [CURRENT] (data exists as `SearchConfig`) |
| Scheduled searches | **A property of a saved search** (a schedule toggle + cron field on that search), not a separate nav destination | [CURRENT] |
| Filters (keyword, price, shop age, review count) | **Filter panel** within Prospects' Results view | [CURRENT] |
| Sorting | **Inline list control**, not nav | [CURRENT] |
| Competitor Shop tabs (Overview/Listings/History/Keywords) | **Tabs** on the Competitor Shop detail object | [CURRENT] |
| Favorite, Track, Export CSV | **Contextual (row/detail) actions** | [CURRENT] |
| `Prospect.status` (Shortlist / Reject / Mark Contacted) | **Folded in from [ia-journey-validation.md, Journey 1](ia-journey-validation.md#1-individual--product-discovery)**: explicit **contextual action** on each Prospect row/detail (Shortlist/Reject/Mark Contacted), plus a **filter** in the Results view — this is real, [CURRENT] schema (`PENDING_REVIEW`/`SHORTLISTED`/`CONTACTED`/`REJECTED`) that earlier IA passes never surfaced; it is arguably the loop's actual "Decide" step | [CURRENT] (schema), addition is IA-placement only |
| Compare (multi-select prospects/shops) | **Contextual action** (multi-select → Compare), not nav | [FUTURE] |
| Collections | **[IA DECISION]**: if built, sits alongside Favorites as a secondary nav item under Prospects/Favorites, and Favorites is reframed as the default system Collection rather than a parallel concept — avoids two competing "saved things" mechanisms long-term | [FUTURE] |

**[IA DECISION]** Nothing in DISCOVER should ever branch by marketplace
(e.g. no separate "Etsy Prospects" vs. "eBay Prospects" nav items).
Marketplace is a **filter/facet** within a single unified DISCOVER
experience, consistent with Decision 3's marketplace-agnostic direction
— see [architecture/marketplace.md](../architecture/marketplace.md) and
[IA Anti-Patterns](#ia-anti-patterns) ("platform-specific navigation
everywhere").

---

## OPERATE IA

**Current state**: the mechanism (OAuth, sync) is [CURRENT] but
admin-only; almost everything else here is [FUTURE]. The brief's
"potential structure" was evaluated and **substantially simplified**
below — several proposed pages are folded into shared cross-product
systems instead of becoming standalone OPERATE pages, per the brief's
own instruction not to blindly accept the starting structure.

### Evaluation of the brief's proposed structure

The brief proposed: Connected Shops → Shop Overview → Health → Products
→ Listings → SEO → Optimization → Analytics → Competitors →
Recommendations → Alerts → Reports (11 nodes under one shop).

**[IA DECISION]** Three of those nodes should **not** be standalone
OPERATE pages:
- **Recommendations** — a recommendation is always an *output* of
  Optimization (or of Shop Health assessment). It should render inline
  wherever relevant (Overview, Optimization), using the shared
  Intelligence card pattern (see [Intelligence IA](#intelligence-ia)),
  not live on its own page. A standalone "Recommendations" page would
  either duplicate Optimization's content or become an orphaned list
  with no clear relationship to the issues it addresses.
- **Alerts** — shop-specific alerts are a *filtered view* of the global
  Notification Center (see [Notifications IA](#notifications-ia)), not
  a separate per-shop alerts page. A separate Alerts page per Connected
  Shop would mean N alert inboxes for N shops, which fails immediately
  once a user (or Agency employee) has more than one or two shops.
- **Reports** — shop-specific reports are a *contextual entry point*
  into the global Reports hub (see [Reporting IA](#reporting-ia)),
  filtered to this shop — not a separate reporting system per shop.

### Resulting structure

```
OPERATE
└── Connected Shops                    (primary nav — Shop selector if >1)
      → [a single Connected Shop workspace]
            Overview          (health/score summary, at-a-glance — the landing tab)
            Products           (the user's OWN listings — distinct from DISCOVER's Products, which are others')
            Listings / SEO     (per-listing audit — see Listing/SEO Intelligence)
            Optimization       (issues, priorities, recommendations, actions, before/after, history)
            Analytics          (revenue/orders — [CURRENT] mechanism, admin-only access today)
            Competitors        (bridge into DISCOVER — see Critical Shop Distinction above)
      (Recommendations, Alerts, Reports: NOT separate tabs — surfaced via
       Intelligence patterns, Notification Center, and Reports hub respectively)
```

| Tab | Status | Notes |
|---|---|---|
| Overview | [FUTURE] | Landing tab; shows health score summary once Shop Intelligence exists |
| Products | [FUTURE] | See [Product Intelligence](../product/complete-product-surface.md#8-product-intelligence) |
| Listings / SEO | [FUTURE] | See [Listing/SEO Intelligence](../product/complete-product-surface.md#9-listing--seo-intelligence) |
| Optimization | [FUTURE] | See [Optimization IA](#optimization-ia) below |
| Analytics | [CURRENT] mechanism, admin-only access | Currency-aware, per-store, never blended — see [product/product-map.md](../product/product-map.md) |
| Competitors | [FUTURE] (as an OPERATE bridge view); underlying data [CURRENT] in DISCOVER | |

### Sync vs. Scan — two distinct, independently-triggered events

**Folded in from [ia-journey-validation.md, Journey 2](ia-journey-validation.md#2-connected-seller--shop-diagnosis).**
**[IA DECISION]** These are two separate triggers, not one:

- **Sync** — order data import (`sync-seller-channel.ts`, [CURRENT]).
  Runs on connect, then on a schedule, independent of anything below.
  Populates Analytics.
- **Scan** — a health/issue audit (the "audit" step in
  [Optimization IA](#optimization-ia) below). [FUTURE] — does not exist
  yet, and does **not** run automatically as part of Sync.

**[IA DECISION]** A first Scan **auto-triggers** on first successful
Sync, so a newly-connected shop's Overview never sits in an unexplained
empty state — the alternative (no scan until the user manually presses
"Scan now" with no prompt to do so) is explicitly rejected. Overview
must show a clear "syncing…" / "scanning…" / distinct-from-each-other
state while each is in progress, since a shop can be synced but not yet
scanned (data exists, no health score yet) or scanned-once-then-newly-
resynced (data changed, prior score may be stale) — these are
different states and must not be visually conflated.

### Multiple Connected Shops

**[IA DECISION]** When a user/Client/Student has more than one
Connected Shop, OPERATE's entry point is the **Shop selector**
(distinct from the Workspace switcher and Scope selector — see
[Workspace Model](#workspace-model)). Selecting a shop enters that
shop's workspace (the tab structure above); there is no "all shops
merged" Overview by default, consistent with the existing principle of
never blending currency/per-store data misleadingly (see
[design/ux-principles.md](ux-principles.md) "Never blend what shouldn't
be blended"). **[IA DECISION]**: an aggregate cross-shop rollup *does*
belong in OPERATE for multi-shop contexts, but as a distinct, explicitly
aggregate view (e.g. "All Shops" as the first item in the Shop
selector, clearly labeled as a rollup) — not the default per-shop
Overview silently averaging shops together.

---

## INTELLIGENCE IA

**[IA DECISION]** Health, Score, Benchmark, Opportunity, Issue,
Recommendation, Trend, Alert, Insight, Action, and Outcome are **not**
each a page.** They are **object types** rendered through a shared set
of UI patterns (a Score badge, an Issue card, a Recommendation card, a
Trend sparkline, an Alert item) and always attached to a parent object
— a Score belongs to a Shop or Listing; an Issue belongs to a Shop or
Listing; a Recommendation belongs to an Issue; an Alert belongs to
whatever triggered it (and also surfaces in the Notification Center).

| Intelligence object | Lives as a child of | Rendered via |
|---|---|---|
| Health / Score | Connected Shop, Listing, (Competitor Shop's Difficulty/Demand score) | Score badge component |
| Benchmark | A comparison always references two objects (a Shop vs. market, or a Student's shop vs. cohort median) | Benchmark comparison component |
| Opportunity | Market/Trend data, or a Shop's own gap analysis | Opportunity card |
| Issue | Connected Shop, Listing | Issue card, feeds Optimization |
| Recommendation | An Issue | Recommendation card, feeds Optimization's action step |
| Trend | Category/keyword/market data | Trend sparkline/chart, DISCOVER's Trends module |
| Alert | Any triggering object (Shop, Competitor, Optimization) | Alert item, surfaces in Notification Center — see [Notifications IA](#notifications-ia) |
| Insight | Any of the above, narratively framed (e.g. AI-generated) | Insight card — likely the AI assistant's primary output format |
| Action | A Recommendation, taken by a user — classified Advise/Prepare/Apply, see [Optimization IA](#optimization-ia) | Logged against Optimization history |
| Outcome | A before/after comparison of Scores across two points in time | Outcome/before-after component |

**[IA DECISION]** This is the concrete mechanism behind the brief's
"SellerSalt's intelligence should feel like a coherent system" goal:
one component vocabulary, reused everywhere (DISCOVER's competitor
scores, OPERATE's shop health, MANAGE's client health rollups, AI's
result cards), rather than a bespoke visual language invented per
feature. This has direct design-system implications — see
[Design Dependencies](#design-dependencies).

---

## OPTIMIZATION IA

**[IA DECISION]** Optimization is a **hybrid**: contextual by default,
with one standalone cross-object rollup for multi-shop contexts.

**Reasoning**: Optimization is inherently "optimization *of* something"
— a contextual detail page inside each Connected Shop is the natural
home for it (audit results, issues, recommendations, and history all
belong to that specific shop). But an Agency employee managing ten
client shops, or an Institute staff member overseeing thirty student
shops, needs **one place** to see every open issue across everything
they're responsible for — checking ten separate per-shop pages
one-by-one doesn't scale. So:

```
Contextual (primary): OPERATE → Connected Shop → Optimization
  audit          (the scan action + its resulting snapshot)
  issues          (detected problems, this shop)
  priorities      (issues ranked/triaged)
  recommendations (prescribed fixes per issue)
  action           (Advise / Prepare / Apply — see below — logged)
  before/after     (snapshot comparison across two audits)
  outcome           (measured score delta after action)
  history            (full audit/action log for this shop)

Standalone (rollup, multi-shop contexts only):
  MANAGE → [Clients/Cohorts] → "Optimization Queue"
  — an aggregate, cross-shop view of open issues/priorities,
    filterable by client/cohort/employee, that deep-links into
    each shop's contextual Optimization detail for action
```

**[IA DECISION]** The rollup view is **read/triage only** — it
surfaces "what needs attention across everything I manage" and
deep-links to the actual contextual Optimization page to take action.
It does not duplicate the action/audit mechanics.

**Folded in from [ia-journey-validation.md, Journey 5](ia-journey-validation.md#5-agency)
and Cross-Journey Problems.** **[IA DECISION]**: the deep-link is
row-level, not page-level — selecting a specific issue in the rollup
navigates directly into that issue's contextual detail within the
correct shop's Optimization tab (pre-scrolled/highlighted to that
issue), not merely to the shop's Optimization tab in general. This was
previously assumed, not specified.

**Folded in from [ia-journey-validation.md, Journeys 3 and 4](ia-journey-validation.md#3-connected-seller--optimization)
and Cross-Journey Problems** (the word "Act" recurring across Discover/
Operate/Competitor loops with three different meanings). **[IA
DECISION]**: every "action" step anywhere in this document — here, in
[Intelligence IA](#intelligence-ia)'s "Action" object, and in [AI
IA](#ai-ia)'s "Actions from recommendations" — is explicitly one of:

- **Advise** — SellerSalt tells the user what to do; the user acts
  outside SellerSalt (on the actual marketplace/their own store), then a
  re-scan is what proves it happened. The only tier that exists for any
  capability today (everything CURRENT is Advise-only, since nothing
  writes back to a customer's store).
- **Prepare** — SellerSalt stages a proposed change for the user's
  review inside SellerSalt, before anything is applied. [FUTURE].
  Reuses the identical vocabulary later locked for MCP tool
  classification — see
  [architecture/mcp.md §Action lifecycle](../architecture/mcp.md#action-lifecycle-advise--prepare--apply--automate).
- **Apply** — SellerSalt executes the change itself, via the
  seller-channel write scope already granted (see
  [architecture/integrations.md](../architecture/integrations.md)) but
  with no push logic built anywhere yet — the closest existing analog is
  the schema-only `CrossListing`. [FUTURE], not to be assumed to exist.

A future screen must **label which tier a given action is** (an
"Advise" issue looks and behaves differently from an "Apply" issue) —
never a single undifferentiated "Act"/"Optimize now" button, matching
the hard constraint already independently established in
[design/frontend-execution-plan-v1.md §15](frontend-execution-plan-v1.md#15-optimization-wave).

---

## AGENCY IA

Domain locked (Decision 1):

```
Agency Organization
├── Employees
└── Clients
    └── Client Shops
```

```
MANAGE (Agency org)
├── Agency Overview                (dashboard — rollup across all clients)
├── Clients
│     → Client detail
│         Overview | Shops | Optimization (contextual, see above) | Reports/Proof Reports | Activity
├── Employees                      (Owner-only)
│     → Employee detail: assigned Clients, Role/Permissions
├── Reports                        (Agency-wide, cross-client — see Reporting IA)
├── Billing                        (Owner-only)
└── Settings                       (Owner-only; Employees see own profile only)
```

| Screen/node | Owner/Admin sees | Employee sees |
|---|---|---|
| Agency Overview | Full rollup, all clients | [DECISION REQUIRED]: a scoped rollup of just their assigned clients, or no Overview at all (going straight to their Client list)? This document recommends the scoped rollup for consistency, but it's not decided. |
| Clients (list) | All clients | Only assigned clients |
| Client workspace | Full access (Shops, Optimization, Reports, Activity) | Full access, but only for assigned clients |
| Employees | Full manage (invite, assign roles/permissions/clients) | Not visible |
| Reports | Agency-wide, all clients | Scoped to assigned clients |
| Billing | Full manage | Not visible unless explicitly granted via `Permission` |
| Settings | Full manage | Own profile only |

**[IA DECISION]** "Agency Overview" must be its own dashboard, framed
around Client health/activity rollups — not the Individual dashboard
with a "Clients" tab appended. This is the direct fix for the named
anti-pattern "agency UI feeling like a modified individual account."

### Client-initiated connect flow

**Folded in from [ia-journey-validation.md, Journey 5](ia-journey-validation.md#5-agency)
— the single largest gap found in that validation pass.** **[IA
DECISION]**: "Connect Shop" inside a Client's workspace is not a simple
step an Agency Employee performs directly — OAuth (Shopify/WooCommerce/
Etsy-seller) requires the *actual store owner* to approve the
authorization, which the Employee is not. The Agency IA therefore adds:

```
Client detail → Shops tab → "Invite client to connect"
  → generates a scoped connect-link (time-limited, tied to this Client record)
  → sent to the client (email, or copy-link) — does NOT require the
    Client to have a SellerSalt login
  → Client opens the link → completes OAuth themselves (their own
    marketplace credentials, their own approval)
  → resulting SellerChannel/Shop attaches to this Client record
  → Client detail shows a "Waiting for [Client] to connect" pending
    state until this completes
```

This does **not** require resolving the open "does a Client get their
own login" question ([architecture/organizations.md](../architecture/organizations.md)) —
a connect-link works without one, and remains valid if that question is
later resolved either way. Client detail should also show, bidirectionally, which Employee(s) are assigned to it (today only Employee
detail shows assigned Clients) — a minor, related gap from the same
journey.

---

## INSTITUTE IA

Domain locked (Decision 1):

```
Institute Organization
├── Staff
└── Cohorts
    └── Students
        └── Student Shops
```

```
MANAGE (Institute org)
├── Institute Overview             (dashboard — rollup across all cohorts)
├── Cohorts
│     → Cohort detail
│         Overview | Students | Progress rollup | Cohort Analytics
├── Students                       (cross-cohort list, filterable)
│     → Student workspace
│         Overview | Shop (single Connected Shop, OPERATE-scoped) | Progress | Reports
├── Staff                          (Owner/Admin-only)
│     → Staff detail: assigned Cohorts, Role/Permissions
├── Reports                        (institute-wide + per-cohort + per-student — see Reporting IA)
├── Billing                        (Owner/Admin-only)
└── Settings                       (Owner/Admin-only; Staff/Students see own profile only)
```

| Screen/node | Owner/Admin sees | Staff sees | Student sees |
|---|---|---|---|
| Institute Overview | Full rollup, all cohorts | Scoped to assigned cohorts | Not visible |
| Cohorts | All | Assigned subset | Not visible (a Student belongs to exactly one Cohort, doesn't browse others) |
| Cohort detail (Students, Progress, Analytics) | Full | Assigned cohorts only | Not visible |
| Students (cross-cohort list) | Full | Assigned cohorts only | Not visible |
| Student workspace | Full, any student | Assigned cohorts' students | **Only their own** |
| Staff | Full manage | Not visible | Not visible |
| Reports | Institute-wide | Assigned cohorts | Own reports only |
| Billing | Full manage | Not visible | Not visible |

**[IA DECISION]** A Student's IA is the **narrowest** of any role: DISCOVER
(full — research practice is core to learning), OPERATE (exactly one
Connected Shop, no shop selector needed since there's only ever one),
AI (available, since it's core intelligence, not an admin tool), and a
Progress view. No Clients/Cohorts/Employees/Staff/Billing/Settings
beyond their own profile.

**[IA DECISION]** Students **may** see an anonymized cohort benchmark
(e.g. "your shop health is in the top 30% of your cohort") without
seeing individual peers or their data — this is the concrete
implementation of the "cohort-relative benchmarking" idea flagged as
[RECOMMENDED] in [product/complete-product-surface.md](../product/complete-product-surface.md#product-gaps--opportunities).
It renders via the shared Benchmark component (see
[Intelligence IA](#intelligence-ia)), scoped to the Student's own
Progress view — not a separate Cohort-visibility page.

### Scanning a large roster

**Folded in from [ia-journey-validation.md, Journey 6](ia-journey-validation.md#6-institute).**
**[IA DECISION]**: the Cohort detail's Students tab and the cross-cohort
Students list both **reuse DISCOVER → Prospects' proven sortable/
filterable list pattern** rather than a new roster-scale view being
invented — a Cohort of 30+ Students needs the same sort/filter/at-a-
glance affordances Prospects already has, not a bespoke component.
**[IA DECISION]**: "at-risk student" flagging (once Progress itself is
defined — see [product/personas.md](../product/personas.md) "Still
open") is scoped as an application of the existing **Alert** Intelligence
object (see [Intelligence IA](#intelligence-ia)) to Student objects, not
a new mechanism — consistent with every other alert type in this
document.

---

## AI IA

AI is a cross-product intelligence layer — see
[architecture/ai.md](../architecture/ai.md) and
[ai/assistant.md](../ai/assistant.md) for the full architecture/product
analysis this IA section builds on. Nothing here is built yet.

**Not to be confused with MCP**: this section is entirely about the
SellerSalt AI Assistant experience *inside* SellerSalt's own UI (the
launcher, conversation surface, contextual entry points below). External
AI agents calling into SellerSalt from *outside* its UI are a separate
surface — SellerSalt MCP — with its own IA under **Settings → Developer
& Integrations → AI/MCP** (see [Settings IA](#settings-ia)), not a
sub-item of this section. Both consume the same underlying Backend
Domain Services layer (see
[architecture/system.md §Service layer terminology](../architecture/system.md#service-layer-terminology--two-distinct-things-same-phrase));
see also [architecture/mcp.md §Distinguishing the three AI/agent surfaces](../architecture/mcp.md#distinguishing-the-three-aiagent-surfaces).

```
AI (cross-cutting, not a Product Area)
├── Global entry point       — persistent, reachable from anywhere (Global layer)
├── Contextual entry points   — "Ask AI about this [Shop/Listing/Report/Trend]"
│                                 embedded on relevant object detail pages
├── Conversation                — the actual dialogue surface
├── Suggested/predefined queries — seeded from the brief's example list
├── Query history
├── Saved queries
├── Tool results
│     — rendered via the SAME Intelligence component vocabulary
│       (Score badges, Issue/Recommendation cards, charts/tables) —
│       not a bespoke AI-only rendering system
├── Actions from recommendations
│     — routes through the SAME action mechanism as Optimization's
│       action step (see Optimization IA) — no separate "AI action" path
└── AI settings                  — tool permissions, usage limits (plan-gated)
```

**[IA DECISION]** Global entry point is a **persistent, always-visible
affordance** (e.g. docked launcher or command-palette-style trigger),
not a nav item that opens an isolated "/assistant" dashboard page. This
is the direct structural fix for "AI as a gimmick page" (see [IA
Anti-Patterns](#ia-anti-patterns)).

**[IA DECISION]** Contextual entry points pre-seed the assistant with
the current object's context (e.g. clicking "Ask AI" on a Connected
Shop's Overview opens a conversation already scoped to that shop) —
this is what makes AI feel embedded rather than bolted on.

**[IA DECISION]** Tool results and Actions deliberately reuse existing
component/action vocabularies (Intelligence cards, Optimization's action
mechanism) rather than inventing AI-specific equivalents — this is a
direct consequence of the "coherent system" principle in
[Intelligence IA](#intelligence-ia) and avoids two different ways to
"apply a fix" (one from Optimization directly, one from an AI
recommendation) that would otherwise confuse users about which is
authoritative.

**[DECISION REQUIRED]**: exact tool permission granularity (per-plan?
per-role? per-tool?) — see [architecture/ai.md](../architecture/ai.md).

### Graceful degradation

**Folded in from [ia-journey-validation.md, Journey 7](ia-journey-validation.md#7-ai-copilot)
and Stress Test #5.** **[IA DECISION]**: "the Assistant doesn't have a
tool/data to answer this yet" is a **first-class, explicit response
state**, not an edge case and not silently absent or hallucinated —
given how much of the tool registry is [FUTURE]
([architecture/ai.md](../architecture/ai.md)), this will be a *common*
response for a long time, not rare. The response must say plainly what
is and isn't available (consistent with the existing UX principle that
editorial judgment must be labeled as such, never presented as
confident fact it isn't). This is not a new screen — it's a required
variant of the Tool results/Conversation surface above, and applies
identically to any future MCP tool call that hits an ungranted or
unbuilt capability (see
[architecture/mcp.md §Tool philosophy](../architecture/mcp.md#tool-philosophy)).

---

## REPORTING IA

**[IA DECISION]** Reporting is a **hybrid**, same reasoning pattern as
Optimization: a global hub for discovery/history, contextual entry
points for creation.

```
MANAGE → Reports (global hub — index of everything the user/org can see)
├── My Reports               (Individual)
├── Shop Reports
├── Product Reports
├── Competitor Reports
├── Optimization Reports      (before/after)
├── Client Reports            (Agency)
├── Student/Cohort Reports     (Institute)
└── Shared Reports             (anything with an external share link)

Contextual entry points ("Generate report" / "View reports"):
  on Connected Shop, Client, Cohort, Student — each surfaces its own
  reports filtered from the same underlying Report objects, and can
  trigger generation directly from that context.
```

**[IA DECISION]** "Shared Reports" is not a structurally different
object — it's any `Report` with a share-token attached, surfaced
together in the hub for visibility ("what have I shared, with whom")
rather than living in a separate system. See
[product/complete-product-surface.md §12](../product/complete-product-surface.md#12-reporting)
for what's built (nothing) vs. planned (Agency proof reports, named
Decision-1 capability).

---

## NOTIFICATIONS IA

```
Global Notification Center (one inbox)
├── System notifications      (invite accepted, sync completed, etc.)
├── Billing notifications      (payment failed, renewal, etc.)
├── Team activity               (member joined, role changed)
├── Shop alerts                  ← Intelligence Alert objects, filtered
├── Competitor alerts             ← Intelligence Alert objects, filtered
├── Optimization alerts            ← Intelligence Alert objects, filtered
├── MCP / Agent alerts              (credential revoked, rate-limit warning,
│                                     tool call failed — added 2026-08-15,
│                                     see architecture/mcp.md §Rate limiting
│                                     & usage tracking)
└── Affiliate alerts                 (application approved/rejected, commission
                                       approved, payout sent/failed — added
                                       2026-08-15, see architecture/affiliate.md
                                       §Affiliate ledger)

Notification preferences (Settings → Notifications):
  per-category opt-in/out — billing always-on, others configurable
```

**[IA DECISION]** "Notifications" (operational, event-driven: an invite
was accepted, a payment failed, a sync completed) and "intelligence
alerts" (analytical, threshold-driven: a competitor dropped price, a
score fell) are **different data sources feeding one shared inbox UI**,
not two separate systems. This directly avoids the "settings/alerts
scattered everywhere" anti-pattern while still letting a user mute
analytical alerts without risk of also muting a payment-failure notice
(each category independently toggleable in preferences, but billing is
non-optional).

**Folded in from the Final Architecture Reconciliation pass (2026-08-15)**:
[architecture/mcp.md](../architecture/mcp.md) and
[architecture/affiliate.md](../architecture/affiliate.md) each describe
their own internal audit/ledger event logs, but neither previously
cross-referenced this already-designed unified inbox for the subset of
their events that are genuinely user-facing alerts (as opposed to
internal audit trail). **[IA DECISION]**: MCP's user-facing events
(credential revoked, rate-limit warning, tool call failed) and
Affiliate's user-facing lifecycle events (application approved/
rejected, commission approved, payout sent/failed) both route through
this same Notification Center — as their own filterable categories,
same as Shop/Competitor/Optimization alerts above — rather than either
system inventing its own separate inbox. The Gateway's internal audit
log (mcp.md) and the affiliate ledger's own entries (affiliate.md)
remain the durable record; the Notification Center is the **read-facing
surface** over a subset of those events, not a duplicate store.

---

## SETTINGS IA

**[IA DECISION]** The brief's proposed list (Account, Workspace,
Members, Roles & Permissions, Shops/Connections, Notifications, Billing,
Integrations, Security, Privacy, AI, Data, Appearance) was evaluated and
adjusted:

- **Appearance — removed.** Decision 2 locks a single light-only theme
  with no dark mode; there is nothing to toggle. Reintroducing an
  Appearance section would imply a choice that doesn't exist. If dark
  mode is ever explicitly reintroduced (per Decision 2's own escape
  hatch), Appearance can be added back then.
- **Integrations — folded into Connections.** Today the only
  "integrations" are Connected Shop OAuth connections
  (`SellerChannel`); a separate "Integrations" section would be empty
  and redundant. Renamed the combined section **Connections** to also
  cover any future non-shop integration without implying shops and
  integrations are different things today.
- **Data — merged into Privacy**, as **Privacy & Data**, since both are
  small, related, and compliance-driven (GDPR export/deletion + consent)
  — keeping them separate would fragment a section neither is large
  enough to justify alone.
- **Security — kept separate from Account**, even though small today,
  because it's the natural home for session/device management (2FA
  when built) and is likely to grow independently of profile-editing.
- **Developer & Integrations — added 2026-08-15 (Decision 4).** Houses
  MCP/external AI agent access (**[LOCKED]** as a required capability —
  see [architecture/mcp.md](../architecture/mcp.md)). Kept as its own
  category rather than folded into **AI** (which is the SellerSalt AI
  Assistant's own tool-permission/usage settings) or **Connections**
  (which is Connected Shop OAuth, a structurally different kind of
  integration — an outbound connection *to* a marketplace, not an
  inbound credential granted *to* an external agent) — conflating either
  would blur [architecture/mcp.md](../architecture/mcp.md)'s explicit
  three-way distinction between the internal Assistant, external MCP,
  and a possible future non-MCP API. **[IA DECISION]**: reserves this
  category as the eventual home for a future non-MCP developer API too
  (webhooks, API keys), should one ever be built — "Developer &
  Integrations," not "MCP," so it doesn't need renaming later.

Final structure:

```
Settings
├── Account            (profile, password)
├── Security             (sessions/devices [FUTURE], 2FA [FUTURE])
├── Workspace             (org profile, org-level preferences)
├── Members                (people with login access to this org)
├── Roles & Permissions     (Agency/Institute/Admin contexts only — hidden for Individual)
├── Connections              (Connected Shop OAuth + future integrations)
├── Notifications              (preferences)
├── Billing
├── AI                          (SellerSalt AI Assistant: tool permissions, usage limits)
├── Developer & Integrations      (MCP/external AI agents — see below; future non-MCP API)
└── Privacy & Data                  (GDPR export/deletion, consent)
```

### Developer & Integrations → AI / MCP

**[IA DECISION]**, building on [architecture/mcp.md §Product surface](../architecture/mcp.md#product-surface) —
reproduced here as the IA-level view of the same decision:

```
Settings → Developer & Integrations → AI / MCP
  Overview / eligibility state   (does this org's plan include mcp_access)
  Connect / setup instructions
  Agent connections               (list of issued credentials)
  Credentials                      (create, reveal-once, revoke)
  Tool permissions                  (per-credential grant list)
  Scope permissions                  (per-credential Client/Cohort/Shop scope — Agency/Institute)
  Usage                                (calls this period vs. plan/rate limits)
  Rate limits
  Activity / audit                      (this org's MCP call history)
  Revoke access
  Documentation
  Example queries
```

**[IA DECISION]** This category is **hidden entirely** (not shown
disabled) for orgs whose plan does not include `mcp_access`, consistent
with how **Roles & Permissions** already only renders for
workspace types where it's meaningful — an ineligible org sees no
"upgrade to unlock MCP" nag inside Settings itself; that upsell, if any,
belongs on the Billing/plan-comparison surface, not duplicated into
Developer & Integrations. **[DECISION REQUIRED]**: whether an eligible-
but-not-yet-connected org sees a lightweight "MCP is included in your
plan" empty state instead of full hiding — this document does not
resolve that UX-polish question.

**[IA DECISION]** "Roles & Permissions" only renders for Workspace
types where it's meaningful (Agency, Institute, Admin) — an Individual
org has no sub-roles to manage, so hiding this section for Individual is
not incompleteness, it's correct scoping.

---

## AFFILIATE IA

**[LOCKED — Decision 5, 2026-08-15]** SellerSalt must have a first-class
Affiliate Program. Full product/architecture detail:
[architecture/affiliate.md](../architecture/affiliate.md). This section
is the IA-placement question specifically — per that document's explicit
instruction, exact placement is **not** locked and is recorded here as
[DECISION REQUIRED], with a recommendation.

**Why this doesn't fit the existing patterns cleanly**: every other
capability-gated surface in this document (Roles & Permissions, AI/MCP)
is nested under **Settings**, which is inherently **Organization**-
scoped — you reach Settings from inside a Workspace. Affiliate cannot
assume a Workspace exists at all: per
[architecture/organizations.md §Affiliate is not an account type](../architecture/organizations.md#affiliate-is-not-an-account-type),
a `User` can be an approved Affiliate with **zero** Organization
Memberships. An IA built purely on "Settings → some category" would
have no home for that person.

### Recommended structure — hybrid, [DECISION REQUIRED]

```
GLOBAL (Account menu)
  Affiliate Dashboard   ← conditional, same rendering discipline as the
                           Workspace switcher and the Admin console link:
                           only rendered when the signed-in User has an
                           approved Affiliate relationship

AFFILIATE (a fourth, parallel authenticated shell — NOT nested inside
            the customer AppShell's Individual/Agency/Institute workspace)
  Overview
  Referral link / code
  Performance (Clicks · Signups · Trials · Conversions · Active customers · Conversion rate)
  Commission (Earned · Pending · Approved · Payable)
  Payout history · Payout settings
  Marketing assets
  Terms · Support

ADMIN (existing separate tree)
  └── Affiliate Program   ← new node, see Admin IA below

PUBLIC WEBSITE (existing separate tree)
  └── Affiliate (/affiliate, /affiliate/apply, /affiliate/login)
```

**[IA DECISION]** (recommended, not locked): a `User` who *also* has an
Organization Membership reaches their Affiliate Dashboard via a
conditional **Account menu** entry (Global layer) — structurally
parallel to the existing conditional Admin console link, never merged
into the same menu item, never appended into the customer `AppShell`'s
DISCOVER/OPERATE/MANAGE navigation. A `User` with **no** Organization
Membership at all reaches the identical Affiliate Dashboard directly
after authenticating via `/affiliate/login` — same underlying shell,
different entry point, because for that person it *is* the entire
product surface they have access to.

**[DECISION REQUIRED]**, restated from
[architecture/affiliate.md](../architecture/affiliate.md#information-architecture-placement):
whether `/affiliate/login` is a differently-branded entry into the same
NextAuth session/`User` system (this document's recommendation, for one
identity system rather than two) or a genuinely separate auth surface.

### Admin IA extension

The Admin Affiliate Console (NOW/LATER/FUTURE breakdown:
[architecture/affiliate.md §Admin Affiliate Console](../architecture/affiliate.md#admin-affiliate-console))
is a new top-level node in the existing Admin tree (see
[Admin IA](#admin-ia) below) — never appended to the customer MANAGE
tree, same discipline already locked for every other admin surface.

### Why not a MANAGE sub-tree

**[IA DECISION]** Affiliate is deliberately **not** placed under MANAGE
(alongside Clients/Cohorts/Members/Billing), even though it's a natural-
looking sibling at first glance, because MANAGE is scoped to "things
about *this* Workspace" and Affiliate is a `User`-level relationship
that outlives, and doesn't require, any particular Workspace — the same
reasoning that already keeps Admin structurally separate from MANAGE
applies here for a different underlying reason (Admin is separate
because it's cross-org/platform-scoped; Affiliate is separate because
it's sub-org/User-scoped — opposite direction, same conclusion: don't
nest it inside a Workspace-scoped tree).

---

## ADMIN IA

Deliberately a **separate tree**, not a MANAGE sub-section — Admin
operates cross-org, platform-wide, and must never be reachable from
inside a customer's own Workspace navigation (see [IA
Anti-Patterns](#ia-anti-patterns), "admin tools leaking into customer
UX" — the current flat `ADMIN_EMAILS`-gated sidebar items appended
directly into the customer sidebar is this exact anti-pattern happening
today, and worth fixing, not just avoiding going forward).

```
Admin (Super Admin — full tree; Sub-admin — department-scoped subset)
├── Platform Overview        (KPIs — [FUTURE], not built)
├── Organizations
│     filterable: Individuals | Agencies | Institutes
├── Users                    (cross-org — [FUTURE], not confirmed built)
├── Subscriptions & Billing
├── Packages & Pricing
├── Coupons
├── Marketplace Connectors    ([CURRENT])
├── Seller Connectors          (cross-org oversight — [FUTURE])
├── Verification & Partners     ([FUTURE])
├── Affiliate Program            (Overview · Applications · Active/Suspended
│                                  · Detail · Referral Activity · Conversions
│                                  · Commission Ledger · Commission Rules
│                                  · Tiers · Payouts · Payout Failures
│                                  · Fraud/Risk · Program Settings · Terms —
│                                  [FUTURE], added 2026-08-15 (Decision 5))
├── Content                      ([FUTURE] — see Content/CMS)
├── SEO                           ([FUTURE])
├── Email                          (settings [CURRENT], templates [FUTURE])
├── Branding                        ([FUTURE])
├── Support                          ([FUTURE])
├── System Health                     (jobs/queues, sync status — partially [CURRENT] data, [FUTURE] UI)
├── Audit Logs                         ([FUTURE])
└── Settings                            (`AppSetting` — [CURRENT])
```

| Department | Sees (subset of the tree above) |
|---|---|
| Onboarding Team | Organizations (new-signup state), Users |
| SEO/Growth Team | Content, SEO, Branding |
| Accounts/Billing | Subscriptions & Billing, Packages & Pricing, Coupons, **Organizations (read-scoped, billing-relevant fields only — see below)** |
| Support Team | Organizations (account state), Users — scoped, not full data |
| Content Team | Content, Email (templates), Branding |
| Operations | Marketplace Connectors, Seller Connectors, System Health, Settings |
| Affiliate/Growth Ops *(candidate, [DECISION REQUIRED] whether it launches as its own department)* | Affiliate Program — see [architecture/affiliate.md §Admin Affiliate Console](../architecture/affiliate.md#admin-affiliate-console) |

**Folded in from [ia-journey-validation.md, Journey 9](ia-journey-validation.md#9-sub-admin).**
**[IA DECISION]**: Accounts/Billing's original scope (Subscriptions &
Billing, Packages & Pricing, Coupons only) omitted any way to *find* a
customer in the first place — a billing resolution always starts with
"which org is this." Read-scoped Organizations lookup (billing-relevant
fields only, not the org's research/intelligence data) is now part of
this department's scope, reflected in the table above.

**[IA DECISION]**, same journey: **each department's landing is that
department's first available module** — Accounts/Billing lands on
Subscriptions & Billing, Operations lands on Marketplace Connectors, and
so on. No separate "department dashboard" screen needs inventing; a
Sub-admin's first-login experience is simply their subsetted Admin tree
with its first item already open.

**[IA DECISION]** Sub-admins use the **same Admin tree**, rendered with
nodes outside their department hidden/disabled — per the brief's
explicit instruction, this is role-based subsetting of one application,
not a separate app per department. This is materially simpler to build
and keep consistent than parallel admin UIs, and is what makes adding a
new department later (per [product/complete-product-surface.md §18](../product/complete-product-surface.md#18-sub-admin--department-system))
a permissions change, not a new frontend.

### Organization detail — Activity tab

**Folded in from [ia-journey-validation.md, Journey 8](ia-journey-validation.md#8-super-admin).**
**[IA DECISION]**: Organization detail gains a contextual **Activity**
tab, reusing the same pattern already defined for Agency Client detail
(see [Agency IA](#agency-ia)) — this resolves "does an org's activity
surface inline, or does the admin navigate to a separate filtered log"
by making it the same answer as everywhere else in this document
(contextual tab + a global hub, here the global Audit Logs node). The
underlying Audit Log itself remains [FUTURE] to build
([architecture/rbac.md](../architecture/rbac.md)) — this only resolves
*where it will render* once it exists.

---

## PUBLIC WEBSITE IA

```
Public Website
├── Homepage
├── Features
├── Solutions
│     Individual Sellers | Agencies | Institutes
├── Marketplace & Platform Integrations
│     Etsy | (future marketplaces, added as they ship)
├── Pricing
├── Partners                    (directory)
├── Affiliate                    (/affiliate, /affiliate/apply — program overview,
│                                  commission explanation, eligibility, payout info,
│                                  FAQ, terms, application — [FUTURE], added
│                                  2026-08-15 (Decision 5); /affiliate/login is
│                                  the authenticated entry point, not public content)
├── Resources
│     Blog | Guides | Comparisons | Glossary | FAQ
├── Contact
└── Legal
      Privacy | Terms | GDPR
```

**[IA DECISION]** Resources is a **single parent** with Blog/Guides/
Comparisons/Glossary/FAQ as children rather than five separate top-level
nav items — all five serve the same SEO/AEO/GEO content purpose (see
[seo/seo.md](../seo/seo.md), [seo/aeo.md](../seo/aeo.md)), and grouping
them keeps the public top-nav small (see [Navigation Principles](#navigation-principles)).

**[IA DECISION]** Solutions is structured as one parent with
Individual/Agency/Institute children, mirroring the product's own
account-type model — so the public IA and product IA describe the same
three audiences using the same names, reinforcing consistency for GEO
purposes (see [seo/geo.md](../seo/geo.md), "consistent entity
information").

Cross-reference: full page-by-page detail (purpose, CTA, target user,
SEO relevance, status) already exists in
[product/complete-product-surface.md §1](../product/complete-product-surface.md#1-public--marketing-experience)
— this section only adds the hierarchy/grouping, not new page content.

---

## MOBILE IA

Not a mobile screen design — root `CLAUDE.md` confirms a
mobile-responsive pass hasn't happened yet, so this is directional, not
retrofitting anything.

| Desktop pattern | Mobile adaptation |
|---|---|
| Persistent left sidebar (DISCOVER/OPERATE/MANAGE) | **Bottom tab bar**, capped at ~4-5 destinations: Discover, Operate (if applicable to role), AI, Notifications, More |
| MANAGE's full tree (Members, Clients/Cohorts, Billing, Settings, etc.) | Collapses into **"More"/profile menu** — lower-frequency areas don't earn permanent bottom-tab real estate |
| Secondary nav (tabs on an object workspace) | Becomes a **horizontal scrollable tab bar** or a **slide-over panel**, same underlying tab set as desktop |
| Contextual actions (row/detail hover actions) | **Swipe actions or a "⋯" menu** — hover-revealed patterns don't exist on touch |
| Three switchers (Workspace, Scope, Shop) | **Collapse into one unified context switcher** reachable from the top of the mobile nav — stacking three separate switcher UIs doesn't fit mobile screen real estate even though desktop can afford to keep them visually distinct |
| Command palette | Same keyboard-driven concept doesn't apply on mobile; becomes a **search icon** opening a full-screen search/quick-nav sheet |
| AI global entry point | Stays a **persistent, easily-reachable affordance** (not buried in "More") — AI's cross-cutting status per the [Core Product Model](#core-product-model) applies equally on mobile; demoting it to a menu item would contradict that |
| Breadcrumbs (deep Agency/Institute nesting) | Replaced by a **back-stack + current-level title** pattern (standard mobile navigation), since horizontal breadcrumb trails don't fit narrow viewports |
| Affiliate parallel shell ([Affiliate IA](#affiliate-ia)) | **[FUTURE], [DEFERRED]** — not designed by this pass. The table above assumes the customer `AppShell`'s DISCOVER/OPERATE/MANAGE structure; the Affiliate shell is a fourth, structurally separate surface these rows don't cover. Flagged here only so it isn't silently forgotten — no mobile pattern chosen. |

---

## NAVIGATION PRINCIPLES

| Element | Rule |
|---|---|
| **Primary navigation** | Product Areas + top-level Modules for the current role, capped at roughly 5–7 items — matches today's actual restraint (current sidebar: 2 groups, ~9 items total for non-admins) |
| **Secondary navigation** | Tabs within a Module or Object workspace (e.g. a Connected Shop's Overview/Products/Optimization/Analytics tabs) |
| **Contextual navigation** | Row/detail actions and menus scoped to a single object — never promoted to primary/secondary nav |
| **Breadcrumbs** | Required wherever nesting exceeds 2 levels (e.g. Agency org → Client → Shop → Listing) — a new requirement current IA doesn't need yet (nothing today nests that deep) but Agency/Institute IA will |
| **Tabs** | Used only for different **views of the same object** (a Shop's tabs); never used to switch between **different objects** — that's navigation/a list, not a tab |
| **Filters** | Live inside a Module's list view (e.g. Prospects' price/age/review filters) — never promoted to primary nav |
| **Search** | Page-level search (searching within Prospects) is distinct from the global command palette below — do not conflate the two |
| **Command palette** | [FUTURE] — a keyboard-driven (e.g. Cmd+K), deterministic quick-navigation/quick-action layer, intentionally separate from the AI assistant: command palette answers "take me to X"; AI answers "tell me about X." Different mental models, two distinct affordances. |
| **Workspace switcher** | Renders **only** for users with genuine multi-org membership — not permanent chrome for everyone |
| **Scope/Account switcher** | Renders for any Agency Employee/Institute Staff/Owner working across multiple Clients/Cohorts — expected, frequent UI for those roles |

**Anti-overload rule**: no more than two navigation levels should be
simultaneously visible in persistent chrome (primary nav + one level of
tabs). Anything deeper is breadcrumb-navigated, never permanently
rendered as a nested sidebar tree.

---

## OBJECT MODEL

| Object | Parent | Children | Major actions | Appears in IA |
|---|---|---|---|---|
| User | — | Memberships | Login, edit profile | Global (account menu), MANAGE → Members |
| Organization | — | Memberships, (Clients/Cohorts if Agency/Institute), Shops, Reports | Create (via signup), edit settings | Workspace layer |
| Employee | Agency Organization (via Membership) | Assigned Clients | Invite, assign role/permission | MANAGE → Employees |
| Client | Agency Organization | Client Shops | Onboard, assign to employee | MANAGE → Clients |
| Student | Institute Organization (within a Cohort) | Student Shop, Progress | Enroll, assign to cohort | MANAGE → Students, Cohort detail |
| Cohort | Institute Organization | Students | Create, set enrollment window | MANAGE → Cohorts |
| Research Shop | (none — external) | Research Shop's Prospects/Listings, ShopSnapshots | Track, favorite, compare | DISCOVER → Spy on Competitor, Prospects |
| Connected Shop | Organization (or Client/Student, once that FK exists) | Products, Listings, Optimization history, Reports | Connect, sync, diagnose, optimize | OPERATE → Connected Shops |
| Product | Connected Shop (own) or Research Shop (researched) | Listings | View, optimize (own) / research (others') | OPERATE → Products; DISCOVER → Prospects |
| Listing | Product | Issues, Recommendations | Audit, optimize | OPERATE → Listings/SEO |
| Competitor | (a Research Shop, viewed from OPERATE's context) | — | Track, compare | OPERATE → Competitors (bridge), DISCOVER → Spy |
| Trend | (derived, no owning parent) | — | View, act on | DISCOVER → Trends |
| Opportunity | Trend or Shop gap analysis | — | View, act on | DISCOVER, OPERATE (Overview) |
| Issue | Connected Shop or Listing | Recommendations | Triage, resolve | OPERATE → Optimization |
| Recommendation | Issue | Actions | Apply, dismiss | OPERATE → Optimization, AI results |
| Alert | Any triggering object | — | Read, dismiss, mute | Notification Center |
| Report | Any reportable object (Shop, Client, Cohort, Student) | — | Generate, share, download | MANAGE → Reports (hub + contextual) |
| Search | Organization (`SearchConfig`) | Prospect results | Create, run, schedule | DISCOVER → Prospects |
| Collection | Organization (user-created grouping) | Prospects/Research Shops | Create, add/remove items | DISCOVER (FUTURE) |
| Integration | Organization (or Client/Student) | — (is itself the connection) | Connect, disconnect, re-auth | Settings → Connections, OPERATE → Connect flow |
| Subscription | Organization | — | Checkout, cancel, upgrade/downgrade | Settings → Billing |
| Agent Connection (MCP credential) | Organization (created by a specific User) | Tool grants, Client/Cohort/Shop scope grants | Create, view usage, revoke | Settings → Developer & Integrations → AI/MCP |
| Affiliate | User (not Organization) | Referral link/code, Commission Rule assignment, Ledger entries | Apply, approve/reject, suspend | Affiliate Dashboard (Global entry), Admin → Affiliate Program |
| Affiliate Referral / Attribution | Affiliate | — (resolves to a User/Organization once converted) | Attribute, resolve | Admin → Affiliate Program → Referral Activity |
| Commission Event | Affiliate + the Organization/Subscription that generated it | Ledger entries | Create (system), approve, reverse | Admin → Affiliate Program → Commission Ledger |
| Payout | Affiliate | References approved Ledger entries | Run, retry, reconcile | Affiliate Dashboard → Payout history, Admin → Affiliate Program → Payouts |

---

## ROLE / PERMISSION VISIBILITY MATRIX

This is the **target** access model implied by this IA — not a claim
about what's implemented. **†** marks a column where the underlying
capability is not yet built regardless of the intended access level
(cross-reference [product/complete-product-surface.md](../product/complete-product-surface.md)
for exact CURRENT/FUTURE status per capability). Do not implement
permissions from this table directly — it is a design reference.

| Role | Discover | Connected Shops | Intelligence† | Optimization† | Reports† | Clients | Students | Employees | Billing | Settings | Admin | AI† |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Individual | MANAGE | NONE¹ | LIMITED | NONE | NONE | NONE | NONE | NONE | MANAGE (own) | MANAGE (own) | NONE | LIMITED |
| Agency Owner | MANAGE | MANAGE (all clients') | MANAGE | MANAGE | MANAGE | MANAGE | NONE | MANAGE | MANAGE | MANAGE | NONE | LIMITED² |
| Agency Employee | MANAGE | LIMITED (assigned only) | LIMITED | LIMITED (assigned) | VIEW/MANAGE (assigned) | LIMITED (assigned only) | NONE | NONE | NONE³ | LIMITED (own) | NONE | LIMITED² |
| Institute Admin | MANAGE | MANAGE (all students') | MANAGE | MANAGE | MANAGE | NONE | MANAGE | MANAGE (staff) | MANAGE | MANAGE | NONE | LIMITED² |
| Institute Staff | MANAGE | LIMITED (assigned cohorts) | LIMITED | LIMITED (assigned) | VIEW (assigned) | NONE | LIMITED (assigned cohorts) | NONE | NONE | LIMITED (own) | NONE | LIMITED² |
| Student | MANAGE (own) | LIMITED (own single shop) | LIMITED (own) | LIMITED (own) | VIEW (own) | NONE | NONE | NONE | NONE | LIMITED (own) | NONE | LIMITED² |
| Super Admin | NONE⁴ | NONE⁴ | NONE⁴ | NONE⁴ | NONE⁴ | VIEW (cross-org) | VIEW (cross-org) | VIEW (cross-org) | MANAGE (platform) | MANAGE (platform) | MANAGE | NONE⁴ |
| Sub-admin | NONE⁴ | NONE⁴ | NONE⁴ | NONE⁴ | NONE⁴ | VIEW (dept-relevant) | VIEW (dept-relevant) | VIEW (dept-relevant) | LIMITED (dept-scoped) | LIMITED (dept-scoped) | LIMITED (dept) | NONE⁴ |

¹ Today: NONE (admin-gated). Target once seller channels are customer-facing: MANAGE.
² Plan/role-gated once AI ships; "LIMITED" reflects both feature-gating and the fact that nothing is built yet.
³ Unless explicitly granted via `Permission` — Decision 1's employee/client permission model allows per-employee exceptions.
⁴ Admin roles operate the platform, not the customer product surface — NONE here reflects role scope, not a missing capability. A future support-impersonation feature (not scoped) would be the one exception, and would still route through explicit, logged access rather than ambient visibility.

---

## IA ANTI-PATTERNS

Explicitly avoided by the structure above:

| Anti-pattern | How this IA avoids it |
|---|---|
| Giant sidebar | Layered nav (Global → Workspace → Product Area → Module) + breadcrumbs for depth, instead of one deeply nested tree |
| Duplicate Shop sections | The Research Shop / Connected Shop split is structural (DISCOVER vs. OPERATE), not just naming — see [Critical Shop Distinction](#critical-shop-distinction) |
| Mixing research shops with connected shops | Same as above; the one intentional bridge (OPERATE → Competitors) is explicitly tagged, not merged |
| Burying critical intelligence | Health/Score surfaces on a Connected Shop's landing Overview tab, not several clicks deep |
| AI as a gimmick page | AI is cross-cutting infrastructure (global + contextual entry points), not a nav item opening an isolated dashboard — see [AI IA](#ai-ia) |
| Settings scattered everywhere | One consolidated Settings hierarchy (see [Settings IA](#settings-ia)); notification preferences, permissions, connections all live there, not duplicated ad hoc on random pages |
| Admin tools leaking into customer UX | Admin is a structurally separate tree, never appended to the customer sidebar — a direct fix for today's actual pattern (admin-only nav groups appended into the same `Sidebar` component as customer nav) |
| Excessive nested navigation | Breadcrumbs + tabs replace deep persistent nesting for Agency/Institute's Org → Client/Cohort → Shop → Listing depth |
| Platform-specific navigation everywhere | DISCOVER stays one unified experience; marketplace is a filter/facet, not a navigational fork — consistent with Decision 3 |
| Agency UI feeling like a modified individual account | Agency gets its own Overview/dashboard framing (Client/health rollups), not the Individual dashboard with a Clients tab bolted on |
| Three switchers stacked without a unifying pattern | Workspace switcher, Scope selector, and Shop selector are explicitly named as distinct concepts with distinct usage frequency — designed coherently rather than left to accumulate as ad hoc dropdowns |
| Re-deriving a new intelligence visual pattern per feature | One shared Score/Issue/Recommendation/Alert component vocabulary — see [Intelligence IA](#intelligence-ia) |

---

## FINAL IA TREE

```
GLOBAL
  AI (launcher) · Notifications · Account menu · (Workspace switcher, if multi-org)
  · (Affiliate Dashboard link, if the User has an approved Affiliate relationship —
     Decision 5, [DECISION REQUIRED] on exact placement, see Affiliate IA)

WORKSPACE (Individual | Agency | Institute) ─── Scope selector (Agency/Institute only)

├── DISCOVER
│     Prospects (+ Saved/Scheduled Searches, Filters)
│     Spy on Competitor → Competitor Shop (Overview | Listings | History | Keywords)
│     Trends
│     Dropped Shops
│     Favorites (→ Collections, future)
│
├── OPERATE ─── Shop selector (if >1 Connected Shop)
│     Connected Shops → [Shop workspace]
│         Overview | Products | Listings/SEO | Optimization | Analytics | Competitors (→ bridges to DISCOVER)
│
└── MANAGE
      Overview (org-type-specific framing)
      Members
      Clients (Agency) / Cohorts → Students (Institute)
          → Client/Student workspace: Overview | Shops | Optimization (rollup) | Reports | Activity
      Employees (Agency) / Staff (Institute)
      Reports (hub)
      Billing
      Settings
          Account · Security · Workspace · Members · Roles & Permissions*
          · Connections · Notifications · Billing · AI · Developer & Integrations†
          · Privacy & Data
          (* Agency/Institute/Admin only)
          († AI/MCP sub-item hidden unless the org's plan includes mcp_access — Decision 4)

ADMIN (separate tree — Super Admin full / Sub-admin department-scoped)
      Platform Overview · Organizations · Users · Subscriptions & Billing
      · Packages & Pricing · Coupons · Marketplace Connectors · Seller Connectors
      · Verification & Partners · Affiliate Program · Content · SEO · Email
      · Branding · Support · System Health · Audit Logs · Settings

AFFILIATE (fourth, parallel authenticated shell — not nested in the
            customer AppShell; reachable from GLOBAL's Account menu for
            org-member affiliates, or directly via /affiliate/login for
            affiliates with no Organization membership — Decision 5)
      Overview · Referral link/code · Performance · Commission · Payouts
      · Marketing assets · Terms · Support

PUBLIC WEBSITE (separate from the app shell entirely)
      Homepage · Features · Solutions (Individual/Agency/Institute)
      · Marketplace & Platform Integrations · Pricing · Partners · Affiliate
      · Resources (Blog/Guides/Comparisons/Glossary/FAQ) · Contact · Legal
```

---

## PRIMARY NAVIGATION BY USER TYPE

| User type | Primary nav items |
|---|---|
| Individual (Starter/Pro) | Discover (Prospects, Spy, Trends, Dropped Shops, Favorites) · Operate (once customer-facing) · AI · Notifications · Account menu |
| Agency Owner | Discover · Operate · Clients · Employees · Reports · Billing · AI · Notifications |
| Agency Employee | Discover · Operate (assigned) · Clients (assigned) · Reports (assigned) · AI · Notifications |
| Institute Owner/Admin | Discover · Operate · Cohorts · Students · Staff · Reports · Billing · AI · Notifications |
| Institute Staff | Discover · Operate (assigned) · Cohorts (assigned) · Reports (assigned) · AI · Notifications |
| Institute Student | Discover · Operate (own single shop) · Progress · AI · Notifications |
| Super Admin | Platform Overview · Organizations · Subscriptions & Billing · Packages & Pricing · Connectors · Content/SEO · Support · System Health · Settings |
| Sub-admin | Department-scoped subset of the Super Admin list above |

---

## SECONDARY NAVIGATION RULES

1. Secondary nav is always **tabs on a single object's workspace** (a
   Connected Shop, a Client, a Cohort, a Student) — never a way to
   switch between different objects.
2. Filters and sort controls live **inside** a Module's list view, never
   promoted to secondary nav.
3. Any Module with more than ~6 tabs is a signal to split it, not to
   add a scrollable tab overflow.
4. Contextual actions (row-level, detail-page action bars) are never
   promoted into secondary nav, regardless of how frequently used —
   frequency of use is not sufficient justification; only "is this a
   different *view* of the same object" is.

---

## OBJECT HIERARCHY

See [Object Model](#object-model) above for the full table. Condensed
parent chain:

```
Organization
├── Membership → User (Employee / Staff / Owner-Admin)
├── Client (Agency) → Client Shop (Connected Shop)
├── Cohort (Institute) → Student → Student Shop (Connected Shop)
├── Connected Shop → Product → Listing → Issue → Recommendation → Action
├── (Research Shop is NOT a child of Organization — it's external,
│    referenced by Prospect/ShopWatch, not owned)
├── Search (SearchConfig) → Prospect results
├── Report (references any of the above)
└── Subscription
```

---

## ROLE VISIBILITY MATRIX

See [Role / Permission Visibility Matrix](#role--permission-visibility-matrix)
above for the full table.

---

## MOBILE IA RULES

See [Mobile IA](#mobile-ia) above for the full table. Condensed:

1. Bottom tab bar, ≤5 destinations; MANAGE mostly collapses into "More."
2. Secondary nav → horizontal scroll tabs or slide-over, same tab set as desktop.
3. Contextual actions → swipe or "⋯" menu, never hover-dependent.
4. All three switchers (Workspace/Scope/Shop) collapse into one unified context switcher on mobile.
5. Command palette → search icon + full-screen sheet.
6. AI stays a persistent, first-class entry point — never demoted to a menu item.
7. Breadcrumbs → back-stack + current-level title.
8. Affiliate parallel shell — **[FUTURE], [DEFERRED]**, not designed; the
   rules above assume the customer `AppShell` and don't cover it.

---

## IA DECISIONS

Structural calls made by this document (open to product-owner review,
not yet product-owner-ratified):

1. DISCOVER/OPERATE/MANAGE as the top-level model, with AI cross-cutting
   rather than a fourth area.
2. The word "Shop" is never used bare — always "Competitor/Researched
   Shop" or "Connected/Your Shop."
3. Recommendations, Alerts, and Reports are **not** standalone OPERATE
   tabs — they surface via shared cross-product systems (Intelligence
   patterns, Notification Center, Reports hub).
4. Three distinct switcher concepts (Workspace, Scope, Shop) — never
   conflated into one control.
5. Optimization and Reporting are both **hybrid**: contextual by
   default, with one standalone rollup/hub for multi-object and
   cross-object visibility respectively.
6. Intelligence objects (Health/Score/Issue/Recommendation/Alert/etc.)
   are object types with shared rendering patterns, not individual
   pages.
7. Settings: removed Appearance (no theme to configure per Decision 2);
   folded Integrations into Connections; merged Data into Privacy.
8. Admin is a fully separate tree from customer MANAGE, never appended
   to the customer sidebar (fixing today's actual pattern).
9. Sub-admins get the same Admin tree, subsetted by department — not a
   separate application.
10. Students get the narrowest IA of any role: Discover + one-shop
    Operate + AI + Progress, with anonymized cohort benchmarking as the
    one visibility exception.
11. Public Resources content (Blog/Guides/Comparisons/Glossary/FAQ) is
    grouped under one parent, not five top-level items.
12. **Added 2026-08-15 (Decision 4)**: Settings gains a "Developer &
    Integrations" category (distinct from "AI," which stays the internal
    Assistant's own settings), housing MCP/external AI agent management,
    hidden entirely for orgs without `mcp_access`.
13. **Added 2026-08-15 (Decision 5)**: Affiliate is not nested under
    MANAGE or Settings (both are Workspace-scoped; Affiliate is
    `User`-scoped and may have no Workspace at all) — it gets its own
    parallel authenticated shell, reached via a conditional Account-menu
    entry for org-member affiliates. This document's own recommendation,
    explicitly **not** promoted to locked — see [Affiliate IA](#affiliate-ia)
    and item 7 below.
14. **Folded in 2026-08-15 (documentation hygiene pass)**: all ten
    additive clarifications from
    [ia-journey-validation.md](ia-journey-validation.md#ia-changes-required-before-design)
    are now inline in this document (`Prospect.status` surfacing, Sync-
    vs-Scan, the Advise/Prepare/Apply action classification, Shop-
    selector-pre-filtered-by-Scope, the Optimization rollup's row-level
    deep-link, the Agency client-initiated connect flow, the Institute
    Students-tab list-pattern reuse, AI graceful degradation, the
    Organization-detail Activity tab, and the Accounts/Billing
    department's Organizations lookup + department-landing rule) — see
    each section above for the specific addition. Also: Partner is
    resolved as an independent, non-account-type relationship alongside
    Affiliate (see [Affiliate IA](#affiliate-ia)); MCP/Affiliate
    lifecycle events now route through the existing Notification Center
    (see [Notifications IA](#notifications-ia)); the Affiliate shell's
    mobile treatment is explicitly flagged deferred (see [Mobile
    IA](#mobile-ia)).

---

## REMAINING DECISIONS

Genuinely open questions this document surfaces but cannot resolve:

1. **[DECISION REQUIRED]** Does multi-org membership become a real,
   switcher-driven feature, or stay the schema-only allowance it is
   today? Blocks whether the Workspace switcher is ever built. See
   [architecture/organizations.md](../architecture/organizations.md).
2. **[DECISION REQUIRED]** Does Agency Owner's "Agency Overview" exist
   for Agency Employees too (scoped to their assigned clients), or do
   Employees skip straight to their Client list with no dashboard? This
   document recommends the scoped-Overview option but it's not decided.
3. **[DECISION REQUIRED]** Exact tool-permission granularity for AI
   (per-plan, per-role, per-tool, or some combination) — see
   [architecture/ai.md](../architecture/ai.md).
4. **[DECISION REQUIRED]** Whether Super Admin ever gets a
   support-impersonation ("view as this org") capability — flagged as a
   possible future exception to Admin's platform-only visibility, not
   scoped here.
5. **[DECISION REQUIRED]** Whether Agency Employees can ever see
   Billing (this document defaults to NONE unless explicitly granted
   via `Permission`, but the exact grant mechanism is part of Decision
   1's still-open field-level schema — see
   [architecture/organizations.md](../architecture/organizations.md)).
6. **[DECISION REQUIRED]** Whether Collections (grouping beyond
   Favorites) get built at all — this IA reserves a slot for them but
   [product/complete-product-surface.md](../product/complete-product-surface.md)
   marks them only [RECOMMENDED], not committed.
7. **[DECISION REQUIRED]** Exact Affiliate IA placement — this document
   recommends the hybrid (conditional Account-menu entry + a dedicated
   parallel shell) in [Affiliate IA](#affiliate-ia), but per Decision 5's
   own scope, this is explicitly not locked. Also open: whether
   `/affiliate/login` shares the regular customer auth flow or is a
   separate surface — see
   [architecture/affiliate.md §Information architecture placement](../architecture/affiliate.md#information-architecture-placement).

---

## DESIGN DEPENDENCIES

Building on
[product/complete-product-surface.md §Design Dependencies](../product/complete-product-surface.md#design-dependencies) —
this IA work surfaces additional, more specific dependencies for the
next artifact, [design-system-v1.md](design-system-v1.md):

| Dependency | Needed for |
|---|---|
| Shared Intelligence component vocabulary (Score badge, Issue/Recommendation/Alert/Insight/Benchmark cards) | Every DISCOVER, OPERATE, and AI screen — this is the single highest-leverage component set to define first |
| Breadcrumb component | Any Agency/Institute screen nesting past 2 levels |
| Three distinct switcher components (Workspace, Scope, Shop) — visually related but behaviorally distinct | OPERATE (Shop selector), MANAGE (Scope selector), Global (Workspace switcher, conditional) |
| Tab component (object-workspace pattern) | Connected Shop, Client, Cohort, Student workspaces |
| Notification Center component (unified inbox, filterable by category) | Global layer |
| AI entry-point components (global launcher + contextual "Ask AI" affordance) | Global layer + every object detail page |
| `Organization.kind` discriminator | Any screen needing to know which Workspace type it's rendering — still [DECISION REQUIRED] per [architecture/organizations.md](../architecture/organizations.md) |
| `Role`/`Permission` schema | Any conditional-visibility logic in this entire document — still [DECISION REQUIRED] |
| Affiliate relationship model (`Affiliate`, approval status) | The conditional Account-menu entry and the entire Affiliate shell — can't render "does this User have an approved Affiliate relationship" without it. See [architecture/affiliate.md §Database implications](../architecture/affiliate.md#database-implications-conceptual-only) |
| Semantic design tokens (Decision 2) | All of the above — visual form for every component named here |

---

## RECOMMENDED NEXT DESIGN PHASE

**Next artifact: [docs/design/design-system-v1.md](design-system-v1.md).**

This IA document defines *what* needs a visual form (the Product Areas,
Modules, switchers, and — most importantly — the shared Intelligence
component vocabulary) without defining *how* it looks. The design
system doc should:

1. Resolve Decision 2's residual semantic-token spec (surface/ink/border/
   accent/status tokens, component states) — see
   [design/design-system.md](design-system.md) "Still open."
2. Define the component inventory this IA implies as **required**, not
   optional: Score badge, Issue/Recommendation/Alert/Benchmark/Insight
   cards, the three switcher patterns, breadcrumbs, tabs, the
   Notification Center, and the AI entry-point affordances.
3. Treat the Intelligence component vocabulary (item 2 above,
   [Intelligence IA](#intelligence-ia)) as the **highest-priority**
   component set — it's reused across DISCOVER, OPERATE, MANAGE, and AI
   alike, so getting it right once has the largest leverage of anything
   in the design system.
4. Follow the sequencing already recommended in
   [product/complete-product-surface.md §Recommended Design Order](../product/complete-product-surface.md#recommended-design-order):
   tokens first, then redesign the existing CURRENT Individual/DISCOVER
   surface as the system's proving ground, before extending to
   Agency/Institute/OPERATE/AI screens that don't exist yet.

This document does not design any screen — that remains explicitly out
of scope until the design system's component vocabulary exists to build
screens from.
