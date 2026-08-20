import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DiscoveryHistoryService } from "@/services/intelligence/discovery-history";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const runs = await DiscoveryHistoryService.listRuns(session.user.organizationId);
    return NextResponse.json({ runs });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to list discovery runs" },
      { status: 500 }
    );
  }
}
