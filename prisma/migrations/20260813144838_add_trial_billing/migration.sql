-- AlterTable
ALTER TABLE "Package" ADD COLUMN     "trialDays" INTEGER,
ADD COLUMN     "trialPriceUsd" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "PaymentProvider" ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 100;
