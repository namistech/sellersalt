"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ResearchReportView } from "@/components/research/ResearchReportView";
import type { WorkbenchResearchResponse } from "@/marketplaces/core/acquisition/workbench";

interface RunDetailClientProps {
  run: any;
}

export function RunDetailClient({ run }: RunDetailClientProps) {
  if (!run) {
    return (
      <div className="p-12 text-center border rounded-xl bg-card">
        <h2 className="text-lg font-bold">Research Run Not Found</h2>
        <Link href="/research" className="text-primary hover:underline text-xs mt-2 inline-block">
          Return to Research Center
        </Link>
      </div>
    );
  }

  // Map database record to structured WorkbenchResearchResponse
  const report: WorkbenchResearchResponse = {
    runId: run.id,
    type: run.type,
    query: run.query,
    marketplaces: run.marketplaces,
    status: run.status,
    data: run.observations.map((o: any) => ({
      marketplace: o.marketplace,
      externalId: o.externalId,
      title: o.title,
      price: o.price,
      currency: o.currency,
      rating: o.rating,
      reviewCount: o.reviewCount,
      favoritesCount: o.favoritesCount,
      salesCount: o.salesCount,
      estimatedDemand: o.estimatedDemand,
      shop: { name: o.shopName, externalId: o.shopExternalId },
      categoryPath: o.categoryPath,
      url: o.sourceUrl,
      acquisitionMethod: o.sourceType,
      source: o.provenance,
      observedAt: o.observedAt,
      capturedAt: o.observedAt,
    })),
    sourcesUsed: run.sourcesUsed,
    itemCount: run.itemCount,
    liveCount: run.liveCount,
    historicalCount: run.historicalCount,
    freshnessStatus: run.freshnessStatus,
    confidence: run.confidence,
    durationMs: run.durationMs,
    isCached: true,
    limitations: [],
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div className="flex items-center gap-2">
        <Link
          href="/research"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground border rounded-lg bg-card hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Research Center
        </Link>
      </div>

      <ResearchReportView report={report} />
    </div>
  );
}
