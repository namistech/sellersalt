-- AlterTable
ALTER TABLE "Package" ADD COLUMN     "maxTrackingDays" INTEGER NOT NULL DEFAULT 3;

-- CreateTable
CREATE TABLE "AnnouncementRead" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingWatch" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "listingExternalId" TEXT NOT NULL,
    "shopExternalId" TEXT,
    "shopName" TEXT,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingWatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingSnapshot" (
    "id" TEXT NOT NULL,
    "listingWatchId" TEXT NOT NULL,
    "price" DOUBLE PRECISION,
    "currency" TEXT,
    "quantity" INTEGER,
    "numFavorers" INTEGER,
    "state" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingAlert" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetTitle" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "previousValue" DOUBLE PRECISION,
    "currentValue" DOUBLE PRECISION,
    "delta" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackingAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnnouncementRead_userId_idx" ON "AnnouncementRead"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementRead_userId_announcementId_key" ON "AnnouncementRead"("userId", "announcementId");

-- CreateIndex
CREATE INDEX "ListingWatch_organizationId_idx" ON "ListingWatch"("organizationId");

-- CreateIndex
CREATE INDEX "ListingWatch_listingExternalId_idx" ON "ListingWatch"("listingExternalId");

-- CreateIndex
CREATE UNIQUE INDEX "ListingWatch_organizationId_listingExternalId_key" ON "ListingWatch"("organizationId", "listingExternalId");

-- CreateIndex
CREATE INDEX "ListingSnapshot_listingWatchId_idx" ON "ListingSnapshot"("listingWatchId");

-- CreateIndex
CREATE INDEX "ListingSnapshot_capturedAt_idx" ON "ListingSnapshot"("capturedAt");

-- CreateIndex
CREATE INDEX "TrackingAlert_organizationId_idx" ON "TrackingAlert"("organizationId");

-- CreateIndex
CREATE INDEX "TrackingAlert_targetId_idx" ON "TrackingAlert"("targetId");

-- CreateIndex
CREATE INDEX "TrackingAlert_createdAt_idx" ON "TrackingAlert"("createdAt");

-- CreateIndex
CREATE INDEX "ShopSnapshot_capturedAt_idx" ON "ShopSnapshot"("capturedAt");

-- AddForeignKey
ALTER TABLE "AnnouncementRead" ADD CONSTRAINT "AnnouncementRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingWatch" ADD CONSTRAINT "ListingWatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingSnapshot" ADD CONSTRAINT "ListingSnapshot_listingWatchId_fkey" FOREIGN KEY ("listingWatchId") REFERENCES "ListingWatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingAlert" ADD CONSTRAINT "TrackingAlert_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
