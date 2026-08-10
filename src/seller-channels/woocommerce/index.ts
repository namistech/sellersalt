import axios from "axios";
import type { SellerChannelConnector, SellerOrderResult } from "../types";

function client(storeUrl: string, consumerKey: string, consumerSecret: string) {
  const base = storeUrl.replace(/\/$/, "");
  return axios.create({
    baseURL: `${base}/wp-json/wc/v3`,
    auth: { username: consumerKey, password: consumerSecret },
    timeout: 15000,
  });
}

function mapOrder(o: any): SellerOrderResult {
  return {
    externalOrderId: String(o.id),
    orderNumber: o.number ? String(o.number) : undefined,
    totalAmount: parseFloat(o.total) || 0,
    currency: o.currency ?? "USD",
    status: o.status ?? "unknown",
    placedAt: new Date(o.date_created),
  };
}

export const woocommerceConnector: SellerChannelConnector = {
  platform: "WOOCOMMERCE",

  async testConnection(credentials, storeUrl) {
    try {
      const c = client(storeUrl, credentials.consumerKey, credentials.consumerSecret);
      await c.get("/orders", { params: { per_page: 1 } });
      return { ok: true };
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401) return { ok: false, message: "Invalid consumer key/secret." };
      if (status === 404) return { ok: false, message: "Store URL doesn't look like a WooCommerce site (check the REST API is enabled)." };
      return { ok: false, message: err.message ?? "Connection failed." };
    }
  },

  async fetchRecentOrders(credentials, storeUrl, since) {
    const c = client(storeUrl, credentials.consumerKey, credentials.consumerSecret);
    const results: SellerOrderResult[] = [];
    let page = 1;

    // Bounded to 5 pages (500 orders) per sync — enough for a daily
    // incremental pull without risking a runaway loop on a huge store.
    while (page <= 5) {
      const { data } = await c.get("/orders", {
        params: {
          per_page: 100,
          page,
          orderby: "date",
          order: "desc",
          after: since ? since.toISOString() : undefined,
        },
      });
      if (!Array.isArray(data) || data.length === 0) break;
      results.push(...data.map(mapOrder));
      if (data.length < 100) break;
      page++;
    }

    return results;
  },
};
