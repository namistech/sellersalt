import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdminEmail } from "@/lib/is-admin";
import { ensureDefaultPackages } from "@/lib/plan-limits";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return isAdminEmail(session?.user?.email);
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await ensureDefaultPackages();
  const packages = await prisma.package.findMany({
    orderBy: { priceUsd: "asc" },
    include: { _count: { select: { organizations: true } } },
  });
  return NextResponse.json({ packages });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const {
    key, name, priceUsd, isCustom,
    maxConnectors, maxSearchConfigs, maxScheduledSearches, maxTrackedShops, maxProspectsPerMonth,
  } = body;

  if (!key || !name) {
    return NextResponse.json({ error: "key and name are required." }, { status: 400 });
  }

  const created = await prisma.package.create({
    data: {
      key,
      name,
      priceUsd: Number(priceUsd) || 0,
      isCustom: Boolean(isCustom),
      maxConnectors: Number(maxConnectors) || 1,
      maxSearchConfigs: Number(maxSearchConfigs) || 3,
      maxScheduledSearches: Number(maxScheduledSearches) || 1,
      maxTrackedShops: Number(maxTrackedShops) || 5,
      maxProspectsPerMonth: Number(maxProspectsPerMonth) || 200,
    },
  });

  return NextResponse.json({ package: created }, { status: 201 });
}
