"use client";

import React, { ReactNode } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { cn } from "./cn";
import { Button } from "./Button";
import { DataProvenanceBadge } from "@/components/data/DataProvenanceBadge";

export interface IntelligenceCardProps {
  /** Uppercase category/signal label (e.g. 'STRATEGIC COMPETITION VERDICT') */
  badgeText?: string;
  /** Optional icon for the top badge (defaults to Sparkles) */
  badgeIcon?: ReactNode;
  /** Main conclusion or decision question */
  title: string;
  /** Plain-English decision summary */
  description?: string;
  /** Main score (e.g. 88) or verdict rating string */
  score?: number | string;
  /** Total score scale (defaults to 100) */
  scoreMax?: number;
  /** Verdict level or category label */
  verdictLabel?: string;
  /** Verdict variant style ('success' | 'warning' | 'danger' | 'info') */
  verdictVariant?: "success" | "warning" | "danger" | "info" | "neutral";
  /** Provenance tag (e.g. 'SELLERSALT_SCORE' | 'ACTUAL_ETSY_DATA' | 'ESTIMATED') */
  provenance?: "ACTUAL_ETSY_DATA" | "ESTIMATED" | "SELLERSALT_SCORE" | "EXTERNAL_DATA";
  /** Right-hand side or bottom key metric factors / subpanel */
  sidePanel?: ReactNode;
  /** Bottom factors or supporting evidence elements */
  children?: ReactNode;
  /** Primary Action Button text */
  actionLabel?: string;
  /** Primary Action Button callback or link */
  onAction?: () => void;
  /** Secondary Action Button */
  secondaryAction?: ReactNode;
  /** Additional custom class names */
  className?: string;
}

export function IntelligenceCard({
  badgeText,
  badgeIcon,
  title,
  description,
  score,
  scoreMax = 100,
  verdictLabel,
  verdictVariant = "success",
  provenance = "SELLERSALT_SCORE",
  sidePanel,
  children,
  actionLabel,
  onAction,
  secondaryAction,
  className,
}: IntelligenceCardProps) {
  const getVerdictStyle = () => {
    switch (verdictVariant) {
      case "success":
        return "bg-[#0D281E] text-[#16C784] border-[#1B4D39]";
      case "warning":
        return "bg-[#2E1E09] text-[#FFB020] border-[#593A11]";
      case "danger":
        return "bg-[#2D1214] text-[#F87171] border-[#591C20]";
      case "info":
        return "bg-[#0E2038] text-[#60A5FA] border-[#1E3A5F]";
      default:
        return "bg-[#1C261F] text-[#9EAA9F] border-[#2A362D]";
    }
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[#2A362D] bg-[#141B16] text-white p-6 sm:p-7 shadow-sm",
        className
      )}
    >
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 lg:gap-8">
        {/* Main Intelligence Column (Golden Ratio Primary ~1.618) */}
        <div className="space-y-4 flex-1 min-w-0">
          {/* Header Signal Badge */}
          <div className="flex flex-wrap items-center gap-2.5">
            {badgeText && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1C261F] border border-[#2A362D] text-[11px] font-bold tracking-wider text-[#16C784] uppercase">
                <span className="flex h-2 w-2 rounded-full bg-[#16C784] animate-pulse" />
                {badgeIcon || <Sparkles className="h-3 w-3 text-[#FFB020]" />}
                {badgeText}
              </div>
            )}
            {provenance && <DataProvenanceBadge type={provenance} />}
          </div>

          {/* Title & Verdict */}
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-snug">
              {title}
            </h2>
            {verdictLabel && (
              <div className="mt-2.5 inline-flex flex-wrap items-center gap-3">
                <span
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-bold border tracking-wide",
                    getVerdictStyle()
                  )}
                >
                  {verdictLabel}
                </span>
                {score !== undefined && (
                  <span className="text-xs font-medium text-[#9EAA9F]">
                    Score: <span className="font-mono text-white font-bold tabular-nums">{score}</span>
                    {typeof score === "number" && <span className="text-[#6D7870] font-mono">/{scoreMax}</span>}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Natural Language Explanation */}
          {description && (
            <p className="text-xs sm:text-sm text-[#A5B2A6] leading-relaxed max-w-3xl">
              {description}
            </p>
          )}

          {/* Children: Supporting Factors, Badges, or Lists */}
          {children && <div className="pt-2">{children}</div>}

          {/* Actions */}
          {(actionLabel || secondaryAction) && (
            <div className="pt-3 flex flex-wrap items-center gap-3">
              {actionLabel && onAction && (
                <Button
                  variant="primary"
                  size="compact"
                  onClick={onAction}
                  className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-white font-bold !py-2 !px-4 text-xs"
                >
                  {actionLabel}
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5 inline" />
                </Button>
              )}
              {secondaryAction}
            </div>
          )}
        </div>

        {/* Supporting Side Panel (Score Meter, Key Metrics Box, or Chart - Golden Ratio Secondary ~1.0) */}
        {sidePanel && (
          <div className="w-full lg:w-[320px] xl:w-[340px] shrink-0 bg-[#1A231C] border border-[#2D3A30] rounded-xl p-5 sm:p-6 space-y-4 shadow-inner-xs">
            {sidePanel}
          </div>
        )}
      </div>
    </div>
  );
}
