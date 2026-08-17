/**
 * SellerSalt Listing Content Studio & Versioning Engine
 * 
 * Manages structured listing composition, historical content versioning,
 * version diff comparisons, and non-destructive rollbacks.
 * 
 * Strict compliance with Section 5 (Never lose previous copy) and Section 22 (Data safety).
 */

export interface ListingContentVersion {
  id: string;
  organizationId: string;
  opportunityId: string;
  versionNumber: number;
  title: string;
  tags: string[];
  description: string;
  price: number;
  materials: string[];
  cogs?: number;
  createdAt: string;
  changeSummary: string;
  isCurrent: boolean;
  sourceKeywords?: string[];
  strategySnapshot?: any;
}

export interface ContentVersionDiff {
  titleChanged: boolean;
  titleBefore: string;
  titleAfter: string;
  tagsAdded: string[];
  tagsRemoved: string[];
  tagsRetained: string[];
  descriptionLengthDelta: number;
  priceDelta: number;
}

// In-memory tenant-scoped version store
const VERSION_STORE = new Map<string, ListingContentVersion[]>();

function getStoreKey(organizationId: string, opportunityId: string): string {
  return `${organizationId}::${opportunityId}`;
}

export function listContentVersions(
  organizationId: string,
  opportunityId: string
): ListingContentVersion[] {
  const key = getStoreKey(organizationId, opportunityId);
  const versions = VERSION_STORE.get(key) || [];
  return [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
}

export function saveContentVersion(
  organizationId: string,
  opportunityId: string,
  payload: {
    title: string;
    tags: string[];
    description: string;
    price: number;
    materials?: string[];
    cogs?: number;
    changeSummary?: string;
    sourceKeywords?: string[];
    strategySnapshot?: any;
  }
): ListingContentVersion {
  const key = getStoreKey(organizationId, opportunityId);
  const existing = VERSION_STORE.get(key) || [];
  
  // Mark previous current as false
  const updatedExisting = existing.map((v) => ({ ...v, isCurrent: false }));
  
  const nextVersionNumber = existing.length > 0 ? Math.max(...existing.map((v) => v.versionNumber)) + 1 : 1;
  
  const newVersion: ListingContentVersion = {
    id: `ver_${Date.now()}_${nextVersionNumber}`,
    organizationId,
    opportunityId,
    versionNumber: nextVersionNumber,
    title: payload.title,
    tags: payload.tags,
    description: payload.description,
    price: payload.price,
    materials: payload.materials || [],
    cogs: payload.cogs,
    createdAt: new Date().toISOString(),
    changeSummary: payload.changeSummary || `Version ${nextVersionNumber} created in Content Studio`,
    isCurrent: true,
    sourceKeywords: payload.sourceKeywords,
    strategySnapshot: payload.strategySnapshot,
  };

  VERSION_STORE.set(key, [newVersion, ...updatedExisting]);
  return newVersion;
}

export function restoreContentVersion(
  organizationId: string,
  opportunityId: string,
  versionId: string
): ListingContentVersion | null {
  const key = getStoreKey(organizationId, opportunityId);
  const existing = listContentVersions(organizationId, opportunityId);
  const target = existing.find((v) => v.id === versionId);
  if (!target) return null;

  // Create a new version restoring the selected target copy
  return saveContentVersion(organizationId, opportunityId, {
    title: target.title,
    tags: target.tags,
    description: target.description,
    price: target.price,
    materials: target.materials,
    cogs: target.cogs,
    changeSummary: `Restored from Version ${target.versionNumber}`,
    sourceKeywords: target.sourceKeywords,
    strategySnapshot: target.strategySnapshot,
  });
}

export function compareContentVersions(
  versionA: ListingContentVersion,
  versionB: ListingContentVersion
): ContentVersionDiff {
  const setA = new Set(versionA.tags.map((t) => t.toLowerCase()));
  const setB = new Set(versionB.tags.map((t) => t.toLowerCase()));

  const tagsAdded = versionB.tags.filter((t) => !setA.has(t.toLowerCase()));
  const tagsRemoved = versionA.tags.filter((t) => !setB.has(t.toLowerCase()));
  const tagsRetained = versionB.tags.filter((t) => setA.has(t.toLowerCase()));

  return {
    titleChanged: versionA.title !== versionB.title,
    titleBefore: versionA.title,
    titleAfter: versionB.title,
    tagsAdded,
    tagsRemoved,
    tagsRetained,
    descriptionLengthDelta: versionB.description.length - versionA.description.length,
    priceDelta: Math.round((versionB.price - versionA.price) * 100) / 100,
  };
}
