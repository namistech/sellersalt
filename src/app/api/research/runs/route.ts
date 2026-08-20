import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrganizationResearchRuns, type ResearchRunType } from "@/marketplaces/core/acquisition/workbench";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;

  if (!organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as ResearchRunType | null;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 20;

    const runs = await getOrganizationResearchRuns(organizationId, type || undefined, limit);
    return NextResponse.json({ runs });
  } catch (error: any) {
    console.error("[GetResearchRunsError]", error);
    return NextResponse.json({ error: error.message || "Failed to list research runs" }, { status: 500 });
  }
}
