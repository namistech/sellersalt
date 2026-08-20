"use client";

import React from "react";
import { HelpCircle, ShieldAlert, Lock, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { ClassifiedSignal } from "@/marketplaces/core/governance/signal-classification";

interface UnavailableSignalCardProps {
  signalName: string;
  reason?: string;
  category?: "SEARCH_VOLUME" | "STORE_SALES" | "SUPPLIER_COST" | "PRIVATE_REVENUE" | "API_AUTH" | "POLICY_RESTRICTED";
  className?: string;
}

export function UnavailableSignalCard({
  signalName,
  reason,
  category = "POLICY_RESTRICTED",
  className = "",
}: UnavailableSignalCardProps) {
  const getDefaultExplanation = () => {
    switch (category) {
      case "SEARCH_VOLUME":
        return "SellerSalt does not currently have a licensed search-volume source for this marketplace. Listing prevalence is shown instead and is not equivalent to search volume.";
      case "STORE_SALES":
        return "Verified unit sales are not available from the current public source. SellerSalt does not estimate private sales from listing counts.";
      case "SUPPLIER_COST":
        return "Unit manufacturing and supplier costs are user-derived inputs. Enter your supplier quote to model unit economics.";
      case "PRIVATE_REVENUE":
        return "Private seller financial data requires authorized merchant OAuth access and is never estimated for competitor shops.";
      case "API_AUTH":
        return "This marketplace capability requires an authorized, active official API connection.";
      case "POLICY_RESTRICTED":
      default:
        return "This acquisition method is unavailable under the current marketplace data-access policy.";
    }
  };

  return (
    <Card className={`p-4 border rounded-xl bg-muted/10 space-y-2 text-xs ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-foreground">
          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
          <span>{signalName}</span>
        </div>
        <Badge variant="neutral" className="text-[9px] font-bold">
          UNAVAILABLE
        </Badge>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {reason || getDefaultExplanation()}
      </p>
      <div className="flex items-center gap-1 text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold pt-1 border-t">
        <ShieldAlert className="w-3 h-3 shrink-0" />
        <span>Zero-Fabrication Guarantee: SellerSalt never generates synthetic estimates for private data.</span>
      </div>
    </Card>
  );
}
