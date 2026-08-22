"use client";

import React from "react";
import Link from "next/link";
import { Lock, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button, Badge } from "@/components/ui";

export interface UpgradeGateProps {
  featureName?: string;
  requiredPlan?: "Starter" | "Growth" | "Pro" | "Agency" | string;
  description?: string;
  currentUsage?: number;
  maxUsage?: number;
  isHardGate?: boolean;
  discoveryContext?: string;
  availableSummary?: string;
  lockedSummary?: string;
  reasonWhyItMatters?: string;
  planPriceUsd?: number;
  className?: string;
}

export function UpgradeGate({
  featureName = "Feature",
  requiredPlan = "Starter",
  description,
  currentUsage,
  maxUsage,
  isHardGate = false,
  discoveryContext,
  availableSummary,
  lockedSummary,
  reasonWhyItMatters,
  planPriceUsd = 19,
  className = "",
}: UpgradeGateProps) {
  const isUsageExhausted = currentUsage !== undefined && maxUsage !== undefined && currentUsage >= maxUsage;

  // Contextual 5-part structure if reasonWhyItMatters or lockedSummary is provided
  if (lockedSummary || reasonWhyItMatters) {
    return (
      <div className={`p-6 rounded-2xl border border-dashed border-[#C7CCC4] bg-white text-[#141B16] shadow-xs relative overflow-hidden space-y-4 ${className}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E3E6E0]">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-[#E7FAF1] text-[#0E8F5D] flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#141B16]">
                {featureName !== "Feature" ? `Unlock ${featureName}` : "Unlock Full Intelligence"}
              </h3>
              {discoveryContext && (
                <p className="text-xs text-[#0E8F5D] font-semibold mt-0.5">
                  {discoveryContext}
                </p>
              )}
            </div>
          </div>

          <Badge variant="neutral" className="text-xs font-semibold self-start sm:self-center">
            {requiredPlan} Plan (${planPriceUsd}/mo)
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {availableSummary && (
            <div className="p-3 rounded-xl bg-[#FAFAF8] border border-[#E3E6E0] space-y-1">
              <span className="text-label-sm font-bold text-[#7C847E] uppercase tracking-wider block">
                Currently Available
              </span>
              <div className="flex items-start gap-2 text-[#525B55]">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#0E8F5D] shrink-0 mt-0.5" />
                <span>{availableSummary}</span>
              </div>
            </div>
          )}

          <div className="p-3 rounded-xl bg-[#E7FAF1]/50 border border-[#0E8F5D]/30 space-y-1">
            <span className="text-label-sm font-bold text-[#0A6342] uppercase tracking-wider block">
              Locked Opportunities
            </span>
            <div className="flex items-start gap-2 text-[#141B16] font-medium">
              <Lock className="h-3.5 w-3.5 text-[#0E8F5D] shrink-0 mt-0.5" />
              <span>{lockedSummary || description}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-[#E3E6E0]">
          {reasonWhyItMatters && (
            <p className="text-sm text-[#525B55] max-w-lg leading-relaxed">
              <strong className="text-[#141B16]">Why this matters:</strong> {reasonWhyItMatters}
            </p>
          )}

          <Link href="/pricing" className="shrink-0">
            <Button
              variant="primary"
              size="compact"
              className="w-full sm:w-auto text-sm font-bold bg-[#0E8F5D] hover:bg-[#0C7A52] text-white px-4 py-2 shadow-xs flex items-center justify-center gap-1.5"
            >
              <span>Upgrade to {requiredPlan}</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Classic dark style
  return (
    <div
      className={`rounded-2xl border border-[#2A362D] bg-[#141B16] text-white p-6 shadow-md space-y-4 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-amber-500/20 text-amber-400">
              <Lock className="h-4 w-4" />
            </span>
            <Badge variant="warning" tone="dark" className="text-label-sm">
              {requiredPlan} Plan Feature
            </Badge>
          </div>
          <h3 className="text-base font-bold text-white tracking-tight">
            {isUsageExhausted ? `Monthly ${featureName} Quota Reached` : `Unlock ${featureName}`}
          </h3>
          <p className="text-sm text-[#9EAA9F] leading-relaxed">
            {description}
          </p>

          {currentUsage !== undefined && maxUsage !== undefined && (
            <div className="pt-2 space-y-1">
              <div className="flex justify-between text-meta text-[#9EAA9F]">
                <span>Current Usage:</span>
                <span className="font-mono text-white font-bold">{currentUsage} / {maxUsage}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-amber-400"
                  style={{ width: `${Math.min(100, (currentUsage / maxUsage) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <Link href="/pricing">
            <Button
              variant="primary"
              size="default"
              className="bg-[#16C784] hover:bg-[#13AD73] text-[#141B16] font-bold text-sm shadow-md"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              <span>Upgrade Plan</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
