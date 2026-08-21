"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Flame,
  Zap,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Eye,
  CheckCircle2,
  Tag,
  Clock,
  Sparkles,
  Layers,
  BarChart3,
  ExternalLink,
} from "lucide-react";
import { DataProvenanceBadge } from "@/components/data/DataProvenanceBadge";
import { WhyThisMatters } from "@/components/intelligence/WhyThisMatters";
import type { NextBestAction } from "@/services/intelligence/next-best-action";
import { calculatePipelineHealth, type PipelineHealthReport } from "@/services/opportunity-memory";

export interface PriorityActionItem {
  id: string;
  category: "OPPORTUNITY" | "COMPETITOR" | "KEYWORD" | "DRAFT" | "PUBLISHED";
  title: string;
  subtitle: string;
  actionLabel: string;
  actionHref: string;
  urgency: "HIGH" | "MEDIUM";
  impactScore: number;
  icon: string;
  badgeText: string;
  nextBestAction: NextBestAction;
}

export interface DashboardCommandCenterProps {
  organizationId: string;
  userName: string;
}

export function DashboardCommandCenter({ organizationId, userName }: DashboardCommandCenterProps) {
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const pipelineHealth: PipelineHealthReport = calculatePipelineHealth(organizationId);

  // Top 5 Priority Actions answering "What should I do today?"
  const priorityActions: PriorityActionItem[] = [
    {
      id: "act_1",
      category: "OPPORTUNITY",
      title: "Handmade Ceramic Pour-Over Dripper",
      subtitle: "88/100 Opp Score · 4.2 sales/day in Coffee & Tea Niche",
      actionLabel: "Shortlist & Build Strategy",
      actionHref: "/planner?status=BACKLOG",
      urgency: "HIGH",
      impactScore: 94,
      icon: "🔥",
      badgeText: "High Opportunity",
      nextBestAction: {
        id: "nba_act_1",
        context: "PRODUCT",
        headline: "High Opportunity in Coffee Niche",
        signal: "Sales velocity (4.2/day) is outperforming category average with low review barrier (32 reviews).",
        interpretation: "Entering this sub-niche with 13 high-intent tags allows rapid organic indexing.",
        whyYouShouldCare: "High unit revenue ($36.00) yields 64% net profit margin after all Etsy fees.",
        rationale: "Rapid sales velocity and accessible review count in a trending gift category.",
        actionLabel: "Shortlist Product",
        actionHref: "/planner",
        actionType: "NAVIGATE",
        urgency: "HIGH",
        scoreImpactEstimated: "+$420 Monthly Profit",
        icon: "🔥",
        provenance: "SELLERSALT_SCORE",
        confidence: 94,
      },
    },
    {
      id: "act_2",
      category: "COMPETITOR",
      title: "Competitor 'ArtisanStudio' surged +28% in 7 days",
      subtitle: "Surge driven by 2 new personalized listing releases",
      actionLabel: "Analyze Winning Listings",
      actionHref: "/shop-intelligence",
      urgency: "HIGH",
      impactScore: 90,
      icon: "👁️",
      badgeText: "Competitor Spike",
      nextBestAction: {
        id: "nba_act_2",
        context: "COMPETITOR",
        headline: "Competitor Velocity Acceleration Detected",
        signal: "ArtisanStudio sales velocity spiked +28% over the past 7 days across 2 new listings.",
        interpretation: "Their recent listings captured early seasonal demand for 'personalized anniversary gifts'.",
        whyYouShouldCare: "Harvesting their winning search tags reveals emerging buyer demand before niche saturation.",
        rationale: "Sales acceleration indicates rising buyer search volume in this niche.",
        actionLabel: "Analyze Winning Listings",
        actionHref: "/shop-intelligence",
        actionType: "NAVIGATE",
        urgency: "HIGH",
        scoreImpactEstimated: "13 Harvested Tags",
        icon: "👁️",
        provenance: "ESTIMATED",
        confidence: 90,
      },
    },
    {
      id: "act_3",
      category: "KEYWORD",
      title: "4 High-Intent Keywords for 'Minimalist Desk Organizer'",
      subtitle: "Low saturation (under 350 competing listings) with high buyer intent",
      actionLabel: "Build Listing Strategy",
      actionHref: "/planner",
      urgency: "HIGH",
      impactScore: 86,
      icon: "⚡",
      badgeText: "Keyword Cluster",
      nextBestAction: {
        id: "nba_act_3",
        context: "KEYWORD",
        headline: "Low Competition Keyword Cluster",
        signal: "Search phrases have strong buyer intent but less than 350 competing organic listings.",
        interpretation: "Title placement in first 40 characters ensures immediate first-page search impressions.",
        whyYouShouldCare: "Targeting low-barrier clusters reduces initial reliance on paid Etsy Ads.",
        rationale: "Low competing listing saturation provides rapid indexing runway.",
        actionLabel: "Build Listing Strategy",
        actionHref: "/planner",
        actionType: "NAVIGATE",
        urgency: "HIGH",
        scoreImpactEstimated: "First-Page Rank Feasibility",
        icon: "⚡",
        provenance: "SELLERSALT_SCORE",
        confidence: 92,
      },
    },
    {
      id: "act_4",
      category: "DRAFT",
      title: "Draft Ready for Review: 'Handmade Leather Journal'",
      subtitle: "13/13 Tags Verified · 96 SEO Score · Draft created on Etsy",
      actionLabel: "Review Draft on Etsy",
      actionHref: "/drafts",
      urgency: "HIGH",
      impactScore: 92,
      icon: "📦",
      badgeText: "Draft Pending Review",
      nextBestAction: {
        id: "nba_act_4",
        context: "DRAFT",
        headline: "Human Review Gate Required (Rule 9)",
        signal: "Listing copy, 13 tags, and pricing parameters are saved to your Etsy draft queue.",
        interpretation: "Draft is currently safely in draft state awaiting your manual photo check.",
        whyYouShouldCare: "Per Rule 9, reviewing on Etsy guarantees final compliance before going live.",
        rationale: "Human review gate ensures photo and shipping compliance before publication.",
        actionLabel: "Review Draft",
        actionHref: "/drafts",
        actionType: "NAVIGATE",
        urgency: "HIGH",
        scoreImpactEstimated: "Live Marketplace Launch",
        icon: "📦",
        provenance: "ACTUAL_ETSY_DATA",
        confidence: 100,
      },
    },
    {
      id: "act_5",
      category: "PUBLISHED",
      title: "Underperforming Listing: 'Ceramic Espresso Cup'",
      subtitle: "Observed for 14 days · Actual velocity (1.2/day) vs Forecast (2.8/day)",
      actionLabel: "Optimize Listing SEO",
      actionHref: "/seo",
      urgency: "MEDIUM",
      impactScore: 78,
      icon: "⚡",
      badgeText: "Requires Attention",
      nextBestAction: {
        id: "nba_act_5",
        context: "PUBLISHED",
        headline: "Listing Underperforming Forecast",
        signal: "14-day sales velocity (1.2/day) is lagging behind category baseline forecast (2.8/day).",
        interpretation: "Secondary search tags are missing high-traffic buyer queries (e.g. 'pottery mug gift').",
        whyYouShouldCare: "Swapping 4 weak tags for high-converting alternatives can recover organic impressions.",
        rationale: "Updating secondary tags recovers missing search traffic.",
        actionLabel: "Optimize Listing SEO",
        actionHref: "/seo",
        actionType: "NAVIGATE",
        urgency: "MEDIUM",
        scoreImpactEstimated: "+35% Impressions",
        icon: "⚡",
        provenance: "SELLERSALT_SCORE",
        confidence: 86,
      },
    },
  ];

  // Continue Where You Left Off unfinished tasks
  const unfinishedWork = [
    {
      id: "unf_1",
      title: "Listing Strategy: Ceramic Matcha Bowl Set",
      stage: "STRATEGY",
      stageNumber: 5,
      href: "/planner",
      progress: "80% Complete — Tags synthesized",
      icon: "🥣",
    },
    {
      id: "unf_2",
      title: "Keyword Harvest: 'Personalized Dog Collar'",
      stage: "KEYWORDS",
      stageNumber: 4,
      href: "/keyword-research",
      progress: "13 Tags Harvested — Unsaved to Planner",
      icon: "🐕",
    },
    {
      id: "unf_3",
      title: "Market Research: 3 Shops Tracked",
      stage: "MONITORING",
      stageNumber: 10,
      href: "/shop-intelligence/tracked",
      progress: "24h Delta snapshot refreshed",
      icon: "👁️",
    },
  ];

  return (
    <div className="space-y-6">
      {/* SECTION A: PRIORITY ACTIONS (Highest Impact First) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#141B16] border border-[#2A362D] text-white shadow-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-[#FFB020]" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              What You Should Do Today — Priority Action Queue
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#9EAA9F]">Ranked by Revenue Impact</span>
            <DataProvenanceBadge type="SELLERSALT_SCORE" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {priorityActions.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-[#1C261F] border border-[#2A362D] space-y-3 flex flex-col justify-between hover:border-[#16C784]/50 transition shadow-2xs"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="px-2 py-0.5 rounded font-bold uppercase tracking-wide bg-[#2A362D] text-[#16C784]">
                    {item.badgeText}
                  </span>
                  <span className="font-mono text-[#9EAA9F]">Impact: {item.impactScore}/100</span>
                </div>

                <h4 className="text-xs font-bold text-white leading-snug">
                  {item.title}
                </h4>
                <p className="text-[11px] text-[#9EAA9F] line-clamp-2">
                  {item.subtitle}
                </p>

                <div className="pt-1">
                  <WhyThisMatters action={item.nextBestAction} compact={true} />
                </div>
              </div>

              <Link
                href={item.actionHref}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-[#16C784] hover:bg-[#13AD73] text-[#141B16] transition shadow-2xs mt-2"
              >
                <span>{item.actionLabel}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION B: 10-STAGE PIPELINE HEALTH & BOTTLENECK ANALYSIS */}
      <div className="p-5 rounded-2xl bg-white border border-line shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
          <div>
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              <Layers className="h-5 w-5 text-[#0E8F5D]" />
              10-Stage Operating Pipeline Health
            </h3>
            <p className="text-xs text-ink-tertiary">
              Continuous operating loop from research discovery to live post-publish monitoring.
            </p>
          </div>
          <Link
            href="/workspace"
            className="text-xs font-bold text-[#0E8F5D] hover:underline inline-flex items-center gap-1"
          >
            <span>Open Operating Workspace</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* 10-Stage Pipeline Visualizer */}
        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
          {pipelineHealth.stages.map((st) => (
            <Link
              key={st.stage}
              href={st.href}
              className="p-2.5 rounded-xl border border-line bg-[#FAFAF8] hover:bg-white hover:border-[#0E8F5D] text-center transition flex flex-col justify-between gap-1 group shadow-2xs"
            >
              <div className="text-[10px] font-bold text-ink-tertiary group-hover:text-[#0E8F5D]">
                #{st.stageNumber}
              </div>
              <div className="text-base font-extrabold text-ink group-hover:text-[#0E8F5D]">
                {st.count}
              </div>
              <div className="text-[10px] font-semibold text-ink-secondary truncate" title={st.label}>
                {st.label}
              </div>
              <div className="text-[9px] font-mono text-ink-tertiary">
                {st.conversionRatePercent}% conv
              </div>
            </Link>
          ))}
        </div>

        {/* Bottleneck Diagnostic Callout */}
        <div className="p-4 rounded-xl bg-[#FFF9EB] border border-[#FFE0A3] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-[#FFB020] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-[#664400] text-[11px] uppercase tracking-wide">
                Primary Conversion Bottleneck: {pipelineHealth.bottleneckLabel}
              </span>
              <p className="text-[#664400] text-xs">
                {pipelineHealth.bottleneckDescription}
              </p>
            </div>
          </div>
          <Link
            href={pipelineHealth.fixBottleneckAction.href}
            className="shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#141B16] text-white hover:bg-[#202C23] transition shadow-2xs"
          >
            {pipelineHealth.fixBottleneckAction.label} →
          </Link>
        </div>
      </div>

      {/* SECTION C & D: INTELLIGENCE FEED + CONTINUE WHERE YOU LEFT OFF */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-Time Intelligence Feed */}
        <div className="p-5 rounded-2xl bg-white border border-line shadow-xs space-y-3.5 flex flex-col justify-between">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-ink flex items-center gap-2">
              <span>📡</span> Live Market Intelligence Signals
            </h4>
            <p className="text-xs text-ink-tertiary">
              New competitor movements and breakout signals detected since your last visit.
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="p-3 rounded-xl border border-line bg-[#FAFAF8] space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink flex items-center gap-1.5 text-[11px]">
                  🔥 Competitor Acceleration Detected
                </span>
                <span className="text-[10px] text-ink-tertiary">3h ago</span>
              </div>
              <p className="text-ink-secondary text-[11px]">
                Competitor 'ArtisanStudio' surged +28% weekly velocity on personalized ceramic drinkware.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-line bg-[#FAFAF8] space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink flex items-center gap-1.5 text-[11px]">
                  🔎 Emerging High-Intent Cluster Found
                </span>
                <span className="text-[10px] text-ink-tertiary">6h ago</span>
              </div>
              <p className="text-ink-secondary text-[11px]">
                Search phrase 'aesthetic desk tray leather' identified with under 250 competing items.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-line bg-[#FAFAF8] space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink flex items-center gap-1.5 text-[11px]">
                  🎯 Breakout Opportunity Discovered
                </span>
                <span className="text-[10px] text-ink-tertiary">12h ago</span>
              </div>
              <p className="text-ink-secondary text-[11px]">
                New young shop (6 mos) generating 5.1 sales/day in Handmade Leather Goods.
              </p>
            </div>
          </div>

          <Link
            href="/radar"
            className="w-full text-center px-3 py-2 text-xs font-bold rounded-lg border border-line bg-white hover:bg-[#FAFAF8] text-ink transition"
          >
            Explore All Opportunities in Radar →
          </Link>
        </div>

        {/* Continue Where You Left Off */}
        <div className="p-5 rounded-2xl bg-white border border-line shadow-xs space-y-3.5 flex flex-col justify-between">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-ink flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#0E8F5D]" />
              Continue Where You Left Off
            </h4>
            <p className="text-xs text-ink-tertiary">
              Resume in-flight strategies, keyword clusters, and draft reviews.
            </p>
          </div>

          <div className="space-y-2.5">
            {unfinishedWork.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="p-3 rounded-xl border border-line bg-[#FAFAF8] hover:bg-white hover:border-[#0E8F5D] transition flex items-center justify-between gap-3 text-xs group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-base">{item.icon}</span>
                  <div className="min-w-0">
                    <h5 className="font-bold text-ink group-hover:text-[#0E8F5D] truncate">
                      {item.title}
                    </h5>
                    <p className="text-[11px] text-ink-tertiary truncate">
                      {item.progress}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[#0E8F5D] font-bold text-xs shrink-0">
                  <span>Resume</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            ))}
          </div>

          <Link
            href="/workspace"
            className="w-full text-center px-3 py-2 text-xs font-bold rounded-lg bg-[#141B16] text-white hover:bg-[#202C23] transition"
          >
            Open Full Operating Workspace →
          </Link>
        </div>
      </div>
    </div>
  );
}
