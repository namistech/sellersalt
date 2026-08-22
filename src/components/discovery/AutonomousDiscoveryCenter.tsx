"use client";

import React, { useState } from "react";
import {
  Compass,
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  Layers,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  AlertCircle,
  Clock,
  ChevronRight,
  Bookmark,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type {
  AutonomousDiscoveryResult,
  AutonomousOpportunityItem,
  OpportunityRankingMode,
} from "@/marketplaces/core/autonomous-discovery-types";
import type { MarketplaceId } from "@/marketplaces/core/types";
import { OpportunityDetailDrawer } from "./OpportunityDetailDrawer";
import { ProductIdeaCard } from "./ProductIdeaCard";

const CATEGORY_OPTIONS = [
  "Home & Living",
  "Jewelry",
  "Clothing & Accessories",
  "Craft Supplies",
  "General",
];

const MARKETPLACE_OPTIONS: Array<{ id: MarketplaceId; label: string }> = [
  { id: "etsy", label: "Etsy" },
  { id: "amazon", label: "Amazon" },
  { id: "ebay", label: "eBay" },
  { id: "walmart", label: "Walmart" },
];

export function AutonomousDiscoveryCenter({
  initialResult,
}: {
  initialResult?: AutonomousDiscoveryResult;
}) {
  const [selectedCategory, setSelectedCategory] = useState("Home & Living");
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<MarketplaceId[]>([
    "etsy",
    "amazon",
    "ebay",
    "walmart",
  ]);
  const [depth, setDepth] = useState<"QUICK" | "STANDARD" | "DEEP">("STANDARD");
  const [rankingMode, setRankingMode] = useState<OpportunityRankingMode>("BEST_OPPORTUNITIES");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AutonomousDiscoveryResult | null>(initialResult || null);
  const [error, setError] = useState<string | null>(null);
  const [selectedOpp, setSelectedOpp] = useState<AutonomousOpportunityItem | null>(null);

  const toggleMarketplace = (mp: MarketplaceId) => {
    if (selectedMarketplaces.includes(mp)) {
      if (selectedMarketplaces.length > 1) {
        setSelectedMarketplaces(selectedMarketplaces.filter((m) => m !== mp));
      }
    } else {
      setSelectedMarketplaces([...selectedMarketplaces, mp]);
    }
  };

  const handleRunDiscovery = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/discovery/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: selectedCategory,
          marketplaces: selectedMarketplaces,
          depth,
          rankingMode,
          generateProductIdeas: true,
        }),
      });

      if (!res.ok) throw new Error("Failed to execute autonomous discovery");
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to execute discovery.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero / Scope Control Card */}
      <Card className="p-6 md:p-8 border rounded-2xl bg-card shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
              <Compass className="w-6 h-6 text-primary" />
              Autonomous Opportunity Discovery
            </h1>
            <p className="text-xs text-muted-foreground">
              Discover what to sell by mining live multi-marketplace signals, price gaps, and underserved attributes.
            </p>
          </div>

          <Button
            onClick={handleRunDiscovery}
            disabled={loading}
            size="default"
            variant="primary"
            className="text-xs shrink-0 shadow-md font-bold"
          >
            <Sparkles className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Discovering Opportunities..." : "Discover For Me"}
          </Button>
        </div>

        {/* Discovery Parameter Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t">
          {/* Target Category */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground block">Target Category Seed</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-9 rounded-lg border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Marketplaces */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground block">Marketplaces</label>
            <div className="flex flex-wrap gap-1.5">
              {MARKETPLACE_OPTIONS.map((mp) => {
                const active = selectedMarketplaces.includes(mp.id);
                return (
                  <button
                    key={mp.id}
                    onClick={() => toggleMarketplace(mp.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      active
                        ? "bg-primary text-white border-primary"
                        : "bg-muted/40 text-muted-foreground border-border hover:bg-muted/60"
                    }`}
                  >
                    {mp.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Depth & Ranking */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground block">Research Depth</label>
              <select
                value={depth}
                onChange={(e) => setDepth(e.target.value as any)}
                className="w-full h-9 rounded-lg border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="QUICK">Quick (1 seed)</option>
                <option value="STANDARD">Standard (2 seeds)</option>
                <option value="DEEP">Deep (4 seeds)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground block">Ranking Mode</label>
              <select
                value={rankingMode}
                onChange={(e) => setRankingMode(e.target.value as any)}
                className="w-full h-9 rounded-lg border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="BEST_OPPORTUNITIES">Best Overall</option>
                <option value="FASTEST_RISING">Fastest Rising</option>
                <option value="LOWEST_COMPETITION">Low Competition</option>
                <option value="BEST_DIFFERENTIATION">Differentiation</option>
                <option value="BEST_PRICE_GAP">Price Gaps</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <Card className="p-12 text-center border rounded-2xl bg-card space-y-3">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-sm font-bold text-foreground">Executing Autonomous Discovery Pipeline...</p>
          <p className="text-xs text-muted-foreground">
            Acquiring public marketplace samples across {selectedMarketplaces.join(", ")} within research budgets.
          </p>
        </Card>
      )}

      {/* Results Content */}
      {result && !loading && (
        <div className="space-y-8">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-card border text-center space-y-1">
              <span className="text-label-sm text-muted-foreground uppercase font-bold block">Opportunities</span>
              <span className="text-2xl font-black text-primary">
                {result.summary.totalOpportunitiesFound}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-card border text-center space-y-1">
              <span className="text-label-sm text-muted-foreground uppercase font-bold block">Observed Products</span>
              <span className="text-2xl font-black text-foreground">
                {result.summary.totalProductsObserved}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-card border text-center space-y-1">
              <span className="text-label-sm text-muted-foreground uppercase font-bold block">Unique Sellers</span>
              <span className="text-2xl font-black text-foreground">
                {result.summary.totalUniqueSellersObserved}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-card border text-center space-y-1">
              <span className="text-label-sm text-muted-foreground uppercase font-bold block">Avg Score</span>
              <span className="text-2xl font-black text-foreground">
                {result.summary.averageOpportunityScore}/100
              </span>
            </div>
          </div>

          {/* Product Ideas Section */}
          {result.productIdeas.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Evidence-Grounded Product Ideas</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.productIdeas.map((idea) => (
                  <ProductIdeaCard key={idea.id} idea={idea} />
                ))}
              </div>
            </div>
          )}

          {/* Ranked Opportunities Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                Ranked Opportunities ({result.opportunities.length})
              </h2>
              <Badge variant="neutral" className="text-xs">
                Ranking: {rankingMode.replace(/_/g, " ")}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.opportunities.map((opp) => (
                <Card
                  key={opp.id}
                  onClick={() => setSelectedOpp(opp)}
                  className="p-5 border rounded-2xl bg-card hover:border-primary/50 cursor-pointer transition-all space-y-3 shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="neutral" className="text-label-sm uppercase font-bold">
                        {opp.type.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-sm font-black text-primary">
                        {opp.score.compositeScore}/100
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-foreground line-clamp-2">{opp.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {opp.explanation.whyFound}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t text-meta text-muted-foreground">
                    <span className="capitalize font-medium">{opp.marketplace}</span>
                    <span className="text-primary font-bold flex items-center">
                      Deep Dive <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      <OpportunityDetailDrawer
        opportunity={selectedOpp}
        onClose={() => setSelectedOpp(null)}
      />
    </div>
  );
}
