import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateListingContent } from "@/services/listing-assistant";
import { createEtsyListingDraft } from "@/services/etsy-draft-creation";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const organizationId = (session?.user as any)?.organizationId;
    const userId = (session?.user as any)?.id;

    if (!organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const plannerItemId = params.id;
    const item = await prisma.plannerItem.findFirst({
      where: { id: plannerItemId, organizationId },
    });

    if (!item) {
      return NextResponse.json({ error: "Planner item not found." }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const primaryKeyword = body.primaryKeyword || item.targetKeywords[0] || item.title;
    const secondaryKeywords = body.secondaryKeywords || item.targetKeywords.slice(1);
    const category = body.category || item.targetCategory || "Handmade Goods";
    const targetPrice = body.targetPrice || item.targetPrice || 29.99;

    // Generate compliant listing content
    const content = generateListingContent({
      productTitle: item.title,
      primaryKeyword,
      secondaryKeywords,
      category,
      targetPrice,
      materials: body.materials,
      targetCustomer: body.targetCustomer,
      competitorTitles: item.sourceListingTitle ? [item.sourceListingTitle] : [],
    });

    // Create Draft if requested
    let draftResult = null;
    if (body.createDraft) {
      draftResult = await createEtsyListingDraft({
        organizationId,
        userId,
        plannerItemId,
        title: content.title,
        description: content.description,
        tags: content.tags.map((t) => t.tag),
        price: targetPrice,
      });
    }

    return NextResponse.json({
      success: true,
      content,
      draftResult,
    });
  } catch (err: any) {
    console.error("[PlannerDraftError]", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate listing draft." },
      { status: 500 }
    );
  }
}
