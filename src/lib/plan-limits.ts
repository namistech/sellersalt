import { prisma } from "./db";

const DEFAULT_PACKAGES = [
  {
    key: "STARTED",
    name: "Started",
    priceUsd: 19,
    trialDays: 3,
    trialPriceUsd: 1,
    maxConnectors: 2,
    maxSearchConfigs: 5,
    maxScheduledSearches: 2,
    maxTrackedShops: 10,
    maxProspectsPerMonth: 500,
    maxSellerChannels: 1,
  },
  {
    key: "PRO",
    name: "Pro",
    priceUsd: 49,
    trialDays: 3,
    trialPriceUsd: 1,
    maxConnectors: 3,
    maxSearchConfigs: 20,
    maxScheduledSearches: 10,
    maxTrackedShops: 50,
    maxProspectsPerMonth: 5000,
    maxSellerChannels: 5,
  },
  {
    key: "AGENCY",
    name: "Agency",
    priceUsd: 199,
    trialDays: 3,
    trialPriceUsd: 1,
    maxConnectors: 10,
    maxSearchConfigs: 100,
    maxScheduledSearches: 50,
    maxTrackedShops: 250,
    maxProspectsPerMonth: 50000,
    maxSellerChannels: 25,
  },
];

/** Idempotent — creates the three standard tiers only if they don't already exist.
 * Called lazily rather than via a separate seed script, so there's nothing extra
 * to remember to run after a fresh deploy or migration. */
export async function ensureDefaultPackages() {
  const existing = await prisma.package.findMany({ where: { key: { in: DEFAULT_PACKAGES.map((p) => p.key) } } });
  const existingKeys = new Set(existing.map((p: (typeof existing)[number]) => p.key));
  const missing = DEFAULT_PACKAGES.filter((p) => !existingKeys.has(p.key));
  if (missing.length > 0) {
    await prisma.package.createMany({ data: missing });
  }
}

export async function getOrgPackage(organizationId: string) {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    include: { package: true },
  });
  if (org.package) return org.package;

  // No package assigned yet (e.g. an org created before this system existed) —
  // fall back to Started and assign it so future lookups don't repeat this.
  await ensureDefaultPackages();
  const started = await prisma.package.findUniqueOrThrow({ where: { key: "STARTED" } });
  await prisma.organization.update({ where: { id: organizationId }, data: { packageId: started.id } });
  return started;
}

export type LimitResource =
  | "connectors"
  | "searchConfigs"
  | "scheduledSearches"
  | "trackedShops"
  | "prospectsThisMonth"
  | "sellerChannels";

export async function checkLimit(
  organizationId: string,
  resource: LimitResource
): Promise<{ allowed: boolean; limit: number; current: number }> {
  const pkg = await getOrgPackage(organizationId);

  let current: number;
  let limit: number;

  switch (resource) {
    case "connectors":
      current = await prisma.connector.count({ where: { organizationId } });
      limit = pkg.maxConnectors;
      break;
    case "searchConfigs":
      current = await prisma.searchConfig.count({ where: { organizationId } });
      limit = pkg.maxSearchConfigs;
      break;
    case "scheduledSearches":
      current = await prisma.searchConfig.count({ where: { organizationId, scheduleCron: { not: null } } });
      limit = pkg.maxScheduledSearches;
      break;
    case "trackedShops":
      current = await prisma.shopWatch.count({ where: { organizationId, isActive: true } });
      limit = pkg.maxTrackedShops;
      break;
    case "prospectsThisMonth": {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      current = await prisma.prospect.count({ where: { organizationId, createdAt: { gte: startOfMonth } } });
      limit = pkg.maxProspectsPerMonth;
      break;
    }
    case "sellerChannels":
      current = await prisma.sellerChannel.count({ where: { organizationId, status: "ACTIVE" } });
      limit = pkg.maxSellerChannels;
      break;
  }

  return { allowed: current < limit, limit, current };
}
