import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BetaMerchantService } from "@/services/beta/beta-merchant";
import { BetaFeedbackService } from "@/services/beta/beta-feedback";
import { DataQualityService } from "@/services/ops/data-quality";
import { FunnelDiagnosticsEngine } from "@/services/telemetry/funnel-diagnostics";
import { BetaLearningLoopEngine } from "@/services/telemetry/beta-learning-loop";
import { BetaExperimentManager } from "@/services/telemetry/beta-experiments";
import { MerchantJourneyTelemetry } from "@/services/telemetry/merchant-journey";
import { AppError, formatErrorResponse } from "@/lib/errors/app-error";
import { CorrelationManager } from "@/lib/observability/correlation";

export async function GET(req: NextRequest) {
  const correlationId = CorrelationManager.extractFromHeaders(req.headers);
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    return formatErrorResponse(
      new AppError({
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication required to access Beta Insight Center.",
        correlationId,
      })
    );
  }

  try {
    const [funnel, diagnostics, learningLoop, feedback, dataQuality, recentEvents] = await Promise.all([
      BetaMerchantService.getBetaFunnel(),
      FunnelDiagnosticsEngine.analyzeFunnel(),
      BetaLearningLoopEngine.evaluateLearningLoop(),
      BetaFeedbackService.getFeedbackAnalytics(),
      DataQualityService.generateReport(),
      MerchantJourneyTelemetry.getEvents(undefined, 20),
    ]);

    const experiments = BetaExperimentManager.listExperiments();

    return NextResponse.json({
      correlationId,
      timestamp: new Date().toISOString(),
      funnel,
      diagnostics,
      learningLoop,
      feedback,
      dataQuality,
      experiments,
      recentEvents,
    });
  } catch (error: any) {
    return formatErrorResponse(error, "INTERNAL_ERROR", correlationId);
  }
}
