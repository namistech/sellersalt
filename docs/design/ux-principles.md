Status: Draft
Owner: [ASSUMPTION] Founder (Aliyan)
Last Updated: 2026-08-14
Decision State: Directional — inferred from existing patterns + this task's brief, not yet ratified by product owner

# UX Principles

These are inferred from patterns already present in the codebase, plus
the quality bar named in this task's brief ("Stripe/Linear/Vercel/Notion
quality level"). Treat as a working starting point, not settled
doctrine — [DECISION REQUIRED] on formal ratification.

## 1. Never blend what shouldn't be blended

The currency-aware Analytics dashboard deliberately shows revenue
per-store in its own currency, "never blended into one misleading
total" (root `CLAUDE.md`, confirmed as intentional design). This is a
principle worth generalizing: don't aggregate data across dimensions
where aggregation would misrepresent reality (currencies today;
plausibly marketplaces, or agency clients, tomorrow — a blended "total
sales across all your clients' shops" could be just as misleading if
currencies or business models differ).

## 2. Two-axis, not one-axis, scoring

`competition-scoring.ts`'s Difficulty vs. Demand split is deliberate and
non-obvious: two separate axes with **inverted** color semantics (green
= easy-to-compete on Difficulty, but green = high-demand on Demand — the
same "hard" bucket means opposite things depending on which axis it's
on). The code comment is explicit that collapsing these into one score
would lose information a seller actually needs (a shop can be
"easy to compete with" and "low demand" at the same time — not a good
opportunity despite the easy score). Any future scoring/recommendation
UI (SEO intelligence, product intelligence per the brief) should ask
"does this actually need to be two axes" before defaulting to a single
score.

## 3. Cold-start-capable features

"Spy on Competitor" works cold — a user can look up a shop by name
without having run a search first (`getShopByName`). This matters
because it means research features shouldn't assume a user has already
built up data through some other flow; where feasible, a feature should
answer a specific question a user showed up with directly.

## 4. Editorial judgment is labeled as such, not hidden as "the algorithm"

The competition-scoring thresholds are explicitly commented as "editorial
judgment calls," not an industry-standard benchmark or an Etsy metric.
This transparency should extend to any future AI-generated
recommendations or scores — a user comparing their shop to competitors
via the future AI assistant should be able to tell what's a hard fact
(real sales data) vs. a SellerSalt heuristic (a score, a recommendation).

## 5. Fallbacks over dead ends

The Billing page falls back to a `mailto:` link if no payment provider
is active for an org, rather than showing a broken or empty "Pay" button
(root `CLAUDE.md`). Same principle should extend to any new integration
surface: if a dependency isn't configured, degrade to a clear next step,
not silence or an error state with no path forward.

## 6. Dense app, generous marketing

Per the brief and consistent with what's implemented: the authenticated
app favors information density (a research tool used daily should
minimize clicks/scrolling per unit of information), while the marketing
site favors generous whitespace and a slower pace (a one-time
persuasion surface). These are different design modes on purpose, hence
the scoped `.sellersalt-marketing` CSS boundary — see
[design/design-system.md](design-system.md).

## Open question [DECISION REQUIRED]

Whether "accessible" (named in the brief) has a concrete bar (WCAG AA?)
that's being tracked anywhere today — not verified in this pass, no
accessibility-testing tooling found in `package.json`. Note: with the
target design direction now locked to a single light-only palette
(Decision 2, 2026-08-14 — see [design/design-system.md](design-system.md)),
contrast verification is a one-palette problem instead of a two-palette
(light+dark) one, which should make defining and hitting a concrete
accessibility bar meaningfully more tractable once that work starts.
