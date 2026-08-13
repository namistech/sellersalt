import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdminEmail } from "@/lib/is-admin";
import { AnalyticsRevenueChart } from "./analytics-charts";

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) redirect("/dashboard");

  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) return null;

  const channels = await prisma.sellerChannel.findMany({
    where: { organizationId, status: "ACTIVE" },
    include: {
      orders: { orderBy: { placedAt: "desc" } },
    },
  });

  if (channels.length === 0) {
    return (
      <div>
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Analytics</h1>
          <p className="mt-1 text-sm text-muted">Connect a store to see real sales data here.</p>
        </header>
        <div className="card">
          <p className="mb-4 text-sm text-muted">No stores connected yet.</p>
          <Link href="/settings/channels" className="btn-primary">Connect a store</Link>
        </div>
      </div>
    );
  }

  const totalOrders = channels.reduce((sum: number, c: (typeof channels)[number]) => sum + c.orders.length, 0);

  // Revenue is shown per-channel in its own currency rather than blended into
  // one number — summing USD + PKR + EUR as if they were the same unit would
  // be a real, misleading bug, not a rounding nicety.
  const perChannel = channels.map((c: (typeof channels)[number]) => {
    const revenue = c.orders.reduce((sum: number, o: (typeof c.orders)[number]) => sum + o.totalAmount, 0);
    const currency = c.orders[0]?.currency ?? "";
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentOrders = c.orders.filter((o: (typeof c.orders)[number]) => o.placedAt >= thirtyDaysAgo);
    return {
      id: c.id,
      label: c.label,
      platform: c.platform,
      revenue,
      currency,
      orderCount: c.orders.length,
      recentOrderCount: recentOrders.length,
      lastSyncedAt: c.lastSyncedAt,
    };
  });

  const best = [...perChannel].sort((a, b) => b.recentOrderCount - a.recentOrderCount)[0];

  // Chart data per channel — grouped by day, kept separate per currency so the
  // chart legend is honest about what it's showing.
  const chartData = channels.map((c: (typeof channels)[number]) => ({
    label: c.label,
    currency: c.orders[0]?.currency ?? "",
    points: buildDailySeries(c.orders),
  }));

  return (
    <div>
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Analytics</h1>
          <p className="mt-1 text-sm text-muted">Real order data from your connected stores.</p>
        </div>
        <Link href="/settings/channels" className="btn-secondary shrink-0">Manage stores</Link>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="card">
          <div className="text-xs font-medium uppercase tracking-wide text-muted">Connected stores</div>
          <div className="mt-1 text-2xl font-semibold text-ink">{channels.length}</div>
        </div>
        <div className="card">
          <div className="text-xs font-medium uppercase tracking-wide text-muted">Total orders</div>
          <div className="mt-1 text-2xl font-semibold text-ink">{totalOrders}</div>
        </div>
        <div className="card md:col-span-2">
          <div className="text-xs font-medium uppercase tracking-wide text-muted">Best performing (last 30 days)</div>
          <div className="mt-1 text-lg font-semibold text-ink">
            {best && best.recentOrderCount > 0 ? `${best.label} — ${best.recentOrderCount} orders` : "Not enough recent data yet"}
          </div>
        </div>
      </div>

      <div className="mb-6 card">
        <h2 className="mb-3 text-sm font-semibold text-ink">Orders per day — last 30 days</h2>
        <AnalyticsRevenueChart series={chartData} />
      </div>

      <div className="card overflow-x-auto">
        <h2 className="mb-3 text-sm font-semibold text-ink">By store</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="py-2 pr-4">Store</th>
              <th className="py-2 pr-4">Orders</th>
              <th className="py-2 pr-4">Revenue</th>
              <th className="py-2 pr-4">Last synced</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {perChannel.map((c: (typeof perChannel)[number]) => (
              <tr key={c.id}>
                <td className="py-2 pr-4 font-medium text-ink">{c.label}</td>
                <td className="py-2 pr-4 tabular-nums">{c.orderCount}</td>
                <td className="py-2 pr-4 tabular-nums">
                  {c.currency ? `${c.currency} ${c.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—"}
                </td>
                <td className="py-2 pr-4 text-muted">
                  {c.lastSyncedAt ? new Date(c.lastSyncedAt).toLocaleString() : "Not synced yet"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function buildDailySeries(orders: Array<{ placedAt: Date }>) {
  const counts = new Map<string, number>();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  for (const o of orders) {
    if (o.placedAt < thirtyDaysAgo) continue;
    const key = o.placedAt.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}
