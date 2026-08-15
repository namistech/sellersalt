import { prisma } from "@/lib/db";

// Server-only Frontend Data/Service Adapter for the Dashboard/Overview
// screen. Functions as the typed data provider for the SellerSalt
// Intelligence Command Center.
//
// Import only from Server Components — this module pulls in the Prisma
// client directly and must never end up in a client bundle.

export interface DashboardOpportunityItem {
  id: string;
  keyword: string;
  shopExternalId: string;
  shopName: string;
  shopUrl: string;
  listingTitle: string;
  listingUrl: string;
  listingImageUrl: string | null;
  price: number;
  totalSales: number | null;
  avgSellingRatio: number | null;
  estDailySales: number | null;
  reviewCount: number;
  shopAgeMonths: number;
  status: "PENDING_REVIEW" | "SHORTLISTED" | "CONTACTED" | "REJECTED";
  isFavorite: boolean;
  createdAt: string;
}

export interface DashboardCompetitorItem {
  shopExternalId: string;
  shopName: string;
  trackingSince: string;
  latestSnapshot: {
    capturedAt: string;
    totalSales: number | null;
    reviewCount: number;
    activeListings: number;
  } | null;
  previousSnapshot: {
    capturedAt: string;
    totalSales: number | null;
    reviewCount: number;
  } | null;
  salesDelta: number | null;
  reviewDelta: number | null;
}

export interface DashboardSearchStreamItem {
  id: string;
  name: string;
  keywords: string[];
  scheduleCron: string | null;
  prospectCount: number;
  lastRunAt: string | null;
  lastRunYield: number | null;
}

export interface DashboardRecentRunItem {
  id: string;
  searchConfigName: string;
  status: string;
  resultCount: number | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface DashboardPulseStats {
  activeSearches: number;
  scheduledSearches: number;
  maxSearches: number;
  totalProspects: number;
  pendingProspects: number;
  shortlistedProspects: number;
  favoriteProspects: number;
  savedOpportunities: number;
  trackedShops: number;
  maxTrackedShops: number;
  freshTrackedShops: number;
  planName: string;
}

export interface DashboardData {
  pulse: DashboardPulseStats;
  topOpportunities: DashboardOpportunityItem[];
  competitorRadar: DashboardCompetitorItem[];
  prospectsByDay: Array<{ day: string; count: number }>;
  searchStreams: DashboardSearchStreamItem[];
  recentRuns: DashboardRecentRunItem[];
}

export async function getDashboardData(organizationId: string): Promise<DashboardData> {
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 3600 * 1000);

  const [
    activeSearchesCount,
    scheduledSearchesCount,
    totalProspectsCount,
    pendingProspectsCount,
    shortlistedProspectsCount,
    favoriteProspectsCount,
    trackedShopsCount,
    org,
    rawTopOpportunities,
    rawTrackedShops,
    rawProspectsByDay,
    rawSearchStreams,
    rawRecentJobs,
  ] = await Promise.all([
    prisma.searchConfig.count({ where: { organizationId, isActive: true } }),
    prisma.searchConfig.count({ where: { organizationId, isActive: true, scheduleCron: { not: null } } }),
    prisma.prospect.count({ where: { organizationId } }),
    prisma.prospect.count({ where: { organizationId, status: "PENDING_REVIEW" } }),
    prisma.prospect.count({ where: { organizationId, status: "SHORTLISTED" } }),
    prisma.prospect.count({ where: { organizationId, isFavorite: true } }),
    prisma.shopWatch.count({ where: { organizationId, isActive: true } }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        package: {
          select: {
            name: true,
            maxSearchConfigs: true,
            maxTrackedShops: true,
            maxScheduledSearches: true,
          },
        },
        subscription: { select: { status: true } },
      },
    }),
    // Top opportunities: prioritize pending/shortlisted with high velocity or demand
    prisma.prospect.findMany({
      where: {
        organizationId,
      },
      orderBy: [
        { estDailySales: "desc" },
        { avgSellingRatio: "desc" },
        { createdAt: "desc" },
      ],
      take: 6,
    }),
    // Tracked shops with their 2 most recent snapshots for real sales deltas
    prisma.shopWatch.findMany({
      where: { organizationId, isActive: true },
      include: {
        snapshots: {
          orderBy: { capturedAt: "desc" },
          take: 2,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    // 14-day discovery momentum
    prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*)::int AS count
      FROM "Prospect"
      WHERE "organizationId" = ${organizationId} AND "createdAt" >= NOW() - INTERVAL '14 days'
      GROUP BY day ORDER BY day ASC
    `,
    // Active search configurations with yield & last run
    prisma.searchConfig.findMany({
      where: { organizationId, isActive: true },
      include: {
        _count: { select: { prospects: true } },
        jobs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { finishedAt: true, resultCount: true, status: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    // Recent search executions (Jobs)
    prisma.job.findMany({
      where: { organizationId },
      include: { searchConfig: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  // Transform Competitor Radar items & calculate snapshot deltas
  let freshTrackedCount = 0;
  const competitorRadar: DashboardCompetitorItem[] = rawTrackedShops.map((sw) => {
    const latest = sw.snapshots[0] ?? null;
    const previous = sw.snapshots[1] ?? null;

    if (latest && new Date(latest.capturedAt) >= fortyEightHoursAgo) {
      freshTrackedCount += 1;
    }

    const salesDelta =
      latest?.totalSales != null && previous?.totalSales != null
        ? latest.totalSales - previous.totalSales
        : null;

    const reviewDelta =
      latest?.reviewCount != null && previous?.reviewCount != null
        ? latest.reviewCount - previous.reviewCount
        : null;

    return {
      shopExternalId: sw.shopExternalId,
      shopName: sw.shopName,
      trackingSince: sw.createdAt.toISOString(),
      latestSnapshot: latest
        ? {
            capturedAt: latest.capturedAt.toISOString(),
            totalSales: latest.totalSales,
            reviewCount: latest.reviewCount,
            activeListings: latest.activeListings,
          }
        : null,
      previousSnapshot: previous
        ? {
            capturedAt: previous.capturedAt.toISOString(),
            totalSales: previous.totalSales,
            reviewCount: previous.reviewCount,
          }
        : null,
      salesDelta,
      reviewDelta,
    };
  });

  const topOpportunities: DashboardOpportunityItem[] = rawTopOpportunities.map((p) => ({
    id: p.id,
    keyword: p.keyword,
    shopExternalId: p.shopExternalId,
    shopName: p.shopName,
    shopUrl: p.shopUrl,
    listingTitle: p.listingTitle,
    listingUrl: p.listingUrl,
    listingImageUrl: p.listingImageUrl,
    price: p.price,
    totalSales: p.totalSales,
    avgSellingRatio: p.avgSellingRatio,
    estDailySales: p.estDailySales,
    reviewCount: p.reviewCount,
    shopAgeMonths: p.shopAgeMonths,
    status: p.status,
    isFavorite: p.isFavorite,
    createdAt: p.createdAt.toISOString(),
  }));

  const searchStreams: DashboardSearchStreamItem[] = rawSearchStreams.map((s) => {
    const lastJob = s.jobs[0];
    return {
      id: s.id,
      name: s.name,
      keywords: s.keywords,
      scheduleCron: s.scheduleCron,
      prospectCount: s._count.prospects,
      lastRunAt: lastJob?.finishedAt ? lastJob.finishedAt.toISOString() : null,
      lastRunYield: lastJob?.resultCount ?? null,
    };
  });

  const recentRuns: DashboardRecentRunItem[] = rawRecentJobs.map((j) => ({
    id: j.id,
    searchConfigName: j.searchConfig?.name ?? "Search run",
    status: j.status,
    resultCount: j.resultCount,
    finishedAt: j.finishedAt ? j.finishedAt.toISOString() : null,
    createdAt: j.createdAt.toISOString(),
  }));

  const prospectsByDay = rawProspectsByDay.map((r) => ({
    day: new Date(r.day).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    count: Number(r.count),
  }));

  const savedOpportunities = await prisma.prospect.count({
    where: {
      organizationId,
      OR: [{ isFavorite: true }, { status: "SHORTLISTED" }],
    },
  });

  const pulse: DashboardPulseStats = {
    activeSearches: activeSearchesCount,
    scheduledSearches: scheduledSearchesCount,
    maxSearches: org?.package?.maxSearchConfigs ?? 3,
    totalProspects: totalProspectsCount,
    pendingProspects: pendingProspectsCount,
    shortlistedProspects: shortlistedProspectsCount,
    favoriteProspects: favoriteProspectsCount,
    savedOpportunities,
    trackedShops: trackedShopsCount,
    maxTrackedShops: org?.package?.maxTrackedShops ?? 5,
    freshTrackedShops: freshTrackedCount,
    planName: org?.package?.name ?? "Standard",
  };

  return {
    pulse,
    topOpportunities,
    competitorRadar,
    prospectsByDay,
    searchStreams,
    recentRuns,
  };
}
