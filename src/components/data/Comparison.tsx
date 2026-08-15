import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn, Text } from "@/components/ui";
import { MetricDelta } from "./Metric";

// design-system-v1.md — one generic implementation underneath every
// "X vs Y" use case (you vs competitor, current vs previous, shop vs
// benchmark, before vs after) rather than separate unrelated
// components per pairing, per this task's explicit instruction.

export interface ComparisonProps {
  leftLabel: string;
  leftValue: ReactNode;
  rightLabel: string;
  rightValue: ReactNode;
  divider?: "vs" | "arrow";
  className?: string;
}

export function Comparison({ leftLabel, leftValue, rightLabel, rightValue, divider = "vs", className }: ComparisonProps) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="flex flex-col gap-0.5">
        <Text as="span" size="label-md" color="secondary">
          {leftLabel}
        </Text>
        <div>{leftValue}</div>
      </div>
      <span aria-hidden className="flex flex-col items-center text-ink-tertiary">
        {divider === "arrow" ? <ArrowRight className="h-4 w-4" /> : <Text size="meta">vs</Text>}
      </span>
      <div className="flex flex-col gap-0.5">
        <Text as="span" size="label-md" color="secondary">
          {rightLabel}
        </Text>
        <div>{rightValue}</div>
      </div>
    </div>
  );
}

/** Compact, table-row-friendly variant. */
export function ComparisonRow(props: ComparisonProps) {
  return <Comparison {...props} className={cn("gap-3", props.className)} />;
}

export interface ComparisonMetricProps {
  leftLabel: string;
  leftValue: number;
  rightLabel: string;
  rightValue: number;
  unit?: string;
  higherIsBetter?: boolean;
  divider?: "vs" | "arrow";
  className?: string;
}

/** Comparison specialized for two numeric values — computes and shows the delta between them automatically. */
export function ComparisonMetric({ leftLabel, leftValue, rightLabel, rightValue, unit, higherIsBetter = true, divider = "vs", className }: ComparisonMetricProps) {
  const percentDelta = rightValue === 0 ? 0 : ((leftValue - rightValue) / Math.abs(rightValue)) * 100;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Comparison
        leftLabel={leftLabel}
        leftValue={
          <Text as="span" size="body-md" weight="semibold">
            {leftValue}
            {unit}
          </Text>
        }
        rightLabel={rightLabel}
        rightValue={
          <Text as="span" size="body-md" color="secondary">
            {rightValue}
            {unit}
          </Text>
        }
        divider={divider}
      />
      <MetricDelta value={percentDelta} type="percent" higherIsBetter={higherIsBetter} />
    </div>
  );
}

export interface BeforeAfterProps {
  beforeValue: ReactNode;
  afterValue: ReactNode;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

/** Comparison preset for optimization proof — "Before" → "After". */
export function BeforeAfter({ beforeValue, afterValue, beforeLabel = "Before", afterLabel = "After", className }: BeforeAfterProps) {
  return <Comparison leftLabel={beforeLabel} leftValue={beforeValue} rightLabel={afterLabel} rightValue={afterValue} divider="arrow" className={className} />;
}
