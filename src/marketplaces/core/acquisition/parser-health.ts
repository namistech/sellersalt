/**
 * SellerSalt Parser Health & Drift Detection Engine
 * 
 * Inspects extraction yield, field fill rates, and DOM pattern matches to detect
 * marketplace HTML layout changes, anti-bot interstitials, and parser degradation.
 */

import type { MarketplaceId, NormalizedProduct } from "../types";
import { SourceHealthTracker } from "./source-health";

export interface ParserFieldMetrics {
  totalItems: number;
  withTitle: number;
  withPrice: number;
  withRating: number;
  withReviews: number;
  withShop: number;
  withImage: number;
  withCategory: number;
  fillRates: {
    titlePercent: number;
    pricePercent: number;
    ratingPercent: number;
    reviewsPercent: number;
    shopPercent: number;
    imagePercent: number;
    categoryPercent: number;
  };
}

export interface ParserHealthEvaluation {
  marketplace: MarketplaceId;
  status: "HEALTHY" | "DEGRADED" | "BROKEN" | "NO_DATA";
  driftDetected: boolean;
  driftReason?: string;
  confidenceScore: number; // 0 - 100
  metrics: ParserFieldMetrics;
  evaluatedAt: Date;
}

export class ParserHealthEngine {
  /**
   * Evaluates parser performance across extracted items from a public marketplace page.
   */
  public static evaluate(params: {
    marketplace: MarketplaceId;
    items: NormalizedProduct[];
    rawHtml?: string;
    statusCode?: number;
  }): ParserHealthEvaluation {
    const { marketplace, items, rawHtml, statusCode } = params;
    const totalItems = items.length;
    const evaluatedAt = new Date();

    if (totalItems === 0) {
      const isLikelyChallenge = rawHtml && (
        rawHtml.includes("captcha") ||
        rawHtml.includes("Type the characters you see") ||
        rawHtml.includes("Bot Check") ||
        rawHtml.includes("perimeterx") ||
        rawHtml.includes("datadome")
      );

      const driftReason = isLikelyChallenge
        ? "Access verification / challenge interstitial detected."
        : statusCode === 200 && rawHtml && rawHtml.length > 10000
        ? "HTML document received (200 OK) but 0 items extracted (DOM structure change suspected)."
        : undefined;

      return {
        marketplace,
        status: isLikelyChallenge ? "DEGRADED" : "NO_DATA",
        driftDetected: Boolean(driftReason && !isLikelyChallenge),
        driftReason,
        confidenceScore: 0,
        metrics: {
          totalItems: 0,
          withTitle: 0,
          withPrice: 0,
          withRating: 0,
          withReviews: 0,
          withShop: 0,
          withImage: 0,
          withCategory: 0,
          fillRates: {
            titlePercent: 0,
            pricePercent: 0,
            ratingPercent: 0,
            reviewsPercent: 0,
            shopPercent: 0,
            imagePercent: 0,
            categoryPercent: 0,
          },
        },
        evaluatedAt,
      };
    }

    const withTitle = items.filter((p) => p.title && p.title.trim().length > 0).length;
    const withPrice = items.filter((p) => p.price !== null && p.price !== undefined).length;
    const withRating = items.filter((p) => p.rating !== null && p.rating !== undefined).length;
    const withReviews = items.filter((p) => p.reviewCount !== null && p.reviewCount !== undefined).length;
    const withShop = items.filter((p) => p.shop?.name && p.shop.name.trim().length > 0).length;
    const withImage = items.filter((p) => p.imageUrl && p.imageUrl.startsWith("http")).length;
    const withCategory = items.filter((p) => p.categoryPath && p.categoryPath.length > 0).length;

    const titlePercent = Math.round((withTitle / totalItems) * 100);
    const pricePercent = Math.round((withPrice / totalItems) * 100);
    const ratingPercent = Math.round((withRating / totalItems) * 100);
    const reviewsPercent = Math.round((withReviews / totalItems) * 100);
    const shopPercent = Math.round((withShop / totalItems) * 100);
    const imagePercent = Math.round((withImage / totalItems) * 100);
    const categoryPercent = Math.round((withCategory / totalItems) * 100);

    let driftDetected = false;
    let driftReason: string | undefined;

    // Detection logic: if title < 80% or price < 40% while items exist, parser is degraded
    if (titlePercent < 80) {
      driftDetected = true;
      driftReason = `Title extraction rate dropped to ${titlePercent}% (expected >=80%).`;
    } else if (pricePercent < 40) {
      driftDetected = true;
      driftReason = `Price extraction rate dropped to ${pricePercent}% (expected >=40%).`;
    }

    const confidenceScore = Math.round(
      titlePercent * 0.35 +
      pricePercent * 0.25 +
      ratingPercent * 0.15 +
      reviewsPercent * 0.15 +
      shopPercent * 0.10
    );

    const status: "HEALTHY" | "DEGRADED" | "BROKEN" =
      confidenceScore >= 70 && !driftDetected ? "HEALTHY" : confidenceScore >= 40 ? "DEGRADED" : "BROKEN";

    return {
      marketplace,
      status,
      driftDetected,
      driftReason,
      confidenceScore,
      metrics: {
        totalItems,
        withTitle,
        withPrice,
        withRating,
        withReviews,
        withShop,
        withImage,
        withCategory,
        fillRates: {
          titlePercent,
          pricePercent,
          ratingPercent,
          reviewsPercent,
          shopPercent,
          imagePercent,
          categoryPercent,
        },
      },
      evaluatedAt,
    };
  }
}
