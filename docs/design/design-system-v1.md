Status: Draft
Owner: [ASSUMPTION] Founder (Aliyan)
Last Updated: 2026-08-14
Decision State: Sections 2 (palette values, light-only) are [LOCKED] (Decision 2, MASTER_BLUEPRINT.md). Everything else in this document is this document's own specification — the resolution of Decision 2's residual "define semantic design tokens and component states" requirement — presented as a concrete, implementable contract, not a placeholder. Items still genuinely open are marked **[OPEN]** and listed in Section 30.

# SellerSalt — Design System v1

## Purpose

This is a **frontend implementation contract**, not a moodboard and not
an application implementation. Every value below is intended to be
used directly by a developer or coding agent building components,
without inventing visual rules along the way. It builds on, and does
not contradict:

- [MASTER_BLUEPRINT.md](../MASTER_BLUEPRINT.md) — Decision 2 (locked
  palette, light-only theme)
- [design/design-system.md](design-system.md) — the earlier pass that
  first locked the palette and flagged the token spec as residual; this
  document **is** that residual spec
- [design/information-architecture-v1.md](information-architecture-v1.md) —
  the structural/navigational model this system gives visual form to
- [design/ia-journey-validation.md](ia-journey-validation.md) — several
  specific findings from that validation (the "Act" ambiguity, the
  missing AI-unavailable state, the undefined Sync-vs-Scan moment) are
  directly resolved by named sections below
- [design/ux-principles.md](ux-principles.md) — "never blend what
  shouldn't be blended," the inverted competition-score color meaning,
  and "editorial judgment labeled as such" all remain in force and are
  explicitly preserved, not overridden, in this document

**Continuity, not a rebuild**: where the existing (legacy) codebase
already has a working, sound mechanism — CSS-variable tokens consumed
through Tailwind, the Inter/JetBrains Mono font stack, the
`sm/md/lg` (6/10/14px) radius scale, lucide-react icons, the sidebar's
existing icon choices, `competition-scoring.ts`'s intentional
Difficulty/Demand color inversion — this document keeps it and re-tokens
it to the new palette, rather than replacing it for its own sake.

---

## 1. DESIGN PHILOSOPHY

SellerSalt should read as a **serious, premium ecommerce intelligence
platform** — the kind of tool a professional seller or agency trusts
with real business decisions. Visual references in spirit only (Stripe,
Linear, Vercel, Notion) — never copied identity, colors, or component
shapes.

The product must communicate: **intelligence, precision, trust, data,
momentum, clarity, premium quality.**

Concretely, this means:

- **Restraint over decoration.** Every visual element earns its place by
  communicating information. If removing it loses no information, it's
  decoration and it goes.
- **Density with clarity.** The app is data-heavy by nature (research
  tables, scores, trends). Density is not an accident to apologize for —
  it's requested directly by the locked design direction ("dense but
  highly readable"). Clarity within that density comes from typography
  hierarchy and spacing discipline, not from spacing everything out
  until it's sparse.
- **One visual language, everywhere.** A score looks like a score
  whether it's on a Prospect, a Connected Shop, or inside an AI
  response. This is the single biggest lever this document has for
  making the product feel coherent rather than assembled from
  mismatched parts — see [Section 12](#12-intelligence-components).

**Explicitly avoided**, per the brief and reinforced throughout this
document: generic SaaS template aesthetics; excessive gradients;
excessive glassmorphism; noisy dashboards; oversized cards; excessive
rounded containers; decorative UI that doesn't communicate information;
dark dashboard aesthetic. Full consolidated list in
[Section 29](#29-design-anti-patterns).

---

## 2. LOCKED VISUAL DIRECTION

**[LOCKED — Decision 2]** Light theme only. Dark mode is not part of the
current target product unless explicitly reintroduced later — see
[design/design-system.md](design-system.md).

| Token | Value | Status |
|---|---|---|
| Primary ink | `#141B16` | [LOCKED] |
| Growth (brand primary) | `#16C784` | [LOCKED] |
| Gold (brand accent) | `#FFB020` | [LOCKED] |
| Base | White / warm off-white surfaces | [LOCKED] (exact hex defined in Section 3) |

**Legacy — explicitly not the target**: `#2563EB` blue and the existing
`darkMode: "class"` dark-mode implementation
(`src/app/globals.css`/`tailwind.config.ts`). This document does not
mechanically swap blue for green — every token below is derived with
its own reasoning, not a find-and-replace.

---

## 3. COLOR TOKEN SYSTEM

Every value below is a concrete, usable hex. Reasoning is given wherever
a non-obvious call was made — this document does not ask the reader to
trust an unexplained number.

### Background

| Token | Value | Reasoning |
|---|---|---|
| `bg-page` | `#FAFAF8` | Warm off-white per the locked direction — the base canvas, one step below `bg-surface` |
| `bg-surface` | `#FFFFFF` | Pure white — cards, panels, the sidebar; reads as "raised" relative to the page without needing a shadow |
| `bg-elevated` | `#FFFFFF` + `shadow-md` | Same surface color as `bg-surface`; elevation is communicated by shadow, not a different color — see [Section 7](#7-radii--borders--shadows) |
| `bg-muted` | `#F4F3EF` | A warm light gray, one step darker than `bg-page` — hover states, disabled fills, subtle section backgrounds |
| `bg-inverse` | `#141B16` | The locked ink, used as a background only in deliberately inverted contexts (tooltips, inverse badges, code blocks) |

### Text

| Token | Value | Reasoning |
|---|---|---|
| `text-primary` | `#141B16` | The locked ink, used directly — body copy, headings |
| `text-secondary` | `#525B55` | Ink desaturated/lightened for supporting text — labels, secondary copy. Contrast against `bg-page`/`bg-surface` targets AA for body-sized text |
| `text-tertiary` | `#7C847E` | Metadata, timestamps, captions — the lightest text that's still required to meet AA at UI-component contrast (3:1), not body-text contrast |
| `text-disabled` | `#AEB4AC` | Disabled form/button labels — explicitly below AA on purpose, since disabled content is intentionally de-emphasized and non-interactive |
| `text-inverse` | `#F7F9F7` | Text on `bg-inverse` or on solid brand/status fills |

### Border

| Token | Value | Reasoning |
|---|---|---|
| `border-default` | `#E3E6E0` | Card outlines, input borders, table row dividers |
| `border-subtle` | `#EDEFEA` | Lighter internal dividers — inside a card, between list rows |
| `border-strong` | `#C7CCC4` | Emphasized separators — between major page sections, active-state input borders |
| `border-focus` | `#16C784` at 100% + a `0 0 0 3px rgba(22,199,132,0.28)` ring | Every interactive element's focus state — see [Section 26](#26-accessibility) |

### Brand

| Token | Value | Reasoning |
|---|---|---|
| `brand-primary` | `#16C784` | The locked growth green — primary buttons, active nav, links |
| `brand-primary-hover` | `#109C68` | ~20% darker — standard hover-darken pattern |
| `brand-primary-active` | `#0C7A52` | Darker still, for the pressed/active state |
| `brand-primary-subtle` | `#E7FAF1` | Light tint — active nav item background, selected-state fills |

### Growth (status: positive)

**[SPEC DECISION]** Growth/positive status **intentionally shares its
hue** with `brand-primary` rather than using a separate green. SellerSalt's
brand identity *is* "growth green" — a positive score and the brand's
primary color being the same hue is a deliberate reinforcement of the
product's identity, not an oversight. They're still **separate tokens**
(`status-positive` vs. `brand-primary`) so a future rebrand could diverge
them without touching every score/badge in the product.

| Token | Value |
|---|---|
| `status-positive` | `#16C784` |
| `status-positive-subtle` | `#E7FAF1` |
| `status-positive-strong` | `#0E8F5D` — used for "Excellent" tier in the Score system, see [Section 13](#13-health--score-system) |

### Warning

**[SPEC DECISION]** Warning is deliberately **not** the same hue as
Gold. Gold (`#FFB020`) is a bright, saturated **brand accent** —
premium/featured signals, secondary highlights. Using it for "your
payment failed" would collide with its brand meaning. Warning uses a
distinct, more muted amber:

| Token | Value | Note |
|---|---|---|
| `status-warning` | `#D97706` | Matches the legacy `warn` token's value — deliberate continuity, not coincidence |
| `status-warning-subtle` | `#FDF1DF` | |

### Danger

| Token | Value | Note |
|---|---|---|
| `status-danger` | `#DC2626` | Matches the legacy `danger` token — standard, accessible red, kept for continuity |
| `status-danger-subtle` | `#FCEAE9` | |

### Info

| Token | Value | Reasoning |
|---|---|---|
| `status-info` | `#2B6CB0` | A distinct utility blue — since blue is no longer the brand color, it's free to serve as the neutral "informational" semantic without any brand confusion |
| `status-info-subtle` | `#E9F1FA` | |

### Data visualization

| Token | Value | Use |
|---|---|---|
| `data-series-1` … `data-series-7` | `#16C784`, `#FFB020`, `#2B6CB0`, `#8B5CF6`, `#0E9488`, `#DC6B4C`, `#7C847E` | Multi-series categorical charts, in this order — chosen to avoid relying on red/green alone (accessibility), and ordered so the brand color leads without every chart looking brand-saturated |
| `data-positive` | `#16C784` | Single-metric positive delta |
| `data-negative` | `#DC2626` | Single-metric negative delta |
| `data-neutral` | `#7C847E` | Flat/unchanged value |
| `data-comparison-primary` | `#16C784` | "You" in a you-vs-benchmark comparison |
| `data-comparison-secondary` | `#7C847E` (or `#2B6CB0` if a second hue is clearer against green) | "Benchmark/market" — deliberately **not** red or a second saturated hue, so a comparison chart never visually implies "the benchmark is bad" |

### Contrast / accessibility expectations

**Target: WCAG 2.1 AA** — 4.5:1 for body text, 3:1 for large text
(≥18px, or ≥14px bold) and for UI-component boundaries (borders, icons
carrying meaning). Every token pairing above was chosen with this target
in mind, but **formal contrast verification against every pairing has
not been run in this pass** — that is an explicit pre-implementation
checklist item, not silently assumed passing. See
[Section 30](#30-design-system-acceptance-criteria).

---

## 4. TYPOGRAPHY

### Families

| Role | Family | Fallback stack | Status |
|---|---|---|---|
| Display (marketing/major moments) | **General Sans** | `"General Sans", "Inter", ui-sans-serif, system-ui, sans-serif` | **[SPEC RECOMMENDATION, OPEN]** — a genuinely warm-geometric, openly-licensed grotesk matching the "warm geometric display" direction. Decision 2 locked colors and light-only, not a specific display typeface — this is this document's proposal, not yet ratified. Easily swapped later since it's isolated to display-scale usage only. |
| UI (application interface) | **Inter** | `"Inter", ui-sans-serif, system-ui, sans-serif` | [CURRENT] — already the codebase's UI font (`tailwind.config.ts`), kept as-is |
| Mono (code, IDs) | **JetBrains Mono** | `"JetBrains Mono", ui-monospace, monospace` | [CURRENT] — kept for code/technical strings only, not for numeric data (see below) |

### Numeric/data typography

**[SPEC DECISION]** Numeric and tabular data uses **Inter with tabular
figures enabled** (`font-variant-numeric: tabular-nums`), not the mono
family. A full monospace face is heavier and less refined than Inter's
own tabular numerals for financial/metric data, and this keeps numbers
visually consistent with surrounding UI text while still aligning
digits in columns — critical for dense tables (Prospects, transaction
history) and Score displays.

### Scale

| Token | Size / line-height | Weight | Tracking | Use |
|---|---|---|---|---|
| `display-2xl` | 64px / 1.05 | 600 | -0.02em | Rare, hero marketing moments |
| `display-xl` | 56px / 1.08 | 600 | -0.02em | Marketing hero headlines |
| `display-lg` | 48px / 1.1 | 600 | -0.015em | Marketing section headlines |
| `display-md` | 40px / 1.12 | 600 | -0.015em | Marketing sub-section headlines |
| `display-sm` | 32px / 1.15 | 600 | -0.01em | Smallest display use, large in-app moments (empty-state headlines) |
| `h1` | 28px / 1.2 | 600 | -0.01em | Page titles (app) |
| `h2` | 24px / 1.25 | 600 | -0.005em | Section titles |
| `h3` | 20px / 1.3 | 600 | 0 | Card/panel titles |
| `h4` | 18px / 1.35 | 600 | 0 | Sub-section titles, Intelligence Card titles |
| `body-lg` | 16px / 1.5 | 400 | 0 | Marketing body, long-form content |
| `body-md` | 14px / 1.5 | 400 | 0 | **Default app UI text size** |
| `body-sm` | 13px / 1.45 | 400 | 0 | Dense table cells, secondary UI text |
| `label-md` | 13px / 1.3 | 500 | 0.02em | Form labels, section group headers |
| `label-sm` | 11px / 1.3 | 500 | 0.04em | Micro-labels, uppercase-tracked group headers (nav groups) |
| `meta` | 12px / 1.4 | 400 | 0 | Timestamps, captions, freshness indicators |
| `data-lg` | 24px / 1.2 | 600 | 0, tabular-nums | Large stat numbers (Stat Blocks, Score) |
| `data-md` | 16px / 1.3 | 500 | 0, tabular-nums | Table cell values, inline metrics |
| `data-sm` | 13px / 1.3 | 500 | 0, tabular-nums | Dense-table default numeric cells |

**Weights in use, total**: 400 (regular), 500 (medium), 600 (semibold),
700 (bold — reserved for rare emphasis, e.g. a critical alert title).
No component may introduce a fifth weight.

**`label-sm` with uppercase + positive tracking** is a direct, intentional
continuation of the existing sidebar group-header pattern
(`text-[11px] font-semibold uppercase tracking-wider` in
`src/app/(dashboard)/sidebar.tsx`) — re-tokened, not redesigned.

---

## 5. SPACING

### Base unit and scale

Base unit: **4px**. Scale matches Tailwind's default spacing steps
directly (continuity with the existing framework already in the
codebase):

| Token | Value | Token | Value |
|---|---|---|---|
| `space-1` | 4px | `space-8` | 32px |
| `space-2` | 8px | `space-10` | 40px |
| `space-3` | 12px | `space-12` | 48px |
| `space-4` | 16px | `space-16` | 64px |
| `space-5` | 20px | `space-20` | 80px |
| `space-6` | 24px | `space-24` | 96px |

### Applied spacing

| Context | Value | Notes |
|---|---|---|
| Component internal padding (button/input) | 8–12px vertical, 12–16px horizontal | Scales with size variant, see [Section 9](#9-button-system)/[10](#10-form-system) |
| Card padding | 16px (dense/data cards), up to 24px (feature/marketing cards) | Never exceeds 24px — directly avoids the "oversized cards" anti-pattern |
| Page padding (app) | 24px mobile → 32px tablet → 40–48px desktop | |
| Page padding (marketing) | 64–96px desktop | Deliberately more generous — "dense app, generous marketing" per [ux-principles.md](ux-principles.md) |
| Section spacing | 48–64px between major sections | Dashboard sections, Settings categories |
| Form field spacing | 16px between fields, 24px between field groups, 8px label-to-input | |
| Dashboard density | Compact by default | Tighter vertical rhythm (8–12px row padding) — matches the locked "dense but highly readable" direction |
| Table density | Two presets: **Compact** (36–40px row height) for DISCOVER's research tables; **Comfortable** (48–56px row height) for MANAGE list views (Clients, Cohorts, Employees) where fewer, higher-value rows are being scanned | |

### Responsive behavior

Outer container padding scales down with viewport (48→32→24→16px);
**component-internal spacing stays constant** — a button or input never
gets visually cramped just because the viewport shrank. Only the page
frame compresses.

---

## 6. LAYOUT

| Element | Value |
|---|---|
| App content max-width | 1440px (wide enough for dense data tables) |
| Narrow content max-width (forms, auth, settings) | 640–720px |
| Marketing content max-width | 1200px |
| Sidebar width | 256px (matches the existing `w-64` — kept as-is) |
| Dashboard grid | 12-column, 16–24px gutters |
| Detail pages | Single-column stacked (mobile/simple objects) or master/detail split (desktop, objects with sub-lists — e.g. a Client with its Shops) |
| Master/detail split | List panel ~320–400px fixed or 30% fluid + detail panel fluid remainder |
| Modal widths | `sm` 400px (confirmations), `md` 560px (standard forms), `lg` 720px (complex forms/previews), `full` 90vw (rare — report preview) |
| Drawer widths | 400–480px standard (filters, quick-view); up to 640px for richer contextual panels (contextual AI) |
| Breakpoints | `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280 · `2xl` 1536 — matches Tailwind's defaults; no reason to diverge from the framework already in use |

---

## 7. RADII / BORDERS / SHADOWS

### Radius scale

| Token | Value | Note |
|---|---|---|
| `radius-xs` | 4px | Badges, tags, checkboxes |
| `radius-sm` | 6px | [CURRENT] — kept exactly as-is from `tailwind.config.ts` |
| `radius-md` | 10px | [CURRENT] — kept exactly as-is |
| `radius-lg` | 14px | [CURRENT] — kept exactly as-is; **the ceiling** — nothing in the product uses a larger radius |
| `radius-full` | 9999px | Pills, avatars, switches |

**Explicit rule**: no container in the product uses a radius greater
than `radius-lg` (14px). This is the direct fix for the "everything has
20px rounded corners" anti-pattern named in the brief.

### Border hierarchy

`border-subtle` (internal dividers) → `border-default` (card/input
outlines) → `border-strong` (major section separators) — see
[Section 3](#3-color-token-system) for values.

### Shadow hierarchy

| Token | Value (conceptual) | Use |
|---|---|---|
| `shadow-xs` | Barely-visible lift | Reserved, rarely used — most cards use a border instead, not a shadow |
| `shadow-sm` | Soft, short-throw | Dropdowns, popovers, tooltips |
| `shadow-md` | Moderate | Modals |
| `shadow-lg` | Most pronounced (still restrained — no dramatic drop shadows) | Command palette overlay, toasts |

### Elevation rule

**Standard cards use a border, not a shadow.** Shadow is reserved
exclusively for elements that are genuinely floating above the page
(dropdowns, modals, tooltips, the command palette, toasts). This is the
direct mechanism behind avoiding both "oversized cards" and "excessive
glassmorphism" — a bordered, flat card reads as calm and structural; a
heavily-shadowed one reads as decorative.

---

## 8. ICONOGRAPHY

**Library: lucide-react** — [CURRENT], already a dependency
(`^1.30.0`), kept without change. No second icon library is introduced.

| Size token | Value | Use |
|---|---|---|
| `icon-xs` | 14px | Inline with small/meta text |
| `icon-sm` | 16px | Default UI icons, buttons — matches existing sidebar icon size |
| `icon-md` | 20px | Emphasized primary-nav icons |
| `icon-lg` | 24px | Empty-state/feature illustrative icons |

**Stroke**: consistent 1.5–2px stroke weight throughout (lucide's
default) — never mix stroke-based icons with a filled/solid icon set.

**Placement**: icons in primary/secondary navigation are always paired
with a text label — never icon-only in main nav. Icon-only is
acceptable only for well-understood, space-constrained actions (close,
overflow menu, edit), and always carries an `aria-label`.

**Icon button rules**: minimum 32px touch target, icon centered, no
background by default, subtle `bg-muted` on hover.

**Semantic icon mapping** (fixed, reused everywhere a concept recurs) —
built directly on the existing sidebar's own choices
(`src/app/(dashboard)/sidebar.tsx`), not reinvented:

| Concept | Icon |
|---|---|
| Positive trend | `TrendingUp` |
| Negative trend | `TrendingDown` |
| Flat/neutral | `Minus` |
| Warning/Issue | `AlertTriangle` |
| Success/Verified | `CheckCircle` |
| Competitor tracking | `Radar` — already used for "Spy on Competitor" |
| AI | `Sparkles` |
| Notification | `Bell` |

**Avoid decorative icon spam**: icons are reserved for navigation,
status, and actions — never used as filler before every label in dense
tables or body text.

---

## 9. BUTTON SYSTEM

| Variant | Visual | Use |
|---|---|---|
| **Primary** | Solid `brand-primary` fill, `text-inverse` label | The single most important action per view |
| **Secondary** | `border-default` outline, `text-primary` label, `bg-muted` on hover | Secondary actions |
| **Tertiary/Ghost** | No border/fill, `text-primary`, `bg-muted` on hover | Low-emphasis actions |
| **Destructive** | Solid `status-danger` fill (or outline for less severe destructive actions) | Always requires confirmation for the filled/high-severity variant |
| **Success/Action** | Same visual treatment as Primary (`brand-primary` fill) | **[SPEC DECISION]** Reserved specifically for the Optimization "Apply" action — sharing Primary's color reinforces this is a first-class, encouraged action, while staying clearly separated from Destructive |
| **Link** | Text-only, `brand-primary` color, underline appears only on hover | Inline text actions |

### States

| State | Treatment |
|---|---|
| Default | As above per variant |
| Hover | `brand-primary-hover` (Primary/Action), `bg-muted` (Secondary/Ghost) |
| Active | `brand-primary-active` + subtle 1–2% scale-down for tactile feedback |
| Focus | `border-focus` ring, always visible, never suppressed |
| Disabled | ~40% opacity, muted colors, no hover effect, `cursor: not-allowed` |
| Loading | Inline spinner replaces or precedes the label; button retains its size (no layout shift); interaction disabled during load |

### Sizes

| Size | Height | Padding | Text |
|---|---|---|---|
| Compact | 28–32px | 12px horizontal | `body-sm` |
| Default | 36–40px | 16px horizontal | `body-md` |
| Large | 44–48px | 20–24px horizontal | `body-lg` |

---

## 10. FORM SYSTEM

**Shared patterns across every input type**: label above the field
(`label-md`, medium weight); help text below (`meta`, `text-tertiary`);
validation appears on blur/submit, not on every keystroke; errors
change the border to `status-danger` + show an inline icon and message
(never color alone); required fields marked with an asterisk after the
label (not color alone); loading state replaces content with a skeleton
or spinner and disables interaction; disabled state uses `bg-muted` +
reduced opacity + `cursor: not-allowed`.

| Component | Pattern |
|---|---|
| **Input** | Single-line, 40px height (matches Button default), `border-default`, focus → `border-focus` + ring |
| **Textarea** | Multi-line, 96px min-height, vertical-resize only |
| **Select** | Native-feeling dropdown, trailing chevron, same height as Input |
| **Combobox** | Type-ahead + dropdown, used for e.g. "search for a shop to track" |
| **Search** | Leading search icon, visually lighter than a form Input (`bg-muted`, no border until focused) — a distinct "toolbar search" treatment vs. "form search," since they appear in different contexts (Prospects filter bar vs. a settings form) |
| **Date** | Calendar-icon trigger, ISO display, range-selection support for report date filters |
| **Number** | Right-aligned, tabular-nums; stepper controls only where increment/decrement is meaningful (quantity), not for arbitrary numbers like price |
| **Currency** | Currency symbol locked inside the field (not a placeholder), tabular-nums, right-aligned |
| **Password** | Trailing show/hide toggle icon |
| **Checkbox** | 18–20px square, `radius-xs`, `brand-primary` fill when checked |
| **Radio** | Circular, `brand-primary` fill when selected |
| **Switch** | `radius-full` pill, `brand-primary` track when on — used for Settings-style booleans specifically (distinct from Checkbox, which is for list/multi-select) |
| **Multi-select** | Tag/chip display inside the field, dropdown with checkboxes |
| **File upload** | Drag-and-drop zone + fallback "Browse" button; selected state shows filename/size/remove; progress bar during upload |

---

## 11. DATA DISPLAY

### Tables

Header row: `label-md`, `text-secondary`, sticky on scroll for long
tables. Row hover: subtle `bg-muted`. Row height per density preset
(Section 5). **No zebra-striping** — relies on hover + borders instead,
consistent with the restraint principle. Sortable columns show a chevron
indicator. Numeric columns right-align; text columns left-align.

**Dense tables** (Prospects and similar): minimal cell padding
(8px vertical / 12px horizontal), truncate long text with ellipsis +
hover tooltip, optional sticky first column for wide tables.

### Cards

Default: `bg-surface`, `border-default`, `radius-md`, **no shadow** by
default (see [Section 7](#7-radii--borders--shadows)).

### Stat Blocks / Metric Cards / KPI

**One consistent format, reused everywhere** — Dashboard Overview,
Client health rollups, Cohort analytics never invent their own metric
format:

```
[label-md, text-secondary]
[data-lg, tabular-nums, text-primary]  ← the number
[trend indicator: icon + %, colored]    ← optional
[sparkline]                              ← optional
```

### Score / Health score

See [Section 13](#13-health--score-system) — dedicated system.

### Percentage

Tabular-nums, always with `%`. **Colored per meaning, not by
convention** — this explicitly preserves the existing
`competition-scoring.ts` inverted-color rule (Difficulty: green=easy/
weak-competitor, red=hard/strong-competitor; Demand: green=high-demand
even though it's the same "hard" bucket) — see
[ux-principles.md](ux-principles.md). Do not apply a blanket
"green=good, red=bad" rule to every percentage in the product.

### Currency

Tabular-nums, currency symbol prefixed, locale-appropriate formatting.
**Never blended across currencies in one sum** — direct continuation of
the existing, intentional per-store currency principle.

### Trend

Small inline indicator: direction icon (16px) + percentage, colored
(`data-positive`/`data-negative`/`data-neutral`). **Always paired with
its comparison basis** ("vs. last 30 days" in `meta` scale) — a trend
number is never shown without stating what it's compared against.

### Sparkline

Minimal line, no axes/labels, single color matching the parent metric's
semantic color, ~24–32px height. Inline use only (stat blocks, table
cells).

### Badges / Tags / Status

- **Badge**: `radius-full` pill, subtle background + strong text color
  (e.g. `status-positive-subtle` bg + `status-positive-strong` text) —
  never solid-fill (reserves that visual weight for buttons).
- **Tag**: `radius-sm`, user-removable (filters, multi-select chips) —
  visually distinct shape from Badge so "removable" vs. "informational"
  is scannable at a glance.
- **Status**: a specific Badge variant using the semantic status tokens.
  **The single component every status concept in the product renders
  through** — `ConnectorStatus`, `SellerChannel.status`,
  `SubscriptionStatus`, `JobStatus` all map onto one Status badge, not
  N bespoke implementations.

### Avatar / Avatar group

Circular (`radius-full`), initials fallback, sizes 24/32/40px. Avatar
group: overlapping stack, capped at ~3–4 visible + a `+N` overflow
indicator.

### Number communication rules

| State | Treatment |
|---|---|
| Positive | `data-positive` + optional up-arrow |
| Negative | `data-negative` + optional down-arrow |
| Neutral | `data-neutral`, no arrow |
| **Unavailable** | An em-dash "—" in `text-disabled` — **never a blank cell or a "0"**. Zero is a real, meaningful value; missing data must look visibly different from it |
| **Estimated** | The value + a small "≈" prefix or an "Estimated" tooltip, rendered in `text-secondary` (not full-confidence `text-primary` weight) — direct application of "editorial judgment labeled as such" |
| **Stale** | The value renders normally, plus an adjacent clock-icon + "Updated X ago" in `meta` scale, using `status-warning-subtle` once past a freshness threshold |

---

## 12. INTELLIGENCE COMPONENTS

**This is the single highest-leverage section in this document** — per
[information-architecture-v1.md §Recommended Next Design Phase](information-architecture-v1.md#recommended-next-design-phase),
this component set is reused across DISCOVER, OPERATE, MANAGE, and AI.

### Shared base: the Intelligence Card

Every one of the ten object types below is a variant of **one card
structure**:

```
[type icon]  [title, h4]                    [severity/status badge]
[body text, body-sm, text-secondary]
[supporting data — chart / score / comparison, when relevant]
[timestamp/freshness, meta, when relevant]                    [CTA →]
```

### Per-type specification

| Type | Icon | Severity? | Body content | Supporting data | CTA |
|---|---|---|---|---|---|
| **Insight** | `Sparkles` | No | Narrative explanation | Rarely | Optional ("View details") — shows an "AI" source tag if AI-generated |
| **Issue** | `AlertTriangle` | Yes (5-tier, [Section 13](#13-health--score-system)) | Problem description | Confidence indicator if heuristic | "View recommendation" |
| **Opportunity** | `TrendingUp` | Reframed as "potential impact" (low/med/high, positive-toned) | Opportunity description | Often a Benchmark | "Explore" |
| **Recommendation** | `CheckCircle` | No | Prescribed action | — | **Mandatory** — uses the Advise/Prepare/Apply labels from [Section 17](#17-recommendation--action-system); always linked to a parent Issue/Opportunity |
| **Alert** | `Bell` | Yes | What triggered it | Timestamp always shown | "View" / "Dismiss" / "Mute this type" |
| **Benchmark** | `BarChart3` | No | Comparison statement | Two-bar or positioned-marker visualization | Rare (informational) |
| **Score** | — | — | See [Section 13](#13-health--score-system) — its own specialized rendering, not a generic card | | |
| **Trend** | `TrendingUp`/`TrendingDown`/`Minus` | No | Trend description | **Mandatory** sparkline | Optional |
| **Action** | `CheckCircle`/`Clock` | No | What was done, when, by whom | — | None (historical log entry) — always has a timestamp |
| **Outcome** | `TrendingUp` or neutral chart icon | No | Before/after statement | **Mandatory** before/after Score comparison | "View full report" |

**Confidence indicator**: a small percentage or qualitative label
("High confidence" / "Estimated") near the body text, using the
"estimated" number-communication rule from
[Section 11](#11-data-display), applied wherever Insight/Opportunity/
Issue content is heuristically derived rather than a direct fact.

---

## 13. HEALTH / SCORE SYSTEM

**One unified scoring language** for every new intelligence surface —
explicitly not a separate visual system per Shop/SEO/Product score.

| Tier | Numeric range (v1 default) | Color |
|---|---|---|
| Excellent | 90–100 | `status-positive-strong` |
| Good | 70–89 | `status-positive` |
| Needs attention | 50–69 | `status-warning` |
| Poor | 30–49 | `#C2410C` (a deeper orange-red, between warning and full danger) |
| Critical | 0–29 | `status-danger` |
| **Unavailable** | *(not on the numeric scale)* | `text-tertiary`, neutral gray — explicitly **not** placed anywhere on the color gradient, since "no data" is a data-state, not a score-state, and must never visually imply "worse than Critical" |

**[SPEC RECOMMENDATION, OPEN]** The 0–100 banding above is a v1 default,
in the same spirit as `competition-scoring.ts`'s own thresholds being
explicit "editorial judgment calls, easy to retune" — expect
recalibration once real Shop Health data exists. See
[Section 30](#30-design-system-acceptance-criteria).

**Visual indicator**: two forms —
- **Score Ring** — larger, arc/circular progress indicator, used on
  Overview/detail pages.
- **Score Dot** — compact colored dot, used in dense tables/lists.

**Label rule**: the numeric score, the tier color, AND the tier text
label are always shown together (e.g. "72 · Good") — **never color
alone**, both for accessibility and because a bare colored number is
ambiguous without its tier name.

**Explanation / Benchmark / Trend**: clicking a score opens its detail
view — an Intelligence Card breakdown of contributing Issues, a
Benchmark comparison (market average, or cohort median in an Institute
context), and a Trend sparkline of score history.

### Explicit reconciliation with the existing competition score

**This system does not replace or visually merge with
`competition-scoring.ts`'s existing Difficulty/Demand scoring.** That
system is a **specialized, already-shipped application** of scoring,
scoped specifically to Research Shops, using its own 3-tier scale
(easy/moderate/hard) with a deliberately **inverted** color meaning on
the Demand axis (documented in
[ux-principles.md](ux-principles.md)). The 5-tier Excellent→Critical
system above is for **new** intelligence surfaces (Connected Shop
Health, SEO score, Product score — all currently [FUTURE]) and answers
a different question ("how good is *my* shop") than Difficulty/Demand
answers ("should I compete with *this* shop"). They are not to be
unified into one visual system — doing so would erase a real, working,
intentional distinction.

---

## 14. CHARTS & DATA VISUALIZATION

Built on Recharts v3 — [CURRENT] dependency, kept as-is.

| Chart type | Rule |
|---|---|
| Line | Trends over time (single/multi-series); minimal horizontal-only gridlines; smooth-but-not-overcurved interpolation; no 3D |
| Area | Filled line variant when magnitude-under-curve matters; fill opacity ~10–15% (calm, not garish) |
| Bar | Categorical comparisons; consistent width/gap ratio; top corners `radius-xs` only |
| Stacked bar | Composition over categories; always paired with a legend |
| Comparison | Two-series overlay; `data-comparison-primary`/`data-comparison-secondary` — never red/green (reserved for positive/negative meaning) |
| Distribution | Single-hue histogram bars — one dimension, no categorical variety needed |
| Ranking | Horizontal bars, sorted descending, direct labeling (not axis lookup) |
| Funnel | Decreasing-width stages, labeled with count + % of previous stage |
| Sparkline | See [Section 11](#11-data-display) |

**Axes/labels**: only what's necessary; direct labeling preferred over
legend lookup for ≤3 series, legend required for 4+.

**Tooltips**: hover-triggered, show exact value + date/category + delta
from previous point, using the numeric formatting rules from
[Section 11](#11-data-display).

**States** — mandatory, not optional:

| State | Treatment |
|---|---|
| Empty (nothing tracked yet) | Illustrative icon + "No data yet" + CTA if actionable |
| Loading | Skeleton shimmer in the chart's shape — not a generic spinner, preserves layout |
| No-data (queried, zero results) | "No results for this filter" + "Clear filters" CTA — distinct from Empty |
| Insufficient-data | Explicit "Need at least N data points to show a trend" — never render a misleading single-point line |
| Stale-data | Chart renders normally + a visible stale badge/banner (`status-warning-subtle`) |

Charts prioritize comprehension over decoration — no gratuitous
animation, no unnecessary 3D, no chart-junk gridlines.

---

## 15. NAVIGATION COMPONENTS

| Component | Visual rule |
|---|---|
| **Primary sidebar** | Fixed 256px width, `bg-surface`; active item = `brand-primary-subtle` background + `brand-primary` text/icon — a direct re-tokening of the existing `bg-accent-soft`/`text-accent` pattern, not a redesign; grouped sections with `label-sm` uppercase-tracked headers |
| **Secondary navigation / Tabs** | Underline-indicator style (not pill-chip tabs, which read more casual) — active = `brand-primary` underline + `text-primary`; inactive = `text-secondary`. Same treatment used for both "secondary nav" and "tabs on an object workspace" — one pattern |
| **Breadcrumbs** | `text-secondary` links, subtle chevron separators, current page = `text-primary` non-link; truncate middle segments (first + last + ellipsis) on narrow viewports, never wrap |
| **Command palette** | Centered modal, `shadow-lg`, auto-focused search input, grouped/sectioned results, keyboard-navigable, triggered via Cmd/Ctrl+K |
| **Global search** | **[SPEC DECISION]** Lives *inside* the Command Palette rather than as a separate UI surface — maintaining two separate search entry points was an unresolved ambiguity in the IA; this document resolves it by merging them into one Cmd+K surface that handles both navigation and content search |
| **Workspace switcher** | Compact dropdown, only rendered for users with genuine multi-org membership — never permanent chrome for everyone |
| **Client/Cohort scope switcher** | Prominent, near the top of the MANAGE area — search-to-switch combobox, distinct icon (folder/building) from the Shop selector below |
| **Connected-shop selector** | Positioned at the top of the OPERATE area, distinct icon (store) from the Scope switcher — the two must be visually distinguishable even though both are "dropdown switchers," per the IA's explicit three-distinct-concepts requirement |
| **Mobile navigation** | Bottom tab bar, icon + micro-label per tab, active = `brand-primary` icon+label |

---

## 16. SHOP / CONNECTION COMPONENTS

**Scoped exclusively to Connected Shop.** Research Shop has no
connect/OAuth/sync states at all — these patterns must never appear
anywhere in DISCOVER.

| State | Pattern |
|---|---|
| Connect marketplace | Card-based platform selector (Shopify/WooCommerce/Etsy-seller logo + "Connect" button) |
| OAuth authorization | "Redirecting you to [Platform] to authorize..." interstitial (spinner) — this step happens on the external platform |
| Connection pending | Spinner + "Connecting your store..." while the callback processes |
| Connection success | Checkmark, positive-toned, immediate "View your shop" CTA |
| Connection failure | `status-danger`-toned card, specific reason if known ("Authorization was denied" vs. "Connection timed out"), "Try again" CTA — never a generic unexplained failure |
| Sync / Syncing | Small spinner + "Syncing..." near the shop name during `SellerChannel` sync |
| Stale data | Clock badge + "Last synced X ago" — same pattern as [Section 11](#11-data-display) |
| Disconnected | Muted/grayed shop card, distinct "Disconnected" Status badge |
| Reconnect | Prominent CTA on a disconnected/errored shop card |
| Permissions | Read-only summary of granted OAuth scopes in Settings → Connections |
| Connection health | Status badge, mapped from `ConnectorStatus`/`SellerChannel.status` (`ACTIVE`/`ERROR`/`DISABLED` → positive/danger/neutral) |

---

## 17. RECOMMENDATION / ACTION SYSTEM

**This section directly resolves the "Act" ambiguity found
independently in three journeys in
[ia-journey-validation.md](ia-journey-validation.md)** (Journeys 3, 4,
and the Cross-Journey Problems table).

```
INSIGHT → RECOMMENDATION → PREVIEW/PREPARE → USER APPROVAL → APPLY → VERIFY → MEASURE
```

| State | Visual treatment |
|---|---|
| Insight | Intelligence Card, informational only — no action pipeline attached yet |
| Recommendation | Intelligence Card, CTA reads **"Review"** — never a verb implying the action already happened |
| Preview/Prepare | Expanded/modal diff-style view — exactly what will change ("Title will change from X to Y") |
| User Approval | Explicit confirmation — "Apply this change" + "Cancel," not a single ambiguous click; modal for high-stakes changes, inline for low-stakes |
| Apply | Loading state ("Applying...") — may involve a real write-scope API call to the connected platform |
| Verify | Distinct post-apply confirmation that the change actually took effect on the real platform (not just SellerSalt's local record) — "Verified" or "Verification pending" |
| Measure | The Outcome Intelligence Card, surfaced once enough time has passed for a re-scan to detect the effect |

### Explicit vocabulary — never ambiguous

| Term | Meaning | CTA phrasing |
|---|---|---|
| **Advise** | No write-scope action attached — user must make the change themselves elsewhere | "See how to fix this" |
| **Prepare** | SellerSalt shows the specific proposed change (Preview state) but hasn't executed it | "Preview this change" |
| **Apply** | SellerSalt executes a real write-scope change, after explicit User Approval | Explicit verb naming the change ("Apply this title change") — never a vague "Fix" or "Optimize now" |
| **Automate** | **[FUTURE, DECISION REQUIRED]** — pre-authorized, unattended application of a category of changes. Not built, not authorized by any locked decision. Must be opt-in, clearly labeled ("Auto-apply enabled for: title formatting"), and always reversible/loggable via the Action object type once it exists |

**"Act" must never appear as an unqualified button label anywhere in
the product** — every actionable moment uses one of the four terms
above.

---

## 18. AI UI SYSTEM

AI is a cross-product layer, per
[information-architecture-v1.md §AI IA](information-architecture-v1.md#ai-ia)
— never an isolated page.

| Element | Pattern |
|---|---|
| Global AI entry | Persistent, compact launcher (pill/button, `Sparkles` icon, brand-colored) — **not** a floating chat bubble, which reads as generic. Opens a **slide-in side panel**, keeping underlying context visible (desktop); full-screen on mobile |
| Contextual AI entry | "Ask AI" affordance on object detail pages — opens the same panel, pre-seeded with a removable "context chip" (e.g. "Asking about: [Shop Name]") |
| Command/search interface | The AI panel's input is optimized for natural-language questions; the Command Palette remains the dedicated fast path for pure navigation — deliberately two distinct affordances, per the IA's own reasoning |
| Suggested prompts | Tappable chips shown only when the conversation is empty, seeded from the brief's example query list; disappear once a real conversation starts |
| Conversation | Visually restrained — no cartoon avatars, no bubble-tail decoration; user messages right-aligned/subtle bg, AI responses left-aligned/no bg (reads as "the product talking") |
| Tool execution / thinking | Compact inline indicator naming *which* data is being consulted ("Analyzing your shop data...") rather than a generic "Thinking..." — transparency, ties to citations below |
| Result cards/tables/charts | **Reuse [Intelligence Cards](#12-intelligence-components) and [Data Display](#11-data-display) exactly** — no AI-specific chart/table variants |
| Recommendations/Actions from AI | Route through the **exact same** [Recommendation/Action pipeline](#17-recommendation--action-system) as native Optimization — the only difference is a small "Suggested by AI" source tag |
| Citations/source context | Every data-grounded response shows what it's grounded in ("Based on 42 tracked competitors," or a footnote linking to the underlying Report/Score) — direct application of "editorial judgment labeled as such" |
| Partial results | Show what succeeded normally; clearly flag what didn't ("I couldn't check your SEO score — that isn't available on your plan yet") rather than silently omitting it |
| **Unavailable capability** | **A specific, honest response card** (info-toned, not danger) stating what was asked, that it isn't available yet, and what *is* available instead — directly resolves the mandatory gap found in [ia-journey-validation.md, Journey 7](ia-journey-validation.md#7-ai-copilot) |
| Permission denied | Distinct from "unavailable" — used when the capability exists but this user's plan/role doesn't include it; specific reason + upgrade/request-access CTA |
| Confirmation before actions | Any AI-suggested Apply-tier action requires the **same** User Approval step as native Optimization — no shortcut around the approval pipeline |

---

## 19. REPORTING

| Element | Pattern |
|---|---|
| Report header | Title, subject (shop/client/cohort name), date range, generated-on timestamp, optional branding slot |
| Metric section | Stat Block grid (Section 11) |
| Insight section | Insight Intelligence Cards |
| Recommendation section | Recommendation Intelligence Cards — same visual language as in-app Optimization |
| Comparison | Comparison chart, or a Benchmark component for peer-group comparisons (cohort median, market average) |
| Before/after | Outcome Intelligence Card — the centerpiece of Agency proof reports specifically |
| Chart | Standard chart components, no report-specific variants |
| Footer | Generation metadata, page numbers (PDF), "Powered by SellerSalt" mark (subtle, unless white-labeled) |
| Branding | **[SPEC DECISION, scope-limited]** A defined branding slot — logo + one accent color override — at header/footer only. Full white-label re-theming of fonts/spacing/chart style is explicitly **out of scope for v1**; a reasonable, implementable limit rather than an open-ended re-theming system |
| Export | PDF export action, top-right of report view |
| Share link | "Share" action → token-gated external URL, visible "Shared" indicator once active, "Revoke" action |

**Must work across contexts** without inventing a new visual system per
context — Individual (My Reports, single-shop scope), Agency (Client
Reports, branding slot + before/after emphasis), the external
no-login Client view (same system, minus internal-only chrome),
Institute (Student/Cohort Reports, Benchmark-against-cohort emphasis
instead of before/after), and Cohort rollups (Stat Blocks become
cohort-wide averages; Outcome becomes a distribution/ranking chart
across students instead of one before/after pair).

---

## 20. NOTIFICATIONS / ALERTS

Four distinct content types, per the brief:

| Type | Meaning | Tone | Lives in Notification Center? |
|---|---|---|---|
| **Notification** | "Something happened" | Neutral/info, past-tense, low visual weight, auto-clears on view | **Yes** — this and Alert are the two types that live here |
| **Alert** | "Something important requires attention" | Warning/danger-toned, present/imperative, higher visual weight (bold title, colored left-border accent), requires explicit dismiss | **Yes** |
| **Intelligence insight** | "Here's what the data means" | Uses the Insight Intelligence Card exactly | **No** — lives contextually where the data is (e.g. a Shop Overview), unless surfaced as a digest |
| **Recommendation** | "Here's what you should consider doing" | Uses the Recommendation Intelligence Card exactly | **No** — same rule as Insight, unless urgent enough to *also* trigger an Alert that deep-links to it (never duplicated content, always a pointer) |

---

## 21. ADMIN UI

Admin is a separate product experience — visually related to SellerSalt
but must communicate elevated operational context.

**[SPEC DECISION — respecting Decision 2's locked light-only
constraint]** A dark admin theme was considered and explicitly
**rejected** here: Decision 2 locks light-theme-only, and a dark admin
shell would be a scoped reintroduction of dark mode without explicit
product-owner authorization. Instead, Admin uses:

- A subtly distinct page background — `bg-muted` (warm-gray tint)
  instead of `bg-page`'s off-white, for the entire Admin shell.
- A persistent "Admin" badge/wordmark in the sidebar header.
- The same component library as customer-facing screens (Tables, Cards,
  Status badges) — Admin never invents its own visual language, only a
  distinguishing shell tint.

| Element | Pattern |
|---|---|
| Admin sidebar | Same structural component as the customer sidebar, `bg-muted`-tinted shell, "Admin" badge |
| Department dashboards | Stat Block grid scoped to department KPIs |
| Customer lookup | Prominent Search pattern at the top of relevant modules — directly resolves the gap found in [ia-journey-validation.md, Journey 9](ia-journey-validation.md#9-sub-admin) |
| Account detail | Master/detail — org info + linked Members/Clients/Shops |
| Billing detail | Stat Blocks + Dense Table transaction history |
| Verification workflow | Stepper/checklist pattern (pending/in-review/verified/rejected), Status badges — pattern specified now, feature is [FUTURE] |
| User management | Standard Table + row actions |
| System health | Stat Blocks (queue depth, job success rate) + Table (recent failures) |
| Jobs/queues | Table, Status badges mapped to the real `JobStatus` enum (`QUEUED`/`RUNNING`/`SUCCESS`/`FAILED`) |
| Audit logs | Chronological list using the **Action** Intelligence Card type — direct reuse at platform scope instead of shop scope |
| Settings | Reuses [Section 22](#22-settings) exactly, populated with `AppSetting` fields |

---

## 22. SETTINGS

| Element | Pattern |
|---|---|
| Settings navigation | Vertical list, second-level nav specific to Settings (distinct from the app's main sidebar), using the IA-approved categories: Account, Security, Workspace, Members, Roles & Permissions*, Connections, Notifications, Billing, AI, Privacy & Data (*Agency/Institute/Admin only) |
| Category pages | Title/description at top, form sections below, each section in its own bordered Card |
| Forms | Reuse [Section 10](#10-form-system) exactly |
| Save states | Explicit "Save" per section; simple toggles (notification preferences) auto-save with a brief inline "Saved" confirmation |
| Dirty state | "Unsaved changes" label; Save button enabled/brand-colored only when dirty |
| Confirmation | Modal confirmation for consequential changes (e.g. billing provider live-mode switch — continuing the existing product pattern already noted in root `CLAUDE.md`) |
| Destructive actions | `status-danger` button + confirmation modal; most severe actions (e.g. deleting an org) require typing a confirmation phrase |

---

## 23. EMAIL DESIGN SYSTEM

The visual system the **future** admin email-template editor
([FUTURE], per [product/complete-product-surface.md](../product/complete-product-surface.md))
will use as its component library — not a claim the editor exists.

| Element | Pattern |
|---|---|
| Logo | Top-left or centered, consistent size across templates |
| Header | Thin `brand-primary` top accent bar + logo — kept minimal since email clients render chrome inconsistently |
| Content | Single-column, ~600px max-width, 15–16px minimum body text (larger than app UI, for cross-client legibility) |
| CTA | One prominent button per email — solid fill, no gradients/shadows (many clients strip them) |
| Information blocks | Bordered/subtly-shaded boxes for structured info (e.g. trial-ending details) |
| Alerts | Colored left-border block, matching the in-app Alert treatment, for urgent transactional content |
| Footer | Company info, unsubscribe/preferences link (marketing/digest categories only — not critical transactional email) |
| Legal | Compliance small-print (physical address, etc.) |
| Unsubscribe/preferences | Ties to Notification Preferences ([Section 20](#20-notifications--alerts)/[22](#22-settings)) |

---

## 24. EMPTY / LOADING / ERROR STATES

**Mandatory**, per the brief.

General pattern: icon (24–32px, muted) + primary message (`body-md`,
`text-primary`) + optional secondary message (`body-sm`,
`text-secondary`) + optional CTA.

| State | Treatment |
|---|---|
| First-use empty | Encouraging tone + clear primary CTA ("Run your first search") |
| No data (queried, zero results) | Neutral tone + "Clear filters"/"Adjust search" CTA |
| No search results | Same as above, search-specific copy |
| **No connected shop** | Illustrative icon + "Connect your shop to see this" + "Connect" CTA |
| Sync pending | Spinner + "Setting up your shop... this usually takes a few minutes" — manages expectations, directly resolving the gap found in [ia-journey-validation.md, Journey 2](ia-journey-validation.md#2-connected-seller--shop-diagnosis) |
| Stale data | Inline badge (Section 11), not a full-page state |
| Insufficient data | Specific messaging (Section 14), not a generic empty state |
| Permission denied | Lock icon + "You don't have access to this" + "Ask an admin"/upgrade CTA — neutral/info tone, not danger (expected behavior, not an error) |
| **Feature unavailable** | Info-toned, specific about what's missing — see [Section 18](#18-ai-ui-system)'s "Unavailable capability" for the AI-specific rendering of this same state |
| Loading | Skeleton screens matching the eventual content's shape, preferred over spinners |
| Partial loading | Some sections show real content while others still show skeletons — acceptable, often better than blocking the whole page |
| Error | Danger-toned icon + specific message (never bare "Something went wrong") + "Retry" CTA |
| Retry | Re-attempts the failed action, brief loading state |
| Success | Auto-dismissing toast, positive-toned, checkmark icon |

**Two states with dedicated emphasis, per the brief:**

1. **Connected Shop with no data yet** — the full chain: Connect →
   Sync pending → "Your shop is connected — analysis starts shortly"
   (an explicit intermediate state, once synced but before first scan)
   → first Score appears. Directly resolves the undefined first-scan
   moment found in Journey 2 of the IA validation.
2. **AI when requested capability is not yet available** — the same
   underlying "Feature unavailable" state, rendered specifically inside
   the AI conversation surface (Section 18).

---

## 25. RESPONSIVE SYSTEM

| Breakpoint | Sidebar | Master/detail |
|---|---|---|
| Desktop (≥1024px) | Full, persistent | Side-by-side |
| Tablet (768–1023px) | Icon-only rail or toggleable drawer, depending on available width | May stack if no room for a true split |
| Mobile (<768px) | Bottom tab bar replaces sidebar entirely | Sequential (list → tap → detail, with back navigation) |

**Component-specific rules — never "just stack everything":**

| Component | Adaptation |
|---|---|
| Tables | Mobile: card-per-row (key fields + tap for full detail). **Exception**: wide research tables (Prospects) keep horizontal scroll + sticky first column, since spreadsheet-style scanning is the expected mental model there |
| Cards / Stat Blocks | Grid reflows multi-column → 2-column (tablet) → single-column (mobile); individual card internal layout stays consistent |
| Charts | Fewer visible data points/labels on mobile, tap-triggered (not hover-triggered) tooltips |
| Filters | Desktop: inline bar. Mobile: collapses into a "Filters" button opening a full-screen sheet |
| Modals | Desktop: centered at defined widths. Mobile: full-screen (fixed-width modals don't work below ~480px) |
| Drawers | Desktop: side-anchored. Mobile: bottom sheet |
| Forms | Single-column at every breakpoint — already discouraged from multi-column on desktop, so no responsive change is needed |
| AI interface | Desktop: slide-in side panel (context stays visible). Mobile: full-screen takeover, with a clear close action back to context |
| Dense research UI | Mobile defaults to a card-based results view (not a shrunk table); full table density reserved for tablet/desktop |

---

## 26. ACCESSIBILITY

| Requirement | Target |
|---|---|
| WCAG target | **2.1 Level AA** — explicit minimum bar |
| Contrast | 4.5:1 body text, 3:1 large text (≥18px, or bold ≥14px) and UI-component boundaries |
| Focus | Every interactive element has a visible focus state (`border-focus` ring, [Section 3](#3-color-token-system)) — `outline: none` is never used without a replacement |
| Keyboard navigation | All primary actions reachable without a mouse; Command Palette (Cmd/Ctrl+K) as the power-user entry point; the three switcher components and the AI panel must be fully keyboard-operable |
| Semantic HTML | Real `<button>`/`<a>`/`<table>`/`<nav>`/`<main>`, not styled `<div>`s; form inputs always paired with real `<label>` elements, never placeholder-as-label |
| Screen reader behavior | Status changes outside direct focus (background sync completing, an alert triggering) announced via ARIA live regions; icon-only buttons always carry `aria-label`; the Score system's "never color alone" rule is itself an accessibility requirement |
| Reduced motion | Respects `prefers-reduced-motion` — skeleton shimmer, chart transitions, panel slide-ins all have a reduced/instant alternative; motion is never the *only* channel for information |
| Touch targets | Minimum 44×44px for interactive elements on touch surfaces |
| Error communication | Never color-only — always icon + text, per [Section 10](#10-form-system)'s validation rules |

---

## 27. DESIGN TOKENS IMPLEMENTATION

**Prefer CSS custom properties, consumed via Tailwind's semantic-token
pattern** — this directly continues the existing, working mechanism
already in the codebase (`--color-ink`, `--color-paper`, etc. in
`src/app/globals.css`, consumed via `tailwind.config.ts`'s
`rgb(var(--x) / <alpha-value>)` pattern), not a new mechanism.

### Naming convention

`--{category}-{role}[-{modifier}]`:

```
--color-bg-page / -surface / -elevated / -muted / -inverse
--color-text-primary / -secondary / -tertiary / -disabled / -inverse
--color-border-default / -subtle / -strong / -focus
--color-brand-primary / -primary-hover / -primary-active / -primary-subtle
--color-status-positive / -positive-subtle / -positive-strong
--color-status-warning / -warning-subtle
--color-status-danger / -danger-subtle
--color-status-info / -info-subtle
--color-data-series-1 … --color-data-series-7
--color-data-positive / -negative / -neutral
--color-data-comparison-primary / -comparison-secondary

--space-1 … --space-24
--radius-xs / -sm / -md / -lg / -full
--shadow-xs / -sm / -md / -lg
--font-display / --font-ui / --font-mono
--text-display-2xl…sm / --text-h1…h4 / --text-body-lg,md,sm
--text-label-md,sm / --text-meta / --text-data-lg,md,sm
```

### Ownership

Global tokens (color/typography/spacing/radius/shadow) are owned at one
central layer — a component **never** hardcodes a raw hex/px value.
Component-level tokens are permitted as a thin reference layer (e.g.
`--card-padding: var(--space-4)`), never as new raw values — this is
the mechanism that prevents visual drift as the component library
grows. Exact file structure/implementation code is intentionally not
specified here, per this document's own scope (a naming-convention and
ownership contract, not a code diff).

---

## 28. COMPONENT ARCHITECTURE

```
Primitive          Box, Text, Icon, Stack
  ↓
Core component      Button, Input, Badge, Avatar, Card, Tooltip
  ↓
Composite component  ScoreBadge, StatBlock, StatusBadge, IntelligenceCard
  ↓
Product pattern       RecommendationCard, OptimizationIssueList,
                        ShopHealthSummary, ConnectShopFlow
  ↓
Page pattern            ShopOptimizationPage, ClientDetailPage
```

### Worked example, using SellerSalt's real vocabulary

```
Button
  ↓
ActionButton         (Button + loading/confirmation states, per
                       Section 17's Apply pipeline)
  ↓
RecommendationCard    (IntelligenceCard + ActionButton)
  ↓
OptimizationPanel      (list of RecommendationCard + IssueCard,
                         grouped by priority)
  ↓
ShopOptimizationPage     (OptimizationPanel + ShopHealthSummary +
                           Tabs + Breadcrumbs)
```

A Recommendation shown in Optimization, in a Report, and in an AI
result all use the **same** `RecommendationCard` composite — the
mechanism that prevents three separately-implemented versions of "a
recommendation" from drifting apart over time.

---

## 29. DESIGN ANTI-PATTERNS

Consolidated from the brief's own list plus every rule established
throughout this document:

- Generic SaaS template aesthetics
- Excessive gradients
- Excessive glassmorphism
- Noisy dashboards (too many simultaneously-competing visual signals)
- Oversized cards (padding/shadow disproportionate to content density)
- Excessive rounded containers (anything past `radius-lg`/14px)
- Decorative UI that doesn't communicate information
- Dark dashboard aesthetic (including within Admin — see
  [Section 21](#21-admin-ui)'s explicit light-theme-compliant
  alternative)
- Zebra-striped tables
- Two separate search UIs (resolved: Command Palette absorbs Global
  Search — [Section 15](#15-navigation-components))
- Color-only meaning, anywhere (status, score, error, required-field)
- Mixing Research Shop and Connected Shop visual treatment
- AI as an isolated full-page chatbot experience
- Ambiguous "Act" buttons not specifying Advise/Prepare/Apply/Automate
- Inventing a new visual pattern per Intelligence object type instead
  of the shared Intelligence Card base
- Merging the three distinct switcher concepts (Workspace/Scope/Shop)
  into one generic dropdown
- Blank cells or "0" representing missing/unavailable data
- More than 4 font weights in use anywhere
- Shadows on standard content cards (reserved for genuinely floating
  elements)
- "Just stacking everything" for mobile without breakpoint-specific
  component treatment

---

## 30. DESIGN SYSTEM ACCEPTANCE CRITERIA

| Criterion | Status |
|---|---|
| All semantic color tokens defined with concrete values | ✅ Done — [Section 3](#3-color-token-system) |
| Typography scale fully defined | ✅ Done — [Section 4](#4-typography) |
| Spacing/layout/radius/shadow scales defined | ✅ Done — [Sections 5–7](#5-spacing) |
| Component states defined (buttons, forms, data display) | ✅ Done — [Sections 9–11](#9-button-system) |
| Responsive behavior defined per breakpoint, per component category | ✅ Done — [Section 25](#25-responsive-system) |
| Accessibility target and rules defined | ✅ Done at the rule level — [Section 26](#26-accessibility) |
| Data visualization rules defined, including empty/loading/stale states | ✅ Done — [Section 14](#14-charts--data-visualization) |
| Intelligence vocabulary defined (10 object types, one shared base) | ✅ Done — [Section 12](#12-intelligence-components) |
| AI UI patterns defined, including mandatory graceful-degradation | ✅ Done — [Section 18](#18-ai-ui-system) |
| Research Shop / Connected Shop distinction represented in components | ✅ Done — [Section 16](#16-shop--connection-components) scoped exclusively to Connected Shop |
| Three distinct scopes represented as visually distinct components | ✅ Done — [Section 15](#15-navigation-components) |
| Admin experience visually separated, without violating light-theme-only | ✅ Done — [Section 21](#21-admin-ui) |
| Action hierarchy (Advise/Prepare/Apply/Automate) represented | ✅ Done — [Section 17](#17-recommendation--action-system), directly resolves the IA validation's "Act" finding |
| **[OPEN]** Contrast ratios formally verified against WCAG AA for every token pairing | Not yet run — explicit pre-implementation task, values were chosen with the target in mind but not machine-verified in this pass |
| **[OPEN]** Display typeface (General Sans) confirmed by product owner | This document's recommendation only — Decision 2 locked colors + light-only, not a specific display font |
| **[OPEN]** Score-tier numeric thresholds (0–100 banding) calibrated against real data | v1 placeholder banding, expected to be retuned once Shop Health scoring is actually built, same spirit as `competition-scoring.ts`'s own thresholds |
| Component library implemented in code | Not started — explicitly out of scope for this document |

None of the three [OPEN] items block **starting** implementation — a
component can be built against the stated hex values today and refined
once a contrast audit runs; the display font can ship with the
recommendation and be swapped later without restructuring any
component; score thresholds can ship as v1 and be recalibrated with
real data later. They are refinements to run **in parallel with**
implementation, not gates in front of it.

---

## DESIGN SYSTEM STATUS

## READY FOR UI IMPLEMENTATION

**Why**: every section requested by the brief has a concrete,
implementable specification — not a placeholder, not a vague direction.
Colors are real hex values with stated reasoning. Typography is a
complete semantic scale, not ten arbitrarily chosen sizes. Spacing,
layout, radii, and shadows are fully scaled and ruled. The Intelligence
component vocabulary — the system's highest-leverage piece — is fully
specified with one shared base and ten concrete variants. The
Recommendation/Action hierarchy directly resolves the specific "Act"
ambiguity the IA validation found, with explicit Advise/Prepare/Apply/
Automate terminology that makes automatic modification structurally
impossible to imply by accident. The Research Shop/Connected Shop
distinction, the three-switcher model, and the Admin/customer
separation are all represented in concrete components, not just
restated as principles.

This status is not claimed merely because the document exists — it's
earned by every section resolving to specific, usable values, and by
this document explicitly separating what's decided from what's still
open (the three items in [Section 30](#30-design-system-acceptance-criteria))
rather than glossing over them. None of those three open items block a
developer or coding agent from starting real component work today —
each has a stated, reasonable default in the meantime.

**Recommendation**: proceed with implementation following the sequence
already set in
[product/complete-product-surface.md §Recommended Design Order](../product/complete-product-surface.md#recommended-design-order):
build the token layer first, then re-skin the existing CURRENT
Individual/DISCOVER surface as this system's proving ground, before
extending to the unbuilt Agency/Institute/OPERATE/AI surfaces — running
the three open acceptance-criteria items (contrast audit, font
ratification, score-threshold calibration) in parallel, not as a
blocking gate.
