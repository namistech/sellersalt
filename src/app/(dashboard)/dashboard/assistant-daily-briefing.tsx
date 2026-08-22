"use client";

import React, { useState } from "react";
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
  AlertCircle,
  Zap,
} from "lucide-react";
import { Card, Badge, Button, Heading, Text } from "@/components/ui";
import { DataProvenanceBadge } from "@/components/data/DataProvenanceBadge";

interface BriefingItem {
  id: string;
  category: "GOOD_NEWS" | "ATTENTION" | "OPPORTUNITY" | "COMPETITOR" | "KEYWORD";
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
    researched: 18,
    shortlisted: 7,
    planning: 5,
    contentReady: 3,
    draftCreated: 2,
  },
}: AssistantDailyBriefingProps) {
  const [activeTab, setActiveTab] = useState<string>("ALL");

  const briefingItems: BriefingItem[] = [
    {
      id: "briefing-1",
      category: "GOOD_NEWS",
      title: "Active Etsy draft 'Artisan Ceramic Cup' approved with 94/100 SEO",
      metric: "94/100 SEO",
      metricLabel: "Listing Health",
      interpretation: "Title front-loads primary buyer intent keyword and utilizes all 13 compliant tag slots.",
      recommendation: "Open in Etsy Listing Manager to finalize thumbnail and postage parameters.",
      actionLabel: "Review Draft (Rule 9)",
      actionHref: "/drafts",
      icon: "🎉",
      priority: "HIGH",
    },
    {
      id: "briefing-2",
      category: "ATTENTION",
      title: "1 Listing trailing 7-day velocity projection by 18%",
      metric: "-18% 7d",
      metricLabel: "Velocity Drift",
      interpretation: "Search impressions declined following competitor price adjustments in Leather Goods.",
      recommendation: "Audit listing tag slots and explore secondary long-tail keyword variations.",
      actionLabel: "Audit Listing in Studio",
      actionHref: "/studio",
      icon: "⚠️",
      priority: "HIGH",
    },
    {
      id: "briefing-3",
      category: "OPPORTUNITY",
      title: "Handcrafted Leather Journals showing +28% demand spike",
      metric: "88/100 Opp",
      metricLabel: "Opportunity Score",
      interpretation: "Search velocity is rising with low active seller competition in custom gift niches.",
      recommendation: "Shortlist this opportunity and generate a 13-tag keyword cluster for listing preparation.",
      actionLabel: "Investigate Product",
      actionHref: "/radar",
      icon: "🔥",
      priority: "HIGH",
    },
    {
      id: "briefing-4",
      category: "COMPETITOR",
      title: "Top competitor gained +18 orders in past 24 hours",
      metric: "+18 orders",
      metricLabel: "24h Velocity",
      interpretation: "Competitor listing moved up organic rank in personalized gifts category.",
      recommendation: "Inspect their listing tag slots and compare price corridor.",
      actionLabel: "Shop Intelligence",
      actionHref: "/shop-intelligence",
      icon: "📊",
      priority: "HIGH",
    },
    {
      id: "briefing-5",
      category: "KEYWORD",
      title: "4 High-Intent Long-Tail Keywords identified in 'Espresso'",
      metric: "79/100 Kw",
      metricLabel: "Keyword Opportunity",
      interpretation: "Keywords like 'personalized espresso cup' have high intent with moderate competition.",
      recommendation: "Add to Planner and incorporate into title's first 40 characters.",
      actionLabel: "Mine Keywords",
      actionHref: "/keyword-research",
      icon: "#",
      priority: "MEDIUM",
    },
  ];

  const filteredItems = briefingItems.filter((item) => {
    if (activeTab === "ALL") return true;
    return item.category === activeTab;
  });

  const pipelineStages = [
    { label: "Researched", count: pipelineCounts.researched || 18, href: "/radar" },
    { label: "Shortlisted", count: pipelineCounts.shortlisted || 7, href: "/planner?status=BACKLOG" },
    { label: "Planning", count: pipelineCounts.planning || 5, href: "/planner?status=IN_PROGRESS" },
    { label: "Content Ready", count: pipelineCounts.contentReady || 3, href: "/planner?status=CONTENT_READY" },
    { label: "Etsy Drafts", count: pipelineCounts.draftCreated || 2, href: "/drafts" },
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
              <h2 className="text-base font-bold text-white tracking-tight">
                SellerSalt Daily Seller Briefing
              </h2>
              <span className="px-2 py-0.5 rounded-full text-label-sm font-bold bg-[#0E8F5D] text-white">
                LIVE
              </span>
            </div>
            <p className="text-sm text-white/70 mt-0.5">
              Actionable summary of market shifts, urgent draft reviews, and recommended next moves.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/workspace"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition border border-white/10"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Open Workspace</span>
          </Link>
        </div>
      </div>

      {/* Visual Operating Pipeline Flow */}
      <Card padding="md" className="border-line bg-white shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-ink uppercase tracking-wide flex items-center gap-1.5">
            <span>🎯 Active Seller Pipeline</span>
          </span>
          <span className="text-meta text-ink-tertiary">
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
              <div className="text-label-sm font-bold uppercase text-ink-tertiary group-hover:text-[#0E8F5D] truncate">
                {idx + 1}. {stg.label}
              </div>
              <div className="text-lg font-mono font-extrabold text-ink group-hover:text-[#0E8F5D] pt-0.5">
                {stg.count}
              </div>
            </Link>
          ))}
        </div>
      </Card>

      {/* Briefing Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: "ALL", label: "All Briefings" },
          { id: "GOOD_NEWS", label: "🎉 Good News" },
          { id: "ATTENTION", label: "⚠️ Attention" },
          { id: "OPPORTUNITY", label: "🔥 Opportunities" },
          { id: "COMPETITOR", label: "👁️ Competitors" },
          { id: "KEYWORD", label: "# Keywords" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1 rounded-lg text-sm font-bold transition whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-[#141B16] text-white"
                : "bg-[#FAFAF8] text-ink hover:bg-surface-muted border border-line"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 2-Column Responsive Grid of Actionable Briefing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredItems.map((item) => (
          <Card
            key={item.id}
            padding="md"
            className="border-line bg-white hover:border-[#0E8F5D]/50 transition-all flex flex-col justify-between space-y-3 shadow-xs"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{item.icon}</span>
                  <span className="text-label-sm font-bold uppercase tracking-wider text-ink-tertiary">
                    {item.category.replace("_", " ")}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-mono font-extrabold text-[#0E8F5D] bg-[#E7FAF1] px-2 py-0.5 rounded">
                    {item.metric}
                  </span>
                </div>
              </div>

              <h3 className="text-sm font-bold text-ink leading-snug">
                {item.title}
              </h3>

              <div className="p-2.5 rounded-xl bg-[#FAFAF8] border border-line-subtle text-sm space-y-1">
                <div>
                  <span className="font-bold text-ink-secondary">What this means: </span>
                  <span className="text-ink-tertiary">{item.interpretation}</span>
                </div>
                <div>
                  <span className="font-bold text-[#0E8F5D]">Recommended Next Move: </span>
                  <span className="text-ink-secondary">{item.recommendation}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-line-subtle flex items-center justify-between">
              <DataProvenanceBadge type="SELLERSALT_SCORE" />
              <Link
                href={item.actionHref}
                className="inline-flex items-center gap-1 text-sm font-bold text-[#0E8F5D] hover:text-[#0a6c45] transition-colors"
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
