-- AlterTable
ALTER TABLE "User" ADD COLUMN     "suspendedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Package" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;
