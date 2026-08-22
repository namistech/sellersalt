"use client";

import React from "react";
import { cn } from "@/components/ui/cn";

export interface ProgressSegment {
  label: string;
  value: number; // raw value or percentage
  color: string;
}

export interface ProgressMeterProps {
  segments: ProgressSegment[];
  total?: number;
  label?: string;
  sublabel?: string;
  height?: number;
  showLegend?: boolean;
  className?: string;
}

export function ProgressMeter({
  segments,
  total,
  label,
  sublabel,
  height = 8,
  showLegend = true,
  className,
}: ProgressMeterProps) {
  const sum = total ?? segments.reduce((acc, s) => acc + s.value, 0);

  return (
    <div className={cn("space-y-2", className)}>
      {(label || sublabel) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="font-bold text-ink text-label-sm uppercase tracking-wide">{label}</span>}
          {sublabel && <span className="text-meta text-ink-tertiary">{sublabel}</span>}
        </div>
      )}

      {/* Multi-segment bar */}
      <div
        className="w-full rounded-full bg-surface-muted overflow-hidden flex gap-0.5"
        style={{ height }}
      >
        {segments.map((seg, idx) => {
          const pct = sum > 0 ? (seg.value / sum) * 100 : 0;
          if (pct <= 0) return null;
          return (
            <div
              key={idx}
              className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-300"
              style={{ width: `${pct}%`, backgroundColor: seg.color }}
              title={`${seg.label}: ${seg.value} (${pct.toFixed(1)}%)`}
            />
          );
        })}
      </div>

      {showLegend && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-sm">
          {segments.map((seg, idx) => {
            const pct = sum > 0 ? (seg.value / sum) * 100 : 0;
            return (
              <div key={idx} className="flex items-center gap-1.5 text-label-sm">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                <span className="text-ink-secondary">{seg.label}:</span>
                <span className="font-bold text-ink tabular-nums">{pct.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
