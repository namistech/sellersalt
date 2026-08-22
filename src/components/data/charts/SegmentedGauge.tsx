"use client";

import React from "react";
import { cn } from "@/components/ui/cn";

export interface SegmentedGaugeBand {
  min: number;
  max: number;
  label: string;
  colorClass: string;
  activeColorClass: string;
}

export interface SegmentedGaugeProps {
  score: number;
  scoreMax?: number;
  bands?: SegmentedGaugeBand[];
  label?: string;
  sublabel?: string;
  className?: string;
}

const DEFAULT_BANDS: SegmentedGaugeBand[] = [
  { min: 0, max: 44, label: "High Barrier", colorClass: "bg-red-950/20 border-red-900/30", activeColorClass: "bg-red-500 text-white" },
  { min: 45, max: 74, label: "Moderate", colorClass: "bg-amber-950/20 border-amber-900/30", activeColorClass: "bg-[#FFB020] text-black" },
  { min: 75, max: 100, label: "Prime Opportunity", colorClass: "bg-emerald-950/20 border-emerald-900/30", activeColorClass: "bg-[#16C784] text-white" },
];

export function SegmentedGauge({
  score,
  scoreMax = 100,
  bands = DEFAULT_BANDS,
  label,
  sublabel,
  className,
}: SegmentedGaugeProps) {
  const percentage = Math.min(100, Math.max(0, (score / scoreMax) * 100));

  const currentBand = bands.find((b) => score >= b.min && score <= b.max) || bands[bands.length - 1];

  return (
    <div className={cn("space-y-3 p-4 rounded-xl bg-surface border border-line shadow-2xs", className)}>
      <div className="flex items-center justify-between">
        <div>
          {label && <div className="text-label-sm font-bold text-ink uppercase tracking-wide">{label}</div>}
          {sublabel && <div className="text-meta text-ink-tertiary">{sublabel}</div>}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-2xl font-bold text-ink tracking-tight tabular-nums">{score}</span>
          <span className="text-sm font-semibold text-ink-tertiary">/{scoreMax}</span>
        </div>
      </div>

      {/* Segmented Bar Track */}
      <div className="space-y-1.5">
        <div className="grid grid-flow-col auto-cols-fr gap-1 h-3 rounded-full overflow-hidden p-0.5 bg-surface-muted border border-line-subtle">
          {bands.map((band, idx) => {
            const isActive = score >= band.min && score <= band.max;
            return (
              <div
                key={idx}
                className={cn(
                  "h-full rounded-sm transition-all duration-300",
                  isActive ? band.activeColorClass : band.colorClass
                )}
                title={`${band.label} (${band.min}-${band.max})`}
              />
            );
          })}
        </div>

        {/* Band Range Labels */}
        <div className="flex justify-between text-meta font-semibold text-ink-tertiary font-mono px-0.5">
          {bands.map((band, idx) => (
            <span
              key={idx}
              className={cn(
                score >= band.min && score <= band.max ? "text-ink font-bold" : "text-ink-tertiary"
              )}
            >
              {band.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
