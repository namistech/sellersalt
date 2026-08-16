import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ listingExternalId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const organizationId = session.user.organizationId;
    const { listingExternalId } = await params;

    const watch = await prisma.listingWatch.findUnique({
      where: {
        organizationId_listingExternalId: {
          organizationId,
          listingExternalId,
        },
      },
    });

    if (!watch) {
      return NextResponse.json({ error: "Tracked listing not found" }, { status: 404 });
    }

    await prisma.listingWatch.update({
      where: { id: watch.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, message: "Listing tracking stopped." });
  } catch (err: any) {
    console.error("[TRACKING_LISTING_DELETE_ERROR]", err);
    return NextResponse.json(
      { error: err.message || "Failed to stop tracking listing" },
      { status: 500 }
    );
  }
}
