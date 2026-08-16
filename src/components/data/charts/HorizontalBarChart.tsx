"use client";

import React from "react";
import {
  Bar,
  BarChart as RechartsBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { ChartContainer, type ChartState } from "./ChartContainer";
import { ChartTooltip } from "./ChartTooltip";
import { seriesColor, GRID_COLOR, AXIS_TEXT_COLOR, BRAND_COLOR } from "./chart-colors";
import type { FreshnessProps } from "../Freshness";

export interface HorizontalBarItem {
  label: string;
  value: number;
  secondaryValue?: number | string;
  color?: string;
}

export interface HorizontalBarChartProps {
  data: HorizontalBarItem[];
  height?: number;
  state?: ChartState;
  valueFormatter?: (value: number | string) => string;
  accessibleSummary?: string;
  staleFreshness?: FreshnessProps;
  emptyMessage?: string;
  errorMessage?: string;
  onRetry?: () => void;
  yAxisWidth?: number;
  barColor?: string;
  showPercentage?: boolean;
}

export function HorizontalBarChart({
  data,
  height = 200,
  state = "ready",
  valueFormatter = (v) => `${v}`,
  accessibleSummary,
  staleFreshness,
  emptyMessage,
  errorMessage,
  onRetry,
  yAxisWidth = 100,
  barColor = BRAND_COLOR,
}: HorizontalBarChartProps) {
  const dynamicHeight = Math.max(height, data.length * 32);

  return (
    <ChartContainer
      state={state}
      height={dynamicHeight}
      accessibleSummary={accessibleSummary}
      staleFreshness={staleFreshness}
      emptyMessage={emptyMessage}
      errorMessage={errorMessage}
      onRetry={onRetry}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 24, left: 0, bottom: 4 }}
        >
          <XAxis
            type="number"
            tick={{ fill: AXIS_TEXT_COLOR, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fill: "rgb(var(--color-ink))", fontSize: 12, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            width={yAxisWidth}
          />
          <Tooltip
            content={<ChartTooltip valueFormatter={valueFormatter} />}
            cursor={{ fill: GRID_COLOR, opacity: 0.4 }}
          />
          <Bar
            dataKey="value"
            name="Value"
            radius={[0, 4, 4, 0]}
            maxBarSize={18}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || seriesColor(index)}
              />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
