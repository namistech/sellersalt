import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ProductResearchCommandCenter } from "@/services/intelligence/product-research-command-center";
import type { ProductResearchSessionRequest } from "@/marketplaces/core/research-command-types";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as ProductResearchSessionRequest;
    const requestWithOrg: ProductResearchSessionRequest = {
      ...body,
      organizationId: session.user.organizationId,
    };

    const result = await ProductResearchCommandCenter.executeSession(requestWithOrg);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to execute research session" },
      { status: 500 }
    );
  }
}
