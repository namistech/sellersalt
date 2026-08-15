-- AlterTable
ALTER TABLE "User" ADD COLUMN     "verificationEmailCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "verificationFirstSentAt" TIMESTAMP(3),
ADD COLUMN     "lastVerificationEmailAt" TIMESTAMP(3),
ADD COLUMN     "authMethods" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "targetId" TEXT,
    "targetEmail" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_event_idx" ON "AuditLog"("event");

-- CreateIndex
CREATE INDEX "AuditLog_targetId_idx" ON "AuditLog"("targetId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
