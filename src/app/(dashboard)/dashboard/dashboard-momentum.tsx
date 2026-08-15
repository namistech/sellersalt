"use client";

import { Card, Heading, Text } from "@/components/ui";
import { AreaChart, type ChartState } from "@/components/data";

interface DashboardMomentumProps {
  data: Array<{ day: string; count: number }>;
}

export function DashboardMomentum({ data }: DashboardMomentumProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const state: ChartState = data.length === 0 ? "empty" : "ready";

  return (
    <Card padding="lg" className="flex flex-col justify-between">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <Heading as="h2" size="h4">
              Discovery Momentum
            </Heading>
            <Text size="body-sm" color="secondary" className="mt-0.5">
              Prospects yielded across all search streams over the last 14 days.
            </Text>
          </div>
          <div className="text-right">
            <Text as="div" size="label-sm" color="secondary" className="uppercase">
              14-Day Yield
            </Text>
            <Heading as="h3" size="h3" className="text-accent font-tabular">
              {total.toLocaleString()}
            </Heading>
          </div>
        </div>

        <AreaChart
          data={data}
          xKey="day"
          series={[{ key: "count", label: "Prospects found", colorIndex: 0 }]}
          state={state}
          emptyMessage="No discovery momentum yet — run a search to see your yield graph populate."
          accessibleSummary="Prospects discovered per day over the last 14 days"
          height={230}
        />
      </div>

      <div className="mt-4 pt-3 border-t border-line-subtle flex items-center justify-between text-meta text-ink-tertiary">
        <span>Real lifetime marketplace data capture</span>
        <span>Auto-updated on search completion</span>
      </div>
    </Card>
  );
}
