import { prisma } from "./db";
import { decrypt } from "./encryption";
import { getSellerChannelConnector } from "@/seller-channels/registry";
import { refreshEtsySellerToken, type EtsyCredentials } from "@/seller-channels/etsy-seller";

export async function syncSellerChannel(channelId: string): Promise<{ ok: boolean; newOrders?: number; error?: string }> {
  const channel = await prisma.sellerChannel.findUniqueOrThrow({ where: { id: channelId } });

  try {
    const connector = getSellerChannelConnector(channel.platform);
    let credentials = JSON.parse(decrypt(channel.encryptedCredentials));

    // Etsy tokens expire hourly and need refreshing before use — every other
    // platform's tokens are long-lived, so this only applies here.
    if (channel.platform === "ETSY_SELLER") {
      credentials = await refreshEtsySellerToken(
        channelId,
        credentials as EtsyCredentials,
        (credentials as EtsyCredentials).apiKey
      );
    }

    // Incremental: only pull orders placed after the most recent one we already have.
    const latestKnown = await prisma.sellerOrder.findFirst({
      where: { sellerChannelId: channelId },
      orderBy: { placedAt: "desc" },
      select: { placedAt: true },
    });

    const orders = await connector.fetchRecentOrders(credentials, channel.storeUrl, latestKnown?.placedAt);

    let newCount = 0;
    for (const order of orders) {
      const result = await prisma.sellerOrder.upsert({
        where: { sellerChannelId_externalOrderId: { sellerChannelId: channelId, externalOrderId: order.externalOrderId } },
        create: {
          sellerChannelId: channelId,
          externalOrderId: order.externalOrderId,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          currency: order.currency,
          status: order.status,
          placedAt: order.placedAt,
        },
        update: { status: order.status, totalAmount: order.totalAmount },
      });
      if (result) newCount++;
    }

    await prisma.sellerChannel.update({
      where: { id: channelId },
      data: { lastSyncedAt: new Date(), lastSyncError: null },
    });

    return { ok: true, newOrders: newCount };
  } catch (err: any) {
    const message = err.message ?? String(err);
    await prisma.sellerChannel.update({ where: { id: channelId }, data: { lastSyncError: message } });
    return { ok: false, error: message };
  }
}
