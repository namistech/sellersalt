import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
    const body = await req.json();
    const {
      type = "PRODUCT",
      targetId = id,
      title = "Saved Opportunity",
      subtitle,
      marketplace = "etsy",
      score,
      confidence = 80,
      verdict = "Saved Opportunity",
      verdictVariant = "info",
      evidence,
      provenance,
      notes,
      tags = [],
    } = body;

    const saved = await prisma.savedOpportunity.upsert({
      where: {
        organizationId_type_marketplace_targetId: {
          organizationId: session.user.organizationId,
          type,
          marketplace,
          targetId,
        },
      },
      update: {
        title,
        subtitle,
        score: typeof score === "number" ? score : null,
        confidence,
        verdict,
        verdictVariant,
        evidenceJson: evidence ? (evidence as any) : undefined,
        provenanceJson: provenance ? (provenance as any) : undefined,
        notes,
        tags,
        lastObservedAt: new Date(),
      },
      create: {
        organizationId: session.user.organizationId,
        type,
        targetId,
        title,
        subtitle,
        marketplace,
        score: typeof score === "number" ? score : null,
        confidence,
        verdict,
        verdictVariant,
        evidenceJson: evidence ? (evidence as any) : undefined,
        provenanceJson: provenance ? (provenance as any) : undefined,
        notes,
        tags,
        firstObservedAt: new Date(),
        lastObservedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, saved });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to save opportunity to watchlist" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Delete either by id or by targetId scoped to this organization
    await prisma.savedOpportunity.deleteMany({
      where: {
        organizationId: session.user.organizationId,
        OR: [{ id }, { targetId: id }],
      },
    });

    return NextResponse.json({ success: true, removedId: id });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to remove opportunity from watchlist" },
      { status: 500 }
    );
  }
}
