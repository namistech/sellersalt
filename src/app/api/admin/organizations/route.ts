import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdminEmail } from "@/lib/is-admin";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return isAdminEmail(session?.user?.email);
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      package: true,
      subscription: { select: { status: true, provider: true, packageId: true } },
      memberships: { include: { user: { select: { email: true } } }, take: 1 },
      _count: { select: { memberships: true, connectors: true, searchConfigs: true, prospects: true, shopWatches: true } },
    },
  });

  return NextResponse.json({
    organizations: orgs.map((o: (typeof orgs)[number]) => ({
      id: o.id,
      name: o.name,
      ownerEmail: o.memberships[0]?.user.email ?? null,
      createdAt: o.createdAt,
      package: o.package,
      subscription: o.subscription,
      membersCount: o._count.memberships,
      usage: {
        connectors: o._count.connectors,
        searchConfigs: o._count.searchConfigs,
        prospects: o._count.prospects,
        trackedShops: o._count.shopWatches,
      },
    })),
  });
}
