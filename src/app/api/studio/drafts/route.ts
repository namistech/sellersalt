import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ListingDraftStatus } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const organizationId = (session?.user as any)?.organizationId as string | undefined;

    if (!organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const plannerItemId = searchParams.get("plannerItemId");

    const where: any = { organizationId };
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (plannerItemId) {
      where.plannerItemId = plannerItemId;
    }

    const drafts = await prisma.listingDraft.findMany({
      where,
      include: {
        plannerItem: {
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
            targetPrice: true,
            targetCategory: true,
            targetKeywords: true,
            sourceListingTitle: true,
            sourceListingUrl: true,
            researchSnapshot: true,
          },
        },
        seoAudits: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ drafts });
  } catch (error: any) {
    console.error("[GetListingDraftsError]", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch listing drafts" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const organizationId = (session?.user as any)?.organizationId as string | undefined;

    if (!organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "Title is required for a listing draft." }, { status: 400 });
    }

    const draft = await prisma.listingDraft.create({
      data: {
        organizationId,
        plannerItemId: body.plannerItemId || null,
        title: body.title.trim().slice(0, 140),
        description: typeof body.description === "string" ? body.description : "",
        tags: Array.isArray(body.tags) ? body.tags : [],
        materials: Array.isArray(body.materials) ? body.materials : [],
        price: typeof body.price === "number" ? body.price : 25.0,
        quantity: typeof body.quantity === "number" ? body.quantity : 999,
        taxonomyId: typeof body.taxonomyId === "number" ? body.taxonomyId : null,
        status: ListingDraftStatus.DRAFT,
      },
    });

    return NextResponse.json({ draft });
  } catch (error: any) {
    console.error("[CreateListingDraftError]", error);
    return NextResponse.json(
      { error: error.message || "Failed to create listing draft" },
      { status: 500 }
    );
  }
}
