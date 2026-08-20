import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { OpportunityDiscoveryEngine } from "@/services/intelligence/opportunity-discovery-engine";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // 1. Check if saved in DB
    const saved = await prisma.savedOpportunity.findFirst({
      where: {
        organizationId: session.user.organizationId,
        OR: [{ id }, { targetId: id }],
      },
    });

    if (saved) {
      return NextResponse.json({ opportunity: saved, isSaved: true });
    }

    // 2. Discover / reconstruct from live discovery
    const decodedId = decodeURIComponent(id);
    const parts = decodedId.split(":");
    const query = parts.length > 2 ? parts[2] : decodedId;
    const marketplace = parts.length > 1 ? (parts[1] as any) : "etsy";

    const discoveryRes = await OpportunityDiscoveryEngine.discover({
      query,
      marketplace,
      limit: 10,
      organizationId: session.user.organizationId,
    });

    const match = discoveryRes.opportunities.find((o) => o.id === decodedId || o.targetId === id || o.targetId === query) || discoveryRes.opportunities[0];

    if (!match) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    return NextResponse.json({ opportunity: match, isSaved: false });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch opportunity detail" },
      { status: 500 }
    );
  }
}
