"use client";

import React from "react";
import { Globe, Database, Radio, Sparkles, Clock, AlertCircle, ArrowDownRight, ArrowUpRight, TrendingUp, CheckCircle } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import type { ResearchRunDiffSummary, ProductObservationDiff } from "@/marketplaces/core/acquisition/diff-engine";

export interface ResearchWorkbenchCardProps {
  runId?: string;
  marketplace: string;
  sourceType?: string;
  observedAt?: Date | string | null;
  confidenceScore?: number;
  freshnessStatus?: string;
  diffSummary?: ResearchRunDiffSummary | null;
  productDiff?: ProductObservationDiff | null;
  signalAvailability?: {
    demand?: boolean;
    economics?: boolean;
    competition?: boolean;
    freshness?: boolean;
    searchVolume?: boolean;
  };
  limitations?: string[];
  className?: string;
}

export function ResearchWorkbenchCard({
  runId,
  marketplace,
  sourceType = "PUBLIC_WEB",
  observedAt,
  confidenceScore = 75,
  freshnessStatus = "LIVE",
  diffSummary,
  productDiff,
  signalAvailability = { demand: true, economics: true, competition: true, freshness: true, searchVolume: false },
  limitations = [],
  className = "",
}: ResearchWorkbenchCardProps) {
  const getSourceIcon = (source: string) => {
    switch (source.toUpperCase()) {
      case "PUBLIC_WEB":
        return <Globe className="h-3.5 w-3.5 text-blue-500" />;
      case "MARKETPLACE_API":
        return <Radio className="h-3.5 w-3.5 text-emerald-500" />;
      case "HISTORICAL_OBSERVATION":
        return <Database className="h-3.5 w-3.5 text-amber-500" />;
      default:
        return <Sparkles className="h-3.5 w-3.5 text-indigo-500" />;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source.toUpperCase()) {
      case "PUBLIC_WEB":
        return "Live Public Web Observation";
      case "MARKETPLACE_API":
        return "Official Marketplace API";
      case "HISTORICAL_OBSERVATION":
        return "SellerSalt Historical Database";
      default:
        return "Multi-Source Observation";
    }
  };

  const getFreshnessBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "LIVE":
        return <Badge variant="success">LIVE DATA</Badge>;
      case "FRESH":
        return <Badge variant="neutral">FRESH (Recent)</Badge>;
      case "STALE":
        return <Badge variant="warning">STALE</Badge>;
      case "HISTORICAL":
        return <Badge variant="neutral">HISTORICAL</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <Card className={`p-4 border rounded-lg bg-card text-card-foreground shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 mb-3">
        <div className="flex items-center space-x-2">
          {getSourceIcon(sourceType)}
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {getSourceLabel(sourceType)}
          </span>
          <Badge variant="neutral" className="capitalize">
            {marketplace}
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          {getFreshnessBadge(freshnessStatus)}
          <Badge variant="info">
            {confidenceScore}% Confidence
          </Badge>
        </div>
      </div>

      {/* Observation Metadata & Signal Availability Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Signals Checklist */}
        <div className="space-y-1.5">
          <p className="font-medium text-muted-foreground mb-1">Signal Provenance:</p>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Price & Economics:</span>
            <span className="font-semibold text-foreground flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-emerald-500" /> Observed
            </span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Sales Velocity & Yield:</span>
            <span className="font-semibold text-foreground flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-blue-500" /> Derived
            </span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Competition Barrier:</span>
            <span className="font-semibold text-foreground flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-emerald-500" /> Observed
            </span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Buyer Search Volume:</span>
            <span className="font-semibold text-amber-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Listing Prevalence Only
            </span>
          </div>
        </div>

        {/* Longitudinal Shifts / Diffs */}
        <div className="space-y-1.5 border-t md:border-t-0 md:border-l md:pl-4 pt-2 md:pt-0">
          <p className="font-medium text-muted-foreground mb-1">Longitudinal Delta:</p>
          {productDiff?.hasChanged ? (
            <div className="space-y-1">
              {productDiff.price?.delta !== null && productDiff.price?.delta !== undefined && (
                <div className="flex items-center justify-between">
                  <span>Price Movement:</span>
                  <span className={`font-semibold flex items-center gap-0.5 ${productDiff.price.isPriceDrop ? "text-emerald-600" : "text-amber-600"}`}>
                    {productDiff.price.isPriceDrop ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                    ${productDiff.price.current?.toFixed(2)} ({productDiff.price.delta > 0 ? "+" : ""}{productDiff.price.delta.toFixed(2)})
                  </span>
                </div>
              )}
              {productDiff.reviews?.delta !== null && productDiff.reviews?.delta !== undefined && (
                <div className="flex items-center justify-between">
                  <span>Review Gain:</span>
                  <span className="font-semibold text-blue-600 flex items-center gap-0.5">
                    <TrendingUp className="h-3 w-3" />
                    +{productDiff.reviews.delta} ({productDiff.reviews.velocityPerMonth ?? 0}/mo)
                  </span>
                </div>
              )}
            </div>
          ) : diffSummary ? (
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Appeared Listings:</span>
                <span className="font-semibold text-emerald-600">+{diffSummary.appearingCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Disappeared:</span>
                <span className="font-semibold text-rose-600">-{diffSummary.disappearingCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Price Drops Observed:</span>
                <span className="font-semibold text-emerald-600">{diffSummary.priceDropsCount}</span>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground italic flex items-center gap-1.5 py-1">
              <Clock className="h-3 w-3" />
              <span>Single observation captured. Longitudinal trends unlock on repeated research.</span>
            </div>
          )}
        </div>
      </div>

      {/* Limitations / Transparency Notice */}
      <div className="mt-3 pt-2 border-t text-[11px] text-muted-foreground flex items-start gap-1.5">
        <AlertCircle className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
        <span>
          {limitations[0] || "SellerSalt research observations are acquired from public marketplace web signals with field-level provenance tracking. Missing values remain explicitly unavailable."}
        </span>
      </div>
    </Card>
  );
}
