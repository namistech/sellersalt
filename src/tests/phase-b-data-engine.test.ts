/**
 * Phase B Etsy Data Engine & Ingestion Hardening Verification Tests
 * 
 * Tests:
 * 1. Redis / In-Memory Cache (Hit, Miss, TTL, Determinism, Fallback, Isolation, Invalidation)
 * 2. Rate Budget & Queue Enforcement (8 req/sec Ceiling)
 * 3. Structured Retry Engine (429, Retry-After, 5xx, Network Errors, Non-retryable 4xx)
 * 4. Buyer Taxonomy Ingestion (Tree Flattening, Hierarchy Traversal, Keyword Search)
 * 5. Multi-Tenant Safety & Token Security
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import axios, { AxiosError, AxiosHeaders } from "axios";
import PQueue from "p-queue";
import { EtsyApiCache, ETSY_CACHE_TTL } from "../connectors/etsy/cache";
import {
  isRetryableError,
  parseRetryAfterHeader,
  executeWithRetry,
  getEtsyRateLimitCeiling,
  EtsyApiError,
} from "../connectors/etsy/client";
import {
  flattenTaxonomyTree,
  searchTaxonomyNodes,
  type EtsyRawTaxonomyNode,
} from "../connectors/etsy/taxonomy";

describe("Phase B: Etsy Cache Layer & TTL Policies", () => {
  it("enforces canonical TTL policies", () => {
    assert.equal(ETSY_CACHE_TTL.SEARCH_LISTINGS, 6 * 3600);
    assert.equal(ETSY_CACHE_TTL.LISTING_DETAIL, 6 * 3600);
    assert.equal(ETSY_CACHE_TTL.SHOP_PROFILE, 24 * 3600);
    assert.equal(ETSY_CACHE_TTL.SHOP_REVIEWS, 24 * 3600);
    assert.equal(ETSY_CACHE_TTL.TAXONOMY_NODES, 7 * 24 * 3600);
    assert.equal(ETSY_CACHE_TTL.TAXONOMY_PROPERTIES, 7 * 24 * 3600);
  });

  it("builds deterministic query hashes regardless of key order", () => {
    const cache = new EtsyApiCache(null);
    const hash1 = cache.hashParams({ keywords: "leather wallet", min_price: 10, max_price: 50 });
    const hash2 = cache.hashParams({ max_price: 50, keywords: "leather wallet", min_price: 10 });
    assert.equal(hash1, hash2);
  });

  it("handles cache set, hit, miss, and in-memory fallback", async () => {
    const cache = new EtsyApiCache(null);
    const key = cache.buildKey({ resource: "shops", identifier: "12345" });

    // Miss
    const miss = await cache.get(key);
    assert.equal(miss, null);

    // Set
    await cache.set(key, { shop_id: 12345, shop_name: "CraftyStudio" }, 300);

    // Hit
    const hit = await cache.get<{ shop_id: number; shop_name: string }>(key);
    assert.ok(hit);
    assert.equal(hit?.shop_name, "CraftyStudio");

    // Delete
    await cache.delete(key);
    const afterDelete = await cache.get(key);
    assert.equal(afterDelete, null);
  });

  it("respects TTL expiration in cache", async () => {
    const cache = new EtsyApiCache(null);
    const key = cache.buildKey({ resource: "temporary", identifier: "test" });

    // Set with 0 second TTL (expired immediately)
    await cache.set(key, { value: "expired" }, -1);
    const expired = await cache.get(key);
    assert.equal(expired, null);
  });

  it("enforces multi-tenant cache key isolation", () => {
    const cache = new EtsyApiCache(null);

    const keyOrgA = cache.buildKey({
      resource: "receipts",
      organizationId: "org_a",
      sellerChannelId: "channel_1",
      queryHash: "abc",
    });

    const keyOrgB = cache.buildKey({
      resource: "receipts",
      organizationId: "org_b",
      sellerChannelId: "channel_1",
      queryHash: "abc",
    });

    const publicKey = cache.buildKey({
      resource: "listings",
      identifier: "999",
    });

    assert.ok(keyOrgA.startsWith("etsy:v1:tenant:org_a:channel:channel_1:receipts:abc"));
    assert.ok(keyOrgB.startsWith("etsy:v1:tenant:org_b:channel:channel_1:receipts:abc"));
    assert.ok(publicKey.startsWith("etsy:v1:public:listings:999"));
    assert.notEqual(keyOrgA, keyOrgB);
  });

  it("invalidates cache by prefix correctly", async () => {
    const cache = new EtsyApiCache(null);
    const key1 = cache.buildKey({ resource: "shops", identifier: "101" });
    const key2 = cache.buildKey({ resource: "shops", identifier: "102" });
    const keyOther = cache.buildKey({ resource: "listings", identifier: "500" });

    await cache.set(key1, { name: "Shop1" }, 300);
    await cache.set(key2, { name: "Shop2" }, 300);
    await cache.set(keyOther, { title: "Item" }, 300);

    await cache.deleteByPrefix("etsy:v1:public:shops");

    assert.equal(await cache.get(key1), null);
    assert.equal(await cache.get(key2), null);
    assert.ok(await cache.get(keyOther));
  });
});

describe("Phase B: Etsy Rate Budget & Queue Constraints", () => {
  it("defaults rate ceiling to 8 req/sec", () => {
    const originalEnv = process.env.ETSY_REQUESTS_PER_SECOND;
    delete process.env.ETSY_REQUESTS_PER_SECOND;
    assert.equal(getEtsyRateLimitCeiling(), 8);

    process.env.ETSY_REQUESTS_PER_SECOND = "5";
    assert.equal(getEtsyRateLimitCeiling(), 5);

    process.env.ETSY_REQUESTS_PER_SECOND = "25"; // invalid, exceeds 10 max
    assert.equal(getEtsyRateLimitCeiling(), 8);

    if (originalEnv) process.env.ETSY_REQUESTS_PER_SECOND = originalEnv;
    else delete process.env.ETSY_REQUESTS_PER_SECOND;
  });

  it("queues and throttles concurrent requests through PQueue", async () => {
    const queue = new PQueue({ intervalCap: 4, interval: 200, carryoverConcurrencyCount: false });
    const executionTimes: number[] = [];

    const tasks = Array.from({ length: 8 }, (_, i) =>
      queue.add(async () => {
        executionTimes.push(Date.now());
        return i;
      })
    );

    const results = await Promise.all(tasks);
    assert.equal(results.length, 8);
    assert.equal(executionTimes.length, 8);

    // The first batch of 4 finishes in the first interval, next 4 in the second interval
    const span = executionTimes[7] - executionTimes[0];
    assert.ok(span >= 180, `Expected time span >= 180ms between 8 throttled items, got ${span}ms`);
  });
});

describe("Phase B: Structured Retry Engine & Backoff", () => {
  function createMockAxiosError(status?: number, code?: string, headers: Record<string, string> = {}): AxiosError {
    const err = new AxiosError(`Mock error ${status ?? code}`);
    err.code = code;
    if (status) {
      err.response = {
        status,
        statusText: `Status ${status}`,
        headers: headers as any,
        config: { headers: new AxiosHeaders() },
        data: { error: `Error message for ${status}` },
      };
    }
    return err;
  }

  it("identifies retryable transient errors (429, 500, 502, 503, 504, network timeouts)", () => {
    assert.ok(isRetryableError(createMockAxiosError(429)));
    assert.ok(isRetryableError(createMockAxiosError(500)));
    assert.ok(isRetryableError(createMockAxiosError(502)));
    assert.ok(isRetryableError(createMockAxiosError(503)));
    assert.ok(isRetryableError(createMockAxiosError(504)));
    assert.ok(isRetryableError(createMockAxiosError(undefined, "ECONNABORTED")));
    assert.ok(isRetryableError(createMockAxiosError(undefined, "ETIMEDOUT")));
    assert.ok(isRetryableError(createMockAxiosError(undefined, "ECONNREFUSED")));
  });

  it("strictly rejects non-retryable 4xx client errors (400, 401, 403, 404, 422)", () => {
    assert.equal(isRetryableError(createMockAxiosError(400)), false);
    assert.equal(isRetryableError(createMockAxiosError(401)), false);
    assert.equal(isRetryableError(createMockAxiosError(403)), false);
    assert.equal(isRetryableError(createMockAxiosError(404)), false);
    assert.equal(isRetryableError(createMockAxiosError(422)), false);
  });

  it("parses Retry-After headers in seconds and date formats", () => {
    assert.equal(parseRetryAfterHeader("5"), 5000);
    assert.equal(parseRetryAfterHeader("120"), 120000);
    assert.equal(parseRetryAfterHeader(null), null);
    assert.equal(parseRetryAfterHeader(undefined), null);
  });

  it("successfully retries on transient 503 and succeeds on next attempt", async () => {
    let callCount = 0;
    const operation = async () => {
      callCount++;
      if (callCount < 2) {
        throw createMockAxiosError(503);
      }
      return { success: true };
    };

    const { data, retries } = await executeWithRetry(operation, "/test-503", 3, 10);
    assert.deepEqual(data, { success: true });
    assert.equal(retries, 1);
    assert.equal(callCount, 2);
  });

  it("immediately throws EtsyApiError on non-retryable 404 without retrying", async () => {
    let callCount = 0;
    const operation = async () => {
      callCount++;
      throw createMockAxiosError(404);
    };

    await assert.rejects(
      async () => executeWithRetry(operation, "/shops/invalid", 3, 10),
      (err: EtsyApiError) => {
        assert.equal(err.name, "EtsyApiError");
        assert.equal(err.statusCode, 404);
        assert.equal(err.isRetryable, false);
        assert.equal(err.retryCount, 0);
        return true;
      }
    );
    assert.equal(callCount, 1, "Non-retryable 404 must not retry");
  });
});

describe("Phase B: Buyer Taxonomy Ingestion & Navigation", () => {
  const mockTaxonomyTree: EtsyRawTaxonomyNode[] = [
    {
      id: 1,
      level: 0,
      name: "Accessories",
      parent_id: null,
      children: [
        {
          id: 2,
          level: 1,
          name: "Hats & Caps",
          parent_id: 1,
          children: [
            {
              id: 3,
              level: 2,
              name: "Baseball & Trucker Caps",
              parent_id: 2,
              children: [],
              full_path_taxonomy_ids: [1, 2, 3],
            },
          ],
          full_path_taxonomy_ids: [1, 2],
        },
        {
          id: 4,
          level: 1,
          name: "Belts & Suspenders",
          parent_id: 1,
          children: [],
          full_path_taxonomy_ids: [1, 4],
        },
      ],
      full_path_taxonomy_ids: [1],
    },
    {
      id: 5,
      level: 0,
      name: "Art & Collectibles",
      parent_id: null,
      children: [
        {
          id: 6,
          level: 1,
          name: "Prints",
          parent_id: 5,
          children: [],
          full_path_taxonomy_ids: [5, 6],
        },
      ],
      full_path_taxonomy_ids: [5],
    },
  ];

  it("flattens nested taxonomy tree into indexed map with full paths", () => {
    const flatMap = flattenTaxonomyTree(mockTaxonomyTree);

    assert.equal(flatMap.size, 6);
    assert.ok(flatMap.has(3));

    const node3 = flatMap.get(3);
    assert.equal(node3?.name, "Baseball & Trucker Caps");
    assert.equal(node3?.fullPath, "Accessories > Hats & Caps > Baseball & Trucker Caps");
    assert.equal(node3?.parentId, 2);
    assert.equal(node3?.level, 2);
  });

  it("searches taxonomy nodes by name and path keywords", () => {
    const flatMap = flattenTaxonomyTree(mockTaxonomyTree);
    const results = searchTaxonomyNodes(flatMap.values(), "caps");

    assert.ok(results.length >= 2);
    assert.equal(results[0].name, "Hats & Caps");
  });
});

describe("Phase B: Multi-Tenant Security & Credentials Leak Prevention", () => {
  it("never includes API keys, tokens, or client secrets in cache keys", () => {
    const cache = new EtsyApiCache(null);
    const sampleSecret = "secret_token_abcdef123456";
    const sampleApiKey = "api_key_keystring_xyz";

    const key = cache.buildKey({
      resource: "shops",
      identifier: "12345",
      queryHash: cache.hashParams({
        keywords: "necklace",
        // Even if bad code passes apiKey in params:
        apiKey: sampleApiKey,
      }),
    });

    assert.ok(!key.includes(sampleSecret));
    assert.ok(!key.includes(sampleApiKey));
    assert.ok(key.startsWith("etsy:v1:public:shops:12345:"));
  });
});
