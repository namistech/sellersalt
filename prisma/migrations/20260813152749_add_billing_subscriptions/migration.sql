-- CreateEnum
CREATE TYPE "PaymentProviderMode" AS ENUM ('LIVE', 'SANDBOX');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('INCOMPLETE', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- AlterTable
ALTER TABLE "Package" ADD COLUMN     "paypalPlanId" TEXT,
ADD COLUMN     "paypalProductId" TEXT;

-- AlterTable
ALTER TABLE "PaymentProvider" DROP COLUMN "encryptedCredentials",
ADD COLUMN     "encryptedLiveCredentials" TEXT,
ADD COLUMN     "encryptedSandboxCredentials" TEXT,
ADD COLUMN     "mode" "PaymentProviderMode" NOT NULL DEFAULT 'SANDBOX';

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "provider" "PaymentProviderType" NOT NULL,
    "providerCustomerId" TEXT,
    "providerSubscriptionId" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'INCOMPLETE',
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProviderType" NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_organizationId_key" ON "Subscription"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_providerSubscriptionId_key" ON "Subscription"("providerSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_organizationId_idx" ON "Subscription"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookEvent_provider_externalEventId_key" ON "PaymentWebhookEvent"("provider", "externalEventId");

-- CreateIndex
CREATE INDEX "CrossListingEntry_crossListingId_idx" ON "CrossListingEntry"("crossListingId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

