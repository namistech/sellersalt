-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerified" TIMESTAMP(3);

-- Backfill: accounts that already existed before this field was added are
-- treated as verified as of their signup date, so this only gates new
-- signups going forward rather than nagging every existing user.
UPDATE "User" SET "emailVerified" = "createdAt" WHERE "emailVerified" IS NULL;
