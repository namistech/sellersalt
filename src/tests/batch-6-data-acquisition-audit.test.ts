import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { MarketplaceRegistry, registerAllConnectors } from "@/marketplaces/core/registry";
import { NO_CAPABILITIES } from "@/marketplaces/core/capabilities";
import { getSnapshotRetentionCutoff } from "@/lib/data-retention";

const rootDir = process.cwd();
const readSrc = (rel: string) => fs.readFileSync(path.join(rootDir, rel), "utf-8");

describe("Batch 6: Data Acquisition & Intelligence Pipeline Audit", () => {
  registerAllConnectors();

  describe("1. Complete Data Supply Chain Verification", () => {
    it("Product Research route uses searchMarketplaceProducts and enforces organization-scoped quota", () => {
      const routeSrc = readSrc("src/app/api/products/search/route.ts");
      assert.ok(routeSrc.includes("searchMarketplaceProducts"), "must use searchMarketplaceProducts service");
      assert.ok(routeSrc.includes("checkQuota"), "must check organization quota");
      assert.ok(routeSrc.includes("resolveMarketplace"), "must resolve marketplace parameter");
    });

    it("Keyword Research routes separate live tag harvesting from historical internal research", () => {
      const searchRouteSrc = readSrc("src/app/api/keywords/search/route.ts");
      const historicalRouteSrc = readSrc("src/app/api/keyword-research/route.ts");

      // Live search route calls fetchMarketplaceKeywordResearch
      assert.ok(searchRouteSrc.includes("fetchMarketplaceKeywordResearch"));
      assert.ok(searchRouteSrc.includes("fetchAllMarketplaceKeywordResearch"));

      // Historical route queries PostgreSQL prospect table
      assert.ok(historicalRouteSrc.includes("prisma.prospect.findMany"));
      assert.ok(historicalRouteSrc.includes("organizationId"));
    });

    it("Category Hunting fetches real Etsy buyer taxonomy and sample listings", () => {
      const catSrc = readSrc("src/services/category-hunting.ts");
      assert.ok(catSrc.includes("getBuyerTaxonomyNodes"), "must fetch buyer taxonomy nodes");
      assert.ok(catSrc.includes("getPropertiesByBuyerTaxonomyId"), "must fetch taxonomy properties");
      assert.ok(catSrc.includes("searchListings"), "must ingest active sample listings");
      assert.ok(catSrc.includes("computeCategoryBenchmarks"), "must calculate benchmarks deterministically");
    });

    it("Shop Intelligence profiles competitor stores using real shop API resources", () => {
      const shopSrc = readSrc("src/services/shop-intelligence.ts");
      assert.ok(shopSrc.includes("getShop"), "must fetch shop profile");
      assert.ok(shopSrc.includes("getShopListings"), "must fetch active shop listings");
      assert.ok(shopSrc.includes("getShopReviews"), "must fetch recent shop reviews");
      assert.ok(shopSrc.includes("scoreShopCompetition"), "must score competition via opportunity engine");
    });

    it("Product Detail page dual-resolves stored Prospect rows and live Etsy listings with canonical scoring", () => {
      const detailPageSrc = readSrc("src/app/(dashboard)/products/[listingId]/page.tsx");
      assert.ok(detailPageSrc.includes("prisma.prospect.findFirst"), "must look up local Prospect");
      assert.ok(detailPageSrc.includes("client.getListing"), "must fetch live listing from Etsy");
      assert.ok(detailPageSrc.includes("client.getListingImages"), "must fetch multi-image gallery");
      assert.ok(detailPageSrc.includes("evaluateCanonicalOpportunity"), "must evaluate canonical opportunity server-side");
    });

    it("Opportunity Radar consumes evaluateCanonicalOpportunity and avoids private weights", () => {
      const oppsSrc = readSrc("src/services/opportunities.ts");
      assert.ok(oppsSrc.includes("evaluateCanonicalOpportunity"));
      assert.ok(!oppsSrc.includes("calculateVelocitySignal"));
      assert.ok(!oppsSrc.includes("calculateDensitySignal"));
      assert.ok(!oppsSrc.includes("calculateCompetitionSignal"));
    });

    it("SaltBot tool registry executes through real services with honest provenance", () => {
      const toolsSrc = readSrc("src/services/assistant/tool-registry.ts");
      assert.ok(toolsSrc.includes("searchEtsyMarketplaceProducts"));
      assert.ok(toolsSrc.includes("fetchCompleteShopIntelligence"));
      assert.ok(toolsSrc.includes("auditListingSeo"));
      assert.ok(toolsSrc.includes("ACTUAL_ETSY_DATA"));
    });

    it("Shop Watch background worker captures snapshots through MarketplaceRegistry", () => {
      const workerSrc = readSrc("src/workers/index.ts");
      assert.ok(workerSrc.includes("MarketplaceRegistry.tryGetConnector"));
      assert.ok(workerSrc.includes("connector.getPublicShopStats"));
      assert.ok(workerSrc.includes("prisma.shopSnapshot.create"));
      assert.ok(workerSrc.includes("getSnapshotRetentionCutoff"));
    });
  });

  describe("2. Marketplace Connector Audit & Capabilities", () => {
    it("Etsy connector has real capabilities and matches integration matrix", () => {
      const etsy = MarketplaceRegistry.getConnector("etsy");
      assert.equal(etsy.marketplace, "etsy");
      assert.equal(etsy.capabilities.research, true);
      assert.equal(etsy.capabilities.keywordResearch, true);
      assert.equal(etsy.capabilities.categoryTaxonomy, true);
      assert.equal(etsy.capabilities.accountAuth, true);
      assert.equal(etsy.capabilities.readShops, true);
      assert.equal(etsy.capabilities.readOrders, true);
      assert.equal(etsy.capabilities.createListing, true);
      assert.equal(etsy.capabilities.updateListing, true);
      // Silent auto-publish is deliberately false
      assert.equal(etsy.capabilities.publishListing, false);
      assert.equal(etsy.capabilities.readProducts, false);
      assert.equal(etsy.capabilities.readListings, false);
    });

    it("Shopify and WooCommerce connectors are PARTIAL (account and orders only)", () => {
      const shopify = MarketplaceRegistry.getConnector("shopify");
      const woo = MarketplaceRegistry.getConnector("woocommerce");

      assert.equal(shopify.capabilities.research, false);
      assert.equal(shopify.capabilities.keywordResearch, false);
      assert.equal(shopify.capabilities.accountAuth, true);
      assert.equal(shopify.capabilities.readOrders, true);

      assert.equal(woo.capabilities.research, false);
      assert.equal(woo.capabilities.keywordResearch, false);
      assert.equal(woo.capabilities.accountAuth, true);
      assert.equal(woo.capabilities.readOrders, true);
    });

    it("Amazon, eBay, and TikTok Shop connectors are ARCHITECTURE READY (all capabilities false)", () => {
      const amazon = MarketplaceRegistry.getConnector("amazon");
      const ebay = MarketplaceRegistry.getConnector("ebay");
      const tiktok = MarketplaceRegistry.getConnector("tiktok_shop");

      assert.deepEqual(amazon.capabilities, NO_CAPABILITIES);
      assert.deepEqual(ebay.capabilities, NO_CAPABILITIES);
      assert.deepEqual(tiktok.capabilities, NO_CAPABILITIES);
    });
  });

  describe("3. Connected Seller Data vs. Market Research Domain Decoupling", () => {
    it("research pipeline and services do not import from seller-channels", () => {
      const researchPipeline = readSrc("src/marketplaces/core/research-pipeline.ts");
      const productHunting = readSrc("src/services/product-hunting.ts");
      const keywordResearch = readSrc("src/services/keyword-research.ts");
      const categoryHunting = readSrc("src/services/category-hunting.ts");
      const shopIntelligence = readSrc("src/services/shop-intelligence.ts");

      assert.ok(!researchPipeline.includes("@/seller-channels"));
      assert.ok(!productHunting.includes("@/seller-channels"));
      assert.ok(!keywordResearch.includes("@/seller-channels"));
      assert.ok(!categoryHunting.includes("@/seller-channels"));
      assert.ok(!shopIntelligence.includes("@/seller-channels"));
    });

    it("seller channel synchronization operates strictly on SellerChannel and SellerOrder", () => {
      const syncSrc = readSrc("src/lib/sync-seller-channel.ts");
      assert.ok(syncSrc.includes("prisma.sellerChannel.findUniqueOrThrow"));
      assert.ok(syncSrc.includes("prisma.sellerOrder.upsert"));
      assert.ok(!syncSrc.includes("prisma.prospect"));
      assert.ok(!syncSrc.includes("prisma.shopSnapshot"));
    });
  });

  describe("4. Etsy Data Acquisition Hardening", () => {
    it("Etsy client enforces queue rate limit and exponential backoff retry", () => {
      const clientSrc = readSrc("src/connectors/etsy/client.ts");
      assert.ok(clientSrc.includes("PQueue"), "must use PQueue for rate limiting");
      assert.ok(clientSrc.includes("DEFAULT_REQUESTS_PER_SECOND = 8"), "must default to 8 req/sec");
      assert.ok(clientSrc.includes("executeWithRetry"), "must execute with retry on 429/5xx");
      assert.ok(clientSrc.includes("parseRetryAfterHeader"), "must parse Retry-After header");
    });

    it("Etsy connector supports both create_date and created_timestamp for shop age calculation", () => {
      const connectorIndex = readSrc("src/connectors/etsy/index.ts");
      assert.ok(connectorIndex.includes("shop.create_date ?? shop.created_timestamp"));
    });

    it("Data retention policy prunes snapshots bounded to active packages", async () => {
      const cutoff = await getSnapshotRetentionCutoff();
      assert.ok(cutoff instanceof Date);
      assert.ok(cutoff.getTime() < Date.now(), "cutoff must be in the past");
    });
  });
});
