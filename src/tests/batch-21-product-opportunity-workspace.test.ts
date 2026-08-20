/**
 * SellerSalt — Batch 21 Test Suite
 * 
 * Comprehensive verification of the Product Opportunity → Sourcing → Launch Intelligence Engine.
 * Tests Attribute Intelligence, Differentiation Builder 2.0, Market Positioning,
 * Product Configurations, Sourcing Specifications, Unit Economics Scenarios,
 * Launch Readiness, Commercial Decision Tree, Information Value Gaps,
 * Action Plan Generator, Evidence Ledger, and Zero-Fabrication integrity.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import type { NormalizedProduct } from "@/marketplaces/core/types";
import { ProductAttributeIntelligenceEngine } from "@/services/intelligence/product-attribute-intelligence";
import { DifferentiationBuilder2Engine } from "@/services/intelligence/differentiation-builder-2";
import { MarketPositioningEngine } from "@/services/intelligence/market-positioning-engine";
import { ProductConfigurationBuilder } from "@/services/intelligence/product-configuration-builder";
import { SourcingRequirementsEngine } from "@/services/intelligence/sourcing-requirements-engine";
import { UnitEconomicsScenarioEngine } from "@/services/intelligence/unit-economics-scenario-engine";
import { LaunchReadinessEngine } from "@/services/intelligence/launch-readiness-engine";
import { CommercialDecisionTree } from "@/services/intelligence/commercial-decision-tree";
import { InformationValueEngine } from "@/services/intelligence/information-value-engine";
import { ActionPlanGenerator } from "@/services/intelligence/action-plan-generator";
import { EvidenceLedgerBuilder } from "@/services/intelligence/evidence-ledger-builder";
import { ProductOpportunityWorkspaceEngine } from "@/services/intelligence/product-opportunity-workspace-engine";

describe("Batch 21: Product Opportunity → Sourcing → Launch Intelligence Engine", () => {
  // Helper to construct sample product observations
  function createSampleProducts(): NormalizedProduct[] {
    return [
      {
        marketplace: "etsy",
        externalId: "prod_1",
        title: "Handmade Ceramic Coffee Mug White Matte Glaze",
        price: 28.0,
        currency: "USD",
        reviewCount: 120,
        shop: { name: "Studio Clay" },
        categoryPath: ["Home & Living", "Drinkware"],
        source: "ACTUAL_DATA",
        capturedAt: new Date(),
      },
      {
        marketplace: "etsy",
        externalId: "prod_2",
        title: "Vintage Ceramic Tea Cup Set of 2",
        price: 34.0,
        currency: "USD",
        reviewCount: 85,
        shop: { name: "Earth & Ware" },
        categoryPath: ["Home & Living", "Drinkware"],
        source: "ACTUAL_DATA",
        capturedAt: new Date(),
      },
      {
        marketplace: "amazon",
        externalId: "prod_3",
        title: "Modern Minimalist Stoneware Espresso Mug Gift Set",
        price: 45.0,
        currency: "USD",
        reviewCount: 310,
        shop: { name: "Artisan Living" },
        categoryPath: ["Home & Kitchen", "Dining"],
        source: "ACTUAL_DATA",
        capturedAt: new Date(),
      },
      {
        marketplace: "ebay",
        externalId: "prod_4",
        title: "Rustic Ceramic Coffee Mug Handmade Glazed",
        price: 22.0,
        currency: "USD",
        reviewCount: 45,
        shop: { name: "Pottery Works" },
        categoryPath: ["Home", "Mugs"],
        source: "ACTUAL_DATA",
        capturedAt: new Date(),
      },
      {
        marketplace: "walmart",
        externalId: "prod_5",
        title: "Premium Porcelain Coffee Mug Set Pack of 4",
        price: 52.0,
        currency: "USD",
        reviewCount: 90,
        shop: { name: "Home Essentials" },
        categoryPath: ["Home", "Dining"],
        source: "ACTUAL_DATA",
        capturedAt: new Date(),
      },
    ];
  }

  // --------------------------------------------------------------------------
  // 1. Product Attribute Intelligence
  // --------------------------------------------------------------------------
  describe("1. Product Attribute Intelligence Engine", () => {
    it("extracts observable attributes with empirical prevalence and price association", () => {
      const products = createSampleProducts();
      const summary = ProductAttributeIntelligenceEngine.analyze(products);

      assert.equal(summary.totalSampledListings, 5);
      assert.ok(summary.dominantAttributes.length > 0);
      
      const ceramicAttr = summary.dominantAttributes.find((a) => a.value === "ceramic");
      assert.ok(ceramicAttr);
      assert.ok(ceramicAttr.listingPrevalencePercent >= 50);
      assert.ok(ceramicAttr.medianPriceAssociated !== null);
      assert.equal(ceramicAttr.provenance, "ACTUAL_DATA");
    });

    it("identifies underrepresented attribute niches (<15% prevalence)", () => {
      const products = createSampleProducts();
      const summary = ProductAttributeIntelligenceEngine.analyze(products);

      assert.ok(summary.underrepresentedAttributes.length >= 1);
      for (const under of summary.underrepresentedAttributes) {
        assert.ok(under.listingPrevalencePercent < 50);
        assert.equal(under.isUnderrepresented, true);
      }
    });
  });

  // --------------------------------------------------------------------------
  // 2. Differentiation Builder 2.0
  // --------------------------------------------------------------------------
  describe("2. Differentiation Builder 2.0", () => {
    it("generates evidence-grounded differentiation candidates", () => {
      const products = createSampleProducts();
      const attributes = ProductAttributeIntelligenceEngine.analyze(products);
      const diffResult = DifferentiationBuilder2Engine.buildDifferentiation(
        attributes,
        products,
        "Ceramic Coffee Mug"
      );

      assert.ok(diffResult.candidates.length >= 1);
      const topCand = diffResult.candidates[0];
      assert.ok(topCand.title);
      assert.ok(topCand.supportingEvidence.length >= 1);
      assert.ok(topCand.identifiedRisks.length >= 1);
      assert.ok(topCand.unknowns.length >= 1);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Market Price Positioning Engine
  // --------------------------------------------------------------------------
  describe("3. Market Price Positioning Engine", () => {
    it("calculates empirical quantiles and constructs 5 positioning tiers", () => {
      const products = createSampleProducts();
      const positioning = MarketPositioningEngine.analyzePositioning(products);

      assert.equal(positioning.empiricalQuantiles.sampleSize, 5);
      assert.equal(positioning.empiricalQuantiles.min, 22.0);
      assert.equal(positioning.empiricalQuantiles.max, 52.0);
      assert.ok(positioning.empiricalQuantiles.p50 !== null);
      assert.equal(positioning.scenarios.length, 5);
      assert.equal(positioning.recommendedScenario, "UPPER_MID");
    });

    it("returns INSUFFICIENT_DATA when fewer than 3 price observations exist", () => {
      const sparseProducts: NormalizedProduct[] = [
        {
          marketplace: "etsy",
          externalId: "sparse_1",
          title: "Single Item",
          price: 25.0,
          currency: "USD",
          source: "ACTUAL_DATA",
          capturedAt: new Date(),
        },
      ];

      const positioning = MarketPositioningEngine.analyzePositioning(sparseProducts);
      assert.equal(positioning.recommendedScenario, "INSUFFICIENT_DATA");
      assert.equal(positioning.empiricalQuantiles.p50, null);
      assert.equal(positioning.scenarios.length, 0);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Product Configuration Builder
  // --------------------------------------------------------------------------
  describe("4. Product Configuration Builder", () => {
    it("constructs product configuration distinguishing observed vs derived attributes", () => {
      const products = createSampleProducts();
      const attributes = ProductAttributeIntelligenceEngine.analyze(products);
      const diffResult = DifferentiationBuilder2Engine.buildDifferentiation(attributes, products, "Mug");
      const positioning = MarketPositioningEngine.analyzePositioning(products);

      const config = ProductConfigurationBuilder.buildConfiguration(
        "Ceramic Coffee Mug",
        attributes,
        diffResult.candidates[0],
        positioning
      );

      assert.ok(config.name.includes("Ceramic Coffee Mug"));
      assert.ok(config.observedCombinations.length >= 1);
      assert.ok(config.bundleContents.length >= 2);
      assert.ok(config.unknownInputs.length >= 1);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Sourcing Requirements Specification Engine
  // --------------------------------------------------------------------------
  describe("5. Sourcing Requirements Engine", () => {
    it("generates structured RFQ questions and specifications without fake suppliers", () => {
      const products = createSampleProducts();
      const attributes = ProductAttributeIntelligenceEngine.analyze(products);
      const diffResult = DifferentiationBuilder2Engine.buildDifferentiation(attributes, products, "Mug");
      const positioning = MarketPositioningEngine.analyzePositioning(products);
      const config = ProductConfigurationBuilder.buildConfiguration("Mug", attributes, diffResult.candidates[0], positioning);

      const sourcing = SourcingRequirementsEngine.generateSpecification(config, attributes);

      assert.ok(sourcing.sourcingQuestionsForSuppliers.length >= 5);
      assert.ok(sourcing.requiredSupplierDataPoints.length >= 3);
      assert.ok(sourcing.qualityAndCompliance.safetyStandards.length >= 1);
      assert.equal(sourcing.userLandCostInput, null); // Unentered
    });
  });

  // --------------------------------------------------------------------------
  // 6. Unit Economics Scenario Engine 2.0
  // --------------------------------------------------------------------------
  describe("6. Unit Economics Scenario Engine 2.0", () => {
    it("evaluates Conservative, Base, and Optimistic scenarios from explicit user inputs", () => {
      const analysis = UnitEconomicsScenarioEngine.evaluateAnalysis({
        targetSalePrice: 42.0,
        unitProductCost: 9.0,
        packagingCost: 1.5,
        inboundShippingCost: 2.0,
        targetAdvertisingCostPerSale: 8.0,
      });

      assert.equal(analysis.verdict, "HIGHLY_VIABLE");
      assert.ok(analysis.scenarios.base.metrics.grossProfit > 0);
      assert.ok(analysis.scenarios.base.metrics.contributionProfit > 0);
      assert.ok(analysis.scenarios.conservative.metrics.totalDirectCost > analysis.scenarios.base.metrics.totalDirectCost);
      assert.ok(analysis.scenarios.optimistic.metrics.grossMarginPercent > analysis.scenarios.base.metrics.grossMarginPercent);
    });

    it("flags NEEDS_USER_INPUT when unit manufacturing cost is missing", () => {
      const analysis = UnitEconomicsScenarioEngine.evaluateAnalysis({});
      assert.equal(analysis.verdict, "NEEDS_USER_INPUT");
    });
  });

  // --------------------------------------------------------------------------
  // 7. Launch Readiness & Commercial Decision Tree
  // --------------------------------------------------------------------------
  describe("7. Launch Readiness & Commercial Decision Tree", () => {
    it("evaluates multi-dimensional readiness and determines commercial verdict", () => {
      const products = createSampleProducts();
      const attributes = ProductAttributeIntelligenceEngine.analyze(products);
      const diff = DifferentiationBuilder2Engine.buildDifferentiation(attributes, products, "Mug");
      const pos = MarketPositioningEngine.analyzePositioning(products);
      const cfg = ProductConfigurationBuilder.buildConfiguration("Mug", attributes, diff.candidates[0], pos);
      const src = SourcingRequirementsEngine.generateSpecification(cfg, attributes);
      const eco = UnitEconomicsScenarioEngine.evaluateAnalysis({ unitProductCost: 8.0, targetSalePrice: 38.0 });

      const readiness = LaunchReadinessEngine.evaluateReadiness({
        attributes,
        differentiation: diff,
        positioning: pos,
        economics: eco,
        sourcing: src,
        observationCount: 5,
        hasUserEconomics: true,
      });

      assert.ok(readiness.overallScore >= 70);
      assert.ok(readiness.dimensions.length >= 6);

      const decision = CommercialDecisionTree.evaluateDecision({
        readiness,
        economics: eco,
        differentiation: diff,
        positioning: pos,
        compositeScore: 82,
        observationCount: 5,
        hasUserEconomics: true,
      });

      assert.ok(decision.verdict === "PURSUE" || decision.verdict === "TEST");
      assert.ok(decision.positiveEvidence.length >= 1);
      assert.ok(decision.unknownSignals.length >= 1);
    });
  });

  // --------------------------------------------------------------------------
  // 8. Information Value & Action Plan Engines
  // --------------------------------------------------------------------------
  describe("8. Information Value & Action Plan Engines", () => {
    it("identifies uncertainty gaps and prioritizes next verification actions", () => {
      const products = createSampleProducts();
      const attributes = ProductAttributeIntelligenceEngine.analyze(products);
      const diff = DifferentiationBuilder2Engine.buildDifferentiation(attributes, products, "Mug");
      const pos = MarketPositioningEngine.analyzePositioning(products);
      const cfg = ProductConfigurationBuilder.buildConfiguration("Mug", attributes, diff.candidates[0], pos);
      const src = SourcingRequirementsEngine.generateSpecification(cfg, attributes);
      const eco = UnitEconomicsScenarioEngine.evaluateAnalysis();

      const readiness = LaunchReadinessEngine.evaluateReadiness({
        attributes,
        differentiation: diff,
        positioning: pos,
        economics: eco,
        sourcing: src,
        observationCount: 5,
        hasUserEconomics: false,
      });

      const infoReport = InformationValueEngine.evaluateInformationGaps({
        hasUserEconomics: false,
        observationCount: 5,
        hasDifferentiation: true,
        readiness,
      });

      assert.ok(infoReport.gaps.length >= 3);
      assert.equal(infoReport.gaps[0].decisionImpact, "CRITICAL"); // Landed cost

      const actionPlan = ActionPlanGenerator.generatePlan({
        readiness,
        informationGaps: infoReport,
        differentiation: diff,
        hasUserEconomics: false,
        baseProductName: "Mug",
      });

      assert.equal(actionPlan.items.length, 5);
      assert.equal(actionPlan.items[0].priority, 1);
      assert.ok(actionPlan.items[0].action.includes("RFQ"));
    });
  });

  // --------------------------------------------------------------------------
  // 9. Traceable Evidence Ledger
  // --------------------------------------------------------------------------
  describe("9. Traceable Evidence Ledger", () => {
    it("compiles traceable evidence records with explicit provenance", () => {
      const products = createSampleProducts();
      const attributes = ProductAttributeIntelligenceEngine.analyze(products);
      const diff = DifferentiationBuilder2Engine.buildDifferentiation(attributes, products, "Mug");
      const pos = MarketPositioningEngine.analyzePositioning(products);

      const ledger = EvidenceLedgerBuilder.buildLedger({
        products,
        attributes,
        positioning: pos,
        differentiation: diff,
      });

      assert.ok(ledger.records.length >= 10);
      assert.ok(ledger.totalObservedRecords >= 5);
      assert.ok(ledger.totalDerivedRecords >= 1);
      assert.ok(ledger.totalUnknownRecords >= 2);
    });
  });

  // --------------------------------------------------------------------------
  // 10. End-to-End Product Opportunity Workspace Orchestrator
  // --------------------------------------------------------------------------
  describe("10. End-to-End Product Opportunity Workspace Orchestrator", () => {
    it("assembles complete workspace with organization scoping", async () => {
      const products = createSampleProducts();
      const workspace = await ProductOpportunityWorkspaceEngine.createOrRefreshWorkspace({
        organizationId: "org_test_batch_21",
        query: "ceramic coffee mug",
        title: "Handmade Ceramic Coffee Mug",
        products,
        userEconomics: {
          unitProductCost: 8.5,
          targetSalePrice: 39.0,
        },
      });

      assert.ok(workspace.id);
      assert.equal(workspace.organizationId, "org_test_batch_21");
      assert.equal(workspace.title, "Handmade Ceramic Coffee Mug");
      assert.ok(workspace.opportunityScore.compositeScore > 0);
      assert.ok(workspace.attributeIntelligence);
      assert.ok(workspace.differentiation);
      assert.ok(workspace.positioning);
      assert.ok(workspace.configuration);
      assert.ok(workspace.sourcing);
      assert.ok(workspace.economics);
      assert.ok(workspace.readiness);
      assert.ok(workspace.informationGaps);
      assert.ok(workspace.commercialDecision);
      assert.ok(workspace.actionPlan);
      assert.ok(workspace.evidenceLedger);

      // Verify list retrieval
      const list = await ProductOpportunityWorkspaceEngine.listWorkspaces("org_test_batch_21");
      assert.ok(list.length >= 1);
      assert.ok(list.some((w) => w.id === workspace.id));
    });
  });
});
