/**
 * Priority 3 Security & Compliance Tests: Residual Surveillance Naming Remediation
 * 
 * Verifies that:
 * 1. /shop-intelligence is the primary route for shop intelligence in navigation and dashboards.
 * 2. Legacy /spy routes seamlessly redirect to /shop-intelligence.
 * 3. canUseAdvancedTracking replaces canUseAdvancedSurveillance in all entitlement engines and plans.
 * 4. MARKET_RESEARCH replaces SURVEILLANCE / COMPETITOR_SURVEILLANCE in enums, models, and UI forms.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getFeatureAccess, canAccessFeature } from "@/services/plans/plan-capabilities";
import { getRoadmapCategories } from "@/services/feature-requests";

const ROOT = process.cwd();
function readSrc(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf-8");
}

describe("Priority 3: Residual Surveillance Naming Remediation", () => {
  it("1. Verifies canUseAdvancedTracking is exported in plan feature access", () => {
    const free = getFeatureAccess("FREE");
    const starter = getFeatureAccess("STARTED");
    const pro = getFeatureAccess("PRO");
    const agency = getFeatureAccess("AGENCY");

    assert.strictEqual(free.canUseAdvancedTracking, false);
    assert.strictEqual(starter.canUseAdvancedTracking, false);
    assert.strictEqual(pro.canUseAdvancedTracking, true);
    assert.strictEqual(agency.canUseAdvancedTracking, true);

    assert.strictEqual(canAccessFeature("PRO", "canUseAdvancedTracking"), true);
    assert.strictEqual(canAccessFeature("FREE", "canUseAdvancedTracking"), false);
  });

  it("2. Verifies /shop-intelligence page exists and legacy /spy redirects", () => {
    const shopIntelPage = readSrc("src/app/(dashboard)/shop-intelligence/page.tsx");
    assert.ok(shopIntelPage.includes("export default function ShopIntelligencePage"));

    const legacySpyPage = readSrc("src/app/(dashboard)/spy/page.tsx");
    assert.ok(legacySpyPage.includes('router.replace("/shop-intelligence")'));

    const legacySpyTrackedPage = readSrc("src/app/(dashboard)/spy/tracked/page.tsx");
    assert.ok(legacySpyTrackedPage.includes('router.replace("/shop-intelligence")'));
  });

  it("3. Verifies navigation uses /shop-intelligence and neutral naming", () => {
    const navCode = readSrc("src/services/navigation.ts");
    assert.ok(navCode.includes('href: "/shop-intelligence"'));
    assert.ok(!navCode.includes('id: "spy"'));
  });

  it("4. Verifies FeatureCategory and SupportTicket categories use MARKET_RESEARCH", () => {
    const featReqCode = readSrc("src/services/feature-requests.ts");
    assert.ok(featReqCode.includes('"MARKET_RESEARCH"'));
    assert.ok(!featReqCode.includes('| "SURVEILLANCE"'));

    const supportCode = readSrc("src/services/support-tickets.ts");
    assert.ok(supportCode.includes('"MARKET_RESEARCH"'));
    assert.ok(!supportCode.includes('| "SURVEILLANCE"'));
  });

  it("5. Verifies OpportunitySource enum uses MARKET_RESEARCH", () => {
    const oppCode = readSrc("src/types/opportunity.ts");
    assert.ok(oppCode.includes('"MARKET_RESEARCH"'));
    assert.ok(!oppCode.includes('"COMPETITOR_SURVEILLANCE"'));
  });
});
