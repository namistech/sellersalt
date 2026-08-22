"use client";

import React from "react";
import { Badge } from "@/components/ui/Badge";
import { MarketplaceGovernanceRegistry } from "@/marketplaces/core/governance/registry";
import type { MarketplaceId } from "@/marketplaces/core/types";

interface MarketplaceAttributionBadgeProps {
  marketplace: MarketplaceId | string;
  className?: string;
  showAccessMode?: boolean;
}

export function MarketplaceAttributionBadge({
  marketplace,
  className = "",
  showAccessMode = false,
}: MarketplaceAttributionBadgeProps) {
  const policy = MarketplaceGovernanceRegistry.getPolicy(marketplace);

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <Badge variant="neutral" className="text-label-sm font-bold uppercase tracking-wider">
        {policy.displayName}
      </Badge>
      {showAccessMode && (
        <span className="text-meta font-medium text-muted-foreground">
          ({policy.complianceStatus.replace(/_/g, " ")})
        </span>
      )}
    </div>
  );
}
