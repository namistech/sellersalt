import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { OpportunityDiscoveryEngine } from "@/services/intelligence/opportunity-discovery-engine";

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
    const decodedId = decodeURIComponent(id);
    const parts = decodedId.split(":");
    const query = parts.length > 2 ? parts[2] : decodedId;
    const marketplace = parts.length > 1 ? (parts[1] as any) : "etsy";

    const discoveryRes = await OpportunityDiscoveryEngine.discover({
      query,
      marketplace,
      limit: 10,
      organizationId: session.user.organizationId,
      useCache: false,
    });

    const refreshed = discoveryRes.opportunities.find((o) => o.id === decodedId || o.targetId === id) || discoveryRes.opportunities[0];

    if (refreshed) {
      // If it was in the saved table, update its metrics
      await prisma.savedOpportunity.updateMany({
        where: {
          organizationId: session.user.organizationId,
          OR: [{ id }, { targetId: refreshed.targetId }],
        },
        data: {
          score: refreshed.score,
          confidence: refreshed.confidence,
          verdict: refreshed.verdict,
          verdictVariant: refreshed.verdictVariant,
          evidenceJson: refreshed.evidence as any,
          lastObservedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true, opportunity: refreshed });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to refresh opportunity" },
      { status: 500 }
    );
  }
}
