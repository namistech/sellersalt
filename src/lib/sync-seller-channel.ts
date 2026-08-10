import { prisma } from "./db";
import { decrypt } from "./encryption";
import { getSellerChannelConnector } from "@/seller-channels/registry";

export async function syncSellerChannel(channelId: string): Promise<{ ok: boolean; newOrders?: number; error?: string }> {
  const channel = await prisma.sellerChannel.findUniqueOrThrow({ where: { id: channelId } });

  try {
    const connector = getSellerChannelConnector(channel.platform);
    const credentials = JSON.parse(decrypt(channel.encryptedCredentials));

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
