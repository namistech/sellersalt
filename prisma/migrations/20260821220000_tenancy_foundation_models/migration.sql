-- Batch 1: Tenancy Foundation (Organization Type, Membership Role, Engagement, Seat)

-- CreateEnum: OrganizationType
CREATE TYPE "OrganizationType" AS ENUM ('INDIVIDUAL', 'AGENCY', 'INSTITUTE', 'COMPANY');

-- CreateEnum: EngagementStatus
CREATE TYPE "EngagementStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'EXPIRED', 'REVOKED');

-- AlterTable: Organization
ALTER TABLE "Organization"
    ADD COLUMN "type" "OrganizationType" NOT NULL DEFAULT 'INDIVIDUAL',
    ADD COLUMN "isPublicDirectory" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "directorySlug" TEXT,
    ADD COLUMN "directoryBio" TEXT,
    ADD COLUMN "directoryServices" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "Organization_directorySlug_key" ON "Organization"("directorySlug");

-- AlterTable: Membership (widen role to TEXT for arbitrary org-type roles)
ALTER TABLE "Membership" ALTER COLUMN "role" TYPE TEXT;
ALTER TABLE "Membership" ALTER COLUMN "role" SET DEFAULT 'OWNER';

-- CreateTable: Engagement
CREATE TABLE "Engagement" (
    "id" TEXT NOT NULL,
    "grantorOrgId" TEXT NOT NULL,
    "granteeOrgId" TEXT,
    "granteeUserId" TEXT,
    "scope" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "EngagementStatus" NOT NULL DEFAULT 'PENDING',
    "contractTerms" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Engagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Seat
CREATE TABLE "Seat" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "seatType" TEXT NOT NULL DEFAULT 'STANDARD',
    "assignedUserId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Seat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Engagement
CREATE INDEX "Engagement_grantorOrgId_idx" ON "Engagement"("grantorOrgId");
CREATE INDEX "Engagement_granteeOrgId_idx" ON "Engagement"("granteeOrgId");
CREATE INDEX "Engagement_granteeUserId_idx" ON "Engagement"("granteeUserId");
CREATE INDEX "Engagement_status_idx" ON "Engagement"("status");

-- CreateIndex: Seat
CREATE INDEX "Seat_organizationId_idx" ON "Seat"("organizationId");
CREATE INDEX "Seat_assignedUserId_idx" ON "Seat"("assignedUserId");
CREATE INDEX "Seat_seatType_idx" ON "Seat"("seatType");

-- AddForeignKey: Engagement
ALTER TABLE "Engagement" ADD CONSTRAINT "Engagement_grantorOrgId_fkey"
    FOREIGN KEY ("grantorOrgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Engagement" ADD CONSTRAINT "Engagement_granteeOrgId_fkey"
    FOREIGN KEY ("granteeOrgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Engagement" ADD CONSTRAINT "Engagement_granteeUserId_fkey"
    FOREIGN KEY ("granteeUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Seat
ALTER TABLE "Seat" ADD CONSTRAINT "Seat_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Seat" ADD CONSTRAINT "Seat_assignedUserId_fkey"
    FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
