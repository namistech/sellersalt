"use client";

import React from "react";
import Link from "next/link";
import { Lock, Sparkles, ArrowRight, Zap } from "lucide-react";
import { Button, Badge } from "@/components/ui";

export interface UpgradeGateProps {
  featureName: string;
  requiredPlan?: "Starter" | "Growth" | "Pro" | "Agency";
  description: string;
  currentUsage?: number;
  maxUsage?: number;
  isHardGate?: boolean;
  className?: string;
}

export function UpgradeGate({
  featureName,
  requiredPlan = "Pro",
  description,
  currentUsage,
  maxUsage,
  isHardGate = false,
  className = "",
}: UpgradeGateProps) {
  const isUsageExhausted = currentUsage !== undefined && maxUsage !== undefined && currentUsage >= maxUsage;

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
            <Badge variant="warning" tone="dark" className="text-xs">
              {requiredPlan} Plan Feature
            </Badge>
          </div>
          <h3 className="text-base font-bold text-white tracking-tight">
            {isUsageExhausted ? `Monthly ${featureName} Quota Reached` : `Unlock ${featureName}`}
          </h3>
          <p className="text-xs text-[#9EAA9F] leading-relaxed">
            {description}
          </p>

          {currentUsage !== undefined && maxUsage !== undefined && (
            <div className="pt-2 space-y-1">
              <div className="flex justify-between text-[11px] text-[#9EAA9F]">
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
              className="bg-[#16C784] hover:bg-[#13AD73] text-[#141B16] font-bold text-xs shadow-md"
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
