"use client";

import React, { useState } from "react";
import {
  Flame,
  TrendingUp,
  Sparkles,
  DollarSign,
  Globe,
  Award,
  Layers,
  Search,
  Compass,
  Bookmark,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type {
  OpportunityRadar2Feed,
  AutonomousOpportunityItem,
} from "@/marketplaces/core/autonomous-discovery-types";
import { OpportunityDetailDrawer } from "./OpportunityDetailDrawer";
import { ProductIdeaCard } from "./ProductIdeaCard";

interface OpportunityRadarFeedProps {
  initialFeed: OpportunityRadar2Feed;
  onRefresh?: () => Promise<void>;
  loading?: boolean;
}

export function OpportunityRadarFeed({
  initialFeed,
  onRefresh,
  loading = false,
}: OpportunityRadarFeedProps) {
  const [selectedOpp, setSelectedOpp] = useState<AutonomousOpportunityItem | null>(null);

  const { pulse, sections, productIdeas } = initialFeed;

  return (
    <div className="space-y-8">
      {/* Pulse Summary Banner */}
      <Card className="p-6 border rounded-2xl bg-card shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-foreground flex items-center gap-2">
              <Flame className="w-5 h-5 text-primary" />
              Opportunity Radar 2.0
            </h2>
            <p className="text-xs text-muted-foreground">
              Autonomous discovery feed detecting emerging products, rising velocities, price gaps, and underserved niches.
            </p>
          </div>

          {onRefresh && (
            <Button
              onClick={onRefresh}
              disabled={loading}
              size="compact"
              variant="secondary"
              className="text-xs shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh Radar
            </Button>
          )}
        </div>

        {/* Pulse Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-2">
          <div className="p-3 rounded-xl bg-muted/20 border text-center space-y-0.5">
            <span className="text-[9px] text-muted-foreground uppercase font-bold block">Discovered</span>
            <span className="text-lg font-black text-foreground">{pulse.totalOpportunitiesDiscovered}</span>
          </div>

          <div className="p-3 rounded-xl bg-muted/20 border text-center space-y-0.5">
            <span className="text-[9px] text-muted-foreground uppercase font-bold block">Emerging</span>
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{pulse.emergingCount}</span>
          </div>

          <div className="p-3 rounded-xl bg-muted/20 border text-center space-y-0.5">
            <span className="text-[9px] text-muted-foreground uppercase font-bold block">Rising</span>
            <span className="text-lg font-black text-sky-600 dark:text-sky-400">{pulse.risingCount}</span>
          </div>

          <div className="p-3 rounded-xl bg-muted/20 border text-center space-y-0.5">
            <span className="text-[9px] text-muted-foreground uppercase font-bold block">Underserved</span>
            <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{pulse.underservedCount}</span>
          </div>

          <div className="p-3 rounded-xl bg-muted/20 border text-center space-y-0.5">
            <span className="text-[9px] text-muted-foreground uppercase font-bold block">Price Gaps</span>
            <span className="text-lg font-black text-amber-600 dark:text-amber-400">{pulse.priceGapCount}</span>
          </div>

          <div className="p-3 rounded-xl bg-muted/20 border text-center space-y-0.5">
            <span className="text-[9px] text-muted-foreground uppercase font-bold block">Cross-Market</span>
            <span className="text-lg font-black text-primary">{pulse.crossMarketplaceCount}</span>
          </div>

          <div className="p-3 rounded-xl bg-muted/20 border text-center space-y-0.5">
            <span className="text-[9px] text-muted-foreground uppercase font-bold block">Avg Score</span>
            <span className="text-lg font-black text-foreground">{pulse.averageScore}/100</span>
          </div>
        </div>
      </Card>

      {/* Product Ideas Section */}
      {productIdeas.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="text-base font-bold text-foreground">Evidence-Grounded Product Ideas</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {productIdeas.map((idea) => (
              <ProductIdeaCard key={idea.id} idea={idea} />
            ))}
          </div>
        </div>
      )}

      {/* Radar Opportunity Sections */}
      <div className="space-y-8">
        {sections.map((sec) => (
          <div key={sec.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span>{sec.title}</span>
                  <Badge variant="neutral" className="text-[10px]">
                    {sec.opportunities.length}
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground">{sec.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {sec.opportunities.map((opp) => (
                <Card
                  key={opp.id}
                  onClick={() => setSelectedOpp(opp)}
                  className="p-4 border rounded-2xl bg-card hover:border-primary/50 cursor-pointer transition-all space-y-3 shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="neutral" className="text-[10px] uppercase font-bold">
                        {opp.type.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-xs font-black text-primary">
                        {opp.score.compositeScore}/100
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-foreground line-clamp-2">{opp.title}</h4>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {opp.explanation.whyFound}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t text-[10px] text-muted-foreground">
                    <span className="capitalize font-semibold">{opp.marketplace}</span>
                    <span className="text-primary font-bold flex items-center">
                      Inspect <ChevronRight className="w-3 h-3 ml-0.5" />
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Opportunity Detail Drawer */}
      <OpportunityDetailDrawer
        opportunity={selectedOpp}
        onClose={() => setSelectedOpp(null)}
      />
    </div>
  );
}
