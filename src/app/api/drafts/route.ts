import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const organizationId = (session?.user as any)?.organizationId;

    if (!organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const drafts = await prisma.listingDraft.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        plannerItem: {
          select: {
            id: true,
            title: true,
            sourceListingTitle: true,
            sourceListingUrl: true,
            sourceShopName: true,
            targetCategory: true,
            targetKeywords: true,
            researchSnapshot: true,
          },
        },
        sellerChannel: {
          select: {
            id: true,
            platform: true,
            label: true,
            storeUrl: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      drafts,
      count: drafts.length,
    });
  } catch (err: any) {
    console.error("[DraftsListError]", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch drafts." },
      { status: 500 }
    );
  }
}
