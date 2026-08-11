import axios from "axios";
import type { SellerChannelConnector, SellerOrderResult } from "../types";
import { encrypt } from "@/lib/encryption";
import { prisma } from "@/lib/db";

const ETSY_TOKEN_URL = "https://api.etsy.com/v3/public/oauth/token";
const ETSY_API_BASE = "https://openapi.etsy.com/v3/application";

interface EtsyCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // unix ms
  shopId: string;
  apiKey: string; // Etsy's "keystring" — required alongside the token on every call
}

/** Etsy access tokens expire in ~1 hour — every real call goes through this
 * first, which refreshes and persists new tokens when needed. This is why
 * Etsy is a materially bigger lift than Shopify/WooCommerce, whose tokens
 * don't expire the same way. */
async function getValidAccessToken(
  sellerChannelId: string,
  creds: EtsyCredentials,
  clientId: string
): Promise<EtsyCredentials> {
  if (creds.expiresAt > Date.now() + 60_000) return creds; // still valid, 1 min buffer

  const res = await axios.post(ETSY_TOKEN_URL, {
    grant_type: "refresh_token",
    client_id: clientId,
    refresh_token: creds.refreshToken,
  });

  const updated: EtsyCredentials = {
    ...creds,
    accessToken: res.data.access_token,
    refreshToken: res.data.refresh_token,
    expiresAt: Date.now() + res.data.expires_in * 1000,
  };

  await prisma.sellerChannel.update({
    where: { id: sellerChannelId },
    data: { encryptedCredentials: encrypt(JSON.stringify(updated)) },
  });

  return updated;
}

function client(accessToken: string, apiKey: string) {
  return axios.create({
    baseURL: ETSY_API_BASE,
    headers: { Authorization: `Bearer ${accessToken}`, "x-api-key": apiKey },
    timeout: 15000,
  });
}

export const etsySellerConnector: SellerChannelConnector = {
  platform: "ETSY_SELLER",

  async testConnection(credentials) {
    try {
      const creds = credentials as unknown as EtsyCredentials;
      const c = client(creds.accessToken, creds.apiKey);
      await c.get(`/shops/${creds.shopId}`);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, message: err.response?.data?.error ?? err.message };
    }
  },

  async fetchRecentOrders(credentials, _storeUrl, since) {
    // Real refresh handling needs the sellerChannelId + client_id, which
    // aren't part of this generic interface — the sync path refreshes the
    // token before invoking this, so credentials are already valid by the
    // time we get here. See refreshEtsySellerToken below.
    const creds = credentials as unknown as EtsyCredentials;
    const c = client(creds.accessToken, creds.apiKey);

    const results: SellerOrderResult[] = [];
    let offset = 0;
    const limit = 100;

    for (let page = 0; page < 3; page++) {
      const params: Record<string, any> = { limit, offset, sort_on: "created", sort_order: "desc" };
      if (since) params.min_created = Math.floor(since.getTime() / 1000);

      const { data } = await c.get(`/shops/${creds.shopId}/receipts`, { params });
      const receipts = data?.results ?? [];
      if (receipts.length === 0) break;

      for (const r of receipts) {
        results.push({
          externalOrderId: String(r.receipt_id),
          orderNumber: String(r.receipt_id),
          totalAmount: (r.grandtotal?.amount ?? 0) / (r.grandtotal?.divisor ?? 100),
          currency: r.grandtotal?.currency_code ?? "USD",
          status: r.status ?? "unknown",
          placedAt: new Date(r.create_timestamp * 1000),
        });
      }

      if (receipts.length < limit) break;
      offset += limit;
    }

    return results;
  },
};

export { getValidAccessToken as refreshEtsySellerToken, ETSY_TOKEN_URL };
export type { EtsyCredentials };
