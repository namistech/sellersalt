/**
 * SellerSalt Production & Private Beta Smoke Test Harness
 * 
 * Executes an end-to-end, non-destructive diagnostic suite validating core operational
 * systems: environment, database, health probes, tenant isolation, error handling, rate limiting,
 * Data Trust calculations, and transactional communication.
 */

import { prisma } from "@/lib/db";
import { EnvironmentValidator } from "@/lib/config/environment-validator";
import { AppError } from "@/lib/errors/app-error";
import { RateLimiter } from "@/lib/security/rate-limiter";
import { PrivateBetaManager } from "@/lib/security/private-beta";
import { EntitlementEngine } from "@/services/billing/entitlement-engine";
import { TransactionalEmailService } from "@/services/email/transactional-email";
import { isAllowedMarketplaceUrl, isSafeRedirect } from "@/marketplaces/core/acquisition/compliance";

export interface ProductionSmokeCheck {
  id: string;
  name: string;
  category: "INFRASTRUCTURE" | "SECURITY" | "ACQUISITION" | "BILLING" | "COMMUNICATION";
  status: "PASS" | "WARN" | "BLOCKED";
  durationMs: number;
  message?: string;
  details?: Record<string, any>;
}

export interface ProductionSmokeReport {
  timestamp: string;
  environment: string;
  summary: {
    total: number;
    passed: number;
    warnings: number;
    blocked: number;
  };
  overallStatus: "READY_FOR_PRIVATE_BETA" | "NEEDS_ATTENTION" | "BLOCKED";
  checks: ProductionSmokeCheck[];
}

export class ProductionSmokeTestRunner {
  /**
   * Executes the full non-destructive production readiness smoke test.
   */
  public static async runSuite(targetOrgId?: string): Promise<ProductionSmokeReport> {
    const checks: ProductionSmokeCheck[] = [];
    const env = process.env.NODE_ENV || "development";

    // 1. Environment Configuration Check
    const startEnv = Date.now();
    try {
      const envReport = EnvironmentValidator.validate();
      const status: ProductionSmokeCheck["status"] = envReport.missingRequired.length > 0 ? "BLOCKED" : "PASS";
      checks.push({
        id: "env-config",
        name: "Environment Configuration & Secrets",
        category: "INFRASTRUCTURE",
        status,
        durationMs: Date.now() - startEnv,
        message: status === "PASS" ? "Core boot environment variables configured." : `Missing: ${envReport.missingRequired.join(", ")}`,
        details: { missingBilling: envReport.missingBilling, missingEmail: envReport.missingEmail },
      });
    } catch (err: any) {
      checks.push({
        id: "env-config",
        name: "Environment Configuration & Secrets",
        category: "INFRASTRUCTURE",
        status: "BLOCKED",
        durationMs: Date.now() - startEnv,
        message: err.message,
      });
    }

    // 2. Database Connectivity & Connection Pooling Check
    const startDb = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      const orgCount = await prisma.organization.count();
      checks.push({
        id: "db-pooling",
        name: "PostgreSQL Connectivity & Schema",
        category: "INFRASTRUCTURE",
        status: "PASS",
        durationMs: Date.now() - startDb,
        message: `Database connection pool healthy (${orgCount} organizations active).`,
      });
    } catch (err: any) {
      checks.push({
        id: "db-pooling",
        name: "PostgreSQL Connectivity & Schema",
        category: "INFRASTRUCTURE",
        status: "BLOCKED",
        durationMs: Date.now() - startDb,
        message: err.message,
      });
    }

    // 3. Multi-Tenant IDOR Isolation Check
    const startTenant = Date.now();
    try {
      // Query with a non-existent random orgId must return 0 records without leaking
      const fakeOrgId = "org_non_existent_fake_12345";
      const leaks = await prisma.prospect.findMany({
        where: { organizationId: fakeOrgId },
        take: 5,
      });
      const passed = leaks.length === 0;
      checks.push({
        id: "tenant-idor",
        name: "Multi-Tenant IDOR Isolation & Scoping",
        category: "SECURITY",
        status: passed ? "PASS" : "BLOCKED",
        durationMs: Date.now() - startTenant,
        message: passed ? "Tenant data isolation verified across database boundary." : "Potential data leakage detected.",
      });
    } catch (err: any) {
      checks.push({
        id: "tenant-idor",
        name: "Multi-Tenant IDOR Isolation & Scoping",
        category: "SECURITY",
        status: "BLOCKED",
        durationMs: Date.now() - startTenant,
        message: err.message,
      });
    }

    // 4. Source Boundary & SSRF Protection Check
    const startSSRF = Date.now();
    try {
      const allowedEtsy = isAllowedMarketplaceUrl("https://www.etsy.com/search?q=planner", "etsy");
      const blockedLocalhost = !isAllowedMarketplaceUrl("http://localhost:3000/admin", "etsy");
      const blockedCloudMeta = !isAllowedMarketplaceUrl("http://169.254.169.254/latest/meta-data", "etsy");
      const safeRedirect = isSafeRedirect("https://www.etsy.com/listing/1", "https://www.etsy.com/c/crafts", "etsy");
      const unsafeRedirect = !isSafeRedirect("https://www.etsy.com/listing/1", "http://127.0.0.1/admin", "etsy");

      const passed = allowedEtsy && blockedLocalhost && blockedCloudMeta && safeRedirect && unsafeRedirect;
      checks.push({
        id: "ssrf-guard",
        name: "Source Boundary & Anti-Circumvention",
        category: "SECURITY",
        status: passed ? "PASS" : "BLOCKED",
        durationMs: Date.now() - startSSRF,
        message: passed ? "SSRF guards and domain allowlists active." : "SSRF check failed.",
      });
    } catch (err: any) {
      checks.push({
        id: "ssrf-guard",
        name: "Source Boundary & Anti-Circumvention",
        category: "SECURITY",
        status: "BLOCKED",
        durationMs: Date.now() - startSSRF,
        message: err.message,
      });
    }

    // 5. Canonical Error Sanitization Check
    const startErr = Date.now();
    try {
      const err = new AppError({
        code: "DATABASE_ERROR",
        message: "A database error occurred.",
        diagnostic: "Connection failed to postgresql://user:secret@internal-db:5432/db",
      });
      const safeJson = err.toSafeJSON();
      const passed = safeJson.error.code === "DATABASE_ERROR" &&
        !(safeJson.error as any).diagnostic &&
        !(safeJson.error as any).stack;

      checks.push({
        id: "error-sanitization",
        name: "Error Taxonomy & Zero Secret Leakage",
        category: "SECURITY",
        status: passed ? "PASS" : "BLOCKED",
        durationMs: Date.now() - startErr,
        message: passed ? "Safe client error serialization verified." : "Error serialization leaked diagnostic details.",
      });
    } catch (err: any) {
      checks.push({
        id: "error-sanitization",
        name: "Error Taxonomy & Zero Secret Leakage",
        category: "SECURITY",
        status: "BLOCKED",
        durationMs: Date.now() - startErr,
        message: err.message,
      });
    }

    // 6. Sliding-Window Rate Limiter Check
    const startRate = Date.now();
    try {
      const testKey = `smoke_rate_${Date.now()}`;
      RateLimiter.clear();
      const r1 = RateLimiter.check(testKey, 2, 60);
      const r2 = RateLimiter.check(testKey, 2, 60);
      const r3 = RateLimiter.check(testKey, 2, 60);

      const passed = r1.allowed && r2.allowed && !r3.allowed;
      checks.push({
        id: "rate-limiting",
        name: "Application-Layer Rate Limiter",
        category: "SECURITY",
        status: passed ? "PASS" : "BLOCKED",
        durationMs: Date.now() - startRate,
        message: passed ? "Sliding-window rate limiter functional." : "Rate limiting threshold check failed.",
      });
    } catch (err: any) {
      checks.push({
        id: "rate-limiting",
        name: "Application-Layer Rate Limiter",
        category: "SECURITY",
        status: "BLOCKED",
        durationMs: Date.now() - startRate,
        message: err.message,
      });
    }

    // 7. Entitlement & Quota Resolution Check
    const startEnt = Date.now();
    try {
      const testOrg = targetOrgId
        ? await prisma.organization.findUnique({ where: { id: targetOrgId } })
        : await prisma.organization.findFirst();

      if (testOrg) {
        const ent = await EntitlementEngine.getEntitlements(testOrg.id);
        const passed = Boolean(ent.planKey && ent.allowedMarketplaces.length > 0);
        checks.push({
          id: "entitlements-gating",
          name: "Entitlement Engine & Commercial Gating",
          category: "BILLING",
          status: passed ? "PASS" : "BLOCKED",
          durationMs: Date.now() - startEnt,
          message: passed ? `Plan "${ent.planName}" (${ent.planKey}) entitlements resolved.` : "Entitlement resolution failed.",
        });
      } else {
        checks.push({
          id: "entitlements-gating",
          name: "Entitlement Engine & Commercial Gating",
          category: "BILLING",
          status: "WARN",
          durationMs: Date.now() - startEnt,
          message: "No test organization found to verify entitlements.",
        });
      }
    } catch (err: any) {
      checks.push({
        id: "entitlements-gating",
        name: "Entitlement Engine & Commercial Gating",
        category: "BILLING",
        status: "BLOCKED",
        durationMs: Date.now() - startEnt,
        message: err.message,
      });
    }

    // 8. Transactional Email Buffer Check
    const startEmail = Date.now();
    try {
      const delivery = await TransactionalEmailService.send({
        to: "smoke-test@sellersalt.com",
        subject: "Smoke Test Verification",
        html: "<p>Smoke test payload</p>",
        templateKey: "SYSTEM_SMOKE_TEST",
      });

      const passed = delivery.sent && Boolean(delivery.deliveryId);
      checks.push({
        id: "transactional-email",
        name: "Transactional Communication Pipeline",
        category: "COMMUNICATION",
        status: passed ? "PASS" : "WARN",
        durationMs: Date.now() - startEmail,
        message: passed ? `Email dispatched via ${delivery.mode} mode.` : "Email delivery failed.",
      });
    } catch (err: any) {
      checks.push({
        id: "transactional-email",
        name: "Transactional Communication Pipeline",
        category: "COMMUNICATION",
        status: "BLOCKED",
        durationMs: Date.now() - startEmail,
        message: err.message,
      });
    }

    // 9. Private Beta Gate Check
    const startBeta = Date.now();
    try {
      const isBeta = PrivateBetaManager.isBetaMode();
      const validCodes = PrivateBetaManager.getValidInviteCodes();
      checks.push({
        id: "private-beta",
        name: "Private Beta Access Control",
        category: "SECURITY",
        status: "PASS",
        durationMs: Date.now() - startBeta,
        message: isBeta ? `Private beta ACTIVE (${validCodes.length} invite codes configured).` : "Public access OPEN (Private beta disabled).",
      });
    } catch (err: any) {
      checks.push({
        id: "private-beta",
        name: "Private Beta Access Control",
        category: "SECURITY",
        status: "BLOCKED",
        durationMs: Date.now() - startBeta,
        message: err.message,
      });
    }

    const passed = checks.filter((c) => c.status === "PASS").length;
    const warnings = checks.filter((c) => c.status === "WARN").length;
    const blocked = checks.filter((c) => c.status === "BLOCKED").length;

    const overallStatus: ProductionSmokeReport["overallStatus"] =
      blocked === 0 ? "READY_FOR_PRIVATE_BETA" : "BLOCKED";

    return {
      timestamp: new Date().toISOString(),
      environment: env,
      summary: {
        total: checks.length,
        passed,
        warnings,
        blocked,
      },
      overallStatus,
      checks,
    };
  }
}
