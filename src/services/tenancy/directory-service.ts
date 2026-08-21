/**
 * Opt-In Organization Directory Service
 * 
 * Implements public directory listings for Agencies, Influencers, and Institutes
 * enabling discovery and engagement requests per BASE-ARCHITECTURE.md Section 1.
 */

import { prisma } from "@/lib/db";
import { OrganizationType } from "@prisma/client";
import { TenantAccessDeniedError } from "./tenancy-access-control";

export interface DirectorySearchParams {
  query?: string;
  type?: OrganizationType;
  service?: string;
  limit?: number;
  offset?: number;
}

export interface UpdateDirectoryProfileInput {
  isPublicDirectory?: boolean;
  directorySlug?: string;
  directoryBio?: string;
  directoryServices?: string[];
}

/**
 * Searches the public directory of opted-in organizations.
 */
export async function searchPublicDirectory(params: DirectorySearchParams = {}) {
  const { query, type, service, limit = 20, offset = 0 } = params;

  const whereClause: any = {
    isPublicDirectory: true,
  };

  if (type) {
    whereClause.type = type;
  }

  if (service) {
    whereClause.directoryServices = {
      has: service,
    };
  }

  if (query && query.trim().length > 0) {
    const cleanQuery = query.trim();
    whereClause.OR = [
      { name: { contains: cleanQuery, mode: "insensitive" } },
      { directorySlug: { contains: cleanQuery, mode: "insensitive" } },
      { directoryBio: { contains: cleanQuery, mode: "insensitive" } },
    ];
  }

  const [total, organizations] = await Promise.all([
    prisma.organization.count({ where: whereClause }),
    prisma.organization.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        type: true,
        directorySlug: true,
        directoryBio: true,
        directoryServices: true,
        createdAt: true,
        _count: {
          select: {
            memberships: true,
            grantorEngagements: { where: { status: "ACTIVE" } },
          },
        },
      },
      take: Math.min(limit, 50),
      skip: offset,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    total,
    organizations: organizations.map((org) => ({
      id: org.id,
      name: org.name,
      type: org.type,
      directorySlug: org.directorySlug ?? org.id,
      directoryBio: org.directoryBio,
      directoryServices: org.directoryServices,
      createdAt: org.createdAt,
      activeClientCount: org._count.grantorEngagements,
    })),
  };
}

/**
 * Retrieves a single public organization directory profile by its unique slug or ID.
 */
export async function getDirectoryProfile(slugOrId: string) {
  const org = await prisma.organization.findFirst({
    where: {
      OR: [{ directorySlug: slugOrId }, { id: slugOrId }],
      isPublicDirectory: true,
    },
    select: {
      id: true,
      name: true,
      type: true,
      directorySlug: true,
      directoryBio: true,
      directoryServices: true,
      createdAt: true,
      _count: {
        select: {
          grantorEngagements: { where: { status: "ACTIVE" } },
        },
      },
    },
  });

  if (!org) {
    return null;
  }

  return {
    id: org.id,
    name: org.name,
    type: org.type,
    directorySlug: org.directorySlug ?? org.id,
    directoryBio: org.directoryBio,
    directoryServices: org.directoryServices,
    createdAt: org.createdAt,
    activeClientCount: org._count.grantorEngagements,
  };
}

/**
 * Updates an organization's directory profile and opt-in status.
 */
export async function updateDirectoryProfile(
  organizationId: string,
  actingUserId: string,
  data: UpdateDirectoryProfileInput
) {
  // Verify acting user is Owner or Admin
  const adminMembership = await prisma.membership.findFirst({
    where: {
      userId: actingUserId,
      organizationId,
      role: { in: ["OWNER", "ADMIN", "owner", "admin"] },
    },
  });

  if (!adminMembership) {
    throw new TenantAccessDeniedError("Only organization Owners and Admins can manage directory settings.");
  }

  // If slug is being updated, verify uniqueness
  if (data.directorySlug) {
    const slug = data.directorySlug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-");
    const existing = await prisma.organization.findFirst({
      where: {
        directorySlug: slug,
        id: { not: organizationId },
      },
    });

    if (existing) {
      throw new Error(`The directory ID '${slug}' is already in use by another organization.`);
    }

    data.directorySlug = slug;
  }

  return prisma.organization.update({
    where: { id: organizationId },
    data: {
      isPublicDirectory: data.isPublicDirectory,
      directorySlug: data.directorySlug,
      directoryBio: data.directoryBio,
      directoryServices: data.directoryServices,
    },
  });
}
