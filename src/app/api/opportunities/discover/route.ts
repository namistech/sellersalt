import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { OpportunityDiscoveryEngine } from "@/services/intelligence/opportunity-discovery-engine";
import type { OpportunityDiscoveryRequest } from "@/marketplaces/core/discovery-types";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as OpportunityDiscoveryRequest;
    const requestWithOrg: OpportunityDiscoveryRequest = {
      ...body,
      organizationId: session.user.organizationId,
    };

    const discoveryRes = await OpportunityDiscoveryEngine.discover(requestWithOrg);
    return NextResponse.json(discoveryRes);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to execute opportunity discovery" },
      { status: 500 }
    );
  }
}
