-- CreateTable
CREATE TABLE "ShopWatch" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "shopExternalId" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopWatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopSnapshot" (
    "id" TEXT NOT NULL,
    "shopWatchId" TEXT NOT NULL,
    "totalSales" INTEGER,
    "reviewCount" INTEGER NOT NULL,
    "reviewAverage" DOUBLE PRECISION,
    "activeListings" INTEGER NOT NULL,
    "numFavorers" INTEGER,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopWatch_organizationId_idx" ON "ShopWatch"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopWatch_organizationId_shopExternalId_key" ON "ShopWatch"("organizationId", "shopExternalId");

-- CreateIndex
CREATE INDEX "ShopSnapshot_shopWatchId_idx" ON "ShopSnapshot"("shopWatchId");

-- AddForeignKey
ALTER TABLE "ShopWatch" ADD CONSTRAINT "ShopWatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopWatch" ADD CONSTRAINT "ShopWatch_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "Connector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopSnapshot" ADD CONSTRAINT "ShopSnapshot_shopWatchId_fkey" FOREIGN KEY ("shopWatchId") REFERENCES "ShopWatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
