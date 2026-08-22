"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  Percent,
  Receipt,
  Store,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Layers,
  Calculator,
  Settings,
  ArrowRight,
  Info,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  RotateCcw,
  BarChart3,
  Sliders,
} from "lucide-react";
import { Card, Button, Badge, Input, Heading, Text } from "@/components/ui";
import { DataProvenanceBadge } from "@/components/data/DataProvenanceBadge";
import { BarChart } from "@/components/data/charts";
import {
  fetchRevenueAnalytics,
  fetchListingYieldAnalytics,
  calculateProfitSimulation,
  fetchCostAssumptions,
  updateCostAssumptions,
} from "@/services/revenue-client";
import { AnalyticsRevenueChart } from "./analytics-charts";
import type {
  ProfitWaterfall,
  ListingYieldMetric,
  FinancialInsight,
  ProfitCalculatorResult,
  FinancialCostAssumption,
} from "@/types/revenue";

export function AnalyticsClient() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<"overview" | "waterfall" | "yield" | "insights" | "calculator" | "assumptions">("overview");

  // Filters State
  const [period, setPeriod] = useState<string>("30d");
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [selectedCurrency, setSelectedCurrency] = useState<string>("USD");

  // Data States
  const [loading, setLoading] = useState(true);
  const [hasConnectedChannels, setHasConnectedChannels] = useState(false);
  const [channels, setChannels] = useState<any[]>([]);
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>(["USD"]);
  const [waterfall, setWaterfall] = useState<ProfitWaterfall | null>(null);
  const [timeSeries, setTimeSeries] = useState<any[]>([]);
  const [insights, setInsights] = useState<FinancialInsight[]>([]);
  const [listings, setListings] = useState<ListingYieldMetric[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);

  // Profit Calculator State
  const [calcSalePrice, setCalcSalePrice] = useState<string>("28.00");
  const [calcShippingCharged, setCalcShippingCharged] = useState<string>("0.00");
  const [calcUnitCogs, setCalcUnitCogs] = useState<string>("6.50");
  const [calcShippingIncurred, setCalcShippingIncurred] = useState<string>("0.00");
  const [calcPackaging, setCalcPackaging] = useState<string>("0.50");
  const [calcOffsiteAds, setCalcOffsiteAds] = useState<boolean>(false);
  const [calcQuantity, setCalcQuantity] = useState<string>("1");
  const [calcResult, setCalcResult] = useState<ProfitCalculatorResult | null>(null);

  // Cost Assumptions State
  const [assumptions, setAssumptions] = useState<FinancialCostAssumption | null>(null);
  const [savingAssumptions, setSavingAssumptions] = useState(false);
  const [assumptionMsg, setAssumptionMsg] = useState<string | null>(null);

  // Load Main Analytics Data
  async function loadAnalytics() {
    setLoading(true);
    try {
      const res = await fetchRevenueAnalytics({
        period,
        channelId: selectedChannelId || undefined,
        currency: selectedCurrency,
      });

      setHasConnectedChannels(res.hasConnectedChannels);
      setChannels(res.channels || []);
      setAvailableCurrencies(res.availableCurrencies || ["USD"]);
      if (res.activeCurrency) setSelectedCurrency(res.activeCurrency);
      setWaterfall(res.waterfall);
      setTimeSeries(res.timeSeries || []);
      setInsights(res.insights || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Load Listing Yield Data
  async function loadListings() {
    setLoadingListings(true);
    try {
      const res = await fetchListingYieldAnalytics({
        period,
        channelId: selectedChannelId || undefined,
        currency: selectedCurrency,
      });
      setListings(res.listings || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingListings(false);
    }
  }

  // Load Cost Assumptions
  async function loadAssumptions() {
    try {
      const res = await fetchCostAssumptions();
      setAssumptions(res.assumptions);
    } catch (err) {
      console.error(err);
    }
  }

  // Run Calculator Simulation
  async function runSimulation() {
    try {
      const res = await calculateProfitSimulation({
        salePrice: parseFloat(calcSalePrice) || 0,
        shippingCharged: parseFloat(calcShippingCharged) || 0,
        unitCogs: parseFloat(calcUnitCogs) || 0,
        shippingCostIncurred: parseFloat(calcShippingIncurred) || 0,
        packagingCost: parseFloat(calcPackaging) || 0,
        offsiteAds: calcOffsiteAds,
        quantity: parseInt(calcQuantity) || 1,
      });
      setCalcResult(res.result);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadAnalytics();
    loadAssumptions();
    runSimulation();
  }, [period, selectedChannelId, selectedCurrency]);

  useEffect(() => {
    if (activeTab === "yield") {
      loadListings();
    }
  }, [activeTab, period, selectedChannelId, selectedCurrency]);

  async function handleSaveAssumptions(e: React.FormEvent) {
    e.preventDefault();
    if (!assumptions) return;
    setSavingAssumptions(true);
    setAssumptionMsg(null);
    try {
      const res = await updateCostAssumptions(assumptions);
      setAssumptions(res.assumptions);
      setAssumptionMsg("Cost assumptions updated and applied across all store profit calculations.");
      loadAnalytics();
    } catch (err: any) {
      setAssumptionMsg("Failed to save assumptions: " + err.message);
    } finally {
      setSavingAssumptions(false);
    }
  }

  // Unconnected State
  if (!loading && !hasConnectedChannels) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <Heading as="h1" size="h2">
            Revenue & Profit Intelligence
          </Heading>
          <Text size="body-md" color="secondary" className="mt-1">
            Real order receipts, four-tier financial integrity, platform fee breakdowns, and true net profit.
          </Text>
        </div>

        <Card padding="lg" className="border-line bg-surface shadow-xs text-center py-12 space-y-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0E8F5D]/10 text-[#0E8F5D] mx-auto">
            <DollarSign className="h-7 w-7" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-ink">
              Connect your Etsy shop to unlock institutional profit intelligence
            </h3>
            <p className="text-xs leading-relaxed text-ink-secondary">
              Track the exact financial path from top-line gross receipts down to true take-home earnings with Etsy transaction fees, COGS deductions, and listing yield metrics.
            </p>
          </div>

          <div className="pt-2">
            <Link href="/settings/channels">
              <Button variant="primary" className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-sm">
                <Store className="h-4 w-4 mr-1.5" /> Connect Etsy Shop
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto pt-6 text-left text-xs border-t border-line-subtle text-ink-secondary">
            <div className="space-y-1">
              <span className="font-semibold text-ink flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-[#0E8F5D]" /> 4-Tier Integrity
              </span>
              <p className="text-meta">Strictly separates actual Etsy receipts from modeled heuristics.</p>
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-ink flex items-center gap-1">
                <Percent className="h-3.5 w-3.5 text-[#FFB020]" /> True Net Profit
              </span>
              <p className="text-meta">Deducts listing, transaction, payment, and offsite ads fees.</p>
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-ink flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-[#0E8F5D]" /> Listing Yield
              </span>
              <p className="text-meta">Identifies top revenue drivers and profit contributors.</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Heading as="h1" size="h2" className="flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-[#0E8F5D]" />
            <span>Revenue & Profit Intelligence</span>
          </Heading>
          <Text size="body-md" color="secondary" className="mt-1">
            Institutional-grade profit analytics, Etsy fee reconciliation, and listing yield intelligence.
          </Text>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/settings/channels">
            <Button variant="secondary" size="compact" className="text-xs">
              <Store className="h-3.5 w-3.5 mr-1" /> Store Connections
            </Button>
          </Link>
        </div>
      </div>

      {/* Global Filter Bar */}
      <Card padding="sm" className="border-line bg-white shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Period Selector */}
          <div className="flex items-center rounded-lg border border-line p-0.5 bg-[#FAFAF8]">
            {["7d", "30d", "90d", "12m", "all"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all uppercase ${
                  period === p ? "bg-white text-ink shadow-xs" : "text-ink-tertiary hover:text-ink"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Store Selector */}
          {channels.length > 1 && (
            <select
              value={selectedChannelId}
              onChange={(e) => setSelectedChannelId(e.target.value)}
              className="h-8 px-2 rounded-lg border border-line bg-white text-xs text-ink focus:outline-hidden font-medium"
            >
              <option value="">All Connected Stores</option>
              {channels.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label || c.storeUrl}
                </option>
              ))}
            </select>
          )}

          {/* Currency Selector (Preserves currency boundaries) */}
          {availableCurrencies.length > 1 && (
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="h-8 px-2 rounded-lg border border-line bg-white text-xs font-mono font-bold text-ink focus:outline-hidden"
            >
              {availableCurrencies.map((cur) => (
                <option key={cur} value={cur}>
                  {cur}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
          <DataProvenanceBadge type="ESTIMATED" />
        </div>
      </Card>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 border-b border-line pb-px text-xs font-semibold">
        {[
          { id: "overview", label: "Executive Overview", icon: BarChart3 },
          { id: "waterfall", label: "P&L Waterfall", icon: Layers },
          { id: "yield", label: "Listing Yield Matrix", icon: Receipt },
          { id: "insights", label: "Financial Insights", icon: Sparkles },
          { id: "calculator", label: "Profit Simulator", icon: Calculator },
          { id: "assumptions", label: "Cost Assumptions", icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-all ${
                activeTab === tab.id
                  ? "border-[#0E8F5D] text-[#0E8F5D]"
                  : "border-transparent text-ink-secondary hover:text-ink"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <Card padding="lg" className="border-line bg-white shadow-xs">
          <div className="text-center py-16 space-y-3">
            <DollarSign className="h-6 w-6 text-[#0E8F5D] animate-spin mx-auto" />
            <div className="text-sm font-semibold text-ink">Analyzing Shop Financials & Calculating True Margin...</div>
            <p className="text-meta text-ink-tertiary">Computing accurate fee drag and COGS deductions.</p>
          </div>
        </Card>
      ) : !waterfall ? (
        <Card padding="lg" className="border-line bg-white shadow-xs">
          <div className="text-center py-16 space-y-2">
            <div className="text-sm font-bold text-ink">No Sales Transactions Recorded in this Period</div>
            <p className="text-meta text-ink-tertiary">Select a broader date range or verify that your Etsy store has active completed orders.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* LEVEL 1: NET PROFIT RETENTION & FEE DRAG (PRIMARY DECISION SURFACE) */}
          <Card variant="feature" padding="lg" className="space-y-4 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-label-sm font-bold text-ink-tertiary uppercase tracking-wider">
                Cashflow & Margin Intelligence
              </span>
              <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-5 rounded-2xl bg-[#FAFAF8] border border-line">
              <div className="space-y-2 min-w-0 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="text-label-sm font-bold uppercase tracking-wider text-ink-tertiary">
                    Financial Verdict:
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-label-sm font-bold ${
                    waterfall.contributionMargin >= 50
                      ? "bg-[#E7FAF1] text-[#0E8F5D] border border-[#16C784]/30"
                      : waterfall.contributionMargin >= 25
                      ? "bg-[#FFF8E6] text-[#B37800] border border-[#FFB020]/30"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}>
                    {waterfall.contributionMargin}% Net Margin Retention
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-extrabold text-ink tracking-tight">
                  Where is your store&apos;s money actually going?
                </h2>

                <p className="text-sm text-ink-secondary leading-relaxed pt-1">
                  From <strong className="text-ink font-mono">{waterfall.currency} {waterfall.grossSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> in gross customer receipts, your store keeps <strong className="text-[#0E8F5D] font-mono">{waterfall.currency} {waterfall.trueNetProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> in true net earnings ({waterfall.contributionMargin}% take-home). Etsy fees consumed <strong className="text-ink font-mono">{waterfall.currency} {waterfall.totalEtsyFees.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> ({waterfall.feeRatio}% fee drag) and direct costs consumed <strong className="text-ink font-mono">{waterfall.currency} {waterfall.totalSellerCosts.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>.
                </p>
              </div>

              <div className="shrink-0 flex flex-col items-center sm:items-end justify-center p-4 rounded-xl bg-white border border-line shadow-2xs space-y-1">
                <span className="text-label-sm font-bold uppercase tracking-wider text-ink-tertiary">
                  True Net Take-Home
                </span>
                <div className="text-3xl font-extrabold text-[#0E8F5D] font-mono">
                  {waterfall.currency} {waterfall.trueNetProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-meta text-ink-tertiary">
                  Across {waterfall.orderCount} orders ({waterfall.totalUnitsSold} units)
                </div>
              </div>
            </div>
          </Card>

          {/* LEVEL 2: TOP 4 KPI STAT CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Gross Revenue */}
            <Card padding="md" className="border-line bg-white shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-label-sm font-bold text-ink-tertiary uppercase tracking-wider">Gross Sales</span>
                <span className="text-label-sm font-mono text-[#0E8F5D] bg-[#E7FAF1] px-1.5 py-0.5 rounded font-bold">
                  [ACTUAL]
                </span>
              </div>
              <div className="text-2xl font-black text-ink">
                {waterfall.currency} {waterfall.grossSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-meta text-ink-secondary">
                Across <strong>{waterfall.orderCount}</strong> completed orders ({waterfall.totalUnitsSold} units)
              </div>
            </Card>

            {/* 2. Platform Fees */}
            <Card padding="md" className="border-line bg-white shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-label-sm font-bold text-ink-tertiary uppercase tracking-wider">Etsy Platform Fees</span>
                <span className="text-label-sm font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-bold">
                  [CALCULATED]
                </span>
              </div>
              <div className="text-2xl font-black text-ink">
                {waterfall.currency} {waterfall.totalEtsyFees.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-meta text-ink-secondary">
                Fee Drag: <strong className="font-mono text-ink">{waterfall.feeRatio}%</strong> of gross sales
              </div>
            </Card>

            {/* 3. True Net Profit */}
            <Card padding="md" className="border-line bg-white shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-label-sm font-bold text-ink-tertiary uppercase tracking-wider">True Net Profit</span>
                <span className="text-label-sm font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-bold">
                  [CALCULATED]
                </span>
              </div>
              <div className="text-2xl font-black text-[#0E8F5D]">
                {waterfall.currency} {waterfall.trueNetProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-meta text-ink-secondary">
                Contribution Margin: <strong className="font-mono text-[#0E8F5D]">{waterfall.contributionMargin}%</strong>
              </div>
            </Card>

            {/* 4. Average Order Value */}
            <Card padding="md" className="border-line bg-white shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-label-sm font-bold text-ink-tertiary uppercase tracking-wider">Average Order Value</span>
                <span className="text-label-sm font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-bold">
                  [CALCULATED]
                </span>
              </div>
              <div className="text-2xl font-black text-ink">
                {waterfall.currency} {waterfall.averageOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-meta text-ink-secondary">
                {waterfall.refunds > 0 ? `Refunds: ${waterfall.currency} ${waterfall.refunds.toFixed(2)}` : "Zero refund friction"}
              </div>
            </Card>
          </div>

          {/* Revenue Velocity Chart */}
          <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-ink">Order Volume & Sales Velocity</h3>
                <p className="text-xs text-ink-tertiary">Daily transactions across verified Etsy order receipts ({period.toUpperCase()}).</p>
              </div>
              <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
            </div>

            {channels.length > 0 && (
              <AnalyticsRevenueChart
                series={channels.map((c) => ({
                  label: c.label || "Etsy Store",
                  currency: waterfall.currency,
                  points: timeSeries.map((t) => ({ date: t.date, count: t.orders })),
                }))}
              />
            )}
          </Card>
        </div>
      )}

      {/* Tab 2: Profit & Loss Waterfall */}
      {activeTab === "waterfall" && waterfall && (
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div>
              <h3 className="text-sm font-bold text-ink">Institutional Profit & Loss Waterfall</h3>
              <p className="text-xs text-ink-tertiary">Complete step-down reconciliation from Gross Sales down to True Net Profit.</p>
            </div>
            <span className="text-xs font-mono font-bold text-ink bg-[#FAFAF8] px-2.5 py-1 rounded-lg border border-line">
              Currency: {waterfall.currency}
            </span>
          </div>

          {/* P&L Component Breakdown Visualizer */}
          <div className="p-4 rounded-xl border border-line bg-[#FAFAF8] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-ink uppercase tracking-wide">
                  P&L Component Breakdown ({waterfall.currency})
                </span>
                <p className="text-meta text-ink-tertiary">Visual comparison of gross receipts, platform fees, operational costs, and retained earnings.</p>
              </div>
              <DataProvenanceBadge type="ESTIMATED" />
            </div>
            <BarChart
              data={[
                { component: "Gross Sales", amount: Number(waterfall.grossSales.toFixed(2)) },
                { component: "Etsy Fees", amount: Number(waterfall.totalEtsyFees.toFixed(2)) },
                { component: "Seller Costs", amount: Number(waterfall.totalSellerCosts.toFixed(2)) },
                { component: "True Net Profit", amount: Number(waterfall.trueNetProfit.toFixed(2)) },
              ]}
              xKey="component"
              layout="vertical"
              yAxisWidth={120}
              series={[{ key: "amount", label: `Amount (${waterfall.currency})`, colorIndex: 0 }]}
              valueFormatter={(v) => `${waterfall.currency} ${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              height={160}
              accessibleSummary={`P&L component breakdown showing gross sales of ${waterfall.currency} ${waterfall.grossSales.toFixed(2)} and net profit of ${waterfall.currency} ${waterfall.trueNetProfit.toFixed(2)}.`}
            />
          </div>

          <div className="space-y-3 text-sm">
            {/* Step 1: Gross Sales */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAFAF8] border border-line">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-ink text-white flex items-center justify-center font-mono font-bold text-label-sm">1</span>
                <div>
                  <strong className="text-ink">GROSS ORDER REVENUE</strong>
                  <div className="text-meta text-ink-tertiary">Sum of all completed receipt totals received from Etsy shoppers</div>
                </div>
              </div>
              <div className="text-right">
                <strong className="text-sm font-mono text-ink">+{waterfall.currency} {waterfall.grossSales.toFixed(2)}</strong>
                <div className="text-label-sm font-mono text-[#0E8F5D]">[ACTUAL ETSY DATA]</div>
              </div>
            </div>

            {/* Step 2: Refunds */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-red-50/40 border border-red-200 text-red-900">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center font-mono font-bold text-label-sm">2</span>
                <div>
                  <strong>(-) Refunds & Order Cancellations</strong>
                  <div className="text-meta text-red-700">Verified buyer refunds and return adjustments</div>
                </div>
              </div>
              <div className="text-right">
                <strong className="text-sm font-mono text-red-700">-{waterfall.currency} {waterfall.refunds.toFixed(2)}</strong>
                <div className="text-label-sm font-mono text-red-600">[ACTUAL ETSY DATA]</div>
              </div>
            </div>

            {/* Subtotal: Net Sales */}
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#E7FAF1] border border-[#9BE7C4] text-[#0E8F5D]">
              <strong className="text-sm uppercase">= NET ORDER SALES</strong>
              <strong className="text-sm font-mono">+{waterfall.currency} {waterfall.netSales.toFixed(2)}</strong>
            </div>

            {/* Step 3: Platform Fees Breakdown */}
            <div className="p-4 rounded-xl bg-blue-50/40 border border-blue-200 space-y-2.5">
              <div className="flex items-center justify-between text-blue-900 font-bold">
                <span>(-) Etsy Platform Fees Total</span>
                <span className="font-mono text-sm">-{waterfall.currency} {waterfall.totalEtsyFees.toFixed(2)}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-blue-200/60 text-meta text-blue-800">
                <div>• Listing Fees: <strong>${waterfall.fees.listingFees.toFixed(2)}</strong></div>
                <div>• Transaction (6.5%): <strong>${waterfall.fees.transactionFees.toFixed(2)}</strong></div>
                <div>• Payment Proc (3%+$0.25): <strong>${waterfall.fees.processingFees.toFixed(2)}</strong></div>
                <div>• Offsite Ads: <strong>${waterfall.fees.offsiteAdsFees.toFixed(2)}</strong></div>
              </div>
            </div>

            {/* Subtotal: Net Etsy Proceeds */}
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-blue-100/60 border border-blue-300 text-blue-950">
              <strong className="text-sm uppercase">= NET ETSY PAYOUT / PROCEEDS</strong>
              <strong className="text-sm font-mono">+{waterfall.currency} {waterfall.netEtsyPayout.toFixed(2)}</strong>
            </div>

            {/* Step 4: Seller Costs (COGS & Shipping) */}
            <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-200 space-y-2 text-amber-900">
              <div className="flex items-center justify-between font-bold">
                <span>(-) Product COGS & Packaging / Shipping Expenses</span>
                <span className="font-mono text-sm">-{waterfall.currency} {waterfall.totalSellerCosts.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-meta text-amber-800 pt-1 border-t border-amber-200/60">
                <span>Estimated Unit COGS (Materials/Print): <strong>${waterfall.estimatedCogs.toFixed(2)}</strong> {waterfall.isCogsModelled && "(Modelled Heuristic)"}</span>
                <span>Packaging & Shipping Costs: <strong>${waterfall.shippingPackagingCosts.toFixed(2)}</strong></span>
              </div>
            </div>

            {/* Final Bottom Line: True Net Profit */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-[#0E8F5D] text-white shadow-sm">
              <div>
                <div className="text-sm font-bold tracking-wide">🏆 TRUE NET PROFIT (Operating Income)</div>
                <div className="text-sm opacity-90">Net take-home margin after all platform fees and production costs</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black font-mono">
                  {waterfall.currency} {waterfall.trueNetProfit.toFixed(2)}
                </div>
                <div className="text-sm font-mono font-semibold opacity-95">
                  {waterfall.contributionMargin}% Contribution Margin
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Tab 3: Listing Yield Matrix */}
      {activeTab === "yield" && (
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div>
              <h3 className="text-base font-bold text-ink">Listing Yield & Performance Matrix</h3>
              <p className="text-sm text-ink-tertiary">Catalog ranking by revenue volume, average realized price, and profit contribution.</p>
            </div>
            <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
          </div>

          {loadingListings ? (
            <div className="text-center py-12 text-sm text-ink-tertiary">Loading listing yield metrics...</div>
          ) : listings.length === 0 ? (
            <div className="text-center py-12 text-sm text-ink-tertiary">No listing transactions recorded in this period.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-ink">
                <thead>
                  <tr className="border-b border-line text-ink-tertiary uppercase tracking-wider text-label-sm">
                    <th className="py-2.5 pr-4 font-semibold">Listing / Product</th>
                    <th className="py-2.5 pr-4 font-semibold text-right">Units Sold</th>
                    <th className="py-2.5 pr-4 font-semibold text-right">Gross Sales</th>
                    <th className="py-2.5 pr-4 font-semibold text-right">Avg Price</th>
                    <th className="py-2.5 pr-4 font-semibold text-right">Est. Profit</th>
                    <th className="py-2.5 pr-4 font-semibold text-right">Margin</th>
                    <th className="py-2.5 pr-4 font-semibold text-right">Rev Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle">
                  {listings.map((item) => (
                    <tr key={item.listingId} className="hover:bg-[#FAFAF8]">
                      <td className="py-3 pr-4 font-medium text-ink max-w-[280px] truncate">
                        {item.title}
                      </td>
                      <td className="py-3 pr-4 text-right font-mono tabular-nums">{item.unitsSold}</td>
                      <td className="py-3 pr-4 text-right font-mono font-bold text-ink">
                        {item.currency} {item.grossRevenue.toFixed(2)}
                      </td>
                      <td className="py-3 pr-4 text-right font-mono text-ink-secondary">
                        ${item.avgSellingPrice.toFixed(2)}
                      </td>
                      <td className="py-3 pr-4 text-right font-mono font-bold text-[#0E8F5D]">
                        ${item.estimatedProfit.toFixed(2)}
                      </td>
                      <td className="py-3 pr-4 text-right font-mono">
                        <span className={`px-1.5 py-0.5 rounded text-label-sm font-bold ${
                          item.profitMargin >= 60 ? "bg-[#E7FAF1] text-[#0E8F5D]" : "bg-[#FFF8E6] text-[#B37800]"
                        }`}>
                          {item.profitMargin}%
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right font-mono text-ink-tertiary">
                        {item.revenueShare}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab 4: Financial Insights */}
      {activeTab === "insights" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink">Strategic Financial Insights</h3>
            <DataProvenanceBadge type="SELLERSALT_SCORE" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((ins) => (
              <Card key={ins.id} padding="md" className="border-line bg-white shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {ins.type === "WARNING" ? (
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    ) : ins.type === "EFFICIENCY" ? (
                      <CheckCircle2 className="h-4 w-4 text-[#0E8F5D]" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-purple-600" />
                    )}
                    <strong className="text-xs text-ink">{ins.title}</strong>
                  </div>
                  {ins.metric && (
                    <Badge variant={ins.type === "WARNING" ? "warning" : "success"}>
                      {ins.metric}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-ink-secondary leading-relaxed">{ins.message}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Profit Simulator */}
      {activeTab === "calculator" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Input Form (5 cols) */}
          <Card padding="md" className="lg:col-span-5 border-line bg-white shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wide flex items-center gap-1.5">
                <Calculator className="h-4 w-4 text-[#0E8F5D]" />
                <span>Unit Economics Inputs</span>
              </h3>
              <DataProvenanceBadge type="ESTIMATED" />
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-ink">Target Sale Price ($) *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={calcSalePrice}
                  onChange={(e) => {
                    setCalcSalePrice(e.target.value);
                    runSimulation();
                  }}
                  className="h-9 font-mono font-bold text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-ink">Shipping Charged ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={calcShippingCharged}
                    onChange={(e) => {
                      setCalcShippingCharged(e.target.value);
                      runSimulation();
                    }}
                    className="h-8 font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-ink">Unit COGS (Materials) ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={calcUnitCogs}
                    onChange={(e) => {
                      setCalcUnitCogs(e.target.value);
                      runSimulation();
                    }}
                    className="h-8 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-ink">Shipping Cost Incurred ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={calcShippingIncurred}
                    onChange={(e) => {
                      setCalcShippingIncurred(e.target.value);
                      runSimulation();
                    }}
                    className="h-8 font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-ink">Packaging Cost ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={calcPackaging}
                    onChange={(e) => {
                      setCalcPackaging(e.target.value);
                      runSimulation();
                    }}
                    className="h-8 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="offsiteAds"
                  checked={calcOffsiteAds}
                  onChange={(e) => {
                    setCalcOffsiteAds(e.target.checked);
                    runSimulation();
                  }}
                  className="rounded border-line text-[#0E8F5D] focus:ring-[#0E8F5D]"
                />
                <label htmlFor="offsiteAds" className="font-medium text-ink cursor-pointer">
                  Include 15% Etsy Offsite Ads Fee
                </label>
              </div>
            </div>
          </Card>

          {/* Right: Simulation Output (7 cols) */}
          {calcResult && (
            <Card padding="md" className="lg:col-span-7 border-line bg-white shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-line">
                <h3 className="text-xs font-bold text-ink uppercase tracking-wide">Simulation Results (Per Unit)</h3>
                <span className="font-mono text-xs font-bold text-[#0E8F5D] bg-[#E7FAF1] px-2 py-0.5 rounded">
                  {calcResult.profitMargin}% Margin
                </span>
              </div>

              {/* Big Profit Number */}
              <div className="p-4 rounded-xl bg-[#0E8F5D] text-white flex items-center justify-between">
                <div>
                  <div className="text-xs opacity-90 uppercase font-semibold">Net Profit Per Unit</div>
                  <div className="text-3xl font-black font-mono mt-0.5">${calcResult.netProfitPerUnit.toFixed(2)}</div>
                </div>
                <div className="text-right text-xs">
                  <div>Break-even Price: <strong className="font-mono">${calcResult.breakEvenPrice.toFixed(2)}</strong></div>
                  <div>ROI on Costs: <strong className="font-mono">{calcResult.roiPercentage.toFixed(1)}%</strong></div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Platform Fees */}
                <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-200 space-y-1.5 text-blue-950">
                  <div className="font-bold flex items-center justify-between">
                    <span>Etsy Fees ({calcResult.platformFeePercentage}%)</span>
                    <span className="font-mono">${calcResult.totalPlatformFeesPerUnit.toFixed(2)}</span>
                  </div>
                  <div className="space-y-1 text-meta text-blue-800 pt-1 border-t border-blue-200">
                    <div className="flex justify-between"><span>• Listing Fee:</span><strong className="font-mono">${calcResult.listingFeePerUnit.toFixed(2)}</strong></div>
                    <div className="flex justify-between"><span>• Transaction (6.5%):</span><strong className="font-mono">${calcResult.transactionFeePerUnit.toFixed(2)}</strong></div>
                    <div className="flex justify-between"><span>• Payment Proc:</span><strong className="font-mono">${calcResult.processingFeePerUnit.toFixed(2)}</strong></div>
                    {calcResult.offsiteAdsFeePerUnit > 0 && (
                      <div className="flex justify-between"><span>• Offsite Ads (15%):</span><strong className="font-mono">${calcResult.offsiteAdsFeePerUnit.toFixed(2)}</strong></div>
                    )}
                  </div>
                </div>

                {/* Product Costs */}
                <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-200 space-y-1.5 text-amber-950">
                  <div className="font-bold flex items-center justify-between">
                    <span>Production Costs ({calcResult.productCostPercentage}%)</span>
                    <span className="font-mono">${calcResult.totalProductCostsPerUnit.toFixed(2)}</span>
                  </div>
                  <div className="space-y-1 text-meta text-amber-800 pt-1 border-t border-amber-200">
                    <div className="flex justify-between"><span>• Unit COGS:</span><strong className="font-mono">${calcResult.unitCogs.toFixed(2)}</strong></div>
                    <div className="flex justify-between"><span>• Shipping Cost:</span><strong className="font-mono">${calcResult.shippingCostIncurred.toFixed(2)}</strong></div>
                    <div className="flex justify-between"><span>• Packaging Cost:</span><strong className="font-mono">${calcResult.packagingCost.toFixed(2)}</strong></div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Tab 6: Cost Assumptions Settings */}
      {activeTab === "assumptions" && assumptions && (
        <Card padding="lg" className="border-line bg-white shadow-xs max-w-xl space-y-4">
          <div className="pb-3 border-b border-line">
            <h3 className="text-sm font-bold text-ink">Organization Cost Assumptions</h3>
            <p className="text-xs text-ink-tertiary">Configure default cost parameters used when exact item COGS is not entered.</p>
          </div>

          {assumptionMsg && (
            <div className="p-3 rounded-lg bg-[#E7FAF1] border border-[#9BE7C4] text-[#0E8F5D] text-xs">
              {assumptionMsg}
            </div>
          )}

          <form onSubmit={handleSaveAssumptions} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-ink">Default COGS Percentage (% of Net Sales)</label>
              <Input
                type="number"
                step="0.5"
                value={assumptions.defaultCogsPercent}
                onChange={(e) => setAssumptions({ ...assumptions, defaultCogsPercent: parseFloat(e.target.value) || 0 })}
                className="h-9 text-xs font-mono"
              />
              <p className="text-meta text-ink-tertiary">Standard benchmark: 20-30% for physical goods, 5-10% for digital files.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-ink">Default Packaging Cost ($)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={assumptions.defaultPackagingCost}
                  onChange={(e) => setAssumptions({ ...assumptions, defaultPackagingCost: parseFloat(e.target.value) || 0 })}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-ink">Default Shipping Cost ($)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={assumptions.defaultShippingCost}
                  onChange={(e) => setAssumptions({ ...assumptions, defaultShippingCost: parseFloat(e.target.value) || 0 })}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="defaultOffsiteAds"
                checked={assumptions.offsiteAdsOptIn}
                onChange={(e) => setAssumptions({ ...assumptions, offsiteAdsOptIn: e.target.checked })}
                className="rounded border-line text-[#0E8F5D] focus:ring-[#0E8F5D]"
              />
              <label htmlFor="defaultOffsiteAds" className="font-medium text-ink cursor-pointer">
                Etsy Offsite Ads Enrolled (Apply 15% fee on store receipts)
              </label>
            </div>

            <div className="pt-3 border-t border-line flex justify-end">
              <Button
                type="submit"
                variant="primary"
                loading={savingAssumptions}
                className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-white font-semibold text-xs"
              >
                Save Cost Assumptions
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
