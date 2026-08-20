/**
 * SellerSalt User Unit Economics Calculator
 * 
 * Computes profitability, contribution margins, break-even prices, and allowable CAC
 * exclusively from explicit user-supplied cost parameters.
 * 
 * ZERO-FABRICATION RULE:
 * - Marked 100% as USER_DERIVED.
 * - Never claims marketplace-wide profitability without merchant cost inputs.
 */

import type {
  UserUnitEconomicsInputs,
  UserUnitEconomicsReport,
} from "@/marketplaces/core/validation/types";

export class UnitEconomicsCalculator {
  /**
   * Computes comprehensive unit economics from user inputs.
   */
  public static calculate(inputs: UserUnitEconomicsInputs): UserUnitEconomicsReport {
    const {
      sellingPrice,
      cogs,
      shippingCost = 0,
      packagingCost = 0,
      marketplaceFeePercent = 0,
      paymentProcessingFeePercent = 0,
      advertisingPercent = 0,
      returnAllowancePercent = 0,
      otherFixedCost = 0,
    } = inputs;

    if (sellingPrice <= 0) {
      throw new Error("Selling price must be greater than zero.");
    }

    const directCost = cogs + shippingCost + packagingCost + otherFixedCost;
    const mpFee = (sellingPrice * marketplaceFeePercent) / 100;
    const payFee = (sellingPrice * paymentProcessingFeePercent) / 100;
    const adCost = (sellingPrice * advertisingPercent) / 100;
    const returnCost = (sellingPrice * returnAllowancePercent) / 100;

    const totalVariableCosts = directCost + mpFee + payFee + adCost + returnCost;
    const grossProfit = sellingPrice - (directCost + mpFee + payFee);
    const contributionMargin = sellingPrice - totalVariableCosts;
    const marginPercent = Math.round((contributionMargin / sellingPrice) * 1000) / 10;

    // Break-even formula: direct costs / (1 - percentage fees)
    const combinedFeePercentage = (marketplaceFeePercent + paymentProcessingFeePercent + advertisingPercent + returnAllowancePercent) / 100;
    const breakEvenPrice =
      combinedFeePercentage < 1
        ? Math.round((directCost / (1 - combinedFeePercentage)) * 100) / 100
        : directCost * 2;

    const maxAllowableCac = Math.max(0, Math.round((sellingPrice - (directCost + mpFee + payFee + returnCost)) * 100) / 100);

    const notes: string[] = [];
    if (marginPercent >= 40) {
      notes.push("Strong margin buffer (>=40%) supports healthy paid customer acquisition.");
    } else if (marginPercent >= 20) {
      notes.push("Viable commercial margin (20-40%) with standard operational flexibility.");
    } else if (marginPercent > 0) {
      notes.push("Tight margin (<20%): sensitive to ad spend escalation or return spikes.");
    } else {
      notes.push("Negative contribution margin: cost structure exceeds expected selling price.");
    }

    return {
      sellingPrice,
      totalDirectCosts: directCost,
      marketplaceFees: Math.round(mpFee * 100) / 100,
      paymentFees: Math.round(payFee * 100) / 100,
      advertisingCost: Math.round(adCost * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      contributionMargin: Math.round(contributionMargin * 100) / 100,
      marginPercent,
      breakEvenPrice,
      maxAllowableCac,
      provenance: "USER_DERIVED",
      notes,
    };
  }
}
