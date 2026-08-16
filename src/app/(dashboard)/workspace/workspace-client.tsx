"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Layers,
  Sparkles,
  Search,
  Eye,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  FileText,
  TrendingUp,
  Tag,
  ExternalLink,
  Plus,
  Play,
  RotateCcw,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/shell";
import {
  Card,
  Badge,
  Button,
  Heading,
  Text,
  Input,
  IntelligenceCard,
  ViewSwitch,
  CountrySelector,
  MarketplaceSelector,
  HowItWorksGuide,
  HowItWorksToggle,
  type ViewMode,
} from "@/components/ui";
import { DataProvenanceBadge } from "@/components/data/DataProvenanceBadge";
import { calculateSellerHealthScore, type SellerHealthReport } from "@/services/intelligence/seller-health";

interface TaskItem {
  id: string;
  stage: string;
  stageNumber: number;
  title: string;
  category: string;
  metric: string;
  metricLabel: string;
  actionLabel: string;
  actionHref: string;
  urgency: "HIGH" | "MEDIUM";
  icon: string;
}

const PIPELINE_STAGES = [
  { id: "RESEARCHED", number: 1, label: "Researched", count: 18, href: "/radar" },
  { id: "SHORTLISTED", number: 2, label: "Shortlisted", count: 7, href: "/planner?status=BACKLOG" },
  { id: "OPPORTUNITY", number: 3, label: "Opportunity", count: 5, href: "/planner" },
  { id: "KEYWORDS", number: 4, label: "Keywords", count: 4, href: "/keyword-research" },
  { id: "STRATEGY", number: 5, label: "Strategy", count: 3, href: "/planner" },
  { id: "CONTENT", number: 6, label: "Content", count: 3, href: "/planner" },
  { id: "DRAFT", number: 7, label: "Draft", count: 2, href: "/drafts" },
  { id: "REVIEW", number: 8, label: "Review", count: 2, href: "/drafts" },
  { id: "PUBLISHED", number: 9, label: "Published", count: 6, href: "/settings/channels" },
  { id: "MONITORING", number: 10, label: "Monitoring", count: 4, href: "/spy/tracked" },
];

export function WorkspaceClient() {
  const [selectedStage, setSelectedStage] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [showGuide, setShowGuide] = useState(false);

  // Compute live Seller Health Score
  const healthReport: SellerHealthReport = calculateSellerHealthScore({
    shortlistedCount: 7,
    avgOpportunityScore: 82,
    keywordClusterCount: 4,
    tagCompliancePercent: 88,
    draftsReadyCount: 2,
    avgMarginPercent: 62,
    avgDailySales: 3.1,
  });

  const continueTasks: TaskItem[] = [
    {
      id: "task-1",
      stage: "SHORTLISTED",
      stageNumber: 2,
      title: "Handmade Leather Travel Wallet",
      category: "Bags & Purses",
      metric: "88/100",
      metricLabel: "Opportunity Score",
      actionLabel: "Build Strategy & Copy",
      actionHref: "/planner",
      urgency: "HIGH",
      icon: "🎯",
    },
    {
      id: "task-2",
      stage: "KEYWORDS",
      stageNumber: 4,
      title: "13-Tag Cluster for 'Personalized Ceramic Mug'",
      category: "Home & Living",
      metric: "13 Tags",
      metricLabel: "Harvested Cluster",
      actionLabel: "Add Cluster to Planner",
      actionHref: "/keyword-research",
      urgency: "HIGH",
      icon: "#",
    },
    {
      id: "task-3",
      stage: "REVIEW",
      stageNumber: 8,
      title: "Etsy Draft: Minimalist Desk Organizer",
      category: "Home & Office",
      metric: "94/100",
      metricLabel: "Listing SEO Quality",
      actionLabel: "Review Draft (Rule 9)",
      actionHref: "/drafts",
      urgency: "HIGH",
      icon: "📦",
    },
    {
      id: "task-4",
      stage: "MONITORING",
      stageNumber: 10,
      title: "Competitor 'ArtisanStudio' surged +24% sales",
      category: "Personalized Gifts",
      metric: "+24% 7d",
      metricLabel: "Sales Momentum",
      actionLabel: "Inspect Winning Tags",
      actionHref: "/spy",
      urgency: "MEDIUM",
      icon: "👁️",
    },
  ];

  const filteredTasks = continueTasks.filter((t) => {
    if (selectedStage !== "ALL" && t.stage !== selectedStage) return false;
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Seller Operating Workspace"
        description="Your central execution hub — continue active opportunities, review listing strategies, validate drafts, and monitor published listings."
        primaryAction={
          <div className="flex items-center gap-2.5">
            <CountrySelector size="sm" />
            <HowItWorksToggle isOpen={showGuide} onToggle={() => setShowGuide(!showGuide)} />
            <DataProvenanceBadge type="SELLERSALT_SCORE" />
          </div>
        }
      />

      {/* Multi-Marketplace Selector */}
      <MarketplaceSelector className="w-fit" />

      <HowItWorksGuide
        isOpen={showGuide}
        onToggle={() => setShowGuide(!showGuide)}
        title="How the Seller Operating Workspace Works"
        description="SellerSalt connects research, keyword clustering, content generation, and Etsy draft creation into one continuous execution pipeline."
        steps={[
          {
            title: "1. Continue Unfinished Work",
            description: "Pick up active opportunities at any stage from shortlisted items to ready-to-review drafts.",
            badge: "Workflow Memory",
          },
          {
            title: "2. Track Pipeline Velocity",
            description: "Filter through the 10-stage operating board to eliminate bottlenecks and optimize catalog yield.",
            badge: "Pipeline Board",
          },
          {
            title: "3. Health Score Optimization",
            description: "Address your lowest-scoring health factors to maximize organic impressions and net profit margin.",
            badge: "Health Engine",
          },
        ]}
      />

      {/* LEVEL 1: SELLER HEALTH SCORE INTELLIGENCE CARD */}
      <IntelligenceCard
        badgeText="SELLER OPERATING HEALTH SCORE"
        badgeIcon={<Zap className="h-3.5 w-3.5 text-[#FFB020]" />}
        title={`Overall Seller Health: ${healthReport.overallScore}/100 — ${healthReport.tierLabel}`}
        score={healthReport.overallScore}
        scoreMax={100}
        verdictLabel={healthReport.tier}
        verdictVariant={healthReport.overallScore >= 70 ? "success" : "warning"}
        provenance="SELLERSALT_SCORE"
        description={
          `Your catalog demonstrates robust unit profit margins (${healthReport.factors.pricingMarginScore}/100) and steady demand capture. ${healthReport.biggestWeakness.description}`
        }
        actionLabel={healthReport.recommendedAction.actionLabel}
        onAction={() => {
          if (healthReport.recommendedAction.actionHref) {
            window.location.href = healthReport.recommendedAction.actionHref;
          }
        }}
        sidePanel={
          <div className="space-y-3">
            <div className="text-[11px] font-bold text-[#9EAA9F] uppercase tracking-wider">
              Health Factor Breakdown
            </div>
            <div className="space-y-2 text-xs">
              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#9EAA9F]">Opportunity Pipeline:</span>
                  <span className="text-white font-mono font-bold">{healthReport.factors.opportunityScore}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-[#16C784]" style={{ width: `${healthReport.factors.opportunityScore}%` }} />
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#9EAA9F]">Keyword Coverage:</span>
                  <span className="text-white font-mono font-bold">{healthReport.factors.keywordCoverageScore}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-[#3B82F6]" style={{ width: `${healthReport.factors.keywordCoverageScore}%` }} />
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#9EAA9F]">Listing Content Quality:</span>
                  <span className="text-white font-mono font-bold">{healthReport.factors.listingQualityScore}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-[#FFB020]" style={{ width: `${healthReport.factors.listingQualityScore}%` }} />
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#9EAA9F]">Pricing &amp; Margin:</span>
                  <span className="text-white font-mono font-bold">{healthReport.factors.pricingMarginScore}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-[#16C784]" style={{ width: `${healthReport.factors.pricingMarginScore}%` }} />
                </div>
              </div>
            </div>
          </div>
        }
      >
        <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-[#9EAA9F]">
          <span className="text-white font-semibold">💡 Top Opportunity:</span>
          <span>{healthReport.biggestOpportunity.headline} ({healthReport.biggestOpportunity.potentialYield})</span>
        </div>
      </IntelligenceCard>

      {/* LEVEL 2: 10-STAGE OPERATING PIPELINE BOARD */}
      <Card padding="md" className="border-line bg-white shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#0E8F5D]" />
            <span className="text-xs font-bold text-ink uppercase tracking-wide">
              Operating Pipeline Board ({PIPELINE_STAGES.reduce((s, p) => s + p.count, 0)} Total Active Items)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedStage("ALL")}
            className={`text-xs font-semibold hover:underline ${selectedStage === "ALL" ? "text-[#0E8F5D] font-bold" : "text-ink-tertiary"}`}
          >
            Show All Stages
          </button>
        </div>

        {/* Scrollable Stage Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-1.5 pt-1">
          {PIPELINE_STAGES.map((stg) => {
            const isSelected = selectedStage === stg.id;
            return (
              <button
                key={stg.id}
                type="button"
                onClick={() => setSelectedStage(isSelected ? "ALL" : stg.id)}
                className={`p-2 rounded-xl text-center border transition-all ${
                  isSelected
                    ? "bg-[#141B16] text-white border-[#141B16] shadow-sm"
                    : "bg-[#FAFAF8] text-ink border-line hover:border-[#0E8F5D]/50 hover:bg-[#E7FAF1]/50"
                }`}
              >
                <div className="text-[9px] font-bold uppercase opacity-70 truncate">
                  {stg.number}. {stg.label}
                </div>
                <div className="text-base font-mono font-extrabold pt-0.5">
                  {stg.count}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* LEVEL 3: CONTINUE WHERE YOU LEFT OFF SECTION */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#0E8F5D]" />
            <Heading as="h3" size="h4">Continue Where You Left Off</Heading>
            <Badge variant="neutral" className="text-xs font-mono">
              {filteredTasks.length} active items
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search active tasks..."
              className="h-8 text-xs w-48"
            />
            <ViewSwitch value={viewMode} onChange={setViewMode} modes={["grid", "table"]} />
          </div>
        </div>

        {/* Grid vs Table View of Active Tasks */}
        {filteredTasks.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {filteredTasks.map((task) => (
                <Card
                  key={task.id}
                  padding="md"
                  className="border-line bg-white shadow-2xs hover:border-[#0E8F5D]/50 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{task.icon}</span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#FAFAF8] text-ink-secondary border border-line">
                        Stage {task.stageNumber}: {task.stage}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-ink truncate" title={task.title}>
                        {task.title}
                      </h4>
                      <p className="text-[11px] text-ink-tertiary">{task.category}</p>
                    </div>

                    <div className="p-2 rounded-lg bg-[#FAFAF8] border border-line-subtle flex items-center justify-between text-xs">
                      <span className="text-[10px] text-ink-tertiary uppercase">{task.metricLabel}</span>
                      <span className="font-mono font-extrabold text-[#0E8F5D]">{task.metric}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-line-subtle">
                    <Link
                      href={task.actionHref}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0E8F5D] hover:bg-[#0C7A52] text-white transition shadow-2xs"
                    >
                      <span>{task.actionLabel}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="border border-line rounded-xl overflow-hidden bg-white shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#FAFAF8] border-b border-line text-ink-tertiary font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Stage</th>
                    <th className="p-3">Opportunity Title</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Key Metric</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle">
                  {filteredTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-surface-muted transition">
                      <td className="p-3 font-bold text-ink">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FAFAF8] text-ink border border-line">
                          {task.stageNumber}. {task.stage}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-ink">{task.title}</td>
                      <td className="p-3 text-ink-tertiary">{task.category}</td>
                      <td className="p-3 font-mono font-bold text-[#0E8F5D]">{task.metric}</td>
                      <td className="p-3 text-right">
                        <Link
                          href={task.actionHref}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-[#0E8F5D] text-white hover:bg-[#0C7A52] transition"
                        >
                          <span>{task.actionLabel}</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <Card padding="lg" className="border-line bg-white text-center py-12 space-y-2">
            <Layers className="h-8 w-8 text-ink-tertiary mx-auto opacity-50" />
            <div className="text-xs font-bold text-ink">No Active Tasks in Selected Stage</div>
            <p className="text-[11px] text-ink-tertiary max-w-sm mx-auto">
              Select &quot;Show All Stages&quot; or start new research from Opportunity Radar to feed your operating pipeline.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
