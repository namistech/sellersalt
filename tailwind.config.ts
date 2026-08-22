import type { Config } from "tailwindcss";

// Color/typography/spacing/radius/shadow values below implement the
// semantic design-token system specified in docs/design/design-system-v1.md
// (SellerSalt locked palette — docs/MASTER_BLUEPRINT.md, Decision 2).
// Legacy Tailwind color keys (ink/paper/surface/line/muted/accent/
// success/warn/danger) are kept as top-level names so every existing
// class in the app keeps working unmodified; each now also exposes the
// new semantic variants as nested keys (e.g. text-ink-secondary,
// bg-surface-muted, border-line-subtle) rather than introducing
// separately-named token groups that would collide or double up with
// Tailwind's bg-/text-/border- utility prefixes.
const config: Config = {
  // Kept as "class" (not removed) so the ~28 existing `dark:` utility
  // usages across the app still compile. No code path ever applies the
  // .dark class anymore (see src/app/layout.tsx and
  // src/app/(dashboard)/theme-toggle.tsx), so dark mode is fully inert
  // rather than a lingering system-preference ('media') fallback, which
  // removing this line would have silently reintroduced.
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "rgb(var(--color-ink) / <alpha-value>)",
          secondary: "rgb(var(--color-text-secondary) / <alpha-value>)",
          tertiary: "rgb(var(--color-text-tertiary) / <alpha-value>)",
          disabled: "rgb(var(--color-text-disabled) / <alpha-value>)",
          inverse: "rgb(var(--color-text-inverse) / <alpha-value>)",
        },
        paper: {
          DEFAULT: "rgb(var(--color-paper) / <alpha-value>)",
          elevated: "rgb(var(--color-bg-elevated) / <alpha-value>)",
          inverse: "rgb(var(--color-bg-inverse) / <alpha-value>)",
        },
        surface: {
          DEFAULT: "rgb(var(--color-surface) / <alpha-value>)",
          muted: "rgb(var(--color-bg-muted) / <alpha-value>)",
        },
        line: {
          DEFAULT: "rgb(var(--color-line) / <alpha-value>)",
          subtle: "rgb(var(--color-border-subtle) / <alpha-value>)",
          strong: "rgb(var(--color-border-strong) / <alpha-value>)",
          focus: "rgb(var(--color-border-focus) / <alpha-value>)",
        },
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        accent: {
          DEFAULT: "rgb(var(--color-brand-primary) / <alpha-value>)",
          soft: "rgb(var(--color-accent-soft) / <alpha-value>)",
          dark: "rgb(var(--color-brand-primary-hover) / <alpha-value>)",
          active: "rgb(var(--color-brand-primary-active) / <alpha-value>)",
        },
        gold: {
          DEFAULT: "rgb(var(--color-gold) / <alpha-value>)",
          // Use as text color instead of the bare gold token — see
          // globals.css's --color-gold-strong comment for the contrast math.
          strong: "rgb(var(--color-gold-strong) / <alpha-value>)",
        },
        success: {
          DEFAULT: "rgb(var(--color-status-positive) / <alpha-value>)",
          subtle: "rgb(var(--color-status-positive-subtle) / <alpha-value>)",
          strong: "rgb(var(--color-status-positive-strong) / <alpha-value>)",
        },
        warn: {
          DEFAULT: "rgb(var(--color-status-warning) / <alpha-value>)",
          subtle: "rgb(var(--color-status-warning-subtle) / <alpha-value>)",
          // Use as text color instead of the bare warn token on warn-subtle
          // backgrounds — see globals.css's --color-status-warning-strong.
          strong: "rgb(var(--color-status-warning-strong) / <alpha-value>)",
        },
        danger: {
          DEFAULT: "rgb(var(--color-status-danger) / <alpha-value>)",
          subtle: "rgb(var(--color-status-danger-subtle) / <alpha-value>)",
        },
        info: {
          DEFAULT: "rgb(var(--color-status-info) / <alpha-value>)",
          subtle: "rgb(var(--color-status-info-subtle) / <alpha-value>)",
        },
        // Score system only (design-system-v1.md §13) — the "Poor"
        // health tier. Not a general-purpose status color; kept out of
        // the warn/danger groups above deliberately.
        score: {
          poor: "rgb(var(--color-score-poor) / <alpha-value>)",
        },
        data: {
          "1": "rgb(var(--color-data-series-1) / <alpha-value>)",
          "2": "rgb(var(--color-data-series-2) / <alpha-value>)",
          "3": "rgb(var(--color-data-series-3) / <alpha-value>)",
          "4": "rgb(var(--color-data-series-4) / <alpha-value>)",
          "5": "rgb(var(--color-data-series-5) / <alpha-value>)",
          "6": "rgb(var(--color-data-series-6) / <alpha-value>)",
          "7": "rgb(var(--color-data-series-7) / <alpha-value>)",
          positive: "rgb(var(--color-data-positive) / <alpha-value>)",
          negative: "rgb(var(--color-data-negative) / <alpha-value>)",
          neutral: "rgb(var(--color-data-neutral) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        // "General Sans" is design-system-v1.md's recommended display
        // typeface (§4) but is [OPEN] / not yet ratified, and no font
        // file is loaded anywhere in the app (no next/font usage found)
        // — no new dependency is introduced here. This falls back to
        // Inter until that font is actually installed in a later task.
        display: ["General Sans", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        // Display scale (Marketing & Hero moments)
        "display-2xl": ["44px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-xl": ["36px", { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-lg": ["30px", { lineHeight: "1.2", letterSpacing: "-0.015em", fontWeight: "600" }],
        "display-md": ["26px", { lineHeight: "1.25", letterSpacing: "-0.015em", fontWeight: "600" }],
        "display-sm": ["22px", { lineHeight: "1.25", letterSpacing: "-0.01em", fontWeight: "600" }],
        
        // Headings (Application hierarchy)
        h1: ["24px", { lineHeight: "1.25", letterSpacing: "-0.01em", fontWeight: "700" }],
        h2: ["20px", { lineHeight: "1.3", letterSpacing: "-0.005em", fontWeight: "600" }],
        h3: ["17px", { lineHeight: "1.35", fontWeight: "600" }],
        h4: ["15px", { lineHeight: "1.4", fontWeight: "600" }],
        
        // Body / UI Text (Human-readable copy floor >= 14px for primary UI, 13px for dense tables)
        "body-lg": ["16px", { lineHeight: "1.5" }],
        "body-md": ["14px", { lineHeight: "1.5" }],
        "body-sm": ["13px", { lineHeight: "1.45" }],
        
        // Form & Micro Labels
        "label-md": ["13px", { lineHeight: "1.3", letterSpacing: "0.01em", fontWeight: "500" }],
        "label-sm": ["11.5px", { lineHeight: "1.3", letterSpacing: "0.04em", fontWeight: "600" }],
        
        // Metadata / Captions / Timestamps (12px minimum for readability)
        meta: ["12px", { lineHeight: "1.4" }],
        
        // Tabular Data Figures
        "data-xl": ["28px", { lineHeight: "1.15", letterSpacing: "-0.01em", fontWeight: "700" }],
        "data-lg": ["21px", { lineHeight: "1.2", fontWeight: "600" }],
        "data-md": ["15px", { lineHeight: "1.3", fontWeight: "500" }],
        "data-sm": ["13px", { lineHeight: "1.3", fontWeight: "500" }],
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "10px",
        lg: "14px",
      },
      boxShadow: {
        // Restrained scale replacing Tailwind's default (more dramatic)
        // shadow-sm/md/lg — design-system-v1.md §7 "Radii / Borders /
        // Shadows": most cards use a border, not a shadow; shadow is
        // reserved for genuinely floating elements (dropdowns, modals,
        // toasts).
        xs: "0 1px 2px 0 rgb(20 27 22 / 0.04)",
        sm: "0 2px 6px -1px rgb(20 27 22 / 0.08), 0 1px 3px -1px rgb(20 27 22 / 0.06)",
        md: "0 8px 20px -4px rgb(20 27 22 / 0.12), 0 2px 6px -2px rgb(20 27 22 / 0.08)",
        lg: "0 16px 36px -8px rgb(20 27 22 / 0.16), 0 4px 12px -4px rgb(20 27 22 / 0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
