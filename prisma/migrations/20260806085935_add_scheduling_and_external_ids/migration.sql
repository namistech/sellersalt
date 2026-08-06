/*
  Warnings:

  - Added the required column `listingExternalId` to the `Prospect` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shopExternalId` to the `Prospect` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Prospect" ADD COLUMN     "listingExternalId" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "shopExternalId" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "Prospect_shopExternalId_idx" ON "Prospect"("shopExternalId");

-- CreateIndex
CREATE INDEX "Prospect_listingExternalId_idx" ON "Prospect"("listingExternalId");