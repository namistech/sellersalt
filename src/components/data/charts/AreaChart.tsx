"use client";

import { Area, AreaChart as RechartsAreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer, type ChartState } from "./ChartContainer";
import { ChartTooltip } from "./ChartTooltip";
import { ChartLegend } from "./ChartLegend";
import { seriesColor, GRID_COLOR, AXIS_TEXT_COLOR } from "./chart-colors";
import type { FreshnessProps } from "../Freshness";
import type { ChartSeries } from "./LineChart";

// design-system-v1.md §14 — Area chart: filled variant, low fill
// opacity (~10-15%) "to keep it calm, not garish."

export interface AreaChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  series: ChartSeries[];
  height?: number;
  state?: ChartState;
  valueFormatter?: (value: number | string) => string;
  accessibleSummary?: string;
  staleFreshness?: FreshnessProps;
  emptyMessage?: string;
  errorMessage?: string;
  onRetry?: () => void;
}

export function AreaChart({ data, xKey, series, height = 240, state = "ready", valueFormatter, accessibleSummary, staleFreshness, emptyMessage, errorMessage, onRetry }: AreaChartProps) {
  return (
    <div>
      <ChartContainer state={state} height={height} accessibleSummary={accessibleSummary} staleFreshness={staleFreshness} emptyMessage={emptyMessage} errorMessage={errorMessage} onRetry={onRetry}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsAreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID_COLOR} />
            <XAxis dataKey={xKey} tick={{ fill: AXIS_TEXT_COLOR, fontSize: 12 }} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
            <YAxis tick={{ fill: AXIS_TEXT_COLOR, fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
            <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} cursor={{ stroke: GRID_COLOR }} />
            {series.map((s, i) => {
              const color = seriesColor(s.colorIndex ?? i);
              return <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={color} fill={color} fillOpacity={0.12} strokeWidth={2} />;
            })}
          </RechartsAreaChart>
        </ResponsiveContainer>
      </ChartContainer>
      {(state === "ready" || state === "stale") && series.length >= 4 && (
        <ChartLegend items={series.map((s, i) => ({ label: s.label, color: seriesColor(s.colorIndex ?? i) }))} />
      )}
    </div>
  );
}
