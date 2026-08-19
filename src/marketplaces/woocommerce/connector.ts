// PARTIAL connector — same shape and same honest limitations as the Shopify
// adapter (src/marketplaces/shopify/connector.ts): real OAuth + order sync,
// no public research side, no generic listing read/write yet.

import { prisma } from "@/lib/db";
import { getSellerChannelConnector } from "@/seller-channels/registry";
import { decrypt } from "@/lib/encryption";
import { withCapabilities } from "../core/capabilities";
import type { MarketplaceConnector } from "../core/interfaces";
import type { MarketplaceAccount, MarketplaceShop, Order } from "../core/types";

const sellerConnector = getSellerChannelConnector("WOOCOMMERCE");

async function loadChannel(marketplaceAccountId: string) {
  return prisma.sellerChannel.findUnique({ where: { id: marketplaceAccountId } });
}

export const woocommerceMarketplaceConnector: MarketplaceConnector = {
  marketplace: "woocommerce",
  displayName: "WooCommerce",

  capabilities: withCapabilities({
    accountAuth: true,
    readShops: true,
    readOrders: true,
  }),

  async getAccount(marketplaceAccountId) {
    const channel = await loadChannel(marketplaceAccountId);
    if (!channel || channel.platform !== "WOOCOMMERCE") return null;
    const account: MarketplaceAccount = {
      marketplace: "woocommerce",
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
    if (!channel || channel.platform !== "WOOCOMMERCE") return [];
    const shop: MarketplaceShop = {
      marketplace: "woocommerce",
      externalId: channel.storeUrl,
      marketplaceAccountId: channel.id,
      name: channel.label,
      url: channel.storeUrl,
    };
    return [shop];
  },

  async getOrders(marketplaceAccountId, since) {
    const channel = await loadChannel(marketplaceAccountId);
    if (!channel || channel.platform !== "WOOCOMMERCE") return [];
    const credentials = JSON.parse(decrypt(channel.encryptedCredentials));
    const results = await sellerConnector.fetchRecentOrders(credentials, channel.storeUrl, since);
    return results.map(
      (r): Order => ({
        marketplace: "woocommerce",
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
