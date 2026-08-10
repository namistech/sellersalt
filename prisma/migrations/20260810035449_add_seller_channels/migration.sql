-- CreateEnum
CREATE TYPE "SellerChannelPlatform" AS ENUM ('SHOPIFY', 'WOOCOMMERCE', 'ETSY_SELLER', 'EBAY_SELLER');

-- AlterTable
ALTER TABLE "Package" ADD COLUMN     "maxSellerChannels" INTEGER NOT NULL DEFAULT 2;

-- CreateTable
CREATE TABLE "SellerChannel" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "platform" "SellerChannelPlatform" NOT NULL,
    "label" TEXT NOT NULL,
    "storeUrl" TEXT NOT NULL,
    "encryptedCredentials" TEXT NOT NULL,
    "status" "ConnectorStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerOrder" (
    "id" TEXT NOT NULL,
    "sellerChannelId" TEXT NOT NULL,
    "externalOrderId" TEXT NOT NULL,
    "orderNumber" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "placedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SellerOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SellerChannel_organizationId_idx" ON "SellerChannel"("organizationId");

-- CreateIndex
CREATE INDEX "SellerOrder_sellerChannelId_idx" ON "SellerOrder"("sellerChannelId");

-- CreateIndex
CREATE INDEX "SellerOrder_placedAt_idx" ON "SellerOrder"("placedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SellerOrder_sellerChannelId_externalOrderId_key" ON "SellerOrder"("sellerChannelId", "externalOrderId");

-- AddForeignKey
ALTER TABLE "SellerChannel" ADD CONSTRAINT "SellerChannel_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerOrder" ADD CONSTRAINT "SellerOrder_sellerChannelId_fkey" FOREIGN KEY ("sellerChannelId") REFERENCES "SellerChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
