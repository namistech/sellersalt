import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createEngagementRequest, listEngagementsForOrg } from "@/services/tenancy";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const orgId = (session?.user as any)?.organizationId;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetOrgId = searchParams.get("organizationId") || orgId;

    const engagements = await listEngagementsForOrg(targetOrgId, userId);
    return NextResponse.json(engagements);
  } catch (error: any) {
    const status = error.statusCode || (error.code === "TENANT_ACCESS_DENIED" ? 403 : 500);
    return NextResponse.json({ error: error.message || "Failed to list engagements." }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const orgId = (session?.user as any)?.organizationId;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const engagement = await createEngagementRequest({
      grantorOrgId: body.grantorOrgId || orgId,
      granteeOrgId: body.granteeOrgId || null,
      granteeUserId: body.granteeUserId || null,
      scope: Array.isArray(body.scope) ? body.scope : ["DEFAULT"],
      contractTerms: body.contractTerms || null,
      startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
      requesterUserId: userId,
    });

    return NextResponse.json({ success: true, engagement }, { status: 201 });
  } catch (error: any) {
    const status = error.statusCode || (error.code === "TENANT_ACCESS_DENIED" ? 403 : 400);
    return NextResponse.json({ error: error.message || "Failed to create engagement request." }, { status });
  }
}
