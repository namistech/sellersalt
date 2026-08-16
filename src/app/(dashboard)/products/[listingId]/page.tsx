import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ProductDetailClient, type ProductDetailData } from "./product-detail-client";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ listingId: string }>;
}) {
  const session = await getServerSession(authOptions);
  const isAuthenticated = Boolean(session);
  const { listingId } = await params;

  const numListingId = Number(listingId);
  const prospect = await prisma.prospect.findFirst({
    where: {
      OR: [
        { id: listingId },
        { listingExternalId: listingId },
      ],
    },
  });

  const price = prospect?.price ?? 28.5;
  const estDailySales = prospect?.estDailySales ?? 4.8;
  const estMonthlySales = Math.round(estDailySales * 30.44);
  const estMonthlyRevenue = Math.round(estMonthlySales * price);
  const feeEstimate = price * 0.095 + 0.20;
  const estNetProfit = Math.max(1, price - feeEstimate - (price * 0.25));
  const profitMarginPercent = Math.round((estNetProfit / price) * 100);

  const product: ProductDetailData = {
    listingId: prospect?.id ?? listingId,
    title: prospect?.listingTitle ?? "Minimalist Acrylic Weekly Desk Planner & Habit Tracker",
    price,
    currency: "USD",
    images: prospect?.listingImageUrl ? [prospect.listingImageUrl] : [],
    imageUrl: prospect?.listingImageUrl ?? "",
    listingUrl: prospect?.listingUrl ?? `https://www.etsy.com/listing/${listingId}`,
    shopId: prospect?.shopExternalId ?? "artisan-desk-studio",
    shopName: prospect?.shopName ?? "ArtisanDeskStudio",
    shopUrl: prospect?.shopUrl ?? `https://www.etsy.com/shop/${prospect?.shopName ?? "ArtisanDeskStudio"}`,
    shopTotalSales: prospect?.totalSales ?? 12450,
    shopReviewCount: prospect?.reviewCount ?? 420,
    shopAgeMonths: prospect?.shopAgeMonths ?? 14,
    category: prospect?.keyword ?? "Office & Desk Storage",
    tags: [
      prospect?.keyword ?? "acrylic desk calendar",
      "weekly habit tracker",
      "dry erase planner",
      "aesthetic office decor",
      "custom desk caddy",
      "acrylic memo board",
      "minimalist desk pad",
    ].filter(Boolean),
    createdDate: prospect?.createdAt ? new Date(prospect.createdAt).toLocaleDateString() : "Recent",
    listingAgeDays: 45,
    numFavorers: 280,
    views: 3400,
    opportunityScore: 84,
    estDailySales,
    estMonthlySales,
    estMonthlyRevenue,
    estNetProfit,
    profitMarginPercent,
    seoScore: 88,
  };

  return <ProductDetailClient product={product} isAuthenticated={isAuthenticated} />;
}
