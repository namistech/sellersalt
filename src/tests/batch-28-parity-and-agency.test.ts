import { test } from "node:test";
import assert from "node:assert/strict";
import { buildNavigation } from "@/services/navigation";
import type { WorkspaceContext } from "@/services/types";
import { resolveEtsyOAuthRedirectUri } from "@/services/connectors/etsy-oauth-helper";
import { PLAN_DEFINITIONS } from "@/services/plans/plan-capabilities";
import { extractLongTailTagFrequencies, computeCatalogYield } from "@/services/shop-intelligence";

test("Batch 28: Agency & Operate Navigation Entitlements", async (t) => {
  await t.test("Agency workspace context generates full Operate navigation suite", () => {
    const agencyContext: WorkspaceContext = {
      user: { id: "user_agency", name: "Agency Owner", email: "agency@example.com" },
      organization: { id: "org_agency", name: "Agency HQ", accountType: "agency" },
      roleLabel: "Agency Owner",
      capabilities: new Set([
        "discover:view",
        "operate:view",
        "manage:team",
        "manage:billing",
        "manage:clients",
        "manage:employees",
        "manage:reports",
      ]),
    };

    const nav = buildNavigation(agencyContext);
    // "Operate" was split into "My Business" (workspace/store/drafts/analytics)
    // and "Marketplaces" (connected accounts) — both gated by the same
    // operate:view capability the old single "Operate" group used.
    const myBusinessGroup = nav.find((g) => g.id === "my-business");
    const marketplacesGroup = nav.find((g) => g.id === "marketplaces");
    assert.ok(myBusinessGroup, "My Business group should be present for Agency");
    assert.ok(marketplacesGroup, "Marketplaces group should be present for Agency");

    const operateHrefs = [...myBusinessGroup.items, ...marketplacesGroup.items].map((i) => i.href);
    assert.ok(operateHrefs.includes("/workspace"), "Should include /workspace");
    assert.ok(operateHrefs.includes("/store"), "Should include /store");
    assert.ok(operateHrefs.includes("/drafts"), "Should include /drafts");
    assert.ok(operateHrefs.includes("/settings/channels"), "Should include /settings/channels");
    assert.ok(operateHrefs.includes("/analytics"), "Should include /analytics");

    const manageGroup = nav.find((g) => g.id === "manage");
    assert.ok(manageGroup, "Manage group should be present");
    const manageHrefs = manageGroup.items.map((i) => i.href);
    assert.ok(manageHrefs.includes("/settings/team"), "Agency should have Team & Permissions");
    assert.ok(manageHrefs.includes("/settings/billing"), "Agency should have top-level Billing");
  });

  await t.test("Free context without operate capability does NOT show Operate navigation", () => {
    const freeContext: WorkspaceContext = {
      user: { id: "user_free", name: "Free User", email: "free@example.com" },
      organization: { id: "org_free", name: "Free Org", accountType: "individual" },
      roleLabel: "Member",
      capabilities: new Set(["discover:view"]),
    };

    const nav = buildNavigation(freeContext);
    assert.equal(nav.find((g) => g.id === "my-business"), undefined, "My Business group must be hidden for Free users lacking operate:view");
    assert.equal(nav.find((g) => g.id === "marketplaces"), undefined, "Marketplaces group must be hidden for Free users lacking operate:view");
  });

  await t.test("Pro context has Operate navigation with store, drafts, and workspace", () => {
    const proContext: WorkspaceContext = {
      user: { id: "user_pro", name: "Pro Seller", email: "pro@example.com" },
      organization: { id: "org_pro", name: "Pro Shop", accountType: "individual" },
      roleLabel: "Pro Seller",
      capabilities: new Set(["discover:view", "operate:view", "manage:billing", "manage:reports"]),
    };

    const nav = buildNavigation(proContext);
    const myBusinessGroup = nav.find((g) => g.id === "my-business");
    assert.ok(myBusinessGroup, "My Business group should be visible for Pro users");
    const operateHrefs = myBusinessGroup.items.map((i) => i.href);
    assert.ok(operateHrefs.includes("/workspace"));
    assert.ok(operateHrefs.includes("/store"));
    assert.ok(operateHrefs.includes("/drafts"));
  });
});

test("Batch 28: Shop Intelligence & Image Processing", async (t) => {
  await t.test("extracts long tail tags and frequencies accurately", () => {
    const listings = [
      { title: "Leather Wallet | Handmade Cardholder", tags: ["leather wallet", "minimalist wallet", "handmade gifts"] },
      { title: "Personalized Leather Wallet - Mens Bifold", tags: ["leather wallet", "personalized gifts", "mens bifold"] },
      { title: "Vintage Cardholder / Slim Wallet", tags: ["minimalist wallet", "cardholder"] },
    ];

    const tags = extractLongTailTagFrequencies(listings, 10);
    assert.ok(tags.length > 0);
    const leatherWallet = tags.find((t) => t.tag.toLowerCase().includes("leather wallet"));
    assert.ok(leatherWallet);
    assert.equal(leatherWallet.count, 2);
    assert.equal(leatherWallet.isLongTail, true);
  });

  await t.test("computes catalog yield and median price spread", () => {
    const listings = [
      { price: 20.0, category: "Accessories" },
      { price: 40.0, category: "Accessories" },
      { price: 60.0, category: "Home & Living" },
    ];

    const yieldData = computeCatalogYield(listings, 300, 3);
    assert.equal(yieldData.minPrice, 20.0);
    assert.equal(yieldData.maxPrice, 60.0);
    assert.equal(yieldData.medianPrice, 40.0);
    assert.equal(yieldData.catalogEfficiency, "HIGH_YIELD"); // 300 / 3 = 100 >= 30
  });
});

test("Batch 28: Plan Limits & Etsy OAuth Production Parity", async (t) => {
  await t.test("verifies multi-store connection limits by plan tier", () => {
    assert.equal(PLAN_DEFINITIONS.STARTED.limits.connectedEtsyStores, 1);
    assert.equal(PLAN_DEFINITIONS.PRO.limits.connectedEtsyStores, 5);
    assert.equal(PLAN_DEFINITIONS.AGENCY.limits.connectedEtsyStores, 25);
  });

  await t.test("resolves production redirect URI matching sellersalt.com", () => {
    const cfg = resolveEtsyOAuthRedirectUri({
      overrideBaseUrl: "https://sellersalt.com",
    });
    assert.equal(cfg.baseUrl, "https://sellersalt.com");
    assert.equal(cfg.redirectUri, "https://sellersalt.com/api/seller-channels/etsy/callback");
    assert.equal(cfg.environment, "production");
  });
});
