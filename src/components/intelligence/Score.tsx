import { cn, DataText, Text, Card } from "@/components/ui";
import { Benchmark } from "./Benchmark";
import { IssueCard, type IssueCardProps } from "./IssueCard";

// design-system-v1.md §13 — the unified SellerSalt scoring language.
//
// IMPORTANT — explicitly NOT the existing competition Difficulty/Demand
// scoring (src/lib/competition-scoring.ts). That system stays untouched
// and unmerged: it's a specialized, already-shipped 3-tier scale
// (easy/moderate/hard) with a deliberately *inverted* Demand-axis color
// meaning, answering "should I compete with this shop." This 5-tier
// Score system answers a different question — "how good is *my* shop/
// listing/product" — for new intelligence surfaces only. These
// components render neither existing Difficulty/Demand badge; they are
// a visual layer only and carry no scoring logic of their own (the
// caller supplies the number).

export type HealthTier = "excellent" | "good" | "needs-attention" | "poor" | "critical" | "unavailable";

// v1 default banding — same spirit as competition-scoring.ts's own
// thresholds: "editorial judgment calls, easy to retune." Expect
// recalibration once real Shop Health data exists.
export function tierFromValue(value: number): HealthTier {
  if (value >= 90) return "excellent";
  if (value >= 70) return "good";
  if (value >= 50) return "needs-attention";
  if (value >= 30) return "poor";
  return "critical";
}

const TIER_LABEL: Record<HealthTier, string> = {
  excellent: "Excellent",
  good: "Good",
  "needs-attention": "Needs attention",
  poor: "Poor",
  critical: "Critical",
  unavailable: "Unavailable",
};

// "unavailable" is deliberately NOT on the color gradient — a data
// state, not a score state (design-system-v1.md §13).
const TIER_TEXT_CLASS: Record<HealthTier, string> = {
  excellent: "text-success-strong",
  good: "text-success",
  "needs-attention": "text-warn",
  poor: "text-score-poor",
  critical: "text-danger",
  unavailable: "text-ink-tertiary",
};

const TIER_RING_CLASS: Record<HealthTier, string> = {
  excellent: "stroke-success-strong",
  good: "stroke-success",
  "needs-attention": "stroke-warn",
  poor: "stroke-score-poor",
  critical: "stroke-danger",
  unavailable: "stroke-line-strong",
};

const TIER_BAR_CLASS: Record<HealthTier, string> = {
  excellent: "bg-success-strong",
  good: "bg-success",
  "needs-attention": "bg-warn",
  poor: "bg-score-poor",
  critical: "bg-danger",
  unavailable: "bg-line-strong",
};

export interface ScoreProps {
  /** 0–100. Omit (or pass `tier="unavailable"`) when there's no data yet. */
  value?: number;
  tier?: HealthTier;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function resolveTier(value?: number, tier?: HealthTier): HealthTier {
  if (tier) return tier;
  if (value === undefined) return "unavailable";
  return tierFromValue(value);
}

/** The label rule, applied everywhere: numeric score + tier color + tier text, never color alone. */
export function Score({ value, tier, label, size = "md", className }: ScoreProps) {
  const resolvedTier = resolveTier(value, tier);
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <DataText size={size === "sm" ? "data-sm" : size === "lg" ? "data-lg" : "data-md"} className={TIER_TEXT_CLASS[resolvedTier]}>
        {value ?? "—"}
      </DataText>
      <Text as="span" size="body-sm" color="secondary">
        · {label ?? TIER_LABEL[resolvedTier]}
      </Text>
    </span>
  );
}

// ---------- ScoreRing — circular indicator, for Overview/detail pages ----------

export interface ScoreRingProps extends ScoreProps {
  diameter?: number;
}

export function ScoreRing({ value, tier, label, diameter = 88, className }: ScoreRingProps) {
  const resolvedTier = resolveTier(value, tier);
  const radius = diameter / 2 - 6;
  const circumference = 2 * Math.PI * radius;
  const progress = value === undefined ? 0 : Math.max(0, Math.min(100, value)) / 100;
  const offset = circumference * (1 - progress);

  return (
    <div className={cn("inline-flex flex-col items-center gap-1", className)}>
      <div className="relative" style={{ width: diameter, height: diameter }}>
        <svg width={diameter} height={diameter} className="-rotate-90">
          <circle cx={diameter / 2} cy={diameter / 2} r={radius} fill="none" strokeWidth={6} className="stroke-line-subtle" />
          <circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={radius}
            fill="none"
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn("transition-all", TIER_RING_CLASS[resolvedTier])}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <DataText size="data-lg" className={TIER_TEXT_CLASS[resolvedTier]}>
            {value ?? "—"}
          </DataText>
        </div>
      </div>
      <Text as="span" size="body-sm" color="secondary">
        {label ?? TIER_LABEL[resolvedTier]}
      </Text>
    </div>
  );
}

// ---------- ScoreBar — horizontal/linear, compact contexts ----------

export function ScoreBar({ value, tier, label, className }: ScoreProps) {
  const resolvedTier = resolveTier(value, tier);
  const width = value === undefined ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-line-subtle" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? "Score"}>
        <div className={cn("h-full rounded-full transition-all", TIER_BAR_CLASS[resolvedTier])} style={{ width: `${width}%` }} />
      </div>
      <Score value={value} tier={tier} label={label} size="sm" />
    </div>
  );
}

// ---------- ScoreChange — before/after delta callout ----------

export interface ScoreChangeProps {
  before: number;
  after: number;
  className?: string;
}

export function ScoreChange({ before, after, className }: ScoreChangeProps) {
  const delta = after - before;
  const improved = delta > 0;
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <ScoreRing value={before} diameter={56} label="Before" />
      <span aria-hidden className="text-ink-tertiary">
        →
      </span>
      <ScoreRing value={after} diameter={56} label="After" />
      <Text as="span" size="body-sm" weight="medium" className={improved ? "text-data-positive" : delta < 0 ? "text-data-negative" : "text-data-neutral"}>
        {improved ? "+" : ""}
        {delta} pts
      </Text>
    </div>
  );
}

// ---------- ScoreBreakdown — score + contributing IssueCards ----------

export interface ScoreBreakdownProps extends ScoreProps {
  benchmarkValue?: number;
  benchmarkLabel?: string;
  issues?: IssueCardProps[];
}

export function ScoreBreakdown({ value, tier, label, benchmarkValue, benchmarkLabel, issues, className }: ScoreBreakdownProps) {
  return (
    <Card padding="lg" className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center gap-6">
        <ScoreRing value={value} tier={tier} label={label} />
        {benchmarkValue !== undefined && (
          <Benchmark label={label ?? "This score"} value={value ?? 0} benchmarkLabel={benchmarkLabel ?? "Benchmark"} benchmarkValue={benchmarkValue} />
        )}
      </div>
      {issues && issues.length > 0 && (
        <div className="flex flex-col gap-2">
          <Text as="span" size="label-md" color="secondary">
            Contributing factors
          </Text>
          {issues.map((issue, i) => (
            <IssueCard key={i} {...issue} />
          ))}
        </div>
      )}
    </Card>
  );
}
