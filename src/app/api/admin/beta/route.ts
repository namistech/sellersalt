import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BetaMerchantService } from "@/services/beta/beta-merchant";
import { BetaFeedbackService } from "@/services/beta/beta-feedback";
import { DataQualityService } from "@/services/ops/data-quality";
import { AppError, formatErrorResponse } from "@/lib/errors/app-error";
import { CorrelationManager } from "@/lib/observability/correlation";

export async function GET(req: NextRequest) {
  const correlationId = CorrelationManager.extractFromHeaders(req.headers);
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    return formatErrorResponse(
      new AppError({
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication required to access beta admin metrics.",
        correlationId,
      })
    );
  }

  try {
    const [funnel, feedbackAnalytics, dataQuality] = await Promise.all([
      BetaMerchantService.getBetaFunnel(),
      BetaFeedbackService.getFeedbackAnalytics(),
      DataQualityService.generateReport(),
    ]);

    return NextResponse.json({
      correlationId,
      timestamp: new Date().toISOString(),
      funnel,
      feedbackAnalytics,
      dataQuality,
    });
  } catch (error: any) {
    return formatErrorResponse(error, "INTERNAL_ERROR", correlationId);
  }
}
