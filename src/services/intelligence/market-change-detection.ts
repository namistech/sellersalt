/**
 * SellerSalt Market Change Detection & "What Changed?" Engine
 * 
 * Computes deterministic multi-entity longitudinal differences between market snapshots:
 * - Products (new, disappeared, persistent, price movers, review gains, opportunity shifts)
 * - Sellers (new sellers, disappeared sellers, catalog expansion, concentration changes)
 * - Keywords (new keywords, rising prevalence, declining prevalence)
 * 
 * ZERO-FABRICATION RULE:
 * - Minimum observation requirement: n >= 2 snapshots.
 * - If only 1 snapshot exists, hasComparison is false and deltas remain strictly null.
 */

import type { DetailedMarketSnapshot } from "./continuous-market-memory";
import type { NormalizedProduct } from "@/marketplaces/core/types";

export interface ProductChangeItem {
  externalId: string;
  marketplace: string;
  title: string;
  changeType: "NEW" | "DISAPPEARED" | "PRICE_INCREASE" | "PRICE_DROP" | "REVIEW_GROWTH" | "PERSISTENT";
  previousPrice?: number | null;
  currentPrice?: number | null;
  priceDeltaPercent?: number | null;
  previousReviews?: number | null;
  currentReviews?: number | null;
  reviewDelta?: number | null;
  previousScore?: number | null;
  currentScore?: number | null;
}

export interface SellerChangeItem {
  sellerName: string;
  marketplace: string;
  changeType: "NEW_SELLER" | "DISAPPEARED_SELLER" | "CATALOG_EXPANSION" | "CATALOG_CONTRACTION" | "PERSISTENT";
  previousCatalogShare?: number | null;
  currentCatalogShare?: number | null;
  shareDelta?: number | null;
}

export interface KeywordChangeItem {
  term: string;
  changeType: "NEW_KEYWORD" | "RISING_PREVALENCE" | "DECLINING_PREVALENCE" | "STABLE";
  previousPrevalencePercent?: number | null;
  currentPrevalencePercent?: number | null;
  deltaPercent?: number | null;
}

export interface WhatChangedReport {
  snapshotKey: string;
  hasPreviousComparison: boolean;
  observationIntervalDays: number | null;
  previousCapturedAt: Date | null;
  currentCapturedAt: Date;
  summary: {
    newProductsCount: number;
    disappearedProductsCount: number;
    persistentProductsCount: number;
    priceMoversCount: number;
    medianPriceDelta: number | null;
    medianPriceDeltaPercent: number | null;
    sellerConcentrationDeltaHHI: number | null;
  };
  productChanges: ProductChangeItem[];
  sellerChanges: SellerChangeItem[];
  keywordChanges: KeywordChangeItem[];
  rankedSignificanceHighlights: string[];
  limitations: string[];
}

export class MarketChangeDetectionEngine {
  /**
   * Compares two consecutive market snapshots to generate a comprehensive "What Changed?" report.
   */
  public static compareSnapshots(
    current: DetailedMarketSnapshot,
    previous: DetailedMarketSnapshot | null,
    currentProducts?: NormalizedProduct[],
    previousProducts?: NormalizedProduct[]
  ): WhatChangedReport {
    // 1. Single snapshot guard: Zero-Fabrication enforcement
    if (!previous) {
      return {
        snapshotKey: current.snapshotKey,
        hasPreviousComparison: false,
        observationIntervalDays: null,
        previousCapturedAt: null,
        currentCapturedAt: current.capturedAt,
        summary: {
          newProductsCount: current.observedProductCount,
          disappearedProductsCount: 0,
          persistentProductsCount: 0,
          priceMoversCount: 0,
          medianPriceDelta: null,
          medianPriceDeltaPercent: null,
          sellerConcentrationDeltaHHI: null,
        },
        productChanges: [],
        sellerChanges: [],
        keywordChanges: [],
        rankedSignificanceHighlights: [
          `First observation baseline established with ${current.observedProductCount} products. Longitudinal delta tracking active.`,
        ],
        limitations: [
          "Historical change detection requires >= 2 distinct observation snapshots. Single-point observation baseline recorded.",
        ],
      };
    }

    const intervalMs = current.capturedAt.getTime() - previous.capturedAt.getTime();
    const intervalDays = parseFloat((intervalMs / (1000 * 60 * 60 * 24)).toFixed(1));

    // 2. Market Summary Deltas
    let medianPriceDelta: number | null = null;
    let medianPriceDeltaPercent: number | null = null;
    if (current.priceDistribution.median !== null && previous.priceDistribution.median !== null) {
      medianPriceDelta = parseFloat((current.priceDistribution.median - previous.priceDistribution.median).toFixed(2));
      if (previous.priceDistribution.median > 0) {
        medianPriceDeltaPercent = parseFloat(((medianPriceDelta / previous.priceDistribution.median) * 100).toFixed(1));
      }
    }

    let sellerConcentrationDeltaHHI: number | null = null;
    if (current.sellerConcentrationHHI !== null && previous.sellerConcentrationHHI !== null) {
      sellerConcentrationDeltaHHI = current.sellerConcentrationHHI - previous.sellerConcentrationHHI;
    }

    // 3. Product Level Changes
    const productChanges: ProductChangeItem[] = [];
    const prevProdMap = new Map<string, NormalizedProduct>();
    if (previousProducts) {
      for (const p of previousProducts) {
        prevProdMap.set(`${p.marketplace}:${p.externalId}`, p);
      }
    }

    let newCount = 0;
    let persistentCount = 0;
    let priceMoversCount = 0;

    if (currentProducts) {
      for (const curr of currentProducts) {
        const key = `${curr.marketplace}:${curr.externalId}`;
        const prev = prevProdMap.get(key);

        if (!prev) {
          newCount++;
          productChanges.push({
            externalId: curr.externalId,
            marketplace: curr.marketplace,
            title: curr.title,
            changeType: "NEW",
            currentPrice: curr.price,
            currentReviews: curr.reviewCount,
            currentScore: curr.opportunityScore?.score,
          });
        } else {
          persistentCount++;
          let isPriceMover = false;
          let priceDeltaPct: number | null = null;

          if (curr.price !== null && curr.price !== undefined && prev.price !== null && prev.price !== undefined && prev.price > 0) {
            const diff = curr.price - prev.price;
            priceDeltaPct = parseFloat(((diff / prev.price) * 100).toFixed(1));
            if (Math.abs(priceDeltaPct) >= 5) {
              isPriceMover = true;
              priceMoversCount++;
            }
          }

          const reviewDelta = (curr.reviewCount ?? 0) - (prev.reviewCount ?? 0);

          productChanges.push({
            externalId: curr.externalId,
            marketplace: curr.marketplace,
            title: curr.title,
            changeType: isPriceMover
              ? (priceDeltaPct ?? 0) > 0 ? "PRICE_INCREASE" : "PRICE_DROP"
              : reviewDelta > 0 ? "REVIEW_GROWTH" : "PERSISTENT",
            previousPrice: prev.price,
            currentPrice: curr.price,
            priceDeltaPercent: priceDeltaPct,
            previousReviews: prev.reviewCount,
            currentReviews: curr.reviewCount,
            reviewDelta: reviewDelta > 0 ? reviewDelta : null,
            previousScore: prev.opportunityScore?.score,
            currentScore: curr.opportunityScore?.score,
          });
        }
      }
    }

    const disappearedCount = previousProducts ? Math.max(0, previousProducts.length - persistentCount) : 0;

    // 4. Seller Changes
    const sellerChanges: SellerChangeItem[] = [];
    const prevSellerMap = new Map(previous.topSellers.map((s) => [s.sellerName.toLowerCase(), s]));

    for (const currSeller of current.topSellers) {
      const prevSeller = prevSellerMap.get(currSeller.sellerName.toLowerCase());
      if (!prevSeller) {
        sellerChanges.push({
          sellerName: currSeller.sellerName,
          marketplace: current.marketplace,
          changeType: "NEW_SELLER",
          currentCatalogShare: currSeller.catalogSharePercent,
        });
      } else {
        const shareDelta = parseFloat((currSeller.catalogSharePercent - prevSeller.catalogSharePercent).toFixed(1));
        sellerChanges.push({
          sellerName: currSeller.sellerName,
          marketplace: current.marketplace,
          changeType: shareDelta >= 5 ? "CATALOG_EXPANSION" : shareDelta <= -5 ? "CATALOG_CONTRACTION" : "PERSISTENT",
          previousCatalogShare: prevSeller.catalogSharePercent,
          currentCatalogShare: currSeller.catalogSharePercent,
          shareDelta,
        });
      }
    }

    // 5. Keyword Changes
    const keywordChanges: KeywordChangeItem[] = [];
    const prevKwMap = new Map(previous.topKeywords.map((k) => [k.term.toLowerCase(), k]));

    for (const currKw of current.topKeywords) {
      const prevKw = prevKwMap.get(currKw.term.toLowerCase());
      if (!prevKw) {
        keywordChanges.push({
          term: currKw.term,
          changeType: "NEW_KEYWORD",
          currentPrevalencePercent: currKw.prevalencePercent,
        });
      } else {
        const delta = currKw.prevalencePercent - prevKw.prevalencePercent;
        keywordChanges.push({
          term: currKw.term,
          changeType: delta >= 10 ? "RISING_PREVALENCE" : delta <= -10 ? "DECLINING_PREVALENCE" : "STABLE",
          previousPrevalencePercent: prevKw.prevalencePercent,
          currentPrevalencePercent: currKw.prevalencePercent,
          deltaPercent: delta,
        });
      }
    }

    // 6. Ranked Significance Highlights
    const highlights: string[] = [];
    if (newCount > 0) highlights.push(`${newCount} newly observed listings emerged in the sample.`);
    if (priceMoversCount > 0) highlights.push(`${priceMoversCount} products exhibited notable price adjustments.`);
    if (medianPriceDeltaPercent !== null && Math.abs(medianPriceDeltaPercent) >= 3) {
      highlights.push(`Median market price shifted by ${medianPriceDeltaPercent > 0 ? "+" : ""}${medianPriceDeltaPercent}% ($${medianPriceDelta}).`);
    }
    const risingKws = keywordChanges.filter((k) => k.changeType === "RISING_PREVALENCE");
    if (risingKws.length > 0) {
      highlights.push(`Rising keyword prevalence: ${risingKws.map((k) => `"${k.term}"`).join(", ")}.`);
    }

    return {
      snapshotKey: current.snapshotKey,
      hasPreviousComparison: true,
      observationIntervalDays: intervalDays,
      previousCapturedAt: previous.capturedAt,
      currentCapturedAt: current.capturedAt,
      summary: {
        newProductsCount: newCount,
        disappearedProductsCount: disappearedCount,
        persistentProductsCount: persistentCount,
        priceMoversCount,
        medianPriceDelta,
        medianPriceDeltaPercent,
        sellerConcentrationDeltaHHI,
      },
      productChanges,
      sellerChanges,
      keywordChanges,
      rankedSignificanceHighlights: highlights.length > 0 ? highlights : ["Market metrics remained stable between observation windows."],
      limitations: [
        "Observed changes represent public catalog sample diffs within rate limits.",
        "Disappeared listings may reflect indexing saturation rather than inventory de-listing.",
      ],
    };
  }
}
