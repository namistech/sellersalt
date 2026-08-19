-- Real onboarding activation state (additive only). Persists the same
-- category/niche/goal the /onboarding wizard already collected (previously
-- only ever written to localStorage, which the dashboard's activation
-- checklist read as if it were a trustworthy business fact — it wasn't,
-- since only the orphaned /onboarding page ever set it). Written by
-- POST /api/onboarding/complete only.
--
-- NOTE: this migration was generated alongside unrelated pre-existing schema
-- drift (Announcement.updatedAt default, Coupon column defaults, a missing
-- AnnouncementRead FK) that predates this change and is intentionally NOT
-- included here — see AGENTS.md §19 / docs/SELLERSALT-ARCHITECTURE-AUDIT.md,
-- "Pre-existing schema drift" for that separate, already-flagged issue.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "onboardingCategory" TEXT,
ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "onboardingGoal" TEXT,
ADD COLUMN     "onboardingNiche" TEXT;
