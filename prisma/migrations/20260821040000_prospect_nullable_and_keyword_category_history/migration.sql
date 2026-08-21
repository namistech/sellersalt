-- Batch 40: eliminate Prospect.price (and sibling non-nullable field)
-- fabrication risk, and add historical snapshot infrastructure for
-- KeywordObservation/CategoryObservation (Batch 39 audit's top
-- recommendation).

-- Prospect: six columns were non-nullable and defaulted to a fabricated
-- placeholder whenever a marketplace didn't expose the field. Widen to
-- nullable — existing rows keep their real values (Etsy's search
-- connector always populated real data), only future writes for
-- marketplaces that genuinely don't expose a field can now write NULL
-- instead of a guessed number.
ALTER TABLE "Prospect"
  ALTER COLUMN "shopAgeMonths" DROP NOT NULL,
  ALTER COLUMN "reviewCount" DROP NOT NULL,
  ALTER COLUMN "activeListings" DROP NOT NULL,
  ALTER COLUMN "reviewRatio" DROP NOT NULL,
  ALTER COLUMN "reviewVelocity" DROP NOT NULL,
  ALTER COLUMN "price" DROP NOT NULL;

-- KeywordObservation: add change-detection fingerprint (mirrors
-- ProductObservation.fingerprint).
ALTER TABLE "KeywordObservation" ADD COLUMN "fingerprint" TEXT;

-- KeywordObservationSnapshot: mirrors ProductObservationSnapshot's
-- existing pattern — one row per detected change, not per re-observation.
CREATE TABLE "KeywordObservationSnapshot" (
    "id" TEXT NOT NULL,
    "keywordObservationId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "occurrenceCount" INTEGER NOT NULL,
    "listingFrequencyPercent" DOUBLE PRECISION NOT NULL,
    "observedAveragePrice" DOUBLE PRECISION,
    "demandProxyScore" DOUBLE PRECISION NOT NULL,
    "competitionProxy" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KeywordObservationSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "KeywordObservationSnapshot_keywordObservationId_idx" ON "KeywordObservationSnapshot"("keywordObservationId");
CREATE INDEX "KeywordObservationSnapshot_fingerprint_idx" ON "KeywordObservationSnapshot"("fingerprint");
CREATE INDEX "KeywordObservationSnapshot_observedAt_idx" ON "KeywordObservationSnapshot"("observedAt");

ALTER TABLE "KeywordObservationSnapshot" ADD CONSTRAINT "KeywordObservationSnapshot_keywordObservationId_fkey"
  FOREIGN KEY ("keywordObservationId") REFERENCES "KeywordObservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CategoryObservation: same change-detection addition.
ALTER TABLE "CategoryObservation" ADD COLUMN "fingerprint" TEXT;

CREATE TABLE "CategoryObservationSnapshot" (
    "id" TEXT NOT NULL,
    "categoryObservationId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "observedCatalogCount" INTEGER NOT NULL,
    "minPrice" DOUBLE PRECISION,
    "maxPrice" DOUBLE PRECISION,
    "medianPrice" DOUBLE PRECISION,
    "averagePrice" DOUBLE PRECISION,
    "averageOpportunityScore" DOUBLE PRECISION,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryObservationSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CategoryObservationSnapshot_categoryObservationId_idx" ON "CategoryObservationSnapshot"("categoryObservationId");
CREATE INDEX "CategoryObservationSnapshot_fingerprint_idx" ON "CategoryObservationSnapshot"("fingerprint");
CREATE INDEX "CategoryObservationSnapshot_observedAt_idx" ON "CategoryObservationSnapshot"("observedAt");

ALTER TABLE "CategoryObservationSnapshot" ADD CONSTRAINT "CategoryObservationSnapshot_categoryObservationId_fkey"
  FOREIGN KEY ("categoryObservationId") REFERENCES "CategoryObservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
