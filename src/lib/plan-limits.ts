import { prisma } from "./db";

// `maxProspectsPerMonth` below is retained on the Package row for schema/
// historical continuity but is no longer the enforced or displayed source
// for product-research quota — it disagreed with the actually-enforced,
// publicly-promised numbers (see PLAN_DEFINITIONS.monthlyProductResearches
// in src/services/plans/plan-capabilities.ts) and was never itself wired to
// a real blocking check (checkLimit's old "prospectsThisMonth" resource was
// display-only, read from exactly one place, now removed). Product-research
// quota is authoritative via checkQuota(orgId, "PRODUCT_RESEARCH") — see
// src/services/plans/quota-enforcement.ts. Do not reintroduce a second,
// independently-numbered product-research limit here.
export const DEFAULT_PACKAGES = [
  {
    key: "FREE",
    name: "Free Explorer",
    priceUsd: 0,
    maxConnectors: 0,
    maxSearchConfigs: 1,
    maxScheduledSearches: 0,
    maxTrackedShops: 1,
    maxProspectsPerMonth: 15,
    maxSellerChannels: 0,
    maxTrackingDays: 1,
  },
  {
    key: "STARTED",
    name: "Started",
    priceUsd: 19,
    maxConnectors: 2,
    maxSearchConfigs: 5,
    maxScheduledSearches: 2,
    maxTrackedShops: 10,
    maxProspectsPerMonth: 500,
    maxSellerChannels: 1,
    maxTrackingDays: 3,
  },
  {
    key: "PRO",
    name: "Pro",
    priceUsd: 49,
    maxConnectors: 3,
    maxSearchConfigs: 20,
    maxScheduledSearches: 10,
    maxTrackedShops: 50,
    maxProspectsPerMonth: 5000,
    maxSellerChannels: 5,
    maxTrackingDays: 7,
  },
  {
    key: "AGENCY",
    name: "Agency",
    priceUsd: 199,
    maxConnectors: 10,
    maxSearchConfigs: 100,
    maxScheduledSearches: 50,
    maxTrackedShops: 250,
    maxProspectsPerMonth: 50000,
    maxSellerChannels: 25,
    maxTrackingDays: 30,
  },
];

/** Idempotent — creates standard tiers (including Free Explorer) if missing. */
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

  await ensureDefaultPackages();

  const fallbackKey = org.plan === "FREE" ? "FREE" : org.plan === "PRO" ? "PRO" : org.plan === "AGENCY" ? "AGENCY" : "STARTED";
  const pkg = await prisma.package.findUniqueOrThrow({ where: { key: fallbackKey } });
  await prisma.organization.update({ where: { id: organizationId }, data: { packageId: pkg.id } });
  return pkg;
}

export type LimitResource =
  | "connectors"
  | "searchConfigs"
  | "scheduledSearches"
  | "trackedShops"
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
    case "sellerChannels":
      current = await prisma.sellerChannel.count({ where: { organizationId, status: "ACTIVE" } });
      limit = pkg.maxSellerChannels;
      break;
  }

  return { allowed: current < limit, limit, current };
}
