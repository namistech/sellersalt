import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AppError, formatErrorResponse } from "@/lib/errors/app-error";
import { CorrelationManager } from "@/lib/observability/correlation";
import { StructuredLogger } from "@/lib/observability/structured-logger";
import { RateLimiter } from "@/lib/security/rate-limiter";
import { OperationalDiagnosticsService } from "@/services/admin/operational-diagnostics";
import { prisma } from "@/lib/db";

describe("Batch 29: Production Operations, Observability & Reliability", () => {
  describe("1. Canonical Application Error Taxonomy & Safe Serializer", () => {
    it("creates AppError with correct defaults and safe JSON serialization", () => {
      const error = new AppError({
        code: "RATE_LIMITED",
        message: "Marketplace rate limit encountered.",
        diagnostic: "Etsy returned HTTP 429 after 60 req/min.",
        correlationId: "corr_test_123",
      });

      assert.strictEqual(error.statusCode, 429);
      assert.strictEqual(error.severity, "MEDIUM");
      assert.strictEqual(error.isRetryable, true);

      const safeJSON = error.toSafeJSON();
      assert.strictEqual(safeJSON.error.code, "RATE_LIMITED");
      assert.strictEqual(safeJSON.error.message, "Marketplace rate limit encountered.");
      assert.strictEqual(safeJSON.error.correlationId, "corr_test_123");
      assert.strictEqual(safeJSON.error.isRetryable, true);
      assert.strictEqual((safeJSON.error as any).diagnostic, undefined, "Diagnostic details must not leak to client");
      assert.strictEqual((safeJSON.error as any).stack, undefined, "Stack trace must not leak to client");
    });

    it("formats generic error into safe AppError response", () => {
      const genericError = new Error("Database connection pool exhausted: postgresql://user:secret@db:5432/db");
      const res = formatErrorResponse(genericError, "DATABASE_ERROR", "corr_db_456");

      assert.strictEqual(res.status, 500);
    });
  });

  describe("2. Correlation & Distributed Trace ID System", () => {
    it("generates unique correlation IDs and extracts from headers", () => {
      const genId = CorrelationManager.generateId("trace");
      assert.ok(genId.startsWith("trace_"));

      const headers = new Headers();
      headers.set("x-sellersalt-correlation-id", "custom_corr_header_789");

      const extracted = CorrelationManager.extractFromHeaders(headers);
      assert.strictEqual(extracted, "custom_corr_header_789");
    });
  });

  describe("3. Structured Logger & Sensitive Data Redaction", () => {
    it("redacts sensitive fields (passwords, tokens, keys, card numbers) from log metadata", () => {
      const sensitivePayload = {
        userEmail: "merchant@example.com",
        password: "super-secret-password",
        stripeToken: "tok_1234567890",
        nested: {
          apiKey: "sk_live_abcdef123456",
          encryptedCredentials: "aes-256-gcm-encrypted",
          cardNumber: "4242424242424242",
        },
      };

      const redacted = StructuredLogger.redactSensitive(sensitivePayload);

      assert.strictEqual(redacted.userEmail, "merchant@example.com");
      assert.strictEqual(redacted.password, "[REDACTED]");
      assert.strictEqual(redacted.stripeToken, "[REDACTED]");
      assert.strictEqual(redacted.nested.apiKey, "[REDACTED]");
      assert.strictEqual(redacted.nested.encryptedCredentials, "[REDACTED]");
      assert.strictEqual(redacted.nested.cardNumber, "[REDACTED]");
    });
  });

  describe("4. Application Rate Limiting", () => {
    it("allows requests under threshold and blocks excess requests within window", () => {
      const testKey = `test_ip_${Date.now()}`;
      RateLimiter.clear();

      // Limit = 3 requests
      const r1 = RateLimiter.check(testKey, 3, 60);
      assert.strictEqual(r1.allowed, true);
      assert.strictEqual(r1.remaining, 2);

      const r2 = RateLimiter.check(testKey, 3, 60);
      assert.strictEqual(r2.allowed, true);
      assert.strictEqual(r2.remaining, 1);

      const r3 = RateLimiter.check(testKey, 3, 60);
      assert.strictEqual(r3.allowed, true);
      assert.strictEqual(r3.remaining, 0);

      // 4th request must be blocked
      const r4 = RateLimiter.check(testKey, 3, 60);
      assert.strictEqual(r4.allowed, false);
      assert.strictEqual(r4.remaining, 0);
      assert.ok(r4.resetSeconds > 0);
    });
  });

  describe("5. Operational Diagnostics & Stale Research Run Recovery", () => {
    it("retrieves system health overview with database latency", async () => {
      const health = await OperationalDiagnosticsService.getSystemHealthOverview();

      assert.ok(["HEALTHY", "DEGRADED"].includes(health.status));
      assert.ok(typeof health.uptimeSeconds === "number");
      assert.ok(typeof health.databaseLatencyMs === "number");
      assert.ok(health.counts.totalOrganizations >= 0);
    });

    it("recovers stale research runs gracefully to TIMED_OUT", async () => {
      const testOrg = await prisma.organization.findFirstOrThrow();

      // Create a stale research run with createdAt in past
      const staleRun = await prisma.researchRun.create({
        data: {
          organizationId: testOrg.id,
          type: "PRODUCT",
          query: "stale test query",
          status: "RUNNING",
          createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        },
      });

      const recoveryReport = await OperationalDiagnosticsService.recoverStaleResearchRuns(10);

      assert.ok(recoveryReport.recoveredCount >= 1);
      assert.ok(recoveryReport.recoveredRunIds.includes(staleRun.id));

      const updatedRun = await prisma.researchRun.findUniqueOrThrow({ where: { id: staleRun.id } });
      assert.strictEqual(updatedRun.status, "TIMED_OUT");
      assert.ok(updatedRun.error?.includes("timed out"));
    });
  });
});
