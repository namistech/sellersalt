import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrgPackage, checkLimit } from "@/lib/plan-limits";

export default async function BillingPage() {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) return null;

  const [currentPackage, allPackages, connectors, searchConfigs, scheduledSearches, trackedShops, prospects] =
    await Promise.all([
      getOrgPackage(organizationId),
      prisma.package.findMany({ where: { isCustom: false }, orderBy: { priceUsd: "asc" } }),
      checkLimit(organizationId, "connectors"),
      checkLimit(organizationId, "searchConfigs"),
      checkLimit(organizationId, "scheduledSearches"),
      checkLimit(organizationId, "trackedShops"),
      checkLimit(organizationId, "prospectsThisMonth"),
    ]);

  const usageRows = [
    { label: "Connectors", ...connectors },
    { label: "Saved searches", ...searchConfigs },
    { label: "Scheduled searches", ...scheduledSearches },
    { label: "Shops tracked", ...trackedShops },
    { label: "Prospects this month", ...prospects },
  ];

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Billing</h1>
        <p className="mt-1 text-sm text-muted">
          Self-serve payment isn't wired up yet — upgrades go through us directly for now.
        </p>
      </header>

      <div className="card mb-6">
        <h2 className="mb-4 text-sm font-semibold text-ink">
          Current plan: <span className="text-accent">{currentPackage.name}</span>
        </h2>
        <div className="space-y-3">
          {usageRows.map((row) => {
            const pct = row.limit > 0 ? Math.min(100, Math.round((row.current / row.limit) * 100)) : 0;
            const isNearLimit = pct >= 80;
            return (
              <div key={row.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted">{row.label}</span>
                  <span className={isNearLimit ? "font-medium text-warn" : "text-muted"}>
                    {row.current} / {row.limit}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                  <div
                    className={`h-full rounded-full ${isNearLimit ? "bg-warn" : "bg-accent"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {allPackages.map((pkg: (typeof allPackages)[number]) => {
          const isCurrent = pkg.id === currentPackage.id;
          return (
            <div key={pkg.id} className={`card ${isCurrent ? "border-accent" : ""}`}>
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink">{pkg.name}</h2>
                {isCurrent && <span className="badge bg-accent-soft text-accent">Current</span>}
              </div>
              <div className="mb-3 text-2xl font-semibold text-ink">
                ${pkg.priceUsd}
                {pkg.priceUsd > 0 && <span className="text-sm font-normal text-muted">/mo</span>}
              </div>
              <ul className="mb-4 space-y-1 text-xs text-muted">
                <li>{pkg.maxConnectors} connector(s)</li>
                <li>{pkg.maxSearchConfigs} saved searches</li>
                <li>{pkg.maxScheduledSearches} scheduled searches</li>
                <li>{pkg.maxTrackedShops} shops tracked</li>
                <li>{pkg.maxProspectsPerMonth.toLocaleString()} prospects/month</li>
              </ul>
              {isCurrent ? (
                <button className="btn-secondary w-full" disabled>
                  Current plan
                </button>
              ) : (
                <a
                  href={`mailto:hello@netdrix.com?subject=Upgrade to ${pkg.name}&body=I'd like to upgrade my Anadash workspace to the ${pkg.name} plan.`}
                  className="btn-primary block w-full text-center"
                >
                  {pkg.priceUsd > currentPackage.priceUsd ? "Upgrade" : "Switch"} to {pkg.name}
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
