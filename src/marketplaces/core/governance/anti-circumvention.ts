/**
 * SellerSalt — Anti-Circumvention Guard
 * 
 * Prevents unauthorized or prohibited fallback mechanisms.
 * Specifically guarantees that when an official marketplace API is restricted,
 * revoked, unauthorized, or requires commercial access, the system does NOT
 * attempt unauthorized scraping or sidestep compliance boundaries.
 */

import type { MarketplaceId, DataSourceType } from "../types";
import { MarketplaceGovernanceRegistry } from "./registry";
import { SourcePolicyEnforcer } from "./source-policy-enforcer";
import type { GovernancePolicyDecision } from "./types";

export type ApiFailureCategory =
  | "ACCESS_RESTRICTED"
  | "NOT_AUTHORIZED"
  | "COMMERCIAL_ACCESS_REQUIRED"
  | "API_KEY_REVOKED"
  | "RATE_LIMITED"
  | "SCOPE_MISSING"
  | "NETWORK_ERROR"
  | "UNKNOWN";

export interface FallbackEvaluationResult {
  readonly fallbackAllowed: boolean;
  readonly fallbackSource: DataSourceType | "NONE";
  readonly action: "EXECUTE_FALLBACK" | "BLOCK_AND_REPORT_POLICY_RESTRICTED";
  readonly reason: string;
  readonly policyDecision: GovernancePolicyDecision;
  readonly auditLogRecorded: boolean;
}

export class AntiCircumventionGuard {
  /**
   * Evaluates whether fallback from a failed/restricted API request to Public Web
   * or another source is legally and architecturally permitted by data policy.
   */
  public static evaluateApiFallback(params: {
    marketplace: MarketplaceId | string;
    organizationId?: string;
    apiFailureCategory: ApiFailureCategory;
    capability?: string;
    targetUrl?: string;
  }): FallbackEvaluationResult {
    const { marketplace, organizationId = "org_default", apiFailureCategory, targetUrl } = params;
    const policy = MarketplaceGovernanceRegistry.getPolicy(marketplace);
    const now = new Date();

    // 1. Prohibit scraping private seller portals under ANY circumstance
    if (targetUrl) {
      const urlCheck = SourcePolicyEnforcer.evaluateUrl(targetUrl, policy);
      if (!urlCheck.allowed) {
        const policyDecision: GovernancePolicyDecision = {
          allowed: false,
          status: "PROHIBITED",
          reason: `Anti-Circumvention: Fallback blocked. Target matches prohibited path: ${urlCheck.reason}`,
          marketplace: policy.marketplace,
          sourceType: "PUBLIC_WEB",
          evaluatedAt: now,
        };

        return {
          fallbackAllowed: false,
          fallbackSource: "NONE",
          action: "BLOCK_AND_REPORT_POLICY_RESTRICTED",
          reason: policyDecision.reason,
          policyDecision,
          auditLogRecorded: true,
        };
      }
    }

    // 2. If API failure was due to OAuth authorization or private scope, public scraping is PROHIBITED
    if (
      apiFailureCategory === "NOT_AUTHORIZED" ||
      apiFailureCategory === "SCOPE_MISSING" ||
      policy.privateDataRules.allowScrapingPrivateDashboards === false
    ) {
      if (policy.publicWebAllowed === "PROHIBITED") {
        const policyDecision: GovernancePolicyDecision = {
          allowed: false,
          status: "PROHIBITED",
          reason: `Anti-Circumvention: ${policy.displayName} prohibits public web scraping fallback after API authentication failure. Connect authorized store instead.`,
          marketplace: policy.marketplace,
          sourceType: "PUBLIC_WEB",
          evaluatedAt: now,
        };

        return {
          fallbackAllowed: false,
          fallbackSource: "NONE",
          action: "BLOCK_AND_REPORT_POLICY_RESTRICTED",
          reason: policyDecision.reason,
          policyDecision,
          auditLogRecorded: true,
        };
      }
    }

    // 3. Evaluate whether Public Web is independently permitted by policy
    const publicWebPolicyDecision = SourcePolicyEnforcer.evaluateRequest({
      organizationId,
      marketplace: policy.marketplace,
      sourceType: "PUBLIC_WEB",
      purpose: "PRODUCT_SEARCH",
      targetUrl,
    });

    if (!publicWebPolicyDecision.allowed) {
      return {
        fallbackAllowed: false,
        fallbackSource: "NONE",
        action: "BLOCK_AND_REPORT_POLICY_RESTRICTED",
        reason: `Anti-Circumvention: Public web fallback is ${publicWebPolicyDecision.status} for ${policy.displayName} under current data policy.`,
        policyDecision: publicWebPolicyDecision,
        auditLogRecorded: true,
      };
    }

    // 4. Fallback is permitted because public catalog research is policy-compliant
    return {
      fallbackAllowed: true,
      fallbackSource: "PUBLIC_WEB",
      action: "EXECUTE_FALLBACK",
      reason: `Public web fallback is permitted for ${policy.displayName} public catalog research.`,
      policyDecision: publicWebPolicyDecision,
      auditLogRecorded: true,
    };
  }
}
