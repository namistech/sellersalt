import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateListingContent } from "@/services/listing-assistant";
import { buildOpportunityPackage } from "@/services/listing-strategy";
import { createEtsyListingDraft } from "@/services/etsy-draft-creation";
import { logIntelligenceEvent } from "@/services/intelligence/events";

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
    const estimatedCogs = body.estimatedCogs || item.estimatedCogs || 8.0;

    const researchSnapshot = (item.researchSnapshot as any) || {};

    // 1. Build Opportunity Package & Listing Strategy
    const opportunityPackage = buildOpportunityPackage({
      productTitle: item.title,
      price: targetPrice,
      estimatedCogs,
      category,
      shopName: item.sourceShopName || undefined,
      shopTotalSales: researchSnapshot.totalSales,
      shopReviewCount: researchSnapshot.reviewCount,
      estDailySales: researchSnapshot.estDailySales,
      opportunityScore: researchSnapshot.opportunityScore,
      primaryKeyword,
      secondaryKeywords,
    });

    // 2. Generate compliant listing content
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

    // 3. Log intelligence event
    await logIntelligenceEvent({
      organizationId,
      userId,
      eventType: "LISTING_STRATEGY_GENERATED",
      entityId: plannerItemId,
      entityType: "PLANNER_ITEM",
      metadata: { primaryKeyword, targetPrice },
    });

    // 4. Create Draft if requested
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

      await logIntelligenceEvent({
        organizationId,
        userId,
        eventType: "ETSY_DRAFT_CREATED",
        entityId: draftResult.localDraftId,
        entityType: "DRAFT",
        metadata: { plannerItemId },
      });
    }

    return NextResponse.json({
      success: true,
      opportunityPackage,
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
