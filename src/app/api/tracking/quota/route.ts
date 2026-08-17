import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkLimit, getOrgPackage } from "@/lib/plan-limits";
import type { TrackingQuotaInfo } from "@/types/tracking";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const organizationId = session.user.organizationId;

    const orgPkg = await getOrgPackage(organizationId);

    const trackedShopsCount = await prisma.shopWatch.count({
      where: { organizationId, isActive: true },
    });

    const trackedListingsCount = await prisma.listingWatch.count({
      where: { organizationId, isActive: true },
    });

    const maxTrackedShops = orgPkg.maxTrackedShops;
    const maxTrackedListings = orgPkg.maxTrackedShops * 4; // e.g. 20, 120, 600

    const quota: TrackingQuotaInfo = {
      trackedShopsCount,
      maxTrackedShops,
      trackedListingsCount,
      maxTrackedListings,
      isShopsQuotaReached: trackedShopsCount >= maxTrackedShops,
      isListingsQuotaReached: trackedListingsCount >= maxTrackedListings,
      planName: orgPkg.name || "Free",
      maxTrackingDays: orgPkg.maxTrackingDays,
    };

    return NextResponse.json({ success: true, quota });
  } catch (err: any) {
    console.error("[TRACKING_QUOTA_GET_ERROR]", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch tracking quota" },
      { status: 500 }
    );
  }
}
