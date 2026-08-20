/**
 * SellerSalt Research Budgets & Execution Bounds
 * 
 * Centrally manages execution bounds, pagination caps, and safety limits for
 * marketplace-independent research operations to prevent runaway crawling.
 */

export interface ResearchBudgetConfig {
  maxPages: number;
  maxListings: number;
  maxShops: number;
  maxTimeoutMs: number;
  maxPayloadBytes: number;
  maxConcurrentRequests: number;
}

export const DEFAULT_RESEARCH_BUDGET: ResearchBudgetConfig = {
  maxPages: 3,
  maxListings: 50,
  maxShops: 15,
  maxTimeoutMs: 20000,
  maxPayloadBytes: 5 * 1024 * 1024, // 5MB
  maxConcurrentRequests: 3,
};

export class ResearchBudgetTracker {
  private config: ResearchBudgetConfig;
  private pagesFetched = 0;
  private listingsAcquired = 0;
  private shopsAcquired = 0;
  private startTime = Date.now();

  constructor(customConfig?: Partial<ResearchBudgetConfig>) {
    this.config = { ...DEFAULT_RESEARCH_BUDGET, ...customConfig };
  }

  public recordPageFetch(): boolean {
    this.pagesFetched++;
    return this.pagesFetched <= this.config.maxPages;
  }

  public recordListings(count: number): boolean {
    this.listingsAcquired += count;
    return this.listingsAcquired <= this.config.maxListings;
  }

  public recordShop(): boolean {
    this.shopsAcquired++;
    return this.shopsAcquired <= this.config.maxShops;
  }

  public hasExceededTimeout(): boolean {
    return Date.now() - this.startTime > this.config.maxTimeoutMs;
  }

  public canContinue(): boolean {
    if (this.hasExceededTimeout()) return false;
    if (this.pagesFetched >= this.config.maxPages) return false;
    if (this.listingsAcquired >= this.config.maxListings) return false;
    return true;
  }

  public getSummary() {
    return {
      pagesFetched: this.pagesFetched,
      listingsAcquired: this.listingsAcquired,
      shopsAcquired: this.shopsAcquired,
      elapsedMs: Date.now() - this.startTime,
      isBudgetExhausted: !this.canContinue(),
      config: this.config,
    };
  }
}
