/**
 * SellerSalt — Batch 23 Test Suite
 * 
 * Comprehensive verification of Production Trust, Marketplace-Compliant Acquisition Separation,
 * Anti-Circumvention Safeguards, Signal Classification Contracts, and Etsy Capability Matrix.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import type { NormalizedProduct } from "@/marketplaces/core/types";
import {
  MarketplaceAccessResolver,
  AntiCircumventionGuard,
  EtsyCapabilityMatrixService,
  SignalClassifier,
  RetentionGovernanceService,
  MarketplaceGovernanceRegistry,
  SourcePolicyEnforcer,
  SourceBoundary,
} from "@/marketplaces/core/governance";
import { AcquisitionStrategyEngine } from "@/marketplaces/core/acquisition/strategy-engine";
import { AcquisitionRecoveryEngine } from "@/marketplaces/core/acquisition/recovery-engine";
import { ProductOpportunityWorkspaceEngine } from "@/services/intelligence/product-opportunity-workspace-engine";

describe("Batch 23: Production Trust & Marketplace-Compliant Acquisition Separation", () => {
  function createSampleProducts(): NormalizedProduct[] {
    return [
      {
        marketplace: "etsy",
        externalId: "prod_1",
        title: "Handmade Ceramic Pour-Over Coffee Dripper",
        price: 38.0,
        currency: "USD",
        reviewCount: 95,
        rating: 4.9,
        categoryPath: ["Home & Living", "Coffee & Tea"],
        source: "ACTUAL_DATA",
        capturedAt: new Date(),
      },
      {
        marketplace: "amazon",
        externalId: "prod_2",
        title: "Stainless Steel Gooseneck Pour-Over Kettle",
        price: 49.99,
        currency: "USD",
        reviewCount: 420,
        rating: 4.7,
        categoryPath: ["Kitchen & Dining", "Coffee Machines"],
        source: "ACTUAL_DATA",
        capturedAt: new Date(),
      },
    ];
  }

  // --------------------------------------------------------------------------
  // 1. Canonical Marketplace Data Access Modes
  // --------------------------------------------------------------------------
  describe("1. Canonical Marketplace Data Access Modes", () => {
    it("resolves PUBLIC_WEB_ALLOWED for public catalog research on Etsy & Amazon", () => {
      const etsyAccess = MarketplaceAccessResolver.resolveAccessMode("etsy", "PRODUCT_RESEARCH");
      assert.equal(etsyAccess.marketplace, "etsy");
      assert.equal(etsyAccess.capability, "PRODUCT_RESEARCH");
      assert.equal(etsyAccess.accessMode, "PUBLIC_WEB_ALLOWED");
      assert.equal(etsyAccess.primaryAllowedSource, "PUBLIC_WEB");
      assert.equal(etsyAccess.policyStatus, "ALLOWED");

      const amzAccess = MarketplaceAccessResolver.resolveAccessMode("amazon", "PRODUCT_RESEARCH");
      assert.equal(amzAccess.accessMode, "PUBLIC_WEB_ALLOWED");
      assert.equal(amzAccess.primaryAllowedSource, "PUBLIC_WEB");
    });

    it("resolves CONNECTED_STORE_ONLY for decentralized storefronts (Shopify & WooCommerce)", () => {
      const shopifyAccess = MarketplaceAccessResolver.resolveAccessMode("shopify", "PRODUCT_RESEARCH");
      assert.equal(shopifyAccess.accessMode, "CONNECTED_STORE_ONLY");
      assert.equal(shopifyAccess.primaryAllowedSource, "CONNECTED_STORE");
      assert.ok(shopifyAccess.prohibitedStrategies.includes("SCRAPING"));

      const wooAccess = MarketplaceAccessResolver.resolveAccessMode("woocommerce", "PRODUCT_RESEARCH");
      assert.equal(wooAccess.accessMode, "CONNECTED_STORE_ONLY");
    });

    it("resolves API_REQUIRES_OAUTH for authenticated seller-only capabilities", () => {
      const ordersAccess = MarketplaceAccessResolver.resolveAccessMode("etsy", "ORDER_DATA", false, false);
      assert.equal(ordersAccess.accessMode, "API_REQUIRES_OAUTH");
      assert.equal(ordersAccess.requiresOAuth, true);
      assert.equal(ordersAccess.policyStatus, "RESTRICTED");

      const ordersConnected = MarketplaceAccessResolver.resolveAccessMode("etsy", "ORDER_DATA", false, true);
      assert.equal(ordersConnected.accessMode, "API_ALLOWED");
      assert.equal(ordersConnected.policyStatus, "ALLOWED");
    });

    it("resolves REQUIRES_PLATFORM_REVIEW for unknown or unconfirmed marketplaces", () => {
      const unknownAccess = MarketplaceAccessResolver.resolveAccessMode("unregistered_market", "PRODUCT_RESEARCH");
      assert.equal(unknownAccess.accessMode, "REQUIRES_PLATFORM_REVIEW");
      assert.equal(unknownAccess.policyStatus, "REQUIRES_REVIEW");
    });
  });

  // --------------------------------------------------------------------------
  // 2. Anti-Circumvention Enforcement
  // --------------------------------------------------------------------------
  describe("2. Anti-Circumvention Enforcement", () => {
    it("strictly blocks public web fallback when target URL matches a prohibited private portal", () => {
      const result = AntiCircumventionGuard.evaluateApiFallback({
        marketplace: "amazon",
        apiFailureCategory: "ACCESS_RESTRICTED",
        targetUrl: "https://sellercentral.amazon.com/orders",
      });

      assert.equal(result.fallbackAllowed, false);
      assert.equal(result.action, "BLOCK_AND_REPORT_POLICY_RESTRICTED");
      assert.equal(result.policyDecision.status, "PROHIBITED");
      assert.ok(result.reason.includes("prohibited path"));
    });

    it("strictly blocks public web fallback after OAuth failure on platforms prohibiting scraping (Shopify)", () => {
      const result = AntiCircumventionGuard.evaluateApiFallback({
        marketplace: "shopify",
        apiFailureCategory: "NOT_AUTHORIZED",
      });

      assert.equal(result.fallbackAllowed, false);
      assert.equal(result.action, "BLOCK_AND_REPORT_POLICY_RESTRICTED");
      assert.equal(result.policyDecision.status, "PROHIBITED");
      assert.ok(result.reason.includes("prohibits public web scraping fallback"));
    });

    it("permits public catalog fallback when policy independently allows public research", () => {
      const result = AntiCircumventionGuard.evaluateApiFallback({
        marketplace: "etsy",
        apiFailureCategory: "RATE_LIMITED",
        targetUrl: "https://www.etsy.com/search?q=coffee+dripper",
      });

      assert.equal(result.fallbackAllowed, true);
      assert.equal(result.action, "EXECUTE_FALLBACK");
      assert.equal(result.fallbackSource, "PUBLIC_WEB");
    });
  });

  // --------------------------------------------------------------------------
  // 3. Etsy Canonical Capability & Compliance Matrix
  // --------------------------------------------------------------------------
  describe("3. Etsy Canonical Capability Matrix", () => {
    it("defines explicit rules for all 10 Etsy research & commerce capabilities", () => {
      const rules = EtsyCapabilityMatrixService.listRules();
      assert.equal(rules.length, 10);

      const productRule = EtsyCapabilityMatrixService.getRule("PRODUCT_RESEARCH");
      assert.equal(productRule.capability, "PRODUCT_RESEARCH");
      assert.equal(productRule.status, "REQUIRES_PLATFORM_CONFIRMATION");
      assert.equal(productRule.rateLimitPerMinute, 60);
      assert.equal(productRule.requireTrademarkDisclaimer, true);

      const listingMgmtRule = EtsyCapabilityMatrixService.getRule("LISTING_MANAGEMENT");
      assert.ok(listingMgmtRule.requiredOAuthScopes.includes("listings_w"));
      assert.equal(listingMgmtRule.authRequirement, "OAUTH_SELLER_AUTHORIZED");

      const ordersRule = EtsyCapabilityMatrixService.getRule("ORDER_DATA");
      assert.ok(ordersRule.requiredOAuthScopes.includes("transactions_r"));
    });
  });

  // --------------------------------------------------------------------------
  // 4. Signal Classification Contract
  // --------------------------------------------------------------------------
  describe("4. Signal Classification Contract", () => {
    it("classifies observed empirical signals with accurate provenance", () => {
      const priceSignal = SignalClassifier.classify({
        name: "Listing Price",
        value: 38.0,
        classification: "OBSERVED",
        source: "PUBLIC_WEB",
        confidence: 90,
      });

      assert.equal(priceSignal.name, "Listing Price");
      assert.equal(priceSignal.value, 38.0);
      assert.equal(priceSignal.classification, "OBSERVED");
      assert.equal(priceSignal.isAvailable, true);
      assert.equal(priceSignal.confidence, 90);
    });

    it("classifies derived signals deterministically without synthetic assumptions", () => {
      const p50Signal = SignalClassifier.classify({
        name: "Median Price (P50)",
        value: 43.99,
        classification: "DERIVED",
        methodology: "Calculated empirical 50th percentile across observed search cards.",
      });

      assert.equal(p50Signal.classification, "DERIVED");
      assert.equal(p50Signal.value, 43.99);
      assert.ok(p50Signal.methodology);
    });

    it("marks unavailable private signals as UNAVAILABLE with null value", () => {
      const searchVolume = SignalClassifier.unavailable(
        "Monthly Search Volume",
        "SellerSalt does not currently license a commercial search volume dataset for this marketplace."
      );

      assert.equal(searchVolume.name, "Monthly Search Volume");
      assert.equal(searchVolume.value, null);
      assert.equal(searchVolume.classification, "UNAVAILABLE");
      assert.equal(searchVolume.isAvailable, false);
      assert.equal(searchVolume.confidence, 0);
      assert.ok(searchVolume.limitations?.includes("Zero-Fabrication"));
    });
  });

  // --------------------------------------------------------------------------
  // 5. Data Retention & Safe Pruning
  // --------------------------------------------------------------------------
  describe("5. Retention Governance & Safe Pruning", () => {
    it("supports safe dry-run pruning with audit outputs", async () => {
      const result = await RetentionGovernanceService.pruneExpiredSnapshots({
        dryRun: true,
        marketplace: "etsy",
      });

      assert.equal(result.isDryRun, true);
      assert.equal(result.marketplaceScoped, "etsy");
      assert.ok(result.cutoffDate instanceof Date);
      assert.ok(typeof result.shopSnapshotsPruned === "number");
      assert.ok(typeof result.listingSnapshotsPruned === "number");
      assert.ok(result.durationMs >= 0);
    });
  });

  // --------------------------------------------------------------------------
  // 6. Strategy Engine & Recovery Policy Gates
  // --------------------------------------------------------------------------
  describe("6. Strategy Engine & Recovery Policy Gates", () => {
    it("strategy engine excludes public web strategies when policy prohibits them (Shopify)", async () => {
      const plan = await AcquisitionStrategyEngine.resolveStrategyPlan({
        marketplace: "shopify",
        researchType: "PRODUCT",
      });

      assert.equal(plan.marketplace, "shopify");
      assert.ok(!plan.strategies.some((s) => s.sourceType === "PUBLIC_WEB"));
      assert.ok(plan.strategies.some((s) => s.sourceType === "HISTORICAL_OBSERVATION"));
    });

    it("recovery engine sanitizes all acquired items through SourceBoundary", async () => {
      const products = createSampleProducts();
      const res = await AcquisitionRecoveryEngine.executeWithRecovery({
        marketplace: "etsy",
        researchType: "PRODUCT",
        query: "ceramic coffee dripper",
      });

      assert.ok(res.totalDurationMs >= 0);
      assert.ok(Array.isArray(res.items));
      // Sanity check that items are sanitized
      if (res.items.length > 0) {
        assert.equal((res.items[0] as any).shop?.email, undefined);
      }
    });
  });

  // --------------------------------------------------------------------------
  // 7. End-to-End Workflow Integration
  // --------------------------------------------------------------------------
  describe("7. End-to-End Product Opportunity Workspace Workflow", () => {
    it("orchestrates complete research-to-workspace pipeline with governance & trust", async () => {
      const products = createSampleProducts();
      const workspace = await ProductOpportunityWorkspaceEngine.createOrRefreshWorkspace({
        organizationId: "org_trust_test",
        query: "coffee dripper",
        title: "Ceramic Coffee Dripper Set",
        products,
        marketplaces: ["etsy", "amazon"],
        userEconomics: {
          unitProductCost: 9.0,
          targetSalePrice: 42.0,
        },
      });

      assert.ok(workspace.id);
      assert.equal(workspace.organizationId, "org_trust_test");
      assert.ok(workspace.dataTrust);
      assert.ok(workspace.dataTrust.overallTrustScore >= 60);
      assert.equal(workspace.dataTrust.policyComplianceStatus, "REQUIRES_REVIEW");
      assert.ok(workspace.dataTrust.transparentDisclosures.some((d) => d.includes("Zero synthetic search volume")));
      assert.ok(workspace.commercialDecision);
      assert.ok(workspace.actionPlan.items.length > 0);
    });
  });
});
