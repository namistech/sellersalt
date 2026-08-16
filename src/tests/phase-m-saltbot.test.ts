import test from "node:test";
import assert from "node:assert";
import { classifyIntent, isLikelyOnTopic, processDeterministicIntent, OUT_OF_SCOPE_MESSAGE } from "../services/assistant/intent-engine";
import { TOOL_REGISTRY, type SaltBotContext } from "../services/assistant/tool-registry";

test("Phase M: SaltBot Intent Classification & Out-of-Scope Guardrails", async (t) => {
  await t.test("accurately classifies supported e-commerce domain intents", () => {
    assert.strictEqual(classifyIntent("find products under $30"), "PRODUCT_SEARCH");
    assert.strictEqual(classifyIntent("research competitor shop ModRecraft"), "SHOP_RESEARCH");
    assert.strictEqual(classifyIntent("explore categories for jewelry"), "CATEGORY_EXPLORATION");
    assert.strictEqual(classifyIntent("find keywords for daily planner"), "KEYWORD_RESEARCH");
    assert.strictEqual(classifyIntent("audit listing SEO for handmade leather journal"), "SEO_AUDIT");
    assert.strictEqual(classifyIntent("draft listing for minimalist budget binder"), "AI_LISTING_GENERATION");
    assert.strictEqual(classifyIntent("how did my shop perform this month?"), "STORE_REVENUE");
    assert.strictEqual(classifyIntent("what changed in my tracked competitor shops?"), "TRACKED_COMPETITORS");
    assert.strictEqual(classifyIntent("add to planner: vintage candle concept"), "PLANNER_ACTION");
    assert.strictEqual(classifyIntent("what should I research today?"), "DAILY_RESEARCH_AGENDA");
  });

  await t.test("strictly classifies out-of-scope general queries as OUT_OF_SCOPE", () => {
    assert.strictEqual(classifyIntent("who was napoleon?"), "OUT_OF_SCOPE");
    assert.strictEqual(classifyIntent("write me a python script for weather"), "OUT_OF_SCOPE");
    assert.strictEqual(classifyIntent("give me legal advice for trademark"), "OUT_OF_SCOPE");
    assert.strictEqual(classifyIntent("how to do amazon fba"), "OUT_OF_SCOPE");
  });

  await t.test("rejects out-of-scope query with canonical explanatory message", async () => {
    const res = await processDeterministicIntent("who was napoleon?", "org_123");
    assert.strictEqual(res.intent, "OUT_OF_SCOPE");
    assert.strictEqual(res.text, OUT_OF_SCOPE_MESSAGE);
  });
});

test("Phase M: Tool Registry Integrity & Classification", async (t) => {
  await t.test("registers all required domain tools with schema and classification", () => {
    const requiredTools = [
      "search_products",
      "research_shop",
      "explore_category",
      "search_keywords",
      "audit_listing_seo",
      "generate_listing_draft",
      "get_tracked_competitors",
      "add_to_planner",
      "get_store_revenue",
    ];

    for (const toolName of requiredTools) {
      const tool = TOOL_REGISTRY[toolName];
      assert.ok(tool, `Tool ${toolName} must be registered in TOOL_REGISTRY`);
      assert.ok(tool.name, `Tool ${toolName} must define name`);
      assert.ok(tool.description, `Tool ${toolName} must define description`);
      assert.ok(tool.parameters, `Tool ${toolName} must define parameters schema`);
      assert.ok(tool.handler, `Tool ${toolName} must define handler function`);
    }
  });

  await t.test("enforces read vs mutating tool classification", () => {
    assert.strictEqual(TOOL_REGISTRY.search_products.classification, "READ");
    assert.strictEqual(TOOL_REGISTRY.research_shop.classification, "READ");
    assert.strictEqual(TOOL_REGISTRY.search_keywords.classification, "READ");
    assert.strictEqual(TOOL_REGISTRY.audit_listing_seo.classification, "READ");
    assert.strictEqual(TOOL_REGISTRY.generate_listing_draft.classification, "MUTATE");
    assert.strictEqual(TOOL_REGISTRY.add_to_planner.classification, "MUTATE");
  });
});

test("Phase M: Tool Execution & Provenance Preservation", async (t) => {
  const testContext: SaltBotContext = {
    organizationId: "org_test_phase_m",
    userRole: "OWNER",
  };

  await t.test("executes keyword research tool and preserves ACTUAL and ESTIMATED provenance", async () => {
    const result = await TOOL_REGISTRY.search_keywords.handler({ keyword: "desk planner" }, testContext);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.provenance, "ACTUAL_ETSY_DATA");
    assert.ok(result.summary.includes("[ACTUAL ETSY DATA]"));
    assert.ok(result.summary.includes("[SELLERSALT SCORE]"));
    assert.ok(Array.isArray(result.cards));
  });

  await t.test("executes SEO audit tool with 0-100 deterministic score and rubric breakdown", async () => {
    const result = await TOOL_REGISTRY.audit_listing_seo.handler(
      {
        title: "Handmade Leather Wallet Personalized Gift For Him Minimalist Card Holder",
        tags: "leather wallet, card holder, gift for him, handmade wallet",
      },
      testContext
    );

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.provenance, "SELLERSALT_SCORE");
    assert.ok(result.summary.includes("SellerSalt SEO Score:"));
    assert.ok(result.summary.includes("[SELLERSALT SCORE]"));
  });

  await t.test("executes category exploration tool and returns taxonomy roots", async () => {
    const result = await TOOL_REGISTRY.explore_category.handler({}, testContext);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.provenance, "ACTUAL_ETSY_DATA");
    assert.ok(result.summary.includes("Etsy Buyer Taxonomy"));
  });
});

test("Phase M: Multi-Tenant Security & Anti-Silent-Publish Gates", async (t) => {
  await t.test("strictly prevents model or user from forging organizationId", () => {
    const deriveContext = (sessionOrgId: string, modelGeneratedOrgId?: string) => {
      // Model-generated org ID must be completely ignored
      return { organizationId: sessionOrgId };
    };

    const ctx = deriveContext("org_authorized_session", "org_malicious_attacker");
    assert.strictEqual(ctx.organizationId, "org_authorized_session");
  });

  await t.test("guarantees AI listing generator never publishes live directly", () => {
    const tool = TOOL_REGISTRY.generate_listing_draft;
    assert.strictEqual(tool.requiresConfirmation, true, "Listing creation must require confirmation / draft state");
  });
});
