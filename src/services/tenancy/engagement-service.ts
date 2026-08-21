/**
 * Engagement Lifecycle Management Service
 * 
 * Manages generic cross-tenant connection objects (Customer->Agency, Institute->Teacher/Student, Seller->Influencer)
 * as defined in docs/architecture/BASE-ARCHITECTURE.md Section 1.
 */

import { prisma } from "@/lib/db";
import { EngagementStatus } from "@prisma/client";
import { TenantAccessDeniedError } from "./tenancy-access-control";

export interface CreateEngagementInput {
  grantorOrgId: string;
  granteeOrgId?: string | null;
  granteeUserId?: string | null;
  scope: string[];
  contractTerms?: string | null;
  startsAt?: Date;
  endsAt?: Date | null;
  requesterUserId: string;
}

/**
 * Creates a new engagement request in PENDING status.
 */
export async function createEngagementRequest(input: CreateEngagementInput) {
  const { grantorOrgId, granteeOrgId, granteeUserId, scope, contractTerms, startsAt, endsAt, requesterUserId } = input;

  if (!granteeOrgId && !granteeUserId) {
    throw new Error("Engagement must specify either a granteeOrgId or granteeUserId.");
  }

  // Verify that requester is an owner/admin of either the grantorOrg or the granteeOrg (or is the granteeUser)
  const isGrantorMember = await prisma.membership.findFirst({
    where: {
      userId: requesterUserId,
      organizationId: grantorOrgId,
      role: { in: ["OWNER", "ADMIN", "owner", "admin"] },
    },
  });

  const isGranteeMember = granteeOrgId
    ? await prisma.membership.findFirst({
        where: {
          userId: requesterUserId,
          organizationId: granteeOrgId,
          role: { in: ["OWNER", "ADMIN", "owner", "admin"] },
        },
      })
    : null;

  const isGranteeUserSelf = granteeUserId === requesterUserId;

  if (!isGrantorMember && !isGranteeMember && !isGranteeUserSelf) {
    throw new TenantAccessDeniedError("You must be an Owner/Admin of one of the participating organizations to initiate an Engagement.");
  }

  const engagement = await prisma.engagement.create({
    data: {
      grantorOrgId,
      granteeOrgId: granteeOrgId ?? null,
      granteeUserId: granteeUserId ?? null,
      scope: scope.length > 0 ? scope : ["DEFAULT"],
      status: EngagementStatus.PENDING,
      contractTerms: contractTerms ?? null,
      startsAt: startsAt ?? new Date(),
      endsAt: endsAt ?? null,
    },
    include: {
      grantorOrg: { select: { id: true, name: true, type: true } },
      granteeOrg: { select: { id: true, name: true, type: true } },
      granteeUser: { select: { id: true, name: true, email: true } },
    },
  });

  return engagement;
}

/**
 * Accepts a pending engagement request, transitioning it to ACTIVE.
 */
export async function acceptEngagement(engagementId: string, actingUserId: string) {
  const engagement = await prisma.engagement.findUnique({
    where: { id: engagementId },
  });

  if (!engagement) {
    throw new Error("Engagement not found.");
  }

  if (engagement.status !== EngagementStatus.PENDING) {
    throw new Error(`Cannot accept an engagement with status '${engagement.status}'.`);
  }

  // Caller must be an authorized member of grantorOrg (or grantee if initiated by grantor)
  const isGrantorAuthorized = await prisma.membership.findFirst({
    where: {
      userId: actingUserId,
      organizationId: engagement.grantorOrgId,
      role: { in: ["OWNER", "ADMIN", "owner", "admin"] },
    },
  });

  const isGranteeAuthorized = engagement.granteeOrgId
    ? await prisma.membership.findFirst({
        where: {
          userId: actingUserId,
          organizationId: engagement.granteeOrgId,
          role: { in: ["OWNER", "ADMIN", "owner", "admin"] },
        },
      })
    : engagement.granteeUserId === actingUserId;

  if (!isGrantorAuthorized && !isGranteeAuthorized) {
    throw new TenantAccessDeniedError("Unauthorized to accept this engagement.");
  }

  return prisma.engagement.update({
    where: { id: engagementId },
    data: {
      status: EngagementStatus.ACTIVE,
      startsAt: new Date(),
    },
    include: {
      grantorOrg: { select: { id: true, name: true, type: true } },
      granteeOrg: { select: { id: true, name: true, type: true } },
      granteeUser: { select: { id: true, name: true, email: true } },
    },
  });
}

/**
 * Rejects a pending engagement.
 */
export async function rejectEngagement(engagementId: string, actingUserId: string) {
  const engagement = await prisma.engagement.findUnique({
    where: { id: engagementId },
  });

  if (!engagement) {
    throw new Error("Engagement not found.");
  }

  return prisma.engagement.update({
    where: { id: engagementId },
    data: {
      status: EngagementStatus.REJECTED,
      revokedAt: new Date(),
    },
  });
}

/**
 * Revokes an active engagement immediately.
 */
export async function revokeEngagement(engagementId: string, actingUserId: string) {
  const engagement = await prisma.engagement.findUnique({
    where: { id: engagementId },
  });

  if (!engagement) {
    throw new Error("Engagement not found.");
  }

  return prisma.engagement.update({
    where: { id: engagementId },
    data: {
      status: EngagementStatus.REVOKED,
      revokedAt: new Date(),
    },
  });
}

/**
 * Lists all engagements for a specific organization (both granted and received).
 */
export async function listEngagementsForOrg(orgId: string, actingUserId: string) {
  // Check that acting user is a member of the org
  const membership = await prisma.membership.findFirst({
    where: { userId: actingUserId, organizationId: orgId },
  });

  if (!membership) {
    throw new TenantAccessDeniedError("You do not have access to this organization's engagements.");
  }

  const [granted, received] = await Promise.all([
    prisma.engagement.findMany({
      where: { grantorOrgId: orgId },
      include: {
        granteeOrg: { select: { id: true, name: true, type: true } },
        granteeUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.engagement.findMany({
      where: { granteeOrgId: orgId },
      include: {
        grantorOrg: { select: { id: true, name: true, type: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    granted,
    received,
  };
}
