-- CreateTable
CREATE TABLE "PlannedKeyword" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "sourceShopExternalId" TEXT,
    "sourceListingUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlannedKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlannedKeyword_organizationId_keyword_key" ON "PlannedKeyword"("organizationId", "keyword");

-- CreateIndex
CREATE INDEX "PlannedKeyword_organizationId_idx" ON "PlannedKeyword"("organizationId");

-- AddForeignKey
ALTER TABLE "PlannedKeyword" ADD CONSTRAINT "PlannedKeyword_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
