/**
 * SellerSalt — Batch 22 Test Suite
 * 
 * Comprehensive verification of Marketplace Data Governance, Source Policy Enforcement,
 * Source Boundary Layer, Retention Governance, and the Data Trust System.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import type { NormalizedProduct } from "@/marketplaces/core/types";
import {
  MarketplaceGovernanceRegistry,
  SourcePolicyEnforcer,
  SourceBoundary,
  RetentionGovernanceService,
} from "@/marketplaces/core/governance";
import { DataTrustEngine } from "@/services/intelligence/data-trust-engine";
import { ProductOpportunityWorkspaceEngine } from "@/services/intelligence/product-opportunity-workspace-engine";

describe("Batch 22: Marketplace Governance & Source-Compliant Intelligence", () => {
  // Helper product fixture
  function createSampleProducts(): NormalizedProduct[] {
    return [
      {
        marketplace: "etsy",
        externalId: "prod_etsy_1",
        title: "Handmade Ceramic Mug Matte Glaze",
        price: 32.0,
        currency: "USD",
        reviewCount: 140,
        shop: {
          name: "Clay Studio",
          externalId: "shop_123",
          // Intentionally inject private PII to test SourceBoundary sanitization
          email: "seller@claystudio.com",
          phone: "+1-555-0199",
        } as any,
        categoryPath: ["Home & Living", "Drinkware"],
        source: "ACTUAL_DATA",
        capturedAt: new Date(),
      },
      {
        marketplace: "amazon",
        externalId: "prod_amz_2",
        title: "Modern Stoneware Espresso Cup Set",
        price: 44.0,
        currency: "USD",
        reviewCount: 320,
        shop: { name: "Kitchen Crafts" },
        categoryPath: ["Home & Kitchen", "Dining"],
        source: "ACTUAL_DATA",
        capturedAt: new Date(),
      },
    ];
  }

  // --------------------------------------------------------------------------
  // 1. Marketplace Governance Registry & Policies
  // --------------------------------------------------------------------------
  describe("1. Marketplace Governance Registry", () => {
    it("retrieves authoritative policies for registered platforms", () => {
      const etsyPolicy = MarketplaceGovernanceRegistry.getPolicy("etsy");
      assert.equal(etsyPolicy.marketplace, "etsy");
      assert.equal(etsyPolicy.displayName, "Etsy");
      assert.equal(etsyPolicy.complianceStatus, "REQUIRES_PLATFORM_CONFIRMATION");
      assert.ok(etsyPolicy.displayRules.requireMarketplaceDisclaimer);
      assert.ok(etsyPolicy.displayRules.disclaimerText?.includes("trademark of Etsy, Inc."));
      assert.equal(etsyPolicy.privateDataRules.allowScrapingPrivateDashboards, false);

      const amzPolicy = MarketplaceGovernanceRegistry.getPolicy("amazon");
      assert.equal(amzPolicy.marketplace, "amazon");
      assert.equal(amzPolicy.publicWebAllowed, "ALLOWED");
      assert.equal(amzPolicy.officialApiAvailable, "RESTRICTED");

      const shopifyPolicy = MarketplaceGovernanceRegistry.getPolicy("shopify");
      assert.equal(shopifyPolicy.marketplace, "shopify");
      assert.equal(shopifyPolicy.publicWebAllowed, "PROHIBITED");
      assert.equal(shopifyPolicy.connectedStoreAllowed, "ALLOWED");
    });

    it("applies strict conservative fallback policy for unregistered marketplaces", () => {
      const unknownPolicy = MarketplaceGovernanceRegistry.getPolicy("unknown_commerce_site");
      assert.equal(unknownPolicy.publicWebAllowed, "UNKNOWN");
      assert.equal(unknownPolicy.officialApiAvailable, "UNKNOWN");
      assert.equal(unknownPolicy.complianceStatus, "REQUIRES_PLATFORM_CONFIRMATION");
      assert.equal(unknownPolicy.entityDataRules.imageUsageRule, "PROHIBITED");
    });

    it("lists all registered policies", () => {
      const all = MarketplaceGovernanceRegistry.listPolicies();
      assert.ok(all.length >= 7);
      assert.ok(all.some((p) => p.marketplace === "etsy"));
      assert.ok(all.some((p) => p.marketplace === "amazon"));
      assert.ok(all.some((p) => p.marketplace === "ebay"));
      assert.ok(all.some((p) => p.marketplace === "walmart"));
      assert.ok(all.some((p) => p.marketplace === "shopify"));
      assert.ok(all.some((p) => p.marketplace === "woocommerce"));
      assert.ok(all.some((p) => p.marketplace === "tiktok_shop"));
    });
  });

  // --------------------------------------------------------------------------
  // 2. Source Policy Enforcer
  // --------------------------------------------------------------------------
  describe("2. Source Policy Enforcer", () => {
    it("permits allowed public web research on authorized domains", () => {
      const decision = SourcePolicyEnforcer.evaluateRequest({
        organizationId: "org_test",
        marketplace: "etsy",
        sourceType: "PUBLIC_WEB",
        purpose: "PRODUCT_SEARCH",
        targetUrl: "https://www.etsy.com/search?q=ceramic+mug",
      });

      assert.equal(decision.allowed, true);
      assert.equal(decision.status, "ALLOWED");
      assert.ok(decision.requiresDisclaimer);
    });

    it("prohibits public web research on decentralized store platforms (Shopify)", () => {
      const decision = SourcePolicyEnforcer.evaluateRequest({
        organizationId: "org_test",
        marketplace: "shopify",
        sourceType: "PUBLIC_WEB",
        purpose: "PRODUCT_SEARCH",
      });

      assert.equal(decision.allowed, false);
      assert.equal(decision.status, "PROHIBITED");
      assert.ok(decision.reason.includes("prohibited"));
    });

    it("blocks prohibited private seller portal URLs (Amazon Seller Central)", () => {
      const decision = SourcePolicyEnforcer.evaluateRequest({
        organizationId: "org_test",
        marketplace: "amazon",
        sourceType: "PUBLIC_WEB",
        purpose: "PRODUCT_SEARCH",
        targetUrl: "https://sellercentral.amazon.com/inventory",
      });

      assert.equal(decision.allowed, false);
      assert.equal(decision.status, "PROHIBITED");
      assert.ok(decision.reason.includes("prohibited private portal"));
    });

    it("blocks prohibited private seller portal URLs (Etsy Shop Manager)", () => {
      const decision = SourcePolicyEnforcer.evaluateRequest({
        organizationId: "org_test",
        marketplace: "etsy",
        sourceType: "PUBLIC_WEB",
        purpose: "PRODUCT_SEARCH",
        targetUrl: "https://www.etsy.com/your/shops/claystudio/stats",
      });

      assert.equal(decision.allowed, false);
      assert.equal(decision.status, "PROHIBITED");
      assert.ok(decision.reason.includes("prohibited private portal"));
    });

    it("records governance audit logs", () => {
      const logs = SourcePolicyEnforcer.getRecentLogs(10);
      assert.ok(logs.length >= 1);
      assert.ok(logs.some((l) => l.decision === "PROHIBITED" || l.decision === "ALLOWED"));
    });
  });

  // --------------------------------------------------------------------------
  // 3. Source Boundary Layer
  // --------------------------------------------------------------------------
  describe("3. Source Boundary Layer", () => {
    it("sanitizes product observations and strips private seller contact PII", () => {
      const products = createSampleProducts();
      const sanitized = SourceBoundary.sanitizeProducts(products);

      assert.equal(sanitized.length, 2);
      // Verify seller PII was stripped from product 0
      assert.equal((sanitized[0].shop as any).email, undefined);
      assert.equal((sanitized[0].shop as any).phone, undefined);
      assert.equal(sanitized[0].shop?.name, "Clay Studio");
      assert.equal(sanitized[0].price, 32.0);
    });

    it("enforces tenancy isolation", () => {
      assert.doesNotThrow(() => {
        SourceBoundary.assertTenancy("org_123", "org_123");
      });

      assert.throws(() => {
        SourceBoundary.assertTenancy("org_123", "org_456");
      }, /Cross-tenant access violation/);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Retention Governance Service
  // --------------------------------------------------------------------------
  describe("4. Retention Governance Service", () => {
    it("calculates retention cutoff date and evaluates expired records", async () => {
      const cutoff = await RetentionGovernanceService.getRetentionCutoff("etsy");
      assert.ok(cutoff instanceof Date);

      const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000); // 40 days old
      const freshDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days old

      const isOldExpired = await RetentionGovernanceService.isExpired("etsy", oldDate);
      const isFreshExpired = await RetentionGovernanceService.isExpired("etsy", freshDate);

      assert.equal(isOldExpired, true);
      assert.equal(isFreshExpired, false);
    });

    it("executes safe pruning of expired snapshots", async () => {
      const result = await RetentionGovernanceService.pruneExpiredSnapshots();
      assert.ok(result.cutoffDate instanceof Date);
      assert.ok(typeof result.shopSnapshotsPruned === "number");
      assert.ok(typeof result.listingSnapshotsPruned === "number");
      assert.ok(result.durationMs >= 0);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Data Trust Engine
  // --------------------------------------------------------------------------
  describe("5. Data Trust Engine", () => {
    it("evaluates data trust summary with explicit signal accounting and disclosures", () => {
      const products = createSampleProducts();
      const trust = DataTrustEngine.evaluateTrust({
        products,
        marketplaces: ["etsy", "amazon"],
        hasUserEconomics: true,
      });

      assert.ok(trust.overallTrustScore >= 60);
      assert.ok(trust.sourceDiversityScore > 0);
      assert.ok(trust.freshnessScore > 0);
      assert.equal(trust.totalObservations, 2);
      assert.ok(trust.observedMetricCount >= 4);
      assert.ok(trust.derivedMetricCount >= 1);
      assert.ok(trust.unknownSignalCount >= 2);
      assert.ok(trust.transparentDisclosures.length >= 2);
      assert.ok(trust.transparentDisclosures.some((d) => d.includes("Zero synthetic search volume")));
    });
  });

  // --------------------------------------------------------------------------
  // 6. Unified Workspace Integration with Governance
  // --------------------------------------------------------------------------
  describe("6. Unified Workspace Integration", () => {
    it("assembles workspace containing dataTrust summary and governancePolicy", async () => {
      const products = createSampleProducts();
      const workspace = await ProductOpportunityWorkspaceEngine.createOrRefreshWorkspace({
        organizationId: "org_gov_test",
        query: "ceramic espresso mug",
        title: "Ceramic Espresso Mug",
        products,
        marketplaces: ["etsy", "amazon"],
        userEconomics: {
          unitProductCost: 7.5,
          targetSalePrice: 34.0,
        },
      });

      assert.ok(workspace.id);
      assert.equal(workspace.organizationId, "org_gov_test");
      assert.ok(workspace.dataTrust);
      assert.ok(workspace.dataTrust.overallTrustScore > 0);
      assert.ok(workspace.governancePolicy);
      assert.equal(workspace.governancePolicy.marketplace, "etsy");
      assert.ok(workspace.governancePolicy.displayRules.requireMarketplaceDisclaimer);
    });
  });
});
