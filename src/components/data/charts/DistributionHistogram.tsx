"use client";

import React from "react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { ChartContainer, type ChartState } from "./ChartContainer";
import { ChartTooltip } from "./ChartTooltip";
import { GRID_COLOR, AXIS_TEXT_COLOR, BRAND_COLOR } from "./chart-colors";
import type { FreshnessProps } from "../Freshness";

export interface HistogramBin {
  range: string;
  count: number;
  isObservedBin?: boolean;
}

export interface DistributionHistogramProps {
  data: HistogramBin[];
  medianValue?: number;
  currentValue?: number;
  height?: number;
  unit?: string;
  state?: ChartState;
  valueFormatter?: (value: number | string) => string;
  accessibleSummary?: string;
  staleFreshness?: FreshnessProps;
  emptyMessage?: string;
  errorMessage?: string;
  onRetry?: () => void;
}

export function DistributionHistogram({
  data,
  medianValue,
  currentValue,
  height = 180,
  unit = "$",
  state = "ready",
  valueFormatter = (v) => `${v} listings`,
  accessibleSummary,
  staleFreshness,
  emptyMessage,
  errorMessage,
  onRetry,
}: DistributionHistogramProps) {
  return (
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
        <RechartsBarChart
          data={data}
          margin={{ top: 12, right: 12, left: -20, bottom: 0 }}
        >
          <XAxis
            dataKey="range"
            tick={{ fill: AXIS_TEXT_COLOR, fontSize: 10 }}
            axisLine={{ stroke: GRID_COLOR }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: AXIS_TEXT_COLOR, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} />
          <Bar dataKey="count" name="Listings" radius={[3, 3, 0, 0]} maxBarSize={36}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isObservedBin ? "#0E8F5D" : "rgb(var(--color-border-strong))"}
                fillOpacity={entry.isObservedBin ? 1 : 0.6}
              />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
