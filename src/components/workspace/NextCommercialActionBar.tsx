"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Layers, ShieldCheck, Compass, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

interface NextCommercialActionBarProps {
  currentStage: "DISCOVERY" | "RESEARCH" | "VALIDATION" | "WORKSPACE";
  query: string;
  verdict?: string;
  trustScore?: number;
  marketplaces?: string[];
  className?: string;
}

export function NextCommercialActionBar({
  currentStage,
  query,
  verdict = "INVESTIGATE",
  trustScore = 80,
  marketplaces = ["etsy", "amazon"],
  className = "",
}: NextCommercialActionBarProps) {
  const encoded = encodeURIComponent(query);
  const mps = marketplaces.join(",");

  const getStageActions = () => {
    switch (currentStage) {
      case "DISCOVERY":
        return {
          headline: "Opportunity Discovered: Next Best Action",
          description: "Inspect observable listing prices, review barriers, and seller concentration.",
          primaryAction: {
            label: "Research Market Signals",
            href: `/research-center?q=${encoded}&marketplaces=${mps}`,
            icon: Compass,
          },
          secondaryAction: {
            label: "Validate Commercial Feasibility",
            href: `/validate?q=${encoded}&marketplaces=${mps}`,
            icon: Sparkles,
          },
        };
      case "RESEARCH":
        return {
          headline: "Research Complete: Next Best Action",
          description: "Run multi-factor commercial validation with empirical price positioning quantiles.",
          primaryAction: {
            label: "Validate Product Opportunity",
            href: `/validate?q=${encoded}&marketplaces=${mps}`,
            icon: Sparkles,
          },
          secondaryAction: {
            label: "Open Product Workspace",
            href: `/product-workspaces?q=${encoded}&marketplaces=${mps}`,
            icon: Layers,
          },
        };
      case "VALIDATION":
        return {
          headline: "Product Validated: Next Best Action",
          description: "Configure product features, model unit economics scenarios, and prepare sourcing specs.",
          primaryAction: {
            label: "Build Sourcing & Economics Workspace",
            href: `/product-workspaces?q=${encoded}&marketplaces=${mps}`,
            icon: Layers,
          },
          secondaryAction: {
            label: "Explore Keyword Opportunities",
            href: `/keyword-research?q=${encoded}`,
            icon: Compass,
          },
        };
      case "WORKSPACE":
      default:
        return {
          headline: "Workspace Configured: Next Best Action",
          description: "Turn validated positioning into an optimized, policy-compliant listing draft.",
          primaryAction: {
            label: "Generate AI Listing Draft",
            href: `/studio?title=${encoded}`,
            icon: Sparkles,
          },
          secondaryAction: {
            label: "Add to Execution Planner",
            href: `/planner`,
            icon: FileText,
          },
        };
    }
  };

  const actionConfig = getStageActions();
  const PrimaryIcon = actionConfig.primaryAction.icon;
  const SecondaryIcon = actionConfig.secondaryAction.icon;

  return (
    <Card className={`p-5 md:p-6 border rounded-2xl bg-card shadow-xs space-y-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">{actionConfig.headline}</h3>
            <p className="text-xs text-muted-foreground">{actionConfig.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="neutral" className="text-[9px]">
            Data Trust: {trustScore}%
          </Badge>
          <Badge
            variant={
              verdict === "PURSUE"
                ? "success"
                : verdict === "INVESTIGATE" || verdict === "TEST"
                ? "info"
                : "warning"
            }
            className="text-[9px] font-bold"
          >
            Verdict: {verdict}
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2.5">
        <Button
          href={actionConfig.secondaryAction.href}
          size="compact"
          variant="secondary"
          className="text-xs font-semibold"
        >
          <SecondaryIcon className="w-3.5 h-3.5 mr-1.5" />
          <span>{actionConfig.secondaryAction.label}</span>
        </Button>

        <Button
          href={actionConfig.primaryAction.href}
          size="compact"
          variant="primary"
          className="text-xs font-bold"
        >
          <PrimaryIcon className="w-3.5 h-3.5 mr-1.5" />
          <span>{actionConfig.primaryAction.label}</span>
          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </div>
    </Card>
  );
}
