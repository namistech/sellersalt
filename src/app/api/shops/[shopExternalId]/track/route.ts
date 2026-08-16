import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startShopWatch, stopShopWatch } from "@/lib/queue";
import { getActiveConnectorWithCredentials } from "@/lib/get-active-connector";
import { checkLimit } from "@/lib/plan-limits";

async function requireOrg() {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.organizationId as string | undefined;
}

export async function POST(_req: Request, { params }: { params: Promise<{ shopExternalId: string }> }) {
  try {
    const { shopExternalId } = await params;
    if (!shopExternalId) {
      return NextResponse.json({ error: "Shop ID is required." }, { status: 400 });
    }

    const organizationId = await requireOrg();
    if (!organizationId) {
      return NextResponse.json(
        { error: "Please log in to your SellerSalt account to track competitor shops." },
        { status: 401 }
      );
    }

    const existingWatch = await prisma.shopWatch.findUnique({
      where: { organizationId_shopExternalId: { organizationId, shopExternalId } },
    });

    if (!existingWatch || !existingWatch.isActive) {
      const limitCheck = await checkLimit(organizationId, "trackedShops");
      if (!limitCheck.allowed) {
        return NextResponse.json(
          { error: `Your plan allows tracking up to ${limitCheck.limit} shop(s) at once. Upgrade to track more competitor stores.` },
          { status: 403 }
        );
      }
    }

    const active = await getActiveConnectorWithCredentials(organizationId);
    if (!active) {
      return NextResponse.json(
        { error: "Marketplace connection is temporarily initializing. Please try again in a moment." },
        { status: 503 }
      );
    }

    let shopName = (await prisma.prospect.findFirst({
      where: { organizationId, shopExternalId },
      orderBy: { createdAt: "desc" },
    }))?.shopName;

    let stats: any = null;
    if (active.connector.getShopStats) {
      try {
        stats = await active.connector.getShopStats(active.credentials, shopExternalId);
        if (stats?.shopName) {
          shopName = stats.shopName;
        }
      } catch (e) {
        console.error("[TRACK_GET_SHOP_STATS_ERROR]", e);
      }
    }

    if (!shopName) {
      shopName = `Shop ${shopExternalId}`;
    }

    const watch = await prisma.shopWatch.upsert({
      where: { organizationId_shopExternalId: { organizationId, shopExternalId } },
      create: {
        organizationId,
        connectorId: active.connectorRow.id,
        shopExternalId,
        shopName,
        isActive: true,
      },
      update: { isActive: true, shopName },
    });

    // Capture initial snapshot immediately
    if (stats) {
      try {
        await prisma.shopSnapshot.create({
          data: {
            shopWatchId: watch.id,
            totalSales: stats.totalSales ?? 0,
            reviewCount: stats.reviewCount ?? 0,
            reviewAverage: stats.reviewAverage ?? null,
            activeListings: stats.activeListings ?? 0,
            numFavorers: stats.numFavorers ?? null,
          },
        });
      } catch (snapErr) {
        console.error("[INITIAL_SNAPSHOT_CAPTURE_ERROR]", snapErr);
      }
    }

    // Schedule 6-hour recurring surveillance
    try {
      await startShopWatch({
        shopWatchId: watch.id,
        organizationId,
        connectorId: active.connectorRow.id,
        shopExternalId,
      });
    } catch (err) {
      console.error("[SHOP_TRACK_SCHEDULE_ERROR]", err);
    }

    return NextResponse.json({
      ok: true,
      success: true,
      watch,
      message: `Started 6-hour competitor surveillance for ${shopName}.`,
    });
  } catch (err: any) {
    console.error("[SHOP_TRACK_POST_ERROR]", err);
    return NextResponse.json(
      { error: "SellerSalt couldn't start tracking this shop right now. Please try again in a moment." },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ shopExternalId: string }> }) {
  try {
    const { shopExternalId } = await params;
    const organizationId = await requireOrg();
    if (!organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const watch = await prisma.shopWatch.findUnique({
      where: { organizationId_shopExternalId: { organizationId, shopExternalId } },
    });
    if (!watch) {
      return NextResponse.json({ error: "This shop is not currently being tracked." }, { status: 404 });
    }

    await prisma.shopWatch.update({ where: { id: watch.id }, data: { isActive: false } });
    try {
      await stopShopWatch(watch.id);
    } catch (err) {
      console.error("[SHOP_UNTRACK_SCHEDULE_ERROR]", err);
    }

    return NextResponse.json({ ok: true, success: true, message: "Shop tracking stopped." });
  } catch (err: any) {
    console.error("[SHOP_TRACK_DELETE_ERROR]", err);
    return NextResponse.json(
      { error: "Failed to stop tracking this shop. Please try again." },
      { status: 500 }
    );
  }
}
