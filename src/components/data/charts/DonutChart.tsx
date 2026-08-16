"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ChartContainer, type ChartState } from "./ChartContainer";
import { ChartTooltip } from "./ChartTooltip";
import { seriesColor } from "./chart-colors";
import type { FreshnessProps } from "../Freshness";

export interface DonutSegment {
  name: string;
  value: number;
  color?: string;
}

export interface DonutChartProps {
  data: DonutSegment[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  centerMetric?: {
    value: string | number;
    label: string;
  };
  state?: ChartState;
  valueFormatter?: (value: number | string) => string;
  accessibleSummary?: string;
  staleFreshness?: FreshnessProps;
  emptyMessage?: string;
  errorMessage?: string;
  onRetry?: () => void;
}

export function DonutChart({
  data,
  height = 200,
  innerRadius = 55,
  outerRadius = 80,
  centerMetric,
  state = "ready",
  valueFormatter = (v) => `${v}`,
  accessibleSummary,
  staleFreshness,
  emptyMessage,
  errorMessage,
  onRetry,
}: DonutChartProps) {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);

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
      <div className="relative h-full w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || seriesColor(index)}
                  stroke="rgb(var(--color-bg-surface))"
                  strokeWidth={2}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Metric */}
        {centerMetric && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="font-mono text-xl font-bold text-ink tabular-nums leading-none">
              {centerMetric.value}
            </span>
            <span className="text-[10px] uppercase font-bold text-ink-tertiary tracking-wider mt-1">
              {centerMetric.label}
            </span>
          </div>
        )}
      </div>
    </ChartContainer>
  );
}
