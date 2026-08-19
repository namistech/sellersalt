import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fetchAllMarketplaceKeywordResearch } from "@/services/keyword-research";
import { fetchAllMarketplaceCategoryTree } from "@/services/category-hunting";
import { resolveMarketplaceForAudit } from "@/services/seo-engine";
import { prisma } from "@/lib/db";
import { marketplaceFromSellerChannelPlatform, type MarketplaceId } from "@/marketplaces/core/types";

// Covers the "COMPLETE MARKETPLACE CONTEXT ACROSS THE REMAINING CORE
// INTELLIGENCE SURFACES" batch: Keyword Research, Category Hunting, and the
// SEO Audit's Draft Playground becoming genuinely marketplace-aware —
// reusing MarketplaceRegistry/MarketplaceSelector/getOptimizationRules
// rather than a second implementation. Route handlers that transitively
// import @/lib/auth (next-auth) are asserted via source inspection, matching
// the existing convention (see etsy-commercial-compliance-remediation.test.ts,
// all-marketplaces-ux-and-seo.test.ts) rather than live-imported, since
// next-auth's Google provider breaks under tsx --test outside the Next.js
// bundler.

const rootDir = process.cwd();
const readSrc = (rel: string) => fs.readFileSync(path.join(rootDir, rel), "utf-8");

const TEST_ORG_ID = "org_test_marketplace_context";

describe("Keyword Research: All-Marketplaces fan-out reuses fanOutMarketplaceRequest, not a second implementation", () => {
  it("fetchAllMarketplaceKeywordResearch attempts Etsy for real and isolates NOT_IMPLEMENTED marketplaces", async () => {
    const marketplaces: MarketplaceId[] = ["etsy", "amazon", "ebay"];
    const results = await fetchAllMarketplaceKeywordResearch(marketplaces, TEST_ORG_ID, {
      query: "desk planner",
      limit: 10,
    });

    assert.equal(results.length, 3);
    const etsy = results.find((r) => r.marketplace === "etsy");
    // Etsy is the one real, implemented connector — its outcome depends on
    // live credentials/API reachability in this environment, so it's either
    // a genuine success or a genuine (never fabricated) failure, but it must
    // never report NOT_IMPLEMENTED like the stub connectors do.
    assert.ok(
      etsy?.status === "AVAILABLE" || etsy?.status === "UNAVAILABLE",
      `Etsy must attempt real research, got status ${etsy?.status}`
    );
    if (etsy?.status === "AVAILABLE") {
      assert.ok(etsy.data?.keywords, "Etsy AVAILABLE must carry real harvested keywords");
    } else {
      assert.ok(etsy?.message, "Etsy UNAVAILABLE must explain why, never fail silently");
    }

    const amazon = results.find((r) => r.marketplace === "amazon");
    assert.equal(amazon?.status, "NOT_IMPLEMENTED");
    assert.ok(amazon?.message, "must explain why, never a silent empty result");
    assert.equal(amazon?.data, undefined, "must never fabricate keyword data for an unimplemented connector");
  });

  it("POST /api/keywords/search branches on marketplace === 'all' into the fan-out helper", () => {
    const code = readSrc("src/app/api/keywords/search/route.ts");
    assert.ok(code.includes('rawMarketplace === "all"'));
    assert.ok(code.includes("fetchAllMarketplaceKeywordResearch"));
    assert.ok(code.includes("registerAllConnectors"));
  });

  it("keyword-research/page.tsx wires MarketplaceSelector functionally (not decoratively)", () => {
    const code = readSrc("src/app/(dashboard)/keyword-research/page.tsx");
    assert.ok(code.includes("selectedId={marketplace}"), "selector must reflect real state");
    assert.ok(code.includes("onChange={(id) => setMarketplace(id)}"), "selector must drive real state");
    assert.ok(code.includes('marketplace: "all"') || code.includes('marketplace === "all"'));
    assert.ok(code.includes("isCapabilityUnavailable"), "must handle the structured unavailable response");
  });
});

describe("Category Hunting: All-Marketplaces fan-out strips non-serializable flattenedMap and reuses the same helper", () => {
  it("fetchAllMarketplaceCategoryTree attempts Etsy for real and isolates NOT_IMPLEMENTED marketplaces", async () => {
    const marketplaces: MarketplaceId[] = ["etsy", "amazon", "ebay", "tiktok_shop"];
    const results = await fetchAllMarketplaceCategoryTree(marketplaces, TEST_ORG_ID);

    assert.equal(results.length, 4);
    const etsy = results.find((r) => r.marketplace === "etsy");
    assert.ok(
      etsy?.status === "AVAILABLE" || etsy?.status === "UNAVAILABLE",
      `Etsy must attempt real taxonomy research, got status ${etsy?.status}`
    );
    if (etsy?.status === "AVAILABLE") {
      assert.ok(Array.isArray(etsy.data?.roots) && etsy.data!.roots.length > 0, "Etsy AVAILABLE must carry real taxonomy roots");
      assert.equal((etsy.data as any)?.flattenedMap, undefined, "the non-serializable Map must be stripped before returning");
    } else {
      assert.ok(etsy?.message, "Etsy UNAVAILABLE must explain why, never fail silently");
    }

    for (const marketplace of ["amazon", "ebay", "tiktok_shop"]) {
      const r = results.find((x) => x.marketplace === marketplace);
      assert.equal(r?.status, "NOT_IMPLEMENTED");
      assert.equal(r?.data, undefined, "must never fabricate a taxonomy tree for an unimplemented connector");
    }
  });

  it("GET /api/categories branches on marketplace === 'all' only when there's no free-text query to merge", () => {
    const code = readSrc("src/app/api/categories/route.ts");
    assert.ok(code.includes('rawMarketplace === "all" && !query.trim()'));
    assert.ok(code.includes("fetchAllMarketplaceCategoryTree"));
  });

  it("category-hunting-client.tsx wires MarketplaceSelector functionally and never fabricates a non-Etsy taxonomy", () => {
    const code = readSrc("src/app/(dashboard)/categories/category-hunting-client.tsx");
    assert.ok(code.includes("selectedId={marketplace}"));
    assert.ok(code.includes("onChange={(id) => setMarketplace(id)}"));
    assert.ok(code.includes("isCapabilityUnavailable"));
    // The Etsy-taxonomy-shaped search/breadcrumb/profile UI must stay gated
    // to marketplace === "etsy" rather than rendering for every marketplace.
    assert.ok(code.includes('marketplace === "etsy" && ('));
  });
});

describe("SEO Audit: Draft Playground scores against the selected marketplace's real rules", () => {
  it("POST /api/seo/audit resolves rules via a marketplace it derives (seller channel or manual pick) and pins Mode A (live Etsy fetch) to Etsy regardless", () => {
    const code = readSrc("src/app/api/seo/audit/route.ts");
    assert.ok(code.includes("resolveMarketplaceForAudit(organizationId, body.sellerChannelId, resolveMarketplace(body.marketplace))"));
    assert.ok(code.includes("getOptimizationRules(marketplace)"));
    assert.ok(code.includes("auditListingSeo(") && code.includes("rules"), "must thread rules into the audit call");
    // The seller-channel lookup itself must live in one place (seo-engine.ts),
    // not be re-implemented inline in the route.
    assert.ok(!code.includes("prisma.sellerChannel.findFirst"), "route must reuse resolveMarketplaceForAudit, not re-query SellerChannel itself");
  });

  it("saveListingSeoAuditRecord accepts and forwards marketplace rules instead of always defaulting to Etsy", () => {
    const code = readSrc("src/services/seo-engine.ts");
    assert.ok(code.includes("rules: MarketplaceOptimizationRules = ETSY_OPTIMIZATION_RULES"));
  });

  it("seo/page.tsx's Draft Playground tab offers a real MarketplaceSelector and derives its limits from getOptimizationRules, not a re-hardcoded 140/13", () => {
    const code = readSrc("src/app/(dashboard)/seo/page.tsx");
    assert.ok(code.includes("draftMarketplace"));
    assert.ok(code.includes("getOptimizationRules"));
    assert.ok(!code.includes("140 - draftTitle.length"), "must not keep the old hardcoded-140 computation alongside the new rules-driven one");
  });

  it("seo/page.tsx shows the active marketplace on the audit result and offers a connected-store picker that overrides manual selection", () => {
    const code = readSrc("src/app/(dashboard)/seo/page.tsx");
    assert.ok(code.includes("resultMarketplace"), "must track and display which marketplace the returned audit was scored against");
    assert.ok(code.includes("connectedChannels") && code.includes("selectedChannelId"));
    assert.ok(code.includes("sellerChannelId: selectedChannelId"), "must send the connected channel id so the server can derive the authoritative marketplace");
  });
});

describe("SEO Audit: marketplace derives from a connected seller channel when one is supplied", () => {
  it("marketplaceFromSellerChannelPlatform maps every SellerChannelPlatform enum member to a real MarketplaceId", () => {
    const cases: Record<string, MarketplaceId> = {
      ETSY_SELLER: "etsy",
      SHOPIFY: "shopify",
      WOOCOMMERCE: "woocommerce",
      AMAZON_SELLER: "amazon",
      EBAY_SELLER: "ebay",
      TIKTOK_SHOP_SELLER: "tiktok_shop",
    };
    for (const [platform, expected] of Object.entries(cases)) {
      assert.equal(marketplaceFromSellerChannelPlatform(platform), expected);
    }
    assert.equal(marketplaceFromSellerChannelPlatform("NOT_A_REAL_PLATFORM"), null);
  });

  it("resolveMarketplaceForAudit falls back to the given fallback when no channel id is supplied", async () => {
    const result = await resolveMarketplaceForAudit(TEST_ORG_ID, undefined, "etsy");
    assert.equal(result, "etsy");
  });

  it("resolveMarketplaceForAudit falls back when the channel id doesn't resolve under this org (never trusts an unscoped id)", async () => {
    const result = await resolveMarketplaceForAudit(TEST_ORG_ID, "not-a-real-channel-id", "etsy");
    assert.equal(result, "etsy");
  });

  it("resolveMarketplaceForAudit derives the real marketplace from a genuinely connected, org-scoped seller channel", async () => {
    const org = await prisma.organization.create({ data: { name: "Marketplace Context Test Org" } });
    const channel = await prisma.sellerChannel.create({
      data: {
        organizationId: org.id,
        platform: "WOOCOMMERCE",
        label: "Test WooCommerce Store",
        storeUrl: "https://test-marketplace-context.example.com",
        encryptedCredentials: "test-not-a-real-secret",
      },
    });

    try {
      const resolved = await resolveMarketplaceForAudit(org.id, channel.id, "etsy");
      assert.equal(resolved, "woocommerce", "must derive the marketplace from the channel's real platform, not the fallback");

      // Cross-tenant isolation: the same channel id under a different org
      // must never resolve — it must fall back instead of leaking.
      const crossTenant = await resolveMarketplaceForAudit("some-other-org-id", channel.id, "etsy");
      assert.equal(crossTenant, "etsy", "must not resolve a seller channel that belongs to a different organization");
    } finally {
      await prisma.sellerChannel.delete({ where: { id: channel.id } });
      await prisma.organization.delete({ where: { id: org.id } });
    }
  });
});

describe("No accidental bypass of the marketplace abstraction in the newly migrated surfaces", () => {
  const migratedFiles = [
    "src/services/keyword-research.ts",
    "src/services/category-hunting.ts",
    "src/services/seo-engine.ts",
    "src/app/api/keywords/search/route.ts",
    "src/app/api/categories/route.ts",
    "src/app/api/seo/audit/route.ts",
  ];

  it("none of the newly migrated surfaces import the old platform-connector registry (src/connectors/registry.ts) directly", () => {
    for (const file of migratedFiles) {
      const code = readSrc(file);
      assert.ok(
        !code.includes("connectors/registry") && !/from ["']@\/connectors["']/.test(code),
        `${file} must not bypass MarketplaceRegistry via the old src/connectors/registry.ts dispatcher`
      );
    }
  });

  it("none of the newly migrated surfaces dispatch seller-channel connectors via the old per-platform registry outside the marketplace adapters", () => {
    for (const file of migratedFiles) {
      const code = readSrc(file);
      assert.ok(
        !code.includes("getSellerChannelConnector"),
        `${file} must resolve a connected channel's marketplace via marketplaceFromSellerChannelPlatform/prisma, not the seller-channel connector dispatcher`
      );
    }
  });
});
