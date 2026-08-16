"use client";

import React from "react";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartContainer, type ChartState } from "./ChartContainer";
import { ChartTooltip } from "./ChartTooltip";
import { ChartLegend } from "./ChartLegend";
import { seriesColor, GRID_COLOR, AXIS_TEXT_COLOR } from "./chart-colors";
import type { FreshnessProps } from "../Freshness";

export interface ComparisonSeries {
  key: string;
  label: string;
  color?: string;
  strokeDasharray?: string;
}

export interface ComparisonChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  series: ComparisonSeries[];
  height?: number;
  state?: ChartState;
  valueFormatter?: (value: number | string) => string;
  accessibleSummary?: string;
  staleFreshness?: FreshnessProps;
  emptyMessage?: string;
  errorMessage?: string;
  onRetry?: () => void;
}

export function ComparisonChart({
  data,
  xKey,
  series,
  height = 240,
  state = "ready",
  valueFormatter,
  accessibleSummary,
  staleFreshness,
  emptyMessage,
  errorMessage,
  onRetry,
}: ComparisonChartProps) {
  return (
    <div>
      <ChartContainer
        state={state}
        height={height}
        accessibleSummary={accessibleSummary}
        staleFreshness={staleFreshness}
        emptyMessage={emptyMessage}
        errorMessage={errorMessage}
        onRetry={onRetry}
      >
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke={GRID_COLOR} />
            <XAxis
              dataKey={xKey}
              tick={{ fill: AXIS_TEXT_COLOR, fontSize: 11 }}
              axisLine={{ stroke: GRID_COLOR }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: AXIS_TEXT_COLOR, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              content={<ChartTooltip valueFormatter={valueFormatter} />}
              cursor={{ stroke: GRID_COLOR, strokeWidth: 1 }}
            />
            {series.map((s, i) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color || seriesColor(i)}
                strokeWidth={2}
                strokeDasharray={s.strokeDasharray}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </RechartsLineChart>
        </ResponsiveContainer>
      </ChartContainer>
      <ChartLegend
        items={series.map((s, i) => ({
          label: s.label,
          color: s.color || seriesColor(i),
        }))}
      />
    </div>
  );
}
