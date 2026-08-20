/**
 * SellerSalt Live Public Research Smoke Test Facility
 * 
 * DEVELOPMENT/MANUAL TESTING ONLY.
 * NEVER RUNS IN AUTOMATED CI OR AS PART OF DEFAULT TEST SUITE.
 * 
 * To execute live smoke requests against public marketplace pages:
 * SELLERSALT_LIVE_RESEARCH_SMOKE=true npx tsx --env-file=.env.local src/tests/live-smoke/live-research-smoke.ts
 */

import { MarketplaceRegistry, registerAllConnectors } from "@/marketplaces/core/registry";
import { orchestrateProductResearch } from "@/marketplaces/core/acquisition/orchestrator";
import { harvestPublicMarketplaceKeywords } from "@/marketplaces/core/acquisition/keywords";
import { fetchPublicShopResearch } from "@/marketplaces/core/acquisition/shops";
import { aggregatePublicCategoryIntelligence } from "@/marketplaces/core/acquisition/categories";
import { executeResearchRun } from "@/marketplaces/core/acquisition/workbench";
import type { MarketplaceId } from "@/marketplaces/core/types";

async function runLiveSmokeSuite() {
  if (process.env.SELLERSALT_LIVE_RESEARCH_SMOKE !== "true") {
    console.log("[LiveSmoke] SKIPPED: Set SELLERSALT_LIVE_RESEARCH_SMOKE=true to execute live network smoke tests.");
    return;
  }

  console.log("==================================================================");
  console.log("  SellerSalt Live Public Research Smoke Test (Opt-In Manual Run)");
  console.log("  Executing rate-limited requests to verify live public parsers...");
  console.log("==================================================================");

  registerAllConnectors();

  const targetMarketplaces: MarketplaceId[] = ["etsy", "amazon", "ebay", "walmart"];
  const testQuery = "ceramic mug";

  for (const m of targetMarketplaces) {
    console.log(`\n--- [1] Live Product Research Smoke: ${m.toUpperCase()} ("${testQuery}") ---`);
    try {
      const res = await orchestrateProductResearch(
        { marketplace: m, query: testQuery, limit: 5 },
        { preferredSources: ["PUBLIC_WEB"] }
      );
      console.log(`Freshness: ${res.report.freshness.status}`);
      console.log(`Items Acquired: ${res.items.length}`);
      if (res.items.length > 0) {
        console.log(`Sample item: "${res.items[0].title}" | Price: $${res.items[0].price} | Rating: ${res.items[0].rating}`);
      }
      if (res.report.limitations.length > 0) {
        console.log(`Limitations: ${res.report.limitations.join(", ")}`);
      }
    } catch (err: any) {
      console.log(`Result: ${err.message}`);
    }

    console.log(`\n--- [2] Live Keyword Harvesting Smoke: ${m.toUpperCase()} ("${testQuery}") ---`);
    try {
      const kwRes = await harvestPublicMarketplaceKeywords({
        marketplace: m,
        query: testQuery,
        limit: 5,
      });
      console.log(`Observed Listings: ${kwRes.totalListingsObserved}`);
      console.log(`Average Price: $${kwRes.averageObservedPrice}`);
      console.log(`Top Keywords Found: ${kwRes.topKeywords.length}`);
      if (kwRes.topKeywords.length > 0) {
        console.log(`Sample top keyword: "${kwRes.topKeywords[0].keyword}" (freq: ${kwRes.topKeywords[0].listingFrequencyPercent}%, demandProxy: ${kwRes.topKeywords[0].demandProxyScore})`);
      }
    } catch (err: any) {
      console.log(`Result: ${err.message}`);
    }

    console.log(`\n--- [3] Live Category Aggregation Smoke: ${m.toUpperCase()} ("Mugs") ---`);
    try {
      const catRes = await aggregatePublicCategoryIntelligence("mugs", m);
      if ("available" in catRes && !catRes.available) {
        console.log(`Category research unavailable: ${catRes.message}`);
      } else {
        const cat = catRes as any;
        console.log(`Category: ${cat.categoryName}`);
        console.log(`Observed Sample: ${cat.observedCatalogCount || cat.totalListings}`);
        console.log(`Median Price: $${cat.priceDistribution?.median}`);
        console.log(`Avg Opportunity Score: ${cat.opportunityDistribution?.averageScore}`);
      }
    } catch (err: any) {
      console.log(`Result: ${err.message}`);
    }
  }

  console.log("\n==================================================================");
  console.log("  Live Smoke Test Completed Successfully.");
  console.log("==================================================================");
}

// Self-executing when run directly via tsx
if (import.meta.url === `file://${process.argv[1]}`) {
  runLiveSmokeSuite().catch((err) => {
    console.error("[LiveSmoke] Fatal error:", err);
    process.exit(1);
  });
}
