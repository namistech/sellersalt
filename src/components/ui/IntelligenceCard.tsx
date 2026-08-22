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
  /** Contextual feature-section theme ('radar' | 'keywords' | 'shop' | 'seo' | 'economics' | 'planner' | 'default') */
  contextTheme?: "radar" | "keywords" | "shop" | "seo" | "economics" | "planner" | "default";
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
  contextTheme = "default",
  sidePanel,
  children,
  actionLabel,
  onAction,
  secondaryAction,
  className,
}: IntelligenceCardProps) {
  const getContextThemeStyle = () => {
    switch (contextTheme) {
      case "radar":
        return "bg-gradient-to-br from-[#0F2016] via-[#142A1D] to-[#0D1C13] border-[#244831]";
      case "keywords":
        return "bg-gradient-to-br from-[#0F1E24] via-[#132830] to-[#0D1B20] border-[#1E3E4C]";
      case "shop":
        return "bg-gradient-to-br from-[#16221A] via-[#1C2C21] to-[#141E17] border-[#2E4233]";
      case "seo":
        return "bg-gradient-to-br from-[#161C20] via-[#1C242A] to-[#13191D] border-[#2D3A44]";
      case "economics":
        return "bg-gradient-to-br from-[#0D2218] via-[#132C1F] to-[#0A1A12] border-[#1E4832]";
      case "planner":
        return "bg-gradient-to-br from-[#141B1E] via-[#1A2328] to-[#12181B] border-[#2A3740]";
      default:
        return "bg-gradient-to-br from-[#141F18] via-[#1A281F] to-[#121B15] border-[#2A3B2F]";
    }
  };

  const getVerdictStyle = () => {
    switch (verdictVariant) {
      case "success":
        return "bg-[#0D281E] text-[#16C784] border-[#1B4D39]";
      case "warning":
        return "bg-[#2A1E0B] text-[#FBBF24] border-[#78480F]";
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
        "relative overflow-hidden rounded-2xl border text-white p-5 sm:p-6 lg:p-7 shadow-sm",
        getContextThemeStyle(),
        className
      )}
    >
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 lg:gap-8">
        {/* Main Intelligence Column (Golden Ratio Primary ~1.618) */}
        <div className="space-y-4 flex-1 min-w-0">
          {/* Header Signal Badge */}
          <div className="flex flex-wrap items-center gap-2.5">
            {badgeText && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1C261F] border border-[#2A362D] text-label-sm font-bold tracking-wider text-[#16C784] uppercase">
                <span className="flex h-2 w-2 rounded-full bg-[#16C784] animate-pulse" />
                {badgeIcon || <Sparkles className="h-3 w-3 text-[#FBBF24]" />}
                {badgeText}
              </div>
            )}
            {provenance && <DataProvenanceBadge type={provenance} />}
          </div>

          {/* Title & Verdict */}
          <div>
            <h2 className="text-base sm:text-lg lg:text-xl font-bold tracking-tight text-white leading-snug">
              {title}
            </h2>
            {verdictLabel && (
              <div className="mt-2.5 inline-flex flex-wrap items-center gap-3">
                <span
                  className={cn(
                    "px-3 py-1 rounded-lg text-label-sm font-bold border tracking-wide",
                    getVerdictStyle()
                  )}
                >
                  {verdictLabel}
                </span>
                {score !== undefined && (
                  <span className="text-sm font-medium text-[#9EAA9F]">
                    Score: <span className="text-white font-bold tabular-nums">{score}</span>
                    {typeof score === "number" && <span className="text-[#6D7870] font-sans">/{scoreMax}</span>}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Natural Language Explanation */}
          {description && (
            <p className="text-sm text-[#A5B2A6] leading-relaxed max-w-3xl">
              {description}
            </p>
          )}

          {/* Children: Supporting Factors, Badges, or Lists */}
          {children && <div className="pt-2 min-w-0">{children}</div>}

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
          <div className="w-full lg:w-[320px] xl:w-[360px] shrink-0 bg-[#1A231C] border border-[#2D3A30] rounded-xl p-5 sm:p-6 space-y-4 shadow-inner-xs min-w-0">
            {sidePanel}
          </div>
        )}
      </div>
    </div>
  );
}
