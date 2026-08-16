import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn, DataText, Text, Eyebrow, Card } from "@/components/ui";
import { Freshness, type FreshnessProps } from "./Freshness";
import { Sparkline, type SparklineTone } from "./charts/Sparkline";
import { deltaTone, formatDelta } from "./format";

// design-system-v1.md §11 "Stat Blocks" — one consistent format reused
// everywhere a number is the point of a screen. Deliberately generic:
// no metric name is hardcoded here (per this task's brief) — a caller
// supplies label="Revenue" or label="Views" or label="Shop Health";
// the component has no idea which.

// ---------- MetricDelta — atomic, reused standalone (e.g. table cells) ----------

export interface MetricDeltaProps {
  value: number;
  type?: "percent" | "absolute";
  /** false when a lower number is the good outcome (e.g. bounce rate, rank). */
  higherIsBetter?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const TONE_TEXT_CLASS: Record<ReturnType<typeof deltaTone>, string> = {
  positive: "text-data-positive",
  negative: "text-data-negative",
  neutral: "text-data-neutral",
};

export function MetricDelta({ value, type = "percent", higherIsBetter = true, size = "sm", className }: MetricDeltaProps) {
  const tone = deltaTone(value, higherIsBetter);
  const Icon = tone === "positive" ? TrendingUp : tone === "negative" ? TrendingDown : Minus;
  return (
    <span className={cn("inline-flex items-center gap-0.5", TONE_TEXT_CLASS[tone], className)}>
      <Icon aria-hidden className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      <DataText size={size === "sm" ? "data-sm" : "data-md"} tone={tone}>
        {formatDelta(value, type)}
      </DataText>
    </span>
  );
}

// ---------- Metric — the core label+value(+delta+freshness) composite ----------

export interface MetricProps {
  label: string;
  /** Optional so `unavailable` can be passed without a placeholder value — the "—" fallback is rendered for you. */
  value?: string | number;
  unit?: string;
  unitPosition?: "prefix" | "suffix";
  delta?: number;
  deltaType?: "percent" | "absolute";
  higherIsBetter?: boolean;
  /** e.g. "vs last 30 days" — a delta without this is missing its comparison basis (design-system-v1.md §11). */
  comparisonLabel?: string;
  freshness?: FreshnessProps;
  unavailable?: boolean;
  estimated?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  /** "eyebrow" is for the one featured Metric per section — see
   * MetricCard's `featured` prop, which sets this automatically. */
  labelVariant?: "default" | "eyebrow";
  className?: string;
}

const VALUE_SIZE: Record<NonNullable<MetricProps["size"]>, "data-sm" | "data-md" | "data-lg" | "data-xl"> = {
  sm: "data-sm",
  md: "data-md",
  lg: "data-lg",
  xl: "data-xl",
};

export function Metric({
  label,
  value,
  unit,
  unitPosition = "suffix",
  delta,
  deltaType = "percent",
  higherIsBetter = true,
  comparisonLabel,
  freshness,
  unavailable,
  estimated,
  size = "md",
  labelVariant = "default",
  className,
}: MetricProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {labelVariant === "eyebrow" ? (
        <Eyebrow tone="accent">{label}</Eyebrow>
      ) : (
        <Text as="span" size="label-md" color="secondary">
          {label}
        </Text>
      )}
      <div className="flex items-baseline gap-1">
        {unavailable ? (
          <DataText size={VALUE_SIZE[size]} tone="disabled" aria-label="Unavailable">
            —
          </DataText>
        ) : (
          <>
            {unit && unitPosition === "prefix" && (
              <DataText size={VALUE_SIZE[size]} tone="secondary">
                {unit}
              </DataText>
            )}
            <DataText size={VALUE_SIZE[size]}>{value}</DataText>
            {unit && unitPosition === "suffix" && (
              <DataText size={VALUE_SIZE[size]} tone="secondary">
                {unit}
              </DataText>
            )}
            {estimated && (
              <Text as="span" size="body-sm" color="tertiary">
                (est.)
              </Text>
            )}
          </>
        )}
      </div>
      {(delta !== undefined || comparisonLabel) && !unavailable && (
        <div className="flex items-center gap-1.5">
          {delta !== undefined && <MetricDelta value={delta} type={deltaType} higherIsBetter={higherIsBetter} />}
          {comparisonLabel && (
            <Text as="span" size="body-sm" color="tertiary">
              {comparisonLabel}
            </Text>
          )}
        </div>
      )}
      {freshness && <Freshness {...freshness} />}
    </div>
  );
}

// ---------- MetricCard — Metric inside a Card ----------

export interface MetricCardProps extends MetricProps {
  cardClassName?: string;
  /** The one headline number in a row of MetricCards — Card's "feature"
   * variant, an eyebrow label, and a bigger value by default. Use on at
   * most one card per row/section; everything else stays plain so the
   * featured one actually reads as more important. */
  featured?: boolean;
}

export function MetricCard({ cardClassName, featured, size, labelVariant, ...metricProps }: MetricCardProps) {
  return (
    <Card padding={featured ? "lg" : "md"} variant={featured ? "feature" : "default"} className={cardClassName}>
      <Metric
        {...metricProps}
        size={size ?? (featured ? "xl" : "md")}
        labelVariant={labelVariant ?? (featured ? "eyebrow" : "default")}
      />
    </Card>
  );
}

// ---------- SparklineMetric — MetricCard + an inline trend chart ----------

export interface SparklineMetricProps extends MetricProps {
  data: number[];
  sparklineTone?: SparklineTone;
  cardClassName?: string;
}

export function SparklineMetric({ data, sparklineTone, delta, higherIsBetter = true, cardClassName, ...metricProps }: SparklineMetricProps) {
  const resolvedTone = sparklineTone ?? (delta !== undefined ? deltaTone(delta, higherIsBetter) : "brand");
  return (
    <Card padding="md" className={cn("flex items-end justify-between gap-4", cardClassName)}>
      <Metric delta={delta} higherIsBetter={higherIsBetter} {...metricProps} />
      <Sparkline data={data} tone={resolvedTone} />
    </Card>
  );
}

// ---------- MetricTrend — compact, no big value: for dense contexts (table cells, lists) ----------

export interface MetricTrendProps {
  label: string;
  delta: number;
  deltaType?: "percent" | "absolute";
  higherIsBetter?: boolean;
  comparisonLabel?: string;
  className?: string;
}

export function MetricTrend({ label, delta, deltaType = "percent", higherIsBetter = true, comparisonLabel, className }: MetricTrendProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Text as="span" size="body-sm" color="secondary">
        {label}
      </Text>
      <MetricDelta value={delta} type={deltaType} higherIsBetter={higherIsBetter} />
      {comparisonLabel && (
        <Text as="span" size="meta" color="tertiary">
          {comparisonLabel}
        </Text>
      )}
    </div>
  );
}

// ---------- MetricComparison — two metrics side-by-side (current vs previous/benchmark) ----------

export interface MetricComparisonProps {
  primary: MetricProps;
  secondary: MetricProps;
  className?: string;
}

export function MetricComparison({ primary, secondary, className }: MetricComparisonProps) {
  return (
    <div className={cn("flex items-start gap-6", className)}>
      <Metric {...primary} />
      <div className="mt-1 h-full w-px self-stretch bg-line-subtle" aria-hidden />
      <Metric {...secondary} size={secondary.size ?? "sm"} />
    </div>
  );
}
