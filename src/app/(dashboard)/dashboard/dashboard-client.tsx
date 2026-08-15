"use client";

import { useState } from "react";
import { Plus, Radar } from "lucide-react";
import { PageHeader } from "@/components/shell";
import { Button } from "@/components/ui";
import { NewSearchDrawer } from "../new-search-drawer";
import { createSearchConfig, type CreateSearchConfigInput } from "@/services/searchConfigs";
import type { ConnectorSummary } from "@/services/connectors";
import type { DashboardData } from "@/services/dashboard";
import { DashboardPulse } from "./dashboard-pulse";
import { DashboardOpportunities } from "./dashboard-opportunities";
import { DashboardCompetitorRadar } from "./dashboard-competitor-radar";
import { DashboardMomentum } from "./dashboard-momentum";
import { DashboardStreams } from "./dashboard-streams";

interface DashboardClientProps {
  initialData: DashboardData;
  connectors: ConnectorSummary[];
  userName: string;
}

export function DashboardClient({ initialData, connectors, userName }: DashboardClientProps) {
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
      ? `${pulse.activeSearches} active search stream${pulse.activeSearches === 1 ? "" : "s"} · ${pulse.pendingProspects} prospect${pulse.pendingProspects === 1 ? "" : "s"} awaiting review`
      : "Start discovering high-velocity Etsy products and tracking competitor momentum.";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Welcome back, ${userName}`}
        description={statusSubtitle}
        primaryAction={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" leadingIcon={<Radar className="h-4 w-4 text-accent" />} href="/spy">
              Spy on Competitor
            </Button>
            <Button variant="primary" leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setDrawerOpen(true)}>
              New search
            </Button>
          </div>
        }
      />

      {/* Row 1: Research Pulse */}
      <DashboardPulse pulse={pulse} />

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
