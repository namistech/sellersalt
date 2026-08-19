import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDashboardData } from "@/services/dashboard";
import { getPlanUsageSummary } from "@/services/plans/quota-enforcement";
import { PageHeader } from "@/components/shell";
import { Card } from "@/components/ui";
import { EmptyState } from "@/components/data";
import { DashboardClient } from "./dashboard-client";

export default async function OverviewPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; organizationId?: string; name?: string | null; email?: string | null } | undefined;
  const organizationId = user?.organizationId;
  const userId = user?.id;
  const userName = user?.name ?? user?.email?.split("@")[0] ?? "there";

  if (!organizationId) {
    return (
      <div>
        <PageHeader title="Overview" />
        <Card padding="lg">
          <EmptyState
            title="Your account isn't linked to a workspace yet"
            description="Try signing out and back in — if this persists, contact support."
          />
        </Card>
      </div>
    );
  }

  const [data, rawConnectors, planUsage, onboardingUser, listingDraftCount] = await Promise.all([
    getDashboardData(organizationId),
    prisma.connector.findMany({
      where: { OR: [{ organizationId }, { organizationId: null }] },
      orderBy: [{ organizationId: "desc" }, { createdAt: "desc" }],
      select: { id: true, type: true, label: true, status: true, organizationId: true },
    }),
    // Real plan/usage data for PlanUsageCard — never fabricated. A lookup
    // failure renders an explicit unavailable state (see PlanUsageCard),
    // not fake numbers.
    getPlanUsageSummary(organizationId).catch(() => null),
    // Real onboarding activation state (User.onboarding*, set only by
    // POST /api/onboarding/complete) — never localStorage, see
    // dashboard-onboarding-guide.tsx.
    userId
      ? prisma.user.findUnique({ where: { id: userId }, select: { onboardingCategory: true, onboardingGoal: true } })
      : Promise.resolve(null),
    prisma.listingDraft.count({ where: { organizationId } }),
  ]);

  const connectors = rawConnectors.map((c) => ({
    id: c.id,
    type: c.type,
    label: c.label,
    status: c.status,
    scope: (c.organizationId ? "own" : "platform") as "own" | "platform",
  }));

  return (
    <DashboardClient
      initialData={data}
      connectors={connectors}
      userName={userName}
      organizationId={organizationId}
      planUsage={planUsage}
      onboardingCategory={onboardingUser?.onboardingCategory ?? null}
      onboardingGoal={onboardingUser?.onboardingGoal ?? null}
      hasListingDraft={listingDraftCount > 0}
    />
  );
}
