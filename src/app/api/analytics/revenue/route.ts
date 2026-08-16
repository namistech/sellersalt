import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  calculateProfitWaterfall,
  calculateListingYieldMatrix,
  generateFinancialInsights,
  type NormalizedOrder,
} from "@/services/revenue-engine";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const organizationId = session.user.organizationId;
    const { searchParams } = new URL(req.url);

    const period = searchParams.get("period") || "30d";
    const channelId = searchParams.get("channelId") || undefined;
    const selectedCurrency = searchParams.get("currency") || undefined;

    // 1. Calculate Date Boundary
    let startDate: Date | undefined;
    const now = new Date();
    if (period === "7d") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === "30d") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (period === "90d") {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (period === "12m") {
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }

    // 2. Fetch Active Channels for Organization
    const channels = await prisma.sellerChannel.findMany({
      where: {
        organizationId,
        status: "ACTIVE",
        ...(channelId ? { id: channelId } : {}),
      },
      select: {
        id: true,
        label: true,
        storeUrl: true,
        platform: true,
        lastSyncedAt: true,
      },
    });

    if (channels.length === 0) {
      return NextResponse.json({
        success: true,
        hasConnectedChannels: false,
        channels: [],
        availableCurrencies: ["USD"],
        waterfall: calculateProfitWaterfall([], "USD"),
        timeSeries: [],
        insights: generateFinancialInsights(calculateProfitWaterfall([], "USD"), []),
      });
    }

    const channelIds = channels.map((c) => c.id);

    // 3. Fetch Orders for Tenant Channels
    const orders = await prisma.sellerOrder.findMany({
      where: {
        sellerChannelId: { in: channelIds },
        ...(startDate ? { placedAt: { gte: startDate } } : {}),
      },
      orderBy: { placedAt: "asc" },
    });

    // 4. Identify Available Currencies
    const currencySet = new Set<string>();
    for (const o of orders) {
      if (o.currency) currencySet.add(o.currency);
    }
    const availableCurrencies = currencySet.size > 0 ? Array.from(currencySet) : ["USD"];
    const activeCurrency = selectedCurrency && availableCurrencies.includes(selectedCurrency)
      ? selectedCurrency
      : availableCurrencies[0];

    // Filter orders by active currency
    const filteredOrders = orders.filter((o) => o.currency === activeCurrency);

    // 5. Fetch Cost Assumptions for Organization
    const assumptionSetting = await prisma.appSetting.findUnique({
      where: { key: `financial_assumptions_${organizationId}` },
    });
    let assumptions = undefined;
    if (assumptionSetting?.value) {
      try {
        assumptions = JSON.parse(assumptionSetting.value);
      } catch {}
    }

    // 6. Normalize Orders
    const normalizedOrders: NormalizedOrder[] = filteredOrders.map((o) => ({
      id: o.id,
      externalOrderId: o.externalOrderId,
      totalAmount: o.totalAmount,
      currency: o.currency,
      status: o.status,
      placedAt: o.placedAt,
    }));

    // 7. Calculate Waterfall, Yields & Insights
    const waterfall = calculateProfitWaterfall(normalizedOrders, activeCurrency, { assumptions });
    const yieldList = calculateListingYieldMatrix(normalizedOrders, { assumptions });
    const insights = generateFinancialInsights(waterfall, yieldList);

    // 8. Build Daily Time Series Points
    const dailyMap = new Map<string, { revenue: number; orders: number; profit: number }>();
    for (const o of normalizedOrders) {
      const dayKey = o.placedAt.toISOString().slice(0, 10);
      const cur = dailyMap.get(dayKey) || { revenue: 0, orders: 0, profit: 0 };
      if (o.status !== "refunded") {
        cur.revenue += o.totalAmount;
        cur.orders += 1;
        cur.profit += o.totalAmount * (waterfall.contributionMargin / 100);
      }
      dailyMap.set(dayKey, cur);
    }

    const timeSeries = Array.from(dailyMap.entries()).map(([date, val]) => ({
      date,
      revenue: Number(val.revenue.toFixed(2)),
      orders: val.orders,
      profit: Number(val.profit.toFixed(2)),
    }));

    return NextResponse.json({
      success: true,
      hasConnectedChannels: true,
      channels,
      activeCurrency,
      availableCurrencies,
      waterfall,
      timeSeries,
      insights,
    });
  } catch (err: any) {
    console.error("[ANALYTICS_REVENUE_ERROR]", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch revenue analytics" },
      { status: 500 }
    );
  }
}
