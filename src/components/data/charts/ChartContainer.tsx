import type { ReactNode } from "react";
import { AlertCircle, BarChart3 } from "lucide-react";
import { cn, Skeleton, Text, Button } from "@/components/ui";
import { Freshness, type FreshnessProps } from "../Freshness";

// design-system-v1.md §14 — charts must handle six states, not just
// the happy path. This wraps any chart (LineChart/BarChart/AreaChart)
// and renders the correct state instead of a broken/misleading chart.

export type ChartState = "loading" | "empty" | "no-data" | "insufficient-data" | "stale" | "error" | "ready";

export interface ChartContainerProps {
  state?: ChartState;
  height?: number;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  noDataMessage?: string;
  onClearFilters?: () => void;
  insufficientDataMessage?: string;
  errorMessage?: string;
  onRetry?: () => void;
  staleFreshness?: FreshnessProps;
  /** Visually-hidden textual summary for screen readers (design-system-v1.md §19 "Charts must provide a meaningful textual fallback"). */
  accessibleSummary?: string;
  children: ReactNode;
}

function CenteredMessage({ icon, message, action }: { icon: ReactNode; message: string; action?: ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
      <span aria-hidden className="text-ink-tertiary [&_svg]:h-6 [&_svg]:w-6">
        {icon}
      </span>
      <Text size="body-sm" color="secondary">
        {message}
      </Text>
      {action}
    </div>
  );
}

export function ChartContainer({
  state = "ready",
  height = 240,
  emptyMessage = "No data yet.",
  emptyAction,
  noDataMessage = "No results for this filter.",
  onClearFilters,
  insufficientDataMessage = "Not enough data points to show a trend yet.",
  errorMessage = "Couldn't load this chart.",
  onRetry,
  staleFreshness,
  accessibleSummary,
  children,
}: ChartContainerProps) {
  return (
    <div className="flex flex-col gap-2">
      {state === "stale" && staleFreshness && (
        <Freshness state="stale" timestamp={staleFreshness.timestamp} label={staleFreshness.label} className="self-end" />
      )}
      <div style={{ height }} className="relative w-full">
        {accessibleSummary && <p className="sr-only">{accessibleSummary}</p>}
        {state === "loading" && <Skeleton variant="block" className="h-full w-full" />}
        {state === "empty" && <CenteredMessage icon={<BarChart3 />} message={emptyMessage} action={emptyAction} />}
        {state === "no-data" && (
          <CenteredMessage
            icon={<BarChart3 />}
            message={noDataMessage}
            action={
              onClearFilters && (
                <Button variant="secondary" size="compact" onClick={onClearFilters}>
                  Clear filters
                </Button>
              )
            }
          />
        )}
        {state === "insufficient-data" && <CenteredMessage icon={<BarChart3 />} message={insufficientDataMessage} />}
        {state === "error" && (
          <CenteredMessage
            icon={<AlertCircle />}
            message={errorMessage}
            action={
              onRetry && (
                <Button variant="secondary" size="compact" onClick={onRetry}>
                  Retry
                </Button>
              )
            }
          />
        )}
        {(state === "ready" || state === "stale") && <div className={cn("h-full w-full")}>{children}</div>}
      </div>
    </div>
  );
}
