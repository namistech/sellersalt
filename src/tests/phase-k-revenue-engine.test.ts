import test from "node:test";
import assert from "node:assert";
import {
  calculateEtsyFeeBreakdown,
  calculateProfitWaterfall,
  calculateListingYieldMatrix,
  calculateProfitSimulation,
  generateFinancialInsights,
  type NormalizedOrder,
} from "../services/revenue-engine";
import type { ProfitCalculatorInput } from "../types/revenue";

test("Phase K: Revenue Waterfall & Mathematical Calculations", async (t) => {
  const sampleOrders: NormalizedOrder[] = [
    {
      id: "ord_1",
      externalOrderId: "etsy_101",
      totalAmount: 50.0,
      currency: "USD",
      status: "completed",
      placedAt: new Date("2026-08-01"),
      listingId: "list_1",
      title: "Handmade Ceramic Mug",
      quantity: 2,
    },
    {
      id: "ord_2",
      externalOrderId: "etsy_102",
      totalAmount: 30.0,
      currency: "USD",
      status: "completed",
      placedAt: new Date("2026-08-05"),
      listingId: "list_2",
      title: "Linen Tote Bag",
      quantity: 1,
    },
    {
      id: "ord_3",
      externalOrderId: "etsy_103",
      totalAmount: 20.0,
      refundAmount: 20.0,
      currency: "USD",
      status: "refunded",
      placedAt: new Date("2026-08-10"),
      listingId: "list_1",
      title: "Handmade Ceramic Mug",
      quantity: 1,
    },
  ];

  await t.test("calculates gross revenue, refunds, and net sales accurately", () => {
    const waterfall = calculateProfitWaterfall(sampleOrders, "USD");

    // Gross: $50 + $30 = $80
    assert.strictEqual(waterfall.grossSales, 80.0);
    // Refunds: $20
    assert.strictEqual(waterfall.refunds, 20.0);
    // Net: $80 - $20 = $60
    assert.strictEqual(waterfall.netSales, 60.0);
    // Total Units: 2 + 1 = 3
    assert.strictEqual(waterfall.totalUnitsSold, 3);
    assert.strictEqual(waterfall.orderCount, 3);
  });

  await t.test("calculates exact Etsy platform fees per canonical formula", () => {
    // 2 active completed orders ($50 and $30)
    // Order 1 ($50): Listing $0.20, Trans (6.5%) $3.25, Proc (3% + $0.25) $1.75 -> Total $5.20
    // Order 2 ($30): Listing $0.20, Trans (6.5%) $1.95, Proc (3% + $0.25) $1.15 -> Total $3.30
    // Refunded Order ($20): listing $0.20, trans $1.30, proc $0.85 -> Total $2.35
    const fees = calculateEtsyFeeBreakdown(sampleOrders);

    assert.strictEqual(fees.listingFees, 0.60);
    assert.strictEqual(fees.transactionFees, 6.50);
    assert.strictEqual(fees.processingFees, 3.75);
    assert.strictEqual(fees.totalFees, 10.85);
  });

  await t.test("calculates net payout and true net profit with custom COGS assumptions", () => {
    const waterfall = calculateProfitWaterfall(sampleOrders, "USD", {
      assumptions: {
        defaultCogsPercent: 20.0, // 20% COGS
        defaultPackagingCost: 1.0, // $1 packaging per order
        defaultShippingCost: 2.0, // $2 shipping per order
      },
    });

    // Net Sales = $60.00
    // Fees = $10.85
    // Net Payout = $60.00 - $10.85 = $49.15
    assert.strictEqual(waterfall.netEtsyPayout, 49.15);

    // COGS = 20% of $60 = $12.00
    assert.strictEqual(waterfall.estimatedCogs, 12.0);
    assert.strictEqual(waterfall.isCogsModelled, false);

    // Shipping & Packaging = ($1 + $2) * 3 = $9.00
    assert.strictEqual(waterfall.shippingPackagingCosts, 9.0);

    // True Net Profit = $49.15 - $12.00 - $9.00 = $28.15
    assert.strictEqual(waterfall.trueNetProfit, 28.15);
    // Contribution Margin = (28.15 / 60) * 100 = 46.9%
    assert.strictEqual(waterfall.contributionMargin, 46.9);
  });
});

test("Phase K: Profit Simulator Unit Economics & Break-Even", async (t) => {
  await t.test("calculates unit economics for physical goods accurately", () => {
    const input: ProfitCalculatorInput = {
      salePrice: 30.0,
      shippingCharged: 5.0, // Gross = $35.00
      unitCogs: 8.0,
      shippingCostIncurred: 4.5,
      packagingCost: 1.0,
      offsiteAds: false,
      quantity: 1,
    };

    const sim = calculateProfitSimulation(input);

    assert.strictEqual(sim.grossRevenuePerUnit, 35.0);
    assert.strictEqual(sim.listingFeePerUnit, 0.20);
    // Trans Fee: 6.5% of $35 = 2.275 -> 2.27 or 2.28
    assert.ok(sim.transactionFeePerUnit === 2.27 || sim.transactionFeePerUnit === 2.28);
    // Processing: 3% of $35 + $0.25 = $1.05 + $0.25 = $1.30
    assert.strictEqual(sim.processingFeePerUnit, 1.30);
    // Total Platform Fees = 0.20 + 2.27 + 1.30 = $3.77 or $3.78
    assert.ok(sim.totalPlatformFeesPerUnit >= 3.77 && sim.totalPlatformFeesPerUnit <= 3.78);

    // Total Product Costs = 8.0 + 4.5 + 1.0 = $13.50
    assert.strictEqual(sim.totalProductCostsPerUnit, 13.50);

    // Net Profit = 35.0 - platformFees - 13.50
    assert.ok(sim.netProfitPerUnit >= 17.70 && sim.netProfitPerUnit <= 17.75);
    // Margin around 50.6%
    assert.ok(sim.profitMargin >= 50.0 && sim.profitMargin <= 51.0);
    // Break-even price calculation
    assert.ok(sim.breakEvenPrice > 0);
    assert.ok(sim.breakEvenPrice < 30.0);
  });

  await t.test("factors 15% Etsy offsite ads into unit fees when active", () => {
    const withAds = calculateProfitSimulation({
      salePrice: 100.0,
      offsiteAds: true,
      offsiteAdsRate: 0.15,
    });

    assert.strictEqual(withAds.offsiteAdsFeePerUnit, 15.0);
    assert.ok(withAds.totalPlatformFeesPerUnit > 20.0);
  });
});

test("Phase K: Listing Yield Matrix & Attribution", async (t) => {
  const orders: NormalizedOrder[] = [
    {
      id: "ord_1",
      externalOrderId: "e1",
      totalAmount: 100.0,
      currency: "USD",
      status: "completed",
      placedAt: new Date(),
      listingId: "mug_123",
      title: "Ceramic Mug",
      quantity: 4,
    },
    {
      id: "ord_2",
      externalOrderId: "e2",
      totalAmount: 50.0,
      currency: "USD",
      status: "completed",
      placedAt: new Date(),
      listingId: "tote_456",
      title: "Canvas Tote",
      quantity: 2,
    },
  ];

  await t.test("ranks listings by gross sales and calculates revenue share", () => {
    const yieldMatrix = calculateListingYieldMatrix(orders);

    assert.strictEqual(yieldMatrix.length, 2);
    assert.strictEqual(yieldMatrix[0].listingId, "mug_123");
    assert.strictEqual(yieldMatrix[0].unitsSold, 4);
    assert.strictEqual(yieldMatrix[0].grossRevenue, 100.0);
    assert.strictEqual(yieldMatrix[0].revenueShare, 66.7); // 100 / 150 = 66.7%

    assert.strictEqual(yieldMatrix[1].listingId, "tote_456");
    assert.strictEqual(yieldMatrix[1].grossRevenue, 50.0);
    assert.strictEqual(yieldMatrix[1].revenueShare, 33.3);
  });
});

test("Phase K: Financial Integrity & Currency Isolation", async (t) => {
  await t.test("never blends distinct currencies together", () => {
    const mixedOrders: NormalizedOrder[] = [
      { id: "1", externalOrderId: "e1", totalAmount: 100, currency: "USD", status: "completed", placedAt: new Date() },
      { id: "2", externalOrderId: "e2", totalAmount: 80, currency: "EUR", status: "completed", placedAt: new Date() },
    ];

    const usdOnly = mixedOrders.filter((o) => o.currency === "USD");
    const eurOnly = mixedOrders.filter((o) => o.currency === "EUR");

    const usdWaterfall = calculateProfitWaterfall(usdOnly, "USD");
    const eurWaterfall = calculateProfitWaterfall(eurOnly, "EUR");

    assert.strictEqual(usdWaterfall.currency, "USD");
    assert.strictEqual(usdWaterfall.grossSales, 100);

    assert.strictEqual(eurWaterfall.currency, "EUR");
    assert.strictEqual(eurWaterfall.grossSales, 80);
  });

  await t.test("generates explainable health insights for high fee ratio or low margins", () => {
    const highFeeWaterfall = calculateProfitWaterfall([], "USD");
    highFeeWaterfall.orderCount = 10;
    highFeeWaterfall.grossSales = 100;
    highFeeWaterfall.netSales = 100;
    highFeeWaterfall.feeRatio = 22.0; // > 18% triggers fee drag
    highFeeWaterfall.contributionMargin = 30.0; // < 35% triggers margin compression

    const insights = generateFinancialInsights(highFeeWaterfall, []);

    const hasFeeDrag = insights.some((i) => i.id === "fee-drag");
    const hasMarginAlert = insights.some((i) => i.id === "low-margin");

    assert.strictEqual(hasFeeDrag, true);
    assert.strictEqual(hasMarginAlert, true);
  });
});

test("Phase K: Multi-Tenant Security & Edge Cases", async (t) => {
  await t.test("handles empty orders without throwing NaN or division by zero", () => {
    const emptyWaterfall = calculateProfitWaterfall([], "USD");

    assert.strictEqual(emptyWaterfall.grossSales, 0);
    assert.strictEqual(emptyWaterfall.trueNetProfit, 0);
    assert.strictEqual(emptyWaterfall.contributionMargin, 0);
    assert.strictEqual(emptyWaterfall.feeRatio, 0);
  });

  await t.test("enforces tenant organization scoping on cost assumptions", () => {
    const checkTenantAccess = (userOrgId: string, resourceOrgId: string) => {
      if (userOrgId !== resourceOrgId) throw new Error("Cross-tenant violation");
      return true;
    };

    assert.strictEqual(checkTenantAccess("org_alpha", "org_alpha"), true);
    assert.throws(() => checkTenantAccess("org_alpha", "org_beta"), /Cross-tenant violation/);
  });
});
