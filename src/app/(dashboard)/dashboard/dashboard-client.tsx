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
import type { PlanUsageSummary } from "@/services/plans/quota-enforcement";
import { DashboardPulse } from "./dashboard-pulse";
import { DashboardOpportunities } from "./dashboard-opportunities";
import { DashboardCompetitorRadar } from "./dashboard-competitor-radar";
import { DashboardMomentum } from "./dashboard-momentum";
import { DashboardStreams } from "./dashboard-streams";
import { DashboardOnboardingGuide } from "./dashboard-onboarding-guide";
import { AssistantDailyBriefing } from "./assistant-daily-briefing";
import { DashboardCommandCenter } from "./dashboard-command-center";
import { UnifiedSearchEntry } from "@/components/research/UnifiedSearchEntry";
import {
  PersonalizedContinuationSection,
  type ActivityItem,
} from "@/components/dashboard/PersonalizedContinuationSection";

interface DashboardClientProps {
  initialData: DashboardData;
  connectors: ConnectorSummary[];
  userName: string;
  organizationId?: string;
  planUsage: PlanUsageSummary | null;
  onboardingCategory: string | null;
  onboardingGoal: string | null;
  hasListingDraft: boolean;
  recentActivities?: ActivityItem[];
}

export function DashboardClient({
  initialData,
  connectors,
  userName,
  organizationId = "org_default",
  planUsage,
  onboardingCategory,
  onboardingGoal,
  hasListingDraft,
  recentActivities = [],
}: DashboardClientProps) {
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
      : "Turn observable marketplace signals into evidence-based product decisions.";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Welcome back, ${userName}`}
        description={statusSubtitle}
        primaryAction={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" leadingIcon={<Radar className="h-4 w-4 text-accent" />} href="/discovery">
              Discover Opportunities
            </Button>
            <Button variant="primary" leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setDrawerOpen(true)}>
              New search
            </Button>
          </div>
        }
      />

      {/* Central Unified Search Console */}
      <UnifiedSearchEntry />

      {/* Real Activation & Onboarding Guide */}
      <DashboardOnboardingGuide
        hasActiveSearches={pulse.activeSearches > 0}
        hasTrackedShops={data.competitorRadar.length > 0}
        hasProspects={pulse.totalProspects > 0 || data.topOpportunities.length > 0}
        onboardingCategory={onboardingCategory}
        onboardingGoal={onboardingGoal}
        hasListingDraft={hasListingDraft}
      />

      {/* Personalized Continuation & Real Activity Hub */}
      <PersonalizedContinuationSection
        recentActivities={recentActivities}
        userName={userName}
      />

      {/* Seller Intelligence Operating System 2.0 Command Center */}
      <DashboardCommandCenter organizationId={organizationId} userName={userName} />

      {/* Row 1: Research Pulse */}
      <DashboardPulse pulse={pulse} />

      {/* Row 1.5: Plan & Usage Quota — real data from getPlanUsageSummary()
          server-side, or null (renders an honest unavailable state). */}
      <PlanUsageCard
        planName={planUsage?.planName ?? null}
        keywordUsage={planUsage ? { current: planUsage.keywordSearch.current, limit: planUsage.keywordSearch.limit } : null}
        productUsage={planUsage ? { current: planUsage.productResearch.current, limit: planUsage.productResearch.limit } : null}
        seoUsage={planUsage ? { current: planUsage.seoAudit.current, limit: planUsage.seoAudit.limit } : null}
        competitorUsage={planUsage ? { current: planUsage.trackedShop.current, limit: planUsage.trackedShop.limit } : null}
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
