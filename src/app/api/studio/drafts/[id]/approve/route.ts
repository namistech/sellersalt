import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ListingDraftStatus } from "@prisma/client";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const organizationId = session.user.organizationId;
    const { id } = await context.params;

    const existing = await prisma.listingDraft.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Listing draft not found" }, { status: 404 });
    }

    const updated = await prisma.listingDraft.update({
      where: { id },
      data: {
        status: ListingDraftStatus.APPROVED,
      },
      include: {
        plannerItem: true,
        seoAudits: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    return NextResponse.json({
      success: true,
      draft: updated,
      message: "Listing draft approved for Etsy write-back.",
    });
  } catch (err: any) {
    console.error("[STUDIO_APPROVE_ERROR]", err);
    return NextResponse.json(
      { error: err.message || "Failed to approve listing draft" },
      { status: 500 }
    );
  }
}
