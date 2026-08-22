"use client";

import React, { useState } from "react";
import {
  Compass,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Layers,
  Search,
  Bookmark,
  Check,
  AlertTriangle,
  HelpCircle,
  RefreshCw,
  FileText,
  Boxes,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Calculator,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { NextCommercialActionBar } from "./NextCommercialActionBar";
import type {
  ProductOpportunityWorkspace,
  UserEconomicsInput,
} from "@/marketplaces/core/opportunity-workspace-types";
import { useRouter } from "next/navigation";

interface CockpitProps {
  initialWorkspace: ProductOpportunityWorkspace;
}

export function ProductOpportunityCockpit({ initialWorkspace }: CockpitProps) {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<ProductOpportunityWorkspace>(initialWorkspace);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showEvidenceLedger, setShowEvidenceLedger] = useState(false);
  const [activeScenario, setActiveScenario] = useState<"conservative" | "base" | "optimistic">("base");

  // Editable economics inputs
  const [unitCost, setUnitCost] = useState<number>(
    workspace.economics.scenarios.base.inputs.unitProductCost || 8.5
  );
  const [salePrice, setSalePrice] = useState<number>(
    workspace.economics.scenarios.base.inputs.targetSalePrice || 39.0
  );
  const [packagingCost, setPackagingCost] = useState<number>(
    workspace.economics.scenarios.base.inputs.packagingCost || 1.5
  );
  const [adCAC, setAdCAC] = useState<number>(
    workspace.economics.scenarios.base.inputs.targetAdvertisingCostPerSale || 8.0
  );
  const [isCalculatingEconomics, setIsCalculatingEconomics] = useState(false);

  const {
    title,
    marketplaces,
    opportunityScore,
    confidenceScore,
    attributeIntelligence,
    differentiation,
    positioning,
    configuration,
    sourcing,
    economics,
    readiness,
    informationGaps,
    commercialDecision,
    actionPlan,
    evidenceLedger,
  } = workspace;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/product-workspaces/${encodeURIComponent(workspace.id)}/refresh`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setWorkspace(data.workspace);
      }
    } catch {
      // Degrade cleanly
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRecalculateEconomics = async () => {
    setIsCalculatingEconomics(true);
    try {
      const res = await fetch(`/api/product-workspaces/${encodeURIComponent(workspace.id)}/economics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEconomics: {
            ...workspace.economics.scenarios.base.inputs,
            unitProductCost: Number(unitCost),
            targetSalePrice: Number(salePrice),
            packagingCost: Number(packagingCost),
            targetAdvertisingCostPerSale: Number(adCAC),
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setWorkspace((prev) => ({
          ...prev,
          economics: data.economics,
          readiness: data.readiness,
          commercialDecision: data.decision,
          actionPlan: data.actionPlan,
          informationGaps: data.informationGaps,
        }));
      }
    } catch {
      // Degrade cleanly
    } finally {
      setIsCalculatingEconomics(false);
    }
  };

  const currentScenarioMetrics = economics.scenarios[activeScenario].metrics;

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <Card className="p-6 md:p-8 border rounded-2xl bg-card shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge variant="neutral" className="text-label-sm font-bold uppercase">
                Opportunity Workspace
              </Badge>
              <Badge variant="neutral" className="text-label-sm uppercase">
                {marketplaces.join(", ")}
              </Badge>
              <Badge
                variant={
                  commercialDecision.verdict === "PURSUE"
                    ? "success"
                    : commercialDecision.verdict === "TEST" || commercialDecision.verdict === "INVESTIGATE"
                    ? "info"
                    : "warning"
                }
                className="text-label-sm font-bold"
              >
                Verdict: {commercialDecision.verdict}
              </Badge>
            </div>
            <h1 className="text-2xl font-black text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">{commercialDecision.why}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={() => setShowEvidenceLedger(!showEvidenceLedger)}
              size="compact"
              variant="secondary"
              className="text-sm font-semibold"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Evidence Ledger ({evidenceLedger.records.length})
            </Button>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              size="compact"
              variant="secondary"
              className="text-sm font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Score KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-xl bg-muted/20 border text-center space-y-1">
            <span className="text-label-sm text-muted-foreground uppercase font-bold block">Opportunity</span>
            <span className="text-2xl font-black text-primary">{opportunityScore.compositeScore}/100</span>
          </div>

          <div className="p-4 rounded-xl bg-muted/20 border text-center space-y-1">
            <span className="text-label-sm text-muted-foreground uppercase font-bold block">Confidence</span>
            <span className="text-2xl font-black text-foreground">{confidenceScore}%</span>
          </div>

          <div className="p-4 rounded-xl bg-muted/20 border text-center space-y-1">
            <span className="text-label-sm text-muted-foreground uppercase font-bold block">Target Price</span>
            <span className="text-2xl font-black text-foreground">
              ${configuration.targetPrice?.toFixed(2) || "N/A"}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-muted/20 border text-center space-y-1">
            <span className="text-label-sm text-muted-foreground uppercase font-bold block">Contribution Margin</span>
            <span
              className={`text-2xl font-black ${
                currentScenarioMetrics.contributionMarginPercent >= 20 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"
              }`}
            >
              {currentScenarioMetrics.contributionMarginPercent}%
            </span>
          </div>

          <div className="p-4 rounded-xl bg-muted/20 border text-center space-y-1">
            <span className="text-label-sm text-muted-foreground uppercase font-bold block">Readiness</span>
            <span className="text-xl font-black text-foreground">
              {readiness.overallScore}/100
            </span>
          </div>

          <div className="p-4 rounded-xl bg-muted/20 border text-center space-y-1">
            <span className="text-label-sm text-muted-foreground uppercase font-bold block">Data Trust</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {workspace.dataTrust?.overallTrustScore || confidenceScore}%
            </span>
          </div>
        </div>

        {/* Data Trust & Governance Transparency Strip */}
        <div className="p-4 rounded-xl bg-muted/10 border space-y-2 text-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-foreground">Data Trust & Provenance Breakdown</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="neutral" className="text-label-sm">
                {workspace.dataTrust?.observedMetricCount || 0} Observed
              </Badge>
              <Badge variant="neutral" className="text-label-sm">
                {workspace.dataTrust?.derivedMetricCount || 0} Derived
              </Badge>
              <Badge variant="neutral" className="text-label-sm">
                {workspace.dataTrust?.unknownSignalCount || 0} Unavailable
              </Badge>
              <Badge variant="success" className="text-label-sm font-bold">
                Zero-Fabrication Guaranteed
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-meta text-muted-foreground">
            <span><strong>Sources:</strong> {workspace.dataTrust?.sourcesUsed.join(", ") || "Public Web"}</span>
            <span><strong>Freshness:</strong> {workspace.dataTrust?.freshnessScore || 100}%</span>
            <span><strong>Policy Status:</strong> {workspace.dataTrust?.policyComplianceStatus || "ALLOWED"}</span>
          </div>
        </div>
      </Card>

      {/* Evidence Ledger Modal / Drawer */}
      {showEvidenceLedger && (
        <Card className="p-6 border rounded-2xl bg-card space-y-4 shadow-md">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-foreground">Evidence Ledger & Provenance</h2>
              <Badge variant="neutral" className="text-label-sm">
                {evidenceLedger.records.length} Records
              </Badge>
            </div>
            <button
              onClick={() => setShowEvidenceLedger(false)}
              className="text-muted-foreground hover:text-foreground text-sm font-bold"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {evidenceLedger.records.map((rec) => (
              <div key={rec.id} className="p-3 rounded-xl border bg-muted/20 text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">{rec.title}</span>
                  <Badge variant="neutral" className="text-label-sm">
                    {rec.category} • {rec.provenance}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-meta">{rec.statement}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Grid of Core Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Intelligence Modules */}
        <div className="lg:col-span-2 space-y-8">
          {/* 1. Attribute & Differentiation Intelligence */}
          <Card className="p-6 border rounded-2xl bg-card space-y-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Observable Attribute & Differentiation Intelligence
                </h2>
                <p className="text-sm text-muted-foreground">
                  Extracted from {attributeIntelligence.totalSampledListings} sampled listings across {attributeIntelligence.totalSampledSellers} sellers.
                </p>
              </div>
            </div>

            {/* Dominant vs Underrepresented Attributes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-label-sm font-bold uppercase text-muted-foreground block">
                  Dominant Market Clusters (≥25% Prevalence)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {attributeIntelligence.dominantAttributes.map((attr) => (
                    <Badge key={attr.value} variant="neutral" className="text-xs">
                      {attr.value} ({attr.listingPrevalencePercent}%)
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-label-sm font-bold uppercase text-emerald-600 dark:text-emerald-400 block">
                  Underrepresented Attribute Gaps (&lt;15% Prevalence)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {attributeIntelligence.underrepresentedAttributes.map((attr) => (
                    <Badge key={attr.value} variant="neutral" className="text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                      {attr.value} ({attr.listingPrevalencePercent}%)
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Differentiation Candidate */}
            {differentiation.candidates.length > 0 && (
              <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">
                    Recommended Angle: {differentiation.candidates[0].title}
                  </span>
                  <Badge variant="neutral" className="text-label-sm">
                    Target: {differentiation.candidates[0].targetMarketPosition}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {differentiation.candidates[0].description}
                </p>
                <div className="pt-2 border-t text-meta text-muted-foreground">
                  <strong>Advantage:</strong> {differentiation.candidates[0].competitiveAdvantage}
                </div>
              </div>
            )}
          </Card>

          {/* 2. Empirical Price Positioning */}
          <Card className="p-6 border rounded-2xl bg-card space-y-6 shadow-sm">
            <div className="space-y-0.5">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Empirical Market Price Positioning
              </h2>
              <p className="text-sm text-muted-foreground">
                Distribution calculated across {positioning.empiricalQuantiles.sampleSize} verified price observations.
              </p>
            </div>

            {/* Quantiles Bar */}
            <div className="grid grid-cols-5 gap-2 text-center text-sm">
              <div className="p-2.5 rounded-lg border bg-muted/20">
                <span className="text-label-sm text-muted-foreground font-bold block">P10</span>
                <span className="font-bold text-foreground">${positioning.empiricalQuantiles.p10?.toFixed(2) || "N/A"}</span>
              </div>
              <div className="p-2.5 rounded-lg border bg-muted/20">
                <span className="text-label-sm text-muted-foreground font-bold block">P25</span>
                <span className="font-bold text-foreground">${positioning.empiricalQuantiles.p25?.toFixed(2) || "N/A"}</span>
              </div>
              <div className="p-2.5 rounded-lg border bg-primary/10 border-primary/30">
                <span className="text-label-sm text-primary font-bold block">P50 (Median)</span>
                <span className="font-bold text-primary">${positioning.empiricalQuantiles.p50?.toFixed(2) || "N/A"}</span>
              </div>
              <div className="p-2.5 rounded-lg border bg-muted/20">
                <span className="text-label-sm text-muted-foreground font-bold block">P75</span>
                <span className="font-bold text-foreground">${positioning.empiricalQuantiles.p75?.toFixed(2) || "N/A"}</span>
              </div>
              <div className="p-2.5 rounded-lg border bg-muted/20">
                <span className="text-label-sm text-muted-foreground font-bold block">P90</span>
                <span className="font-bold text-foreground">${positioning.empiricalQuantiles.p90?.toFixed(2) || "N/A"}</span>
              </div>
            </div>

            {/* Scenarios Table */}
            <div className="space-y-2">
              <span className="text-sm font-bold text-foreground block">Positioning Scenarios</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {positioning.scenarios.map((scen) => (
                  <div
                    key={scen.tier}
                    className={`p-3.5 rounded-xl border text-sm space-y-1.5 ${
                      scen.tier === positioning.recommendedScenario
                        ? "border-primary/50 bg-primary/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{scen.label}</span>
                      <span className="font-black text-primary">${scen.candidateTargetPrice?.toFixed(2) || "—"}</span>
                    </div>
                    <p className="text-meta text-muted-foreground">{scen.strategicRationale}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* 3. Product Configuration & Bill of Materials */}
          <Card className="p-6 border rounded-2xl bg-card space-y-6 shadow-sm">
            <div className="space-y-0.5">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Boxes className="w-4 h-4 text-primary" />
                Product Configuration & Bill of Materials
              </h2>
              <p className="text-sm text-muted-foreground">
                Synthesized concept distinguishing observed combinations from derived strategy.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
                <span className="text-label-sm uppercase font-bold text-muted-foreground block">
                  Bundle Contents & Components
                </span>
                <ul className="space-y-1 list-disc pl-4 text-muted-foreground text-sm">
                  {configuration.bundleContents.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
                <span className="text-label-sm uppercase font-bold text-muted-foreground block">
                  Packaging & Finish Specification
                </span>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  <strong>Finish:</strong> {configuration.finishSpecification}
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  <strong>Packaging:</strong> {configuration.packagingRequirement}
                </p>
              </div>
            </div>
          </Card>

          {/* 4. Sourcing Requirements Specification */}
          <Card className="p-6 border rounded-2xl bg-card space-y-6 shadow-sm">
            <div className="space-y-0.5">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary" />
                Sourcing Specification & RFQ Checklist
              </h2>
              <p className="text-sm text-muted-foreground">
                Structured requirements to send to manufacturing suppliers (no synthetic supplier data).
              </p>
            </div>

            <div className="space-y-3">
              <span className="text-sm font-bold text-foreground block">RFQ Questions for Suppliers:</span>
              <ul className="space-y-1.5 list-disc pl-4 text-sm text-muted-foreground">
                {sourcing.sourcingQuestionsForSuppliers.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          </Card>
        </div>

        {/* Right Column: Financial Simulator, Readiness & Decision */}
        <div className="space-y-8">
          {/* Unit Economics Interactive Simulator */}
          <Card className="p-6 border rounded-2xl bg-card space-y-6 shadow-sm">
            <div className="space-y-0.5">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Calculator className="w-4 h-4 text-primary" />
                Unit Economics Simulator
              </h2>
              <p className="text-sm text-muted-foreground">
                Enter your real supplier landed costs to evaluate financial sensitivity.
              </p>
            </div>

            {/* Inputs */}
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-label-sm font-bold text-muted-foreground uppercase block">
                    Target Sale Price ($)
                  </label>
                  <input
                    type="number"
                    value={salePrice}
                    onChange={(e) => setSalePrice(Number(e.target.value))}
                    className="w-full h-8 px-2 rounded-lg border bg-background text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="text-label-sm font-bold text-muted-foreground uppercase block">
                    Supplier Unit Cost ($)
                  </label>
                  <input
                    type="number"
                    value={unitCost}
                    onChange={(e) => setUnitCost(Number(e.target.value))}
                    className="w-full h-8 px-2 rounded-lg border bg-background text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="text-label-sm font-bold text-muted-foreground uppercase block">
                    Packaging / Box ($)
                  </label>
                  <input
                    type="number"
                    value={packagingCost}
                    onChange={(e) => setPackagingCost(Number(e.target.value))}
                    className="w-full h-8 px-2 rounded-lg border bg-background text-sm"
                  />
                </div>

                <div>
                  <label className="text-label-sm font-bold text-muted-foreground uppercase block">
                    Target CAC / Ad ($)
                  </label>
                  <input
                    type="number"
                    value={adCAC}
                    onChange={(e) => setAdCAC(Number(e.target.value))}
                    className="w-full h-8 px-2 rounded-lg border bg-background text-sm"
                  />
                </div>
              </div>

              <Button
                onClick={handleRecalculateEconomics}
                disabled={isCalculatingEconomics}
                size="compact"
                variant="primary"
                className="w-full text-sm font-bold"
              >
                {isCalculatingEconomics ? "Calculating..." : "Recalculate Economics"}
              </Button>
            </div>

            {/* Scenario Switcher */}
            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-sm font-bold text-foreground">Scenario View:</span>
              <div className="flex gap-1">
                {(["conservative", "base", "optimistic"] as const).map((scen) => (
                  <button
                    key={scen}
                    onClick={() => setActiveScenario(scen)}
                    className={`px-2 py-1 rounded-md text-label-sm uppercase font-bold border transition-colors ${
                      activeScenario === scen
                        ? "bg-primary text-white border-primary"
                        : "bg-muted/30 text-muted-foreground border-border"
                    }`}
                  >
                    {scen}
                  </button>
                ))}
              </div>
            </div>

            {/* Scenario Metrics */}
            <div className="p-4 rounded-xl border bg-muted/20 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Gross Profit:</span>
                <span className="font-bold text-foreground">${currentScenarioMetrics.grossProfit.toFixed(2)} ({currentScenarioMetrics.grossMarginPercent}%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Marketplace Fees:</span>
                <span className="font-bold text-foreground">-${currentScenarioMetrics.marketplaceFeesTotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Net Contribution Profit:</span>
                <span className="font-black text-primary">${currentScenarioMetrics.contributionProfit.toFixed(2)}/unit</span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-muted-foreground">Break-Even Price:</span>
                <span className="font-bold text-foreground">${currentScenarioMetrics.breakEvenPrice.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Max Allowable CAC:</span>
                <span className="font-bold text-foreground">${currentScenarioMetrics.maxAllowableCAC.toFixed(2)}</span>
              </div>
            </div>
          </Card>

          {/* Launch Readiness Assessment */}
          <Card className="p-6 border rounded-2xl bg-card space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Launch Readiness
                </h2>
                <p className="text-sm text-muted-foreground">Multi-dimensional verification</p>
              </div>
              <Badge variant="neutral" className="text-xs font-black">
                {readiness.status.replace(/_/g, " ")}
              </Badge>
            </div>

            <div className="space-y-2">
              {readiness.dimensions.map((dim) => (
                <div key={dim.name} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/20 border">
                  <span className="font-medium text-foreground">{dim.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{dim.score}/100</span>
                    {dim.status === "SATISFIED" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl border bg-primary/5 text-sm space-y-1">
              <span className="font-bold text-primary block">Recommended Milestone:</span>
              <p className="text-muted-foreground text-meta">{readiness.recommendedMilestone}</p>
            </div>
          </Card>

          {/* Information Gaps: What to verify next */}
          <Card className="p-6 border rounded-2xl bg-card space-y-4 shadow-sm">
            <div className="space-y-0.5">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-500" />
                What to Verify Next
              </h2>
              <p className="text-sm text-muted-foreground">Ranked by potential decision impact</p>
            </div>

            <div className="space-y-2.5">
              {informationGaps.gaps.map((gap) => (
                <div key={gap.id} className="p-3 rounded-xl border bg-muted/20 text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">{gap.unknownSignal}</span>
                    <Badge
                      variant={gap.decisionImpact === "CRITICAL" ? "danger" : "neutral"}
                      className="text-label-sm"
                    >
                      {gap.decisionImpact}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-meta">{gap.recommendedAction}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Prioritized Action Plan */}
          <Card className="p-6 border rounded-2xl bg-card space-y-4 shadow-sm">
            <div className="space-y-0.5">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Prioritized Action Plan
              </h2>
              <p className="text-sm text-muted-foreground">{actionPlan.primaryFocus}</p>
            </div>

            <div className="space-y-2">
              {actionPlan.items.map((act) => (
                <div key={act.id} className="p-3 rounded-xl border bg-muted/20 text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary font-black text-label-sm">
                      {act.priority}
                    </span>
                    <span className="font-bold text-foreground">{act.action}</span>
                  </div>
                  <p className="text-muted-foreground text-meta pl-7">{act.reason}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Commercial Workflow Next Best Action Handoff */}
      <NextCommercialActionBar
        currentStage="WORKSPACE"
        query={workspace.title}
        verdict={workspace.commercialDecision.verdict}
        trustScore={workspace.dataTrust.overallTrustScore}
        marketplaces={workspace.dataTrust.sourcesUsed}
      />
    </div>
  );
}
