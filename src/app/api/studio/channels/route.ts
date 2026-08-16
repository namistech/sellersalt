import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const organizationId = session.user.organizationId;

    const channels = await prisma.sellerChannel.findMany({
      where: {
        organizationId,
        platform: "ETSY_SELLER",
        status: "ACTIVE",
      },
      select: {
        id: true,
        platform: true,
        label: true,
        storeUrl: true,
        status: true,
        lastSyncedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      channels,
    });
  } catch (err: any) {
    console.error("[STUDIO_CHANNELS_ERROR]", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch connected channels" },
      { status: 500 }
    );
  }
}
