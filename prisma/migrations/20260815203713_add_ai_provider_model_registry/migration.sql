-- CreateEnum
CREATE TYPE "AiProviderType" AS ENUM ('OPENROUTER', 'NVIDIA', 'GEMINI', 'OPENAI');

-- CreateTable
CREATE TABLE "AiProvider" (
    "id" TEXT NOT NULL,
    "provider" "AiProviderType" NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "encryptedApiKey" TEXT,
    "defaultModelId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "modelsLastFetchedAt" TIMESTAMP(3),
    "lastTestedAt" TIMESTAMP(3),
    "lastTestOk" BOOLEAN,
    "lastTestMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiModel" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "contextLength" INTEGER,
    "inputPricePerMillion" DOUBLE PRECISION,
    "outputPricePerMillion" DOUBLE PRECISION,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "supportsVision" BOOLEAN NOT NULL DEFAULT false,
    "supportsTools" BOOLEAN NOT NULL DEFAULT false,
    "supportsStructuredOutput" BOOLEAN NOT NULL DEFAULT false,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiModel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiProvider_provider_key" ON "AiProvider"("provider");

-- CreateIndex
CREATE INDEX "AiProvider_priority_idx" ON "AiProvider"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "AiModel_providerId_modelId_key" ON "AiModel"("providerId", "modelId");

-- CreateIndex
CREATE INDEX "AiModel_providerId_idx" ON "AiModel"("providerId");

-- AddForeignKey
ALTER TABLE "AiModel" ADD CONSTRAINT "AiModel_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AiProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed the 4 known providers, migrating any already-configured API key
-- straight over from the old AppSetting-based storage (same encryption
-- module/cipher, so the encrypted value carries over as-is — no need to
-- decrypt and re-encrypt, and the admin doesn't have to re-enter a key
-- that already worked).
INSERT INTO "AiProvider" ("id", "provider", "label", "isActive", "encryptedApiKey", "priority", "updatedAt")
SELECT
    'aiprov_' || lower(p.provider),
    p.provider::"AiProviderType",
    p.label,
    (s.value IS NOT NULL),
    s.value,
    p.priority,
    CURRENT_TIMESTAMP
FROM (VALUES
    ('OPENROUTER', 'OpenRouter', 'openrouter_api_key', 1),
    ('NVIDIA', 'NVIDIA', 'nvidia_api_key', 2),
    ('GEMINI', 'Google Gemini', 'gemini_api_key', 3),
    ('OPENAI', 'OpenAI', 'openai_api_key', 4)
) AS p(provider, label, setting_key, priority)
LEFT JOIN "AppSetting" s ON s.key = p.setting_key
ON CONFLICT ("provider") DO NOTHING;

-- The old generic-settings copies of these keys are now superseded by the
-- dedicated AiProvider table above (which also carries status/priority/
-- model-selection, unlike the plain key-value AppSetting rows) — remove
-- them so there's exactly one place credentials live, not two.
DELETE FROM "AppSetting" WHERE "key" IN ('openrouter_api_key', 'nvidia_api_key', 'gemini_api_key', 'openai_api_key');
