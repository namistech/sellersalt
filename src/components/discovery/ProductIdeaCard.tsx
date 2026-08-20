"use client";

import React from "react";
import {
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Compass,
  Search,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { ProductIdea } from "@/marketplaces/core/autonomous-discovery-types";
import { useRouter } from "next/navigation";

interface ProductIdeaCardProps {
  idea: ProductIdea;
}

export function ProductIdeaCard({ idea }: ProductIdeaCardProps) {
  const router = useRouter();

  const handleValidate = () => {
    router.push(`/validate?query=${encodeURIComponent(idea.title)}&marketplace=all`);
  };

  const handleResearch = () => {
    router.push(`/research-center?query=${encodeURIComponent(idea.title)}&marketplace=all`);
  };

  return (
    <Card className="p-5 border rounded-2xl bg-card hover:border-primary/40 transition-all space-y-4 shadow-sm flex flex-col justify-between">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Badge variant="neutral" className="text-[10px] uppercase font-bold">
              Product Idea
            </Badge>
            <Badge variant="neutral" className="text-[10px]">
              {idea.targetCategory}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground font-semibold">Idea Score:</span>
            <Badge variant="neutral" className="text-[11px] font-black text-primary">
              {idea.ideaScore}/100
            </Badge>
          </div>
        </div>

        <h3 className="text-base font-bold text-foreground">{idea.title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{idea.whyThisIdea}</p>

        {/* Observed vs Derived */}
        <div className="space-y-2 pt-2 border-t text-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 block">
              Observed Market Data
            </span>
            <p className="text-muted-foreground text-[11px]">
              Keywords: <strong>{idea.observedEvidence.dominantKeywords.join(", ")}</strong> • Sample: {idea.observedEvidence.sampleListingCount} listings
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase text-sky-600 dark:text-sky-400 block">
              Derived Strategy Angle
            </span>
            <p className="text-muted-foreground text-[11px]">
              {idea.derivedEvidence.attributeGap} • {idea.derivedEvidence.pricingWindow}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-3 border-t">
        <Button onClick={handleValidate} size="compact" variant="primary" className="text-xs flex-1">
          <Compass className="w-3.5 h-3.5 mr-1" />
          Validate
        </Button>
        <Button onClick={handleResearch} size="compact" variant="secondary" className="text-xs flex-1">
          <Search className="w-3.5 h-3.5 mr-1" />
          Research
        </Button>
      </div>
    </Card>
  );
}
