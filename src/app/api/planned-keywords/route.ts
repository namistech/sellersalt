import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function requireOrg() {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.organizationId as string | undefined;
}

export async function GET() {
  const organizationId = await requireOrg();
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const keywords = await prisma.plannedKeyword.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });

  const kwTexts = keywords.map((k) => k.keyword.toLowerCase().trim());
  const observations = await prisma.keywordObservation.findMany({
    where: {
      organizationId,
      keyword: { in: kwTexts },
    },
  });

  const obsMap = new Map(observations.map((o) => [o.keyword.toLowerCase().trim(), o]));

  const enrichedKeywords = keywords.map((k) => {
    const obs = obsMap.get(k.keyword.toLowerCase().trim());
    return {
      ...k,
      demandProxyScore: obs?.demandProxyScore ?? null,
      competitionProxy: obs?.competitionProxy ?? "UNAVAILABLE",
      source: obs?.source ?? "UNAVAILABLE",
      observedAveragePrice: obs?.observedAveragePrice ?? null,
    };
  });

  return NextResponse.json({ keywords: enrichedKeywords });
}

export async function POST(req: Request) {
  const organizationId = await requireOrg();
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { keyword, sourceShopExternalId, sourceListingUrl } = (await req.json().catch(() => ({}))) as {
    keyword?: string;
    sourceShopExternalId?: string;
    sourceListingUrl?: string;
  };
  if (!keyword?.trim()) {
    return NextResponse.json({ error: "keyword is required." }, { status: 400 });
  }

  const saved = await prisma.plannedKeyword.upsert({
    where: { organizationId_keyword: { organizationId, keyword: keyword.trim() } },
    create: {
      organizationId,
      keyword: keyword.trim(),
      sourceShopExternalId: sourceShopExternalId ?? null,
      sourceListingUrl: sourceListingUrl ?? null,
    },
    update: {},
  });

  return NextResponse.json({ success: true, keyword: saved });
}

export async function DELETE(req: Request) {
  const organizationId = await requireOrg();
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { keyword, id } = (await req.json().catch(() => ({}))) as { keyword?: string; id?: string };
  if (!keyword && !id) {
    return NextResponse.json({ error: "keyword or id is required." }, { status: 400 });
  }

  if (id) {
    await prisma.plannedKeyword.deleteMany({ where: { id, organizationId } });
  } else if (keyword) {
    await prisma.plannedKeyword.deleteMany({ where: { organizationId, keyword } });
  }

  return NextResponse.json({ success: true });
}
