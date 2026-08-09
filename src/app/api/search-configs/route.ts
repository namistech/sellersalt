import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { upsertSchedule, SCHEDULE_FREQUENCIES } from "@/lib/queue";
import { checkLimit } from "@/lib/plan-limits";

async function requireOrg() {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.organizationId as string | undefined;
}

export async function GET() {
  const organizationId = await requireOrg();
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchConfigs = await prisma.searchConfig.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: { connector: { select: { label: true, type: true } } },
  });
  return NextResponse.json({ searchConfigs });
}

export async function POST(req: Request) {
  const organizationId = await requireOrg();
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const configLimit = await checkLimit(organizationId, "searchConfigs");
  if (!configLimit.allowed) {
    return NextResponse.json(
      { error: `Your plan allows up to ${configLimit.limit} saved searches. Upgrade to add more.` },
      { status: 403 }
    );
  }

  const body = await req.json();
  const {
    connectorId, name, keywords, minPrice, maxPrice,
    minShopAgeMonths, maxShopAgeMonths, minReviewCount, scheduleFrequency,
  } = body;

  if (!connectorId || !name || !Array.isArray(keywords) || keywords.length === 0) {
    return NextResponse.json({ error: "connectorId, name, and at least one keyword are required." }, { status: 400 });
  }

  const freqKey = scheduleFrequency && scheduleFrequency in SCHEDULE_FREQUENCIES ? scheduleFrequency : "MANUAL";
  const cronPattern = SCHEDULE_FREQUENCIES[freqKey];

  if (cronPattern) {
    const scheduleLimit = await checkLimit(organizationId, "scheduledSearches");
    if (!scheduleLimit.allowed) {
      return NextResponse.json(
        {
          error: `Your plan allows up to ${scheduleLimit.limit} scheduled (recurring) searches. Save this as manual-only, or upgrade.`,
        },
        { status: 403 }
      );
    }
  }

  const connector = await prisma.connector.findFirst({
    where: { id: connectorId, OR: [{ organizationId }, { organizationId: null }] },
  });
  if (!connector) return NextResponse.json({ error: "Connector not found." }, { status: 404 });

  const config = await prisma.searchConfig.create({
    data: {
      organizationId,
      connectorId,
      name,
      keywords,
      minPrice: Number(minPrice) || 0,
      maxPrice: Number(maxPrice) || 0,
      minShopAgeMonths: minShopAgeMonths != null ? Number(minShopAgeMonths) : 12,
      maxShopAgeMonths: maxShopAgeMonths != null ? Number(maxShopAgeMonths) : 24,
      minReviewCount: minReviewCount != null ? Number(minReviewCount) : 20,
      scheduleCron: cronPattern,
    },
  });

  if (cronPattern) {
    await upsertSchedule({ searchConfigId: config.id, organizationId, connectorId, cronPattern });
  }

  return NextResponse.json({ searchConfig: config }, { status: 201 });
}
