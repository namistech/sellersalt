import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BetaFeedbackService, BetaFeedbackSubmission } from "@/services/beta/beta-feedback";
import { AppError, formatErrorResponse } from "@/lib/errors/app-error";
import { CorrelationManager } from "@/lib/observability/correlation";

export async function POST(req: NextRequest) {
  const correlationId = CorrelationManager.extractFromHeaders(req.headers);
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    return formatErrorResponse(
      new AppError({
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication required to submit beta feedback.",
        correlationId,
      })
    );
  }

  try {
    const body = await req.json();
    if (!body.rating || !body.impactCategory) {
      return formatErrorResponse(
        new AppError({
          code: "VALIDATION_ERROR",
          message: "Rating (1-5) and impactCategory are required.",
          correlationId,
        })
      );
    }

    const payload: BetaFeedbackSubmission = {
      organizationId: session.user.organizationId,
      userEmail: session.user.email || undefined,
      rating: Number(body.rating),
      impactCategory: body.impactCategory,
      featureArea: body.featureArea,
      comment: body.comment,
      queryOrContext: body.queryOrContext,
    };

    const record = await BetaFeedbackService.recordFeedback(payload);

    return NextResponse.json({
      success: true,
      correlationId,
      feedbackId: record.id,
      recordedAt: record.createdAt,
    });
  } catch (error: any) {
    return formatErrorResponse(error, "INTERNAL_ERROR", correlationId);
  }
}

export async function GET(req: NextRequest) {
  const correlationId = CorrelationManager.extractFromHeaders(req.headers);
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    return formatErrorResponse(
      new AppError({
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication required to retrieve feedback.",
        correlationId,
      })
    );
  }

  try {
    const feedback = BetaFeedbackService.getFeedback(session.user.organizationId);
    return NextResponse.json({
      correlationId,
      feedback,
    });
  } catch (error: any) {
    return formatErrorResponse(error, "INTERNAL_ERROR", correlationId);
  }
}
