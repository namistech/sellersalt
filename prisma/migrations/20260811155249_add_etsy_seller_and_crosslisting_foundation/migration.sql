-- CreateTable
CREATE TABLE "CrossListing" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrossListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrossListingEntry" (
    "id" TEXT NOT NULL,
    "crossListingId" TEXT NOT NULL,
    "sellerChannelId" TEXT NOT NULL,
    "externalListingId" TEXT,
    "isSource" BOOLEAN NOT NULL DEFAULT false,
    "lastPushedAt" TIMESTAMP(3),
    "lastPushError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrossListingEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrossListing_organizationId_idx" ON "CrossListing"("organizationId");

-- CreateIndex
CREATE INDEX "CrossListingEntry_sellerChannelId_idx" ON "CrossListingEntry"("sellerChannelId");

-- CreateIndex
CREATE UNIQUE INDEX "CrossListingEntry_crossListingId_sellerChannelId_key" ON "CrossListingEntry"("crossListingId", "sellerChannelId");

-- AddForeignKey
ALTER TABLE "CrossListing" ADD CONSTRAINT "CrossListing_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrossListingEntry" ADD CONSTRAINT "CrossListingEntry_crossListingId_fkey" FOREIGN KEY ("crossListingId") REFERENCES "CrossListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrossListingEntry" ADD CONSTRAINT "CrossListingEntry_sellerChannelId_fkey" FOREIGN KEY ("sellerChannelId") REFERENCES "SellerChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
