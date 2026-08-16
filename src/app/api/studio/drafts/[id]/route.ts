import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { auditListingSeo } from "@/services/seo-engine";
import { ListingDraftStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    const organizationId = (session?.user as any)?.organizationId as string | undefined;

    if (!organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const draft = await prisma.listingDraft.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        plannerItem: true,
        seoAudits: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!draft) {
      return NextResponse.json({ error: "Listing draft not found." }, { status: 404 });
    }

    return NextResponse.json({ draft });
  } catch (error: any) {
    console.error("[GetListingDraftDetailError]", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch listing draft detail" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    const organizationId = (session?.user as any)?.organizationId as string | undefined;

    if (!organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.listingDraft.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        plannerItem: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Listing draft not found." }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const updateData: any = {};

    if (typeof body.title === "string" && body.title.trim()) {
      updateData.title = body.title.trim().slice(0, 140);
    }
    if (typeof body.description === "string") {
      updateData.description = body.description;
    }
    if (Array.isArray(body.tags)) {
      updateData.tags = body.tags.map(String).map((t: string) => t.slice(0, 20).toLowerCase());
    }
    if (Array.isArray(body.materials)) {
      updateData.materials = body.materials.map(String);
    }
    if (typeof body.price === "number") {
      updateData.price = body.price;
    }
    if (typeof body.quantity === "number") {
      updateData.quantity = body.quantity;
    }
    if (body.taxonomyId !== undefined) {
      updateData.taxonomyId = typeof body.taxonomyId === "number" ? body.taxonomyId : null;
    }
    if (body.status && Object.values(ListingDraftStatus).includes(body.status)) {
      updateData.status = body.status;
    } else {
      // If user edited fields, mark status as EDITED_BY_USER if previously GENERATED
      if (existing.status === ListingDraftStatus.GENERATED) {
        updateData.status = ListingDraftStatus.EDITED_BY_USER;
      }
    }

    // Re-evaluate SEO Audit on updated content
    const evaluatedTitle = updateData.title || existing.title;
    const evaluatedTags = updateData.tags || existing.tags;
    const evaluatedDescription = updateData.description !== undefined ? updateData.description : existing.description;
    const evaluatedMaterials = updateData.materials || existing.materials;

    const seoAudit = auditListingSeo({
      title: evaluatedTitle,
      tags: evaluatedTags,
      description: evaluatedDescription,
      materials: evaluatedMaterials,
    });

    updateData.seoScore = seoAudit.overallScore;

    const draft = await prisma.listingDraft.update({
      where: { id },
      data: updateData,
      include: {
        plannerItem: true,
        seoAudits: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    return NextResponse.json({ draft, seoAudit });
  } catch (error: any) {
    console.error("[UpdateListingDraftError]", error);
    return NextResponse.json(
      { error: error.message || "Failed to update listing draft" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    const organizationId = (session?.user as any)?.organizationId as string | undefined;

    if (!organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.listingDraft.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Listing draft not found." }, { status: 404 });
    }

    await prisma.listingDraft.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Listing draft deleted." });
  } catch (error: any) {
    console.error("[DeleteListingDraftError]", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete listing draft" },
      { status: 500 }
    );
  }
}
