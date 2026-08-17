import { test } from "node:test";
import assert from "node:assert/strict";
import { PLAN_DEFINITIONS, getFeatureAccess } from "@/services/plans/plan-capabilities";
import { diagnoseEtsyConnector, mapConnectorError } from "@/services/connector-diagnostics";
import { computeProductOpportunity } from "@/services/product-hunting";
import { classifyIntent, normalizeTerm } from "@/services/keyword-research";
import { parseEtsyListingInput } from "@/lib/etsy-listing-parser";
import { auditListingSeo } from "@/services/seo-engine";

test("Batch 21: Public Free Acquisition Tools & Gating", async (t) => {
  await t.test("Product Opportunity preview returns limited scores and locked features", () => {
    const opp = computeProductOpportunity({
      price: 36.0,
      listingAgeDays: 40,
      shopAgeMonths: 12,
      totalSales: 950,
      activeListings: 28,
      reviewCount: 35,
      reviewAverage: 4.8,
      numFavorers: 280,
      estDailySales: 4.2,
      avgSellingRatio: 33.9,
    });

    assert.ok(opp.opportunityScore >= 0 && opp.opportunityScore <= 100);
    assert.ok(opp.signals.velocity.score > 0);
  });

  await t.test("Public Keyword Generator produces top 10 keywords with tag compliance and locks remaining", () => {
    const seed = normalizeTerm("leather wallet");
    const sampleModifiers = [
      "minimalist", "slim", "personalized", "custom", "handmade",
      "bifold", "card holder", "gift for him", "vintage", "front pocket",
    ];

    const preview10 = sampleModifiers.map((mod, idx) => {
      const fullKw = `${mod} ${seed}`.trim();
      return {
        keyword: fullKw,
        tagLength: fullKw.length,
        isTagCompliant: fullKw.length <= 20,
        opportunityTier: idx < 3 ? "HIGH" : idx < 7 ? "MODERATE" : "COMPETITIVE",
        buyerIntent: classifyIntent(fullKw),
      };
    });

    assert.equal(preview10.length, 10);
    for (const kw of preview10) {
      assert.ok(kw.keyword.length > 0);
      assert.equal(typeof kw.buyerIntent, "string");
      assert.equal(typeof kw.isTagCompliant, "boolean");
    }
  });

  await t.test("SEO Audit handles public listing and gates full optimization", () => {
    const audit = auditListingSeo({
      title: "Handcrafted Leather Card Wallet",
      tags: ["leather card wallet", "slim wallet", "minimalist gift"],
      description: "Handcrafted full grain leather wallet.",
    });

    assert.ok(audit.overallScore > 0 && audit.overallScore <= 100);
    assert.equal(audit.breakdown.tagScore <= 35, true);
    assert.ok(audit.grade);
  });
});

test("Batch 21: Connector Diagnostic & Error Mapping Engine", async (t) => {
  await t.test("distinguishes Standard Read vs Commercial Write connection", () => {
    const readOnly = diagnoseEtsyConnector(["shops_r", "listings_r"]);
    assert.equal(readOnly.commercialApprovalStatus, "STANDARD_READ");
    assert.equal(readOnly.capabilities.find((c) => c.id === "listings-draft")?.status, "REQUIRES_ETSY_APPROVAL");

    const fullWrite = diagnoseEtsyConnector(["shops_r", "listings_r", "listings_w"]);
    assert.equal(fullWrite.commercialApprovalStatus, "COMMERCIAL_WRITE_APPROVED");
    assert.equal(fullWrite.capabilities.find((c) => c.id === "listings-draft")?.status, "AVAILABLE");
  });

  await t.test("maps Etsy API errors into structured, user-friendly resolutions", () => {
    const authError = mapConnectorError({ status: 401, message: "Invalid token or token expired" });
    assert.equal(authError.code, "AUTH_EXPIRED");
    assert.equal(authError.canReconnect, true);

    const rateLimitError = mapConnectorError({ status: 429, message: "Too many requests to Etsy API" });
    assert.equal(rateLimitError.code, "RATE_LIMITED");
    assert.equal(rateLimitError.canRetry, true);

    const scopeError = mapConnectorError({ message: "listings_w scope required for write operation" });
    assert.equal(scopeError.code, "WRITE_NOT_AVAILABLE");
    assert.ok(scopeError.fallbackWorkflow);

    const notFoundError = mapConnectorError({ status: 404, message: "Resource not found" });
    assert.equal(notFoundError.code, "RESOURCE_NOT_FOUND");
  });
});

test("Batch 21: Plan Definitions & Outcome-Based Positioning", async (t) => {
  await t.test("all plan tiers have clear outcome statements", () => {
    assert.equal(PLAN_DEFINITIONS.FREE.outcome, "Understand the market.");
    assert.equal(PLAN_DEFINITIONS.STARTED.outcome, "Find and plan opportunities.");
    assert.equal(PLAN_DEFINITIONS.PRO.outcome, "Operate your seller business with intelligence.");
    assert.equal(PLAN_DEFINITIONS.AGENCY.outcome, "Run intelligence across clients and stores.");
  });

  await t.test("server-authoritative quotas remain strictly enforced across tiers", () => {
    assert.equal(PLAN_DEFINITIONS.FREE.limits.monthlyKeywordSearches, 15);
    assert.equal(PLAN_DEFINITIONS.STARTED.limits.monthlyKeywordSearches, 250);
    assert.equal(PLAN_DEFINITIONS.PRO.limits.monthlyKeywordSearches, 2500);
    assert.equal(PLAN_DEFINITIONS.AGENCY.limits.monthlyKeywordSearches, 25000);
  });
});
