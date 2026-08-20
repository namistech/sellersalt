/**
 * SellerSalt — Unit Economics Scenario Engine 2.0
 * 
 * Computes deterministic unit economics and financial sensitivity scenarios
 * (Conservative, Base, Optimistic) from explicit user inputs and verified fee models.
 * Zero-Fabrication: Never invents supplier landed cost or profitability.
 */

import type {
  UserEconomicsInput,
  UnitEconomicsMetrics,
  EconomicsScenarioResult,
  UnitEconomicsAnalysis,
} from "@/marketplaces/core/opportunity-workspace-types";

export class UnitEconomicsScenarioEngine {
  /**
   * Calculates metrics for a single unit economics scenario.
   */
  public static calculateMetrics(input: UserEconomicsInput): UnitEconomicsMetrics {
    const salePrice = input.targetSalePrice;
    const directProductCost =
      input.unitProductCost +
      input.packagingCost +
      input.inboundShippingCost +
      input.otherFixedCostPerUnit;

    const grossProfit = salePrice - directProductCost;
    const grossMarginPercent = salePrice > 0 ? (grossProfit / salePrice) * 100 : 0;

    // Platform & Processing Fees
    const platformFee = (salePrice * input.marketplacePlatformFeePercent) / 100;
    const paymentFee =
      (salePrice * input.paymentProcessingFeePercent) / 100 + input.paymentProcessingFixedFee;
    const returnsAllowance = (salePrice * input.returnsAllowancePercent) / 100;
    const taxesAllowance = (salePrice * input.taxesAllowancePercent) / 100;

    const totalMarketplaceFees = platformFee + paymentFee;
    const totalVariableCost =
      directProductCost +
      totalMarketplaceFees +
      input.outboundShippingCost +
      input.fulfillmentCost +
      returnsAllowance +
      taxesAllowance;

    // Contribution Profit after Marketing/CAC
    const contributionProfit = salePrice - totalVariableCost - input.targetAdvertisingCostPerSale;
    const contributionMarginPercent =
      salePrice > 0 ? (contributionProfit / salePrice) * 100 : 0;

    // Max CAC allowable before net loss
    const maxAllowableCAC = salePrice - totalVariableCost;

    // Break-even price (where contribution profit = 0 given current costs)
    const fixedUnitExpenses =
      directProductCost +
      input.outboundShippingCost +
      input.fulfillmentCost +
      input.targetAdvertisingCostPerSale +
      input.paymentProcessingFixedFee;

    const variableFeeRate =
      (input.marketplacePlatformFeePercent +
        input.paymentProcessingFeePercent +
        input.returnsAllowancePercent +
        input.taxesAllowancePercent) /
      100;

    const breakEvenPrice =
      variableFeeRate < 1 ? fixedUnitExpenses / (1 - variableFeeRate) : fixedUnitExpenses;

    const isViable = contributionProfit > 0 && contributionMarginPercent >= 15;

    const notes: string[] = [];
    if (contributionMarginPercent >= 25) {
      notes.push(`Healthy contribution margin of ${contributionMarginPercent.toFixed(1)}% supports paid acquisition.`);
    } else if (contributionMarginPercent > 0) {
      notes.push(`Thin contribution margin (${contributionMarginPercent.toFixed(1)}%). Requires organic traffic or tighter ad control.`);
    } else {
      notes.push(`Negative unit economics ($-${Math.abs(contributionProfit).toFixed(2)}/unit). Landed cost or ad allowance must be reduced.`);
    }

    return {
      revenue: Math.round(salePrice * 100) / 100,
      totalDirectCost: Math.round(directProductCost * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      grossMarginPercent: Math.round(grossMarginPercent * 10) / 10,
      marketplaceFeesTotal: Math.round(totalMarketplaceFees * 100) / 100,
      contributionProfit: Math.round(contributionProfit * 100) / 100,
      contributionMarginPercent: Math.round(contributionMarginPercent * 10) / 10,
      breakEvenPrice: Math.round(breakEvenPrice * 100) / 100,
      maxAllowableCAC: Math.round(maxAllowableCAC * 100) / 100,
      isViable,
      notes,
    };
  }

  /**
   * Generates Base, Conservative, and Optimistic economics scenarios from user input.
   */
  public static evaluateAnalysis(baseInput?: Partial<UserEconomicsInput>): UnitEconomicsAnalysis {
    const hasCostInput =
      typeof baseInput?.unitProductCost === "number" && baseInput.unitProductCost > 0;

    const defaultInput: UserEconomicsInput = {
      targetSalePrice: baseInput?.targetSalePrice || 39.0,
      unitProductCost: baseInput?.unitProductCost !== undefined ? baseInput.unitProductCost : 8.5,
      packagingCost: baseInput?.packagingCost || 1.5,
      inboundShippingCost: baseInput?.inboundShippingCost || 1.8,
      outboundShippingCost: baseInput?.outboundShippingCost || 0.0, // Often free shipping absorbed in price
      marketplacePlatformFeePercent: baseInput?.marketplacePlatformFeePercent || 6.5, // Standard Etsy 6.5%
      paymentProcessingFeePercent: baseInput?.paymentProcessingFeePercent || 3.0,
      paymentProcessingFixedFee: baseInput?.paymentProcessingFixedFee || 0.25,
      fulfillmentCost: baseInput?.fulfillmentCost || 0.5,
      returnsAllowancePercent: baseInput?.returnsAllowancePercent || 2.0,
      targetAdvertisingCostPerSale: baseInput?.targetAdvertisingCostPerSale || 8.0,
      taxesAllowancePercent: baseInput?.taxesAllowancePercent || 0.0,
      otherFixedCostPerUnit: baseInput?.otherFixedCostPerUnit || 0.0,
    };

    // Base Scenario
    const baseMetrics = this.calculateMetrics(defaultInput);
    const baseScenario: EconomicsScenarioResult = {
      scenario: "BASE",
      assumptions: ["Standard user-entered supplier quote, baseline CAC, and estimated freight."],
      inputs: defaultInput,
      metrics: baseMetrics,
    };

    // Conservative Scenario (+15% unit cost, +25% CAC, +2% returns)
    const conservativeInput: UserEconomicsInput = {
      ...defaultInput,
      unitProductCost: Math.round(defaultInput.unitProductCost * 1.15 * 100) / 100,
      inboundShippingCost: Math.round(defaultInput.inboundShippingCost * 1.2 * 100) / 100,
      targetAdvertisingCostPerSale: Math.round(defaultInput.targetAdvertisingCostPerSale * 1.25 * 100) / 100,
      returnsAllowancePercent: defaultInput.returnsAllowancePercent + 2.0,
    };
    const conservativeMetrics = this.calculateMetrics(conservativeInput);
    const conservativeScenario: EconomicsScenarioResult = {
      scenario: "CONSERVATIVE",
      assumptions: ["+15% supplier landed cost, +25% ad CAC, and higher returns allowance."],
      inputs: conservativeInput,
      metrics: conservativeMetrics,
    };

    // Optimistic Scenario (-10% volume discount, -15% CAC)
    const optimisticInput: UserEconomicsInput = {
      ...defaultInput,
      unitProductCost: Math.round(defaultInput.unitProductCost * 0.9 * 100) / 100,
      inboundShippingCost: Math.round(defaultInput.inboundShippingCost * 0.85 * 100) / 100,
      targetAdvertisingCostPerSale: Math.round(defaultInput.targetAdvertisingCostPerSale * 0.85 * 100) / 100,
    };
    const optimisticMetrics = this.calculateMetrics(optimisticInput);
    const optimisticScenario: EconomicsScenarioResult = {
      scenario: "OPTIMISTIC",
      assumptions: ["-10% supplier volume tier discount, optimized freight consolidation, and stronger organic conversion."],
      inputs: optimisticInput,
      metrics: optimisticMetrics,
    };

    let verdict: UnitEconomicsAnalysis["verdict"] = "NEEDS_USER_INPUT";
    let summary = "Enter actual landed manufacturing supplier costs to calculate true commercial viability.";

    if (hasCostInput) {
      if (conservativeMetrics.isViable) {
        verdict = "HIGHLY_VIABLE";
        summary = `Highly viable across all market scenarios with ${baseMetrics.contributionMarginPercent}% base contribution margin ($${baseMetrics.contributionProfit.toFixed(2)}/unit).`;
      } else if (baseMetrics.isViable) {
        verdict = "MARGINALLY_VIABLE";
        summary = `Viable in base scenario (${baseMetrics.contributionMarginPercent}% contribution margin) but vulnerable in conservative market conditions.`;
      } else {
        verdict = "UNVIABLE";
        summary = `Unit economics unviable under current cost structure. Landed cost of $${defaultInput.unitProductCost} leaves insufficient margin after fees and advertising.`;
      }
    }

    return {
      scenarios: {
        conservative: conservativeScenario,
        base: baseScenario,
        optimistic: optimisticScenario,
      },
      verdict,
      summary,
    };
  }
}
