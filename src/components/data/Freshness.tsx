import { Clock, RefreshCw } from "lucide-react";
import { cn, Caption } from "@/components/ui";
import { formatRelativeTime, formatShortDate } from "./format";

// Freshness is deliberately its own component, not decorative metadata
// — per this task's brief, "freshness affects trust in intelligence."
// Reused by Metric, Score, Chart, and every intelligence card so
// "how current is this data" is communicated identically everywhere.

export type FreshnessState = "live" | "recent" | "syncing" | "stale" | "unavailable";

export interface FreshnessProps {
  state: FreshnessState;
  /** Required for "recent"/"stale" — renders relative time; falls back to an absolute short date past ~7 days. */
  timestamp?: Date | string;
  /** Overrides the computed label entirely, e.g. "Data from Aug 12". */
  label?: string;
  className?: string;
}

function defaultLabel(state: FreshnessState, timestamp?: Date | string): string {
  switch (state) {
    case "live":
      return "Live";
    case "syncing":
      return "Syncing…";
    case "unavailable":
      return "No data";
    case "recent":
    case "stale": {
      if (!timestamp) return state === "stale" ? "Data may be outdated" : "Recently updated";
      const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
      const ageDays = (Date.now() - date.getTime()) / 86_400_000;
      const rel = ageDays > 7 ? `Data from ${formatShortDate(date)}` : `Updated ${formatRelativeTime(date)}`;
      return rel;
    }
  }
}

const STATE_CLASS: Record<FreshnessState, string> = {
  live: "text-success",
  recent: "text-ink-tertiary",
  syncing: "text-info",
  stale: "text-warn",
  unavailable: "text-ink-disabled",
};

export function Freshness({ state, timestamp, label, className }: FreshnessProps) {
  const text = label ?? defaultLabel(state, timestamp);
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {state === "syncing" ? (
        <RefreshCw aria-hidden className="h-3 w-3 motion-safe:animate-spin text-info" />
      ) : (
        state !== "live" && <Clock aria-hidden className={cn("h-3 w-3", STATE_CLASS[state])} />
      )}
      <Caption className={STATE_CLASS[state]}>{text}</Caption>
    </span>
  );
}
