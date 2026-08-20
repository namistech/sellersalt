"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ShoppingBag,
  Users,
  Compass,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  Clock,
  ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { WhatChangedReport } from "@/services/intelligence/market-change-detection";

interface WhatChangedViewProps {
  initialKey?: string;
  marketplace?: string;
}

export function WhatChangedView({
  initialKey = "minimalist desk lamp",
  marketplace = "all",
}: WhatChangedViewProps) {
  const [key, setKey] = useState(initialKey);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<WhatChangedReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchChanges = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/intelligence/changes?key=${encodeURIComponent(key)}&marketplace=${marketplace}`);
      if (!res.ok) throw new Error("Failed to fetch market changes");
      const data = await res.json();
      setReport(data);
    } catch (err: any) {
      setError(err.message || "Failed to load what changed report.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChanges();
  }, [key, marketplace]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 border rounded-2xl bg-card shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              "What Changed?" Market Differential Intelligence
            </h2>
            <p className="text-xs text-muted-foreground">
              Deterministic longitudinal comparison between consecutive observation snapshots.
            </p>
          </div>

          <Button
            onClick={fetchChanges}
            disabled={loading}
            size="compact"
            variant="secondary"
            className="text-xs shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Comparison
          </Button>
        </div>

        {/* Status banner */}
        {report && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t text-xs">
            <Badge variant={report.hasPreviousComparison ? "success" : "neutral"} className="text-[11px]">
              {report.hasPreviousComparison ? "Longitudinal Delta Active" : "First Snapshot Baseline"}
            </Badge>
            {report.observationIntervalDays !== null && (
              <span className="text-muted-foreground">
                Interval: <strong className="text-foreground">{report.observationIntervalDays} days</strong>
              </span>
            )}
            <span className="text-muted-foreground">
              Observed At: {new Date(report.currentCapturedAt).toLocaleDateString()}
            </span>
          </div>
        )}
      </Card>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <Card className="p-12 text-center border rounded-2xl bg-card space-y-3">
          <RefreshCw className="w-6 h-6 text-primary animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground">Analyzing market snapshot differentials...</p>
        </Card>
      ) : report ? (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-card border text-center space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">New Listings</span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                +{report.summary.newProductsCount}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-card border text-center space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Price Movers</span>
              <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                {report.summary.priceMoversCount}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-card border text-center space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Median Price Delta</span>
              <span className="text-xl font-black text-foreground">
                {report.summary.medianPriceDelta !== null
                  ? `${report.summary.medianPriceDelta > 0 ? "+" : ""}$${report.summary.medianPriceDelta.toFixed(2)}`
                  : "—"}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-card border text-center space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Disappeared</span>
              <span className="text-xl font-black text-muted-foreground">
                {report.summary.disappearedProductsCount}
              </span>
            </div>
          </div>

          {/* Highlights */}
          <Card className="p-5 border rounded-xl bg-card space-y-3">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Ranked Market Highlights
            </h3>
            <ul className="space-y-1.5 list-disc pl-4 text-xs text-muted-foreground">
              {report.rankedSignificanceHighlights.map((h, idx) => (
                <li key={idx}>{h}</li>
              ))}
            </ul>
          </Card>

          {/* Product Changes Table */}
          {report.productChanges.length > 0 && (
            <Card className="p-6 border rounded-xl bg-card space-y-4">
              <h3 className="text-xs font-bold text-foreground">Observed Product Adjustments</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b text-muted-foreground font-semibold">
                      <th className="pb-2">Product Listing</th>
                      <th className="pb-2">Marketplace</th>
                      <th className="pb-2">Change Type</th>
                      <th className="pb-2">Price Delta</th>
                      <th className="pb-2">Review Gain</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {report.productChanges.map((p, idx) => (
                      <tr key={idx} className="hover:bg-muted/30">
                        <td className="py-2.5 font-bold text-foreground max-w-xs truncate">{p.title}</td>
                        <td className="py-2.5 capitalize">{p.marketplace}</td>
                        <td className="py-2.5">
                          <Badge
                            variant={
                              p.changeType === "NEW"
                                ? "success"
                                : p.changeType === "PRICE_DROP"
                                ? "info"
                                : p.changeType === "PRICE_INCREASE"
                                ? "warning"
                                : "neutral"
                            }
                            className="text-[10px]"
                          >
                            {p.changeType.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="py-2.5 font-medium">
                          {p.priceDeltaPercent !== null && p.priceDeltaPercent !== undefined
                            ? `${p.priceDeltaPercent > 0 ? "+" : ""}${p.priceDeltaPercent}%`
                            : "—"}
                        </td>
                        <td className="py-2.5 text-muted-foreground">
                          {p.reviewDelta !== null && p.reviewDelta !== undefined
                            ? `+${p.reviewDelta}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  );
}
