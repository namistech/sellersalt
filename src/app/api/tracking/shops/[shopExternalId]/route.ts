import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stopShopWatch } from "@/lib/queue";
import { calculateShopDeltas, calculateShopVelocity } from "@/services/tracking-engine";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shopExternalId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const organizationId = session.user.organizationId;
    const { shopExternalId } = await params;

    const watch = await prisma.shopWatch.findUnique({
      where: {
        organizationId_shopExternalId: {
          organizationId,
          shopExternalId,
        },
      },
      include: {
        snapshots: {
          orderBy: { capturedAt: "asc" },
        },
      },
    });

    if (!watch) {
      return NextResponse.json({ error: "Tracked shop not found" }, { status: 404 });
    }

    const deltas = calculateShopDeltas(watch.snapshots);
    const velocity = calculateShopVelocity(watch.snapshots);

    return NextResponse.json({
      success: true,
      shop: {
        id: watch.id,
        shopExternalId: watch.shopExternalId,
        shopName: watch.shopName,
        isActive: watch.isActive,
        createdAt: watch.createdAt.toISOString(),
        deltas,
        velocity,
        snapshots: watch.snapshots.map((s) => ({
          id: s.id,
          totalSales: s.totalSales,
          reviewCount: s.reviewCount,
          reviewAverage: s.reviewAverage,
          activeListings: s.activeListings,
          numFavorers: s.numFavorers,
          capturedAt: s.capturedAt.toISOString(),
        })),
      },
    });
  } catch (err: any) {
    console.error("[TRACKING_SHOP_DETAIL_ERROR]", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch shop history" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ shopExternalId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const organizationId = session.user.organizationId;
    const { shopExternalId } = await params;

    const watch = await prisma.shopWatch.findUnique({
      where: {
        organizationId_shopExternalId: {
          organizationId,
          shopExternalId,
        },
      },
    });

    if (!watch) {
      return NextResponse.json({ error: "Tracked shop not found" }, { status: 404 });
    }

    await prisma.shopWatch.update({
      where: { id: watch.id },
      data: { isActive: false },
    });

    try {
      await stopShopWatch(watch.id);
    } catch {}

    return NextResponse.json({ success: true, message: "Shop tracking stopped." });
  } catch (err: any) {
    console.error("[TRACKING_SHOP_DELETE_ERROR]", err);
    return NextResponse.json(
      { error: err.message || "Failed to stop tracking shop" },
      { status: 500 }
    );
  }
}
