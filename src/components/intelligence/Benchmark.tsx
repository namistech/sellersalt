import { cn, DataText, Text } from "@/components/ui";
import { deltaTone } from "@/components/data";

// design-system-v1.md §3 — Benchmark comparisons deliberately never
// use red/green for the "you" vs "benchmark" pairing itself (that's
// reserved for positive/negative meaning) — direction/gap communicate
// the comparison instead of a possibly-misleading color choice.

type UnitPosition = "prefix" | "suffix";

/** Same prefix/suffix convention as data/Metric.tsx — "$45" vs "45%". */
function formatUnit(value: number, unit: string, position: UnitPosition): string {
  if (!unit) return String(value);
  return position === "prefix" ? `${unit}${value}` : `${value}${unit}`;
}

export interface BenchmarkProps {
  label: string;
  value: number;
  benchmarkLabel: string;
  benchmarkValue: number;
  unit?: string;
  unitPosition?: UnitPosition;
  higherIsBetter?: boolean;
  className?: string;
}

/** "Your shop" vs "top performers" — current value, benchmark, direction, and gap, all visible at once. */
export function Benchmark({ label, value, benchmarkLabel, benchmarkValue, unit = "", unitPosition = "suffix", higherIsBetter = true, className }: BenchmarkProps) {
  const gap = value - benchmarkValue;
  const tone = deltaTone(gap, higherIsBetter);
  const gapWord = gap === 0 ? "matches" : (tone === "positive") === higherIsBetter ? "ahead of" : "behind";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline gap-4">
        <div className="flex flex-col gap-0.5">
          <Text as="span" size="label-md" color="secondary">
            {label}
          </Text>
          <DataText size="data-lg">{formatUnit(value, unit, unitPosition)}</DataText>
        </div>
        <div className="flex flex-col gap-0.5">
          <Text as="span" size="label-md" color="secondary">
            {benchmarkLabel}
          </Text>
          <DataText size="data-md" tone="secondary">
            {formatUnit(benchmarkValue, unit, unitPosition)}
          </DataText>
        </div>
      </div>
      <Text as="span" size="body-sm" className={tone === "positive" ? "text-data-positive" : tone === "negative" ? "text-data-negative" : "text-data-neutral"}>
        {formatUnit(Math.abs(gap), unit, unitPosition)} {gapWord} {benchmarkLabel.toLowerCase()}
      </Text>
    </div>
  );
}

export interface BenchmarkComparisonProps extends BenchmarkProps {
  /** Optional min/max for a positioned-range view instead of the plain two-value layout. */
  min?: number;
  max?: number;
}

/** Same data as Benchmark, laid out for side-by-side card contexts (e.g. inside ScoreBreakdown). */
export function BenchmarkComparison(props: BenchmarkComparisonProps) {
  return <Benchmark {...props} />;
}

export interface BenchmarkRangeProps {
  label: string;
  value: number;
  min: number;
  max: number;
  benchmarkValue?: number;
  benchmarkLabel?: string;
  unit?: string;
  unitPosition?: UnitPosition;
  className?: string;
}

/** A distribution/percentile-style range bar with a "you are here" marker. */
export function BenchmarkRange({ label, value, min, max, benchmarkValue, benchmarkLabel, unit = "", unitPosition = "suffix", className }: BenchmarkRangeProps) {
  const clamp = (n: number) => Math.max(0, Math.min(100, ((n - min) / (max - min)) * 100));
  const valuePct = clamp(value);
  const benchmarkPct = benchmarkValue !== undefined ? clamp(benchmarkValue) : undefined;

  return (
    // min-w: without an explicit floor, this collapses to its content
    // width inside a flex-wrap row (e.g. next to a plain Benchmark),
    // which crushes the 3-way min/benchmark/max label row together —
    // found during this task's browser verification pass.
    <div className={cn("flex min-w-[260px] flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between">
        <Text as="span" size="label-md" color="secondary">
          {label}
        </Text>
        <DataText size="data-sm">{formatUnit(value, unit, unitPosition)}</DataText>
      </div>
      <div className="relative h-2 rounded-full bg-line-subtle">
        <div className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${valuePct}%` }} />
        {benchmarkPct !== undefined && (
          <span
            aria-hidden
            className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-ink"
            style={{ left: `${benchmarkPct}%` }}
            title={benchmarkLabel}
          />
        )}
      </div>
      <div className="flex items-center justify-between">
        <Text as="span" size="meta" color="tertiary">
          {formatUnit(min, unit, unitPosition)}
        </Text>
        {benchmarkLabel && (
          <Text as="span" size="meta" color="tertiary">
            {benchmarkLabel}: {benchmarkValue !== undefined ? formatUnit(benchmarkValue, unit, unitPosition) : "—"}
          </Text>
        )}
        <Text as="span" size="meta" color="tertiary">
          {formatUnit(max, unit, unitPosition)}
        </Text>
      </div>
    </div>
  );
}

export interface BenchmarkPositionProps {
  value: number;
  min: number;
  max: number;
  className?: string;
}

/** Compact, label-free "you are here" marker for dense contexts (table cells). */
export function BenchmarkPosition({ value, min, max, className }: BenchmarkPositionProps) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return (
    <div className={cn("relative h-1.5 w-16 rounded-full bg-line-subtle", className)} role="img" aria-label={`Positioned at ${value} on a scale from ${min} to ${max}`}>
      <span aria-hidden className="absolute top-1/2 h-2.5 w-1 -translate-y-1/2 rounded-full bg-accent" style={{ left: `${pct}%` }} />
    </div>
  );
}
