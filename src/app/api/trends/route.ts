import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const trends = await prisma.$queryRaw<
    Array<{
      shopExternalId: string;
      shopName: string;
      shopUrl: string;
      shopIconUrl: string | null;
      firstTotalSales: number | null;
      lastTotalSales: number | null;
      firstReviewCount: number;
      lastReviewCount: number;
      firstSeenAt: Date;
      lastSeenAt: Date;
      snapshotCount: bigint;
    }>
  >`
    WITH ranked AS (
      SELECT
        "shopExternalId", "shopName", "shopUrl", "shopIconUrl",
        "totalSales", "reviewCount", "createdAt",
        ROW_NUMBER() OVER (PARTITION BY "shopExternalId" ORDER BY "createdAt" ASC) AS rn_first,
        ROW_NUMBER() OVER (PARTITION BY "shopExternalId" ORDER BY "createdAt" DESC) AS rn_last,
        COUNT(*) OVER (PARTITION BY "shopExternalId") AS snapshot_count
      FROM "Prospect"
      WHERE "organizationId" = ${organizationId} AND "shopExternalId" != ''
    )
    SELECT
      f."shopExternalId" AS "shopExternalId",
      f."shopName" AS "shopName",
      l."shopUrl" AS "shopUrl",
      l."shopIconUrl" AS "shopIconUrl",
      f."totalSales" AS "firstTotalSales",
      l."totalSales" AS "lastTotalSales",
      f."reviewCount" AS "firstReviewCount",
      l."reviewCount" AS "lastReviewCount",
      f."createdAt" AS "firstSeenAt",
      l."createdAt" AS "lastSeenAt",
      l.snapshot_count AS "snapshotCount"
    FROM ranked f
    JOIN ranked l ON f."shopExternalId" = l."shopExternalId"
    WHERE f.rn_first = 1 AND l.rn_last = 1 AND l.snapshot_count > 1
    ORDER BY (COALESCE(l."totalSales", 0) - COALESCE(f."totalSales", 0)) DESC
    LIMIT 100
  `;

  const serialized = trends.map((t: (typeof trends)[number]) => ({
    ...t,
    snapshotCount: Number(t.snapshotCount),
    salesGrowth:
      t.lastTotalSales != null && t.firstTotalSales != null
        ? t.lastTotalSales - t.firstTotalSales
        : null,
    reviewGrowth: t.lastReviewCount - t.firstReviewCount,
  }));

  return NextResponse.json({ trends: serialized });
}
