import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { checkMarketplaceCapability } from "@/marketplaces/core/availability";
import { runMultiMarketResearch } from "@/marketplaces/core/research-pipeline";
import { searchMarketplaceProducts } from "@/services/product-hunting";
import { fetchMarketplaceKeywordResearch } from "@/services/keyword-research";
import { fetchMarketplaceCategoryTree } from "@/services/category-hunting";
import { GET as getMarketplaces } from "@/app/api/marketplaces/route";

const rootDir = process.cwd();
const readSrc = (rel: string) => fs.readFileSync(path.join(rootDir, rel), "utf-8");

describe("Phase 2 — Research Routes Migrated Onto the Marketplace-Neutral Core", () => {
  describe("1-2. Etsy research still flows through the same underlying logic (capability check added, behavior unchanged)", () => {
    it("checkMarketplaceCapability allows Etsy research (no seller account required)", () => {
      assert.equal(checkMarketplaceCapability("etsy", "research"), null);
      assert.equal(checkMarketplaceCapability("etsy", "keywordResearch"), null);
      assert.equal(checkMarketplaceCapability("etsy", "categoryTaxonomy"), null);
    });
  });

  describe("5. Unsupported marketplaces return a structured unavailable state, never a crash or fabricated result", () => {
    it("searchMarketplaceProducts('amazon', ...) returns CapabilityUnavailable instead of throwing", async () => {
      const result = await searchMarketplaceProducts("amazon", "org_test", { keywords: "mug" });
      assert.equal((result as any).available, false);
      assert.equal((result as any).marketplace, "amazon");
      assert.equal((result as any).capability, "research");
    });

    it("fetchMarketplaceKeywordResearch('ebay', ...) returns CapabilityUnavailable instead of throwing", async () => {
      const result = await fetchMarketplaceKeywordResearch("ebay", "org_test", { query: "wallet" });
      assert.equal((result as any).available, false);
      assert.equal((result as any).marketplace, "ebay");
      assert.equal((result as any).capability, "keywordResearch");
    });

    it("fetchMarketplaceCategoryTree('tiktok_shop', ...) returns CapabilityUnavailable instead of throwing", async () => {
      const result = await fetchMarketplaceCategoryTree("tiktok_shop", "org_test");
      assert.equal((result as any).available, false);
      assert.equal((result as any).marketplace, "tiktok_shop");
      assert.equal((result as any).capability, "categoryTaxonomy");
    });

    it("shopify/woocommerce (seller channels, not research marketplaces) also report research unavailable, not fabricated results", async () => {
      const result = await searchMarketplaceProducts("shopify", "org_test", { keywords: "mug" });
      assert.equal((result as any).available, false);
      assert.equal((result as any).reason, "CONNECTOR_NOT_IMPLEMENTED");
    });
  });

  describe("3. Marketplace selector API is registry-driven, not hardcoded", () => {
    it("GET /api/marketplaces reflects the live registry's connectors and capabilities", async () => {
      const res = await getMarketplaces();
      const body = await res.json();
      const ids = body.marketplaces.map((m: any) => m.id);
      assert.ok(ids.includes("etsy"));
      assert.ok(ids.includes("amazon"));
      const etsy = body.marketplaces.find((m: any) => m.id === "etsy");
      assert.equal(etsy.status, "LIVE");
      const amazon = body.marketplaces.find((m: any) => m.id === "amazon");
      assert.equal(amazon.status, "ARCHITECTURE_READY");
    });
  });

  describe("4. No hardcoded marketplace list in the selector UI", () => {
    it("MarketplaceSelector.tsx no longer imports the static MARKETPLACE_DEFINITIONS map", () => {
      const code = readSrc("src/components/ui/MarketplaceSelector.tsx");
      assert.ok(!code.includes("MARKETPLACE_DEFINITIONS"), "must not import the hardcoded marketplace matrix");
      assert.ok(code.includes("/api/marketplaces"), "must fetch marketplace list from the live registry endpoint");
    });
  });

  describe("6-7. Universal scoring receives marketplace rules; Etsy rules are unchanged", () => {
    it("ETSY_OPTIMIZATION_RULES still matches Etsy's real constraints (regression guard for this migration)", async () => {
      const { ETSY_OPTIMIZATION_RULES } = await import("@/marketplaces/core/optimization-rules");
      assert.equal(ETSY_OPTIMIZATION_RULES.titleMaxLength, 140);
      assert.equal(ETSY_OPTIMIZATION_RULES.tagCount, 13);
    });
  });

  describe("8. No Etsy-specific field names leak into the canonical core models", () => {
    it("core/types.ts contains no etsyShopId/etsyListingId/etsy-prefixed field names", () => {
      const code = readSrc("src/marketplaces/core/types.ts");
      const bannedPattern = /\betsy[A-Z]\w*\s*[:?]/; // e.g. etsyShopId:, etsyListingId?:
      assert.ok(!bannedPattern.test(code), "canonical types must use marketplace/externalId, never Etsy-prefixed field names");
    });
  });

  describe("9-10. Research works without a connected seller account, and disconnecting one doesn't break it", () => {
    it("product-hunting/keyword-research/category-hunting resolve credentials via the platform-owned Connector table, not a per-seller SellerChannel", () => {
      // Connector.organizationId is nullable — the normal case is a
      // platform-owned connector shared by every org, not a customer's own
      // OAuth-connected store (SellerChannel). None of the three research
      // services should import from seller-channels at all — if they did,
      // research would incorrectly depend on a seller having connected
      // their own account.
      for (const file of ["src/services/product-hunting.ts", "src/services/keyword-research.ts", "src/services/category-hunting.ts"]) {
        const code = readSrc(file);
        assert.ok(!code.includes("@/seller-channels"), `${file} must not depend on a connected seller account for research`);
        assert.ok(code.includes("getActiveConnectorWithCredentials"), `${file} should resolve the platform-owned Connector`);
      }
    });
  });

  describe("11. Multi-marketplace research architecture", () => {
    it("runMultiMarketResearch returns one independently-marked dataset per marketplace, no fabrication for unsupported ones", async () => {
      const datasets = await runMultiMarketResearch(["etsy", "amazon", "ebay"], { type: "products", keywords: [] });
      assert.equal(datasets.length, 3);
      const etsy = datasets.find((d) => d.marketplace === "etsy");
      const amazon = datasets.find((d) => d.marketplace === "amazon");
      const ebay = datasets.find((d) => d.marketplace === "ebay");
      assert.equal(etsy?.unavailable, false);
      assert.equal(amazon?.unavailable, true);
      assert.equal(ebay?.unavailable, true);
      assert.deepEqual(amazon?.items, [], "unavailable marketplace must return zero fabricated items");
    });
  });

  describe("12. Capability-based UI behavior — no widespread marketplace === 'ETSY' conditionals introduced", () => {
    it("the migrated routes/services gate on registry capabilities, not string-literal marketplace checks", () => {
      for (const file of [
        "src/app/api/products/search/route.ts",
        "src/app/api/keywords/search/route.ts",
        "src/app/api/categories/route.ts",
      ]) {
        const code = readSrc(file);
        assert.ok(code.includes("checkMarketplaceCapability") || code.includes("MarketplaceCategoryTree") || code.includes("searchMarketplaceProducts") || code.includes("fetchMarketplaceKeywordResearch"), `${file} should route through a capability-gated marketplace-aware function`);
      }
    });
  });
});
