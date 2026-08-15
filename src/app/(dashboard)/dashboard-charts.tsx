"use client";

import { AreaChart, BarChart, type ChartState } from "@/components/data";

// Thin, typed wrappers around the shared chart primitives
// (src/components/data/charts) — kept as small named components so
// dashboard/page.tsx stays purely presentational. No bespoke Recharts
// usage here anymore: the previous version hand-rolled a gradient
// AreaChart and a raw PieChart with hardcoded hex colors — both are now
// the shared, token-driven AreaChart/BarChart. There's no shared donut
// primitive, so the job-status breakdown uses the shared horizontal
// BarChart (the design system's own "Ranking" pattern) instead of
// inventing a new chart type for this one screen.

export function ProspectsOverTimeChart({ data }: { data: Array<{ day: string; count: number }> }) {
  const state: ChartState = data.length === 0 ? "empty" : "ready";
  return (
    <AreaChart
      data={data}
      xKey="day"
      series={[{ key: "count", label: "Prospects found" }]}
      state={state}
      emptyMessage="No prospects yet — run a search to see this fill in."
      accessibleSummary="Prospects found per day over the last 14 days"
      height={220}
    />
  );
}

export function JobStatusBreakdown({ data }: { data: Array<{ status: string; count: number }> }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const state: ChartState = total === 0 ? "empty" : "ready";
  return (
    <BarChart
      data={data}
      xKey="status"
      series={[{ key: "count", label: "Jobs" }]}
      layout="vertical"
      state={state}
      emptyMessage="No jobs run yet."
      accessibleSummary="Job counts grouped by status"
      height={220}
    />
  );
}
