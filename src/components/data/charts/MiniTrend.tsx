"use client";

import React from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Sparkline } from "./Sparkline";

export interface MiniTrendProps {
  data: number[];
  deltaPercent?: number;
  periodLabel?: string;
  tone?: "positive" | "negative" | "neutral" | "auto";
  height?: number;
  className?: string;
}

export function MiniTrend({
  data,
  deltaPercent,
  periodLabel = "vs prior",
  tone = "auto",
  height = 28,
  className,
}: MiniTrendProps) {
  const calculatedTone =
    tone === "auto"
      ? (deltaPercent ?? 0) > 0
        ? "positive"
        : (deltaPercent ?? 0) < 0
        ? "negative"
        : "neutral"
      : tone;

  const isPositive = calculatedTone === "positive";
  const isNegative = calculatedTone === "negative";

  return (
    <div className={cn("flex items-center justify-between gap-2.5", className)}>
      <div className="w-20 sm:w-24 shrink-0">
        <Sparkline data={data} height={height} tone={calculatedTone} />
      </div>

      {deltaPercent !== undefined && (
        <div className="flex items-center gap-1 text-[11px] font-bold tabular-nums">
          {isPositive ? (
            <span className="inline-flex items-center text-[#0E8F5D] bg-[#E7FAF1] px-1.5 py-0.5 rounded">
              <ArrowUpRight className="h-3 w-3 mr-0.5" />+{Math.abs(deltaPercent).toFixed(1)}%
            </span>
          ) : isNegative ? (
            <span className="inline-flex items-center text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
              <ArrowDownRight className="h-3 w-3 mr-0.5" />-{Math.abs(deltaPercent).toFixed(1)}%
            </span>
          ) : (
            <span className="inline-flex items-center text-ink-tertiary bg-surface-muted px-1.5 py-0.5 rounded">
              <Minus className="h-3 w-3 mr-0.5" />0.0%
            </span>
          )}
          {periodLabel && <span className="text-[10px] text-ink-tertiary font-normal">{periodLabel}</span>}
        </div>
      )}
    </div>
  );
}
