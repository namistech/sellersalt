import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ProductOpportunityWorkspaceEngine } from "@/services/intelligence/product-opportunity-workspace-engine";

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
    const existing = await ProductOpportunityWorkspaceEngine.getWorkspace(
      session.user.organizationId,
      id
    );

    if (!existing) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const refreshed = await ProductOpportunityWorkspaceEngine.createOrRefreshWorkspace({
      organizationId: session.user.organizationId,
      query: existing.query,
      title: existing.title,
      marketplaces: existing.marketplaces,
      category: existing.category,
      niche: existing.niche,
      userEconomics: existing.economics.scenarios.base.inputs,
    });

    return NextResponse.json({ workspace: refreshed });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to refresh workspace" },
      { status: 500 }
    );
  }
}
