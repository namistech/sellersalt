/**
 * SellerSalt Business Domain Free-Account Policy
 * 
 * Prevents multiple independent Free Explorer organizations from being created
 * by users from the same business domain (e.g. john@company.com, sarah@company.com).
 * 
 * Public email providers (gmail.com, yahoo.com, outlook.com, etc.) are strictly
 * exempted from corporate domain pooling.
 */

import { prisma } from "@/lib/db";
import { analyzeEmailDomain, type EmailDomainAnalysis } from "./disposable-domains";
import { getSetting } from "@/lib/app-settings";

export interface BusinessDomainCheckResult {
  allowed: boolean;
  requiresChallenge: boolean;
  domain: string;
  isBusinessDomain: boolean;
  existingFreeAccountCount: number;
  maxAllowedFreeAccounts: number;
  reason?: string;
  suggestedAction?: "PROCEED" | "CHALLENGE" | "BLOCK_AND_SUGGEST_INVITE" | "BLOCK_DISPOSABLE";
}

const DEFAULT_MAX_FREE_ACCOUNTS_PER_BUSINESS_DOMAIN = 1;

/**
 * Evaluates whether a new registration on a free plan conforms to the
 * business domain policy.
 */
export async function evaluateBusinessDomainPolicy(
  email: string,
  targetPlan: "FREE" | "STARTED" | "PRO" | "AGENCY" = "FREE"
): Promise<BusinessDomainCheckResult> {
  const analysis: EmailDomainAnalysis = await analyzeEmailDomain(email);

  if (!analysis.isValid) {
    return {
      allowed: false,
      requiresChallenge: false,
      domain: analysis.normalizedDomain,
      isBusinessDomain: false,
      existingFreeAccountCount: 0,
      maxAllowedFreeAccounts: 0,
      reason: analysis.error || "Invalid email address.",
      suggestedAction: "BLOCK_DISPOSABLE",
    };
  }

  // Paid plans (Started, Pro, Agency) are not restricted by free-account domain policies
  if (targetPlan !== "FREE") {
    return {
      allowed: true,
      requiresChallenge: false,
      domain: analysis.normalizedDomain,
      isBusinessDomain: analysis.isBusinessDomain,
      existingFreeAccountCount: 0,
      maxAllowedFreeAccounts: 999,
      suggestedAction: "PROCEED",
    };
  }

  // Public webmails (Gmail, Yahoo, Hotmail, etc.) are exempted from the corporate org limit
  if (analysis.isPublicWebmail) {
    return {
      allowed: true,
      requiresChallenge: false,
      domain: analysis.normalizedDomain,
      isBusinessDomain: false,
      existingFreeAccountCount: 0,
      maxAllowedFreeAccounts: 999999,
      suggestedAction: "PROCEED",
    };
  }

  // For custom/business domains, check if the domain is explicitly admin-allowlisted
  const domain = analysis.normalizedDomain;
  try {
    const allowlist = await getSetting("free_plan_allowed_domains_custom");
    if (allowlist) {
      const allowedList = allowlist
        .split(/[\n,;]/)
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);
      if (allowedList.includes(domain)) {
        return {
          allowed: true,
          requiresChallenge: false,
          domain,
          isBusinessDomain: true,
          existingFreeAccountCount: 0,
          maxAllowedFreeAccounts: 999,
          suggestedAction: "PROCEED",
        };
      }
    }
  } catch {
    // Non-fatal
  }

  // Get configurable threshold from AppSetting
  let maxAllowed = DEFAULT_MAX_FREE_ACCOUNTS_PER_BUSINESS_DOMAIN;
  try {
    const customLimitStr = await getSetting("max_free_accounts_per_business_domain");
    if (customLimitStr && !isNaN(Number(customLimitStr))) {
      maxAllowed = Math.max(1, Number(customLimitStr));
    }
  } catch {
    // Non-fatal
  }

  // Count existing free accounts on this business domain
  // We query users with emails ending in `@${domain}` whose organizations are on FREE plan
  const existingUsers = await prisma.user.findMany({
    where: {
      email: { endsWith: `@${domain}` },
      memberships: {
        some: {
          organization: {
            plan: "FREE",
          },
        },
      },
    },
    select: { id: true, email: true },
  });

  const existingFreeCount = existingUsers.length;

  if (existingFreeCount >= maxAllowed) {
    return {
      allowed: false,
      requiresChallenge: false,
      domain,
      isBusinessDomain: true,
      existingFreeAccountCount: existingFreeCount,
      maxAllowedFreeAccounts: maxAllowed,
      reason: `An active Free Explorer workspace already exists for @${domain}. Please ask your workspace administrator to invite you to the existing team workspace, or select a paid subscription plan.`,
      suggestedAction: "BLOCK_AND_SUGGEST_INVITE",
    };
  }

  return {
    allowed: true,
    requiresChallenge: existingFreeCount > 0, // Flag for extra risk scoring if 2nd account
    domain,
    isBusinessDomain: true,
    existingFreeAccountCount: existingFreeCount,
    maxAllowedFreeAccounts: maxAllowed,
    suggestedAction: "PROCEED",
  };
}
