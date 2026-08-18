-- CreateTable
CREATE TABLE IF NOT EXISTS "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "ctaText" TEXT,
    "ctaUrl" TEXT,
    "placement" TEXT NOT NULL DEFAULT 'TOP_BANNER',
    "audience" TEXT NOT NULL DEFAULT 'ALL',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPermanent" BOOLEAN NOT NULL DEFAULT false,
    "isClosable" BOOLEAN NOT NULL DEFAULT true,
    "displayFrequency" TEXT NOT NULL DEFAULT 'ONCE',
    "maxImpressions" INTEGER DEFAULT 3,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- AlterTable Coupon
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "behavior" TEXT DEFAULT 'PERCENTAGE_DISCOUNT';
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "duration" TEXT DEFAULT 'ONCE';
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "durationMonths" INTEGER;
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "applicablePlanKey" TEXT;
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "firstTimeOnly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "minPlanPrice" DOUBLE PRECISION;
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Announcement_isActive_idx" ON "Announcement"("isActive");
CREATE INDEX IF NOT EXISTS "Announcement_placement_idx" ON "Announcement"("placement");
CREATE INDEX IF NOT EXISTS "Announcement_audience_idx" ON "Announcement"("audience");
CREATE INDEX IF NOT EXISTS "AnnouncementRead_announcementId_idx" ON "AnnouncementRead"("announcementId");
