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

  const [
    data,
    rawConnectors,
    planUsage,
    onboardingUser,
    listingDraftCount,
    rawResearchRuns,
    rawValidations,
    rawSavedOpportunities,
  ] = await Promise.all([
    getDashboardData(organizationId),
    prisma.connector.findMany({
      where: { OR: [{ organizationId }, { organizationId: null }] },
      orderBy: [{ organizationId: "desc" }, { createdAt: "desc" }],
      select: { id: true, type: true, label: true, status: true, organizationId: true },
    }),
    getPlanUsageSummary(organizationId).catch(() => null),
    userId
      ? prisma.user.findUnique({ where: { id: userId }, select: { onboardingCategory: true, onboardingGoal: true } })
      : Promise.resolve(null),
    prisma.listingDraft.count({ where: { organizationId } }),
    prisma.researchRun.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 4,
    }).catch(() => []),
    prisma.productValidation.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 4,
    }).catch(() => []),
    prisma.savedOpportunity.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 4,
    }).catch(() => []),
  ]);

  const connectors = rawConnectors.map((c) => ({
    id: c.id,
    type: c.type,
    label: c.label,
    status: c.status,
    scope: (c.organizationId ? "own" : "platform") as "own" | "platform",
  }));

  // Compile real recent activity items for personalized continuation
  const recentActivities = [
    ...rawValidations.map((v) => ({
      id: v.id,
      type: "VALIDATION" as const,
      title: v.productTitle || v.query,
      subtitle: v.recommendation || `Validated on ${v.marketplace}`,
      marketplace: v.marketplace,
      verdict: v.verdict,
      score: v.validationScore ?? undefined,
      timestamp: v.createdAt,
      href: `/validate?q=${encodeURIComponent(v.query)}`,
    })),
    ...rawSavedOpportunities.map((o) => ({
      id: o.id,
      type: "SAVED_OPPORTUNITY" as const,
      title: o.title,
      subtitle: o.subtitle || `${o.type} Opportunity on ${o.marketplace}`,
      marketplace: o.marketplace,
      verdict: o.verdict,
      score: o.score ?? undefined,
      timestamp: o.createdAt,
      href: `/favorites`,
    })),
    ...rawResearchRuns.map((r) => ({
      id: r.id,
      type: "RESEARCH_RUN" as const,
      title: r.query,
      subtitle: `${r.itemCount} observations · ${r.marketplaces.join(", ")}`,
      marketplace: r.marketplaces[0] || "etsy",
      verdict: r.status,
      timestamp: r.createdAt,
      href: `/research-center?q=${encodeURIComponent(r.query)}`,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

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
      recentActivities={recentActivities}
    />
  );
}
