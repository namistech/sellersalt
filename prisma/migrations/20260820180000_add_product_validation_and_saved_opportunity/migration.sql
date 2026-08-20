-- CreateTable
CREATE TABLE "SavedOpportunity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "marketplace" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "verdict" TEXT NOT NULL,
    "verdictVariant" TEXT NOT NULL DEFAULT 'info',
    "evidenceJson" JSONB,
    "provenanceJson" JSONB,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "firstObservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastObservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductValidation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "researchRunId" TEXT,
    "productId" TEXT,
    "productTitle" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "marketplace" TEXT NOT NULL,
    "category" TEXT,
    "niche" TEXT,
    "verdict" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "validationScore" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "depth" TEXT NOT NULL DEFAULT 'STANDARD',
    "demandAssessmentJson" JSONB,
    "competitionAssessmentJson" JSONB,
    "economicsAssessmentJson" JSONB,
    "momentumAssessmentJson" JSONB,
    "differentiationAssessmentJson" JSONB,
    "evidenceJson" JSONB,
    "risksJson" JSONB,
    "unknownsJson" JSONB,
    "limitationsJson" JSONB,
    "nextActionsJson" JSONB,
    "userEconomicsJson" JSONB,
    "firstObservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastObservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductValidation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedOpportunity_organizationId_idx" ON "SavedOpportunity"("organizationId");

-- CreateIndex
CREATE INDEX "SavedOpportunity_type_idx" ON "SavedOpportunity"("type");

-- CreateIndex
CREATE INDEX "SavedOpportunity_marketplace_idx" ON "SavedOpportunity"("marketplace");

-- CreateIndex
CREATE INDEX "SavedOpportunity_score_idx" ON "SavedOpportunity"("score");

-- CreateIndex
CREATE INDEX "SavedOpportunity_createdAt_idx" ON "SavedOpportunity"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SavedOpportunity_organizationId_type_marketplace_targetId_key" ON "SavedOpportunity"("organizationId", "type", "marketplace", "targetId");

-- CreateIndex
CREATE INDEX "ProductValidation_organizationId_idx" ON "ProductValidation"("organizationId");

-- CreateIndex
CREATE INDEX "ProductValidation_marketplace_idx" ON "ProductValidation"("marketplace");

-- CreateIndex
CREATE INDEX "ProductValidation_verdict_idx" ON "ProductValidation"("verdict");

-- CreateIndex
CREATE INDEX "ProductValidation_validationScore_idx" ON "ProductValidation"("validationScore");

-- CreateIndex
CREATE INDEX "ProductValidation_createdAt_idx" ON "ProductValidation"("createdAt");

-- CreateIndex
CREATE INDEX "ProductValidation_productId_idx" ON "ProductValidation"("productId");

-- AddForeignKey
ALTER TABLE "SavedOpportunity" ADD CONSTRAINT "SavedOpportunity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductValidation" ADD CONSTRAINT "ProductValidation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductValidation" ADD CONSTRAINT "ProductValidation_researchRunId_fkey" FOREIGN KEY ("researchRunId") REFERENCES "ResearchRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
