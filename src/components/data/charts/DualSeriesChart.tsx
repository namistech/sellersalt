"use client";

import React from "react";
import {
  CartesianGrid,
  Line,
  Bar,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer, type ChartState } from "./ChartContainer";
import { ChartTooltip } from "./ChartTooltip";
import { ChartLegend } from "./ChartLegend";
import { GRID_COLOR, AXIS_TEXT_COLOR } from "./chart-colors";

export interface DualSeriesChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  barKey: string;
  barLabel: string;
  barColor?: string;
  lineKey: string;
  lineLabel: string;
  lineColor?: string;
  height?: number;
  state?: ChartState;
  barFormatter?: (val: number | string) => string;
  lineFormatter?: (val: number | string) => string;
  accessibleSummary?: string;
}

export function DualSeriesChart({
  data,
  xKey,
  barKey,
  barLabel,
  barColor = "#16C784",
  lineKey,
  lineLabel,
  lineColor = "#0E8F5D",
  height = 240,
  state = "ready",
  barFormatter = (v) => `${v} units`,
  lineFormatter = (v) => `$${v}`,
  accessibleSummary = "Dual-series chart showing volume and revenue concurrently.",
}: DualSeriesChartProps) {
  return (
    <div>
      <ChartContainer state={state} height={height} accessibleSummary={accessibleSummary}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeDasharray="3 3" />
            <XAxis
              dataKey={xKey}
              tick={{ fill: AXIS_TEXT_COLOR, fontSize: 11 }}
              axisLine={{ stroke: GRID_COLOR }}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: AXIS_TEXT_COLOR, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={42}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: AXIS_TEXT_COLOR, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={42}
            />
            <Tooltip
              content={
                <ChartTooltip
                  valueFormatter={(v) =>
                    typeof v === "number" ? v.toLocaleString() : String(v)
                  }
                />
              }
            />
            <Bar
              yAxisId="left"
              dataKey={barKey}
              name={barLabel}
              fill={barColor}
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey={lineKey}
              name={lineLabel}
              stroke={lineColor}
              strokeWidth={2.5}
              dot={{ r: 3, fill: lineColor }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartContainer>

      <div className="pt-2">
        <ChartLegend
          items={[
            { label: barLabel, color: barColor },
            { label: lineLabel, color: lineColor },
          ]}
        />
      </div>
    </div>
  );
}
