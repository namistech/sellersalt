// Shared, dependency-free formatting helpers for the data/intelligence
// layer — extracted here once so Metric/Score/Benchmark/Ranking/Table
// don't each reimplement relative-time or delta-tone logic
// (docs/design/frontend-execution-plan-v1.md §28, "no duplicated
// component logic"). No ecommerce-specific formatting lives here —
// these are generic number/date utilities only.

/** "4 min ago", "3 days ago", "just now" — no date-fns/dayjs installed. */
export function formatRelativeTime(input: Date | string): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);

  if (diffSec < 45) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  const diffMonth = Math.round(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth} month${diffMonth === 1 ? "" : "s"} ago`;
  const diffYear = Math.round(diffMonth / 12);
  return `${diffYear} year${diffYear === 1 ? "" : "s"} ago`;
}

/** "Aug 12" style absolute date, for older/stale timestamps where relative time is less useful. */
export function formatShortDate(input: Date | string): string {
  const date = typeof input === "string" ? new Date(input) : input;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export type DeltaTone = "positive" | "negative" | "neutral";

/**
 * Resolves a numeric delta to a semantic tone, respecting whether a
 * higher value is good news (revenue) or bad news (e.g. a rank number,
 * where lower is better) — design-system-v1.md §11's percentage rule:
 * "colored per meaning, not by convention."
 */
export function deltaTone(delta: number, higherIsBetter: boolean = true): DeltaTone {
  if (delta === 0) return "neutral";
  const isIncrease = delta > 0;
  const isGoodNews = higherIsBetter ? isIncrease : !isIncrease;
  return isGoodNews ? "positive" : "negative";
}

/** Formats a numeric delta with an explicit sign, e.g. "+12.4%" / "-3". */
export function formatDelta(value: number, type: "percent" | "absolute" = "percent", decimals = 1): string {
  // Negative numbers already render their own "-" — only positive
  // values need an explicit "+" prepended; zero gets "±" so a flat
  // delta never reads as ambiguously "missing."
  const sign = value > 0 ? "+" : value === 0 ? "±" : "";
  const rounded = type === "percent" ? Math.abs(value).toFixed(decimals) : String(Math.abs(value));
  const signedRounded = value < 0 ? `-${rounded}` : rounded;
  return type === "percent" ? `${sign}${signedRounded}%` : `${sign}${signedRounded}`;
}
