import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  calculateShopDeltas,
  calculateShopVelocity,
  evaluateTrackingHealth,
} from "@/services/tracking-engine";
import { checkLimit } from "@/lib/plan-limits";
import { startShopWatch } from "@/lib/queue";
import type { TrackedShopSummary } from "@/types/tracking";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const organizationId = session.user.organizationId;

    const watches = await prisma.shopWatch.findMany({
      where: { organizationId, isActive: true },
      include: {
        snapshots: {
          orderBy: { capturedAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const shops: TrackedShopSummary[] = watches.map((w) => {
      const snapshots = w.snapshots;
      const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
      const deltas = calculateShopDeltas(snapshots);
      const velocity = calculateShopVelocity(snapshots);
      const health = evaluateTrackingHealth(latest, snapshots.length);

      return {
        id: w.id,
        shopExternalId: w.shopExternalId,
        shopName: w.shopName,
        trackingSince: w.createdAt.toISOString(),
        isActive: w.isActive,
        latestSnapshot: latest
          ? {
              id: latest.id,
              totalSales: latest.totalSales,
              reviewCount: latest.reviewCount,
              reviewAverage: latest.reviewAverage,
              activeListings: latest.activeListings,
              numFavorers: latest.numFavorers,
              capturedAt: latest.capturedAt.toISOString(),
            }
          : null,
        deltas,
        velocity,
        health,
        snapshotCount: snapshots.length,
      };
    });

    return NextResponse.json({ success: true, shops });
  } catch (err: any) {
    console.error("[TRACKING_SHOPS_GET_ERROR]", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch tracked shops" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const organizationId = session.user.organizationId;
    const body = await req.json();

    const { shopExternalId, shopName } = body;
    if (!shopExternalId || !shopName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Quota Check
    const count = await prisma.shopWatch.count({
      where: { organizationId, isActive: true },
    });

    const limitCheck = await checkLimit(organizationId, "trackedShops");
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: `Tracking quota reached (${count}/${limitCheck.limit} shops). Upgrade plan to track more competitor stores.`,
        },
        { status: 403 }
      );
    }

    // 2. Resolve Connector
    let connector = await prisma.connector.findFirst({
      where: { organizationId, type: "ETSY" },
    });
    if (!connector) {
      connector = await prisma.connector.findFirst();
    }
    if (!connector) {
      return NextResponse.json({ error: "No active connector found" }, { status: 400 });
    }

    // 3. Upsert ShopWatch
    const watch = await prisma.shopWatch.upsert({
      where: {
        organizationId_shopExternalId: {
          organizationId,
          shopExternalId,
        },
      },
      create: {
        organizationId,
        connectorId: connector.id,
        shopExternalId,
        shopName,
        isActive: true,
      },
      update: {
        isActive: true,
        shopName,
      },
    });

    // 4. Trigger Initial Snapshot Job
    try {
      await startShopWatch({
        shopWatchId: watch.id,
        organizationId,
        connectorId: connector.id,
        shopExternalId: watch.shopExternalId,
      });
    } catch {}

    return NextResponse.json({ success: true, watch });
  } catch (err: any) {
    console.error("[TRACKING_SHOPS_POST_ERROR]", err);
    return NextResponse.json(
      { error: err.message || "Failed to start tracking shop" },
      { status: 500 }
    );
  }
}
