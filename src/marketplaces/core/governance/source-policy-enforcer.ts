/**
 * SellerSalt — Source Policy Enforcer
 * 
 * Intercepts data acquisition attempts, evaluates them against the canonical
 * MarketplaceDataPolicy, enforces domain/path boundaries, and logs telemetry.
 */

import type { MarketplaceId, DataSourceType } from "../types";
import type {
  MarketplaceDataPolicy,
  GovernancePolicyDecision,
  PolicyPermissionStatus,
  AcquisitionGovernanceLog,
} from "./types";
import { MarketplaceGovernanceRegistry } from "./registry";

// In-memory audit log for rapid operational telemetry
const GOVERNANCE_LOGS: AcquisitionGovernanceLog[] = [];
const MAX_LOG_SIZE = 1000;

export interface EvaluateAcquisitionRequest {
  organizationId?: string;
  marketplace: MarketplaceId | string;
  sourceType: DataSourceType;
  purpose: "PRODUCT_SEARCH" | "KEYWORD_SEARCH" | "CATEGORY_TREE" | "SHOP_STATS" | "ORDER_SYNC" | "VALIDATION";
  targetUrl?: string;
}

export class SourcePolicyEnforcer {
  /**
   * Evaluates whether an acquisition attempt is permitted by marketplace policy.
   */
  public static evaluateRequest(request: EvaluateAcquisitionRequest): GovernancePolicyDecision {
    const policy = MarketplaceGovernanceRegistry.getPolicy(request.marketplace);
    const now = new Date();
    const mpId = policy.marketplace;

    // 1. Check if Source Type is in Allowed Acquisition Sources
    if (!policy.allowedAcquisitionSources.includes(request.sourceType)) {
      const decision: GovernancePolicyDecision = {
        allowed: false,
        status: "PROHIBITED",
        reason: `Source type '${request.sourceType}' is prohibited for ${policy.displayName} by data governance policy.`,
        marketplace: mpId,
        sourceType: request.sourceType,
        evaluatedAt: now,
      };
      this.recordLog(request, decision);
      return decision;
    }

    // 2. Check Specific Source Policy Status
    let sourceStatus: PolicyPermissionStatus = "ALLOWED";
    if (request.sourceType === "PUBLIC_WEB") {
      sourceStatus = policy.publicWebAllowed;
    } else if (request.sourceType === "MARKETPLACE_API") {
      sourceStatus = policy.officialApiAvailable;
    } else if (request.sourceType === "CONNECTED_STORE") {
      sourceStatus = policy.connectedStoreAllowed;
    } else if (request.sourceType === "EXTERNAL_PROVIDER") {
      sourceStatus = policy.licensedProviderAllowed;
    }

    if (sourceStatus === "PROHIBITED" || sourceStatus === "RESTRICTED") {
      const decision: GovernancePolicyDecision = {
        allowed: false,
        status: sourceStatus,
        reason: `${request.sourceType} is currently ${sourceStatus} for ${policy.displayName}.`,
        marketplace: mpId,
        sourceType: request.sourceType,
        evaluatedAt: now,
      };
      this.recordLog(request, decision);
      return decision;
    }

    if (sourceStatus === "UNKNOWN" || sourceStatus === "REQUIRES_REVIEW") {
      const decision: GovernancePolicyDecision = {
        allowed: false,
        status: sourceStatus,
        reason: `Acquisition permissions for ${policy.displayName} via ${request.sourceType} are unconfirmed. Requires policy review.`,
        marketplace: mpId,
        sourceType: request.sourceType,
        evaluatedAt: now,
      };
      this.recordLog(request, decision);
      return decision;
    }

    // 3. Evaluate Target URL if provided
    if (request.targetUrl) {
      const urlCheck = this.evaluateUrl(request.targetUrl, policy);
      if (!urlCheck.allowed) {
        const decision: GovernancePolicyDecision = {
          allowed: false,
          status: "PROHIBITED",
          reason: urlCheck.reason,
          marketplace: mpId,
          sourceType: request.sourceType,
          evaluatedAt: now,
        };
        this.recordLog(request, decision);
        return decision;
      }
    }

    // 4. Allowed
    const decision: GovernancePolicyDecision = {
      allowed: true,
      status: sourceStatus,
      reason: `Acquisition via ${request.sourceType} is permitted under ${policy.displayName} data governance policy.`,
      marketplace: mpId,
      sourceType: request.sourceType,
      requiresDisclaimer: policy.displayRules.requireMarketplaceDisclaimer,
      requiredDisclaimerText: policy.displayRules.disclaimerText,
      evaluatedAt: now,
    };

    this.recordLog(request, decision);
    return decision;
  }

  /**
   * Evaluates a URL against allowed research domains and prohibited paths.
   */
  public static evaluateUrl(
    url: string,
    policy: MarketplaceDataPolicy
  ): { allowed: boolean; reason: string } {
    let parsed: URL;
    try {
      parsed = new URL(url.trim());
    } catch {
      return { allowed: false, reason: "Malformed or unparseable target URL." };
    }

    const host = parsed.hostname.toLowerCase();
    const fullPath = (parsed.pathname + parsed.search).toLowerCase();
    const fullUrl = url.toLowerCase();

    // Check prohibited private portal paths
    for (const pattern of policy.prohibitedPathPatterns) {
      const p = pattern.toLowerCase();
      if (fullUrl.includes(p) || fullPath.includes(p) || host.includes(p)) {
        return {
          allowed: false,
          reason: `Target URL matches prohibited private portal path pattern: '${pattern}'.`,
        };
      }
    }

    // If allowed domains specified, verify domain
    if (policy.allowedResearchDomains.length > 0) {
      const domainMatch = policy.allowedResearchDomains.some(
        (d) => host === d || host.endsWith(`.${d}`)
      );
      if (!domainMatch) {
        return {
          allowed: false,
          reason: `Host '${host}' is not in the allowed research domains for ${policy.displayName}.`,
        };
      }
    }

    return { allowed: true, reason: "URL passes domain and safety checks." };
  }

  /**
   * Records a governance evaluation log for observability and audit trails.
   */
  private static recordLog(
    request: EvaluateAcquisitionRequest,
    decision: GovernancePolicyDecision
  ): void {
    const entry: AcquisitionGovernanceLog = {
      id: `gov_log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      organizationId: request.organizationId || "system",
      marketplace: decision.marketplace,
      sourceType: request.sourceType,
      purpose: request.purpose,
      targetUrl: request.targetUrl,
      decision: decision.status,
      decisionReason: decision.reason,
      timestamp: decision.evaluatedAt,
    };

    GOVERNANCE_LOGS.unshift(entry);
    if (GOVERNANCE_LOGS.length > MAX_LOG_SIZE) {
      GOVERNANCE_LOGS.pop();
    }
  }

  /**
   * Retrieves recent governance audit logs.
   */
  public static getRecentLogs(limit = 50): AcquisitionGovernanceLog[] {
    return GOVERNANCE_LOGS.slice(0, limit);
  }
}
