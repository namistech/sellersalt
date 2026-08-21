import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isThirdPartyShopLookupEnabled } from "@/lib/feature-flags";
import { fetchCompleteShopIntelligence } from "@/services/shop-intelligence";

export async function GET(_req: Request, { params }: { params: Promise<{ shopExternalId: string }> }) {
  const { shopExternalId } = await params;
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isThirdPartyShopLookupEnabled()) {
    return NextResponse.json(
      { error: "Third-party shop intelligence lookup is currently disabled." },
      { status: 403 }
    );
  }

  try {
    const profile = await fetchCompleteShopIntelligence(organizationId, shopExternalId);

    // Provide complete profile + backwards compatible keys
    return NextResponse.json({
      profile,
      shop: {
        shopExternalId: profile.identity.shopExternalId,
        shopName: profile.identity.shopName,
        shopUrl: profile.identity.shopUrl,
        shopIconUrl: profile.identity.shopIconUrl,
        shopBannerUrl: profile.identity.shopBannerUrl,
        shopAgeMonths: profile.identity.shopAgeMonths,
        reviewCount: profile.kpis.reviewCount,
        reviewAverage: profile.kpis.reviewAverage,
        activeListings: profile.kpis.activeListings,
        totalSales: profile.kpis.totalSales,
        numFavorers: null,
        avgSellingRatio: profile.kpis.avgSellingRatio,
        estDailySales: profile.kpis.estDailySales,
        badges: [
          profile.verdict.verdictBadge,
          profile.kpis.avgSellingRatio > 20 ? "High sell-through" : "Standard yield",
        ],
      },
      keywords: profile.keywords.map((k) => ({ term: k.tag, count: k.count })),
      topListings: profile.topListings.map((l) => ({
        listingExternalId: l.listingId,
        title: l.title,
        price: l.price,
        url: l.listingUrl,
        imageUrl: l.imageUrl || undefined,
      })),
      watch: profile.isTracked
        ? {
            isActive: true,
            startedAt: profile.identity.createdDate,
            snapshots: profile.snapshots,
          }
        : null,
    });
  } catch (err: any) {
    console.error("Failed to fetch shop intelligence:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch shop intelligence" },
      { status: 404 }
    );
  }
}
