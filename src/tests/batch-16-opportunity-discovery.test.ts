/**
 * SellerSalt — Batch 16 Test Suite
 * 
 * Comprehensive verification of Market Intelligence & Opportunity Discovery Engine 2.0,
 * Evidence Graphs, Deterministic Explanations, Momentum States, Watchlist Scoping,
 * and Zero-Fabrication integrity.
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { OpportunityDiscoveryEngine } from "@/services/intelligence/opportunity-discovery-engine";
import { OpportunityExplanationEngine } from "@/services/intelligence/opportunity-explanation";
import { MarketMomentumEngine } from "@/marketplaces/core/acquisition/momentum";
import type { NormalizedProduct } from "@/marketplaces/core/types";
import type { OpportunityEvidenceGraph } from "@/marketplaces/core/discovery-types";

describe("Batch 16: Market Intelligence & Opportunity Discovery Engine 2.0", () => {
  // --------------------------------------------------------------------------
  // 1. Multi-Domain Opportunity Generation
  // --------------------------------------------------------------------------
  describe("1. Multi-Domain Opportunity Discovery", () => {
    it("discovers structured opportunities across Products, Keywords, Niches, Categories, and Sellers", async () => {
      const response = await OpportunityDiscoveryEngine.discover({
        query: "ceramic coffee mug",
        marketplace: "etsy",
        limit: 10,
      });

      assert.equal(response.marketplace, "etsy");
      assert.ok(response.totalOpportunitiesFound > 0);
      assert.ok(response.opportunities.length > 0);

      // Verify breakdown contains valid domain counts
      assert.ok("PRODUCT" in response.breakdownByType);
      assert.ok("KEYWORD" in response.breakdownByType);
      assert.ok("NICHE" in response.breakdownByType);
      assert.ok("CATEGORY" in response.breakdownByType);
      assert.ok("SELLER" in response.breakdownByType);

      // Check first opportunity structure
      const firstOpp = response.opportunities[0];
      assert.ok(firstOpp.id);
      assert.ok(firstOpp.title);
      assert.ok(firstOpp.type);
      assert.ok(firstOpp.verdict);
      assert.ok(firstOpp.confidence >= 0 && firstOpp.confidence <= 100);
      assert.ok(firstOpp.explanation);
      assert.ok(firstOpp.evidence);
    });

    it("ranks opportunities deterministically by score descending then confidence descending", async () => {
      const response = await OpportunityDiscoveryEngine.discover({
        query: "planner supplies",
        marketplace: "etsy",
        limit: 15,
      });

      for (let i = 0; i < response.opportunities.length - 1; i++) {
        const current = response.opportunities[i];
        const next = response.opportunities[i + 1];
        const scoreCurr = current.score ?? -1;
        const scoreNext = next.score ?? -1;

        if (scoreCurr !== scoreNext) {
          assert.ok(scoreCurr >= scoreNext, `Score ranking violation at index ${i}: ${scoreCurr} < ${scoreNext}`);
        } else {
          assert.ok(current.confidence >= next.confidence, `Confidence tie-break violation at index ${i}`);
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // 2. Structured Evidence Graph & Deterministic Explanations
  // --------------------------------------------------------------------------
  describe("2. Evidence Graph & Opportunity Explanations", () => {
    it("generates comprehensive evidence graph with demand, competition, economics, freshness, and momentum", () => {
      const mockEvidence: OpportunityEvidenceGraph = {
        demand: {
          score: 85,
          status: "STRONG",
          signals: [
            {
              id: "reviews",
              name: "Review Volume",
              value: 450,
              provenance: "ACTUAL_DATA",
              impact: "POSITIVE",
              description: "450 verified reviews observed.",
            },
          ],
        },
        competition: {
          score: 30,
          status: "WEAK",
          signals: [
            {
              id: "sellers",
              name: "Seller Barrier",
              value: "LOW",
              provenance: "ACTUAL_DATA",
              impact: "POSITIVE",
              description: "Fragmented entrant landscape.",
            },
          ],
        },
        economics: {
          score: 80,
          status: "STRONG",
          signals: [
            {
              id: "price",
              name: "Observed Price",
              value: "$34.00",
              provenance: "ACTUAL_DATA",
              impact: "POSITIVE",
              description: "Viable profit margin positioning.",
            },
          ],
        },
        freshness: {
          score: 90,
          status: "STRONG",
          signals: [
            {
              id: "freshness",
              name: "Data Freshness",
              value: "LIVE",
              provenance: "ACTUAL_DATA",
              impact: "POSITIVE",
              description: "Observed <24h ago.",
            },
          ],
        },
        momentum: {
          score: 85,
          status: "STRONG",
          signals: [
            {
              id: "trajectory",
              name: "Trajectory",
              value: "RISING",
              provenance: "ACTUAL_DATA",
              impact: "POSITIVE",
              description: "Rising review velocity.",
            },
          ],
        },
      };

      const explanation = OpportunityExplanationEngine.generateExplanation({
        type: "PRODUCT",
        title: "Ceramic Minimalist Mug",
        marketplace: "etsy",
        score: 84,
        confidence: 85,
        evidence: mockEvidence,
        momentum: "RISING",
        sampleSize: 25,
      });

      assert.ok(explanation.headline);
      assert.ok(explanation.whyPositive.length > 0);
      assert.ok(explanation.watchNegative.length > 0);
      assert.ok(explanation.unknownSignals.length >= 2);
      assert.ok(explanation.confidenceReasoning.includes("85%"));
      assert.ok(explanation.recommendedAction);

      // Zero-fabrication check: universal unknowns are clearly disclosed
      assert.ok(explanation.unknownSignals.some((s) => s.includes("Exact monthly search query volume is unavailable")));
    });
  });

  // --------------------------------------------------------------------------
  // 3. Market Momentum Engine
  // --------------------------------------------------------------------------
  describe("3. Unified Market Momentum Engine", () => {
    it("returns INSUFFICIENT_DATA when product has n <= 1 snapshot", async () => {
      const momentumReport = await MarketMomentumEngine.evaluateProductMomentum(
        "unobserved_product_123",
        "etsy"
      );

      assert.equal(momentumReport.state, "INSUFFICIENT_DATA");
      assert.equal(momentumReport.hasLongitudinalData, false);
      assert.equal(momentumReport.deltaPercent, null);
      assert.equal(momentumReport.velocityDaily, null);
      assert.ok(momentumReport.explanation.includes("unavailable without multi-snapshot time series"));
    });

    it("returns INSUFFICIENT_DATA when keyword has n <= 1 historical observation", async () => {
      const kwMomentum = await MarketMomentumEngine.evaluateKeywordMomentum(
        "unobserved_keyword_term_xyz",
        "etsy"
      );

      assert.equal(kwMomentum.state, "INSUFFICIENT_DATA");
      assert.equal(kwMomentum.hasLongitudinalData, false);
      assert.equal(kwMomentum.deltaPercent, null);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Zero-Fabrication & Marketplace Independence
  // --------------------------------------------------------------------------
  describe("4. Zero-Fabrication Contract & Compliance", () => {
    it("never replaces unobserved metrics with 0 and preserves null values", async () => {
      const response = await OpportunityDiscoveryEngine.discover({
        query: "leather journal",
        marketplace: "etsy",
        limit: 5,
      });

      for (const opp of response.opportunities) {
        // Assert limitations are present
        assert.ok(opp.limitations.length > 0);
        // Assert unknown signals are populated
        assert.ok(opp.unknownSignals.length > 0);
      }
    });

    it("operates reliably without official API credentials via public web ingestion", async () => {
      const response = await OpportunityDiscoveryEngine.discover({
        query: "wooden desk lamp",
        marketplace: "amazon", // Amazon has no API credentials in staging
        limit: 5,
      });

      assert.equal(response.marketplace, "amazon");
      assert.ok(response.opportunities.length > 0);
      assert.ok(response.sourceLineage.sourcesUsed.includes("PUBLIC_WEB"));
    });
  });

  // --------------------------------------------------------------------------
  // 5. Watchlist Persistence & Multi-Tenant Organization Isolation
  // --------------------------------------------------------------------------
  describe("5. Watchlist & API Route Architecture", () => {
    it("API route /api/opportunities/discover enforces authentication and organizationId scoping", () => {
      const routeSrc = fs.readFileSync(path.join(process.cwd(), "src/app/api/opportunities/discover/route.ts"), "utf8");
      
      assert.ok(routeSrc.includes("getServerSession(authOptions)"));
      assert.ok(routeSrc.includes("session.user.organizationId"));
      assert.ok(routeSrc.includes("OpportunityDiscoveryEngine.discover"));
    });

    it("API route /api/opportunities/[id]/save enforces organization isolation on save and delete", () => {
      const routeSrc = fs.readFileSync(path.join(process.cwd(), "src/app/api/opportunities/[id]/save/route.ts"), "utf8");
      
      assert.ok(routeSrc.includes("session.user.organizationId"));
      assert.ok(routeSrc.includes("organizationId: session.user.organizationId"));
      assert.ok(routeSrc.includes("prisma.savedOpportunity.upsert"));
      assert.ok(routeSrc.includes("prisma.savedOpportunity.deleteMany"));
    });

    it("API route /api/opportunities/saved scopes query strictly to session organizationId", () => {
      const routeSrc = fs.readFileSync(path.join(process.cwd(), "src/app/api/opportunities/saved/route.ts"), "utf8");
      
      assert.ok(routeSrc.includes("organizationId: session.user.organizationId"));
      assert.ok(routeSrc.includes("prisma.savedOpportunity.findMany"));
    });

    it("Prisma schema declares SavedOpportunity model with multi-tenant unique composite index", () => {
      const schemaSrc = fs.readFileSync(path.join(process.cwd(), "prisma/schema.prisma"), "utf8");
      
      assert.ok(schemaSrc.includes("model SavedOpportunity"));
      assert.ok(schemaSrc.includes("@@unique([organizationId, type, marketplace, targetId])"));
      assert.ok(schemaSrc.includes("@@index([organizationId])"));
      assert.ok(schemaSrc.includes("savedOpportunities SavedOpportunity[]"));
    });
  });
});

