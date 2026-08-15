import { getServerSession } from "next-auth";
import { Store } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getDashboardData } from "@/services/dashboard";
import { PageHeader } from "@/components/shell";
import { Card, Button, Heading } from "@/components/ui";
import { MetricCard, EmptyState } from "@/components/data";
import { ProspectsOverTimeChart, JobStatusBreakdown } from "../dashboard-charts";
import { RecentJobsTable } from "../dashboard-recent-jobs";

export default async function OverviewPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { organizationId?: string; name?: string | null; email?: string | null } | undefined;
  const organizationId = user?.organizationId;
  const userName = user?.name ?? user?.email ?? "there";

  if (!organizationId) {
    return (
      <div>
        <PageHeader title="Overview" />
        <Card padding="lg">
          <EmptyState
            title="Your account isn't linked to a workspace yet"
            description="Try signing out and back in — if this persists, contact support."
          />
        </Card>
      </div>
    );
  }

  const data = await getDashboardData(organizationId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Welcome back, ${userName}`}
        description="Product hunting across Etsy, all in one dashboard — find winning shops, track competitors, and spot what's trending before everyone else does."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard label="Connected marketplaces" value={data.connectorCount} />
        <MetricCard label="Prospects found" value={data.prospectCount} />
        <MetricCard label="Shops being tracked" value={data.trackedShopCount} />
        <MetricCard
          label="Plan"
          value={data.plan ? data.plan.name : undefined}
          unavailable={!data.plan}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card padding="lg">
          <Heading as="h2" size="h4" className="mb-3">
            Prospects found — last 14 days
          </Heading>
          <ProspectsOverTimeChart data={data.prospectsByDay} />
        </Card>
        <Card padding="lg">
          <Heading as="h2" size="h4" className="mb-3">
            Job status breakdown
          </Heading>
          <JobStatusBreakdown data={data.jobStatusData} />
        </Card>
      </div>

      {data.connectorCount === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon={<Store />}
            title="Connect your first marketplace"
            description="Add an Etsy connection to start finding sourcing prospects."
            action={
              <Button variant="primary" href="/connectors">
                Add a connector
              </Button>
            }
          />
        </Card>
      ) : (
        <Card padding="lg">
          <Heading as="h2" size="h4" className="mb-4">
            Recent jobs
          </Heading>
          <RecentJobsTable jobs={data.recentJobs} />
          <Button variant="link" href="/jobs" className="mt-4">
            View all jobs →
          </Button>
        </Card>
      )}
    </div>
  );
}
