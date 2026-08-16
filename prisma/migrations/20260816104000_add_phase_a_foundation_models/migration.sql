-- CreateEnum
CREATE TYPE "PlannerItemType" AS ENUM ('PRODUCT_RESEARCH', 'SHOP_RESEARCH', 'KEYWORD_RESEARCH', 'CONTENT_IDEA', 'LISTING_CONCEPT', 'SEO_TASK', 'EXECUTION_TASK');

-- CreateEnum
CREATE TYPE "PlannerItemStatus" AS ENUM ('BACKLOG', 'IN_PROGRESS', 'READY_FOR_DRAFT', 'DRAFT_CREATED', 'PUBLISHED_TO_ETSY', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ListingDraftStatus" AS ENUM ('DRAFT', 'GENERATED', 'EDITED_BY_USER', 'APPROVED', 'PUSHED_TO_ETSY', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EtsyExecutionOperation" AS ENUM ('CREATE_DRAFT_LISTING', 'UPDATE_LISTING', 'UPLOAD_LISTING_IMAGE', 'DELETE_LISTING_IMAGE', 'UPDATE_INVENTORY', 'PUBLISH_LISTING', 'SYNC_RECEIPTS');

-- CreateEnum
CREATE TYPE "EtsyExecutionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED', 'RETRYING');

-- CreateTable
CREATE TABLE "PlannerItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "PlannerItemType" NOT NULL,
    "title" TEXT NOT NULL,
    "status" "PlannerItemStatus" NOT NULL DEFAULT 'BACKLOG',
    "priority" INTEGER NOT NULL DEFAULT 3,
    "notes" TEXT,
    "metadata" JSONB,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "sourceShopExternalId" TEXT,
    "sourceShopName" TEXT,
    "sourceListingUrl" TEXT,
    "sourceListingTitle" TEXT,
    "researchSnapshot" JSONB,
    "targetCategory" TEXT,
    "targetPrice" DOUBLE PRECISION,
    "estimatedCogs" DOUBLE PRECISION,
    "targetKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannerItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingDraft" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "plannerItemId" TEXT,
    "sellerChannelId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "materials" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "taxonomyId" INTEGER,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 999,
    "whoMade" TEXT NOT NULL DEFAULT 'i_did',
    "whenMade" TEXT NOT NULL DEFAULT '2020_2026',
    "isSupply" BOOLEAN NOT NULL DEFAULT false,
    "isCustomizable" BOOLEAN NOT NULL DEFAULT false,
    "personalizationInstructions" TEXT,
    "state" TEXT NOT NULL DEFAULT 'draft',
    "generationPrompt" TEXT,
    "aiModelUsed" TEXT,
    "generationMetadata" JSONB,
    "originalityScore" DOUBLE PRECISION,
    "originalityStatus" TEXT,
    "maxCommonSubstring" INTEGER,
    "seoScore" INTEGER,
    "status" "ListingDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "etsyListingId" TEXT,
    "etsyDraftUrl" TEXT,
    "lastPushedAt" TIMESTAMP(3),
    "lastPushError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingSeoAudit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "plannerItemId" TEXT,
    "listingDraftId" TEXT,
    "sellerChannelId" TEXT,
    "externalListingId" TEXT,
    "overallScore" INTEGER NOT NULL,
    "titleScore" INTEGER NOT NULL,
    "tagScore" INTEGER NOT NULL,
    "keywordSynergyScore" INTEGER NOT NULL,
    "descriptionScore" INTEGER NOT NULL,
    "taxonomyScore" INTEGER NOT NULL,
    "attributeScore" INTEGER NOT NULL,
    "titleCharCount" INTEGER NOT NULL,
    "tagCount" INTEGER NOT NULL,
    "tagsOver20Chars" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "duplicateTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "singleWordTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "missingAttributes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "diagnostics" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "beforeAfterState" JSONB,
    "provenance" TEXT NOT NULL DEFAULT 'SELLERSALT_SCORE',
    "auditVersion" TEXT NOT NULL DEFAULT '1.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingSeoAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtsyExecutionLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "sellerChannelId" TEXT,
    "listingDraftId" TEXT,
    "operationType" "EtsyExecutionOperation" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "etsyResourceId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "requestPayload" JSONB NOT NULL,
    "responseStatusCode" INTEGER,
    "responsePayload" JSONB,
    "status" "EtsyExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EtsyExecutionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlannerItem_organizationId_idx" ON "PlannerItem"("organizationId");
CREATE INDEX "PlannerItem_organizationId_status_idx" ON "PlannerItem"("organizationId", "status");
CREATE INDEX "PlannerItem_organizationId_type_idx" ON "PlannerItem"("organizationId", "type");
CREATE INDEX "PlannerItem_sourceId_idx" ON "PlannerItem"("sourceId");
CREATE INDEX "PlannerItem_userId_idx" ON "PlannerItem"("userId");

-- CreateIndex
CREATE INDEX "ListingDraft_organizationId_idx" ON "ListingDraft"("organizationId");
CREATE INDEX "ListingDraft_plannerItemId_idx" ON "ListingDraft"("plannerItemId");
CREATE INDEX "ListingDraft_sellerChannelId_idx" ON "ListingDraft"("sellerChannelId");
CREATE INDEX "ListingDraft_status_idx" ON "ListingDraft"("status");
CREATE INDEX "ListingDraft_etsyListingId_idx" ON "ListingDraft"("etsyListingId");

-- CreateIndex
CREATE INDEX "ListingSeoAudit_organizationId_idx" ON "ListingSeoAudit"("organizationId");
CREATE INDEX "ListingSeoAudit_plannerItemId_idx" ON "ListingSeoAudit"("plannerItemId");
CREATE INDEX "ListingSeoAudit_listingDraftId_idx" ON "ListingSeoAudit"("listingDraftId");
CREATE INDEX "ListingSeoAudit_externalListingId_idx" ON "ListingSeoAudit"("externalListingId");
CREATE INDEX "ListingSeoAudit_sellerChannelId_idx" ON "ListingSeoAudit"("sellerChannelId");

-- CreateIndex
CREATE UNIQUE INDEX "EtsyExecutionLog_idempotencyKey_key" ON "EtsyExecutionLog"("idempotencyKey");
CREATE INDEX "EtsyExecutionLog_organizationId_idx" ON "EtsyExecutionLog"("organizationId");
CREATE INDEX "EtsyExecutionLog_sellerChannelId_idx" ON "EtsyExecutionLog"("sellerChannelId");
CREATE INDEX "EtsyExecutionLog_listingDraftId_idx" ON "EtsyExecutionLog"("listingDraftId");
CREATE INDEX "EtsyExecutionLog_status_idx" ON "EtsyExecutionLog"("status");
CREATE INDEX "EtsyExecutionLog_createdAt_idx" ON "EtsyExecutionLog"("createdAt");

-- AddForeignKey
ALTER TABLE "PlannerItem" ADD CONSTRAINT "PlannerItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlannerItem" ADD CONSTRAINT "PlannerItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingDraft" ADD CONSTRAINT "ListingDraft_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ListingDraft" ADD CONSTRAINT "ListingDraft_plannerItemId_fkey" FOREIGN KEY ("plannerItemId") REFERENCES "PlannerItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ListingDraft" ADD CONSTRAINT "ListingDraft_sellerChannelId_fkey" FOREIGN KEY ("sellerChannelId") REFERENCES "SellerChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingSeoAudit" ADD CONSTRAINT "ListingSeoAudit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ListingSeoAudit" ADD CONSTRAINT "ListingSeoAudit_plannerItemId_fkey" FOREIGN KEY ("plannerItemId") REFERENCES "PlannerItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ListingSeoAudit" ADD CONSTRAINT "ListingSeoAudit_listingDraftId_fkey" FOREIGN KEY ("listingDraftId") REFERENCES "ListingDraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ListingSeoAudit" ADD CONSTRAINT "ListingSeoAudit_sellerChannelId_fkey" FOREIGN KEY ("sellerChannelId") REFERENCES "SellerChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyExecutionLog" ADD CONSTRAINT "EtsyExecutionLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EtsyExecutionLog" ADD CONSTRAINT "EtsyExecutionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EtsyExecutionLog" ADD CONSTRAINT "EtsyExecutionLog_sellerChannelId_fkey" FOREIGN KEY ("sellerChannelId") REFERENCES "SellerChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EtsyExecutionLog" ADD CONSTRAINT "EtsyExecutionLog_listingDraftId_fkey" FOREIGN KEY ("listingDraftId") REFERENCES "ListingDraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;
