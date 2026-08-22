"use client";

import React from "react";
import { cn } from "@/components/ui/cn";

export interface BulletGaugeProps {
  actual: number;
  target?: number;
  benchmark: number;
  max?: number;
  unit?: string;
  label: string;
  sublabel?: string;
  className?: string;
  status?: "above" | "below" | "neutral";
}

export function BulletGauge({
  actual,
  target,
  benchmark,
  max = Math.max(actual * 1.3, benchmark * 1.3, 10),
  unit = "",
  label,
  sublabel,
  className,
}: BulletGaugeProps) {
  const actualPercent = Math.min(100, Math.max(0, (actual / max) * 100));
  const benchmarkPercent = Math.min(100, Math.max(0, (benchmark / max) * 100));
  const targetPercent = target !== undefined ? Math.min(100, Math.max(0, (target / max) * 100)) : undefined;

  const isOutperforming = actual >= benchmark;

  return (
    <div className={cn("p-4 rounded-xl bg-surface border border-line space-y-3 shadow-2xs", className)}>
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-label-sm font-bold text-ink uppercase tracking-wide">{label}</div>
          {sublabel && <div className="text-meta text-ink-tertiary">{sublabel}</div>}
        </div>
        <div className="text-right">
          <span className="font-mono text-xl font-bold text-ink tabular-nums">
            {actual}
            <span className="text-sm text-ink-tertiary ml-0.5">{unit}</span>
          </span>
          <div className="text-label-sm font-semibold text-ink-tertiary">
            Benchmark: {benchmark}{unit}
          </div>
        </div>
      </div>

      {/* Bullet Gauge Track */}
      <div className="relative h-6 w-full rounded-md bg-surface-muted border border-line-subtle overflow-hidden flex items-center">
        {/* Background Qualitative Range (Benchmark Region) */}
        <div
          className="absolute left-0 top-0 bottom-0 bg-[#E7FAF1]/50 border-r border-[#16C784]/20"
          style={{ width: `${benchmarkPercent}%` }}
        />

        {/* Actual Performance Bar */}
        <div
          className={cn(
            "relative h-3.5 rounded-xs transition-all duration-300",
            isOutperforming ? "bg-[#0E8F5D]" : "bg-amber-600"
          )}
          style={{ width: `${actualPercent}%` }}
        />

        {/* Benchmark Marker Line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-[#141B16] z-10"
          style={{ left: `${benchmarkPercent}%` }}
          title={`Category Benchmark: ${benchmark}${unit}`}
        />

        {/* Optional Target Marker */}
        {targetPercent !== undefined && (
          <div
            className="absolute top-0 bottom-0 w-1 bg-[#3B82F6] z-10"
            style={{ left: `${targetPercent}%` }}
            title={`Target: ${target}${unit}`}
          />
        )}
      </div>

      <div className="flex items-center justify-between text-meta text-ink-tertiary font-medium">
        <span>0{unit}</span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#141B16]" /> Category Median ({benchmark}{unit})
        </span>
        <span>{Math.round(max)}{unit}</span>
      </div>
    </div>
  );
}
