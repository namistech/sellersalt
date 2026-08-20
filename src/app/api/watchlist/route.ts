import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { OpportunityWatchEngine } from "@/services/intelligence/opportunity-watch-engine";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const watchlist = await OpportunityWatchEngine.getWatchlist(session.user.organizationId);
    return NextResponse.json({ watchlist });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch watchlist" },
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
    const { opportunity, alertConditions } = body;

    if (!opportunity) {
      return NextResponse.json({ error: "Opportunity data required" }, { status: 400 });
    }

    const item = await OpportunityWatchEngine.addToWatchlist({
      organizationId: session.user.organizationId,
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
