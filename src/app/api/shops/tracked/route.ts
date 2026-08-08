import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const watches = await prisma.shopWatch.findMany({
    where: { organizationId, isActive: true },
    orderBy: { createdAt: "desc" },
    include: { snapshots: { orderBy: { capturedAt: "desc" }, take: 1 } },
  });

  return NextResponse.json({
    shops: watches.map((w: (typeof watches)[number]) => ({
      shopExternalId: w.shopExternalId,
      shopName: w.shopName,
      trackingSince: w.createdAt,
      latestSnapshot: w.snapshots[0]
        ? {
            capturedAt: w.snapshots[0].capturedAt,
            totalSales: w.snapshots[0].totalSales,
            reviewCount: w.snapshots[0].reviewCount,
            activeListings: w.snapshots[0].activeListings,
          }
        : null,
    })),
  });
}
