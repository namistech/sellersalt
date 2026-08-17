import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrgPackage, checkLimit } from "@/lib/plan-limits";
import { Card, Heading, Text, Badge, Alert, Button } from "@/components/ui";
import { CheckoutButtons } from "./checkout-buttons";
import { CancelSubscriptionButton, ResumeSubscriptionButton } from "./cancel-subscription-button";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) return null;

  const [
    currentPackage,
    allPackages,
    subscription,
    connectors,
    searchConfigs,
    scheduledSearches,
    trackedShops,
    prospects,
    activeProviders,
  ] = await Promise.all([
    getOrgPackage(organizationId),
    prisma.package.findMany({ where: { isCustom: false }, orderBy: { priceUsd: "asc" } }),
    prisma.subscription.findUnique({ where: { organizationId } }),
    checkLimit(organizationId, "connectors"),
    checkLimit(organizationId, "searchConfigs"),
    checkLimit(organizationId, "scheduledSearches"),
    checkLimit(organizationId, "trackedShops"),
    checkLimit(organizationId, "prospectsThisMonth"),
    prisma.paymentProvider.findMany({ where: { isActive: true }, select: { provider: true, label: true } }),
  ]);

  const checkoutCapableProviders = activeProviders
    .map((p: (typeof activeProviders)[number]) => p.provider)
    .filter((p: string) => p === "STRIPE" || p === "PAYPAL" || p === "SAFEPAY" || p === "PAYFAST");

  const usageRows = [
    { label: "Active Saved Searches", ...searchConfigs },
    { label: "Scheduled Searches", ...scheduledSearches },
    { label: "Tracked Competitor Shops", ...trackedShops },
    { label: "Prospects Discovered This Month", ...prospects },
    { label: "Marketplace Connectors", ...connectors },
  ];

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <Heading as="h1" size="h2">
          Billing & Subscription
        </Heading>
        <Text size="body-md" color="secondary" className="mt-1">
          Manage your plan, check monthly search usage quotas, and upgrade your research capacity.
        </Text>
      </div>

      {checkout === "success" && (
        <Alert variant="success">
          Payment confirmed! Your subscription and plan limits will update automatically via live webhook.
        </Alert>
      )}
      {checkout === "cancelled" && (
        <Alert variant="info">Checkout session was cancelled — no charges were made.</Alert>
      )}

      {/* Plan Usage Card */}
      <Card padding="lg" className="border-line shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line-subtle pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink">Active Plan:</span>
              <Badge variant="success" className="font-bold text-brand-primary bg-brand-primary-subtle border border-brand-primary/20">
                {currentPackage.name} (${currentPackage.priceUsd}/mo)
              </Badge>
              {subscription?.cancelAtPeriodEnd && (
                <Badge variant="warning" className="text-xs">
                  Canceling on {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "period end"}
                </Badge>
              )}
            </div>
            <Text size="meta" color="secondary" className="mt-1">
              Includes full Opportunity Radar access, Etsy search scrapers, and daily competitor snapshots.
            </Text>
          </div>

          <div className="flex items-center gap-3">
            {subscription && subscription.cancelAtPeriodEnd && (
              <ResumeSubscriptionButton />
            )}
            {subscription && !subscription.cancelAtPeriodEnd && (subscription.status === "ACTIVE" || subscription.status === "TRIALING") && (
              <CancelSubscriptionButton
                provider={subscription.provider}
                currentPeriodEnd={subscription.currentPeriodEnd?.toISOString()}
              />
            )}
            {activeProviders.length > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-ink-tertiary">
                <span>Accepted:</span>
                {activeProviders.map((p) => (
                  <span key={p.provider} className="rounded bg-surface-muted px-2 py-0.5 font-medium text-ink-secondary border border-line-subtle">
                    {p.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quota Progress Bars */}
        <div className="space-y-4">
          <Text size="label-md" color="secondary" className="font-semibold">
            Monthly Quota Utilization
          </Text>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {usageRows.map((row) => {
              const pct = row.limit > 0 ? Math.min(100, Math.round((row.current / row.limit) * 100)) : 0;
              const isNearLimit = pct >= 80;
              return (
                <div key={row.label} className="rounded-lg border border-line-subtle bg-surface-muted p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-ink">{row.label}</span>
                    <span className={`font-mono ${isNearLimit ? "font-bold text-warn-strong" : "text-ink-secondary"}`}>
                      {row.current} / {row.limit}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                    <div
                      className={`h-full rounded-full transition-all ${isNearLimit ? "bg-warn" : "bg-brand-primary"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Plan Tiers Grid */}
      <div className="space-y-4">
        <Heading as="h2" size="h4">
          Available Subscription Tiers
        </Heading>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {allPackages.map((pkg) => {
            const isCurrent = pkg.id === currentPackage.id;
            return (
              <Card
                key={pkg.id}
                padding="lg"
                className={`flex flex-col justify-between border-line shadow-xs ${
                  isCurrent ? "border-brand-primary ring-1 ring-brand-primary/20 bg-surface" : "bg-surface"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-base text-ink">{pkg.name}</h3>
                    {isCurrent && (
                      <Badge variant="success" className="text-xs font-semibold text-brand-primary bg-brand-primary-subtle">
                        Current
                      </Badge>
                    )}
                  </div>

                  <div className="mb-4">
                    <span className="text-3xl font-extrabold text-ink">${pkg.priceUsd}</span>
                    <span className="text-xs text-ink-tertiary"> / month</span>
                  </div>

                  <ul className="space-y-2 text-xs text-ink-secondary mb-6">
                    <li className="flex items-center gap-1.5">
                      <span className="text-brand-primary font-bold">✓</span> {pkg.maxSearchConfigs} Saved Searches
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-brand-primary font-bold">✓</span> {pkg.maxScheduledSearches} Scheduled Searches
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-brand-primary font-bold">✓</span> {pkg.maxTrackedShops} Tracked Shops
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-brand-primary font-bold">✓</span> {pkg.maxProspectsPerMonth.toLocaleString()} Prospects/mo
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-brand-primary font-bold">✓</span> Opportunity Radar Access
                    </li>
                  </ul>
                </div>

                <div>
                  {isCurrent ? (
                    <Button variant="secondary" size="default" fullWidth disabled>
                      Active Tier
                    </Button>
                  ) : (
                    <CheckoutButtons
                      packageKey={pkg.key}
                      packageName={pkg.name}
                      currentPackageName={currentPackage.name}
                      isUpgrade={pkg.priceUsd > currentPackage.priceUsd}
                      availableProviders={checkoutCapableProviders}
                    />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
