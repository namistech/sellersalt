import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { discoverNichesFromDatabase } from "@/services/intelligence/niche-discovery";
import { DiscoveryClient } from "./discovery-client";

export const dynamic = "force-dynamic";

export default async function DiscoveryPage() {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;

  const [
    topProducts,
    topShops,
    totalProspects,
    totalTrackedShops,
    activeStreams,
    initialSummary,
  ] = await Promise.all([
    // Top Winning Products with highest sales velocity
    organizationId
      ? prisma.prospect.findMany({
          where: { organizationId },
          orderBy: [{ estDailySales: "desc" }, { createdAt: "desc" }],
          take: 6,
        })
      : [],
    // Winning Shops discovered with high total sales and listings
    organizationId
      ? prisma.prospect.findMany({
          where: { organizationId, totalSales: { gt: 0 } },
          distinct: ["shopExternalId"],
          orderBy: { totalSales: "desc" },
          take: 5,
        })
      : [],
    // Metrics
    organizationId ? prisma.prospect.count({ where: { organizationId } }) : 0,
    organizationId ? prisma.shopWatch.count({ where: { organizationId, isActive: true } }) : 0,
    organizationId ? prisma.searchConfig.count({ where: { organizationId, isActive: true } }) : 0,
    // Canonical Niche Summary from Database Prospects
    organizationId
      ? discoverNichesFromDatabase(organizationId, "etsy", undefined, 60)
      : {
          marketplace: "etsy" as const,
          totalNichesFound: 0,
          niches: [],
          marketLimitations: ["Please sign in to access your organization's discovered niches."],
          generatedAt: new Date(),
        },
  ]);

  return (
    <DiscoveryClient
      initialSummary={initialSummary}
      topProducts={topProducts}
      topShops={topShops}
      totalProspects={totalProspects}
      totalTrackedShops={totalTrackedShops}
      activeStreams={activeStreams}
    />
  );
}
