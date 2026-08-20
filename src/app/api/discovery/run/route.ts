import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AutonomousDiscoveryEngine } from "@/services/intelligence/autonomous-discovery-engine";
import type { AutonomousDiscoveryRequest } from "@/marketplaces/core/autonomous-discovery-types";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const discoveryRequest: AutonomousDiscoveryRequest = {
      ...body,
      organizationId: session.user.organizationId,
    };

    const result = await AutonomousDiscoveryEngine.execute(discoveryRequest);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to execute autonomous discovery" },
      { status: 500 }
    );
  }
}
