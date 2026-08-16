import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateOriginalListingDraft } from "@/services/listing-generation";
import { ListingDraftStatus, PlannerItemStatus } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const organizationId = (session?.user as any)?.organizationId as string | undefined;

    if (!organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    let {
      plannerItemId,
      conceptTitle,
      targetCategory,
      taxonomyId,
      targetPrice,
      targetKeywords,
      productFacts,
      materials,
      notes,
      sourceTitle,
      sourceDescription,
      sourceTags,
    } = body;

    // If a plannerItemId is supplied, unfreeze context and verify tenant ownership
    if (plannerItemId) {
      const plannerItem = await prisma.plannerItem.findFirst({
        where: {
          id: plannerItemId,
          organizationId,
        },
      });

      if (!plannerItem) {
        return NextResponse.json({ error: "Planner item not found." }, { status: 404 });
      }

      conceptTitle = conceptTitle || plannerItem.title;
      targetCategory = targetCategory || plannerItem.targetCategory;
      targetPrice = targetPrice ?? (plannerItem.targetPrice ? Number(plannerItem.targetPrice) : undefined);
      targetKeywords = targetKeywords && targetKeywords.length > 0 ? targetKeywords : plannerItem.targetKeywords;
      notes = notes || plannerItem.notes;
      sourceTitle = sourceTitle || plannerItem.sourceListingTitle;

      const snap = plannerItem.researchSnapshot as Record<string, any> | null;
      if (snap) {
        if (Array.isArray(snap.extractedTags) && (!sourceTags || sourceTags.length === 0)) {
          sourceTags = snap.extractedTags;
        }
      }
    }

    if (!conceptTitle || typeof conceptTitle !== "string" || !conceptTitle.trim()) {
      return NextResponse.json({ error: "Concept title is required for listing generation." }, { status: 400 });
    }

    // Generate listing draft with AI routing, originality gate, and SEO audit
    const result = await generateOriginalListingDraft({
      conceptTitle: conceptTitle.trim(),
      targetCategory,
      taxonomyId: taxonomyId ? Number(taxonomyId) : undefined,
      targetPrice: targetPrice ? Number(targetPrice) : undefined,
      targetKeywords: Array.isArray(targetKeywords) ? targetKeywords : [],
      productFacts,
      materials: Array.isArray(materials) ? materials : [],
      notes,
      sourceTitle,
      sourceDescription,
      sourceTags: Array.isArray(sourceTags) ? sourceTags : [],
    });

    // Persist ListingDraft in database
    const draft = await prisma.listingDraft.create({
      data: {
        organizationId,
        plannerItemId: plannerItemId || null,
        title: result.payload.title,
        description: result.payload.description,
        tags: result.payload.tags,
        materials: result.payload.materials,
        taxonomyId: result.payload.taxonomyId || null,
        price: result.payload.price,
        quantity: result.payload.quantity,
        whoMade: result.payload.whoMade,
        whenMade: result.payload.whenMade,
        isSupply: result.payload.isSupply,
        isCustomizable: result.payload.isCustomizable,
        state: result.payload.state,

        aiModelUsed: `${result.generationMetadata.provider}/${result.generationMetadata.modelId}`,
        generationMetadata: result.generationMetadata as any,
        originalityScore: result.originality.originalityScore,
        originalityStatus: result.originality.status,
        maxCommonSubstring: result.originality.maxCommonSubstringLength,
        seoScore: result.seoAudit.overallScore,
        status: ListingDraftStatus.GENERATED,
      },
    });

    // Persist linked ListingSeoAudit record
    await prisma.listingSeoAudit.create({
      data: {
        organizationId,
        listingDraftId: draft.id,
        plannerItemId: plannerItemId || null,
        overallScore: result.seoAudit.overallScore,
        titleScore: result.seoAudit.breakdown.titleScore,
        tagScore: result.seoAudit.breakdown.tagScore,
        keywordSynergyScore: result.seoAudit.breakdown.keywordSynergyScore,
        descriptionScore: result.seoAudit.breakdown.descriptionScore,
        taxonomyScore: result.seoAudit.breakdown.taxonomyScore,
        attributeScore: result.seoAudit.breakdown.attributeScore,
        titleCharCount: result.seoAudit.titleAnalysis.characterCount,
        tagCount: result.seoAudit.tagAnalysis.tagCount,
        tagsOver20Chars: result.seoAudit.tagAnalysis.tags.filter((t) => !t.isCompliant).map((t) => t.tag),
        duplicateTags: [],
        singleWordTags: result.seoAudit.tagAnalysis.tags.filter((t) => t.wordCount === 1).map((t) => t.tag),
        diagnostics: result.seoAudit.diagnostics as any,
        recommendations: result.seoAudit.recommendations as any,
      },
    });

    // Update PlannerItem status if linked
    if (plannerItemId) {
      await prisma.plannerItem.update({
        where: { id: plannerItemId },
        data: { status: PlannerItemStatus.DRAFT_CREATED },
      });
    }

    return NextResponse.json({
      draft,
      originality: result.originality,
      seoAudit: result.seoAudit,
      generationMetadata: result.generationMetadata,
    });
  } catch (error: any) {
    console.error("[GenerateListingDraftError]", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate listing draft" },
      { status: 500 }
    );
  }
}
