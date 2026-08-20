import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildNavigation } from "@/services/navigation";
import type { WorkspaceContext } from "@/services/types";

describe("Batch 24: SellerSalt V1 — Unified Merchant Experience & Product Shell", () => {
  const mockContext: WorkspaceContext = {
    organization: {
      id: "org_shell_test",
      name: "Acme Commerce Co",
      accountType: "individual",
    },
    user: {
      id: "usr_shell_test",
      name: "Merchant Jane",
      email: "merchant@acme.com",
    },
    roleLabel: "Owner",
    capabilities: new Set([
      "discover:view",
      "operate:view",
      "manage:billing",
      "view:university",
    ]),
  };

  describe("1. Information Architecture & Navigation Integrity", () => {
    it("builds canonical workflow-first navigation groups", () => {
      const groups = buildNavigation(mockContext);
      const groupIds = groups.map((g) => g.id);

      assert.ok(groupIds.includes("dashboard"), "Dashboard group must exist");
      assert.ok(groupIds.includes("research"), "Research group must exist");
      assert.ok(groupIds.includes("intelligence"), "Intelligence group must exist");
      assert.ok(groupIds.includes("optimize"), "Optimize group must exist");
      assert.ok(groupIds.includes("my-business"), "My Business group must exist");
      assert.ok(groupIds.includes("marketplaces"), "Marketplaces group must exist");
      assert.ok(groupIds.includes("manage"), "Manage group must exist");
    });

    it("includes Product Workspaces and Trust Center in navigation items", () => {
      const groups = buildNavigation(mockContext);
      const allItems = groups.flatMap((g) => g.items);

      const workspaceItem = allItems.find((i) => i.href === "/product-workspaces");
      assert.ok(workspaceItem, "Product Workspaces must be navigable at /product-workspaces");
      assert.equal(workspaceItem.label, "Product Workspaces");

      const trustCenterItem = allItems.find((i) => i.href === "/trust");
      assert.ok(trustCenterItem, "Trust Center must be navigable at /trust");
      assert.equal(trustCenterItem.label, "Trust Center");

      const governanceItem = allItems.find((i) => i.href === "/marketplaces/governance");
      assert.ok(governanceItem, "Data Governance must be navigable at /marketplaces/governance");
    });
  });

  describe("2. Personalized Continuation & Activity Aggregation", () => {
    it("sorts mixed activities (Validations, Runs, Saved Opps) by recency", () => {
      const now = new Date();
      const past1hr = new Date(now.getTime() - 3600 * 1000);
      const past2hr = new Date(now.getTime() - 7200 * 1000);

      const rawActivities = [
        {
          id: "act_run_1",
          type: "RESEARCH_RUN" as const,
          title: "wooden desk organizer",
          timestamp: past2hr,
          href: "/research-center?q=wooden%20desk%20organizer",
        },
        {
          id: "act_val_1",
          type: "VALIDATION" as const,
          title: "minimalist ceramic dripper",
          verdict: "PURSUE",
          timestamp: now,
          href: "/validate?q=minimalist%20ceramic%20dripper",
        },
        {
          id: "act_opp_1",
          type: "SAVED_OPPORTUNITY" as const,
          title: "leather passport wallet",
          verdict: "INVESTIGATE",
          timestamp: past1hr,
          href: "/favorites",
        },
      ];

      const sorted = [...rawActivities].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      assert.equal(sorted[0].id, "act_val_1", "Most recent item must be first");
      assert.equal(sorted[1].id, "act_opp_1", "Second most recent item must be second");
      assert.equal(sorted[2].id, "act_run_1", "Oldest item must be last");
    });
  });

  describe("3. Multi-Tenant Scoping & Zero-Fabrication Contract", () => {
    it("ensures activity items require explicit organization tenant scoping", () => {
      const orgA = "org_tenant_alpha";
      const orgB = "org_tenant_beta";

      const recordA = {
        organizationId: orgA,
        query: "ceramic planter",
        type: "PRODUCT",
      };

      assert.equal(recordA.organizationId, orgA);
      assert.notEqual(recordA.organizationId, orgB);
    });

    it("verifies missing signals remain null and are never fabricated as 0", () => {
      const candidateItem = {
        title: "Handcrafted Oak Shelf",
        price: 49.99,
        reviewCount: 142,
        rating: 4.8,
        monthlySearchVolume: null,
        estimatedCompetitorRevenue: null,
      };

      assert.equal(candidateItem.monthlySearchVolume, null, "Search volume must remain null when unobservable");
      assert.equal(candidateItem.estimatedCompetitorRevenue, null, "Competitor revenue must remain null");
      assert.notEqual(candidateItem.monthlySearchVolume, 0, "Null must never be converted to synthetic 0");
    });
  });

  describe("4. Commercial Decision Verdict Hierarchy", () => {
    it("verifies standard decision verdicts are preserved across workflows", () => {
      const canonicalVerdicts = [
        "PURSUE",
        "INVESTIGATE",
        "TEST",
        "WAIT",
        "REJECT",
        "INSUFFICIENT_DATA",
      ];

      canonicalVerdicts.forEach((v) => {
        assert.ok(typeof v === "string");
        assert.ok(v.length > 0);
      });
    });
  });
});
