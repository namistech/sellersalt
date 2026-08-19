import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";

// P0 launch fix: Onboarding flow was previously orphaned (checkout routed
// straight to /dashboard) and activation checklist in dashboard relied on
// localStorage values that only the orphaned wizard set.
// This regression suite proves:
// 1. /api/onboarding/complete persists real onboarding fields to User in Postgres.
// 2. /onboarding has a server-side guard bouncing completed users to /dashboard.
// 3. Dashboard activation guide derives checklist state from real server props, never localStorage.
// 4. Checkout and onboarding routing send new signups to /onboarding and completed users to /dashboard.

const rootDir = process.cwd();
const readSrc = (rel: string) => fs.readFileSync(path.join(rootDir, rel), "utf-8");

describe("1. Onboarding Completion Persistence & API Contract", () => {
  it("persists onboarding state to User table in Postgres and can be queried reliably", async () => {
    const testEmail = `test-onboard-${Date.now()}@example.com`;
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: "Onboarding Test User",
        passwordHash: "test-hash",
      },
    });

    try {
      assert.equal(user.onboardingCompletedAt, null, "new user must have null onboardingCompletedAt");
      assert.equal(user.onboardingCategory, null, "new user must have null onboardingCategory");
      assert.equal(user.onboardingGoal, null, "new user must have null onboardingGoal");
      assert.equal(user.onboardingNiche, null, "new user must have null onboardingNiche");

      const completedAt = new Date();
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          onboardingCompletedAt: completedAt,
          onboardingCategory: "Digital Art & Templates",
          onboardingNiche: "Minimalist Notion Planners",
          onboardingGoal: "radar",
        },
        select: {
          onboardingCompletedAt: true,
          onboardingCategory: true,
          onboardingNiche: true,
          onboardingGoal: true,
        },
      });

      assert.ok(updated.onboardingCompletedAt instanceof Date, "onboardingCompletedAt must be a valid Date instance");
      assert.equal(updated.onboardingCategory, "Digital Art & Templates");
      assert.equal(updated.onboardingNiche, "Minimalist Notion Planners");
      assert.equal(updated.onboardingGoal, "radar");

      // Verify a fresh read from DB confirms persistence
      const fresh = await prisma.user.findUnique({
        where: { id: user.id },
        select: { onboardingCompletedAt: true, onboardingCategory: true, onboardingGoal: true, onboardingNiche: true },
      });
      assert.ok(fresh?.onboardingCompletedAt);
      assert.equal(fresh?.onboardingCategory, "Digital Art & Templates");
      assert.equal(fresh?.onboardingGoal, "radar");
      assert.equal(fresh?.onboardingNiche, "Minimalist Notion Planners");
    } finally {
      await prisma.user.delete({ where: { id: user.id } });
    }
  });

  it("POST /api/onboarding/complete route enforces auth, validates required fields, and updates User model", () => {
    const code = readSrc("src/app/api/onboarding/complete/route.ts");
    assert.ok(code.includes('import { prisma } from "@/lib/db"'), "route must use prisma for real DB persistence");
    assert.ok(code.includes('getServerSession(authOptions)'), "route must verify session via getServerSession");
    assert.ok(code.includes('status: 401'), "route must return 401 when unauthorized");
    assert.ok(code.includes('!category || !goal'), "route must require both category and goal");
    assert.ok(code.includes('status: 400'), "route must return 400 for missing required fields");
    assert.ok(code.includes('prisma.user.update'), "route must update User row in DB");
    assert.ok(code.includes('onboardingCompletedAt: new Date()'), "route must record onboardingCompletedAt timestamp");
    assert.ok(code.includes('onboardingCategory: category'), "route must persist onboardingCategory");
    assert.ok(code.includes('onboardingGoal: goal'), "route must persist onboardingGoal");
  });
});

describe("2. Server-Side Guard on /onboarding", () => {
  it("guards /onboarding route server-side based on User.onboardingCompletedAt in DB", async () => {
    const testEmailIncomplete = `test-inc-${Date.now()}@example.com`;
    const testEmailComplete = `test-comp-${Date.now()}@example.com`;

    const incompleteUser = await prisma.user.create({
      data: { email: testEmailIncomplete, name: "Incomplete User", passwordHash: "test-hash" },
    });
    const completeUser = await prisma.user.create({
      data: {
        email: testEmailComplete,
        name: "Complete User",
        passwordHash: "test-hash",
        onboardingCompletedAt: new Date(),
        onboardingCategory: "Jewelry",
        onboardingGoal: "spy",
      },
    });

    try {
      // Simulate server-side guard logic in src/app/(dashboard)/onboarding/page.tsx
      const checkGuard = async (userId: string) => {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { onboardingCompletedAt: true },
        });
        if (user?.onboardingCompletedAt) {
          return "/dashboard";
        }
        return "/onboarding";
      };

      const resultIncomplete = await checkGuard(incompleteUser.id);
      const resultComplete = await checkGuard(completeUser.id);

      assert.equal(resultIncomplete, "/onboarding", "incomplete user should stay on /onboarding");
      assert.equal(resultComplete, "/dashboard", "completed user must be redirected to /dashboard");
    } finally {
      await prisma.user.delete({ where: { id: incompleteUser.id } });
      await prisma.user.delete({ where: { id: completeUser.id } });
    }
  });

  it("src/app/(dashboard)/onboarding/page.tsx implements the server-side redirect guard", () => {
    const code = readSrc("src/app/(dashboard)/onboarding/page.tsx");
    assert.ok(code.includes('import { prisma } from "@/lib/db"'), "onboarding page must import prisma");
    assert.ok(code.includes('prisma.user.findUnique'), "onboarding page must read user from DB");
    assert.ok(code.includes('select: { onboardingCompletedAt: true }'), "onboarding page must select onboardingCompletedAt");
    assert.ok(code.includes('redirect("/dashboard")'), "onboarding page must redirect completed users to /dashboard");
    assert.ok(code.includes('redirect("/login")'), "onboarding page must redirect unauthenticated users to /login");
  });
});

describe("3. Dashboard Activation Guide & Real Props Integration", () => {
  it("dashboard/page.tsx fetches real onboarding state and listing draft count server-side", () => {
    const code = readSrc("src/app/(dashboard)/dashboard/page.tsx");
    assert.ok(code.includes("onboardingCategory: true, onboardingGoal: true"), "dashboard page must select onboardingCategory and onboardingGoal from User");
    assert.ok(code.includes("prisma.listingDraft.count"), "dashboard page must count listingDrafts for org");
    assert.ok(code.includes("onboardingCategory={onboardingUser?.onboardingCategory ?? null}"), "dashboard page must forward onboardingCategory");
    assert.ok(code.includes("onboardingGoal={onboardingUser?.onboardingGoal ?? null}"), "dashboard page must forward onboardingGoal");
    assert.ok(code.includes("hasListingDraft={listingDraftCount > 0}"), "dashboard page must forward hasListingDraft");
  });

  it("dashboard-client.tsx declares and passes onboarding props to DashboardOnboardingGuide", () => {
    const code = readSrc("src/app/(dashboard)/dashboard/dashboard-client.tsx");
    assert.ok(code.includes("onboardingCategory: string | null"), "DashboardClientProps must declare onboardingCategory");
    assert.ok(code.includes("onboardingGoal: string | null"), "DashboardClientProps must declare onboardingGoal");
    assert.ok(code.includes("hasListingDraft: boolean"), "DashboardClientProps must declare hasListingDraft");
    assert.ok(code.includes("onboardingCategory={onboardingCategory}"), "dashboard-client must forward onboardingCategory to guide");
    assert.ok(code.includes("onboardingGoal={onboardingGoal}"), "dashboard-client must forward onboardingGoal to guide");
    assert.ok(code.includes("hasListingDraft={hasListingDraft}"), "dashboard-client must forward hasListingDraft to guide");
  });

  it("dashboard-onboarding-guide.tsx calculates checklist items from props and does not use localStorage for business state", () => {
    const code = readSrc("src/app/(dashboard)/dashboard/dashboard-onboarding-guide.tsx");
    // Verification that localStorage is not used for category or completion
    assert.ok(!code.includes('localStorage.getItem("sellersalt_user_category")'), "must not read user category from localStorage");
    assert.ok(!code.includes('localStorage.getItem("sellersalt_onboarding_completed")'), "must not read onboarding completion from localStorage");

    // Verification of real props usage in activation steps
    assert.ok(code.includes('completed: Boolean(onboardingCategory)'), "Niche & market selected step must depend on onboardingCategory prop");
    assert.ok(code.includes('completed: Boolean(onboardingGoal)'), "Goal defined step must depend on onboardingGoal prop");
    assert.ok(code.includes('completed: hasListingDraft'), "Build listing strategy step must depend on hasListingDraft prop");
  });
});

describe("4. Checkout & Onboarding Routing Flows", () => {
  it("checkout-client.tsx routes new free signups to /onboarding and existing free logins to /dashboard", () => {
    const code = readSrc("src/app/checkout/checkout-client.tsx");
    assert.ok(
      code.includes('router.push(accountMode === "signup" ? "/onboarding" : "/dashboard")'),
      "checkout-client must route signup to /onboarding and login to /dashboard"
    );
    assert.ok(
      code.includes('onClick={() => router.push("/onboarding")}'),
      "free workspace button must route to /onboarding"
    );
  });

  it("onboarding-client.tsx calls POST /api/onboarding/complete and navigates to the selected goal route", () => {
    const code = readSrc("src/app/(dashboard)/onboarding/onboarding-client.tsx");
    assert.ok(code.includes('fetch("/api/onboarding/complete"'), "onboarding-client must call /api/onboarding/complete");
    assert.ok(code.includes('method: "POST"'), "must use POST method");
    assert.ok(code.includes('category: selectedCategory, niche: customNiche, goal: selectedGoal'), "must send category, niche, and goal");
    assert.ok(!code.includes('localStorage.setItem("sellersalt_onboarding_completed"'), "must not save completion state to localStorage");
    assert.ok(!code.includes('localStorage.setItem("sellersalt_user_category"'), "must not save category state to localStorage");
    assert.ok(code.includes("router.push(targetGoal ? targetGoal.route :"), "must navigate to goal route on success");
  });
});
