// Feature Request & Public Roadmap Service

export type FeatureStatus =
  | "PENDING_REVIEW"
  | "UNDER_CONSIDERATION"
  | "PLANNED"
  | "IN_DEVELOPMENT"
  | "SHIPPED"
  | "DECLINED";

export type FeatureCategory =
  | "SURVEILLANCE"
  | "SEO_STUDIO"
  | "PRODUCT_HUNTING"
  | "SHOP_RESEARCH"
  | "WORKSPACE_PLANNER"
  | "BILLING_ACCOUNT"
  | "INTEGRATIONS";

export interface FeatureRequestItem {
  id: string;
  title: string;
  description: string;
  category: FeatureCategory;
  status: FeatureStatus;
  upvotes: number;
  hasUpvoted?: boolean;
  authorName: string;
  authorOrgId: string;
  adminResponse?: string | null;
  createdAt: string;
  updatedAt: string;
}

// In-memory persistent storage store with production seed records
let FEATURE_STORE: FeatureRequestItem[] = [
  {
    id: "feat-1",
    title: "Automated AI Tag Optimization with 13-slot validation",
    description: "Generate compliant 13-tag bundles under 20 characters with Jaccard uniqueness check and zero hallucinated terms.",
    category: "SEO_STUDIO",
    status: "SHIPPED",
    upvotes: 42,
    authorName: "SellerSalt Team",
    authorOrgId: "system",
    adminResponse: "Shipped in v1.7.0 — Available in Listing SEO Studio & Draft Builder.",
    createdAt: "2026-06-15T10:00:00.000Z",
    updatedAt: "2026-08-10T14:30:00.000Z",
  },
  {
    id: "feat-2",
    title: "6-Hour Competitor Longitudinal Surveillance",
    description: "Automatic background tracking of verified shop sales, catalog additions, and review velocity with breakout alerts.",
    category: "SURVEILLANCE",
    status: "SHIPPED",
    upvotes: 38,
    authorName: "SellerSalt Team",
    authorOrgId: "system",
    adminResponse: "Shipped in v1.7.0 — Track any competitor from /spy.",
    createdAt: "2026-06-20T11:00:00.000Z",
    updatedAt: "2026-08-12T09:15:00.000Z",
  },
  {
    id: "feat-3",
    title: "Webhook & Discord Alerts for Competitor Price Cuts",
    description: "Receive instant push alerts to Discord or Webhook endpoints whenever a tracked competitor changes prices.",
    category: "SURVEILLANCE",
    status: "IN_DEVELOPMENT",
    upvotes: 29,
    authorName: "CraftingPro",
    authorOrgId: "org-1",
    adminResponse: "Currently in development — Expected in upcoming release.",
    createdAt: "2026-07-02T16:00:00.000Z",
    updatedAt: "2026-08-14T11:20:00.000Z",
  },
  {
    id: "feat-4",
    title: "Multi-Market Currency Conversion (GBP, EUR, CAD, AUD)",
    description: "Toggle native currencies for foreign marketplace listing prices and revenue estimates.",
    category: "SHOP_RESEARCH",
    status: "PLANNED",
    upvotes: 21,
    authorName: "UKDesignWorks",
    authorOrgId: "org-2",
    adminResponse: "Planned for next sprint alongside international taxonomy filters.",
    createdAt: "2026-07-15T12:00:00.000Z",
    updatedAt: "2026-08-15T10:00:00.000Z",
  },
  {
    id: "feat-5",
    title: "Bulk CSV Export for Keyword Matrix & Long-Tail Terms",
    description: "Download extracted high-frequency search tags in bulk with usage count and length analysis.",
    category: "WORKSPACE_PLANNER",
    status: "UNDER_CONSIDERATION",
    upvotes: 15,
    authorName: "PrintableNest",
    authorOrgId: "org-3",
    adminResponse: "Under consideration by product team.",
    createdAt: "2026-07-28T09:30:00.000Z",
    updatedAt: "2026-08-16T08:00:00.000Z",
  },
];

// Votes store: orgId -> Set of featureIds
const VOTES_STORE: Map<string, Set<string>> = new Map();

/**
 * Calculates word overlap / Jaccard similarity to prevent duplicate feature submissions.
 */
export function calculateTitleSimilarity(titleA: string, titleB: string): number {
  const wordsA = new Set(
    titleA
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
  const wordsB = new Set(
    titleB
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  const union = new Set([...wordsA, ...wordsB]).size;
  return intersection / union;
}

export function findSimilarFeatures(title: string, threshold = 0.35): FeatureRequestItem[] {
  return FEATURE_STORE.filter((item) => calculateTitleSimilarity(item.title, title) >= threshold);
}

export async function getFeatureRequests(organizationId?: string, isAdmin = false): Promise<FeatureRequestItem[]> {
  const userVotes = organizationId ? VOTES_STORE.get(organizationId) || new Set() : new Set();
  return FEATURE_STORE.filter((item) => {
    if (isAdmin) return true;
    if (item.status === "PENDING_REVIEW") {
      return organizationId && item.authorOrgId === organizationId;
    }
    return item.status !== "DECLINED";
  })
    .map((item) => ({
      ...item,
      hasUpvoted: userVotes.has(item.id),
    }))
    .sort((a, b) => b.upvotes - a.upvotes);
}

export async function adminUpdateFeatureRequest(params: {
  id: string;
  status?: FeatureStatus;
  adminResponse?: string;
  title?: string;
  description?: string;
}): Promise<FeatureRequestItem> {
  const item = FEATURE_STORE.find((f) => f.id === params.id);
  if (!item) throw new Error("Feature request not found.");

  if (params.status) item.status = params.status;
  if (params.adminResponse !== undefined) item.adminResponse = params.adminResponse;
  if (params.title) item.title = params.title;
  if (params.description) item.description = params.description;
  item.updatedAt = new Date().toISOString();

  return item;
}

export async function createFeatureRequest(params: {
  title: string;
  description: string;
  category: FeatureCategory;
  authorName: string;
  authorOrgId: string;
}): Promise<{ item: FeatureRequestItem; similarItems: FeatureRequestItem[] }> {
  const similarItems = findSimilarFeatures(params.title);

  const newItem: FeatureRequestItem = {
    id: `feat-${Date.now()}`,
    title: params.title.trim(),
    description: params.description.trim(),
    category: params.category,
    status: "PENDING_REVIEW",
    upvotes: 1,
    hasUpvoted: true,
    authorName: params.authorName,
    authorOrgId: params.authorOrgId,
    adminResponse: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  FEATURE_STORE.unshift(newItem);

  // Auto-upvote for creator
  if (!VOTES_STORE.has(params.authorOrgId)) {
    VOTES_STORE.set(params.authorOrgId, new Set());
  }
  VOTES_STORE.get(params.authorOrgId)!.add(newItem.id);

  return { item: newItem, similarItems };
}

export async function toggleFeatureUpvote(
  featureId: string,
  organizationId: string
): Promise<{ success: boolean; upvotes: number; hasUpvoted: boolean }> {
  const item = FEATURE_STORE.find((f) => f.id === featureId);
  if (!item) throw new Error("Feature request not found.");

  if (!VOTES_STORE.has(organizationId)) {
    VOTES_STORE.set(organizationId, new Set());
  }
  const orgVotes = VOTES_STORE.get(organizationId)!;
  const hasUpvoted = orgVotes.has(featureId);

  if (hasUpvoted) {
    orgVotes.delete(featureId);
    item.upvotes = Math.max(1, item.upvotes - 1);
  } else {
    orgVotes.add(featureId);
    item.upvotes += 1;
  }

  item.updatedAt = new Date().toISOString();
  return { success: true, upvotes: item.upvotes, hasUpvoted: !hasUpvoted };
}
