"use client";

import React from "react";
import { Info, ShieldAlert } from "lucide-react";
import { MarketplaceGovernanceRegistry } from "@/marketplaces/core/governance/registry";
import type { MarketplaceId } from "@/marketplaces/core/types";

interface MarketplaceDisclaimerBoxProps {
  marketplace: MarketplaceId | string;
  className?: string;
  variant?: "banner" | "subtle" | "inline";
}

export function MarketplaceDisclaimerBox({
  marketplace,
  className = "",
  variant = "subtle",
}: MarketplaceDisclaimerBoxProps) {
  const policy = MarketplaceGovernanceRegistry.getPolicy(marketplace);

  if (!policy.displayRules.requireMarketplaceDisclaimer || !policy.displayRules.disclaimerText) {
    return null;
  }

  if (variant === "inline") {
    return (
      <span className={`text-[10px] text-muted-foreground italic ${className}`}>
        {policy.displayRules.disclaimerText}
      </span>
    );
  }

  return (
    <div
      className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
        variant === "banner"
          ? "bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-200"
          : "bg-muted/15 border-muted text-muted-foreground"
      } ${className}`}
    >
      <Info className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
      <div className="space-y-0.5">
        <span className="font-semibold block text-foreground text-[11px]">
          {policy.displayName} Trademark & Compliance Notice
        </span>
        <p className="text-[10px] leading-relaxed">
          {policy.displayRules.disclaimerText}
        </p>
      </div>
    </div>
  );
}
