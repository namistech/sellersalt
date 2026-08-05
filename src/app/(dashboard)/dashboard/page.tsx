import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function OverviewPage() {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;

  if (!organizationId) {
    return <EmptyOrgState />;
  }

  const [connectorCount, prospectCount, recentJobs] = await Promise.all([
    prisma.connector.count({ where: { organizationId } }),
    prisma.prospect.count({ where: { organizationId } }),
    prisma.job.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { searchConfig: true },
    }),
  ]);

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Overview</h1>
        <p className="mt-1 text-sm text-muted">Sourcing intelligence across your connected marketplaces.</p>
      </header>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <StatCard label="Connected marketplaces" value={connectorCount} />
        <StatCard label="Prospects found" value={prospectCount} />
        <StatCard label="Plan" value="Free" isText />
      </div>

      {connectorCount === 0 ? (
        <div className="card">
          <h2 className="mb-1 text-sm font-semibold text-ink">Connect your first marketplace</h2>
          <p className="mb-4 text-sm text-muted">
            Add an Etsy connection to start finding sourcing prospects. Amazon, AliExpress, and
            Shopify connectors are coming in phase 2.
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
                  <div className="text-xs text-muted">
                    {new Date(job.createdAt).toLocaleString()}
                  </div>
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

function StatCard({ label, value, isText }: { label: string; value: number | string; isText?: boolean }) {
  return (
    <div className="card">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-2 ${isText ? "text-lg" : "text-3xl"} font-semibold tabular-nums text-ink`}>
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    QUEUED: "bg-gray-100 text-gray-600",
    RUNNING: "bg-accent-soft text-accent-dark",
    SUCCESS: "bg-green-50 text-success",
    FAILED: "bg-red-50 text-danger",
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
