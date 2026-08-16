import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  calculateListingYieldMatrix,
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

    let startDate: Date | undefined;
    const now = new Date();
    if (period === "7d") startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (period === "30d") startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    else if (period === "90d") startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    else if (period === "12m") startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const channels = await prisma.sellerChannel.findMany({
      where: {
        organizationId,
        status: "ACTIVE",
        ...(channelId ? { id: channelId } : {}),
      },
      select: { id: true },
    });

    if (channels.length === 0) {
      return NextResponse.json({ success: true, listings: [] });
    }

    const channelIds = channels.map((c) => c.id);

    const orders = await prisma.sellerOrder.findMany({
      where: {
        sellerChannelId: { in: channelIds },
        ...(startDate ? { placedAt: { gte: startDate } } : {}),
        ...(selectedCurrency ? { currency: selectedCurrency } : {}),
      },
      orderBy: { placedAt: "desc" },
    });

    // Match with ListingDrafts where possible
    const drafts = await prisma.listingDraft.findMany({
      where: { organizationId },
      select: { id: true, title: true, etsyListingId: true },
    });
    const draftMap = new Map<string, string>();
    for (const d of drafts) {
      if (d.etsyListingId) draftMap.set(d.etsyListingId, d.title);
    }

    const normalizedOrders: NormalizedOrder[] = orders.map((o) => ({
      id: o.id,
      externalOrderId: o.externalOrderId,
      totalAmount: o.totalAmount,
      currency: o.currency,
      status: o.status,
      placedAt: o.placedAt,
      title: o.orderNumber ? draftMap.get(o.orderNumber) : undefined,
    }));

    const listings = calculateListingYieldMatrix(normalizedOrders);

    return NextResponse.json({
      success: true,
      listings,
    });
  } catch (err: any) {
    console.error("[ANALYTICS_LISTINGS_ERROR]", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch listing yield analytics" },
      { status: 500 }
    );
  }
}
