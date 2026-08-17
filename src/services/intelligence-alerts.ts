/**
 * SellerSalt Intelligence Alerts & Notification Generator
 * 
 * Generates meaningful, non-spam notifications across canonical categories:
 * Opportunity, Competitor, Keyword, Listing, Shop, System, Billing, and Product Update.
 * 
 * Enforces strict thresholds so notifications only fire on actionable business events.
 */

import type { NotificationItem, NotificationCategory } from "./types";

export interface AlertTriggerInput {
  organizationId: string;
  type: "COMPETITOR_ACCELERATION" | "KEYWORD_DISCOVERY" | "LISTING_UNDERPERFORMANCE" | "OPPORTUNITY_DISCOVERY";
  title: string;
  data: {
    shopName?: string;
    keyword?: string;
    growthPercent?: number;
    oppScore?: number;
    daysLive?: number;
    actualVelocity?: number;
    forecastVelocity?: number;
  };
}

export function generateIntelligenceAlert(input: AlertTriggerInput): NotificationItem | null {
  const { type, title, data } = input;
  const now = new Date().toISOString();

  switch (type) {
    case "COMPETITOR_ACCELERATION":
      if (!data.growthPercent || data.growthPercent < 15) return null; // threshold: min +15%
      return {
        id: `notif_comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        category: "competitor",
        title: `🔥 Competitor Acceleration: '${data.shopName || title}'`,
        description: `Sales velocity surged +${data.growthPercent.toFixed(1)}% over the last 7 days. Winning tags may reveal emerging buyer demand.`,
        timestamp: now,
        read: false,
        important: true,
        severity: "warning",
      };

    case "KEYWORD_DISCOVERY":
      if (!data.oppScore || data.oppScore < 70) return null; // threshold: min 70
      return {
        id: `notif_kw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        category: "keyword",
        title: `🔎 New High-Intent Keyword Cluster: "${data.keyword || title}"`,
        description: `High opportunity score (${data.oppScore}/100) with accessible competition under 350 listings.`,
        timestamp: now,
        read: false,
        important: false,
      };

    case "LISTING_UNDERPERFORMANCE":
      if (!data.actualVelocity || !data.forecastVelocity || (data.forecastVelocity - data.actualVelocity) / data.forecastVelocity < 0.25) {
        return null; // threshold: at least 25% underperformance
      }
      return {
        id: `notif_list_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        category: "listing",
        title: `⚠ Listing Underperforming Forecast: "${title}"`,
        description: `Observed velocity (${data.actualVelocity.toFixed(1)}/day) trails category forecast (${data.forecastVelocity.toFixed(1)}/day). Consider refreshing secondary tags.`,
        timestamp: now,
        read: false,
        important: true,
        severity: "warning",
      };

    case "OPPORTUNITY_DISCOVERY":
      if (!data.oppScore || data.oppScore < 80) return null; // threshold: top tier >= 80
      return {
        id: `notif_opp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        category: "opportunity",
        title: `🎯 Strong Opportunity Discovered: "${title}"`,
        description: `Score ${data.oppScore}/100 with high sales velocity and healthy profit margins. Ready to shortlist.`,
        timestamp: now,
        read: false,
        important: false,
      };

    default:
      return null;
  }
}
