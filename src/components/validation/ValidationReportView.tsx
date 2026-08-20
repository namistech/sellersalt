"use client";

import React, { useState } from "react";
import {
  Sparkles,
  TrendingUp,
  Activity,
  AlertTriangle,
  HelpCircle,
  ShieldCheck,
  Calculator,
  ArrowRight,
  RefreshCw,
  Layers,
  ShoppingBag,
  DollarSign,
  Users,
  Target,
  Clock,
  Compass,
} from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type {
  ProductValidationReport,
  UserUnitEconomicsReport,
} from "@/marketplaces/core/validation/types";
import { NextCommercialActionBar } from "@/components/workspace/NextCommercialActionBar";

interface ValidationReportViewProps {
  report: ProductValidationReport;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function ValidationReportView({
  report,
  onRefresh,
  refreshing = false,
}: ValidationReportViewProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "demand" | "competition" | "economics" | "calculator" | "differentiation"
  >("overview");

  // Unit Economics Calculator local state
  const [sellingPrice, setSellingPrice] = useState<number>(
    report.economics.candidatePrice || report.economics.observedMedianPrice || 35
  );
  const [cogs, setCogs] = useState<number>(8);
  const [shipping, setShipping] = useState<number>(4);
  const [packaging, setPackaging] = useState<number>(1.5);
  const [marketplaceFeePct, setMarketplaceFeePct] = useState<number>(6.5);
  const [adSpendPct, setAdSpendPct] = useState<number>(10);
  const [calcResult, setCalcResult] = useState<UserUnitEconomicsReport | null>(
    report.userEconomics || null
  );
  const [calculating, setCalculating] = useState(false);

  const handleCalculateEconomics = async (e: React.FormEvent) => {
    e.preventDefault();
    setCalculating(true);
    try {
      const res = await fetch("/api/validation/unit-economics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellingPrice: Number(sellingPrice),
          cogs: Number(cogs),
          shippingCost: Number(shipping),
          packagingCost: Number(packaging),
          marketplaceFeePercent: Number(marketplaceFeePct),
          paymentProcessingFeePercent: 3.0,
          advertisingPercent: Number(adSpendPct),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCalcResult(data);
      }
    } catch {
      // Ignore error
    } finally {
      setCalculating(false);
    }
  };

  const verdictBadgeVariant: BadgeVariant = report.verdictVariant;

  return (
    <div className="space-y-6">
      {/* 1. Header Card with Verdict & Score */}
      <Card className="p-6 border rounded-2xl bg-card shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="neutral" className="capitalize text-xs font-semibold">
                {report.marketplace}
              </Badge>
              <Badge variant="neutral" className="text-xs">
                {report.depth} Depth
              </Badge>
              <span className="text-xs text-muted-foreground">
                Validated {new Date(report.validatedAt).toLocaleDateString()}
              </span>
            </div>
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-foreground">
              {report.productTitle}
            </h1>
            <p className="text-xs text-muted-foreground">
              Query: &quot;{report.query}&quot; • {report.sampleProducts.length} observed marketplace listings
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-3xl font-black text-foreground">
                  {report.scoreBreakdown.score !== null ? report.scoreBreakdown.score : "—"}
                </span>
                <span className="text-xs text-muted-foreground">/100</span>
              </div>
              <span className="text-xs text-muted-foreground block font-medium">
                {report.scoreBreakdown.confidence}% Confidence
              </span>
            </div>

            {onRefresh && (
              <Button
                variant="secondary"
                size="compact"
                onClick={onRefresh}
                disabled={refreshing}
                className="text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            )}
          </div>
        </div>

        {/* Verdict Banner */}
        <div className="p-4 rounded-xl bg-muted/30 border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-primary shrink-0" />
            <div>
              <span className="text-xs text-muted-foreground block font-semibold uppercase tracking-wider">
                Commercial Verdict
              </span>
              <span className="text-base font-bold text-foreground">
                {report.verdictLabel}
              </span>
            </div>
          </div>
          <Badge variant={verdictBadgeVariant} className="text-xs px-3 py-1 self-start sm:self-auto">
            {report.verdict}
          </Badge>
        </div>
      </Card>

      {/* 2. Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b pb-2 text-xs font-semibold">
        {[
          { id: "overview", label: "Executive Summary", icon: <Compass className="w-3.5 h-3.5" /> },
          { id: "demand", label: "Demand Signals", icon: <ShoppingBag className="w-3.5 h-3.5" /> },
          { id: "competition", label: "Competition Density", icon: <Users className="w-3.5 h-3.5" /> },
          { id: "economics", label: "Market Economics", icon: <DollarSign className="w-3.5 h-3.5" /> },
          { id: "calculator", label: "Unit Economics Calculator", icon: <Calculator className="w-3.5 h-3.5" /> },
          { id: "differentiation", label: "Differentiation Vectors", icon: <Target className="w-3.5 h-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. Tab Contents */}

      {/* Tab: Overview / Executive Summary */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Reasons to Pursue */}
          <Card className="p-5 border rounded-xl bg-card space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>Top Drivers to Pursue</span>
            </div>
            <ul className="space-y-2 list-disc pl-4 text-xs text-muted-foreground">
              {report.topReasonsToPursue.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </Card>

          {/* Strongest Risks */}
          <Card className="p-5 border rounded-xl bg-card space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Strongest Market Risks</span>
            </div>
            <ul className="space-y-2 list-disc pl-4 text-xs text-muted-foreground">
              {report.strongestRisks.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </Card>

          {/* Unobserved Signals */}
          <Card className="p-5 border rounded-xl bg-card space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground font-bold text-sm">
              <HelpCircle className="w-4 h-4" />
              <span>Unknown / Unobserved Signals</span>
            </div>
            <ul className="space-y-2 list-disc pl-4 text-xs text-muted-foreground/80">
              {report.unobservedSignals.map((u, i) => (
                <li key={i}>{u}</li>
              ))}
            </ul>
          </Card>

          {/* Next Recommended Action */}
          <Card className="lg:col-span-3 p-5 border rounded-xl bg-muted/20 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Recommended Commercial Next Step
              </span>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {report.recommendation}
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {report.recommendedNextActions.map((action, i) => (
                <Badge key={i} variant="neutral" className="text-xs py-1">
                  {action}
                </Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Tab: Demand Signals */}
      {activeTab === "demand" && (
        <Card className="p-6 border rounded-xl bg-card space-y-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-primary" />
              Demand Intelligence Breakdown
            </h2>
            <Badge variant="neutral" className="text-xs">
              Score: {report.demand.demandProxyScore}/100
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {report.demand.explanation}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div className="p-4 rounded-lg bg-muted/30 border space-y-1">
              <span className="text-[11px] text-muted-foreground block font-medium">Observed Listings</span>
              <span className="text-lg font-black text-foreground">{report.demand.observedListingsCount}</span>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 border space-y-1">
              <span className="text-[11px] text-muted-foreground block font-medium">Total Reviews Observed</span>
              <span className="text-lg font-black text-foreground">{report.demand.observedReviewSum ?? "—"}</span>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 border space-y-1">
              <span className="text-[11px] text-muted-foreground block font-medium">Total Favorites Observed</span>
              <span className="text-lg font-black text-foreground">{report.demand.observedFavoritesSum ?? "—"}</span>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 border space-y-1">
              <span className="text-[11px] text-muted-foreground block font-medium">Demand Tier</span>
              <span className="text-lg font-black text-primary">{report.demand.demandTier}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Tab: Competition Density */}
      {activeTab === "competition" && (
        <Card className="p-6 border rounded-xl bg-card space-y-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Observed Competition & Concentration
            </h2>
            <Badge variant="neutral" className="text-xs">
              Barrier: {report.competition.reviewBarrierRating}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {report.competition.explanation}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-lg bg-muted/30 border space-y-1">
              <span className="text-[11px] text-muted-foreground block font-medium">Observed Merchants</span>
              <span className="text-lg font-black text-foreground">{report.competition.observedSellerCount}</span>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 border space-y-1">
              <span className="text-[11px] text-muted-foreground block font-medium">Concentration Index (HHI)</span>
              <span className="text-lg font-black text-foreground">
                {report.competition.sellerConcentrationIndex !== null
                  ? `${report.competition.sellerConcentrationIndex}/100`
                  : "—"}
              </span>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 border space-y-1">
              <span className="text-[11px] text-muted-foreground block font-medium">Competition Barrier</span>
              <span className="text-lg font-black text-foreground">{report.competition.state}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Tab: Market Economics */}
      {activeTab === "economics" && (
        <Card className="p-6 border rounded-xl bg-card space-y-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Empirical Price Distribution
            </h2>
            {report.economics.candidatePricePosition && (
              <Badge variant="neutral" className="text-xs">
                Position: {report.economics.candidatePricePosition}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {report.economics.explanation}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
            <div className="p-3 rounded-lg bg-muted/30 border space-y-1 text-center">
              <span className="text-[10px] text-muted-foreground block font-medium">10th Percentile</span>
              <span className="text-sm font-bold text-foreground">
                {report.economics.percentile10 ? `$${report.economics.percentile10.toFixed(2)}` : "—"}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border space-y-1 text-center">
              <span className="text-[10px] text-muted-foreground block font-medium">25th Percentile</span>
              <span className="text-sm font-bold text-foreground">
                {report.economics.percentile25 ? `$${report.economics.percentile25.toFixed(2)}` : "—"}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 space-y-1 text-center">
              <span className="text-[10px] text-primary block font-bold">Median Price</span>
              <span className="text-base font-black text-primary">
                {report.economics.observedMedianPrice ? `$${report.economics.observedMedianPrice.toFixed(2)}` : "—"}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border space-y-1 text-center">
              <span className="text-[10px] text-muted-foreground block font-medium">75th Percentile</span>
              <span className="text-sm font-bold text-foreground">
                {report.economics.percentile75 ? `$${report.economics.percentile75.toFixed(2)}` : "—"}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border space-y-1 text-center">
              <span className="text-[10px] text-muted-foreground block font-medium">90th Percentile</span>
              <span className="text-sm font-bold text-foreground">
                {report.economics.percentile90 ? `$${report.economics.percentile90.toFixed(2)}` : "—"}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Tab: Unit Economics Calculator */}
      {activeTab === "calculator" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 border rounded-xl bg-card space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Calculator className="w-4 h-4 text-primary" />
                Unit Economics Cost Inputs
              </h2>
              <Badge variant="neutral" className="text-[10px]">
                USER_DERIVED
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter your actual manufacturing, packaging, and shipping estimates to calculate net margins.
            </p>

            <form onSubmit={handleCalculateEconomics} className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-muted-foreground block font-medium mb-1">Selling Price ($)</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(parseFloat(e.target.value))}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block font-medium mb-1">Product COGS ($)</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={cogs}
                    onChange={(e) => setCogs(parseFloat(e.target.value))}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block font-medium mb-1">Shipping Cost ($)</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={shipping}
                    onChange={(e) => setShipping(parseFloat(e.target.value))}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block font-medium mb-1">Packaging ($)</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={packaging}
                    onChange={(e) => setPackaging(parseFloat(e.target.value))}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block font-medium mb-1">Marketplace Fee %</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={marketplaceFeePct}
                    onChange={(e) => setMarketplaceFeePct(parseFloat(e.target.value))}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block font-medium mb-1">Target Ad Spend %</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={adSpendPct}
                    onChange={(e) => setAdSpendPct(parseFloat(e.target.value))}
                    className="text-xs"
                  />
                </div>
              </div>

              <Button type="submit" size="compact" disabled={calculating} className="w-full text-xs">
                {calculating ? "Calculating..." : "Compute Profitability"}
              </Button>
            </form>
          </Card>

          {/* Calculator Output */}
          <Card className="p-6 border rounded-xl bg-card space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">
                Margin & Break-Even Analysis
              </h2>
              {calcResult && (
                <Badge
                  variant={calcResult.marginPercent >= 30 ? "success" : calcResult.marginPercent > 15 ? "info" : "warning"}
                  className="text-xs"
                >
                  {calcResult.marginPercent}% Margin
                </Badge>
              )}
            </div>

            {calcResult ? (
              <div className="space-y-4 pt-2 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/30 border space-y-1">
                    <span className="text-[10px] text-muted-foreground block font-medium">Contribution Margin</span>
                    <span className="text-base font-black text-foreground">${calcResult.contributionMargin.toFixed(2)}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border space-y-1">
                    <span className="text-[10px] text-muted-foreground block font-medium">Break-Even Price</span>
                    <span className="text-base font-black text-foreground">${calcResult.breakEvenPrice.toFixed(2)}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border space-y-1">
                    <span className="text-[10px] text-muted-foreground block font-medium">Max Allowable CAC</span>
                    <span className="text-base font-black text-primary">${calcResult.maxAllowableCac.toFixed(2)}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border space-y-1">
                    <span className="text-[10px] text-muted-foreground block font-medium">Total Direct Cost</span>
                    <span className="text-base font-black text-foreground">${calcResult.totalDirectCosts.toFixed(2)}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-muted/20 border space-y-1">
                  <span className="font-semibold text-foreground text-[11px] block">Unit Economics Notes:</span>
                  <ul className="list-disc pl-4 text-muted-foreground text-[11px] space-y-0.5">
                    {calcResult.notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground text-xs">
                Click &quot;Compute Profitability&quot; to view user-derived margin breakdown.
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab: Differentiation Vectors */}
      {activeTab === "differentiation" && (
        <Card className="p-6 border rounded-xl bg-card space-y-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Observable Differentiation Vectors
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {report.differentiation.explanation}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 text-xs">
            <div className="space-y-2">
              <span className="font-bold text-foreground text-xs block">
                Common Saturated Attributes (Present in 40%+ listings):
              </span>
              <ul className="space-y-1.5 list-disc pl-4 text-muted-foreground">
                {report.differentiation.commonAttributes.map((attr, i) => (
                  <li key={i}>{attr}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs block">
                Underrepresented Attribute Gaps:
              </span>
              <ul className="space-y-1.5 list-disc pl-4 text-muted-foreground">
                {report.differentiation.underrepresentedAttributes.map((attr, i) => (
                  <li key={i}>{attr}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Commercial Workflow Handoff */}
      <NextCommercialActionBar
        currentStage="VALIDATION"
        query={report.query}
        verdict={report.verdict}
        trustScore={report.researchQuality.score}
        marketplaces={[report.marketplace]}
      />
    </div>
  );
}
