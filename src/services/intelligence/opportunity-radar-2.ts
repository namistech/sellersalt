/**
 * SellerSalt Opportunity Radar 2.0 Feed Engine
 * 
 * Organizes autonomous market intelligence into a structured, categorized Opportunity Radar feed
 * with clear decision sections and real-time pulse metrics.
 */

import type {
  AutonomousOpportunityItem,
  OpportunityRadar2Feed,
  OpportunityRadar2Pulse,
  OpportunityRadarSection,
  ProductIdea,
} from "@/marketplaces/core/autonomous-discovery-types";
import type { MarketplaceId } from "@/marketplaces/core/types";

export class OpportunityRadar2Engine {
  /**
   * Constructs the Opportunity Radar 2.0 Feed from discovered opportunities and product ideas.
   */
  public static buildRadarFeed(
    opportunities: AutonomousOpportunityItem[],
    productIdeas: ProductIdea[] = [],
    marketplaces: MarketplaceId[] = ["etsy", "amazon", "ebay", "walmart"]
  ): OpportunityRadar2Feed {
    const emerging = opportunities.filter(
      (o) => o.type === "EMERGING_PRODUCT" || o.type === "EMERGING_KEYWORD"
    );

    const rising = opportunities.filter(
      (o) =>
        o.type === "MOMENTUM_OPPORTUNITY" ||
        o.type === "RISING_KEYWORD" ||
        o.momentum === "ACCELERATING" ||
        o.momentum === "RISING"
    );

    const underserved = opportunities.filter(
      (o) => o.type === "UNDERSERVED_ATTRIBUTE" || o.type === "NICHE_OPPORTUNITY"
    );

    const priceGaps = opportunities.filter((o) => o.type === "PRICE_GAP");

    const crossMp = opportunities.filter(
      (o) => o.type === "CROSS_MARKETPLACE_OPPORTUNITY" || o.marketplaces.length > 1
    );

    const diff = opportunities.filter(
      (o) => o.type === "DIFFERENTIATION_OPPORTUNITY"
    );

    const persistent = opportunities.filter(
      (o) => o.type === "PERSISTENT_PRODUCT"
    );

    const sections: OpportunityRadarSection[] = [
      {
        id: "emerging",
        title: "Emerging Opportunities",
        description: "Freshly observed listings and keywords gaining initial traction.",
        badgeLabel: "Emerging",
        opportunities: emerging.slice(0, 8),
      },
      {
        id: "rising",
        title: "Rising Momentum",
        description: "Products with accelerating review velocity and expanding keyword presence.",
        badgeLabel: "High Velocity",
        opportunities: rising.slice(0, 8),
      },
      {
        id: "underserved",
        title: "Underserved Attributes & Niches",
        description: "Keywords and attributes with healthy search relevance but low listing saturation.",
        badgeLabel: "Low Saturation",
        opportunities: underserved.slice(0, 8),
      },
      {
        id: "price-gaps",
        title: "Price Gaps & Margin Windows",
        description: "Clear pricing tier windows above standard budget clusters.",
        badgeLabel: "Margin Window",
        opportunities: priceGaps.slice(0, 8),
      },
      {
        id: "cross-marketplace",
        title: "Cross-Marketplace Expansion",
        description: "Products validated across multiple platforms with expansion potential.",
        badgeLabel: "Multi-Channel",
        opportunities: crossMp.slice(0, 8),
      },
      {
        id: "differentiation",
        title: "Differentiation Gaps",
        description: "Products with distinctive material or design features against generic incumbents.",
        badgeLabel: "Differentiated",
        opportunities: diff.slice(0, 8),
      },
      {
        id: "persistent",
        title: "Persistent Market Leaders",
        description: "Opportunities that have maintained high viability scores over longitudinal tracking.",
        badgeLabel: "Proven Stability",
        opportunities: persistent.slice(0, 8),
      },
    ].filter((s) => s.opportunities.length > 0);

    // Compute dominant categories
    const catMap = new Map<string, { count: number; totalScore: number }>();
    for (const opp of opportunities) {
      const cat = opp.category || "General";
      const existing = catMap.get(cat) || { count: 0, totalScore: 0 };
      existing.count += 1;
      existing.totalScore += opp.score.compositeScore;
      catMap.set(cat, existing);
    }

    const dominantCategories = Array.from(catMap.entries())
      .map(([category, stats]) => ({
        category,
        count: stats.count,
        avgScore: Math.round(stats.totalScore / stats.count),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const avgScore =
      opportunities.length > 0
        ? Math.round(
            opportunities.reduce((acc, o) => acc + o.score.compositeScore, 0) /
              opportunities.length
          )
        : 0;

    const pulse: OpportunityRadar2Pulse = {
      totalOpportunitiesDiscovered: opportunities.length,
      emergingCount: emerging.length,
      risingCount: rising.length,
      underservedCount: underserved.length,
      priceGapCount: priceGaps.length,
      crossMarketplaceCount: crossMp.length,
      persistentCount: persistent.length,
      averageScore: avgScore,
      dominantCategories,
      generatedAt: new Date(),
    };

    return {
      pulse,
      sections,
      productIdeas,
      marketCoverage: {
        requested: marketplaces,
        available: marketplaces,
      },
      limitations: [
        "Radar signals represent public catalog sample diffs and observable review velocities.",
        "Private merchant sales volumes remain unobserved.",
      ],
    };
  }
}
