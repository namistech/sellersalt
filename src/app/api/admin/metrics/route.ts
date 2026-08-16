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

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    verifiedUsers,
    unverifiedUsers,
    suspendedUsers,
    recentSignups7d,
    totalOrgs,
    activeSubscriptions,
    connectedEtsyShops,
    totalProspects,
    totalSearchConfigs,
    activePackages,
    recentAuditLogs,
    unverifiedUsersList,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { emailVerified: { not: null } } }),
    prisma.user.count({ where: { emailVerified: null } }),
    prisma.user.count({ where: { suspendedAt: { not: null } } }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.organization.count(),
    prisma.subscription.count({ where: { status: { in: ["ACTIVE", "TRIALING"] } } }),
    prisma.sellerChannel.count({ where: { platform: "ETSY_SELLER", status: "ACTIVE" } }),
    prisma.prospect.count(),
    prisma.searchConfig.count({ where: { isActive: true } }),
    prisma.package.findMany({ select: { priceUsd: true, _count: { select: { subscriptions: true } } } }),
    prisma.auditLog.findMany({ take: 8, orderBy: { createdAt: "desc" } }),
    prisma.user.findMany({
      where: { emailVerified: null },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        verificationEmailCount: true,
        lastVerificationEmailAt: true,
      },
    }),
  ]);

  // Compute estimated MRR from active subscriptions
  let estimatedMrr = 0;
  for (const pkg of activePackages) {
    estimatedMrr += (pkg.priceUsd || 0) * (pkg._count?.subscriptions || 0);
  }

  return NextResponse.json({
    metrics: {
      totalUsers,
      verifiedUsers,
      unverifiedUsers,
      suspendedUsers,
      recentSignups7d,
      totalOrgs,
      activeSubscriptions,
      connectedEtsyShops,
      totalProspects,
      totalSearchConfigs,
      estimatedMrr,
    },
    recentAuditLogs,
    needsAttention: {
      unverifiedUsers: unverifiedUsersList,
    },
  });
}
