import { getServerSession } from "next-auth";
import Link from "next/link";
import { Store, Search, Radar, Sparkles } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ProspectsOverTimeChart, JobStatusDonut } from "../dashboard-charts";

export default async function OverviewPage() {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  const userName = session?.user?.name ?? session?.user?.email ?? "there";

  if (!organizationId) {
    return <EmptyOrgState />;
  }

  const [connectorCount, prospectCount, trackedShopCount, recentJobs, jobStatusRaw, prospectsByDayRaw] =
    await Promise.all([
      prisma.connector.count({ where: { organizationId } }),
      prisma.prospect.count({ where: { organizationId } }),
      prisma.shopWatch.count({ where: { organizationId, isActive: true } }),
      prisma.job.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { searchConfig: true },
      }),
      prisma.job.groupBy({ by: ["status"], where: { organizationId }, _count: { status: true } }),
      prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
        SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*)::int AS count
        FROM "Prospect"
        WHERE "organizationId" = ${organizationId} AND "createdAt" >= NOW() - INTERVAL '14 days'
        GROUP BY day ORDER BY day ASC
      `,
    ]);

  const jobStatusData = jobStatusRaw.map((r: (typeof jobStatusRaw)[number]) => ({
    status: r.status,
    count: r._count.status,
  }));
  const prospectsByDay = prospectsByDayRaw.map((r: (typeof prospectsByDayRaw)[number]) => ({
    day: new Date(r.day).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    count: Number(r.count),
  }));

  return (
    <div>
      <div className="mb-6 overflow-hidden rounded-lg bg-gradient-to-br from-zinc-900 to-accent-dark p-6 text-white dark:from-zinc-950 dark:to-accent-dark">
        <div className="flex items-center gap-2 text-sm font-medium text-white/80">
          <Sparkles className="h-4 w-4" />
          Welcome back
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{userName}</h1>
        <p className="mt-2 max-w-xl text-sm text-white/80">
          Product hunting across Etsy and eBay, all in one dashboard — find winning shops, track
          competitors, and spot what's trending before everyone else does.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <DashStatCard icon={Store} label="Connected marketplaces" value={connectorCount} />
        <DashStatCard icon={Search} label="Prospects found" value={prospectCount} />
        <DashStatCard icon={Radar} label="Shops being tracked" value={trackedShopCount} />
        <DashStatCard icon={Sparkles} label="Plan" value="Free" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-ink">Prospects found — last 14 days</h2>
          <ProspectsOverTimeChart data={prospectsByDay} />
        </div>
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-ink">Job status breakdown</h2>
          <JobStatusDonut data={jobStatusData} />
        </div>
      </div>

      {connectorCount === 0 ? (
        <div className="card">
          <h2 className="mb-1 text-sm font-semibold text-ink">Connect your first marketplace</h2>
          <p className="mb-4 text-sm text-muted">
            Add an Etsy connection to start finding sourcing prospects. eBay is coming soon.
          </p>
          <Link href="/connectors" className="btn-primary">
            Add a connector
          </Link>
        </div>
      ) : (
        <div className="card">
          <h2 className="mb-4 text-sm font-semibold text-ink">Recent jobs</h2>
          <div className="divide-y divide-line">
            {recentJobs.length === 0 && <p className="py-3 text-sm text-muted">No runs yet.</p>}
            {recentJobs.map((job: (typeof recentJobs)[number]) => (
              <div key={job.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium text-ink">{job.searchConfig.name}</div>
                  <div className="text-xs text-muted">{new Date(job.createdAt).toLocaleString()}</div>
                </div>
                <StatusBadge status={job.status} />
              </div>
            ))}
          </div>
          <Link href="/jobs" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">
            View all jobs →
          </Link>
        </div>
      )}
    </div>
  );
}

function DashStatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
}) {
  return (
    <div className="card">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-soft text-accent">
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-3 text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    QUEUED: "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400",
    RUNNING: "bg-accent-soft text-accent",
    SUCCESS: "bg-green-50 text-success dark:bg-green-950/40",
    FAILED: "bg-red-50 text-danger dark:bg-red-950/40",
  };
  return <span className={`badge ${styles[status] ?? ""}`}>{status}</span>;
}

function EmptyOrgState() {
  return (
    <div className="card">
      <p className="text-sm text-muted">
        Your account isn't linked to a workspace yet. Try signing out and back in — if this
        persists, contact support.
      </p>
    </div>
  );
}
