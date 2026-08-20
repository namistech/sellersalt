import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { compareResearchRuns, calculateProductObservationDiff } from "@/marketplaces/core/acquisition/diff-engine";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;

  if (!organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));

    // 1. Compare two Research Runs
    if (body.runIdA && body.runIdB) {
      const [runA, runB] = await Promise.all([
        prisma.researchRun.findFirst({
          where: { id: body.runIdA, organizationId },
          include: { observations: true },
        }),
        prisma.researchRun.findFirst({
          where: { id: body.runIdB, organizationId },
          include: { observations: true },
        }),
      ]);

      if (!runA || !runB) {
        return NextResponse.json({ error: "One or both research runs not found" }, { status: 404 });
      }

      const diff = compareResearchRuns(
        {
          id: runA.id,
          query: runA.query,
          marketplace: runA.marketplaces[0] || "etsy",
          products: runA.observations.map((o) => ({
            externalId: o.externalId,
            marketplace: o.marketplace,
            price: o.price,
            rating: o.rating,
            reviewCount: o.reviewCount,
            favoritesCount: o.favoritesCount,
            salesCount: o.salesCount,
            title: o.title,
            shopName: o.shopName,
            observedAt: o.observedAt,
          })),
        },
        {
          id: runB.id,
          query: runB.query,
          marketplace: runB.marketplaces[0] || "etsy",
          products: runB.observations.map((o) => ({
            externalId: o.externalId,
            marketplace: o.marketplace,
            price: o.price,
            rating: o.rating,
            reviewCount: o.reviewCount,
            favoritesCount: o.favoritesCount,
            salesCount: o.salesCount,
            title: o.title,
            shopName: o.shopName,
            observedAt: o.observedAt,
          })),
        }
      );

      return NextResponse.json({ diff });
    }

    // 2. Compare two observations or snapshots of a product
    if (body.externalId && body.marketplace) {
      const obs = await prisma.productObservation.findUnique({
        where: {
          organizationId_marketplace_externalId: {
            organizationId,
            marketplace: body.marketplace,
            externalId: body.externalId,
          },
        },
        include: {
          snapshots: {
            orderBy: { observedAt: "desc" },
            take: 2,
          },
        },
      });

      if (!obs) {
        return NextResponse.json({ error: "Observation not found" }, { status: 404 });
      }

      const latestSnapshot = obs.snapshots[0];
      const previousSnapshot = obs.snapshots[1] || null;

      const diff = calculateProductObservationDiff(
        previousSnapshot
          ? {
              externalId: obs.externalId,
              marketplace: obs.marketplace,
              price: previousSnapshot.price,
              rating: previousSnapshot.rating,
              reviewCount: previousSnapshot.reviewCount,
              favoritesCount: previousSnapshot.favoritesCount,
              salesCount: previousSnapshot.salesCount,
              title: obs.title,
              shopName: obs.shopName,
              observedAt: previousSnapshot.observedAt,
            }
          : null,
        {
          externalId: obs.externalId,
          marketplace: obs.marketplace,
          price: latestSnapshot?.price ?? obs.price,
          rating: latestSnapshot?.rating ?? obs.rating,
          reviewCount: latestSnapshot?.reviewCount ?? obs.reviewCount,
          favoritesCount: latestSnapshot?.favoritesCount ?? obs.favoritesCount,
          salesCount: latestSnapshot?.salesCount ?? obs.salesCount,
          title: obs.title,
          shopName: obs.shopName,
          observedAt: latestSnapshot?.observedAt ?? obs.observedAt,
        }
      );

      return NextResponse.json({ diff });
    }

    return NextResponse.json({ error: "Invalid compare parameters" }, { status: 400 });
  } catch (error: any) {
    console.error("[ResearchCompareError]", error);
    return NextResponse.json({ error: error.message || "Failed to compare research observations" }, { status: 500 });
  }
}
