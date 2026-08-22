"use client";

import React from "react";
import { cn } from "@/components/ui/cn";

export interface RankingVisualizerProps {
  /** Percentile from 0 to 100 (where 95 = Top 5% of marketplace) */
  percentile: number;
  label?: string;
  categoryName?: string;
  rankLabel?: string;
  className?: string;
}

export function RankingVisualizer({
  percentile,
  label = "Market Standing",
  categoryName,
  rankLabel,
  className,
}: RankingVisualizerProps) {
  const safePercentile = Math.max(0, Math.min(100, percentile));
  
  // Calculate tier text and tone
  const derivedRank =
    rankLabel ||
    (safePercentile >= 90
      ? "Top 10% Leader"
      : safePercentile >= 75
      ? "Top 25% High Performer"
      : safePercentile >= 50
      ? "Above Category Median"
      : "Lower 50% Baseline");

  const tierColor =
    safePercentile >= 75
      ? "text-[#0E8F5D]"
      : safePercentile >= 50
      ? "text-amber-700"
      : "text-ink-tertiary";

  return (
    <div className={cn("p-4 rounded-xl border border-line bg-surface space-y-2.5", className)}>
      <div className="flex items-center justify-between text-xs">
        <div>
          <span className="font-bold text-ink uppercase tracking-wide text-label-sm block">{label}</span>
          {categoryName && <span className="text-meta text-ink-tertiary">vs {categoryName}</span>}
        </div>
        <span className={cn("font-bold text-sm", tierColor)}>{derivedRank}</span>
      </div>

      {/* Visual meter bar */}
      <div className="relative pt-3 pb-1">
        <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden flex">
          <div className="h-full w-1/2 bg-line-strong/30" />
          <div className="h-full w-1/4 bg-amber-500/30" />
          <div className="h-full w-1/4 bg-[#16C784]/40" />
        </div>

        {/* Position Marker */}
        <div
          className="absolute top-0 -ml-2 flex flex-col items-center transition-all duration-300"
          style={{ left: `${safePercentile}%` }}
        >
          <span className="h-4 w-4 rounded-full bg-[#0E8F5D] border-2 border-white shadow-xs" />
          <span className="text-label-sm font-bold text-ink tabular-nums mt-0.5">{safePercentile}%</span>
        </div>
      </div>

      <div className="flex justify-between text-meta text-ink-tertiary pt-1">
        <span>0% (Entry)</span>
        <span>50% (Median)</span>
        <span>Top 10%</span>
      </div>
    </div>
  );
}
