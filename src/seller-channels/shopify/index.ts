import axios from "axios";
import type { SellerChannelConnector, SellerOrderResult } from "../types";

// Shopify declared REST Admin API legacy in Oct 2024; new public apps must
// use GraphQL. Pin the version explicitly (Shopify falls forward to the
// oldest supported version if a pinned one sunsets, rather than erroring —
// bump this roughly every quarter per Shopify's release cadence).
const API_VERSION = "2026-07";

async function graphqlRequest(shopDomain: string, accessToken: string, query: string, variables?: Record<string, any>) {
  const res = await axios.post(
    `https://${shopDomain}/admin/api/${API_VERSION}/graphql.json`,
    { query, variables },
    {
      headers: { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json" },
      timeout: 15000,
    }
  );
  if (res.data.errors) throw new Error(JSON.stringify(res.data.errors));
  return res.data.data;
}

function shopDomainFromStoreUrl(storeUrl: string): string {
  return new URL(storeUrl).hostname;
}

export const shopifyConnector: SellerChannelConnector = {
  platform: "SHOPIFY",

  async testConnection(credentials, storeUrl) {
    try {
      const shopDomain = shopDomainFromStoreUrl(storeUrl);
      await graphqlRequest(shopDomain, credentials.accessToken, `{ shop { name } }`);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, message: err.response?.data?.errors ? "Invalid or expired access token." : err.message };
    }
  },

  async fetchRecentOrders(credentials, storeUrl, since) {
    const shopDomain = shopDomainFromStoreUrl(storeUrl);
    const results: SellerOrderResult[] = [];
    let cursor: string | null = null;
    let page = 0;

    const dateFilter = since ? `created_at:>='${since.toISOString()}'` : "";

    // Bounded to 3 pages (300 orders) per sync, same reasoning as the
    // WooCommerce connector — enough for a daily incremental pull without a
    // runaway loop on a huge store.
    while (page < 3) {
      const data: any = await graphqlRequest(
        shopDomain,
        credentials.accessToken,
        `query($cursor: String, $filter: String) {
          orders(first: 100, after: $cursor, query: $filter, sortKey: CREATED_AT, reverse: true) {
            edges {
              cursor
              node {
                id
                name
                displayFinancialStatus
                createdAt
                currentTotalPriceSet { shopMoney { amount currencyCode } }
              }
            }
            pageInfo { hasNextPage }
          }
        }`,
        { cursor, filter: dateFilter || null }
      );

      const edges = data?.orders?.edges ?? [];
      for (const edge of edges) {
        const node = edge.node;
        results.push({
          externalOrderId: node.id,
          orderNumber: node.name,
          totalAmount: parseFloat(node.currentTotalPriceSet?.shopMoney?.amount ?? "0"),
          currency: node.currentTotalPriceSet?.shopMoney?.currencyCode ?? "USD",
          status: node.displayFinancialStatus ?? "unknown",
          placedAt: new Date(node.createdAt),
        });
      }

      if (!data?.orders?.pageInfo?.hasNextPage || edges.length === 0) break;
      cursor = edges[edges.length - 1].cursor;
      page++;
    }

    return results;
  },
};
