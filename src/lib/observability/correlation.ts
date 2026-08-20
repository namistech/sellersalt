/**
 * SellerSalt Correlation & Request Trace Context
 * 
 * Provides end-to-end distributed tracing identifiers across incoming HTTP requests,
 * intelligence engines, database operations, background jobs, and webhook lifecycles.
 */

export interface TraceContext {
  correlationId: string;
  requestId?: string;
  organizationId?: string;
  userId?: string;
  researchRunId?: string;
  validationId?: string;
  workspaceId?: string;
  service?: string;
  startTime: number;
}

export class CorrelationManager {
  public static readonly HEADER_NAME = "x-sellersalt-correlation-id";

  /**
   * Generates a unique, high-entropy correlation identifier.
   */
  public static generateId(prefix: string = "corr"): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Extracts or generates a correlation ID from request headers.
   */
  public static extractFromHeaders(headers: Headers | Record<string, string | string[] | undefined>): string {
    if (headers instanceof Headers) {
      const headerVal = headers.get(this.HEADER_NAME) || headers.get("x-request-id");
      if (headerVal && typeof headerVal === "string" && headerVal.trim().length > 0) {
        return headerVal.trim();
      }
    } else if (typeof headers === "object" && headers !== null) {
      const raw = headers[this.HEADER_NAME] || headers["x-request-id"];
      if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "string") {
        return raw[0].trim();
      }
      if (typeof raw === "string" && raw.trim().length > 0) {
        return raw.trim();
      }
    }
    return this.generateId("req");
  }

  /**
   * Creates a structured trace context object.
   */
  public static createContext(params?: Partial<TraceContext>): TraceContext {
    return {
      correlationId: params?.correlationId || this.generateId("trace"),
      requestId: params?.requestId,
      organizationId: params?.organizationId,
      userId: params?.userId,
      researchRunId: params?.researchRunId,
      validationId: params?.validationId,
      workspaceId: params?.workspaceId,
      service: params?.service || "sellersalt-core",
      startTime: params?.startTime || Date.now(),
    };
  }

  /**
   * Calculates execution duration in milliseconds.
   */
  public static getElapsedMs(context: TraceContext): number {
    return Date.now() - context.startTime;
  }
}
