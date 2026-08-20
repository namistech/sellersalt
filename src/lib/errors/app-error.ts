/**
 * SellerSalt Canonical Application Error Taxonomy & Safe Serializer
 * 
 * Provides unified, structured, and safe error representations across
 * API routes, intelligence services, background workers, and UI boundaries.
 * 
 * Invariant: Never exposes internal stack traces, DB connection strings,
 * provider secrets, or PII to external clients.
 */

import { NextResponse } from "next/server";

export type AppErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "AUTHORIZATION_DENIED"
  | "TENANT_ACCESS_DENIED"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "QUOTA_EXCEEDED"
  | "BILLING_REQUIRED"
  | "SUBSCRIPTION_INACTIVE"
  | "POLICY_RESTRICTED"
  | "SOURCE_UNAVAILABLE"
  | "ACCESS_RESTRICTED"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "UPSTREAM_ERROR"
  | "DATABASE_ERROR"
  | "QUEUE_ERROR"
  | "AI_PROVIDER_ERROR"
  | "INTERNAL_ERROR";

export type ErrorSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AppErrorOptions {
  code: AppErrorCode;
  message: string;
  diagnostic?: string;
  statusCode?: number;
  severity?: ErrorSeverity;
  isRetryable?: boolean;
  correlationId?: string;
  cause?: unknown;
}

export class AppError extends Error {
  public readonly code: AppErrorCode;
  public readonly diagnostic?: string;
  public readonly statusCode: number;
  public readonly severity: ErrorSeverity;
  public readonly isRetryable: boolean;
  public readonly correlationId?: string;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = "AppError";
    this.code = options.code;
    this.diagnostic = options.diagnostic;
    this.statusCode = options.statusCode || AppError.getDefaultStatusCode(options.code);
    this.severity = options.severity || AppError.getDefaultSeverity(options.code);
    this.isRetryable = options.isRetryable ?? AppError.getDefaultRetryability(options.code);
    this.correlationId = options.correlationId;

    if (options.cause && options.cause instanceof Error) {
      this.stack = `${this.stack}\nCaused by: ${options.cause.stack}`;
    }
  }

  public static getDefaultStatusCode(code: AppErrorCode): number {
    switch (code) {
      case "AUTHENTICATION_REQUIRED":
        return 401;
      case "BILLING_REQUIRED":
        return 402;
      case "AUTHORIZATION_DENIED":
      case "TENANT_ACCESS_DENIED":
      case "SUBSCRIPTION_INACTIVE":
      case "POLICY_RESTRICTED":
      case "ACCESS_RESTRICTED":
        return 403;
      case "NOT_FOUND":
        return 404;
      case "VALIDATION_ERROR":
        return 400;
      case "RATE_LIMITED":
      case "QUOTA_EXCEEDED":
        return 429;
      case "TIMEOUT":
        return 504;
      case "UPSTREAM_ERROR":
      case "AI_PROVIDER_ERROR":
        return 502;
      case "SOURCE_UNAVAILABLE":
        return 503;
      case "DATABASE_ERROR":
      case "QUEUE_ERROR":
      case "INTERNAL_ERROR":
      default:
        return 500;
    }
  }

  public static getDefaultSeverity(code: AppErrorCode): ErrorSeverity {
    switch (code) {
      case "DATABASE_ERROR":
      case "QUEUE_ERROR":
        return "CRITICAL";
      case "UPSTREAM_ERROR":
      case "TIMEOUT":
      case "AI_PROVIDER_ERROR":
      case "INTERNAL_ERROR":
        return "HIGH";
      case "QUOTA_EXCEEDED":
      case "RATE_LIMITED":
      case "POLICY_RESTRICTED":
      case "SOURCE_UNAVAILABLE":
      case "ACCESS_RESTRICTED":
        return "MEDIUM";
      default:
        return "LOW";
    }
  }

  public static getDefaultRetryability(code: AppErrorCode): boolean {
    switch (code) {
      case "RATE_LIMITED":
      case "TIMEOUT":
      case "UPSTREAM_ERROR":
      case "SOURCE_UNAVAILABLE":
      case "DATABASE_ERROR":
        return true;
      default:
        return false;
    }
  }

  /**
   * Serializes the error into a safe client payload.
   */
  public toSafeJSON(): {
    error: {
      code: AppErrorCode;
      message: string;
      correlationId?: string;
      isRetryable: boolean;
    };
  } {
    return {
      error: {
        code: this.code,
        message: this.message,
        correlationId: this.correlationId,
        isRetryable: this.isRetryable,
      },
    };
  }
}

/**
 * Normalizes any caught error into a safe JSON NextResponse.
 */
export function formatErrorResponse(
  error: unknown,
  fallbackCode: AppErrorCode = "INTERNAL_ERROR",
  correlationId?: string
): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      error.toSafeJSON(),
      { status: error.statusCode }
    );
  }

  const rawMessage = error instanceof Error ? error.message : "An unexpected operational error occurred.";
  const appError = new AppError({
    code: fallbackCode,
    message: rawMessage,
    correlationId,
  });

  return NextResponse.json(
    appError.toSafeJSON(),
    { status: appError.statusCode }
  );
}
