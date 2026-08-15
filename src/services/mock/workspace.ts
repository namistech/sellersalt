import type { Capability, NotificationItem, SearchResultItem, WorkspaceContext } from "../types";

// Realistic, SellerSalt-flavored mock data for the shell demo harness
// (/dev/shell) — exercises Individual/Agency/Institute contexts the
// real backend can't produce yet. No component imports this directly;
// only the /dev/shell demo pages do (docs/design/frontend-execution-plan-v1.md
// §27 Components → Services → Mock/Real boundary).

const BASE_CAPS: Capability[] = ["discover:view", "operate:view"];

export const MOCK_INDIVIDUAL_CONTEXT: WorkspaceContext = {
  user: { id: "u_1", name: "Jordan Miller", email: "jordan@example.com" },
  organization: { id: "org_1", name: "Jordan's Workspace", accountType: "individual" },
  roleLabel: "Owner",
  capabilities: new Set(BASE_CAPS),
  connectedShops: [{ id: "shop_1", label: "jordanmcrafts-etsy", platform: "etsy", status: "connected" }],
  activeConnectedShopId: "shop_1",
};

export const MOCK_AGENCY_CONTEXT: WorkspaceContext = {
  user: { id: "u_2", name: "Priya Shah", email: "priya@meridiangrowth.com" },
  organization: { id: "org_2", name: "Meridian Growth", accountType: "agency" },
  roleLabel: "Owner",
  capabilities: new Set<Capability>([...BASE_CAPS, "manage:clients", "manage:employees", "manage:reports", "manage:billing", "manage:team"]),
  availableWorkspaces: [
    { id: "org_2", name: "Meridian Growth", accountType: "agency" },
    { id: "org_1", name: "Jordan's Workspace", accountType: "individual" },
  ],
  scope: {
    kind: "client",
    current: { id: "client_1", label: "Luna & Co.", sublabel: "1 connected shop" },
    options: [
      { id: "client_1", label: "Luna & Co.", sublabel: "1 connected shop" },
      { id: "client_2", label: "Cedarwood Goods", sublabel: "2 connected shops" },
      { id: "client_3", label: "Willowbrook Studio", sublabel: "No shop connected" },
    ],
  },
  connectedShops: [{ id: "shop_luna", label: "lunaandco-etsy", platform: "etsy", status: "connected" }],
  activeConnectedShopId: "shop_luna",
};

export const MOCK_INSTITUTE_CONTEXT: WorkspaceContext = {
  user: { id: "u_3", name: "Marcus Webb", email: "marcus@etsybootcamp.com" },
  organization: { id: "org_3", name: "Etsy Bootcamp Academy", accountType: "institute" },
  roleLabel: "Admin",
  capabilities: new Set<Capability>([...BASE_CAPS, "manage:cohorts", "manage:staff", "manage:reports", "manage:billing", "manage:team"]),
  scope: {
    kind: "cohort",
    current: { id: "cohort_1", label: "Fall 2026 Cohort", sublabel: "24 students" },
    options: [
      { id: "cohort_1", label: "Fall 2026 Cohort", sublabel: "24 students" },
      { id: "cohort_2", label: "Spring 2026 Cohort", sublabel: "31 students" },
    ],
  },
  connectedShops: [],
};

export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n1",
    category: "intelligence",
    title: "Shop hasn't synced in 18 hours",
    description: "Data shown may be out of date until the next sync completes.",
    timestamp: new Date(Date.now() - 18 * 3_600_000).toISOString(),
    read: false,
    important: true,
    severity: "warning",
  },
  {
    id: "n2",
    category: "billing",
    title: "Payment method failed",
    description: "Update your card to avoid a pause in service.",
    timestamp: new Date(Date.now() - 30 * 60_000).toISOString(),
    read: false,
    important: true,
    severity: "danger",
  },
  {
    id: "n3",
    category: "system",
    title: "Team invite accepted",
    description: "Alex Rivera joined your workspace.",
    timestamp: new Date(Date.now() - 3 * 3_600_000).toISOString(),
    read: false,
    important: false,
  },
  {
    id: "n4",
    category: "shop",
    title: "New competitor detected in your category",
    description: "A newly-tracked shop entered your top 5 for 'ceramic mug'.",
    timestamp: new Date(Date.now() - 26 * 3_600_000).toISOString(),
    read: true,
    important: false,
    severity: "warning",
  },
  {
    id: "n5",
    category: "optimization",
    title: "Optimization applied successfully",
    description: "Title update for 'Walnut Cutting Board' is now live.",
    timestamp: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    read: true,
    important: false,
  },
  {
    id: "n6",
    category: "security",
    title: "New sign-in from a new device",
    description: "If this wasn't you, reset your password immediately.",
    timestamp: new Date(Date.now() - 5 * 86_400_000).toISOString(),
    read: true,
    important: false,
  },
];

export const MOCK_SEARCH_RESULTS: SearchResultItem[] = [
  { id: "s1", kind: "page", label: "Prospects", sublabel: "Discover", href: "/prospects" },
  { id: "s2", kind: "page", label: "Trends", sublabel: "Discover", href: "/trends" },
  { id: "s3", kind: "page", label: "Settings", sublabel: "Manage", href: "/settings" },
  { id: "s4", kind: "page", label: "Billing", sublabel: "Manage", href: "/settings/billing" },
  { id: "s5", kind: "researchShop", label: "Cedarwood Goods", sublabel: "Competitor shop · Home & Kitchen" },
  { id: "s6", kind: "researchShop", label: "Marrow & Ash", sublabel: "Competitor shop · Candles" },
  { id: "s7", kind: "prospect", label: "Ceramic Mug — Sage Green", sublabel: "Prospect · Luna & Co." },
  { id: "s8", kind: "connectedShop", label: "lunaandco-etsy", sublabel: "Connected shop" },
];
