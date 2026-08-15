Status: Draft
Owner: [ASSUMPTION] Founder (Aliyan)
Last Updated: 2026-08-14
Decision State: Target palette and theme direction are [LOCKED] (Decision 2, 2026-08-14). Semantic token spec and component states are [DECISION REQUIRED] — not yet designed. No visual implementation work has started.

# Design System

## [LOCKED — Decision 2, 2026-08-14] Approved target design direction

> The existing application's blue primary color (`#2563EB`) and existing
> dark-mode implementation are **legacy implementation details** — they
> are **not** the final SellerSalt design direction.

Approved target:

| Property | Value |
|---|---|
| Theme | **Light only.** Dark mode is not part of the current target product unless explicitly reintroduced later — treat the existing dark-mode CSS variables and `dark:` utility classes throughout the codebase as legacy, not as a baseline to extend. |
| Surfaces | White / off-white |
| Primary ink | `#141B16` |
| Primary accent (growth) | `#16C784` |
| Secondary accent (gold) | `#FFB020` |
| Aesthetic | Premium, restrained, editorial SaaS — comparable to Stripe/Linear/Vercel/Notion quality level |
| Typography | Modern, strong hierarchy |
| Spacing | Disciplined |
| App density | Dense but highly readable |
| Marketing layout | Generous |
| Responsive | Yes |
| Accessible | Yes |

**This is a locked decision, not a mechanical blue→green find/replace.**
No screens have been redesigned in this pass — this document defines
the target direction and the semantic-token approach the eventual
implementation must follow; it does not itself constitute that
implementation.

## What this decision does NOT authorize yet

- No component has been restyled.
- No token values beyond the three locked colors above have been
  chosen (e.g. exact off-white surface hex, exact ink-on-surface text
  colors at different emphasis levels, exact gold usage rules).
- No dark-mode removal has happened in code — `tailwind.config.ts` still
  defines `darkMode: "class"` and `globals.css` still defines dark CSS
  variables as of this pass. Removing them is implementation work, out
  of scope for a documentation-only pass, and should happen deliberately
  (see "Migration path" below) rather than accidentally during an
  unrelated change.

## Semantic design tokens — required structure, values [DECISION REQUIRED]

The brief requires the future design system to "define semantic design
tokens and component states," not just three brand colors. The
locked palette gives the *raw* values; semantic tokens are the layer
that lets components reference *intent* ("surface," "primary action")
rather than a hex code, so a future palette adjustment doesn't require
hunting through every component. None of the token names/values below
are finalized — this is the structure the eventual token spec should
fill in, carried forward from the CSS-variable pattern already proven
in the current (legacy) implementation (`--color-ink`, `--color-paper`,
etc. in `globals.css`) — that mechanism is worth keeping even though its
values are being replaced.

Recommended categories to define, each as a semantic token backed by a
raw palette value:

- **Surface tokens** — page background, card/panel background, raised
  surface (e.g. a modal), sunken surface (e.g. an input field). All
  derived from white/off-white per the locked direction — likely 2–3
  steps of off-white, not just one.
- **Ink/text tokens** — primary text (`#141B16`-derived), secondary/
  muted text, disabled text, text-on-accent (for text sitting on a
  `#16C784` or `#FFB020` fill, which needs a contrast-checked color, not
  necessarily white).
- **Border/line tokens** — default border, subtle divider, focus-ring
  border.
- **Accent tokens** — primary action (`#16C784`-derived: default/hover/
  active/disabled states), secondary/gold accent (`#FFB020`-derived) and
  its own usage rule (the brief lists it as "gold/accent" — [DECISION
  REQUIRED]: is gold a second call-to-action tier, a highlight/badge
  color, or both — needs a usage rule, not just a hex value).
- **Semantic status tokens** — success, warning, danger, info. The
  current (legacy) implementation already separates `success`/`warn`/
  `danger` from `accent` (`tailwind.config.ts`) — that separation is
  worth preserving; only the accent value itself changes. [DECISION
  REQUIRED]: whether `success` stays distinct from the new growth-green
  primary accent (`#16C784`) or intentionally shares it — they're
  conceptually adjacent (both "green = good") but conflating them would
  make a "success" toast and a "primary button" indistinguishable, which
  may or may not be desired.
- **Component states** — for every interactive component (button, input,
  nav item, tab): default, hover, active/pressed, focus-visible,
  disabled, and (for selection-style components like the sidebar's
  active nav item) selected. The current implementation already has a
  real example of a state token in practice — `bg-accent-soft`/
  `text-accent` for the sidebar's active-item state
  (`src/app/(dashboard)/sidebar.tsx`) — worth using as the reference
  pattern for how a "soft"/muted variant of a token gets derived, even
  though its underlying color is changing.

## Legacy implementation (current code — not the target)

For reference when the redesign eventually happens, verified against
`tailwind.config.ts` and `src/app/globals.css` in this pass:

- CSS custom properties (`--color-ink`, `--color-paper`, `--color-surface`,
  `--color-line`, `--color-muted`, `--color-accent-soft`), light values
  in `:root`, dark values in a `.dark` override — the dark override
  block is exactly what becomes unnecessary once dark mode is formally
  removed per this decision.
- Accent `#2563EB`/`#1D4ED8` (blue) — superseded by `#16C784` (green).
- Semantic colors `success` `#16A34A`, `warn` `#D97706`, `danger`
  `#DC2626` — likely stay conceptually (see "semantic status tokens"
  above), values TBD.
- Border radius scale (`sm: 6px`, `md: 10px`, `lg: 14px`) — restrained,
  already consistent with the locked "premium, restrained" direction;
  no indication this needs to change.
- Inter (sans) / JetBrains Mono (mono) typography — consistent with
  "modern typography"; [VERIFY] whether a separate display typeface is
  loaded elsewhere for marketing headlines (not found in
  `tailwind.config.ts` in this pass).
- Marketing site styling scoped under `.sellersalt-marketing`
  (`src/app/marketing.css`), independent from the dashboard's token
  system — this scoping mechanism is worth keeping regardless of the
  token rewrite, since it's what already lets the marketing site and
  app evolve independently.

## Migration path (when implementation work is authorized)

Not scoped in this pass — flagging the shape of the work for whoever
picks it up:
1. Define the full semantic token set (open items above) and get
   product-owner sign-off on the token spec itself, separately from the
   three already-locked raw colors.
2. Replace CSS variable values in `globals.css`, removing the dark-mode
   override block.
3. Remove `darkMode: "class"` from `tailwind.config.ts` and audit for
   `dark:` utility usage across components (`competition-scoring.ts`'s
   level-meta objects are one confirmed location using `dark:` classes
   — see [architecture/marketplace.md](../architecture/marketplace.md)/
   [marketplace/etsy.md](../marketplace/etsy.md) for that file's
   unrelated scoring logic, which would need its `dark:` classes
   stripped as part of this, not its scoring thresholds touched).
4. Re-verify contrast/accessibility on the new light-only palette,
   given "accessible" is part of the locked direction — a dedicated
   contrast check against `#141B16` on off-white and text-on-`#16C784`/
   `#FFB020` should happen before shipping, not be assumed.

## Cross-references

[product/product-map.md](../product/product-map.md) (dark-mode row,
updated to reflect this decision), [design/ux-principles.md](ux-principles.md).
