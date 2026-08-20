import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CrossMarketplaceGraphEngine } from "@/services/intelligence/cross-marketplace-graph";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const decodedId = decodeURIComponent(id);

  try {
    const evidence = CrossMarketplaceGraphEngine.getProductCrossMarketplaceEvidence(decodedId);
    if (!evidence) {
      return NextResponse.json(
        { error: "Entity not found or not a valid product node." },
        { status: 404 }
      );
    }
    return NextResponse.json(evidence);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch cross-marketplace evidence" },
      { status: 500 }
    );
  }
}
