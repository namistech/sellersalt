/**
 * SellerSalt Acquisition Diagnostic Command (Batch 34/35/36)
 *
 * `npm run diagnose:acquisition -- "wooden desk organizer"`
 *
 * Runs the real, governed, marketplace-independent acquisition pipeline
 * (src/marketplaces/core/acquisition/orchestrator.ts's
 * orchestrateProductResearch — the same function every product search API
 * route calls) against every registered marketplace for one query, prints
 * an honest per-source trace plus a cross-marketplace aggregation summary,
 * then (Batch 36) feeds the same query through the real Validation and
 * Plan/Workspace engines so the full ACQUISITION -> RESEARCH -> VALIDATION
 * -> PLAN chain is visible in one run, not just acquisition.
 *
 * This does NOT bypass any governance layer (SourcePolicyEnforcer,
 * AntiCircumventionGuard, SourceBoundary) — it calls the exact same
 * pipelines a real user's search/validate/plan actions would. The
 * acquisition trace is bounded (one request per source per marketplace,
 * limit capped low) and never persists (persistObservations: false); the
 * validation/plan stages below do write real, non-fabricated records the
 * same way the real UI actions do (ProductValidation, SavedOpportunity) —
 * pass --no-persist to skip those two calls entirely if you only want the
 * acquisition trace.
 *
 * Never prints credential values — only whether one is configured.
 */

import { registerAllConnectors, MarketplaceRegistry } from "@/marketplaces/core/registry";
import { orchestrateProductResearch } from "@/marketplaces/core/acquisition/orchestrator";
import { getActiveConnectorWithCredentials } from "@/lib/get-active-connector";
import { ProductValidationEngine } from "@/services/intelligence/product-validation-engine";
import { ProductOpportunityWorkspaceEngine } from "@/services/intelligence/product-opportunity-workspace-engine";
import type { MarketplaceId } from "@/marketplaces/core/types";

const ALL_MARKETPLACES: MarketplaceId[] = [
  "etsy",
  "amazon",
  "ebay",
  "walmart",
  "tiktok_shop",
  "shopify",
  "woocommerce",
];

async function hasCredentials(marketplace: MarketplaceId, organizationId: string): Promise<boolean> {
  if (marketplace !== "etsy") return false; // no other marketplace has a research credential path today
  try {
    const active = await getActiveConnectorWithCredentials(organizationId, "ETSY");
    return !!active?.credentials?.apiKey;
  } catch {
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const orgFlagIdx = args.indexOf("--org");
  const organizationId = orgFlagIdx >= 0 ? args[orgFlagIdx + 1] : "";
  const noPersist = args.includes("--no-persist");
  const query = args
    .filter((a, i) => a !== "--org" && args[i - 1] !== "--org" && a !== "--no-persist")
    .join(" ")
    .trim();

  if (!query) {
    console.error('Usage: npm run diagnose:acquisition -- "<query>" [--org <organizationId>] [--no-persist]');
    process.exit(1);
  }

  registerAllConnectors();

  // --- SOURCE DISCOVERY -----------------------------------------------
  // "Eligible" = at least one real acquisition capability is registered
  // (official API OR public web) — not merely that the connector exists.
  const discovery = ALL_MARKETPLACES.map((marketplace) => {
    const connector = MarketplaceRegistry.tryGetConnector(marketplace);
    const publicAdapter = MarketplaceRegistry.tryGetPublicWebAdapter(marketplace);
    const researchCapable = !!connector?.capabilities.research;
    const publicWebCapable = !!publicAdapter?.capabilities.productSearch;
    return { marketplace, researchCapable, publicWebCapable, eligible: researchCapable || publicWebCapable };
  });
  const eligible = discovery.filter((d) => d.eligible);
  const blocked = discovery.filter((d) => !d.eligible);

  console.log(`\nQUERY: ${query}`);
  if (organizationId) console.log(`ORG: ${organizationId}`);
  console.log("=".repeat(60));
  console.log("\nSOURCE DISCOVERY");
  console.log("-".repeat(16));
  console.log(`Sources discovered: ${discovery.length}`);
  console.log(`Eligible sources:   ${eligible.length} (${eligible.map((d) => d.marketplace).join(", ") || "none"})`);
  console.log(`Blocked sources:    ${blocked.length} (${blocked.map((d) => d.marketplace).join(", ") || "none"} — architecture-ready, no live capability registered)`);

  // --- PER-MARKETPLACE TRACE -------------------------------------------
  let totalObservations = 0;
  const marketplacesWithData: string[] = [];
  let anyProvenanceMissing = false;

  for (const { marketplace, researchCapable, publicWebCapable, eligible: isEligible } of discovery) {
    console.log(`\nSOURCE: ${marketplace}`);

    if (!isEligible) {
      console.log("  Access: NOT_IMPLEMENTED");
      console.log("  Result: NOT_IMPLEMENTED (architecture-ready stub — no live capability registered)");
      continue;
    }

    const credsConfigured = await hasCredentials(marketplace, organizationId);
    console.log(`  Official API capability: ${researchCapable ? "REGISTERED" : "NOT_IMPLEMENTED"}`);
    console.log(`  Public web capability:   ${publicWebCapable ? "REGISTERED" : "NOT_IMPLEMENTED"}`);
    console.log(`  Credentials:             ${researchCapable ? (credsConfigured ? "CONFIGURED" : "MISSING") : "N/A (public web only)"}`);

    const startedAt = Date.now();
    const res = await orchestrateProductResearch(
      { query, marketplace, organizationId: organizationId || undefined, limit: 5 },
      {
        preferredSources: ["PUBLIC_WEB", "MARKETPLACE_API", "HISTORICAL_OBSERVATION"],
        allowHistoricalFallback: true,
        persistObservations: false,
      }
    );
    const durationMs = Date.now() - startedAt;

    console.log(`  Sources attempted:  ${res.report.sourcesAttempted.join(", ") || "none"}`);
    console.log(`  Sources succeeded:  ${res.report.sourcesSucceeded.join(", ") || "none"}`);
    console.log(`  Sources failed:     ${res.report.sourcesFailed.join(", ") || "none"}`);
    console.log(`  Upstream -> Final:  ${res.report.itemCount} item(s) in ${durationMs}ms`);

    if (res.report.limitations.length > 0) {
      console.log(`  Limitations:`);
      for (const l of res.report.limitations) console.log(`    - ${l}`);
    }

    let result: string;
    if (res.report.itemCount > 0) {
      result = `SUCCESS (${res.report.itemCount} observations, ${res.report.freshness.status})`;
      totalObservations += res.report.itemCount;
      marketplacesWithData.push(marketplace);
      for (const item of res.items) {
        if (!item.source || !item.acquisitionMethod || !item.capturedAt) anyProvenanceMissing = true;
      }
    } else if (res.report.unavailableReason) {
      result = res.report.unavailableReason;
    } else if (res.report.status === "NOT_IMPLEMENTED") {
      result = "NOT_IMPLEMENTED";
    } else {
      result = "NO_RESULTS";
    }
    console.log(`  Result: ${result}`);
  }

  // --- AGGREGATION -------------------------------------------------------
  console.log("\n" + "=".repeat(60));
  console.log("\nAGGREGATION");
  console.log("-".repeat(11));
  console.log(`Total observations: ${totalObservations}`);
  console.log(`Sources with data:  ${marketplacesWithData.length} (${marketplacesWithData.join(", ") || "none"})`);
  console.log(`Provenance:         ${totalObservations > 0 ? (anyProvenanceMissing ? "INCOMPLETE" : "VALID") : "N/A"}`);
  console.log(`Data Trust:         ${totalObservations > 0 ? (anyProvenanceMissing ? "DEGRADED" : "VALID") : "N/A"}`);

  // --- FINAL (ACQUISITION) ------------------------------------------
  console.log("\nFINAL");
  console.log("-".repeat(5));
  console.log(`Returned: ${totalObservations}`);
  console.log(`Status:   ${totalObservations > 0 ? "SUCCESS" : "NO_OPERATIONAL_ACQUISITION_SOURCE"}`);

  if (organizationId && !noPersist) {
    // --- RESEARCH -> VALIDATION -----------------------------------
    // Batch 36: runs the exact same ProductValidationEngine the real
    // /api/validation/product route calls (organizationId required —
    // this stage does write a real ProductValidation row, same as a
    // real merchant clicking "Validate Product").
    console.log("\n" + "=".repeat(60));
    console.log("\nVALIDATION");
    console.log("-".repeat(10));
    try {
      const report = await ProductValidationEngine.validateProduct({
        query,
        marketplace: "all",
        organizationId,
        depth: "STANDARD",
      });
      console.log(`Observations consumed: ${report.sampleProducts.length}`);
      console.log(`Demand:                ${report.demand.state}`);
      console.log(`Competition:           ${report.competition.state}`);
      console.log(`Economics:             ${report.economics.state}${report.economics.observedMedianPrice ? ` (median $${report.economics.observedMedianPrice.toFixed(2)})` : ""}`);
      console.log(`Verdict:               ${report.verdict} (score ${report.scoreBreakdown.score ?? "N/A"}, confidence ${report.scoreBreakdown.confidence}%)`);
      console.log(`Evidence:              ${report.topReasonsToPursue[0] || "none"}`);

      // --- PLAN ------------------------------------------------------
      // Batch 36: runs the exact same ProductOpportunityWorkspaceEngine
      // the real /api/product-workspaces route calls — writes a real
      // SavedOpportunity row, same as a real merchant creating a
      // workspace from a validated opportunity.
      console.log("\nPLAN");
      console.log("-".repeat(4));
      const workspace = await ProductOpportunityWorkspaceEngine.createOrRefreshWorkspace({
        organizationId,
        query,
      });
      console.log(`Workspace:    CREATED (${workspace.id})`);
      console.log(`Opportunity:  ${workspace.opportunityScore.compositeScore}/100`);
      console.log(`Decision:     ${workspace.commercialDecision.verdict}`);
      console.log(`Data Trust:   ${workspace.dataTrust.overallTrustScore}%`);
    } catch (err: any) {
      console.log(`Validation/Plan stage failed: ${err.message}`);
    }
  } else {
    console.log("\n(Skipping RESEARCH/VALIDATION/PLAN — pass --org <organizationId> to also exercise those real, persisting stages.)");
  }

  console.log("\n" + "=".repeat(60));
  console.log("Diagnostic complete. Acquisition trace above never persisted or exceeded one bounded request per source.\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("Diagnostic run failed:", err.message);
  process.exit(1);
});
