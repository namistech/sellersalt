-- Batch 38: Product Research Data Contract — additive fields for
-- ProductObservation/ProductObservationSnapshot to persist the fields
-- Batch 37's adapters now observe (category, brand, badges, availability,
-- seller URL, fulfillment/shipping text, Amazon's Best Sellers Rank, and
-- which search keyword produced each observation under multi-keyword
-- search) plus availability/shopName/rank history on snapshots.

ALTER TABLE "ProductObservation"
  ADD COLUMN "imageUrl" TEXT,
  ADD COLUMN "shopUrl" TEXT,
  ADD COLUMN "keyword" TEXT,
  ADD COLUMN "brand" TEXT,
  ADD COLUMN "badges" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "availability" TEXT,
  ADD COLUMN "shippingInfo" TEXT,
  ADD COLUMN "bestSellerRankJson" TEXT;

ALTER TABLE "ProductObservationSnapshot"
  ADD COLUMN "availability" TEXT,
  ADD COLUMN "shopName" TEXT,
  ADD COLUMN "bestSellerRankJson" TEXT;
