import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { OpportunityWatchEngine } from "@/services/intelligence/opportunity-watch-engine";
import { assertTenantAccess } from "@/services/tenancy";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const orgId = session?.user?.organizationId;

  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await assertTenantAccess(userId, orgId, "WATCHLIST_READ");
    const watchlist = await OpportunityWatchEngine.getWatchlist(orgId);
    return NextResponse.json({ watchlist });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json(
      { error: error.message || "Failed to fetch watchlist" },
      { status }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const orgId = session?.user?.organizationId;

  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await assertTenantAccess(userId, orgId, "WATCHLIST_WRITE");
    const body = await req.json();
    const { opportunity, alertConditions } = body;

    if (!opportunity) {
      return NextResponse.json({ error: "Opportunity data required" }, { status: 400 });
    }

    const item = await OpportunityWatchEngine.addToWatchlist({
      organizationId: orgId,
      opportunity,
      alertConditions,
    });

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to add item to watchlist" },
      { status: 500 }
    );
  }
}
