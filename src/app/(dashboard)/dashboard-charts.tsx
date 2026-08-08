"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  QUEUED: "#A1A1AA",
  RUNNING: "#2563EB",
  SUCCESS: "#16A34A",
  FAILED: "#DC2626",
};

export function ProspectsOverTimeChart({ data }: { data: Array<{ day: string; count: number }> }) {
  if (data.length === 0) {
    return <p className="py-12 text-center text-sm text-muted">No prospects yet — run a search to see this fill in.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="prospectsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(228 228 231)" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="rgb(113 113 122)" axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11 }} stroke="rgb(113 113 122)" axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgb(228 228 231)" }} />
        <Area type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={2} fill="url(#prospectsFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function JobStatusDonut({ data }: { data: Array<{ status: string; count: number }> }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) {
    return <p className="py-12 text-center text-sm text-muted">No jobs run yet.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="status" innerRadius={55} outerRadius={80} paddingAngle={3}>
          {data.map((d) => (
            <Cell key={d.status} fill={STATUS_COLORS[d.status] ?? "#A1A1AA"} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgb(228 228 231)" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
