// PARTIAL connector: Shopify has a real, working OAuth + order-sync
// integration (src/seller-channels/shopify) but no platform-owned public
// research side (Shopify's own product catalog isn't something SellerSalt
// currently browses for market research), and no generic listing
// read/write wired through this adapter yet — see integration matrix.

import { prisma } from "@/lib/db";
import { getSellerChannelConnector } from "@/seller-channels/registry";
import { decrypt } from "@/lib/encryption";
import { withCapabilities } from "../core/capabilities";
import type { MarketplaceConnector } from "../core/interfaces";
import type { MarketplaceAccount, MarketplaceShop, Order } from "../core/types";

const sellerConnector = getSellerChannelConnector("SHOPIFY");

async function loadChannel(marketplaceAccountId: string) {
  return prisma.sellerChannel.findUnique({ where: { id: marketplaceAccountId } });
}

export const shopifyMarketplaceConnector: MarketplaceConnector = {
  marketplace: "shopify",
  displayName: "Shopify",

  capabilities: withCapabilities({
    accountAuth: true,
    readShops: true,
    readOrders: true,
  }),

  async getAccount(marketplaceAccountId) {
    const channel = await loadChannel(marketplaceAccountId);
    if (!channel || channel.platform !== "SHOPIFY") return null;
    const account: MarketplaceAccount = {
      marketplace: "shopify",
      externalId: channel.storeUrl,
      marketplaceAccountId: channel.id,
      organizationId: channel.organizationId,
      label: channel.label,
      storeUrl: channel.storeUrl,
      connectedAt: channel.createdAt,
      status: channel.status as MarketplaceAccount["status"],
    };
    return account;
  },

  async getShops(marketplaceAccountId) {
    const channel = await loadChannel(marketplaceAccountId);
    if (!channel || channel.platform !== "SHOPIFY") return [];
    const shop: MarketplaceShop = {
      marketplace: "shopify",
      externalId: channel.storeUrl,
      marketplaceAccountId: channel.id,
      name: channel.label,
      url: channel.storeUrl,
    };
    return [shop];
  },

  async getOrders(marketplaceAccountId, since) {
    const channel = await loadChannel(marketplaceAccountId);
    if (!channel || channel.platform !== "SHOPIFY") return [];
    const credentials = JSON.parse(decrypt(channel.encryptedCredentials));
    const results = await sellerConnector.fetchRecentOrders(credentials, channel.storeUrl, since);
    return results.map(
      (r): Order => ({
        marketplace: "shopify",
        externalId: r.externalOrderId,
        marketplaceAccountId,
        orderNumber: r.orderNumber,
        totalAmount: r.totalAmount,
        currency: r.currency,
        status: r.status,
        placedAt: r.placedAt,
      })
    );
  },
};
