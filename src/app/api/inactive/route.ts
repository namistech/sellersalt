import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchConfigs = await prisma.searchConfig.findMany({
    where: { organizationId },
    select: { id: true, name: true },
  });

  const dropped: Array<{
    searchConfigName: string;
    shopExternalId: string;
    shopName: string;
    shopUrl: string;
    shopIconUrl: string | null;
    lastSeenAt: string;
    lastKnownTotalSales: number | null;
    lastKnownReviewCount: number | null;
  }> = [];

  for (const config of searchConfigs) {
    const recentJobs = await prisma.job.findMany({
      where: { searchConfigId: config.id, status: "SUCCESS", resultCount: { gt: 0 } },
      orderBy: { createdAt: "desc" },
      take: 2,
      select: { id: true },
    });
    if (recentJobs.length < 2) continue;

    const [latestJob, previousJob] = recentJobs;

    const [latestProspects, previousProspects] = await Promise.all([
      prisma.prospect.findMany({
        where: { jobId: latestJob.id },
        select: { shopExternalId: true },
      }),
      prisma.prospect.findMany({
        where: { jobId: previousJob.id },
        select: {
          shopExternalId: true,
          shopName: true,
          shopUrl: true,
          shopIconUrl: true,
          totalSales: true,
          reviewCount: true,
          createdAt: true,
        },
      }),
    ]);

    const latestShopIds = new Set(latestProspects.map((p) => p.shopExternalId));
    const seenInThisConfig = new Set<string>();

    for (const p of previousProspects) {
      if (latestShopIds.has(p.shopExternalId)) continue;
      if (seenInThisConfig.has(p.shopExternalId)) continue;
      seenInThisConfig.add(p.shopExternalId);

      dropped.push({
        searchConfigName: config.name,
        shopExternalId: p.shopExternalId,
        shopName: p.shopName,
        shopUrl: p.shopUrl,
        shopIconUrl: p.shopIconUrl,
        lastSeenAt: p.createdAt.toISOString(),
        lastKnownTotalSales: p.totalSales,
        lastKnownReviewCount: p.reviewCount,
      });
    }
  }

  return NextResponse.json({ dropped });
}
