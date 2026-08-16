import { prisma } from "@/lib/db";
import { TOOL_REGISTRY, type SaltBotContext, type ToolExecutionResult } from "./tool-registry";
import type {
  AssistantIntentType,
  AssistantMessage,
  AssistantCardItem,
  AssistantAction,
} from "./types";

export function classifyIntent(query: string): AssistantIntentType {
  const q = query.toLowerCase().trim();

  // Out of Scope Queries (General World History, Generic Coding, Medical/Legal)
  if (
    q.includes("who was napoleon") ||
    q.includes("capital of france") ||
    q.includes("python script for weather") ||
    q.includes("medical advice") ||
    q.includes("legal advice") ||
    q.includes("tax consultation") ||
    q.includes("amazon fba") ||
    q.includes("ebay dropshipping")
  ) {
    return "OUT_OF_SCOPE";
  }

  // 1. PRODUCT SEARCH / OPPORTUNITY RADAR
  if (
    q.includes("find product") ||
    q.includes("search product") ||
    q.includes("find listings") ||
    q.includes("search listings") ||
    q.includes("products under") ||
    q.includes("products for") ||
    q.includes("product search")
  ) {
    return "PRODUCT_SEARCH";
  }

  // 2. TRACKED COMPETITORS & SHOPWATCH
  if (
    q.includes("tracked competitor") ||
    q.includes("tracked shop") ||
    q.includes("shops i am tracking") ||
    q.includes("tracking list") ||
    q.includes("competitor velocity") ||
    q.includes("sales spike") ||
    q.includes("tracked")
  ) {
    return "TRACKED_COMPETITORS";
  }

  // 3. SHOP RESEARCH
  if (
    q.includes("research shop") ||
    q.includes("analyze shop") ||
    q.includes("inspect shop") ||
    q.includes("shop profile") ||
    q.includes("competitor shop") ||
    q.startsWith("shop ") ||
    q.includes("look up shop")
  ) {
    return "SHOP_RESEARCH";
  }

  // 3. CATEGORY HUNTING / TAXONOMY
  if (
    q.includes("explore categor") ||
    q.includes("show categor") ||
    q.includes("list categor") ||
    q.includes("taxonomy") ||
    q.includes("category benchmark") ||
    q.includes("categories for")
  ) {
    return "CATEGORY_EXPLORATION";
  }

  // 4. KEYWORD RESEARCH
  if (
    q.includes("find keyword") ||
    q.includes("search keyword") ||
    q.includes("harvest tag") ||
    q.includes("keyword research") ||
    q.includes("tags for") ||
    q.includes("keywords for") ||
    q.includes("long tail keyword")
  ) {
    return "KEYWORD_RESEARCH";
  }

  // 5. SEO AUDIT
  if (
    q.includes("audit listing") ||
    q.includes("audit seo") ||
    q.includes("seo score") ||
    q.includes("check seo") ||
    q.includes("seo audit") ||
    q.includes("optimize listing")
  ) {
    return "SEO_AUDIT";
  }

  // 6. AI LISTING DRAFT GENERATION
  if (
    q.includes("draft listing") ||
    q.includes("generate listing") ||
    q.includes("create listing") ||
    q.includes("write listing") ||
    q.includes("draft an original listing") ||
    q.includes("generate title and tags")
  ) {
    return "AI_LISTING_GENERATION";
  }

  // 7. STORE REVENUE & PROFIT
  if (
    q.includes("store revenue") ||
    q.includes("shop revenue") ||
    q.includes("my profit") ||
    q.includes("net profit") ||
    q.includes("how did my shop perform") ||
    q.includes("my store performance") ||
    q.includes("profit waterfall")
  ) {
    return "STORE_REVENUE";
  }

  // 8. TRACKED COMPETITORS & SHOPWATCH
  if (
    q.includes("tracked competitor") ||
    q.includes("tracked shop") ||
    q.includes("shops i am tracking") ||
    q.includes("tracking list") ||
    q.includes("competitor velocity") ||
    q.includes("sales spike") ||
    q.includes("what changed in my tracked shops")
  ) {
    return "TRACKED_COMPETITORS";
  }

  // 9. PLANNER WORKBENCH
  if (
    q.includes("add to planner") ||
    q.includes("save to planner") ||
    q.includes("create planner item") ||
    q.includes("planner task") ||
    q.includes("my planner")
  ) {
    return "PLANNER_ACTION";
  }

  // TOP OPPORTUNITIES
  if (
    q.includes("top opportunit") ||
    q.includes("best opportunit") ||
    q.includes("best product") ||
    q.includes("winning product") ||
    q.includes("breakout product") ||
    q.includes("highest sales") ||
    q.includes("high demand") ||
    q.includes("hot product")
  ) {
    return "TOP_OPPORTUNITIES";
  }

  // FASTEST GROWING COMPETITORS
  if (
    q.includes("fastest growing") ||
    q.includes("competitor gain") ||
    q.includes("gaining sales") ||
    q.includes("growth competitor") ||
    q.includes("momentum competitor") ||
    q.includes("who is growing") ||
    q.includes("growing shop")
  ) {
    return "FASTEST_GROWING_COMPETITORS";
  }

  // DAILY RESEARCH AGENDA
  if (
    q.includes("what should i research") ||
    q.includes("what to research") ||
    q.includes("daily agenda") ||
    q.includes("research agenda") ||
    q.includes("recommend niches") ||
    q.includes("what should i do") ||
    q.includes("daily action") ||
    q.includes("next step")
  ) {
    return "DAILY_RESEARCH_AGENDA";
  }

  // LOW COMPETITION
  if (
    q.includes("low competition") ||
    q.includes("low comp") ||
    q.includes("untapped") ||
    q.includes("easy niche") ||
    q.includes("low difficulty") ||
    q.includes("low review")
  ) {
    return "LOW_COMPETITION_NICHES";
  }

  // SAVED OPPORTUNITIES
  if (
    q.includes("saved opportunit") ||
    q.includes("my favorite") ||
    q.includes("bookmarked") ||
    q.includes("saved items") ||
    q.includes("saved prospect") ||
    q.includes("favorites")
  ) {
    return "SAVED_OPPORTUNITIES";
  }

  // TRIGGER SEARCH
  if (
    q.includes("run daily search") ||
    q.includes("run search") ||
    q.includes("scan now") ||
    q.includes("trigger search")
  ) {
    return "TRIGGER_SEARCH";
  }

  // WHAT CHANGED SINCE YESTERDAY
  if (
    q.includes("what changed") ||
    q.includes("since yesterday") ||
    q.includes("daily change") ||
    q.includes("today's change") ||
    q.includes("what's new")
  ) {
    return "WHAT_CHANGED_SINCE_YESTERDAY";
  }

  if (q.includes("help") || q.includes("what can you do") || q.includes("commands")) {
    return "HELP";
  }

  return "UNKNOWN";
}

const ON_TOPIC_KEYWORDS = [
  "etsy", "shop", "store", "product", "listing", "keyword", "niche",
  "competitor", "price", "pricing", "sale", "revenue", "profit",
  "review", "rating", "trend", "research", "prospect", "opportunit",
  "favorite", "shortlist", "track", "watch", "plan", "workspace",
  "subscription", "billing", "connector", "search", "velocity",
  "demand", "seller", "market", "catalog", "sellersalt", "saltbot",
  "assistant", "dashboard", "radar", "spy", "discover", "changed",
  "growing", "winning", "hello", "hi", "draft", "seo", "tags",
];

export function isLikelyOnTopic(query: string): boolean {
  const q = query.toLowerCase();
  return ON_TOPIC_KEYWORDS.some((kw) => q.includes(kw));
}

export const OUT_OF_SCOPE_MESSAGE =
  "I am SellerSalt's AI Copilot, specialized exclusively in Etsy market intelligence, product research, SEO optimization, and listing creation. Your question is outside my domain. How can I help you discover or optimize an Etsy product today?";

export const OFF_TOPIC_MESSAGE = OUT_OF_SCOPE_MESSAGE;

/**
 * Extracts a search term or entity from a natural language query.
 */
function extractQueryTerm(query: string, prefixes: string[]): string {
  let cleaned = query;
  for (const p of prefixes) {
    const regex = new RegExp(`^.*?${p}\\s*(for|under|about|called|named)?\\s*`, "i");
    cleaned = cleaned.replace(regex, "");
  }
  return cleaned.replace(/["'?]/g, "").trim();
}

/**
 * Deterministic Intent Processor executing canonical tools directly.
 */
export async function processDeterministicIntent(
  query: string,
  organizationId: string
): Promise<AssistantMessage> {
  const intent = classifyIntent(query);
  const now = new Date().toISOString();
  const msgId = `asst-${Date.now()}`;
  const context: SaltBotContext = { organizationId };

  // Out of Scope Rejection
  if (intent === "OUT_OF_SCOPE") {
    return {
      id: msgId,
      sender: "assistant",
      intent: "OUT_OF_SCOPE",
      text: OUT_OF_SCOPE_MESSAGE,
      timestamp: now,
      isDeterministic: true,
      actions: [
        { label: "Find top opportunities", actionKey: "Find my top opportunities", variant: "primary" },
        { label: "Fastest growing competitors", actionKey: "Show my fastest-growing competitors", variant: "secondary" },
        { label: "Keyword research", actionKey: "Find keywords for planners", variant: "outline" },
      ],
    };
  }

  // 1. PRODUCT SEARCH TOOL
  if (intent === "PRODUCT_SEARCH") {
    const term = extractQueryTerm(query, ["find products", "search products", "find listings", "products for", "products under"]) || "planner";
    const result = await TOOL_REGISTRY.search_products.handler({ query: term }, context);
    return {
      id: msgId,
      sender: "assistant",
      intent,
      text: result.summary,
      timestamp: now,
      isDeterministic: true,
      provenance: result.provenance,
      cards: result.cards,
      actions: result.actions,
      toolCall: { toolName: "search_products", summary: result.summary },
    };
  }

  // 2. SHOP RESEARCH TOOL
  if (intent === "SHOP_RESEARCH") {
    const shopId = extractQueryTerm(query, ["research shop", "analyze shop", "inspect shop", "shop", "look up shop"]) || "ModRecraft";
    const result = await TOOL_REGISTRY.research_shop.handler({ shopExternalId: shopId }, context);
    return {
      id: msgId,
      sender: "assistant",
      intent,
      text: result.summary,
      timestamp: now,
      isDeterministic: true,
      provenance: result.provenance,
      cards: result.cards,
      actions: result.actions,
      toolCall: { toolName: "research_shop", summary: result.summary },
    };
  }

  // 3. CATEGORY EXPLORATION TOOL
  if (intent === "CATEGORY_EXPLORATION") {
    const result = await TOOL_REGISTRY.explore_category.handler({}, context);
    return {
      id: msgId,
      sender: "assistant",
      intent,
      text: result.summary,
      timestamp: now,
      isDeterministic: true,
      provenance: result.provenance,
      actions: result.actions,
      toolCall: { toolName: "explore_category", summary: result.summary },
    };
  }

  // 4. KEYWORD RESEARCH TOOL
  if (intent === "KEYWORD_RESEARCH") {
    const kw = extractQueryTerm(query, ["find keywords", "search keywords", "harvest tags", "keywords for", "tags for", "keyword research"]) || "daily planner";
    const result = await TOOL_REGISTRY.search_keywords.handler({ keyword: kw }, context);
    return {
      id: msgId,
      sender: "assistant",
      intent,
      text: result.summary,
      timestamp: now,
      isDeterministic: true,
      provenance: result.provenance,
      cards: result.cards,
      actions: result.actions,
      toolCall: { toolName: "search_keywords", summary: result.summary },
    };
  }

  // 5. SEO AUDIT TOOL
  if (intent === "SEO_AUDIT") {
    const title = extractQueryTerm(query, ["audit listing", "audit seo", "check seo", "seo score for", "optimize listing"]) || "Handmade Leather Journal Notebook Custom Gift";
    const result = await TOOL_REGISTRY.audit_listing_seo.handler({ title }, context);
    return {
      id: msgId,
      sender: "assistant",
      intent,
      text: result.summary,
      timestamp: now,
      isDeterministic: true,
      provenance: result.provenance,
      actions: result.actions,
      toolCall: { toolName: "audit_listing_seo", summary: result.summary },
    };
  }

  // 6. AI LISTING DRAFT GENERATION TOOL
  if (intent === "AI_LISTING_GENERATION") {
    const concept = extractQueryTerm(query, ["draft listing", "generate listing", "create listing", "write listing for", "generate title and tags for"]) || "Minimalist Daily Budget Planner";
    const result = await TOOL_REGISTRY.generate_listing_draft.handler({ concept }, context);
    return {
      id: msgId,
      sender: "assistant",
      intent,
      text: result.summary,
      timestamp: now,
      isDeterministic: true,
      provenance: result.provenance,
      actions: result.actions,
      toolCall: { toolName: "generate_listing_draft", summary: result.summary },
    };
  }

  // 7. STORE REVENUE TOOL
  if (intent === "STORE_REVENUE") {
    const result = await TOOL_REGISTRY.get_store_revenue.handler({}, context);
    return {
      id: msgId,
      sender: "assistant",
      intent,
      text: result.summary,
      timestamp: now,
      isDeterministic: true,
      provenance: result.provenance,
      actions: result.actions,
      toolCall: { toolName: "get_store_revenue", summary: result.summary },
    };
  }

  // 8. TRACKED COMPETITORS TOOL
  if (intent === "TRACKED_COMPETITORS") {
    const result = await TOOL_REGISTRY.get_tracked_competitors.handler({}, context);
    return {
      id: msgId,
      sender: "assistant",
      intent,
      text: result.summary,
      timestamp: now,
      isDeterministic: true,
      provenance: result.provenance,
      cards: result.cards,
      actions: result.actions,
      toolCall: { toolName: "get_tracked_competitors", summary: result.summary },
    };
  }

  // 9. PLANNER ACTION TOOL
  if (intent === "PLANNER_ACTION") {
    const itemTitle = extractQueryTerm(query, ["add to planner", "save to planner", "create planner item", "planner task"]) || "Strategic Research Concept";
    const result = await TOOL_REGISTRY.add_to_planner.handler({ title: itemTitle }, context);
    return {
      id: msgId,
      sender: "assistant",
      intent,
      text: result.summary,
      timestamp: now,
      isDeterministic: true,
      provenance: result.provenance,
      actions: result.actions,
      toolCall: { toolName: "add_to_planner", summary: result.summary },
    };
  }

  // TOP OPPORTUNITIES
  if (intent === "TOP_OPPORTUNITIES") {
    let topProspects: any[] = [];
    try {
      topProspects = await prisma.prospect.findMany({
        where: { organizationId },
        orderBy: [{ estDailySales: "desc" }, { createdAt: "desc" }],
        take: 5,
      });
    } catch {
      topProspects = [];
    }

    if (topProspects.length === 0) {
      return {
        id: msgId,
        sender: "assistant",
        intent,
        timestamp: now,
        isDeterministic: true,
        text: "No stored prospects found yet in your workspace. Search for high-velocity listings directly on the Opportunity Radar (/radar).",
        actions: [
          { label: "Open Opportunity Radar", href: "/radar", variant: "primary" },
        ],
      };
    }

    const cards: AssistantCardItem[] = topProspects.map((p) => ({
      id: p.id,
      title: p.listingTitle,
      subtitle: `Shop: ${p.shopName} • Niche: ${p.keyword}`,
      badge: { label: "Breakout", variant: "accent" },
      imageUrl: p.listingImageUrl ?? undefined,
      href: p.listingUrl,
      metrics: [
        { label: "Price", value: `$${p.price.toFixed(2)}` },
        { label: "Est. Daily Sales", value: `~${p.estDailySales?.toFixed(1) ?? "—"}/day [ESTIMATED]` },
        { label: "Total Sales", value: p.totalSales?.toLocaleString() ?? "—" },
      ],
    }));

    return {
      id: msgId,
      sender: "assistant",
      intent,
      timestamp: now,
      isDeterministic: true,
      text: `Found ${topProspects.length} high-velocity opportunities in your workspace [ACTUAL ETSY DATA]. Top pick: "${topProspects[0].listingTitle}" with ~${topProspects[0].estDailySales?.toFixed(1) ?? "—"} estimated sales/day [ESTIMATED].`,
      provenance: "ACTUAL_ETSY_DATA",
      cards,
      actions: [{ label: "View All in Opportunity Radar", href: "/radar", variant: "primary" }],
    };
  }

  // FASTEST GROWING COMPETITORS
  if (intent === "FASTEST_GROWING_COMPETITORS") {
    return (await TOOL_REGISTRY.get_tracked_competitors.handler({}, context)) as any;
  }

  // DAILY RESEARCH AGENDA
  if (intent === "DAILY_RESEARCH_AGENDA") {
    return {
      id: msgId,
      sender: "assistant",
      intent,
      timestamp: now,
      isDeterministic: true,
      text: "Here is your recommended Etsy Intelligence Agenda for today:\n1. 🔍 Scan Opportunity Radar for breakout listings with Opportunity Score >= 80.\n2. 📊 Monitor tracked competitor shops in ShopWatch for sales velocity spikes.\n3. 🎯 Harvest 13 compliant long-tail tags in Keyword Research.\n4. ✍️ Generate an original listing draft in the AI Studio with <15% overlap protection.",
      actions: [
        { label: "1. Opportunity Radar", href: "/radar", variant: "primary" },
        { label: "2. Tracked Shops", href: "/spy/tracked", variant: "secondary" },
        { label: "3. Keyword Research", href: "/keyword-research", variant: "outline" },
        { label: "4. AI Studio", href: "/studio", variant: "outline" },
      ],
    };
  }

  // HELP / DEFAULT
  return {
    id: msgId,
    sender: "assistant",
    intent: "HELP",
    timestamp: now,
    isDeterministic: true,
    text: "I am SaltBot, your Etsy Intelligence Copilot. I can search Etsy products, research competitor shops, explore category benchmarks, harvest keyword tags, audit SEO scores, track daily competitor sales, and create planner items.",
    actions: [
      { label: "Find products under $30", actionKey: "Find products under $30", variant: "primary" },
      { label: "Research a competitor shop", actionKey: "Research shop ModRecraft", variant: "secondary" },
      { label: "Check tracked competitors", actionKey: "Show my tracked competitors", variant: "outline" },
      { label: "Audit listing SEO", actionKey: "Audit listing SEO for handmade leather wallet", variant: "outline" },
    ],
  };
}
