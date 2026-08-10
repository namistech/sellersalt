"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Series {
  label: string;
  currency: string;
  points: Array<{ date: string; count: number }>;
}

const COLORS = ["#2563EB", "#16A34A", "#D97706", "#7C3AED", "#DC2626"];

export function AnalyticsRevenueChart({ series }: { series: Series[] }) {
  const hasData = series.some((s) => s.points.length > 0);
  if (!hasData) {
    return <p className="py-12 text-center text-sm text-muted">No orders in the last 30 days yet.</p>;
  }

  // Merge all series onto a shared date axis so each store gets its own line.
  const allDates = [...new Set(series.flatMap((s) => s.points.map((p) => p.date)))].sort();
  const merged = allDates.map((date) => {
    const row: Record<string, string | number> = { date };
    for (const s of series) {
      row[s.label] = s.points.find((p) => p.date === date)?.count ?? 0;
    }
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={merged}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(228 228 231)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          stroke="rgb(113 113 122)"
          axisLine={false}
          tickLine={false}
          tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        />
        <YAxis tick={{ fontSize: 11 }} stroke="rgb(113 113 122)" axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgb(228 228 231)" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s, i) => (
          <Line key={s.label} type="monotone" dataKey={s.label} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 2 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
