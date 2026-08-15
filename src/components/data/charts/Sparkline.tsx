"use client";

import { Line, LineChart, ResponsiveContainer } from "recharts";
import { POSITIVE_COLOR, NEGATIVE_COLOR, NEUTRAL_COLOR, BRAND_COLOR } from "./chart-colors";

// design-system-v1.md §11/§14 — Sparkline: "minimal, no axes/labels,
// single color matching the parent metric's semantic color, inline use
// only." Deliberately not built on ChartContainer — a sparkline has no
// meaningful "empty/error" chrome of its own; the parent (Metric,
// RankingRow, etc.) decides whether to render one at all.

export type SparklineTone = "positive" | "negative" | "neutral" | "brand";

const TONE_COLOR: Record<SparklineTone, string> = {
  positive: POSITIVE_COLOR,
  negative: NEGATIVE_COLOR,
  neutral: NEUTRAL_COLOR,
  brand: BRAND_COLOR,
};

export interface SparklineProps {
  data: number[];
  tone?: SparklineTone;
  height?: number;
  width?: number;
  className?: string;
}

export function Sparkline({ data, tone = "brand", height = 28, width = 80, className }: SparklineProps) {
  const points = data.map((value, i) => ({ i, value }));
  const color = TONE_COLOR[tone];

  return (
    <div style={{ height, width }} className={className} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points}>
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
