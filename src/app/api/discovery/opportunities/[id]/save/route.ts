import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { OpportunityWatchEngine } from "@/services/intelligence/opportunity-watch-engine";

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
    const body = await req.json();
    const opportunity = body.opportunity;

    if (!opportunity) {
      return NextResponse.json({ error: "Opportunity data required" }, { status: 400 });
    }

    const saved = await OpportunityWatchEngine.addToWatchlist({
      organizationId: session.user.organizationId,
      opportunity,
    });

    return NextResponse.json({ success: true, item: saved });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to save opportunity" },
      { status: 500 }
    );
  }
}
