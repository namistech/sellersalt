"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Radar } from "lucide-react";
import { PageHeader } from "@/components/shell";
import { Button, PlanUsageCard } from "@/components/ui";
import { NewSearchDrawer } from "../new-search-drawer";
import { createSearchConfig, type CreateSearchConfigInput } from "@/services/searchConfigs";
import type { ConnectorSummary } from "@/services/connectors";
import type { DashboardData } from "@/services/dashboard";
import { DashboardPulse } from "./dashboard-pulse";
import { DashboardOpportunities } from "./dashboard-opportunities";
import { DashboardCompetitorRadar } from "./dashboard-competitor-radar";
import { DashboardMomentum } from "./dashboard-momentum";
import { DashboardStreams } from "./dashboard-streams";
import { DashboardOnboardingGuide } from "./dashboard-onboarding-guide";
import { AssistantDailyBriefing } from "./assistant-daily-briefing";
import { DashboardCommandCenter } from "./dashboard-command-center";

interface DashboardClientProps {
  initialData: DashboardData;
  connectors: ConnectorSummary[];
  userName: string;
  organizationId?: string;
}

export function DashboardClient({ initialData, connectors, userName, organizationId = "org_default" }: DashboardClientProps) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [drawerOpen, setDrawerOpen] = useState(false);

  async function handleCreateSearch(input: CreateSearchConfigInput) {
    await createSearchConfig(input);
    setDrawerOpen(false);
    // Reload page to refresh all server-side aggregates
    window.location.reload();
  }

  const { pulse } = data;
  const statusSubtitle =
    pulse.activeSearches > 0 || pulse.pendingProspects > 0
      ? `${pulse.activeSearches} active saved search${pulse.activeSearches === 1 ? "" : "es"} · ${pulse.pendingProspects} prospect${pulse.pendingProspects === 1 ? "" : "s"} awaiting review`
      : "Start discovering high-velocity Etsy products and tracking competitor momentum.";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Welcome back, ${userName}`}
        description={statusSubtitle}
        primaryAction={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" leadingIcon={<Radar className="h-4 w-4 text-accent" />} href="/spy">
              Market Research
            </Button>
            <Button variant="primary" leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setDrawerOpen(true)}>
              New search
            </Button>
          </div>
        }
      />

      {/* Onboarding Guide / Fast-Start Launchpad */}
      <DashboardOnboardingGuide
        hasActiveSearches={pulse.activeSearches > 0}
        hasTrackedShops={data.competitorRadar.length > 0}
        hasProspects={pulse.totalProspects > 0 || data.topOpportunities.length > 0}
      />

      {/* Quick Actions Command Center Bar */}
      <div className="p-3.5 rounded-2xl bg-white border border-line shadow-xs flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-bold text-ink flex items-center gap-1.5 px-2 text-[11px] uppercase tracking-wider text-ink-tertiary">
          ⚡ Quick Intelligence:
        </span>
        <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
          <Link
            href="/radar"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-[#FAFAF8] hover:bg-white hover:border-[#0E8F5D] text-ink font-semibold transition-all shadow-2xs"
          >
            <span>🔥</span> Find Products
          </Link>
          <Link
            href="/categories"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-[#FAFAF8] hover:bg-white hover:border-[#0E8F5D] text-ink font-semibold transition-all shadow-2xs"
          >
            <span>📁</span> Explore Categories
          </Link>
          <Link
            href="/keyword-research"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-[#FAFAF8] hover:bg-white hover:border-[#0E8F5D] text-ink font-semibold transition-all shadow-2xs"
          >
            <span>#</span> Keyword Research
          </Link>
          <Link
            href="/spy"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-[#FAFAF8] hover:bg-white hover:border-[#0E8F5D] text-ink font-semibold transition-all shadow-2xs"
          >
            <span>📊</span> Market Research
          </Link>
          <Link
            href="/planner"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-[#FAFAF8] hover:bg-white hover:border-[#0E8F5D] text-ink font-semibold transition-all shadow-2xs"
          >
            <span>📑</span> Open Planner
          </Link>
        </div>
      </div>

      {/* Seller Assistant Daily Intelligence Briefing */}
      <AssistantDailyBriefing
        userName={userName}
        activeSearchesCount={pulse.activeSearches}
        trackedCompetitorsCount={data.competitorRadar.length}
        topOpportunityCount={data.topOpportunities.length}
      />

      {/* Seller Intelligence Operating System 2.0 Command Center */}
      <DashboardCommandCenter organizationId={organizationId} userName={userName} />

      {/* Row 1: Research Pulse */}
      <DashboardPulse pulse={pulse} />

      {/* Row 1.5: Plan & Usage Quota */}
      <PlanUsageCard
        planName="Starter Tier"
        keywordUsage={{ current: pulse.activeSearches * 25 + 12, limit: 250 }}
        productUsage={{ current: pulse.totalProspects, limit: 150 }}
        seoUsage={{ current: 6, limit: 25 }}
        competitorUsage={{ current: pulse.trackedShops, limit: pulse.maxTrackedShops || 10 }}
      />

      {/* Row 2: Actionable Intelligence (Top Opportunities + Competitor Radar) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DashboardOpportunities
          opportunities={data.topOpportunities}
          onNewSearch={() => setDrawerOpen(true)}
        />
        <DashboardCompetitorRadar competitors={data.competitorRadar} />
      </div>

      {/* Row 3: Research Velocity & Streams (Discovery Momentum + Active Streams) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DashboardMomentum data={data.prospectsByDay} />
        <DashboardStreams
          streams={data.searchStreams}
          recentRuns={data.recentRuns}
          onNewSearch={() => setDrawerOpen(true)}
        />
      </div>

      {/* Quick Search Drawer */}
      <NewSearchDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        connectors={connectors}
        onSubmit={handleCreateSearch}
      />
    </div>
  );
}
