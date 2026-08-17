import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrgPackage } from "@/lib/plan-limits";
import { calculateShopVelocity, calculateListingDeltas } from "@/services/tracking-engine";
import type { ShopTrackingReport, ShopTrackingReportListingChange } from "@/types/tracking";

const ALLOWED_WINDOW_DAYS = [3, 7, 30];

/**
 * Real before/after delta report for a tracked shop, built from the actual
 * ShopSnapshot/ListingSnapshot history — never a single-moment dump. The
 * requested window is capped by the org's Package.maxTrackingDays
 * entitlement (see plan-limits.ts / getOrgPackage), same as the 3D/7D/30D
 * selector in the UI.
 */
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

    const requestedDaysRaw = parseInt(req.nextUrl.searchParams.get("days") || "3", 10);
    const requestedDays = ALLOWED_WINDOW_DAYS.includes(requestedDaysRaw) ? requestedDaysRaw : 3;

    const orgPkg = await getOrgPackage(organizationId);
    if (requestedDays > orgPkg.maxTrackingDays) {
      return NextResponse.json(
        {
          error: `Your ${orgPkg.name} plan allows tracking reports up to ${orgPkg.maxTrackingDays} day(s). Upgrade to unlock the ${requestedDays}-day report.`,
        },
        { status: 403 }
      );
    }

    const watch = await prisma.shopWatch.findUnique({
      where: { organizationId_shopExternalId: { organizationId, shopExternalId } },
    });
    if (!watch || !watch.isActive) {
      return NextResponse.json(
        { error: "This shop is not currently being tracked." },
        { status: 404 }
      );
    }

    const windowStart = new Date(Date.now() - requestedDays * 24 * 60 * 60 * 1000);

    const snapshotsInWindow = await prisma.shopSnapshot.findMany({
      where: { shopWatchId: watch.id, capturedAt: { gte: windowStart } },
      orderBy: { capturedAt: "asc" },
    });

    // Fall back to the two most recent snapshots overall so a shop that's
    // only just started tracking (snapshots older than the window, if any
    // exist at all) still gets a real report rather than a false "0 in
    // window" reading — but never fabricate a snapshot that doesn't exist.
    const snapshots =
      snapshotsInWindow.length >= 2
        ? snapshotsInWindow
        : await prisma.shopSnapshot.findMany({
            where: { shopWatchId: watch.id },
            orderBy: { capturedAt: "asc" },
          });

    if (snapshots.length < 2) {
      const report: ShopTrackingReport = {
        status: "insufficient_data",
        shopExternalId,
        shopName: watch.shopName,
        windowDays: requestedDays,
        snapshotCount: snapshots.length,
      };
      return NextResponse.json({ success: true, report });
    }

    const start = snapshots[0]!;
    const end = snapshots[snapshots.length - 1]!;
    const velocity = calculateShopVelocity(snapshots);

    // Notable per-listing changes for this shop, scoped to the same
    // organization — never queried without the organizationId filter.
    const listingWatches = await prisma.listingWatch.findMany({
      where: { organizationId, shopExternalId, isActive: true },
      include: {
        snapshots: {
          where: { capturedAt: { gte: windowStart } },
          orderBy: { capturedAt: "asc" },
        },
      },
    });

    const listingChanges: ShopTrackingReportListingChange[] = [];
    for (const lw of listingWatches) {
      if (lw.snapshots.length < 2) continue;
      const deltas = calculateListingDeltas(lw.snapshots);
      if (!deltas.priceDelta && !deltas.favorersDelta) continue;
      const lStart = lw.snapshots[0]!;
      const lEnd = lw.snapshots[lw.snapshots.length - 1]!;
      listingChanges.push({
        listingExternalId: lw.listingExternalId,
        title: lw.title,
        url: lw.url,
        priceStart: lStart.price,
        priceEnd: lEnd.price,
        priceDelta: deltas.priceDelta,
        currency: lEnd.currency ?? lStart.currency,
        favorersStart: lStart.numFavorers,
        favorersEnd: lEnd.numFavorers,
        favorersDelta: deltas.favorersDelta,
      });
    }

    const report: ShopTrackingReport = {
      status: "ok",
      shopExternalId,
      shopName: watch.shopName,
      windowDays: requestedDays,
      snapshotCount: snapshots.length,
      startCapturedAt: start.capturedAt.toISOString(),
      endCapturedAt: end.capturedAt.toISOString(),
      shopMetrics: {
        totalSalesStart: start.totalSales,
        totalSalesEnd: end.totalSales,
        totalSalesDelta:
          start.totalSales !== null && end.totalSales !== null
            ? end.totalSales - start.totalSales
            : null,
        activeListingsStart: start.activeListings,
        activeListingsEnd: end.activeListings,
        activeListingsDelta: end.activeListings - start.activeListings,
        reviewCountStart: start.reviewCount,
        reviewCountEnd: end.reviewCount,
        reviewCountDelta: end.reviewCount - start.reviewCount,
      },
      velocity,
      listingChanges,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, report });
  } catch (err: any) {
    console.error("[SHOP_TRACKING_REPORT_GET_ERROR]", err);
    return NextResponse.json(
      { error: err.message || "Failed to build tracking report" },
      { status: 500 }
    );
  }
}
