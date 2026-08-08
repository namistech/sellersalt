import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startShopWatch } from "@/lib/queue";
import { getActiveConnectorWithCredentials } from "@/lib/get-active-connector";

function extractEtsyShopName(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    const match = parsed.pathname.match(/\/shop\/([^/?#]+)/i);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "A shop URL is required." }, { status: 400 });
  }

  const shopName = extractEtsyShopName(url);
  if (!shopName) {
    return NextResponse.json(
      { error: "Couldn't find a shop name in that URL — expected something like etsy.com/shop/ShopName." },
      { status: 400 }
    );
  }

  const active = await getActiveConnectorWithCredentials(organizationId);
  if (!active || !active.connector.getShopByName) {
    return NextResponse.json({ error: "No active connector on this workspace." }, { status: 400 });
  }

  const stats = await active.connector.getShopByName(active.credentials, shopName);
  if (!stats) {
    return NextResponse.json({ error: `Couldn't find a shop named "${shopName}" on Etsy.` }, { status: 404 });
  }

  const watch = await prisma.shopWatch.upsert({
    where: { organizationId_shopExternalId: { organizationId, shopExternalId: stats.shopExternalId } },
    create: {
      organizationId,
      connectorId: active.connectorRow.id,
      shopExternalId: stats.shopExternalId,
      shopName: stats.shopName,
      isActive: true,
    },
    update: { isActive: true },
  });

  await startShopWatch({
    shopWatchId: watch.id,
    organizationId,
    connectorId: active.connectorRow.id,
    shopExternalId: stats.shopExternalId,
  });

  return NextResponse.json({ shopExternalId: stats.shopExternalId, shopName: stats.shopName });
}
