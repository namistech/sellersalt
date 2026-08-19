import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { auditListingSeo } from "@/services/seo-engine";
import { runAllMarketplaceProductResearch } from "@/marketplaces/core/research-pipeline";
import { ETSY_OPTIMIZATION_RULES, getOptimizationRules } from "@/marketplaces/core/optimization-rules";

const rootDir = process.cwd();
const readSrc = (rel: string) => fs.readFileSync(path.join(rootDir, rel), "utf-8");

const COMPLIANT_LISTING = {
  title:
    "Minimalist Leather Wallet | Handmade Slim Cardholder for Men, Personalized Anniversary Gift Idea for Him, Custom Engraved Groomsmen Present",
  tags: [
    "leather wallet",
    "minimalist wallet",
    "handmade gift",
    "mens wallet",
    "slim cardholder",
    "personalized gift",
    "anniversary gift",
    "custom leather",
    "groomsmen gift",
    "fathers day gift",
    "unique keepsake",
    "vintage style",
    "thoughtful present",
  ],
  description: "A".repeat(200),
};

describe("Part 1-2: MarketplaceSelector supports 'All Marketplaces', backed by the registry", () => {
  it("MarketplaceSelector exposes an All-Marketplaces value derived from no hardcoded list", () => {
    const code = readSrc("src/components/ui/MarketplaceSelector.tsx");
    assert.ok(code.includes('"all"'), "must support an 'all' selector value");
    assert.ok(code.includes("All Marketplaces"));
    assert.ok(!code.includes("MARKETPLACE_DEFINITIONS"), "must not reintroduce a hardcoded marketplace matrix");
  });

  it("live-search-tab.tsx calls POST /api/marketplaces/research when 'All Marketplaces' is selected, reusing the existing contract", () => {
    const code = readSrc("src/app/(dashboard)/prospects/live-search-tab.tsx");
    assert.ok(code.includes('marketplace === "all"'));
    assert.ok(code.includes('"/api/marketplaces/research"'));
    // Must not spin up a second research implementation — it calls the
    // existing route, which itself calls runAllMarketplaceProductResearch.
    assert.ok(!code.includes("runAllMarketplaceProductResearch"), "the client must call the API route, not reimplement the pipeline in the browser");
  });
});

describe("Part 3/5/7: Status UI renders every state honestly, with marketplace badges", () => {
  it("AllMarketplacesResults distinguishes AVAILABLE/PARTIAL/UNAVAILABLE/NOT_IMPLEMENTED and never shows a bare zero-results state for the latter two", () => {
    const code = readSrc("src/components/intelligence/AllMarketplacesResults.tsx");
    for (const status of ["AVAILABLE", "PARTIAL", "UNAVAILABLE", "NOT_IMPLEMENTED"]) {
      assert.ok(code.includes(status), `must render a distinct state for ${status}`);
    }
    assert.ok(code.includes("API integration required"));
    assert.ok(code.includes("Currently unavailable"));
    assert.ok(code.includes("MARKETPLACE_LABELS[result.marketplace]"), "must render a marketplace badge/label per result");
  });

  it("product cards omit missing signals rather than rendering a fabricated 0/N-A value", () => {
    const code = readSrc("src/components/intelligence/AllMarketplacesResults.tsx");
    assert.ok(code.includes('typeof product.price === "number"'));
    assert.ok(code.includes('typeof product.rating === "number"'));
    assert.ok(!code.includes("|| 0"), "must not silently default a missing metric to 0");
  });
});

describe("Part 8: Error isolation — one connector's exception never removes another's results", () => {
  it("runAllMarketplaceProductResearch keeps Etsy's real (empty-keyword) result even though Amazon/eBay are NOT_IMPLEMENTED", async () => {
    const results = await runAllMarketplaceProductResearch(["etsy", "amazon", "ebay"], {
      type: "products",
      keywords: [],
    });
    const etsy = results.find((r) => r.marketplace === "etsy");
    assert.equal(etsy?.status, "AVAILABLE");
    // Confirms Promise.all-style isolation: an unrelated marketplace's
    // NOT_IMPLEMENTED/thrown state never surfaces as an exception that
    // would reject the whole batch.
    assert.equal(results.length, 3);
  });
});

describe("Part 9-11: auditListingSeo is marketplace-rule-driven; Etsy behavior is byte-identical", () => {
  it("default call (no rules arg) produces the exact same score as explicitly passing ETSY_OPTIMIZATION_RULES", () => {
    const implicit = auditListingSeo(COMPLIANT_LISTING);
    const explicit = auditListingSeo(COMPLIANT_LISTING, ETSY_OPTIMIZATION_RULES);
    assert.equal(implicit.overallScore, explicit.overallScore);
    assert.equal(implicit.titleAnalysis.score, explicit.titleAnalysis.score);
    assert.equal(implicit.tagAnalysis.score, explicit.tagAnalysis.score);
  });

  it("Etsy's real constraints (140 char title, 13 tags, 20 char tags) are unchanged", () => {
    const audit = auditListingSeo(COMPLIANT_LISTING);
    assert.equal(audit.titleAnalysis.isOptimalLength, true);
    assert.equal(audit.tagAnalysis.isComplete, true);
    assert.equal(audit.tagAnalysis.allCompliantLength, true);
  });

  it("accepts rules for a marketplace with unknown constraints without crashing, and does not fabricate a title/tag limit", () => {
    const amazonRules = getOptimizationRules("amazon");
    const audit = auditListingSeo(COMPLIANT_LISTING, amazonRules);
    assert.equal(audit.titleAnalysis.isOptimalLength, false, "no known limit means it cannot claim optimal length");
    assert.equal(audit.tagAnalysis.tagCount, COMPLIANT_LISTING.tags.length);
    // No TITLE_TOO_LONG/UNUSED_TAGS diagnostic should be fabricated against
    // an unknown limit.
    const codes = audit.titleAnalysis.diagnostics.map((d) => d.code);
    assert.ok(!codes.includes("TITLE_TOO_LONG"));
  });

  it("seo-engine.ts's scoring logic no longer compares against bare numeric Etsy literals", () => {
    const code = readSrc("src/services/seo-engine.ts");
    // The threshold comparisons themselves must reference the
    // rules-derived variables, not re-hardcode the raw Etsy numbers.
    assert.ok(!code.includes("titleLength <= 140"));
    assert.ok(!code.includes("tagCount === 13"));
    assert.ok(!code.includes("charCount <= 20"));
    assert.ok(code.includes("MarketplaceOptimizationRules"), "must import and accept marketplace rules");
  });
});
