import {
  BarChart3,
  Briefcase,
  Compass,
  CreditCard,
  Eye,
  FileText,
  Flame,
  FolderTree,
  GraduationCap,
  Hash,
  Layers,
  LayoutDashboard,
  Plug,
  Radar,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  TrendingUp,
  Users,
  XCircle,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";
import type { Capability, WorkspaceContext } from "./types";

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Item is hidden unless the current WorkspaceContext has this capability. */
  requiredCapability?: Capability;
}

export interface NavigationGroup {
  id: string;
  label: string;
  items: NavigationItem[];
}

// IA note: SellerSalt is a marketplace-agnostic ecommerce intelligence
// platform — Etsy/Shopify/WooCommerce/etc. are connectors, not the
// foundation. The groups below are organized by job-to-be-done (Research /
// Intelligence / Optimize / My Business / Marketplaces), not by marketplace.
// Every `id`/`href`/`icon` below is unchanged from the prior Discover/Operate
// grouping — only labels and which group an item sits in changed, so no
// route needs a redirect and no link anywhere in the app breaks.

const DASHBOARD_ITEMS: NavigationItem[] = [
  { id: "overview", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
];

const RESEARCH_ITEMS: NavigationItem[] = [
  { id: "command-center", label: "Command Center", href: "/research-center", icon: Compass },
  { id: "research", label: "Research Center", href: "/research", icon: Compass },
  { id: "discovery", label: "Discovery Hub", href: "/discovery", icon: Compass },
  { id: "prospects", label: "Product Research", href: "/prospects", icon: Search },
  { id: "categories", label: "Category Research", href: "/categories", icon: FolderTree },
  { id: "keyword-research", label: "Keyword Research", href: "/keyword-research", icon: Hash },
  { id: "trends", label: "Trend Analysis", href: "/trends", icon: TrendingUp },
  { id: "dropped-shops", label: "Dropped Shops", href: "/inactive", icon: XCircle },
  { id: "favorites", label: "Favorites", href: "/favorites", icon: Star },
  { id: "university", label: "SellerSalt University", href: "/university", icon: GraduationCap, requiredCapability: "view:university" },
];

const INTELLIGENCE_ITEMS: NavigationItem[] = [
  { id: "product-workspaces", label: "Product Workspaces", href: "/product-workspaces", icon: Layers },
  { id: "validate", label: "Product Validation", href: "/validate", icon: Compass },
  { id: "radar", label: "Opportunity Radar", href: "/radar", icon: Flame },
  { id: "intelligence-graph", label: "Intelligence Graph", href: "/intelligence", icon: Layers },
  { id: "spy", label: "Market Research", href: "/spy", icon: Search },
  { id: "tracked-shops", label: "Demand Signals", href: "/spy/tracked", icon: Store },
];

const OPTIMIZE_ITEMS: NavigationItem[] = [
  { id: "seo", label: "SEO Audit", href: "/seo", icon: ShieldCheck },
  { id: "studio", label: "AI Listing Studio", href: "/studio", icon: Sparkles },
  { id: "planner", label: "Workspace Planner", href: "/planner", icon: Layers },
];

const MY_BUSINESS_ITEMS: NavigationItem[] = [
  { id: "workspace", label: "Execution Workspace", href: "/workspace", icon: Layers },
  { id: "store", label: "Own Shop Operations", href: "/store", icon: Store },
  { id: "drafts", label: "Listing Drafts", href: "/drafts", icon: FileText },
  { id: "operate-analytics", label: "Analytics", href: "/analytics", icon: BarChart3 },
];

const MARKETPLACE_ITEMS: NavigationItem[] = [
  { id: "marketplaces-overview", label: "Marketplace Overview", href: "/marketplaces", icon: Plug },
  { id: "marketplaces-governance", label: "Data Governance", href: "/marketplaces/governance", icon: ShieldCheck },
  { id: "connected-shops", label: "Connected Accounts", href: "/settings/channels", icon: Plug },
];

const MANAGE_ITEMS_BASE: NavigationItem[] = [
  { id: "trust-center", label: "Trust Center", href: "/trust", icon: ShieldCheck },
  { id: "roadmap", label: "Public Roadmap", href: "/roadmap", icon: Compass },
  { id: "whats-new", label: "What's New", href: "/whats-new", icon: Sparkles },
  { id: "support", label: "Support & Help", href: "/support", icon: LifeBuoy },
  { id: "settings", label: "Settings", href: "/settings", icon: Settings },
];

// Agency/Institute-only Manage items
const MANAGE_ITEMS_AGENCY: NavigationItem[] = [
  { id: "team", label: "Team & Permissions", href: "/settings/team", icon: Users, requiredCapability: "manage:team" },
  { id: "clients", label: "Clients", href: "/dev/shell/placeholder/clients", icon: Users, requiredCapability: "manage:clients" },
  { id: "employees", label: "Employees", href: "/dev/shell/placeholder/employees", icon: Briefcase, requiredCapability: "manage:employees" },
];

const MANAGE_ITEMS_INSTITUTE: NavigationItem[] = [
  { id: "cohorts", label: "Cohorts", href: "/dev/shell/placeholder/cohorts", icon: GraduationCap, requiredCapability: "manage:cohorts" },
  { id: "staff", label: "Staff", href: "/dev/shell/placeholder/staff", icon: Briefcase, requiredCapability: "manage:staff" },
];

const REPORTS_ITEM: NavigationItem = {
  id: "reports",
  label: "Reports",
  href: "/dev/shell/placeholder/reports",
  icon: FileText,
  requiredCapability: "manage:reports",
};

const BILLING_ITEM: NavigationItem = {
  id: "billing",
  label: "Billing",
  href: "/settings/billing",
  icon: CreditCard,
  requiredCapability: "manage:billing",
};

function has(context: WorkspaceContext, cap?: Capability): boolean {
  return !cap || context.capabilities.has(cap);
}

function filterItems(items: NavigationItem[], context: WorkspaceContext): NavigationItem[] {
  return items.filter((item) => has(context, item.requiredCapability));
}

/**
 * Builds the primary navigation for a given workspace context.
 * Individual/Agency/Institute all flow through this one function —
 * they differ only in which capabilities are present, never in a
 * separate code path (docs/design/information-architecture-v1.md
 * "don't duplicate the IA per role").
 */
export function buildNavigation(context: WorkspaceContext): NavigationGroup[] {
  const groups: NavigationGroup[] = [];

  groups.push({ id: "dashboard", label: "Dashboard", items: filterItems(DASHBOARD_ITEMS, context) });

  // Research/Intelligence/Optimize replace the old single "Discover" group —
  // same gating capability ("discover:view"), just split by job-to-be-done
  // instead of one long flat list.
  if (has(context, "discover:view")) {
    groups.push({ id: "research", label: "Research", items: filterItems(RESEARCH_ITEMS, context) });
    groups.push({ id: "intelligence", label: "Intelligence", items: filterItems(INTELLIGENCE_ITEMS, context) });
    groups.push({ id: "optimize", label: "Optimize", items: filterItems(OPTIMIZE_ITEMS, context) });
  }

  // My Business/Marketplaces replace the old single "Operate" group — same
  // gating capability ("operate:view").
  if (has(context, "operate:view")) {
    groups.push({ id: "my-business", label: "My Business", items: filterItems(MY_BUSINESS_ITEMS, context) });
    groups.push({ id: "marketplaces", label: "Marketplaces", items: filterItems(MARKETPLACE_ITEMS, context) });
  }

  const manageItems = [
    ...MANAGE_ITEMS_BASE,
    ...filterItems(MANAGE_ITEMS_AGENCY, context),
    ...filterItems(MANAGE_ITEMS_INSTITUTE, context),
    ...filterItems([REPORTS_ITEM], context),
    // Billing is folded into Settings for Individual (matches today's
    // real /settings/billing sub-page); promoted to a top-level Manage
    // item for Agency/Institute, per the IA's Primary Navigation table.
    ...(context.organization.accountType !== "individual" ? filterItems([BILLING_ITEM], context) : []),
  ];
  groups.push({ id: "manage", label: "Manage", items: manageItems });

  return groups;
}
