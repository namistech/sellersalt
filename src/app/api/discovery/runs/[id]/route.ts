import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DiscoveryHistoryService } from "@/services/intelligence/discovery-history";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const details = await DiscoveryHistoryService.getRunDetails(session.user.organizationId, id);
    if (!details) {
      return NextResponse.json({ error: "Discovery run not found" }, { status: 404 });
    }
    return NextResponse.json(details);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch discovery run" },
      { status: 500 }
    );
  }
}
