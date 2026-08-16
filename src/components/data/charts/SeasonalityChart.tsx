"use client";

import React from "react";
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { ChartContainer, type ChartState } from "./ChartContainer";
import { ChartTooltip } from "./ChartTooltip";
import { GRID_COLOR, AXIS_TEXT_COLOR } from "./chart-colors";

export interface SeasonalityMonthData {
  month: string;
  index: number; // 100 is baseline average
  volume?: number;
  isPeak?: boolean;
}

export interface SeasonalityChartProps {
  data: SeasonalityMonthData[];
  height?: number;
  state?: ChartState;
  baseline?: number;
  valueFormatter?: (val: number | string) => string;
  accessibleSummary?: string;
}

export function SeasonalityChart({
  data,
  height = 200,
  state = "ready",
  baseline = 100,
  valueFormatter = (v) => `${v} (Index)`,
  accessibleSummary = "12-month seasonality demand curve showing relative indexing vs annual baseline.",
}: SeasonalityChartProps) {
  return (
    <ChartContainer state={state} height={height} accessibleSummary={accessibleSummary}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            tick={{ fill: AXIS_TEXT_COLOR, fontSize: 11 }}
            axisLine={{ stroke: GRID_COLOR }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: AXIS_TEXT_COLOR, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={38}
          />
          <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} />
          <ReferenceLine
            y={baseline}
            stroke="#9EAA9F"
            strokeDasharray="4 4"
            label={{ value: "Baseline", fill: AXIS_TEXT_COLOR, fontSize: 10, position: "top" }}
          />
          <Bar dataKey="index" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isPeak || entry.index >= 130 ? "#0E8F5D" : entry.index >= 100 ? "#16C784" : "#C7CCC4"}
              />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
