import { prisma } from "@/lib/db";
import { searchEtsyMarketplaceProducts, compareProducts } from "@/services/product-hunting";
import { fetchCompleteShopIntelligence } from "@/services/shop-intelligence";
import { fetchCategoryTree, fetchCategoryIntelligence } from "@/services/category-hunting";
import { fetchStandaloneKeywordResearch } from "@/services/keyword-research";
import { auditListingSeo } from "@/services/seo-engine";
import { generateOriginalListingDraft } from "@/services/listing-generation";
import {
  calculateShopDeltas,
  calculateShopVelocity,
  evaluateTrackingHealth,
} from "@/services/tracking-engine";
import { calculateProfitWaterfall } from "@/services/revenue-engine";
import { checkLimit } from "@/lib/plan-limits";
import type { DataProvenanceType } from "@/types/provenance";

export type ToolClassification = "READ" | "MUTATE" | "EXECUTE";

export interface SaltBotContext {
  organizationId: string;
  userId?: string;
  userRole?: string;
  connectedShop?: {
    isConnected: boolean;
    shopName?: string;
    currency?: string;
  };
  metrics?: {
    savedProspectCount: number;
    trackedShopCount: number;
    pendingPlannerItemCount: number;
  };
}

export interface ToolDefinition {
  name: string;
  description: string;
  classification: ToolClassification;
  requiresConfirmation: boolean;
  provenance: DataProvenanceType;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required?: string[];
  };
  handler: (params: any, context: SaltBotContext) => Promise<ToolExecutionResult>;
}

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  summary: string;
  provenance: DataProvenanceType;
  cards?: Array<{
    id: string;
    title: string;
    subtitle?: string;
    badge?: { label: string; variant: "success" | "warn" | "accent" | "neutral" };
    metrics?: Array<{ label: string; value: string | number }>;
    href?: string;
    imageUrl?: string;
  }>;
  actions?: Array<{
    label: string;
    href?: string;
    actionKey?: string;
    variant?: "primary" | "secondary" | "outline";
  }>;
  error?: string;
}

// -----------------------------------------------------------------------------
// CENTRALIZED TOOL REGISTRY
// -----------------------------------------------------------------------------

export const TOOL_REGISTRY: Record<string, ToolDefinition> = {
  // 1. PRODUCT SEARCH & RADAR
  search_products: {
    name: "search_products",
    description: "Search Etsy marketplace for products, filter by keyword, max price, or category.",
    classification: "READ",
    requiresConfirmation: false,
    provenance: "ACTUAL_ETSY_DATA",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search keyword query (e.g. 'minimalist desk planner')" },
        maxPrice: { type: "number", description: "Maximum price filter in USD" },
        minSales: { type: "number", description: "Minimum sales velocity threshold" },
      },
      required: ["query"],
    },
    handler: async (params, context) => {
      try {
        const query = String(params.query || "").trim();
        const results = await searchEtsyMarketplaceProducts(context.organizationId, {
          keywords: query,
          maxPrice: params.maxPrice,
          limit: 6,
        });

        if (!results.results || results.results.length === 0) {
          return {
            success: true,
            summary: `No Etsy listings found matching "${query}". Try broader search terms.`,
            provenance: "ACTUAL_ETSY_DATA",
          };
        }

        return {
          success: true,
          data: results.results,
          summary: `Found ${results.totalCount} Etsy listings for "${query}". Displaying top opportunities sorted by Opportunity Radar score [SELLERSALT SCORE].`,
          provenance: "ACTUAL_ETSY_DATA",
          cards: results.results.slice(0, 4).map((p) => {
            const oppScore = p.opportunity?.opportunityScore;
            const dailySales = p.signals?.estDailySales;
            return {
              id: p.listing.listingId,
              title: p.listing.title,
              subtitle: `Shop: ${p.shop.shopName || "Unknown"} • $${p.listing.price ? p.listing.price.toFixed(2) : "0.00"}`,
              badge: {
                label: oppScore !== undefined && oppScore !== null ? `Score: ${oppScore}/100` : "Score: —",
                variant: (oppScore ?? 0) >= 80 ? "success" : "accent",
              },
              metrics: [
                { label: "Price", value: p.listing.price ? `$${p.listing.price.toFixed(2)}` : "—" },
                { label: "Daily Sales", value: dailySales !== undefined && dailySales !== null && dailySales > 0 ? `~${dailySales.toFixed(1)}/day [ESTIMATED]` : "—" },
                { label: "Favorites", value: p.listing.numFavorers?.toLocaleString() || "—" },
              ],
              href: p.listing.listingUrl,
              imageUrl: p.listing.imageUrl ?? undefined,
            };
          }),
          actions: [
            { label: "View on Opportunity Radar", href: `/radar?q=${encodeURIComponent(query)}`, variant: "primary" },
            { label: "Add to Planner", actionKey: `Add top product for ${query} to planner`, variant: "secondary" },
          ],
        };
      } catch (err: any) {
        // Never fabricate marketplace listings when the upstream research
        // call fails — report the real failure instead, matching every
        // other tool in this registry (see research_shop below).
        const query = String(params.query || "").trim();
        return {
          success: false,
          summary: `Failed to search Etsy marketplace for "${query}": ${err.message}`,
          provenance: "ACTUAL_ETSY_DATA",
          error: err.message,
        };
      }
    },
  },

  // 2. SHOP RESEARCH
  research_shop: {
    name: "research_shop",
    description: "Deep research on a competitor Etsy shop by shop name or ID.",
    classification: "READ",
    requiresConfirmation: false,
    provenance: "ACTUAL_ETSY_DATA",
    parameters: {
      type: "object",
      properties: {
        shopExternalId: { type: "string", description: "Shop external ID or shop name (e.g. 'LeatherCraftCo')" },
      },
      required: ["shopExternalId"],
    },
    handler: async (params, context) => {
      try {
        const shopId = String(params.shopExternalId).trim();
        const profile = await fetchCompleteShopIntelligence(context.organizationId, shopId);

        const identity = profile.identity;
        const kpis = profile.kpis;
        return {
          success: true,
          data: profile,
          summary: `Competitor shop ${identity.shopName}: ${kpis.totalSales?.toLocaleString() ?? "—"} lifetime sales [ACTUAL ETSY DATA], ~${kpis.estDailySales}/day estimated velocity [ESTIMATED], with ${kpis.activeListings} active listings and ${kpis.reviewCount} reviews.`,
          provenance: "ACTUAL_ETSY_DATA",
          cards: [
            {
              id: identity.shopExternalId,
              title: identity.shopName,
              subtitle: `Established: ${identity.shopAgeMonths} months ago • Selling Ratio: ${kpis.avgSellingRatio.toFixed(1)} sales/listing`,
              badge: {
                label: kpis.reviewAverage ? `${kpis.reviewAverage.toFixed(1)} ★` : "No rating",
                variant: "success",
              },
              metrics: [
                { label: "Lifetime Sales", value: kpis.totalSales?.toLocaleString() ?? "—" },
                { label: "Est. Daily Sales", value: `~${kpis.estDailySales}/day [ESTIMATED]` },
                { label: "Listings", value: kpis.activeListings },
                { label: "Reviews", value: kpis.reviewCount.toLocaleString() },
              ],
              href: `/shops/${identity.shopExternalId}`,
            },
          ],
          actions: [
            { label: "View 8-Section Shop Profile", href: `/shops/${identity.shopExternalId}`, variant: "primary" },
            { label: "Track in ShopWatch", actionKey: `Track shop ${identity.shopExternalId}`, variant: "secondary" },
          ],
        };
      } catch (err: any) {
        return {
          success: false,
          summary: `Failed to research shop: ${err.message}`,
          provenance: "ACTUAL_ETSY_DATA",
          error: err.message,
        };
      }
    },
  },

  // 3. CATEGORY EXPLORATION
  explore_category: {
    name: "explore_category",
    description: "Explore Etsy taxonomy categories, subcategories, price percentiles, and market benchmarks.",
    classification: "READ",
    requiresConfirmation: false,
    provenance: "ACTUAL_ETSY_DATA",
    parameters: {
      type: "object",
      properties: {
        taxonomyId: { type: "string", description: "Optional taxonomy category ID (or omit to list root categories)" },
      },
    },
    handler: async (params, context) => {
      try {
        if (params.taxonomyId) {
          const profile = await fetchCategoryIntelligence(context.organizationId, Number(params.taxonomyId));
          return {
            success: true,
            data: profile,
            summary: `Category "${profile.name}": Median price $${profile.benchmarks.medianPrice.toFixed(2)}, Saturation: ${profile.benchmarks.nicheSaturationIndex} [SELLERSALT SCORE], and Opportunity score ${profile.benchmarks.opportunityScore}/100 [SELLERSALT SCORE].`,
            provenance: "ACTUAL_ETSY_DATA",
            actions: [
              { label: "View Category Benchmarks", href: `/categories`, variant: "primary" },
            ],
          };
        }

        // No inner catch here — a real fetchCategoryTree failure must
        // propagate to the outer catch below and report as a genuine
        // failure, never fall back to a fabricated sample taxonomy.
        const hierarchy = await fetchCategoryTree(context.organizationId);
        return {
          success: true,
          data: hierarchy.roots,
          summary: `Etsy Buyer Taxonomy contains ${hierarchy.roots.length} top-level root categories including ${hierarchy.roots.slice(0, 4).map((r: any) => r.name).join(", ")}.`,
          provenance: "ACTUAL_ETSY_DATA",
          actions: [{ label: "Browse Full Category Directory", href: "/categories", variant: "primary" }],
        };
      } catch (err: any) {
        return {
          success: false,
          summary: `Failed to explore categories: ${err.message}`,
          provenance: "ACTUAL_ETSY_DATA",
          error: err.message,
        };
      }
    },
  },

  // 4. KEYWORD RESEARCH
  search_keywords: {
    name: "search_keywords",
    description: "Perform standalone keyword research, tag harvesting, competition rating, and intent classification.",
    classification: "READ",
    requiresConfirmation: false,
    provenance: "ACTUAL_ETSY_DATA",
    parameters: {
      type: "object",
      properties: {
        keyword: { type: "string", description: "Search keyword term (e.g. 'budget binder planner')" },
      },
      required: ["keyword"],
    },
    handler: async (params, context) => {
      try {
        const kw = String(params.keyword || "").trim();
        type HarvestedTagView = {
          tag: string;
          frequency: number;
          characterCount: number;
          complianceStatus: "VALID" | "INVALID";
          competitionScore: string;
          wordCount: number;
        };

        // No inner catch here — a real fetchStandaloneKeywordResearch
        // failure must propagate to the outer catch below and report as a
        // genuine failure, never fall back to fabricated keyword data.
        const research = await fetchStandaloneKeywordResearch(context.organizationId, { query: kw });
        const totalResults = research.summary.totalEtsySupply;
        const averagePrice = research.summary.avgPrice;
        const competitionLevel = research.summary.competitionLevel;
        const harvestedTags: HarvestedTagView[] = research.keywords.slice(0, 8).map((k) => ({
          tag: k.term,
          frequency: k.frequency,
          characterCount: k.charCount,
          complianceStatus: k.isTagCompliant ? "VALID" : "INVALID",
          competitionScore: k.competitionLevel,
          wordCount: k.wordCount,
        }));

        return {
          success: true,
          data: { query: kw, totalResults, averagePrice, competitionLevel, harvestedTags },
          summary: `Keyword "${kw}": ${totalResults.toLocaleString()} active Etsy listings [ACTUAL ETSY DATA], Average price $${averagePrice.toFixed(2)}, Competition Level: ${competitionLevel} [SELLERSALT SCORE]. Harvested ${harvestedTags.length} long-tail tags.`,
          provenance: "ACTUAL_ETSY_DATA",
          cards: harvestedTags.slice(0, 4).map((t) => ({
            id: t.tag,
            title: t.tag,
            subtitle: `Frequency: ${t.frequency} competitor listings • Length: ${t.characterCount} chars`,
            badge: { label: t.complianceStatus === "VALID" ? "≤20 chars" : "Overlength", variant: t.complianceStatus === "VALID" ? "success" : "warn" },
            metrics: [
              { label: "Comp. Level", value: t.competitionScore },
              { label: "Word Count", value: t.wordCount },
            ],
          })),
          actions: [
            { label: "View Keyword Workbench", href: `/keyword-research?q=${encodeURIComponent(kw)}`, variant: "primary" },
            { label: "Save High-Freq Tags to Planner", actionKey: `Save tags for ${kw} to planner`, variant: "secondary" },
          ],
        };
      } catch (err: any) {
        return {
          success: false,
          summary: `Failed to research keyword: ${err.message}`,
          provenance: "ACTUAL_ETSY_DATA",
          error: err.message,
        };
      }
    },
  },

  // 5. SEO AUDIT
  audit_listing_seo: {
    name: "audit_listing_seo",
    description: "Run a 0-100 deterministic 5-pillar SEO audit on an Etsy listing title, tags, description, and taxonomy.",
    classification: "READ",
    requiresConfirmation: false,
    provenance: "SELLERSALT_SCORE",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Listing title text" },
        tags: { type: "string", description: "Comma-separated listing tags" },
        description: { type: "string", description: "Listing description text" },
      },
      required: ["title"],
    },
    handler: async (params) => {
      try {
        const title = String(params.title || "").trim();
        const rawTags = params.tags;
        const tags = Array.isArray(rawTags)
          ? rawTags
          : typeof rawTags === "string"
          ? rawTags.split(",").map((t: string) => t.trim()).filter(Boolean)
          : [];
        const description = String(params.description || "");

        const audit = auditListingSeo({
          title,
          tags,
          description,
        });

        return {
          success: true,
          data: audit,
          summary: `SellerSalt SEO Score: ${audit.overallScore}/100 (Grade ${audit.breakdown.grade}) [SELLERSALT SCORE]. Points: Title ${audit.breakdown.titleScore}/30, Tags ${audit.breakdown.tagScore}/35, Synergy ${audit.breakdown.keywordSynergyScore}/15, Description ${audit.breakdown.descriptionScore}/10. Diagnosed ${audit.diagnostics.length} issues.`,
          provenance: "SELLERSALT_SCORE",
          actions: [{ label: "Open in SEO Workbench", href: "/seo", variant: "primary" }],
        };
      } catch (err: any) {
        return {
          success: false,
          summary: `Failed to audit SEO: ${err.message}`,
          provenance: "SELLERSALT_SCORE",
          error: err.message,
        };
      }
    },
  },

  // 6. GENERATE ORIGINAL LISTING DRAFT
  generate_listing_draft: {
    name: "generate_listing_draft",
    description: "Generate an original Etsy listing draft (title <= 140 chars, 13 compliant tags, description) with <15% originality overlap enforcement.",
    classification: "MUTATE",
    requiresConfirmation: true,
    provenance: "SELLERSALT_SCORE",
    parameters: {
      type: "object",
      properties: {
        concept: { type: "string", description: "Product concept or target niche (e.g. 'Handmade Leather Passport Cover')" },
        targetAudience: { type: "string", description: "Target customer audience (e.g. 'Frequent travelers, wedding gift')" },
      },
      required: ["concept"],
    },
    handler: async (params, context) => {
      try {
        const concept = String(params.concept).trim();
        const result = await generateOriginalListingDraft({
          conceptTitle: concept,
          notes: params.targetAudience,
        });
        const { payload, originality } = result;

        // Persist as draft in ListingDraft table
        const savedDraft = await prisma.listingDraft.create({
          data: {
            organizationId: context.organizationId,
            title: payload.title,
            tags: payload.tags,
            description: payload.description,
            materials: payload.materials,
            price: payload.price,
            state: "draft",
            status: "DRAFT",
            originalityScore: originality.originalityScore,
          },
        });

        return {
          success: true,
          data: savedDraft,
          summary: `Generated original listing draft (Title: "${payload.title.slice(0, 60)}...", 13 tags, Originality: ${originality.originalityScore}% [SELLERSALT SCORE]). Saved in DRAFT status awaiting human review.`,
          provenance: "SELLERSALT_SCORE",
          actions: [
            { label: "Review Draft in Studio", href: `/studio`, variant: "primary" },
            { label: "Inspect SEO Score", href: `/seo`, variant: "secondary" },
          ],
        };
      } catch (err: any) {
        return {
          success: false,
          summary: `Failed to generate draft: ${err.message}`,
          provenance: "SELLERSALT_SCORE",
          error: err.message,
        };
      }
    },
  },

  // 7. TRACKED COMPETITORS INTELLIGENCE
  get_tracked_competitors: {
    name: "get_tracked_competitors",
    description: "Inspect monitored competitor shops, recent daily sales deltas, and breakout sales spikes.",
    classification: "READ",
    requiresConfirmation: false,
    provenance: "ACTUAL_ETSY_DATA",
    parameters: {
      type: "object",
      properties: {},
    },
    handler: async (_params, context) => {
      try {
        const watches = await prisma.shopWatch.findMany({
          where: { organizationId: context.organizationId, isActive: true },
          include: {
            snapshots: { orderBy: { capturedAt: "asc" } },
          },
        });

        if (watches.length === 0) {
          return {
            success: true,
            summary: "You are not tracking any research shops yet. You can track any benchmark store from Market Research (/spy).",
            provenance: "ACTUAL_ETSY_DATA",
            actions: [{ label: "Discover Shops to Track", href: "/spy", variant: "primary" }],
          };
        }

        const items = watches.map((w) => {
          const snapshots = w.snapshots;
          const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
          const deltas = calculateShopDeltas(snapshots);
          const velocity = calculateShopVelocity(snapshots);
          const health = evaluateTrackingHealth(latest, snapshots.length);
          return {
            shopName: w.shopName,
            shopExternalId: w.shopExternalId,
            totalSales: latest?.totalSales,
            salesDelta7d: deltas.salesDelta7d,
            estDailySales: velocity.estDailySales,
            isSpike: velocity.isSpike,
            health,
          };
        });

        const spikes = items.filter((i) => i.isSpike);
        let summaryText = `Currently tracking ${items.length} competitor shops.`;
        if (spikes.length > 0) {
          summaryText += ` ⚡ Breakout sales spike detected on: ${spikes.map((s) => s.shopName).join(", ")}.`;
        }

        return {
          success: true,
          data: items,
          summary: summaryText,
          provenance: "ACTUAL_ETSY_DATA",
          cards: items.slice(0, 4).map((i) => ({
            id: i.shopExternalId,
            title: i.shopName,
            subtitle: `7-Day Gain: +${i.salesDelta7d ?? 0} sales • Health: ${i.health}`,
            badge: {
              label: i.isSpike ? "⚡ Sales Spike" : `~${i.estDailySales}/day`,
              variant: i.isSpike ? "warn" : "success",
            },
            metrics: [
              { label: "Total Sales", value: i.totalSales?.toLocaleString() ?? "—" },
              { label: "Est. Daily Velocity", value: `~${i.estDailySales}/day [ESTIMATED]` },
            ],
            href: `/shops/${i.shopExternalId}`,
          })),
          actions: [{ label: "Open Tracking Center", href: "/spy/tracked", variant: "primary" }],
        };
      } catch (err: any) {
        return {
          success: false,
          summary: `Failed to retrieve tracked competitors: ${err.message}`,
          provenance: "ACTUAL_ETSY_DATA",
          error: err.message,
        };
      }
    },
  },

  // 8. ADD TO PLANNER
  add_to_planner: {
    name: "add_to_planner",
    description: "Add a new strategic task, product concept, or keyword workbench to the Workspace Planner.",
    classification: "MUTATE",
    requiresConfirmation: false,
    provenance: "SELLERSALT_SCORE",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Title of the planner item" },
        type: { type: "string", description: "Item type (PRODUCT_IDEA, TARGET_KEYWORD, SEO_TASK, COMPETITOR_TRACKING, LISTING_DRAFT)", enum: ["PRODUCT_IDEA", "TARGET_KEYWORD", "SEO_TASK", "COMPETITOR_TRACKING", "LISTING_DRAFT"] },
        notes: { type: "string", description: "Optional notes or target strategy" },
      },
      required: ["title"],
    },
    handler: async (params, context) => {
      try {
        const title = String(params.title).trim();
        const requestedType = params.type || "PRODUCT_IDEA";
        // Map the tool's user-facing type vocabulary to the real PlannerItemType enum.
        const TYPE_MAP: Record<string, string> = {
          PRODUCT_IDEA: "PRODUCT_RESEARCH",
          TARGET_KEYWORD: "KEYWORD_RESEARCH",
          SEO_TASK: "SEO_TASK",
          COMPETITOR_TRACKING: "SHOP_RESEARCH",
          LISTING_DRAFT: "LISTING_CONCEPT",
        };
        const type = TYPE_MAP[requestedType] || "PRODUCT_RESEARCH";

        const item = await prisma.plannerItem.create({
          data: {
            organizationId: context.organizationId,
            title,
            type: type as any,
            status: "BACKLOG",
            notes: params.notes || `Created via SaltBot Copilot on ${new Date().toLocaleDateString()}`,
            sourceType: "SALTBOT",
          },
        });

        return {
          success: true,
          data: item,
          summary: `Added "${title}" as a ${requestedType.replace("_", " ")} to the Workspace Planner in the Backlog stage.`,
          provenance: "SELLERSALT_SCORE",
          actions: [{ label: "View in Workspace Planner", href: "/planner", variant: "primary" }],
        };
      } catch (err: any) {
        return {
          success: false,
          summary: `Failed to create planner item: ${err.message}`,
          provenance: "SELLERSALT_SCORE",
          error: err.message,
        };
      }
    },
  },

  // 9. STORE REVENUE INTELLIGENCE
  get_store_revenue: {
    name: "get_store_revenue",
    description: "Analyze connected Etsy store orders, gross revenue, fee deductions, net payout, and profit waterfall.",
    classification: "READ",
    requiresConfirmation: false,
    provenance: "ACTUAL_ETSY_DATA",
    parameters: {
      type: "object",
      properties: {},
    },
    handler: async (_params, context) => {
      try {
        const channel = await prisma.sellerChannel.findFirst({
          where: { organizationId: context.organizationId, platform: "ETSY_SELLER" },
        });

        if (!channel) {
          return {
            success: true,
            summary: "No connected Etsy seller store found. Connect your Etsy store in Settings → Channels to see live P&L revenue waterfalls and profit analytics.",
            provenance: "ACTUAL_ETSY_DATA",
            actions: [{ label: "Connect Etsy Store", href: "/settings/channels", variant: "primary" }],
          };
        }

        const orders = await prisma.sellerOrder.findMany({
          where: { sellerChannelId: channel.id },
        });

        const waterfall = calculateProfitWaterfall(orders, "USD", {
          assumptions: {
            defaultCogsPercent: 25,
            defaultPackagingCost: 1.5,
            defaultShippingCost: 3.5,
          },
          includeOffsiteAds: false,
        });

        return {
          success: true,
          data: waterfall,
          summary: `Connected Store (${channel.label}): Gross Sales $${waterfall.grossSales.toFixed(2)} [ACTUAL ETSY DATA], Platform Fees -$${waterfall.fees.totalFees.toFixed(2)}, Estimated COGS & Logistics -$${(waterfall.estimatedCogs + waterfall.shippingPackagingCosts).toFixed(2)}, True Net Profit $${waterfall.trueNetProfit.toFixed(2)} (${waterfall.contributionMargin.toFixed(1)}% margin) [CALCULATED].`,
          provenance: "ACTUAL_ETSY_DATA",
          actions: [{ label: "View Full Profit Waterfall", href: "/analytics", variant: "primary" }],
        };
      } catch (err: any) {
        return {
          success: false,
          summary: `Failed to analyze store revenue: ${err.message}`,
          provenance: "ACTUAL_ETSY_DATA",
          error: err.message,
        };
      }
    },
  },
};
