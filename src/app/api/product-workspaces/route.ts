import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ProductOpportunityWorkspaceEngine } from "@/services/intelligence/product-opportunity-workspace-engine";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const workspaces = await ProductOpportunityWorkspaceEngine.listWorkspaces(
      session.user.organizationId
    );
    return NextResponse.json({ workspaces });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to list workspaces" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { query, title, marketplaces, category, niche, userEconomics, products } = body;

    if (!query && !title) {
      return NextResponse.json({ error: "Query or title is required" }, { status: 400 });
    }

    const workspace = await ProductOpportunityWorkspaceEngine.createOrRefreshWorkspace({
      organizationId: session.user.organizationId,
      query: query || title,
      title: title || query,
      marketplaces,
      category,
      niche,
      userEconomics,
      products,
    });

    return NextResponse.json({ workspace });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create workspace" },
      { status: 500 }
    );
  }
}
