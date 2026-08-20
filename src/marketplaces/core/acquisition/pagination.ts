/**
 * SellerSalt Universal Pagination Engine
 * 
 * Coordinates bounded, intelligent multi-page data acquisition across public marketplace sources
 * with automatic duplicate detection, budget enforcement, and saturation termination.
 * 
 * ARCHITECTURAL CONSTRAINTS:
 * 1. Bounded execution: Never crawl unbounded page sequences.
 * 2. Deduplication: Detects duplicate item saturation to prevent redundant network requests.
 * 3. Budget enforcement: Strictly honors page, item count, payload, and duration quotas.
 */

import { ResearchBudgetTracker, type ResearchBudgetConfig } from "./research-budgets";

export type PaginationTerminationReason =
  | "TARGET_REACHED"
  | "NO_MORE_PAGES"
  | "BUDGET_REACHED"
  | "DUPLICATE_SATURATION"
  | "EMPTY_PAGE"
  | "ACCESS_RESTRICTED"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "FETCH_ERROR";

export interface PaginationOptions<T> {
  maxPages?: number;
  maxItems?: number;
  duplicateRateThreshold?: number; // Stop if duplicate rate > threshold (e.g. 0.8)
  budgetTracker?: ResearchBudgetTracker;
  getId: (item: T) => string;
  fetchPage: (
    page: number,
    cursor?: string
  ) => Promise<{
    items: T[];
    hasMore?: boolean;
    nextCursor?: string;
    nextPageUrl?: string;
    statusCode?: number;
    failureReason?: string;
    error?: string;
  }>;
}

export interface PaginationResult<T> {
  items: T[];
  pagesFetched: number;
  totalObserved: number;
  uniqueCount: number;
  duplicateCount: number;
  duplicateRate: number;
  terminationReason: PaginationTerminationReason;
  durationMs: number;
}

export class UniversalPaginationEngine {
  /**
   * Executes a multi-page acquisition loop with safety bounds, deduplication, and early termination.
   */
  public static async paginate<T>(options: PaginationOptions<T>): Promise<PaginationResult<T>> {
    const startTime = Date.now();
    const maxPages = options.maxPages || 3;
    const maxItems = options.maxItems || 50;
    const duplicateThreshold = options.duplicateRateThreshold || 0.8;
    const tracker = options.budgetTracker || new ResearchBudgetTracker({ maxPages, maxListings: maxItems });

    const accumulatedItems: T[] = [];
    const seenIds = new Set<string>();

    let currentPage = 1;
    let currentCursor: string | undefined = undefined;
    let totalObserved = 0;
    let duplicateCount = 0;
    let terminationReason: PaginationTerminationReason = "TARGET_REACHED";

    while (currentPage <= maxPages && accumulatedItems.length < maxItems) {
      if (!tracker.canContinue()) {
        terminationReason = "BUDGET_REACHED";
        break;
      }

      tracker.recordPageFetch();

      let pageRes: any;
      try {
        pageRes = await options.fetchPage(currentPage, currentCursor);
      } catch (err: any) {
        terminationReason = "FETCH_ERROR";
        break;
      }

      if (pageRes.failureReason === "ACCESS_RESTRICTED") {
        terminationReason = "ACCESS_RESTRICTED";
        break;
      }

      if (pageRes.failureReason === "RATE_LIMITED") {
        terminationReason = "RATE_LIMITED";
        break;
      }

      const pageItems: T[] = pageRes.items || [];

      if (pageItems.length === 0) {
        terminationReason = currentPage === 1 ? "EMPTY_PAGE" : "NO_MORE_PAGES";
        break;
      }

      totalObserved += pageItems.length;
      let pageNewCount = 0;
      let pageDupCount = 0;

      for (const item of pageItems) {
        const id = options.getId(item);
        if (!id || seenIds.has(id)) {
          duplicateCount++;
          pageDupCount++;
        } else {
          seenIds.add(id);
          accumulatedItems.push(item);
          pageNewCount++;
          if (accumulatedItems.length >= maxItems) break;
        }
      }

      tracker.recordListings(pageNewCount);

      // Check duplicate saturation on this page
      if (pageItems.length > 5 && pageDupCount / pageItems.length >= duplicateThreshold) {
        terminationReason = "DUPLICATE_SATURATION";
        break;
      }

      if (accumulatedItems.length >= maxItems) {
        terminationReason = "TARGET_REACHED";
        break;
      }

      if (pageRes.hasMore === false) {
        terminationReason = "NO_MORE_PAGES";
        break;
      }

      currentCursor = pageRes.nextCursor;
      currentPage++;
    }

    const uniqueCount = accumulatedItems.length;
    const duplicateRate = totalObserved > 0 ? Math.round((duplicateCount / totalObserved) * 100) / 100 : 0;

    return {
      items: accumulatedItems,
      pagesFetched: currentPage <= maxPages ? currentPage : maxPages,
      totalObserved,
      uniqueCount,
      duplicateCount,
      duplicateRate,
      terminationReason,
      durationMs: Date.now() - startTime,
    };
  }
}
