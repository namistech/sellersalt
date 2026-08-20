import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { OperationalDiagnosticsService } from "@/services/admin/operational-diagnostics";
import { AppError, formatErrorResponse } from "@/lib/errors/app-error";
import { CorrelationManager } from "@/lib/observability/correlation";

export async function GET(req: NextRequest) {
  const correlationId = CorrelationManager.extractFromHeaders(req.headers);
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    return formatErrorResponse(
      new AppError({
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication required to access operational diagnostics.",
        correlationId,
      })
    );
  }

  const { searchParams } = new URL(req.url);
  const recoverStale = searchParams.get("recoverStale") === "true";

  try {
    const health = await OperationalDiagnosticsService.getSystemHealthOverview();
    const recentLogs = OperationalDiagnosticsService.getRecentLogs(30);

    let recoveryReport;
    if (recoverStale) {
      recoveryReport = await OperationalDiagnosticsService.recoverStaleResearchRuns(10);
    }

    return NextResponse.json({
      correlationId,
      health,
      recoveryReport,
      recentLogs,
    });
  } catch (error: any) {
    return formatErrorResponse(error, "INTERNAL_ERROR", correlationId);
  }
}
