-- AlterTable
ALTER TABLE "Prospect" ADD COLUMN     "avgSellingRatio" DOUBLE PRECISION,
ADD COLUMN     "estDailySales" DOUBLE PRECISION,
ADD COLUMN     "isFavorite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "listingImageUrl" TEXT,
ADD COLUMN     "numFavorers" INTEGER,
ADD COLUMN     "reviewAverage" DOUBLE PRECISION,
ADD COLUMN     "shopIconUrl" TEXT,
ADD COLUMN     "totalSales" INTEGER;

-- CreateIndex
CREATE INDEX "Prospect_isFavorite_idx" ON "Prospect"("isFavorite");
