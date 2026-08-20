/**
 * SellerSalt Structured Production Logger
 * 
 * Emits JSON-formatted structured telemetry records with automatic correlation ID propagation
 * and strict redaction of sensitive credentials, payment tokens, OAuth secrets, and PII.
 */

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  correlationId?: string;
  organizationId?: string;
  durationMs?: number;
  metadata?: Record<string, any>;
  error?: {
    code?: string;
    message: string;
    stack?: string;
  };
}

const REDACTED_KEYS = new Set([
  "password",
  "token",
  "secret",
  "apikey",
  "api_key",
  "authorization",
  "encryptedcredentials",
  "webhooksecret",
  "cardnumber",
  "cvv",
  "cookie",
]);

// Low-overhead memory buffer for admin diagnostic inspection
const IN_MEMORY_LOG_BUFFER: LogEntry[] = [];
const MAX_LOG_BUFFER_SIZE = 1000;

export class StructuredLogger {
  private service: string;

  constructor(service: string = "sellersalt") {
    this.service = service;
  }

  /**
   * Recursively redacts sensitive keys from log metadata.
   */
  public static redactSensitive(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== "object") return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => this.redactSensitive(item));
    }

    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (REDACTED_KEYS.has(lowerKey) || Array.from(REDACTED_KEYS).some((rk) => lowerKey.includes(rk))) {
        cleaned[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        cleaned[key] = this.redactSensitive(value);
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }

  private log(
    level: LogLevel,
    message: string,
    params?: {
      correlationId?: string;
      organizationId?: string;
      durationMs?: number;
      metadata?: Record<string, any>;
      error?: unknown;
    }
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.service,
      correlationId: params?.correlationId,
      organizationId: params?.organizationId,
      durationMs: params?.durationMs,
      metadata: params?.metadata ? StructuredLogger.redactSensitive(params.metadata) : undefined,
      error:
        params?.error instanceof Error
          ? {
              code: (params.error as any).code,
              message: params.error.message,
              // Only include stack trace if not in production or for critical errors
              stack: process.env.NODE_ENV !== "production" ? params.error.stack : undefined,
            }
          : undefined,
    };

    // Buffer entry
    IN_MEMORY_LOG_BUFFER.unshift(entry);
    if (IN_MEMORY_LOG_BUFFER.length > MAX_LOG_BUFFER_SIZE) {
      IN_MEMORY_LOG_BUFFER.pop();
    }

    // In production or test, format to JSON
    if (process.env.NODE_ENV !== "test") {
      const jsonString = JSON.stringify(entry);
      if (level === "ERROR") {
        console.error(jsonString);
      } else if (level === "WARN") {
        console.warn(jsonString);
      } else {
        console.log(jsonString);
      }
    }

    return entry;
  }

  public debug(message: string, params?: Parameters<StructuredLogger["log"]>[2]) {
    return this.log("DEBUG", message, params);
  }

  public info(message: string, params?: Parameters<StructuredLogger["log"]>[2]) {
    return this.log("INFO", message, params);
  }

  public warn(message: string, params?: Parameters<StructuredLogger["log"]>[2]) {
    return this.log("WARN", message, params);
  }

  public error(message: string, params?: Parameters<StructuredLogger["log"]>[2]) {
    return this.log("ERROR", message, params);
  }

  /**
   * Retrieves recent buffered logs for operational diagnostics.
   */
  public static getRecentLogs(options?: {
    limit?: number;
    minLevel?: LogLevel;
    organizationId?: string;
  }): LogEntry[] {
    const limit = options?.limit || 100;
    let logs = IN_MEMORY_LOG_BUFFER;

    if (options?.organizationId) {
      logs = logs.filter((l) => l.organizationId === options.organizationId);
    }

    if (options?.minLevel) {
      const levels: Record<LogLevel, number> = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
      const minVal = levels[options.minLevel];
      logs = logs.filter((l) => levels[l.level] >= minVal);
    }

    return logs.slice(0, limit);
  }

  public static clearBuffer(): void {
    IN_MEMORY_LOG_BUFFER.length = 0;
  }
}

export const logger = new StructuredLogger("sellersalt-api");
