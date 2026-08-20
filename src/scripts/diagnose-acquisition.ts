/**
 * SellerSalt Acquisition Diagnostic Command (Batch 34/35)
 *
 * `npm run diagnose:acquisition -- "wooden desk organizer"`
 *
 * Runs the real, governed, marketplace-independent acquisition pipeline
 * (src/marketplaces/core/acquisition/orchestrator.ts's
 * orchestrateProductResearch — the same function every product search API
 * route calls) against every registered marketplace for one query, and
 * prints an honest per-source trace, plus a cross-marketplace aggregation
 * summary and a single final verdict.
 *
 * This does NOT bypass any governance layer (SourcePolicyEnforcer,
 * AntiCircumventionGuard, SourceBoundary) — it calls the exact same
 * pipeline a real user's search would. It is bounded (one request per
 * source per marketplace, limit capped low) and never persists
 * (persistObservations: false) so running it repeatedly cannot spam a
 * marketplace or pollute the database.
 *
 * Never prints credential values — only whether one is configured.
 */

import { registerAllConnectors, MarketplaceRegistry } from "@/marketplaces/core/registry";
import { orchestrateProductResearch } from "@/marketplaces/core/acquisition/orchestrator";
import { getActiveConnectorWithCredentials } from "@/lib/get-active-connector";
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
  const query = args.filter((a, i) => a !== "--org" && args[i - 1] !== "--org").join(" ").trim();

  if (!query) {
    console.error('Usage: npm run diagnose:acquisition -- "<query>" [--org <organizationId>]');
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

  // --- FINAL ---------------------------------------------------------
  console.log("\nFINAL");
  console.log("-".repeat(5));
  console.log(`Returned: ${totalObservations}`);
  console.log(`Status:   ${totalObservations > 0 ? "SUCCESS" : "NO_OPERATIONAL_ACQUISITION_SOURCE"}`);

  console.log("\n" + "=".repeat(60));
  console.log("Diagnostic complete. No data was persisted or scraped beyond the single bounded request per source above.\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("Diagnostic run failed:", err.message);
  process.exit(1);
});
