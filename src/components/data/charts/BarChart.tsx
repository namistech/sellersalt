"use client";

import { Bar, BarChart as RechartsBarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer, type ChartState } from "./ChartContainer";
import { ChartTooltip } from "./ChartTooltip";
import { ChartLegend } from "./ChartLegend";
import { seriesColor, GRID_COLOR, AXIS_TEXT_COLOR } from "./chart-colors";
import type { FreshnessProps } from "../Freshness";
import type { ChartSeries } from "./LineChart";

// design-system-v1.md §14 — Bar chart: consistent width/gap ratio,
// rounded top corners matching radius-xs only.

export interface BarChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  series: ChartSeries[];
  height?: number;
  state?: ChartState;
  stacked?: boolean;
  layout?: "vertical" | "horizontal"; // "vertical" here follows Recharts' convention: bars run horizontally (used for Ranking-style charts)
  valueFormatter?: (value: number | string) => string;
  accessibleSummary?: string;
  staleFreshness?: FreshnessProps;
  emptyMessage?: string;
  errorMessage?: string;
  onRetry?: () => void;
}

export function BarChart({
  data,
  xKey,
  series,
  height = 240,
  state = "ready",
  stacked = false,
  layout = "horizontal",
  valueFormatter,
  accessibleSummary,
  staleFreshness,
  emptyMessage,
  errorMessage,
  onRetry,
}: BarChartProps) {
  return (
    <div>
      <ChartContainer state={state} height={height} accessibleSummary={accessibleSummary} staleFreshness={staleFreshness} emptyMessage={emptyMessage} errorMessage={errorMessage} onRetry={onRetry}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart data={data} layout={layout} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={layout === "vertical"} horizontal={layout === "horizontal"} stroke={GRID_COLOR} />
            {layout === "horizontal" ? (
              <>
                <XAxis dataKey={xKey} tick={{ fill: AXIS_TEXT_COLOR, fontSize: 12 }} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
                <YAxis tick={{ fill: AXIS_TEXT_COLOR, fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
              </>
            ) : (
              <>
                <XAxis type="number" tick={{ fill: AXIS_TEXT_COLOR, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey={xKey} tick={{ fill: AXIS_TEXT_COLOR, fontSize: 12 }} axisLine={false} tickLine={false} width={100} />
              </>
            )}
            <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} cursor={{ fill: GRID_COLOR }} />
            {series.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={seriesColor(s.colorIndex ?? i)} radius={[4, 4, 0, 0]} stackId={stacked ? "stack" : undefined} />
            ))}
          </RechartsBarChart>
        </ResponsiveContainer>
      </ChartContainer>
      {(state === "ready" || state === "stale") && series.length >= 4 && (
        <ChartLegend items={series.map((s, i) => ({ label: s.label, color: seriesColor(s.colorIndex ?? i) }))} />
      )}
    </div>
  );
}
