import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PlannerItemType, PlannerItemStatus } from "@prisma/client";

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

    const item = await prisma.plannerItem.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        listingDrafts: true,
        seoAudits: true,
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Planner item not found." }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error: any) {
    console.error("[GetPlannerItemDetailError]", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch planner item detail" },
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

    const existing = await prisma.plannerItem.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Planner item not found." }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const updateData: any = {};

    if (typeof body.title === "string" && body.title.trim()) {
      updateData.title = body.title.trim().slice(0, 255);
    }

    if (body.status && Object.values(PlannerItemStatus).includes(body.status)) {
      updateData.status = body.status;
      if (body.status === PlannerItemStatus.COMPLETED && !existing.completedAt) {
        updateData.completedAt = new Date();
      } else if (body.status !== PlannerItemStatus.COMPLETED) {
        updateData.completedAt = null;
      }
    }

    if (body.type && Object.values(PlannerItemType).includes(body.type)) {
      updateData.type = body.type;
    }

    if (typeof body.priority === "number") {
      updateData.priority = body.priority;
    }

    if (typeof body.notes === "string" || body.notes === null) {
      updateData.notes = body.notes;
    }

    if (typeof body.targetCategory === "string" || body.targetCategory === null) {
      updateData.targetCategory = body.targetCategory;
    }

    if (typeof body.targetPrice === "number" || body.targetPrice === null) {
      updateData.targetPrice = body.targetPrice;
    }

    if (typeof body.estimatedCogs === "number" || body.estimatedCogs === null) {
      updateData.estimatedCogs = body.estimatedCogs;
    }

    if (Array.isArray(body.targetKeywords)) {
      updateData.targetKeywords = body.targetKeywords.map(String).filter(Boolean);
    }

    if (body.dueDate !== undefined) {
      updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    }

    const item = await prisma.plannerItem.update({
      where: { id },
      data: updateData,
      include: {
        listingDrafts: {
          select: {
            id: true,
            title: true,
            status: true,
            originalityScore: true,
            seoScore: true,
            createdAt: true,
          },
        },
        seoAudits: {
          select: {
            id: true,
            overallScore: true,
            titleScore: true,
            tagScore: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({ item });
  } catch (error: any) {
    console.error("[UpdatePlannerItemError]", error);
    return NextResponse.json(
      { error: error.message || "Failed to update planner item" },
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

    const existing = await prisma.plannerItem.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Planner item not found." }, { status: 404 });
    }

    await prisma.plannerItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Planner item deleted." });
  } catch (error: any) {
    console.error("[DeletePlannerItemError]", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete planner item" },
      { status: 500 }
    );
  }
}
