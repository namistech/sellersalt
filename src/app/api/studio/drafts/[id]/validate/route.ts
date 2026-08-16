import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { evaluateListingOriginality } from "@/services/originality-engine";
import { auditListingSeo } from "@/services/seo-engine";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: RouteParams) {
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
      },
    });

    if (!draft) {
      return NextResponse.json({ error: "Listing draft not found." }, { status: 404 });
    }

    // Run originality evaluation
    const originality = evaluateListingOriginality({
      draftTitle: draft.title,
      draftDescription: draft.description,
      draftTags: draft.tags,
      sourceTitle: draft.plannerItem?.sourceListingTitle || undefined,
    });

    // Run SEO audit
    const seoAudit = auditListingSeo({
      title: draft.title,
      tags: draft.tags,
      description: draft.description,
      materials: draft.materials,
      categoryPath: draft.plannerItem?.targetCategory || undefined,
    });

    // Update draft with verified scores
    const updated = await prisma.listingDraft.update({
      where: { id },
      data: {
        originalityScore: originality.originalityScore,
        originalityStatus: originality.status,
        maxCommonSubstring: originality.maxCommonSubstringLength,
        seoScore: seoAudit.overallScore,
      },
    });

    return NextResponse.json({
      draft: updated,
      originality,
      seoAudit,
    });
  } catch (error: any) {
    console.error("[ValidateListingDraftError]", error);
    return NextResponse.json(
      { error: error.message || "Failed to validate listing draft" },
      { status: 500 }
    );
  }
}
