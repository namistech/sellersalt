import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  getEbayCredentials,
  isEbayConfigured,
  getEbayAccessToken,
  invalidateEbayTokenCache,
  searchEbayBrowseProducts,
  fetchEbayBrowseProduct,
  aggregateEbayCategoryIntelligence,
  harvestEbayBrowseKeywords,
  testEbayBrowseConnection,
} from "@/services/ebay-browse-api";
import { ebayConnector } from "@/marketplaces/ebay/connector";
import { MarketplaceRegistry, registerAllConnectors } from "@/marketplaces/core/registry";

describe("eBay Buy Browse API Integration & Zero-Fabrication Contract", () => {
  const origEnvAppId = process.env.EBAY_APP_ID;
  const origEnvCertId = process.env.EBAY_CERT_ID;
  const origFetch = global.fetch;

  beforeEach(() => {
    delete process.env.EBAY_APP_ID;
    delete process.env.EBAY_CERT_ID;
    invalidateEbayTokenCache();
  });

  afterEach(() => {
    process.env.EBAY_APP_ID = origEnvAppId;
    process.env.EBAY_CERT_ID = origEnvCertId;
    global.fetch = origFetch;
    invalidateEbayTokenCache();
  });

  it("returns available: false and REQUIRES_CREDENTIALS when credentials are not configured", async () => {
    const creds = await getEbayCredentials();
    assert.strictEqual(creds, null, "Should return null credentials when unconfigured");

    const isConfig = await isEbayConfigured();
    assert.strictEqual(isConfig, false, "isEbayConfigured should be false");

    const searchRes = await searchEbayBrowseProducts({ query: "leather bag" });
    assert.strictEqual(searchRes.available, false);
    assert.strictEqual(searchRes.reason, "REQUIRES_CREDENTIALS");
    assert.strictEqual(searchRes.items.length, 0);
    assert.strictEqual(searchRes.total, 0);
    assert.strictEqual(searchRes.source, "ebay_browse_api");
  });

  it("handles OAuth2 token exchange with caching and expiration", async () => {
    process.env.EBAY_APP_ID = "TestApp123";
    process.env.EBAY_CERT_ID = "TestCertSecret456";

    let tokenCallCount = 0;
    global.fetch = async (url: any, opts: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/identity/v1/oauth2/token")) {
        tokenCallCount++;
        assert.strictEqual(opts.method, "POST");
        assert.match(opts.headers["Authorization"], /^Basic /);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            access_token: "mock-ebay-access-token-12345",
            expires_in: 7200,
            token_type: "Application Access Token",
          }),
        } as any;
      }
      throw new Error(`Unexpected fetch url: ${urlStr}`);
    };

    const token1 = await getEbayAccessToken();
    assert.strictEqual(token1, "mock-ebay-access-token-12345");
    assert.strictEqual(tokenCallCount, 1);

    // Second call should return cached token without invoking fetch again
    const token2 = await getEbayAccessToken();
    assert.strictEqual(token2, "mock-ebay-access-token-12345");
    assert.strictEqual(tokenCallCount, 1, "Should reuse cached access token");
  });

  it("executes real Browse API search, normalizes items, and applies opportunity scoring", async () => {
    process.env.EBAY_APP_ID = "TestApp123";
    process.env.EBAY_CERT_ID = "TestCertSecret456";

    global.fetch = async (url: any, opts: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/identity/v1/oauth2/token")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            access_token: "mock-token",
            expires_in: 7200,
          }),
        } as any;
      }

      if (urlStr.includes("/buy/browse/v1/item_summary/search")) {
        assert.strictEqual(opts.headers["Authorization"], "Bearer mock-token");
        assert.strictEqual(opts.headers["X-EBAY-C-MARKETPLACE-ID"], "EBAY_US");
        assert.match(urlStr, /q=ceramic\+mug/);

        return {
          ok: true,
          status: 200,
          json: async () => ({
            total: 42,
            itemSummaries: [
              {
                itemId: "v1|123456789012|0",
                title: "Handmade Ceramic Pottery Coffee Mug 16oz",
                price: { value: "24.99", currency: "USD" },
                image: { imageUrl: "https://i.ebayimg.com/images/g/mug1.jpg" },
                itemWebUrl: "https://www.ebay.com/itm/123456789012",
                seller: { username: "ArtisanPotter", feedbackPercentage: "99.4", feedbackScore: 850 },
                categories: [{ categoryId: "123", categoryName: "Pottery & Glass" }],
                condition: "New",
              },
              {
                itemId: "v1|987654321098|0",
                title: "Vintage Ceramic Speckled Mug",
                price: { value: "18.50", currency: "USD" },
                image: { imageUrl: "https://i.ebayimg.com/images/g/mug2.jpg" },
                itemWebUrl: "https://www.ebay.com/itm/987654321098",
                seller: { username: "VintageFinds", feedbackPercentage: "98.1", feedbackScore: 320 },
                categories: [{ categoryId: "123", categoryName: "Pottery & Glass" }],
                condition: "Used",
              },
            ],
          }),
        } as any;
      }

      throw new Error(`Unexpected fetch url: ${urlStr}`);
    };

    const res = await searchEbayBrowseProducts({
      query: "ceramic mug",
      limit: 10,
      minPrice: 10,
      maxPrice: 50,
    });

    assert.strictEqual(res.available, true);
    assert.strictEqual(res.reason, "CONFIGURED");
    assert.strictEqual(res.total, 42);
    assert.strictEqual(res.items.length, 2);

    const first = res.items[0];
    assert.strictEqual(first.marketplace, "ebay");
    assert.strictEqual(first.externalId, "123456789012");
    assert.strictEqual(first.title, "Handmade Ceramic Pottery Coffee Mug 16oz");
    assert.strictEqual(first.price, 24.99);
    assert.strictEqual(first.currency, "USD");
    assert.strictEqual(first.rating, 5.0); // 99.4% / 20 = 4.97 -> 5.0
    assert.strictEqual(first.reviewCount, 850);
    assert.strictEqual(first.shop?.name, "ArtisanPotter");
    assert.strictEqual(first.url, "https://www.ebay.com/itm/123456789012");
    assert.strictEqual(first.source, "ACTUAL_DATA");
    assert.ok(first.opportunityScore, "Opportunity score should be computed");
    assert.ok(typeof first.opportunityScore?.score === "number");
  });

  it("handles 401/403 authorization failures with cache invalidation", async () => {
    process.env.EBAY_APP_ID = "BadApp";
    process.env.EBAY_CERT_ID = "BadCert";

    global.fetch = async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/identity/v1/oauth2/token")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ access_token: "expired-or-invalid-token", expires_in: 7200 }),
        } as any;
      }
      if (urlStr.includes("/buy/browse/v1/item_summary/search")) {
        return {
          ok: false,
          status: 401,
          text: async () => "Invalid access token or rejected credentials",
        } as any;
      }
      throw new Error(`Unexpected url: ${urlStr}`);
    };

    const res = await searchEbayBrowseProducts({ query: "watch" });
    assert.strictEqual(res.available, false);
    assert.strictEqual(res.reason, "REQUIRES_CREDENTIALS");
    assert.match(res.message || "", /rejected credentials/);
  });

  it("tests connection via testEbayBrowseConnection()", async () => {
    process.env.EBAY_APP_ID = "TestApp";
    process.env.EBAY_CERT_ID = "TestCert";

    global.fetch = async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/identity/v1/oauth2/token")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ access_token: "test-token", expires_in: 7200 }),
        } as any;
      }
      if (urlStr.includes("/buy/browse/v1/item_summary/search")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            total: 100,
            itemSummaries: [{ title: "Test Connection Sample Item" }],
          }),
        } as any;
      }
      throw new Error(`Unexpected url: ${urlStr}`);
    };

    const testRes = await testEbayBrowseConnection();
    assert.strictEqual(testRes.ok, true);
    assert.match(testRes.message, /connection successful/i);
    assert.strictEqual(testRes.itemCount, 100);
    assert.strictEqual(testRes.sampleTitle, "Test Connection Sample Item");
  });

  it("registers ebayConnector as architecture-ready connector in MarketplaceRegistry", () => {
    registerAllConnectors();
    const connector = MarketplaceRegistry.getConnector("ebay");
    assert.ok(connector);
    assert.strictEqual(connector.displayName, "eBay");
    assert.strictEqual(connector.capabilities.research, false);
  });
});
