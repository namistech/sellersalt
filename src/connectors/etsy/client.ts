import axios from "axios";
import PQueue from "p-queue";

const ETSY_BASE_URL = "https://openapi.etsy.com/v3/application";

// Etsy's hard limit is 10 req/sec per key. Each Etsy connector instance gets its
// own queue so one org's run can't starve another's — created per-call rather than
// module-level singleton, since credentials (and therefore rate budgets) are per-org.
export function createEtsyClient(apiKey: string, sharedSecret?: string) {
  const queue = new PQueue({ intervalCap: 8, interval: 1000, carryoverConcurrencyCount: true });

  const http = axios.create({
    baseURL: ETSY_BASE_URL,
    headers: { "x-api-key": sharedSecret ? `${apiKey}:${sharedSecret}` : apiKey },
    timeout: 15000,
  });

  async function get<T = any>(path: string, params: Record<string, any> = {}): Promise<T> {
    return queue.add(async () => {
      const res = await http.get(path, { params });
      return res.data;
    }) as Promise<T>;
  }

  return {
    ping: () => get("/openapi-ping"),
    searchListings: (params: {
      keywords: string;
      min_price: number;
      max_price: number;
      limit: number;
    }) =>
      get("/listings/active", {
        ...params,
        sort_on: "score",
        sort_order: "desc",
      }),
    getShop: (shopId: number | string) => get(`/shops/${shopId}`),
  };
}
