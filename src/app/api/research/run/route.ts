import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { executeResearchRun, type WorkbenchResearchRequest } from "@/marketplaces/core/acquisition/workbench";
import { checkQuota } from "@/services/plans/quota-enforcement";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;

  if (!organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const quota = await checkQuota(organizationId, "PRODUCT_RESEARCH");
  if (!quota.allowed) {
    return NextResponse.json({ error: quota.upgradeMessage }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const request: WorkbenchResearchRequest = {
      organizationId,
      type: body.type || "PRODUCT",
      query: typeof body.query === "string" ? body.query.trim() : "",
      marketplaces: Array.isArray(body.marketplaces) ? body.marketplaces : ["etsy"],
      preferredSources: Array.isArray(body.preferredSources) ? body.preferredSources : undefined,
      page: typeof body.page === "number" ? body.page : 1,
      limit: typeof body.limit === "number" ? body.limit : 25,
      minPrice: typeof body.minPrice === "number" ? body.minPrice : undefined,
      maxPrice: typeof body.maxPrice === "number" ? body.maxPrice : undefined,
      bypassCache: body.bypassCache === true,
    };

    const response = await executeResearchRun(request);
    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[ResearchWorkbenchRunError]", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to execute research run",
        status: "FAILED",
      },
      { status: 500 }
    );
  }
}
