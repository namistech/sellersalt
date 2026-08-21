/**
 * Tenancy Access Control & Scoping Engine
 * 
 * Implements the canonical tenancy scoping rule from docs/architecture/BASE-ARCHITECTURE.md Section 1:
 * Every dashboard and data query is filtered strictly by the current user's Memberships
 * and the active Engagements their Organization is party to.
 */

import { prisma } from "@/lib/db";
import { EngagementStatus, OrganizationType } from "@prisma/client";

export class TenantAccessDeniedError extends Error {
  public readonly code = "TENANT_ACCESS_DENIED";
  public readonly statusCode = 403;
  constructor(message: string = "Cross-tenant access denied: No active membership or engagement found.") {
    super(message);
    this.name = "TenantAccessDeniedError";
  }
}

export interface TenantAccessScope {
  userId: string;
  directOrgIds: string[];
  engagedOrgIds: string[];
  allAccessibleOrgIds: string[];
  memberships: {
    organizationId: string;
    organizationName: string;
    organizationType: OrganizationType;
    role: string;
  }[];
  activeEngagements: {
    id: string;
    grantorOrgId: string;
    grantorOrgName: string;
    granteeOrgId: string | null;
    granteeUserId: string | null;
    scope: string[];
    status: EngagementStatus;
  }[];
  isAccessible: (targetOrgId: string, requiredScope?: string) => boolean;
  assertAccess: (targetOrgId: string, requiredScope?: string) => void;
}

/**
 * Resolves the full multi-tenant access scope for a given user.
 * Evaluates both direct organization memberships and active cross-org engagements.
 */
export async function getTenantAccessScope(
  userId: string,
  options?: { requiredScope?: string }
): Promise<TenantAccessScope> {
  if (!userId) {
    throw new TenantAccessDeniedError("Authentication required to resolve tenant scope.");
  }

  // 1. Fetch all direct memberships for the user
  let memberships: any[] = [];
  try {
    memberships = await prisma.membership.findMany({
      where: { userId },
      include: {
        organization: {
          select: { id: true, name: true, type: true },
        },
      },
    });
  } catch (err: any) {
    if (err?.code === "P2021" || err?.message?.includes("does not exist") || err?.name === "PrismaClientKnownRequestError") {
      memberships = [];
    } else {
      throw err;
    }
  }

  const directOrgIds = memberships.map((m) => m.organizationId);

  // 2. Fetch all active engagements where:
  //    (a) The user's orgs are granteeOrgId, OR
  //    (b) The user directly is granteeUserId
  const now = new Date();
  let rawEngagements: any[] = [];
  try {
    rawEngagements = await prisma.engagement.findMany({
      where: {
        status: EngagementStatus.ACTIVE,
        startsAt: { lte: now },
        OR: [
          { endsAt: null },
          { endsAt: { gte: now } },
        ],
        revokedAt: null,
        AND: [
          {
            OR: [
              { granteeOrgId: { in: directOrgIds.length > 0 ? directOrgIds : ["__none__"] } },
              { granteeUserId: userId },
            ],
          },
        ],
      },
      include: {
        grantorOrg: {
          select: { id: true, name: true },
        },
      },
    });
  } catch (err: any) {
    if (err?.code === "P2021" || err?.message?.includes("does not exist")) {
      rawEngagements = [];
    } else {
      throw err;
    }
  }

  // Filter by required scope if specified
  const filteredEngagements = options?.requiredScope
    ? rawEngagements.filter((e) => e.scope.includes(options.requiredScope!) || e.scope.includes("*") || e.scope.includes("ALL"))
    : rawEngagements;

  const engagedOrgIds = [...new Set(filteredEngagements.map((e) => e.grantorOrgId))];
  const allAccessibleOrgIds = [...new Set([...directOrgIds, ...engagedOrgIds])];

  const scopeData: TenantAccessScope = {
    userId,
    directOrgIds,
    engagedOrgIds,
    allAccessibleOrgIds,
    memberships: memberships.map((m) => ({
      organizationId: m.organizationId,
      organizationName: m.organization.name,
      organizationType: m.organization.type,
      role: m.role,
    })),
    activeEngagements: filteredEngagements.map((e) => ({
      id: e.id,
      grantorOrgId: e.grantorOrgId,
      grantorOrgName: e.grantorOrg.name,
      granteeOrgId: e.granteeOrgId,
      granteeUserId: e.granteeUserId,
      scope: e.scope,
      status: e.status,
    })),
    isAccessible: (targetOrgId: string, requiredScope?: string): boolean => {
      if (!targetOrgId) return false;
      // Direct membership gives access
      if (directOrgIds.includes(targetOrgId)) return true;

      // Check active engagements
      const matchingEngagement = filteredEngagements.find((e) => e.grantorOrgId === targetOrgId);
      if (!matchingEngagement) return false;

      if (!requiredScope) return true;
      return (
        matchingEngagement.scope.includes(requiredScope) ||
        matchingEngagement.scope.includes("*") ||
        matchingEngagement.scope.includes("ALL")
      );
    },
    assertAccess: (targetOrgId: string, requiredScope?: string): void => {
      if (!scopeData.isAccessible(targetOrgId, requiredScope)) {
        throw new TenantAccessDeniedError(
          `Access denied for organization '${targetOrgId}'. User is neither a direct member nor party to an active Engagement with scope '${requiredScope ?? "DEFAULT"}'.`
        );
      }
    },
  };

  return scopeData;
}

/**
 * Shared query helper: returns a Prisma `where` clause filter scoping
 * any organization-isolated entity to the user's accessible tenants.
 */
export async function buildTenantScopedOrgFilter(
  userId: string,
  options?: { requiredScope?: string; targetOrgId?: string }
): Promise<{ organizationId: { in: string[] } } | { organizationId: string }> {
  const scope = await getTenantAccessScope(userId, options);

  if (options?.targetOrgId) {
    scope.assertAccess(options.targetOrgId, options.requiredScope);
    return { organizationId: options.targetOrgId };
  }

  if (scope.allAccessibleOrgIds.length === 0) {
    // If no orgs accessible, return unreachable ID to prevent full-table leakage
    return { organizationId: "__unauthorized_empty_scope__" };
  }

  if (scope.allAccessibleOrgIds.length === 1) {
    return { organizationId: scope.allAccessibleOrgIds[0] };
  }

  return { organizationId: { in: scope.allAccessibleOrgIds } };
}

/**
 * Middleware assertion helper for API routes.
 * Throws TenantAccessDeniedError if the caller is not authorized for targetOrgId.
 */
export async function assertTenantAccess(
  userId: string,
  targetOrgId: string,
  requiredScope?: string
): Promise<TenantAccessScope> {
  const scope = await getTenantAccessScope(userId, { requiredScope });
  scope.assertAccess(targetOrgId, requiredScope);
  return scope;
}
