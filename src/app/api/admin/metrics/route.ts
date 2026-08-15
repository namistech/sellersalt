import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/is-admin";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
  }

  const [
    totalUsers,
    totalOrgs,
    activeSubscriptions,
    connectedEtsyShops,
    totalProspects,
    totalSearchConfigs,
    activePackages,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.organization.count(),
    prisma.subscription.count({ where: { status: { in: ["ACTIVE", "TRIALING"] } } }),
    prisma.sellerChannel.count({ where: { platform: "ETSY_SELLER", status: "ACTIVE" } }),
    prisma.prospect.count(),
    prisma.searchConfig.count({ where: { isActive: true } }),
    prisma.package.findMany({ select: { priceUsd: true, _count: { select: { subscriptions: true } } } }),
  ]);

  // Compute estimated MRR from active subscriptions
  let estimatedMrr = 0;
  for (const pkg of activePackages) {
    estimatedMrr += (pkg.priceUsd || 0) * (pkg._count?.subscriptions || 0);
  }

  return NextResponse.json({
    metrics: {
      totalUsers,
      totalOrgs,
      activeSubscriptions,
      connectedEtsyShops,
      totalProspects,
      totalSearchConfigs,
      estimatedMrr,
    },
  });
}
