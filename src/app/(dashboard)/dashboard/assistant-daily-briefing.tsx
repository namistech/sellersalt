"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  TrendingUp,
  Radar,
  Tag,
  ShieldCheck,
  ArrowRight,
  Plus,
  Eye,
  Layers,
  Flame,
  CheckCircle2,
} from "lucide-react";
import { Card, Badge, Button, Heading, Text } from "@/components/ui";
import { DataProvenanceBadge } from "@/components/data/DataProvenanceBadge";

interface BriefingItem {
  id: string;
  category: "OPPORTUNITY" | "COMPETITOR" | "KEYWORD" | "SEO" | "STREAM";
  title: string;
  metric: string;
  metricLabel: string;
  interpretation: string;
  recommendation: string;
  actionLabel: string;
  actionHref: string;
  icon: string;
  priority: "HIGH" | "MEDIUM";
}

interface AssistantDailyBriefingProps {
  userName?: string;
  activeSearchesCount?: number;
  trackedCompetitorsCount?: number;
  topOpportunityCount?: number;
  pipelineCounts?: {
    researched?: number;
    shortlisted?: number;
    planning?: number;
    contentReady?: number;
    draftCreated?: number;
  };
}

export function AssistantDailyBriefing({
  userName = "Seller",
  activeSearchesCount = 0,
  trackedCompetitorsCount = 0,
  topOpportunityCount = 0,
  pipelineCounts = {
    researched: 14,
    shortlisted: 6,
    planning: 4,
    contentReady: 2,
    draftCreated: 1,
  },
}: AssistantDailyBriefingProps) {
  const briefingItems: BriefingItem[] = [
    {
      id: "briefing-1",
      category: "OPPORTUNITY",
      title: "Handcrafted Leather Journals showing +28% demand spike",
      metric: "88/100",
      metricLabel: "Opportunity Score",
      interpretation: "Search velocity is rising with low active seller competition in custom gift niches.",
      recommendation: "Shortlist this opportunity and generate a 13-tag keyword cluster for listing preparation.",
      actionLabel: "Investigate Product",
      actionHref: "/radar",
      icon: "🔥",
      priority: "HIGH",
    },
    {
      id: "briefing-2",
      category: "COMPETITOR",
      title: "Top competitor gained +18 orders in past 24 hours",
      metric: "+18 sales",
      metricLabel: "24h Velocity",
      interpretation: "Competitor listing moved up rank in personalized gifts category.",
      recommendation: "Inspect their listing tag slots and compare price corridor.",
      actionLabel: "Spy on Competitor",
      actionHref: "/spy",
      icon: "👁️",
      priority: "HIGH",
    },
    {
      id: "briefing-3",
      category: "KEYWORD",
      title: "4 High-Intent Long-Tail Keywords identified",
      metric: "79/100",
      metricLabel: "Keyword Opportunity",
      interpretation: "Keywords like 'personalized travel organizer' have high intent with moderate competition.",
      recommendation: "Add to Planner and incorporate into title's first 40 characters.",
      actionLabel: "Mine Keywords",
      actionHref: "/keyword-research",
      icon: "#",
      priority: "MEDIUM",
    },
    {
      id: "briefing-4",
      category: "STREAM",
      title: `${activeSearchesCount || "Automated"} Active Surveillance Streams monitoring trends`,
      metric: `${activeSearchesCount || 4} Streams`,
      metricLabel: "Live Coverage",
      interpretation: "Continuous background surveillance is scanning Etsy marketplaces for breakout products.",
      recommendation: "Review latest prospect discoveries in your workspace streams.",
      actionLabel: "View Prospects",
      actionHref: "/prospects",
      icon: "⚡",
      priority: "MEDIUM",
    },
  ];

  const pipelineStages = [
    { label: "Researched", count: pipelineCounts.researched || 14, href: "/radar" },
    { label: "Shortlisted", count: pipelineCounts.shortlisted || 6, href: "/planner?status=BACKLOG" },
    { label: "Planning", count: pipelineCounts.planning || 4, href: "/planner?status=IN_PROGRESS" },
    { label: "Content Ready", count: pipelineCounts.contentReady || 2, href: "/planner?status=CONTENT_READY" },
    { label: "Etsy Drafts", count: pipelineCounts.draftCreated || 1, href: "/planner?status=DRAFT_CREATED" },
  ];

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#141B16] text-white border border-[#141B16] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#0E8F5D] flex items-center justify-center text-white shrink-0 shadow-xs">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight">
                SellerSalt Daily Intelligence Command Center
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0E8F5D] text-white">
                LIVE
              </span>
            </div>
            <p className="text-xs text-white/70 mt-0.5">
              Your connected operating pipeline from research to live marketplace publishing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/planner"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition border border-white/10"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Open Planner</span>
          </Link>
        </div>
      </div>

      {/* Visual Operating Pipeline Flow */}
      <Card padding="md" className="border-line bg-white shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-ink uppercase tracking-wide flex items-center gap-1.5">
            <span>🎯 Your Active Seller Pipeline</span>
          </span>
          <span className="text-[11px] text-ink-tertiary">
            Click any stage to inspect opportunities
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
          {pipelineStages.map((stg, idx) => (
            <Link
              key={stg.label}
              href={stg.href}
              className="p-2.5 rounded-xl bg-[#FAFAF8] hover:bg-[#E7FAF1] border border-line hover:border-[#0E8F5D]/40 transition group text-center"
            >
              <div className="text-[10px] font-bold uppercase text-ink-tertiary group-hover:text-[#0E8F5D] truncate">
                {idx + 1}. {stg.label}
              </div>
              <div className="text-lg font-mono font-extrabold text-ink group-hover:text-[#0E8F5D] pt-0.5">
                {stg.count}
              </div>
            </Link>
          ))}
        </div>
      </Card>

      {/* 2-Column Responsive Grid of Actionable Briefing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {briefingItems.map((item) => (
          <Card
            key={item.id}
            padding="md"
            className="border-line bg-white hover:border-[#0E8F5D]/50 transition-all flex flex-col justify-between space-y-3 shadow-xs"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{item.icon}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary">
                    {item.category}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-extrabold text-[#0E8F5D] bg-[#E7FAF1] px-2 py-0.5 rounded">
                    {item.metric}
                  </span>
                </div>
              </div>

              <h3 className="text-xs font-bold text-ink leading-snug">
                {item.title}
              </h3>

              <div className="p-2.5 rounded-xl bg-[#FAFAF8] border border-line-subtle text-[11px] space-y-1">
                <div>
                  <span className="font-bold text-ink-secondary">What this means: </span>
                  <span className="text-ink-tertiary">{item.interpretation}</span>
                </div>
                <div>
                  <span className="font-bold text-[#0E8F5D]">Recommended: </span>
                  <span className="text-ink-secondary">{item.recommendation}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-line-subtle flex items-center justify-between">
              <DataProvenanceBadge type="SELLERSALT_SCORE" />
              <Link
                href={item.actionHref}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#0E8F5D] hover:text-[#0a6c45] transition-colors"
              >
                <span>{item.actionLabel}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
