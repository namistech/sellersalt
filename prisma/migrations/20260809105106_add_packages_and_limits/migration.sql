-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "packageId" TEXT;

-- CreateTable
CREATE TABLE "Package" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "maxConnectors" INTEGER NOT NULL DEFAULT 1,
    "maxSearchConfigs" INTEGER NOT NULL DEFAULT 3,
    "maxScheduledSearches" INTEGER NOT NULL DEFAULT 1,
    "maxTrackedShops" INTEGER NOT NULL DEFAULT 5,
    "maxProspectsPerMonth" INTEGER NOT NULL DEFAULT 200,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Package_key_key" ON "Package"("key");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;
