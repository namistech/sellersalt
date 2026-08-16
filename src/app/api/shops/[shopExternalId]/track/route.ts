import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startShopWatch, stopShopWatch } from "@/lib/queue";
import { getActiveConnectorWithCredentials } from "@/lib/get-active-connector";
import { checkLimit } from "@/lib/plan-limits";

async function requireOrg() {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.organizationId as string | undefined;
}

export async function POST(_req: Request, { params }: { params: Promise<{ shopExternalId: string }> }) {
  const { shopExternalId } = await params;
  const organizationId = await requireOrg();
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existingWatch = await prisma.shopWatch.findUnique({
    where: { organizationId_shopExternalId: { organizationId, shopExternalId } },
  });

  // Only enforce the limit for genuinely new watches — re-activating a
  // previously-stopped one doesn't grow the active count beyond what it
  // already was when this shop was first tracked.
  if (!existingWatch || !existingWatch.isActive) {
    const limitCheck = await checkLimit(organizationId, "trackedShops");
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: `Your plan allows tracking up to ${limitCheck.limit} shop(s) at once. Upgrade to track more.` },
        { status: 403 }
      );
    }
  }

  const active = await getActiveConnectorWithCredentials(organizationId);
  if (!active) return NextResponse.json({ error: "No active connector on this workspace." }, { status: 400 });

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

  // Scheduling the recurring snapshot job is best-effort: a transient
  // Redis/BullMQ hiccup here must not fail the user-facing "track this
  // shop" action after the ShopWatch row is already correctly created —
  // same pattern already used in the (otherwise unused) sibling route
  // src/app/api/tracking/shops/route.ts. Without this, any queue error
  // surfaced as an uncaught 500 on every "Track Shop" click.
  try {
    await startShopWatch({
      shopWatchId: watch.id,
      organizationId,
      connectorId: active.connectorRow.id,
      shopExternalId,
    });
  } catch (err) {
    console.error("[SHOP_TRACK_SCHEDULE_ERROR]", err);
  }

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
  try {
    await stopShopWatch(watch.id);
  } catch (err) {
    console.error("[SHOP_UNTRACK_SCHEDULE_ERROR]", err);
  }

  return NextResponse.json({ ok: true });
}
