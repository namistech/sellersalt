import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ProductValidationEngine } from "@/services/intelligence/product-validation-engine";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.productValidation.findFirst({
      where: {
        organizationId: session.user.organizationId,
        id,
      },
    });

    const query = existing?.query || decodeURIComponent(id);
    const marketplace = existing?.marketplace as any;
    const depth = (existing?.depth || "STANDARD") as any;

    const refreshed = await ProductValidationEngine.validateProduct({
      query,
      marketplace,
      depth,
      organizationId: session.user.organizationId,
    });

    if (existing) {
      await prisma.productValidation.update({
        where: { id: existing.id },
        data: {
          verdict: refreshed.verdict,
          recommendation: refreshed.recommendation,
          validationScore: refreshed.scoreBreakdown.score,
          confidence: refreshed.scoreBreakdown.confidence,
          demandAssessmentJson: refreshed.demand as any,
          competitionAssessmentJson: refreshed.competition as any,
          economicsAssessmentJson: refreshed.economics as any,
          momentumAssessmentJson: refreshed.momentum as any,
          differentiationAssessmentJson: refreshed.differentiation as any,
          lastObservedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true, validation: refreshed });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to refresh validation" },
      { status: 500 }
    );
  }
}
