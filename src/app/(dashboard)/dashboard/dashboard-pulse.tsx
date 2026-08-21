"use client";

import Link from "next/link";
import { MetricCard } from "@/components/data";
import type { DashboardPulseStats } from "@/services/dashboard";

interface DashboardPulseProps {
  pulse: DashboardPulseStats;
}

export function DashboardPulse({ pulse }: DashboardPulseProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Link href="/prospects" className="transition-transform hover:-translate-y-0.5 sm:col-span-2 lg:col-span-2">
        <MetricCard
          featured
          label="Prospects Found"
          value={pulse.totalProspects}
          comparisonLabel={`${pulse.pendingProspects} awaiting review`}
        />
      </Link>

      <Link href="/prospects?tab=saved" className="transition-transform hover:-translate-y-0.5">
        <MetricCard
          label="Active Searches"
          value={pulse.activeSearches}
          comparisonLabel={`${pulse.scheduledSearches} scheduled · ${pulse.maxSearches} limit`}
        />
      </Link>

      <Link href="/shop-intelligence/tracked" className="transition-transform hover:-translate-y-0.5">
        <MetricCard
          label="Tracked Competitors"
          value={pulse.trackedShops}
          comparisonLabel={`${pulse.freshTrackedShops} updated recently · ${pulse.maxTrackedShops} limit`}
        />
      </Link>

      <Link href="/favorites" className="transition-transform hover:-translate-y-0.5">
        <MetricCard
          label="Saved Opportunities"
          value={pulse.savedOpportunities}
          comparisonLabel={`${pulse.shortlistedProspects} shortlisted · ${pulse.favoriteProspects} starred`}
        />
      </Link>
    </div>
  );
}
