"use client";

import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer, type ChartState } from "./ChartContainer";
import { ChartTooltip } from "./ChartTooltip";
import { ChartLegend } from "./ChartLegend";
import { seriesColor, GRID_COLOR, AXIS_TEXT_COLOR } from "./chart-colors";
import type { FreshnessProps } from "../Freshness";

// design-system-v1.md §14 — Line chart: "minimal horizontal-only
// gridlines... smooth-but-not-overcurved interpolation... no 3D."
// Recharts is the existing, kept dependency (Task 2 codebase-reuse
// audit) — no new charting library.

export interface ChartSeries {
  key: string;
  label: string;
  colorIndex?: number;
  strokeDasharray?: string;
}

export interface LineChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  series: ChartSeries[];
  height?: number;
  state?: ChartState;
  valueFormatter?: (value: number | string) => string;
  accessibleSummary?: string;
  staleFreshness?: FreshnessProps;
}

export function LineChart({ data, xKey, series, height = 240, state = "ready", valueFormatter, accessibleSummary, staleFreshness }: LineChartProps) {
  return (
    <div>
      <ChartContainer state={state} height={height} accessibleSummary={accessibleSummary} staleFreshness={staleFreshness}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID_COLOR} />
            <XAxis dataKey={xKey} tick={{ fill: AXIS_TEXT_COLOR, fontSize: 12 }} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
            <YAxis tick={{ fill: AXIS_TEXT_COLOR, fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
            <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} cursor={{ stroke: GRID_COLOR }} />
            {series.map((s, i) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={seriesColor(s.colorIndex ?? i)}
                strokeWidth={2}
                strokeDasharray={s.strokeDasharray}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </RechartsLineChart>
        </ResponsiveContainer>
      </ChartContainer>
      {/* Legend renders outside the fixed-height chart area, per
          design-system-v1.md §14 ("legend positioned below chart") —
          nesting it inside ChartContainer's height-constrained box
          would clip it. */}
      {(state === "ready" || state === "stale") && series.length >= 4 && (
        <ChartLegend items={series.map((s, i) => ({ label: s.label, color: seriesColor(s.colorIndex ?? i) }))} />
      )}
    </div>
  );
}
