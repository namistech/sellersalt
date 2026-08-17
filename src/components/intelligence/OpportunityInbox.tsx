"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  SlidersHorizontal,
  Flame,
  Zap,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Tag,
  ShieldCheck,
  Eye,
  RotateCcw,
  Archive,
  Layers,
  Scale,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
} from "lucide-react";
import type { CanonicalOpportunity, OpportunityPipelineStage } from "@/types/opportunity";
import { DataProvenanceBadge } from "@/components/data/DataProvenanceBadge";
import { WhyThisMatters } from "./WhyThisMatters";
import {
  dismissOpportunity,
  reopenOpportunity,
  updateOpportunityStage,
  compareOpportunities,
} from "@/services/opportunity-memory";

export interface OpportunityInboxProps {
  initialOpportunities: CanonicalOpportunity[];
  organizationId: string;
  onCompareSelect?: (selected: CanonicalOpportunity[]) => void;
}

export function OpportunityInbox({
  initialOpportunities,
  organizationId,
  onCompareSelect,
}: OpportunityInboxProps) {
  const [opportunities, setOpportunities] = useState<CanonicalOpportunity[]>(initialOpportunities);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"score" | "velocity" | "margin" | "freshness">("score");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showComparisonModal, setShowComparisonModal] = useState(false);

  // Tabs
  const tabs = [
    { id: "ALL", label: "All Active", icon: "🌐" },
    { id: "HIGH_OPPORTUNITY", label: "High Opportunity (≥75)", icon: "🔥" },
    { id: "COMPETITOR", label: "Competitor Signals", icon: "👁️" },
    { id: "KEYWORDS", label: "Keyword Clusters", icon: "#" },
    { id: "IN_PROGRESS", label: "In Pipeline", icon: "⚡" },
    { id: "OWN_SHOP", label: "Own Shop", icon: "🛍️" },
    { id: "DISMISSED", label: "Dismissed", icon: "🗑️" },
  ];

  // Filtering & Sorting
  const filtered = useMemo(() => {
    let list = [...opportunities];

    if (activeTab === "DISMISSED") {
      list = list.filter((o) => o.isDismissed);
    } else {
      list = list.filter((o) => !o.isDismissed);

      if (activeTab === "HIGH_OPPORTUNITY") {
        list = list.filter((o) => o.opportunityScore >= 75);
      } else if (activeTab === "COMPETITOR") {
        list = list.filter((o) => o.source === "COMPETITOR_SURVEILLANCE" || o.source === "SHOP_INTELLIGENCE");
      } else if (activeTab === "KEYWORDS") {
        list = list.filter((o) => o.source === "KEYWORD_RESEARCH");
      } else if (activeTab === "OWN_SHOP") {
        list = list.filter((o) => o.source === "OWN_SHOP");
      } else if (activeTab === "IN_PROGRESS") {
        list = list.filter((o) => ["SHORTLISTED", "STRATEGY", "CONTENT", "DRAFT", "REVIEW"].includes(o.stage));
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (o) =>
          o.listingTitle.toLowerCase().includes(q) ||
          (o.shopName && o.shopName.toLowerCase().includes(q)) ||
          o.primaryKeyword.toLowerCase().includes(q) ||
          (o.category && o.category.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      if (sortBy === "velocity") return b.demand.estDailySales - a.demand.estDailySales;
      if (sortBy === "margin") return b.economics.marginPercent - a.economics.marginPercent;
      if (sortBy === "freshness") return new Date(b.lastObservedAt).getTime() - new Date(a.lastObservedAt).getTime();
      return b.opportunityScore - a.opportunityScore;
    });

    return list;
  }, [opportunities, activeTab, searchQuery, sortBy]);

  // Actions
  function handleDismiss(id: string) {
    const updated = dismissOpportunity(organizationId, id);
    if (updated) {
      setOpportunities((prev) => prev.map((o) => (o.id === id ? { ...updated } : o)));
    }
  }

  function handleReopen(id: string) {
    const updated = reopenOpportunity(organizationId, id);
    if (updated) {
      setOpportunities((prev) => prev.map((o) => (o.id === id ? { ...updated } : o)));
    }
  }

  function handleStageChange(id: string, stage: OpportunityPipelineStage) {
    const updated = updateOpportunityStage(organizationId, id, stage);
    if (updated) {
      setOpportunities((prev) => prev.map((o) => (o.id === id ? { ...updated } : o)));
    }
  }

  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  const selectedOpportunities = opportunities.filter((o) => selectedIds.has(o.id));
  const tradeoffs = useMemo(() => compareOpportunities(selectedOpportunities), [selectedOpportunities]);

  return (
    <div className="space-y-4">
      {/* Inbox Header & Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-line shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              <span>📥</span> Opportunity Inbox & Execution Queue
            </h3>
            <p className="text-xs text-ink-tertiary">
              Unified operating queue across Product Research, Keywords, Surveillance, and Extension discoveries.
            </p>
          </div>

          {/* Compare Selected Button */}
          {selectedIds.size >= 2 && (
            <button
              type="button"
              onClick={() => setShowComparisonModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#16C784] hover:bg-[#13AD73] text-[#141B16] transition shadow-xs"
            >
              <Scale className="h-4 w-4" />
              <span>Compare Selected ({selectedIds.size})</span>
            </button>
          )}
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-line pb-2.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === t.id
                  ? "bg-[#141B16] text-white shadow-2xs"
                  : "bg-surface-secondary hover:bg-surface text-ink-secondary"
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-tertiary" />
            <input
              type="text"
              placeholder="Search by title, shop, keyword, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-line bg-[#FAFAF8] focus:bg-white focus:outline-none focus:border-[#0E8F5D] transition"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-ink-tertiary">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-line bg-white text-ink font-medium focus:outline-none focus:border-[#0E8F5D]"
            >
              <option value="score">Opportunity Score</option>
              <option value="velocity">Sales Velocity</option>
              <option value="margin">Net Profit Margin</option>
              <option value="freshness">Recency / Freshness</option>
            </select>
          </div>
        </div>
      </div>

      {/* Opportunity List */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-line space-y-4 max-w-xl mx-auto shadow-xs">
          <div className="h-12 w-12 rounded-2xl bg-[#E7FAF1] text-[#0E8F5D] flex items-center justify-center mx-auto text-xl">
            📥
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-ink">No opportunities in your queue yet</h4>
            <p className="text-xs text-ink-secondary leading-relaxed">
              When you find high-potential products in Opportunity Radar, Keyword Hunter, or Shop Surveillance, save them to your workspace to track them here.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <Link
              href="/radar"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#0E8F5D] hover:bg-[#0C7A52] text-white transition shadow-2xs"
            >
              Opportunity Radar →
            </Link>
            <Link
              href="/keywords"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-line bg-surface-secondary hover:bg-surface text-ink transition"
            >
              Keyword Hunter
            </Link>
            <Link
              href="/spy"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-line bg-surface-secondary hover:bg-surface text-ink transition"
            >
              Shop Surveillance
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filtered.map((opp) => (
            <div
              key={opp.id}
              className={`p-4 rounded-2xl border transition shadow-xs ${
                opp.isDismissed
                  ? "bg-surface-secondary/60 border-line/60 opacity-70"
                  : selectedIds.has(opp.id)
                  ? "bg-[#F4FAF6] border-[#0E8F5D]"
                  : "bg-white border-line hover:border-line-strong"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                {/* Left: Checkbox + Identity */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(opp.id)}
                    onChange={() => toggleSelect(opp.id)}
                    className="mt-1 h-4 w-4 rounded border-line text-[#0E8F5D] focus:ring-[#0E8F5D]"
                    title="Select to compare"
                  />

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold text-ink uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-surface-secondary">
                        {opp.source.replace("_", " ")}
                      </span>
                      <span className="font-semibold text-[#0E8F5D] text-[11px]">
                        Stage: {opp.stage}
                      </span>
                      <DataProvenanceBadge type={opp.provenance} />
                    </div>

                    <h4 className="text-sm font-bold text-ink leading-snug">
                      {opp.listingTitle}
                    </h4>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-ink-tertiary">
                      {opp.shopName && (
                        <span>
                          Shop: <strong className="text-ink">{opp.shopName}</strong>
                        </span>
                      )}
                      <span>
                        Keyword: <strong className="text-ink">{opp.primaryKeyword}</strong>
                      </span>
                      {opp.category && (
                        <span>
                          Category: <strong className="text-ink">{opp.category}</strong>
                        </span>
                      )}
                      {opp.listingUrl && (
                        <a
                          href={opp.listingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-accent hover:underline"
                        >
                          <span>View on Etsy</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Score + Metrics */}
                <div className="flex flex-wrap items-center gap-3 md:justify-end">
                  {/* Score Pill */}
                  <div className="px-3 py-2 rounded-xl bg-[#141B16] text-white text-center min-w-[90px]">
                    <div className="text-[10px] uppercase font-bold text-[#FFB020]">Score</div>
                    <div className="text-base font-extrabold text-[#16C784]">
                      {opp.opportunityScore}
                      <span className="text-[10px] text-[#9EAA9F] font-normal">/100</span>
                    </div>
                  </div>

                  {/* Demand Pill */}
                  <div className="px-3 py-2 rounded-xl bg-surface-secondary border border-line text-center min-w-[90px]">
                    <div className="text-[10px] uppercase font-bold text-ink-tertiary">Velocity</div>
                    <div className="text-xs font-bold text-ink">
                      {opp.demand.estDailySales.toFixed(1)} <span className="font-normal text-[10px]">/day</span>
                    </div>
                  </div>

                  {/* Margin Pill */}
                  <div className="px-3 py-2 rounded-xl bg-surface-secondary border border-line text-center min-w-[90px]">
                    <div className="text-[10px] uppercase font-bold text-ink-tertiary">Net Margin</div>
                    <div className="text-xs font-bold text-[#0E8F5D]">
                      {opp.economics.marginPercent}% <span className="font-normal text-[10px]">(${opp.economics.estNetProfit})</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Middle: Progressive Why This Matters */}
              <div className="mt-3.5">
                <WhyThisMatters action={opp.nextBestAction} defaultExpanded={false} />
              </div>

              {/* Footer Actions */}
              <div className="mt-3.5 pt-3 border-t border-line flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {!opp.isDismissed ? (
                    <>
                      {opp.stage === "RESEARCHED" && (
                        <button
                          type="button"
                          onClick={() => handleStageChange(opp.id, "SHORTLISTED")}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg border border-line bg-white hover:bg-surface text-ink transition"
                        >
                          ★ Shortlist
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDismiss(opp.id)}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg text-ink-tertiary hover:text-ink hover:bg-surface-secondary transition"
                      >
                        Dismiss
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleReopen(opp.id)}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#141B16] text-white hover:bg-[#202C23] transition"
                    >
                      Reopen Opportunity
                    </button>
                  )}
                </div>

                {/* Primary Next Action CTA */}
                {!opp.isDismissed && opp.nextBestAction.actionHref && (
                  <Link
                    href={opp.nextBestAction.actionHref}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#16C784] hover:bg-[#13AD73] text-[#141B16] transition shadow-2xs"
                  >
                    <span>{opp.nextBestAction.actionLabel}</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comparison Modal */}
      {showComparisonModal && selectedOpportunities.length >= 2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white border border-line shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                  <Scale className="h-5 w-5 text-[#0E8F5D]" />
                  Opportunity Comparison & Decision Mode
                </h3>
                <p className="text-xs text-ink-tertiary">
                  Multi-dimensional tradeoff analysis across demand, margins, review moats, and entry safety.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowComparisonModal(false)}
                className="text-ink-tertiary hover:text-ink text-sm font-bold px-2 py-1"
              >
                ✕ Close
              </button>
            </div>

            {/* Tradeoff Summary Callout */}
            <div className="p-4 rounded-xl bg-[#141B16] text-white space-y-2 border border-[#2A362D]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#FFB020] flex items-center gap-1.5">
                🧠 Strategic Tradeoff Analysis
              </span>
              <p className="text-xs leading-relaxed text-[#D2DDD3]">
                {tradeoffs.comparisonSummary}
              </p>
            </div>

            {/* Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {selectedOpportunities.map((opp) => {
                const isBestOpp = opp.id === tradeoffs.bestOpportunityId;
                const isBestMargin = opp.id === tradeoffs.bestMarginId;
                const isSafest = opp.id === tradeoffs.safestEntryId;

                return (
                  <div
                    key={opp.id}
                    className="p-4 rounded-xl border border-line bg-[#FAFAF8] space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-1">
                        {isBestOpp && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFB020] text-[#141B16]">
                            🏆 Best Opportunity
                          </span>
                        )}
                        {isBestMargin && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#16C784] text-[#141B16]">
                            💰 Best Margin
                          </span>
                        )}
                        {isSafest && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#4E9FFF] text-[#141B16]">
                            🛡️ Safest Entry
                          </span>
                        )}
                      </div>

                      <h5 className="text-xs font-bold text-ink leading-tight line-clamp-2">
                        {opp.listingTitle}
                      </h5>

                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-ink-tertiary">Opp Score:</span>
                          <strong className="text-ink">{opp.opportunityScore}/100</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-tertiary">Est. Daily Sales:</span>
                          <strong className="text-ink">{opp.demand.estDailySales.toFixed(1)}/day</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-tertiary">Net Profit Margin:</span>
                          <strong className="text-[#0E8F5D]">{opp.economics.marginPercent}% (${opp.economics.estNetProfit})</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-tertiary">Active Listings:</span>
                          <strong className="text-ink">{opp.competition.activeListings}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-tertiary">Review Count:</span>
                          <strong className="text-ink">{opp.competition.reviewCount}</strong>
                        </div>
                      </div>
                    </div>

                    <Link
                      href={opp.nextBestAction.actionHref || "/planner"}
                      className="w-full text-center px-3 py-1.5 text-xs font-bold rounded-lg bg-[#141B16] text-white hover:bg-[#202C23] transition"
                    >
                      Advance to Planner →
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
