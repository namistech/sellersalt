import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PlannerItemType, PlannerItemStatus } from "@prisma/client";
import { checkQuota } from "@/services/plans/quota-enforcement";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const organizationId = (session?.user as any)?.organizationId as string | undefined;
    const userId = (session?.user as any)?.id as string | undefined;

    if (!organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "Title is required for a Planner item." }, { status: 400 });
    }

    const sourceListingUrl = typeof body.sourceListingUrl === "string" ? body.sourceListingUrl.trim() : null;
    const sourceId = typeof body.sourceId === "string" ? body.sourceId.trim() : null;

    // Idempotency: Check if this listing/source was already saved in this organization
    if (sourceListingUrl || sourceId) {
      const existing = await prisma.plannerItem.findFirst({
        where: {
          organizationId,
          OR: [
            ...(sourceListingUrl ? [{ sourceListingUrl }] : []),
            ...(sourceId ? [{ sourceId }] : []),
          ],
        },
      });

      if (existing) {
        return NextResponse.json({
          item: existing,
          isExisting: true,
          message: "Item is already in your Planner.",
        });
      }
    }

    // Only gate the actual creation path — the idempotent "already saved"
    // return above never creates a new row, so it must never be blocked by
    // quota.
    const quota = await checkQuota(organizationId, "PLANNER_ITEM");
    if (!quota.allowed) {
      return NextResponse.json({ error: quota.upgradeMessage }, { status: 403 });
    }

    const validTypes = Object.values(PlannerItemType);
    const type: PlannerItemType = validTypes.includes(body.type)
      ? body.type
      : PlannerItemType.PRODUCT_RESEARCH;

    const validStatuses = Object.values(PlannerItemStatus);
    const status: PlannerItemStatus = validStatuses.includes(body.status)
      ? body.status
      : PlannerItemStatus.BACKLOG;

    const item = await prisma.plannerItem.create({
      data: {
        organizationId,
        userId: userId ?? null,
        type,
        status,
        title: body.title.trim().slice(0, 255),
        priority: typeof body.priority === "number" ? body.priority : 0,
        notes: typeof body.notes === "string" ? body.notes : null,

        // Provenance & Source Metadata
        sourceType: body.sourceType || "PRODUCT_RESEARCH",
        sourceId,
        sourceShopExternalId: body.sourceShopExternalId || null,
        sourceShopName: body.sourceShopName || null,
        sourceListingUrl,
        sourceListingTitle: body.sourceListingTitle || null,
        researchSnapshot: body.researchSnapshot ? (body.researchSnapshot as any) : undefined,

        // Strategic Target Fields
        targetCategory: body.targetCategory || null,
        targetPrice: typeof body.targetPrice === "number" ? body.targetPrice : null,
        estimatedCogs: typeof body.estimatedCogs === "number" ? body.estimatedCogs : null,
        targetKeywords: Array.isArray(body.targetKeywords) ? body.targetKeywords : [],
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
      },
    });

    return NextResponse.json({
      item,
      isExisting: false,
      message: "Successfully added to Planner.",
    });
  } catch (error: any) {
    console.error("[CreatePlannerItemError]", error);
    return NextResponse.json(
      { error: error.message || "Failed to create planner item" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const organizationId = (session?.user as any)?.organizationId as string | undefined;

    if (!organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const includeArchived = searchParams.get("includeArchived") === "true";

    const where: any = {
      organizationId,
    };

    if (status && status !== "ALL") {
      where.status = status;
    } else if (!includeArchived) {
      where.status = { not: PlannerItemStatus.ARCHIVED };
    }

    if (type && type !== "ALL") {
      where.type = type;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
        { sourceListingTitle: { contains: q, mode: "insensitive" } },
        { sourceShopName: { contains: q, mode: "insensitive" } },
        { targetCategory: { contains: q, mode: "insensitive" } },
      ];
    }

    const items = await prisma.plannerItem.findMany({
      where,
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
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 200,
    });

    // Summary counts for workspace badges
    const allItems = await prisma.plannerItem.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: { _all: true },
    });

    const statusCounts: Record<string, number> = {};
    for (const group of allItems) {
      statusCounts[group.status] = group._count._all;
    }

    return NextResponse.json({
      items,
      statusCounts,
      totalCount: items.length,
    });
  } catch (error: any) {
    console.error("[GetPlannerItemsError]", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch planner items" },
      { status: 500 }
    );
  }
}
