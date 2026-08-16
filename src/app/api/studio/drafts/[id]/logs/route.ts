import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDraftExecutionLogs } from "@/services/etsy-execution/execution-service";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const organizationId = session.user.organizationId;
    const { id } = await context.params;

    const logs = await getDraftExecutionLogs(organizationId, id);

    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (err: any) {
    console.error("[STUDIO_LOGS_ERROR]", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch execution logs" },
      { status: 500 }
    );
  }
}
