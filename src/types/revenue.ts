/**
 * SellerSalt — Revenue & Profit Intelligence Domain Types
 * Four-Tier Financial Integrity Standard:
 * 1. ACTUAL (Etsy API Verified)
 * 2. CALCULATED (Deterministic Math on Actual Data)
 * 3. USER_INPUT (Seller-Provided Cost Parameters)
 * 4. ESTIMATED (Derived Financial Heuristics)
 */

export type FinancialIntegrityTier = "ACTUAL" | "CALCULATED" | "USER_INPUT" | "ESTIMATED";

export interface FeeBreakdown {
  listingFees: number;        // $0.20 per auto-renewed listing / quantity
  transactionFees: number;    // 6.5% of total (item + shipping)
  processingFees: number;     // 3.0% + $0.25 standard payment processing
  offsiteAdsFees: number;     // 12%-15% on qualifying orders if enabled
  regulatoryFees: number;     // Regulatory operating fee where applicable
  totalFees: number;          // Sum of all platform fees
}

export interface ProfitWaterfall {
  // Top Line Revenue
  grossSales: number;              // [ACTUAL] Sum of completed receipt totals
  refunds: number;                 // [ACTUAL] Sum of refunded amounts
  netSales: number;                // [CALCULATED] grossSales - refunds
  
  // Platform Fees
  fees: FeeBreakdown;              // [CALCULATED]
  totalEtsyFees: number;           // [CALCULATED]
  netEtsyPayout: number;           // [CALCULATED] netSales - totalEtsyFees
  
  // Seller Costs
  estimatedCogs: number;           // [USER_INPUT] or [ESTIMATED]
  shippingPackagingCosts: number;  // [USER_INPUT]
  totalSellerCosts: number;        // [CALCULATED]
  
  // Bottom Line Profitability
  trueNetProfit: number;           // [CALCULATED] netEtsyPayout - totalSellerCosts
  contributionMargin: number;      // [CALCULATED] (trueNetProfit / netSales) * 100
  feeRatio: number;                // [CALCULATED] (totalEtsyFees / grossSales) * 100
  cogsRatio: number;               // [CALCULATED] (estimatedCogs / grossSales) * 100
  
  // Metadata
  orderCount: number;
  totalUnitsSold: number;
  averageOrderValue: number;       // [CALCULATED] grossSales / orderCount
  currency: string;
  isCogsModelled: boolean;         // true if fallback heuristic was used
}

export interface ListingYieldMetric {
  listingId: string;
  title: string;
  unitsSold: number;
  grossRevenue: number;
  refunds: number;
  netRevenue: number;
  avgSellingPrice: number;
  estimatedCogs: number;
  estimatedProfit: number;
  profitMargin: number;
  revenueShare: number;            // % of total shop revenue
  currency: string;
}

export interface ProfitCalculatorInput {
  salePrice: number;
  shippingCharged?: number;
  unitCogs?: number;
  shippingCostIncurred?: number;
  packagingCost?: number;
  offsiteAds?: boolean;
  offsiteAdsRate?: number;         // default 0.15 (15%)
  quantity?: number;
}

export interface ProfitCalculatorResult {
  // Revenue
  grossRevenuePerUnit: number;
  totalRevenue: number;
  
  // Platform Fees Itemization
  listingFeePerUnit: number;       // $0.20
  transactionFeePerUnit: number;   // 6.5%
  processingFeePerUnit: number;    // 3.0% + $0.25
  offsiteAdsFeePerUnit: number;    // 15% if active
  totalPlatformFeesPerUnit: number;
  totalPlatformFees: number;
  platformFeePercentage: number;
  
  // Product Costs
  unitCogs: number;
  shippingCostIncurred: number;
  packagingCost: number;
  totalProductCostsPerUnit: number;
  totalProductCosts: number;
  productCostPercentage: number;
  
  // Net Profit & Margins
  netProfitPerUnit: number;
  totalNetProfit: number;
  profitMargin: number;            // (netProfit / grossRevenue) * 100
  roiPercentage: number;           // (netProfit / totalProductCosts) * 100
  
  // Break-even
  breakEvenPrice: number;          // Minimum price to cover platform fees and COGS
  breakEvenUnits: number;          // Number of units to cover fixed listing costs
}

export interface FinancialCostAssumption {
  organizationId: string;
  defaultCogsPercent: number;      // e.g. 25.0 (25% of sale price)
  defaultPackagingCost: number;    // e.g. 1.00 ($1.00 per order)
  defaultShippingCost: number;     // e.g. 3.50 ($3.50 per order)
  offsiteAdsOptIn: boolean;        // default false
  offsiteAdsRate: number;          // default 0.15 (15%)
  updatedAt: string;
}

export interface FinancialInsight {
  id: string;
  title: string;
  type: "OPPORTUNITY" | "WARNING" | "EFFICIENCY" | "CONCENTRATION";
  message: string;
  metric?: string;
  provenance: "SELLERSALT_SCORE" | "CALCULATED";
}
