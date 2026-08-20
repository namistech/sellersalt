import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { MarketGraphEngine } from "@/services/intelligence/market-graph-engine";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const rootId = searchParams.get("rootId");
  const depth = parseInt(searchParams.get("depth") || "2", 10);

  if (!rootId) {
    return NextResponse.json({
      nodeCount: MarketGraphEngine.getNodeCount(),
      edgeCount: MarketGraphEngine.getEdgeCount(),
    });
  }

  try {
    const subgraph = MarketGraphEngine.extractSubgraph(rootId, Math.min(4, Math.max(1, depth)));
    return NextResponse.json(subgraph);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to extract subgraph" },
      { status: 500 }
    );
  }
}
