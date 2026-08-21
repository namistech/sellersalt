/**
 * Seat Management Service
 * 
 * Implements seat assignment and removal for Agencies and Institutes
 * tied to subscription tiers and organization types per BASE-ARCHITECTURE.md Section 1.
 */

import { prisma } from "@/lib/db";
import { OrganizationType } from "@prisma/client";
import { TenantAccessDeniedError } from "./tenancy-access-control";

export interface SeatAllocationInfo {
  organizationId: string;
  organizationName: string;
  organizationType: OrganizationType;
  maxSeats: number;
  totalSeatsCount: number;
  assignedSeatsCount: number;
  unassignedSeatsCount: number;
  availableCapacity: number;
  seats: {
    id: string;
    seatType: string;
    assignedUserId: string | null;
    assignedUser: {
      id: string;
      name: string | null;
      email: string;
    } | null;
    assignedAt: Date | null;
    createdAt: Date;
  }[];
}

/**
 * Returns the maximum seat capacity for an organization based on its plan and type.
 */
export async function getMaxSeatLimit(organizationId: string): Promise<number> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { package: true, subscription: true },
  });

  if (!org) {
    throw new Error("Organization not found.");
  }

  // Institutes have high seat capacity for cohorts/students
  if (org.type === OrganizationType.INSTITUTE) {
    return 100;
  }

  // Agency tiers support multi-seat teams
  if (org.type === OrganizationType.AGENCY || org.plan === "AGENCY") {
    return 25;
  }

  if (org.plan === "PRO") {
    return 5;
  }

  // Individual / Free Explorer standard limit
  return 1;
}

/**
 * Retrieves the seat allocation, assignments, and capacity for an organization.
 */
export async function getOrgSeatAllocation(
  organizationId: string,
  actingUserId: string
): Promise<SeatAllocationInfo> {
  const membership = await prisma.membership.findFirst({
    where: { userId: actingUserId, organizationId },
    include: { organization: true },
  });

  if (!membership) {
    throw new TenantAccessDeniedError("Access denied: You are not a member of this organization.");
  }

  const maxSeats = await getMaxSeatLimit(organizationId);

  const seats = await prisma.seat.findMany({
    where: { organizationId },
    include: {
      assignedUser: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const assignedSeatsCount = seats.filter((s) => s.assignedUserId !== null).length;
  const unassignedSeatsCount = seats.length - assignedSeatsCount;
  const availableCapacity = Math.max(0, maxSeats - seats.length);

  return {
    organizationId,
    organizationName: membership.organization.name,
    organizationType: membership.organization.type,
    maxSeats,
    totalSeatsCount: seats.length,
    assignedSeatsCount,
    unassignedSeatsCount,
    availableCapacity,
    seats: seats.map((s) => ({
      id: s.id,
      seatType: s.seatType,
      assignedUserId: s.assignedUserId,
      assignedUser: s.assignedUser,
      assignedAt: s.assignedAt,
      createdAt: s.createdAt,
    })),
  };
}

/**
 * Assigns a seat to a target user within an Agency or Institute organization.
 */
export async function assignSeat(
  organizationId: string,
  targetUserId: string,
  seatType: string = "STANDARD",
  actingUserId: string
) {
  // 1. Verify acting user is Owner or Admin
  const adminMembership = await prisma.membership.findFirst({
    where: {
      userId: actingUserId,
      organizationId,
      role: { in: ["OWNER", "ADMIN", "owner", "admin"] },
    },
    include: { organization: true },
  });

  if (!adminMembership) {
    throw new TenantAccessDeniedError("Only organization Owners and Admins can assign seats.");
  }

  // 2. Check if user already holds a seat in this organization
  const existingUserSeat = await prisma.seat.findFirst({
    where: { organizationId, assignedUserId: targetUserId },
  });

  if (existingUserSeat) {
    throw new Error("User is already assigned a seat in this organization.");
  }

  // 3. Verify max capacity
  const maxSeats = await getMaxSeatLimit(organizationId);
  const currentSeatCount = await prisma.seat.count({ where: { organizationId } });

  if (currentSeatCount >= maxSeats) {
    throw new Error(
      `Seat capacity reached (${currentSeatCount}/${maxSeats}). Upgrade subscription or purchase additional seats to continue.`
    );
  }

  // 4. Create and assign the seat
  const seat = await prisma.seat.create({
    data: {
      organizationId,
      seatType: seatType.toUpperCase(),
      assignedUserId: targetUserId,
      assignedAt: new Date(),
    },
    include: {
      assignedUser: { select: { id: true, name: true, email: true } },
    },
  });

  // 5. Ensure target user has a corresponding membership in the org
  const existingMembership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: targetUserId, organizationId } },
  });

  if (!existingMembership) {
    const roleName =
      seatType.toUpperCase() === "TEACHER"
        ? "TEACHER"
        : seatType.toUpperCase() === "STUDENT"
        ? "STUDENT"
        : "MEMBER";

    await prisma.membership.create({
      data: {
        userId: targetUserId,
        organizationId,
        role: roleName,
      },
    });
  }

  return seat;
}

/**
 * Unassigns a user from a seat without deleting the seat slot.
 */
export async function unassignSeat(seatId: string, actingUserId: string) {
  const seat = await prisma.seat.findUnique({
    where: { id: seatId },
    include: { organization: true },
  });

  if (!seat) {
    throw new Error("Seat not found.");
  }

  const adminMembership = await prisma.membership.findFirst({
    where: {
      userId: actingUserId,
      organizationId: seat.organizationId,
      role: { in: ["OWNER", "ADMIN", "owner", "admin"] },
    },
  });

  if (!adminMembership) {
    throw new TenantAccessDeniedError("Only organization Owners and Admins can unassign seats.");
  }

  return prisma.seat.update({
    where: { id: seatId },
    data: {
      assignedUserId: null,
      assignedAt: null,
    },
  });
}

/**
 * Removes a seat entirely from the organization.
 */
export async function removeSeat(seatId: string, actingUserId: string) {
  const seat = await prisma.seat.findUnique({
    where: { id: seatId },
  });

  if (!seat) {
    throw new Error("Seat not found.");
  }

  const adminMembership = await prisma.membership.findFirst({
    where: {
      userId: actingUserId,
      organizationId: seat.organizationId,
      role: { in: ["OWNER", "ADMIN", "owner", "admin"] },
    },
  });

  if (!adminMembership) {
    throw new TenantAccessDeniedError("Only organization Owners and Admins can remove seats.");
  }

  return prisma.seat.delete({
    where: { id: seatId },
  });
}
