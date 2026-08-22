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
  Flame,
  Activity,
  Inbox,
  ShoppingBag,
  Scale,
  SlidersHorizontal,
  Lock,
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
  CountrySelector,
  MarketplaceSelector,
  HowItWorksGuide,
  HowItWorksToggle,
  PlanUsageCard,
} from "@/components/ui";
import { DataProvenanceBadge } from "@/components/data/DataProvenanceBadge";
import { OpportunityInbox } from "@/components/intelligence/OpportunityInbox";
import { WhyThisMatters } from "@/components/intelligence/WhyThisMatters";
import type { CanonicalOpportunity } from "@/types/opportunity";
import type { OwnShopIntelligenceReport } from "@/services/own-shop-intelligence";
import type { PipelineHealthReport } from "@/services/opportunity-memory";

export interface WorkspaceClientProps {
  organizationId: string;
  initialOpportunities: CanonicalOpportunity[];
  initialOwnShopReport: OwnShopIntelligenceReport;
  initialPipelineHealth: PipelineHealthReport;
}

export function WorkspaceClient({
  organizationId,
  initialOpportunities,
  initialOwnShopReport,
  initialPipelineHealth,
}: WorkspaceClientProps) {
  const [activeMainTab, setActiveMainTab] = useState<"INBOX" | "PIPELINE" | "OWN_SHOP" | "COMPARISON">("INBOX");
  const [showGuide, setShowGuide] = useState(false);
  const [opportunities, setOpportunities] = useState<CanonicalOpportunity[]>(initialOpportunities);
  const [ownShop, setOwnShop] = useState<OwnShopIntelligenceReport>(initialOwnShopReport);
  const [pipeline, setPipeline] = useState<PipelineHealthReport>(initialPipelineHealth);

  const mainTabs = [
    { id: "INBOX", label: "Opportunity Inbox", icon: <Inbox className="h-4 w-4" />, count: opportunities.filter(o => !o.isDismissed).length },
    { id: "PIPELINE", label: "Pipeline & Bottlenecks", icon: <Layers className="h-4 w-4" />, count: pipeline.totalPipelineItems },
    { id: "OWN_SHOP", label: "Own Shop Intelligence", icon: <ShoppingBag className="h-4 w-4" />, count: ownShop.optimizationQueue.length },
    { id: "COMPARISON", label: "Decision & Comparison Mode", icon: <Scale className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Seller Operating Workspace 2.0"
        description="Unified command center — Opportunity Inbox, 10-stage execution pipeline, own-shop optimization, and comparative decision mode."
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
        description="SellerSalt connects research discovery, keyword clustering, strategic planning, Etsy draft creation, and own-store monitoring into one continuous execution loop."
        steps={[
          {
            title: "1. Unified Opportunity Inbox",
            description: "Review, shortlist, and action high-potential discoveries gathered from Product Research, Keywords, Market Research, and the Browser Extension.",
            badge: "Inbox Queue",
          },
          {
            title: "2. 10-Stage Pipeline Board",
            description: "Track progression across the 10 canonical stages and eliminate bottlenecks before they slow your publishing velocity.",
            badge: "Pipeline Engine",
          },
          {
            title: "3. First-Class Own Shop Health",
            description: "Audit your own Etsy catalog for missing 13-tag slots, underperforming listings, and competitor price movements.",
            badge: "Own Store",
          },
        ]}
      />

      {/* Main Workspace Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-2.5">
        {mainTabs.map((t) => {
          const isActive = activeMainTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveMainTab(t.id as typeof activeMainTab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                isActive
                  ? "bg-[#141B16] text-white shadow-xs"
                  : "bg-surface-secondary hover:bg-surface text-ink-secondary hover:text-ink"
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
              {t.count !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-label-sm font-mono ${
                    isActive ? "bg-white/20 text-white" : "bg-line text-ink-tertiary"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OPPORTUNITY INBOX */}
      {activeMainTab === "INBOX" && (
        <OpportunityInbox
          initialOpportunities={opportunities}
          organizationId={organizationId}
        />
      )}

      {/* TAB 2: 10-STAGE PIPELINE & BOTTLENECKS */}
      {activeMainTab === "PIPELINE" && (
        <div className="space-y-5">
          <div className="p-5 rounded-2xl bg-white border border-line shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
              <div>
                <h3 className="text-base font-bold text-ink flex items-center gap-2">
                  <Layers className="h-5 w-5 text-[#0E8F5D]" />
                  10-Stage Operating Pipeline & Conversion Funnel
                </h3>
                <p className="text-xs text-ink-tertiary">
                  Monitor stage-to-stage transition rates to identify and eliminate catalog publishing bottlenecks.
                </p>
              </div>
              <DataProvenanceBadge type="SELLERSALT_SCORE" />
            </div>

            {/* 10-Stage Funnel */}
            <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
              {pipeline.stages.map((st) => (
                <Link
                  key={st.stage}
                  href={st.href}
                  className="p-3 rounded-xl border border-line bg-[#FAFAF8] hover:bg-white hover:border-[#0E8F5D] transition flex flex-col justify-between text-center gap-1 group shadow-2xs"
                >
                  <div className="text-label-sm font-bold text-ink-tertiary group-hover:text-[#0E8F5D]">
                    #{st.stageNumber}
                  </div>
                  <div className="text-lg font-extrabold text-ink group-hover:text-[#0E8F5D]">
                    {st.count}
                  </div>
                  <div className="text-label-sm font-semibold text-ink-secondary truncate" title={st.label}>
                    {st.label}
                  </div>
                  <div className="text-meta font-mono text-ink-tertiary">
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
                  <span className="font-bold text-[#664400] text-label-sm uppercase tracking-wide">
                    Primary Pipeline Bottleneck: {pipeline.bottleneckLabel}
                  </span>
                  <p className="text-[#664400] text-xs leading-relaxed">
                    {pipeline.bottleneckDescription}
                  </p>
                </div>
              </div>
              <Link
                href={pipeline.fixBottleneckAction.href}
                className="shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#141B16] text-white hover:bg-[#202C23] transition shadow-2xs"
              >
                {pipeline.fixBottleneckAction.label} →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: OWN SHOP INTELLIGENCE LOOP */}
      {activeMainTab === "OWN_SHOP" && (
        !ownShop.isConnected ? (
          <div className="rounded-2xl border border-line bg-white p-12 text-center shadow-xs space-y-6 max-w-2xl mx-auto">
            <div className="h-16 w-16 rounded-2xl bg-[#E7FAF1] text-[#0E8F5D] flex items-center justify-center mx-auto shadow-xs">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-extrabold text-ink">Connect your Etsy shop</h3>
              <p className="text-sm text-ink-secondary max-w-lg mx-auto leading-relaxed">
                Connect your Etsy storefront to unlock real-time store health scores, missing tag analysis, underperforming listing alerts, and 1-click draft optimizations.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left max-w-lg mx-auto pt-2">
              <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
                <div className="text-xs font-bold text-ink">1. Connect Store</div>
                <div className="text-meta text-ink-tertiary">Secure official OAuth 2.0 connection.</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
                <div className="text-xs font-bold text-ink">2. Audit Catalog</div>
                <div className="text-meta text-ink-tertiary">Detect empty tag slots and title gaps.</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
                <div className="text-xs font-bold text-ink">3. Boost Sales</div>
                <div className="text-meta text-ink-tertiary">Apply optimized keywords in Content Studio.</div>
              </div>
            </div>
            <div className="pt-2">
              <Link href="/settings/channels">
                <Button variant="primary" size="default" className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-white font-bold text-sm px-6 py-2.5 shadow-sm">
                  <Zap className="h-4 w-4 mr-2" /> Connect Etsy Shop
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Level 1: Store Health Header Card */}
            <div className="p-5 rounded-2xl bg-[#141B16] border border-[#2A362D] text-white space-y-4 shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-[#16C784]" />
                    <h3 className="text-base font-bold text-white">
                      {ownShop.shopName} — Store Intelligence Loop
                    </h3>
                  </div>

                <p className="text-xs text-[#9EAA9F]">
                  Diagnostic evaluation of active listings, SEO tag compliance, and competitor benchmarks.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <DataProvenanceBadge type="SELLERSALT_SCORE" />
                <span className="px-2.5 py-1 rounded-lg bg-[#1C261F] text-[#16C784] font-bold text-xs border border-[#2A362D]">
                  Health: {ownShop.healthScore}/100
                </span>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-[#1C261F] border border-[#2A362D]">
                <div className="text-label-sm uppercase font-bold text-[#9EAA9F]">Active Listings</div>
                <div className="text-base font-extrabold text-white">
                  {ownShop.actualData.activeListingsCount}
                </div>
                <div className="text-meta text-[#16C784]">[ACTUAL ETSY DATA]</div>
              </div>

              <div className="p-3 rounded-xl bg-[#1C261F] border border-[#2A362D]">
                <div className="text-label-sm uppercase font-bold text-[#9EAA9F]">Est. Monthly Sales</div>
                <div className="text-base font-extrabold text-white">
                  ${ownShop.estimatedMetrics.estMonthlyRevenue.toLocaleString()}
                </div>
                <div className="text-meta text-[#4E9FFF]">[ESTIMATED]</div>
              </div>

              <div className="p-3 rounded-xl bg-[#1C261F] border border-[#2A362D]">
                <div className="text-label-sm uppercase font-bold text-[#9EAA9F]">Tag Gaps Detected</div>
                <div className="text-base font-extrabold text-[#FFB020]">
                  {ownShop.seoSummary.listingsWithTagGapsCount} listings
                </div>
                <div className="text-meta text-[#9EAA9F]">Unused 13-tag slots</div>
              </div>

              <div className="p-3 rounded-xl bg-[#1C261F] border border-[#2A362D]">
                <div className="text-label-sm uppercase font-bold text-[#9EAA9F]">Underperforming</div>
                <div className="text-base font-extrabold text-[#FF6B6B]">
                  {ownShop.underperformingListings.length} listings
                </div>
                <div className="text-meta text-[#9EAA9F]">Below category benchmark</div>
              </div>
            </div>
          </div>

          {/* Level 2: Connector Scope & Capability Diagnostics */}
          <div className="p-5 rounded-2xl bg-white border border-line shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <h4 className="text-sm font-bold text-ink flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#0E8F5D]" />
                Etsy Connector Scope & Capability Matrix
              </h4>
              <span className="text-meta text-ink-tertiary">Real-time OAuth scope validation</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Shop & Listing Read */}
              <div className="p-3 rounded-xl border border-line bg-[#FAFAF8] space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-ink">{ownShop.capabilities.shopRead.label}</span>
                  <span className="px-2 py-0.5 rounded text-label-sm font-bold bg-[#E7FAF1] text-[#0E8F5D]">
                    ✓ {ownShop.capabilities.shopRead.state}
                  </span>
                </div>
                <p className="text-meta text-ink-secondary leading-snug">
                  {ownShop.capabilities.shopRead.details}
                </p>
              </div>

              {/* Draft Creation */}
              <div className="p-3 rounded-xl border border-line bg-[#FAFAF8] space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-ink">{ownShop.capabilities.draftCreation.label}</span>
                  <span className="px-2 py-0.5 rounded text-label-sm font-bold bg-[#FFF9EB] text-[#664400]">
                    ⚠ {ownShop.capabilities.draftCreation.state}
                  </span>
                </div>
                <p className="text-meta text-ink-secondary leading-snug">
                  {ownShop.capabilities.draftCreation.details}
                </p>
              </div>

              {/* Direct Publishing (Rule 9 Gate) */}
              <div className="p-3 rounded-xl border border-line bg-[#FAFAF8] space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-ink">{ownShop.capabilities.directPublishing.label}</span>
                  <span className="px-2 py-0.5 rounded text-label-sm font-bold bg-surface-secondary text-ink-tertiary">
                    🔒 {ownShop.capabilities.directPublishing.state}
                  </span>
                </div>
                <p className="text-meta text-ink-secondary leading-snug">
                  {ownShop.capabilities.directPublishing.details}
                </p>
              </div>
            </div>
          </div>

          {/* Level 3: Optimization Queue */}
          <div className="p-5 rounded-2xl bg-white border border-line shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <div>
                <h4 className="text-sm font-bold text-ink flex items-center gap-2">
                  <Zap className="h-4 w-4 text-[#FFB020]" />
                  Listing Optimization Queue ({ownShop.optimizationQueue.length} items)
                </h4>
                <p className="text-sm text-ink-tertiary">
                  Listings with missing 13-tag slots or velocity trailing category forecast.
                </p>
              </div>
              <Link
                href="/seo"
                className="text-sm font-bold text-[#0E8F5D] hover:underline"
              >
                Open Full SEO Engine →
              </Link>
            </div>

            <div className="space-y-3">
              {ownShop.optimizationQueue.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-line bg-[#FAFAF8] space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="px-2 py-0.5 rounded text-label-sm font-bold bg-[#FFF9EB] text-[#664400]">
                          {item.tagSlotsRemaining > 0 ? `${item.tagSlotsRemaining} Empty Tag Slots` : "Below Velocity Forecast"}
                        </span>
                        <span className="text-ink-tertiary text-meta">Listing #{item.listingId}</span>
                        <DataProvenanceBadge type="SELLERSALT_SCORE" />
                      </div>
                      <h5 className="text-sm font-bold text-ink">{item.title}</h5>
                      <p className="text-meta text-ink-secondary">{item.underperformanceReason}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-label-sm uppercase text-ink-tertiary font-bold">SEO Score</div>
                        <div className="text-sm font-extrabold text-[#0E8F5D]">{item.seoScore}/100</div>
                      </div>
                      <Link
                        href={item.nextAction.actionHref || "/seo"}
                        className="px-3 py-1.5 rounded-lg text-sm font-bold bg-[#141B16] text-white hover:bg-[#202C23] transition shadow-2xs"
                      >
                        {item.nextAction.actionLabel} →
                      </Link>
                    </div>
                  </div>

                  <WhyThisMatters action={item.nextAction} compact={true} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    )}

      {/* TAB 4: OPPORTUNITY COMPARISON & DECISION MODE */}
      {activeMainTab === "COMPARISON" && (
        <div className="p-5 rounded-2xl bg-white border border-line shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                <Scale className="h-5 w-5 text-[#0E8F5D]" />
                Multi-Opportunity Comparison & Decision Mode
              </h3>
              <p className="text-sm text-ink-tertiary">
                Evaluate trade-offs across margins, demand velocity, review barriers, and launch safety.
              </p>
            </div>
            <DataProvenanceBadge type="SELLERSALT_SCORE" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {opportunities.slice(0, 3).map((opp, idx) => (
              <div
                key={opp.id}
                className="p-4 rounded-xl border border-line bg-[#FAFAF8] space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-label-sm font-bold bg-[#141B16] text-white">
                      {idx === 0 ? "🏆 Top Opportunity" : idx === 1 ? "💰 Top Margin" : "🛡️ Safest Entry"}
                    </span>
                    <span className="text-sm font-extrabold text-[#0E8F5D]">{opp.opportunityScore}/100</span>
                  </div>

                  <h5 className="text-sm font-bold text-ink line-clamp-2 leading-tight">
                    {opp.listingTitle}
                  </h5>

                  <div className="space-y-1 text-sm pt-1">
                    <div className="flex justify-between">
                      <span className="text-ink-tertiary">Category:</span>
                      <strong className="text-ink truncate max-w-[140px]">{opp.category}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-tertiary">Price:</span>
                      <strong className="text-ink">${opp.economics.price.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-tertiary">Est. Daily Sales:</span>
                      <strong className="text-ink">{opp.demand.estDailySales.toFixed(1)}/day</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-tertiary">Net Margin:</span>
                      <strong className="text-[#0E8F5D]">{opp.economics.marginPercent}% (${opp.economics.estNetProfit})</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-tertiary">Active Listings:</span>
                      <strong className="text-ink">{opp.competition.activeListings}</strong>
                    </div>
                  </div>
                </div>

                <Link
                  href={opp.nextBestAction.actionHref || "/planner"}
                  className="w-full text-center px-3 py-1.5 text-sm font-bold rounded-lg bg-[#141B16] text-white hover:bg-[#202C23] transition"
                >
                  Advance to Strategy →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
