import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { acceptEngagement, rejectEngagement, revokeEngagement } from "@/services/tenancy";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: engagementId } = await params;
    const body = await req.json();
    const action = body.action?.toUpperCase();

    let result;
    if (action === "ACCEPT") {
      result = await acceptEngagement(engagementId, userId);
    } else if (action === "REJECT") {
      result = await rejectEngagement(engagementId, userId);
    } else if (action === "REVOKE") {
      result = await revokeEngagement(engagementId, userId);
    } else {
      return NextResponse.json(
        { error: "Invalid action. Supported actions: ACCEPT, REJECT, REVOKE" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, engagement: result });
  } catch (error: any) {
    const status = error.statusCode || (error.code === "TENANT_ACCESS_DENIED" ? 403 : 400);
    return NextResponse.json({ error: error.message || "Failed to update engagement." }, { status });
  }
}
