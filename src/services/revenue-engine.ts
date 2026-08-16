import type {
  ProfitWaterfall,
  FeeBreakdown,
  ListingYieldMetric,
  ProfitCalculatorInput,
  ProfitCalculatorResult,
  FinancialCostAssumption,
  FinancialInsight,
} from "@/types/revenue";

export interface NormalizedOrder {
  id: string;
  externalOrderId: string;
  totalAmount: number;
  currency: string;
  status: string;
  placedAt: Date;
  listingId?: string;
  title?: string;
  quantity?: number;
  refundAmount?: number;
}

export interface WaterfallCalculationOptions {
  assumptions?: Partial<FinancialCostAssumption>;
  includeOffsiteAds?: boolean;
}

/**
 * Calculates deterministic Etsy fees for a set of orders.
 */
export function calculateEtsyFeeBreakdown(
  orders: NormalizedOrder[],
  options?: WaterfallCalculationOptions
): FeeBreakdown {
  let listingFees = 0;
  let transactionFees = 0;
  let processingFees = 0;
  let offsiteAdsFees = 0;
  const offsiteAdsRate = options?.assumptions?.offsiteAdsRate || 0.15;
  const isOffsiteAdsOptIn = options?.assumptions?.offsiteAdsOptIn ?? options?.includeOffsiteAds ?? false;

  for (const o of orders) {
    if (o.status === "refunded" && o.totalAmount === 0) continue;
    const amount = Math.max(0, o.totalAmount);

    // Etsy Listing Fee: $0.20 per transaction item
    listingFees += 0.2;

    // Etsy Transaction Fee: 6.5% of total
    transactionFees += amount * 0.065;

    // Etsy Payment Processing: 3.0% + $0.25
    processingFees += amount * 0.03 + 0.25;

    // Optional Offsite Ads fee (15% on qualifying sales)
    if (isOffsiteAdsOptIn) {
      offsiteAdsFees += amount * offsiteAdsRate;
    }
  }

  const totalFees = listingFees + transactionFees + processingFees + offsiteAdsFees;

  return {
    listingFees: Number(listingFees.toFixed(2)),
    transactionFees: Number(transactionFees.toFixed(2)),
    processingFees: Number(processingFees.toFixed(2)),
    offsiteAdsFees: Number(offsiteAdsFees.toFixed(2)),
    regulatoryFees: 0,
    totalFees: Number(totalFees.toFixed(2)),
  };
}

/**
 * Calculates the complete Profit & Loss Waterfall across a set of orders.
 * Guaranteed currency isolation (computes against provided orders of a single currency).
 */
export function calculateProfitWaterfall(
  orders: NormalizedOrder[],
  currency = "USD",
  options?: WaterfallCalculationOptions
): ProfitWaterfall {
  if (orders.length === 0) {
    return {
      grossSales: 0,
      refunds: 0,
      netSales: 0,
      fees: {
        listingFees: 0,
        transactionFees: 0,
        processingFees: 0,
        offsiteAdsFees: 0,
        regulatoryFees: 0,
        totalFees: 0,
      },
      totalEtsyFees: 0,
      netEtsyPayout: 0,
      estimatedCogs: 0,
      shippingPackagingCosts: 0,
      totalSellerCosts: 0,
      trueNetProfit: 0,
      contributionMargin: 0,
      feeRatio: 0,
      cogsRatio: 0,
      orderCount: 0,
      totalUnitsSold: 0,
      averageOrderValue: 0,
      currency,
      isCogsModelled: true,
    };
  }

  let grossSales = 0;
  let refunds = 0;
  let totalUnits = 0;

  for (const o of orders) {
    if (o.status === "refunded") {
      refunds += o.refundAmount || o.totalAmount;
    } else {
      grossSales += o.totalAmount;
      totalUnits += o.quantity || 1;
    }
  }

  const netSales = Math.max(0, grossSales - refunds);
  const fees = calculateEtsyFeeBreakdown(orders, options);
  const netEtsyPayout = Math.max(0, netSales - fees.totalFees);

  // Seller Cost Calculations (COGS + Packaging + Shipping)
  let estimatedCogs = 0;
  let isCogsModelled = true;

  if (options?.assumptions?.defaultCogsPercent !== undefined) {
    estimatedCogs = (netSales * options.assumptions.defaultCogsPercent) / 100;
    isCogsModelled = false;
  } else {
    // Default standard physical/digital blended benchmark: 25% COGS
    estimatedCogs = netSales * 0.25;
    isCogsModelled = true;
  }

  const packagingCostPerOrder = options?.assumptions?.defaultPackagingCost || 0;
  const shippingCostPerOrder = options?.assumptions?.defaultShippingCost || 0;
  const totalPackagingShipping = (packagingCostPerOrder + shippingCostPerOrder) * orders.length;

  const totalSellerCosts = estimatedCogs + totalPackagingShipping;
  const trueNetProfit = netEtsyPayout - totalSellerCosts;
  const contributionMargin = netSales > 0 ? (trueNetProfit / netSales) * 100 : 0;
  const feeRatio = grossSales > 0 ? (fees.totalFees / grossSales) * 100 : 0;
  const cogsRatio = grossSales > 0 ? (estimatedCogs / grossSales) * 100 : 0;
  const aov = orders.length > 0 ? grossSales / orders.length : 0;

  return {
    grossSales: Number(grossSales.toFixed(2)),
    refunds: Number(refunds.toFixed(2)),
    netSales: Number(netSales.toFixed(2)),
    fees,
    totalEtsyFees: Number(fees.totalFees.toFixed(2)),
    netEtsyPayout: Number(netEtsyPayout.toFixed(2)),
    estimatedCogs: Number(estimatedCogs.toFixed(2)),
    shippingPackagingCosts: Number(totalPackagingShipping.toFixed(2)),
    totalSellerCosts: Number(totalSellerCosts.toFixed(2)),
    trueNetProfit: Number(trueNetProfit.toFixed(2)),
    contributionMargin: Number(contributionMargin.toFixed(1)),
    feeRatio: Number(feeRatio.toFixed(1)),
    cogsRatio: Number(cogsRatio.toFixed(1)),
    orderCount: orders.length,
    totalUnitsSold: totalUnits,
    averageOrderValue: Number(aov.toFixed(2)),
    currency,
    isCogsModelled,
  };
}

/**
 * Calculates listing yield and revenue performance matrix.
 */
export function calculateListingYieldMatrix(
  orders: NormalizedOrder[],
  options?: WaterfallCalculationOptions
): ListingYieldMetric[] {
  const listingMap = new Map<string, {
    title: string;
    units: number;
    gross: number;
    refunds: number;
    currency: string;
  }>();

  let totalShopGross = 0;

  for (const o of orders) {
    const key = o.listingId || "unattributed";
    const title = o.title || (key === "unattributed" ? "Store Direct / Unattributed Item" : `Etsy Listing #${key}`);
    const currency = o.currency || "USD";
    const existing = listingMap.get(key) || {
      title,
      units: 0,
      gross: 0,
      refunds: 0,
      currency,
    };

    if (o.status === "refunded") {
      existing.refunds += o.refundAmount || o.totalAmount;
    } else {
      existing.gross += o.totalAmount;
      existing.units += o.quantity || 1;
      totalShopGross += o.totalAmount;
    }

    listingMap.set(key, existing);
  }

  const cogsPercent = options?.assumptions?.defaultCogsPercent ?? 25;

  const results: ListingYieldMetric[] = [];

  for (const [listingId, data] of listingMap.entries()) {
    const netRevenue = Math.max(0, data.gross - data.refunds);
    const avgSellingPrice = data.units > 0 ? data.gross / data.units : 0;
    const estCogs = (netRevenue * cogsPercent) / 100;
    // Standard fees estimate: ~11.5%
    const estFees = netRevenue * 0.115 + data.units * 0.2;
    const estProfit = netRevenue - estCogs - estFees;
    const profitMargin = netRevenue > 0 ? (estProfit / netRevenue) * 100 : 0;
    const revenueShare = totalShopGross > 0 ? (data.gross / totalShopGross) * 100 : 0;

    results.push({
      listingId,
      title: data.title,
      unitsSold: data.units,
      grossRevenue: Number(data.gross.toFixed(2)),
      refunds: Number(data.refunds.toFixed(2)),
      netRevenue: Number(netRevenue.toFixed(2)),
      avgSellingPrice: Number(avgSellingPrice.toFixed(2)),
      estimatedCogs: Number(estCogs.toFixed(2)),
      estimatedProfit: Number(estProfit.toFixed(2)),
      profitMargin: Number(profitMargin.toFixed(1)),
      revenueShare: Number(revenueShare.toFixed(1)),
      currency: data.currency,
    });
  }

  return results.sort((a, b) => b.grossRevenue - a.grossRevenue);
}

/**
 * Simulates unit economics for pre-launch product evaluation.
 */
export function calculateProfitSimulation(input: ProfitCalculatorInput): ProfitCalculatorResult {
  const salePrice = Math.max(0, input.salePrice || 0);
  const shippingCharged = Math.max(0, input.shippingCharged || 0);
  const quantity = Math.max(1, input.quantity || 1);

  const grossRevenuePerUnit = salePrice + shippingCharged;
  const totalRevenue = grossRevenuePerUnit * quantity;

  // Platform Fees Itemization
  const listingFeePerUnit = 0.2; // $0.20 listing fee
  const transactionFeePerUnit = grossRevenuePerUnit * 0.065; // 6.5% transaction fee
  const processingFeePerUnit = grossRevenuePerUnit * 0.03 + 0.25; // 3% + $0.25 payment processing
  const offsiteAdsRate = input.offsiteAdsRate || 0.15;
  const offsiteAdsFeePerUnit = input.offsiteAds ? grossRevenuePerUnit * offsiteAdsRate : 0;

  const totalPlatformFeesPerUnit =
    listingFeePerUnit + transactionFeePerUnit + processingFeePerUnit + offsiteAdsFeePerUnit;
  const totalPlatformFees = totalPlatformFeesPerUnit * quantity;
  const platformFeePercentage = grossRevenuePerUnit > 0 ? (totalPlatformFeesPerUnit / grossRevenuePerUnit) * 100 : 0;

  // Product Costs Itemization
  const unitCogs = Math.max(0, input.unitCogs || 0);
  const shippingCostIncurred = Math.max(0, input.shippingCostIncurred || 0);
  const packagingCost = Math.max(0, input.packagingCost || 0);

  const totalProductCostsPerUnit = unitCogs + shippingCostIncurred + packagingCost;
  const totalProductCosts = totalProductCostsPerUnit * quantity;
  const productCostPercentage = grossRevenuePerUnit > 0 ? (totalProductCostsPerUnit / grossRevenuePerUnit) * 100 : 0;

  // Net Profit & Margins
  const netProfitPerUnit = grossRevenuePerUnit - totalPlatformFeesPerUnit - totalProductCostsPerUnit;
  const totalNetProfit = netProfitPerUnit * quantity;
  const profitMargin = grossRevenuePerUnit > 0 ? (netProfitPerUnit / grossRevenuePerUnit) * 100 : 0;
  const roiPercentage = totalProductCostsPerUnit > 0 ? (netProfitPerUnit / totalProductCostsPerUnit) * 100 : 0;

  // Break-even Analysis
  // Revenue = FixedFees ($0.45) + VariableRate * Price + UnitCosts
  // Price * (1 - 0.095 - adsRate) = TotalProductCosts + 0.45
  const variableRate = 0.065 + 0.03 + (input.offsiteAds ? offsiteAdsRate : 0);
  const denominator = 1 - variableRate;
  const breakEvenPrice = denominator > 0 ? (totalProductCostsPerUnit + 0.45) / denominator : 0;

  // Break-even units to cover 1st listing fee
  const marginPerUnit = grossRevenuePerUnit - (grossRevenuePerUnit * variableRate + 0.25) - totalProductCostsPerUnit;
  const breakEvenUnits = marginPerUnit > 0 ? Math.ceil(0.2 / marginPerUnit) : 1;

  return {
    grossRevenuePerUnit: Number(grossRevenuePerUnit.toFixed(2)),
    totalRevenue: Number(totalRevenue.toFixed(2)),
    listingFeePerUnit: Number(listingFeePerUnit.toFixed(2)),
    transactionFeePerUnit: Number(transactionFeePerUnit.toFixed(2)),
    processingFeePerUnit: Number(processingFeePerUnit.toFixed(2)),
    offsiteAdsFeePerUnit: Number(offsiteAdsFeePerUnit.toFixed(2)),
    totalPlatformFeesPerUnit: Number(totalPlatformFeesPerUnit.toFixed(2)),
    totalPlatformFees: Number(totalPlatformFees.toFixed(2)),
    platformFeePercentage: Number(platformFeePercentage.toFixed(1)),
    unitCogs: Number(unitCogs.toFixed(2)),
    shippingCostIncurred: Number(shippingCostIncurred.toFixed(2)),
    packagingCost: Number(packagingCost.toFixed(2)),
    totalProductCostsPerUnit: Number(totalProductCostsPerUnit.toFixed(2)),
    totalProductCosts: Number(totalProductCosts.toFixed(2)),
    productCostPercentage: Number(productCostPercentage.toFixed(1)),
    netProfitPerUnit: Number(netProfitPerUnit.toFixed(2)),
    totalNetProfit: Number(totalNetProfit.toFixed(2)),
    profitMargin: Number(profitMargin.toFixed(1)),
    roiPercentage: Number(roiPercentage.toFixed(1)),
    breakEvenPrice: Number(breakEvenPrice.toFixed(2)),
    breakEvenUnits,
  };
}

/**
 * Generates explainable financial insights and health alerts.
 */
export function generateFinancialInsights(
  waterfall: ProfitWaterfall,
  yieldList: ListingYieldMetric[]
): FinancialInsight[] {
  const insights: FinancialInsight[] = [];

  if (waterfall.orderCount === 0) {
    insights.push({
      id: "no-orders",
      title: "Awaiting Sales Activity",
      type: "OPPORTUNITY",
      message: "Connect your Etsy shop and execute new listing drafts to begin tracking order receipts and unit profits.",
      provenance: "CALCULATED",
    });
    return insights;
  }

  // 1. Fee Drag Warning
  if (waterfall.feeRatio > 18) {
    insights.push({
      id: "fee-drag",
      title: "High Platform Fee Ratio",
      type: "WARNING",
      message: `Total Etsy platform fees account for ${waterfall.feeRatio}% of gross sales. Review offsite ads opt-in or bundle items to increase Average Order Value ($${waterfall.averageOrderValue}).`,
      metric: `${waterfall.feeRatio}% Fee Ratio`,
      provenance: "SELLERSALT_SCORE",
    });
  }

  // 2. High Margin Efficiency
  if (waterfall.contributionMargin >= 65) {
    insights.push({
      id: "high-margin",
      title: "Strong Profit Margin",
      type: "EFFICIENCY",
      message: `Your store delivers an exceptional ${waterfall.contributionMargin}% contribution margin, significantly outperforming standard retail benchmarks.`,
      metric: `${waterfall.contributionMargin}% Margin`,
      provenance: "SELLERSALT_SCORE",
    });
  } else if (waterfall.contributionMargin < 35 && waterfall.netSales > 0) {
    insights.push({
      id: "low-margin",
      title: "Margin Compression Alert",
      type: "WARNING",
      message: `Net profit margin is currently ${waterfall.contributionMargin}%. Consider raising prices by 10-15% or lowering material and shipping costs.`,
      metric: `${waterfall.contributionMargin}% Margin`,
      provenance: "SELLERSALT_SCORE",
    });
  }

  // 3. Revenue Concentration Risk
  if (yieldList.length > 1 && yieldList[0].revenueShare >= 60) {
    insights.push({
      id: "revenue-concentration",
      title: "Catalog Concentration Risk",
      type: "CONCENTRATION",
      message: `Top product "${yieldList[0].title.slice(0, 35)}..." generates ${yieldList[0].revenueShare}% of total store revenue. Diversify your catalog by launching complementary product lines.`,
      metric: `${yieldList[0].revenueShare}% Concentration`,
      provenance: "SELLERSALT_SCORE",
    });
  }

  // 4. Refund Rate Alert
  const refundRate = waterfall.grossSales > 0 ? (waterfall.refunds / waterfall.grossSales) * 100 : 0;
  if (refundRate >= 5) {
    insights.push({
      id: "high-refunds",
      title: "Elevated Refund Rate",
      type: "WARNING",
      message: `Refunds account for ${refundRate.toFixed(1)}% of gross sales. Inspect listing descriptions and dimensions to align buyer expectations.`,
      metric: `${refundRate.toFixed(1)}% Refunds`,
      provenance: "SELLERSALT_SCORE",
    });
  }

  return insights;
}
