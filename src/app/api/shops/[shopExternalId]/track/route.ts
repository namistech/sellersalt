import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startShopWatch, stopShopWatch } from "@/lib/queue";
import { getActiveConnectorWithCredentials } from "@/lib/get-active-connector";

async function requireOrg() {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.organizationId as string | undefined;
}

export async function POST(_req: Request, { params }: { params: Promise<{ shopExternalId: string }> }) {
  const { shopExternalId } = await params;
  const organizationId = await requireOrg();
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const active = await getActiveConnectorWithCredentials(organizationId);
  if (!active) return NextResponse.json({ error: "No active connector on this workspace." }, { status: 400 });

  // Shop name for the record: prefer existing Prospect data, fall back to a
  // live lookup — a shop tracked via "Spy on Competitor" won't have either yet.
  let shopName = (await prisma.prospect.findFirst({
    where: { organizationId, shopExternalId },
    orderBy: { createdAt: "desc" },
  }))?.shopName;

  if (!shopName && active.connector.getShopStats) {
    const stats = await active.connector.getShopStats(active.credentials, shopExternalId);
    if (!stats) return NextResponse.json({ error: "Shop not found." }, { status: 404 });
    shopName = stats.shopName;
  }
  if (!shopName) return NextResponse.json({ error: "Shop not found." }, { status: 404 });

  const watch = await prisma.shopWatch.upsert({
    where: { organizationId_shopExternalId: { organizationId, shopExternalId } },
    create: {
      organizationId,
      connectorId: active.connectorRow.id,
      shopExternalId,
      shopName,
      isActive: true,
    },
    update: { isActive: true },
  });

  await startShopWatch({
    shopWatchId: watch.id,
    organizationId,
    connectorId: active.connectorRow.id,
    shopExternalId,
  });

  return NextResponse.json({ ok: true, watch });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ shopExternalId: string }> }) {
  const { shopExternalId } = await params;
  const organizationId = await requireOrg();
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const watch = await prisma.shopWatch.findUnique({
    where: { organizationId_shopExternalId: { organizationId, shopExternalId } },
  });
  if (!watch) return NextResponse.json({ error: "Not tracked." }, { status: 404 });

  await prisma.shopWatch.update({ where: { id: watch.id }, data: { isActive: false } });
  await stopShopWatch(watch.id);

  return NextResponse.json({ ok: true });
}
