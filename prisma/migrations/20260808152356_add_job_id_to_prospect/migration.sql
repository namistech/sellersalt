-- AlterTable
ALTER TABLE "Prospect" ADD COLUMN     "jobId" TEXT;

-- CreateIndex
CREATE INDEX "Prospect_jobId_idx" ON "Prospect"("jobId");
