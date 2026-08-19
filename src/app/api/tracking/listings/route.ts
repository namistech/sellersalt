import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  calculateListingDeltas,
  evaluateTrackingHealth,
} from "@/services/tracking-engine";
import { getOrgPackage } from "@/lib/plan-limits";
import { getSnapshotRetentionCutoff } from "@/lib/data-retention";
import type { TrackedListingSummary } from "@/types/tracking";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const organizationId = session.user.organizationId;

    const watches = await prisma.listingWatch.findMany({
      where: { organizationId, isActive: true },
      include: {
        snapshots: {
          orderBy: { capturedAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const listings: TrackedListingSummary[] = watches.map((w) => {
      const snapshots = w.snapshots;
      const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
      const deltas = calculateListingDeltas(snapshots);
      const health = evaluateTrackingHealth(latest, snapshots.length);

      return {
        id: w.id,
        listingExternalId: w.listingExternalId,
        title: w.title,
        shopExternalId: w.shopExternalId,
        shopName: w.shopName,
        url: w.url,
        imageUrl: w.imageUrl,
        currentPrice: latest?.price ?? null,
        currency: latest?.currency ?? "USD",
        quantity: latest?.quantity ?? null,
        numFavorers: latest?.numFavorers ?? null,
        state: latest?.state ?? "active",
        trackingSince: w.createdAt.toISOString(),
        isActive: w.isActive,
        latestSnapshot: latest
          ? {
              id: latest.id,
              price: latest.price,
              currency: latest.currency,
              quantity: latest.quantity,
              numFavorers: latest.numFavorers,
              state: latest.state,
              capturedAt: latest.capturedAt.toISOString(),
            }
          : null,
        priceDelta: deltas.priceDelta,
        favorersDelta: deltas.favorersDelta,
        snapshotCount: snapshots.length,
        health,
      };
    });

    return NextResponse.json({ success: true, listings });
  } catch (err: any) {
    console.error("[TRACKING_LISTINGS_GET_ERROR]", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch tracked listings" },
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

    const { listingExternalId, title, shopExternalId, shopName, price, currency, quantity, numFavorers, url, imageUrl } = body;
    if (!listingExternalId || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Quota Check (Default limits: Starter 20, Pro 100, Agency 500)
    const count = await prisma.listingWatch.count({
      where: { organizationId, isActive: true },
    });

    const orgPkg = await getOrgPackage(organizationId);
    const maxAllowed = orgPkg.maxTrackedShops * 4; // e.g. 20, 120, 600
    if (count >= maxAllowed) {
      return NextResponse.json(
        {
          error: `Listing tracking quota reached (${count}/${maxAllowed} listings). Upgrade plan to track more listings.`,
        },
        { status: 403 }
      );
    }

    // 2. Upsert ListingWatch
    const watch = await prisma.listingWatch.upsert({
      where: {
        organizationId_listingExternalId: {
          organizationId,
          listingExternalId,
        },
      },
      create: {
        organizationId,
        listingExternalId,
        shopExternalId,
        shopName,
        title,
        url,
        imageUrl,
        isActive: true,
      },
      update: {
        isActive: true,
        title,
        url,
        imageUrl,
      },
    });

    // 3. Create Initial Snapshot
    if (price !== undefined || numFavorers !== undefined) {
      await prisma.listingSnapshot.create({
        data: {
          listingWatchId: watch.id,
          price: typeof price === "number" ? price : parseFloat(price) || null,
          currency: currency || "USD",
          quantity: typeof quantity === "number" ? quantity : parseInt(quantity) || null,
          numFavorers: typeof numFavorers === "number" ? numFavorers : parseInt(numFavorers) || null,
          state: "active",
        },
      });

      // Data minimization: prune history outside the widest tracking window
      // any active plan actually sells (see src/lib/data-retention.ts).
      const retentionCutoff = await getSnapshotRetentionCutoff();
      await prisma.listingSnapshot
        .deleteMany({
          where: { listingWatchId: watch.id, capturedAt: { lt: retentionCutoff } },
        })
        .catch(() => {});
    }

    return NextResponse.json({ success: true, watch });
  } catch (err: any) {
    console.error("[TRACKING_LISTINGS_POST_ERROR]", err);
    return NextResponse.json(
      { error: err.message || "Failed to start tracking listing" },
      { status: 500 }
    );
  }
}
