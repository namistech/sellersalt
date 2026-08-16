// Recharts needs real CSS color values (stroke/fill props), not
// Tailwind class names — these read the same CSS custom properties
// wired in globals.css (Task 1) via var(), so chart colors stay
// token-driven rather than hardcoded, and never drift from the
// palette used everywhere else. design-system-v1.md §3 "Data
// visualization" / §14.

export const SERIES_COLORS = [
  "rgb(var(--color-data-series-1))",
  "rgb(var(--color-data-series-2))",
  "rgb(var(--color-data-series-3))",
  "rgb(var(--color-data-series-4))",
  "rgb(var(--color-data-series-5))",
  "rgb(var(--color-data-series-6))",
  "rgb(var(--color-data-series-7))",
] as const;

export const POSITIVE_COLOR = "rgb(var(--color-data-positive))";
export const NEGATIVE_COLOR = "rgb(var(--color-data-negative))";
export const NEUTRAL_COLOR = "rgb(var(--color-data-neutral))";
export const BRAND_COLOR = "rgb(var(--color-brand-primary))";
export const COMPARISON_SECONDARY_COLOR = "rgb(var(--color-data-comparison-secondary))";
export const WARNING_COLOR = "rgb(var(--color-status-warning))";
export const FINANCIAL_COLOR = "rgb(var(--color-brand-primary))";
export const INFO_COLOR = "rgb(var(--color-status-info))";
export const GRID_COLOR = "rgb(var(--color-border-subtle))";
export const AXIS_TEXT_COLOR = "rgb(var(--color-text-tertiary))";

export function seriesColor(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length]!;
}
