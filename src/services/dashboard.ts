import { prisma } from "@/lib/db";

// Server-only Frontend Data/Service Adapter for the Dashboard/Overview
// screen. Unlike the other adapters in this directory, there is no
// /api/dashboard route — the real backend for this screen has always
// been direct Prisma access inside the server component itself
// (src/app/(dashboard)/dashboard/page.tsx). This file only extracts
// that already-real logic into a typed, reusable function so the page
// component stays presentational — it does not invent a new network
// hop or a new backend route (docs/architecture/system.md "Service
// layer terminology": the Frontend Data/Service Adapter's job is to be
// *a* stable boundary, not necessarily an HTTP one).
//
// Import only from Server Components — this module pulls in the Prisma
// client directly and must never end up in a client bundle.

export interface DashboardJobSummary {
  id: string;
  status: string;
  createdAt: string;
  searchConfigName: string;
}

export interface DashboardData {
  connectorCount: number;
  prospectCount: number;
  trackedShopCount: number;
  /** Real Package.name + Subscription.status — replaces the previously hardcoded "Free" stat. Null for an org with no package/subscription row (e.g. an admin org that bypassed checkout). */
  plan: { name: string; status: string | null } | null;
  jobStatusData: Array<{ status: string; count: number }>;
  prospectsByDay: Array<{ day: string; count: number }>;
  recentJobs: DashboardJobSummary[];
}

export async function getDashboardData(organizationId: string): Promise<DashboardData> {
  const [connectorCount, prospectCount, trackedShopCount, recentJobs, jobStatusRaw, prospectsByDayRaw, org] =
    await Promise.all([
      prisma.connector.count({ where: { organizationId } }),
      prisma.prospect.count({ where: { organizationId } }),
      prisma.shopWatch.count({ where: { organizationId, isActive: true } }),
      prisma.job.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { searchConfig: true },
      }),
      prisma.job.groupBy({ by: ["status"], where: { organizationId }, _count: { status: true } }),
      prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
        SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*)::int AS count
        FROM "Prospect"
        WHERE "organizationId" = ${organizationId} AND "createdAt" >= NOW() - INTERVAL '14 days'
        GROUP BY day ORDER BY day ASC
      `,
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: { package: { select: { name: true } }, subscription: { select: { status: true } } },
      }),
    ]);

  return {
    connectorCount,
    prospectCount,
    trackedShopCount,
    plan: org?.package ? { name: org.package.name, status: org.subscription?.status ?? null } : null,
    jobStatusData: jobStatusRaw.map((r) => ({ status: r.status, count: r._count.status })),
    prospectsByDay: prospectsByDayRaw.map((r) => ({
      day: new Date(r.day).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      count: Number(r.count),
    })),
    recentJobs: recentJobs.map((j) => ({
      id: j.id,
      status: j.status,
      createdAt: j.createdAt.toISOString(),
      searchConfigName: j.searchConfig.name,
    })),
  };
}
