import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startShopWatch, stopShopWatch } from "@/lib/queue";

async function requireOrg() {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.organizationId as string | undefined;
}

export async function POST(_req: Request, { params }: { params: Promise<{ shopExternalId: string }> }) {
  const { shopExternalId } = await params;
  const organizationId = await requireOrg();
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const connector = await prisma.connector.findFirst({ where: { organizationId, status: "ACTIVE" } });
  if (!connector) return NextResponse.json({ error: "No active connector on this workspace." }, { status: 400 });

  const recentProspect = await prisma.prospect.findFirst({
    where: { organizationId, shopExternalId },
    orderBy: { createdAt: "desc" },
  });
  if (!recentProspect) return NextResponse.json({ error: "Shop not found in your data." }, { status: 404 });

  const watch = await prisma.shopWatch.upsert({
    where: { organizationId_shopExternalId: { organizationId, shopExternalId } },
    create: {
      organizationId,
      connectorId: connector.id,
      shopExternalId,
      shopName: recentProspect.shopName,
      isActive: true,
    },
    update: { isActive: true },
  });

  await startShopWatch({
    shopWatchId: watch.id,
    organizationId,
    connectorId: connector.id,
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
