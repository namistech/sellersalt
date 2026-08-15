import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Store, ShieldCheck, ArrowRight, Sparkles, BarChart3 } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AnalyticsRevenueChart } from "./analytics-charts";
import { Card, Button, Badge, Heading, Text } from "@/components/ui";

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) redirect("/login");

  const channels = await prisma.sellerChannel.findMany({
    where: { organizationId, status: "ACTIVE" },
    include: {
      orders: { orderBy: { placedAt: "desc" } },
    },
  });

  // Intentional Premium Locked State if disconnected
  if (channels.length === 0) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <Heading as="h1" size="h2">
            Store Performance & Analytics
          </Heading>
          <Text size="body-md" color="secondary" className="mt-1">
            Real-time sales tracking, order volume, and listing conversion intelligence.
          </Text>
        </div>

        <Card padding="lg" className="border-line bg-surface shadow-xs text-center py-12 space-y-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0E8F5D]/10 text-[#0E8F5D] mx-auto">
            <BarChart3 className="h-7 w-7" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-ink">
              Connect your Etsy shop to unlock store analytics
            </h3>
            <p className="text-xs leading-relaxed text-ink-secondary">
              Correlate your Opportunity Radar research with your live store's transaction receipts, sales velocity, and customer revenue.
            </p>
          </div>

          <div className="pt-2">
            <Link href="/settings/channels">
              <Button variant="primary" className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-sm">
                <Store className="h-4 w-4 mr-1.5" /> Connect Etsy Shop
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto pt-6 text-left text-xs border-t border-line-subtle text-ink-secondary">
            <div className="space-y-1">
              <span className="font-semibold text-ink flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-[#0E8F5D]" /> Secure OAuth
              </span>
              <p className="text-[11px]">Direct official authentication via Etsy Open API.</p>
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-ink flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-[#FFB020]" /> Multi-Currency
              </span>
              <p className="text-[11px]">Honest per-currency revenue separation.</p>
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-ink flex items-center gap-1">
                <BarChart3 className="h-3.5 w-3.5 text-[#0E8F5D]" /> Order Velocity
              </span>
              <p className="text-[11px]">Daily 30-day transaction trendline breakdown.</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const totalOrders = channels.reduce((sum: number, c: (typeof channels)[number]) => sum + c.orders.length, 0);

  const perChannel = channels.map((c: (typeof channels)[number]) => {
    const revenue = c.orders.reduce((sum: number, o: (typeof c.orders)[number]) => sum + o.totalAmount, 0);
    const currency = c.orders[0]?.currency ?? "USD";
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

  const chartData = channels.map((c: (typeof channels)[number]) => ({
    label: c.label,
    currency: c.orders[0]?.currency ?? "",
    points: buildDailySeries(c.orders),
  }));

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Heading as="h1" size="h2">
            Store Performance & Analytics
          </Heading>
          <Text size="body-md" color="secondary" className="mt-1">
            Real order metrics from your connected Etsy seller stores.
          </Text>
        </div>
        <Link href="/settings/channels">
          <Button variant="secondary" size="compact" className="text-xs">
            Manage Connected Stores
          </Button>
        </Link>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="md" className="border-line bg-surface shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-tertiary">Connected Stores</div>
          <div className="mt-2 text-3xl font-black text-ink">{channels.length}</div>
        </Card>

        <Card padding="md" className="border-line bg-surface shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-tertiary">Total Synced Orders</div>
          <div className="mt-2 text-3xl font-black text-[#0E8F5D]">{totalOrders.toLocaleString()}</div>
        </Card>

        <Card padding="md" className="border-line bg-surface shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-tertiary">Active Store Velocity</div>
          <div className="mt-2 text-sm font-bold text-ink">
            {best && best.recentOrderCount > 0 ? `${best.label} (${best.recentOrderCount} recent orders)` : "Awaiting initial sync activity"}
          </div>
        </Card>
      </div>

      {/* Orders Trend Graph */}
      <Card padding="lg" className="border-line bg-surface shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-ink">Orders Per Day (Last 30 Days)</h3>
          <p className="text-xs text-ink-tertiary">Daily transaction velocity across connected seller channels.</p>
        </div>
        <AnalyticsRevenueChart series={chartData} />
      </Card>

      {/* Breakdown By Store */}
      <Card padding="lg" className="border-line bg-surface shadow-xs space-y-4 overflow-x-auto">
        <h3 className="text-sm font-bold text-ink">Connected Channels Breakdown</h3>
        <table className="w-full text-left text-xs text-ink">
          <thead>
            <tr className="border-b border-line text-ink-tertiary uppercase tracking-wider">
              <th className="py-2.5 pr-4 font-semibold">Store</th>
              <th className="py-2.5 pr-4 font-semibold">Orders</th>
              <th className="py-2.5 pr-4 font-semibold">Revenue</th>
              <th className="py-2.5 pr-4 font-semibold">Last Synchronized</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-subtle">
            {perChannel.map((c: (typeof perChannel)[number]) => (
              <tr key={c.id}>
                <td className="py-3 pr-4 font-semibold text-ink">{c.label}</td>
                <td className="py-3 pr-4 tabular-nums">{c.orderCount}</td>
                <td className="py-3 pr-4 tabular-nums font-semibold text-[#0E8F5D]">
                  {c.currency} {c.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-3 pr-4 text-ink-tertiary">
                  {c.lastSyncedAt ? new Date(c.lastSyncedAt).toLocaleString() : "Sync pending"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
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
