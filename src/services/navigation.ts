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

const DISCOVER_ITEMS: NavigationItem[] = [
  { id: "discovery", label: "Discovery Hub", href: "/discovery", icon: Compass },
  { id: "overview", label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { id: "radar", label: "Opportunity Radar", href: "/radar", icon: Flame },
  { id: "prospects", label: "Prospects", href: "/prospects", icon: Search },
  { id: "categories", label: "Category Hunting", href: "/categories", icon: FolderTree },
  { id: "spy", label: "Spy on Competitor", href: "/spy", icon: Eye },
  { id: "tracked-shops", label: "Tracked Shops", href: "/spy/tracked", icon: Store },
  { id: "keyword-research", label: "Keyword Research", href: "/keyword-research", icon: Hash },
  { id: "seo", label: "SEO Audit", href: "/seo", icon: ShieldCheck },
  { id: "planner", label: "Workspace Planner", href: "/planner", icon: Layers },
  { id: "studio", label: "Listing Studio", href: "/studio", icon: Sparkles },
  { id: "trends", label: "Trends", href: "/trends", icon: TrendingUp },
  { id: "dropped-shops", label: "Dropped Shops", href: "/inactive", icon: XCircle },
  { id: "favorites", label: "Favorites", href: "/favorites", icon: Star },
  { id: "university", label: "SellerSalt University", href: "/university", icon: GraduationCap, requiredCapability: "view:university" },
];

const OPERATE_ITEMS: NavigationItem[] = [
  { id: "connected-shops", label: "Connected Shops", href: "/settings/channels", icon: Store },
  { id: "operate-analytics", label: "Analytics", href: "/analytics", icon: BarChart3 },
];

const MANAGE_ITEMS_BASE: NavigationItem[] = [
  { id: "connectors", label: "Search Streams", href: "/connectors", icon: Plug },
  { id: "jobs", label: "Scraper Jobs", href: "/jobs", icon: Briefcase },
  { id: "roadmap", label: "Public Roadmap", href: "/roadmap", icon: Compass },
  { id: "whats-new", label: "What's New", href: "/whats-new", icon: Sparkles },
  { id: "support", label: "Support & Help", href: "/support", icon: LifeBuoy },
  { id: "settings", label: "Settings", href: "/settings", icon: Settings },
];

// Agency/Institute-only Manage items — no real backend/route exists for
// any of these yet (Decision 1 locks the domain shape, not the schema —
// see docs/architecture/organizations.md). They only ever appear when
// exercised via mock WorkspaceContext at /dev/shell, and route to the
// shared placeholder rather than a fabricated page.
const MANAGE_ITEMS_AGENCY: NavigationItem[] = [
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

  if (has(context, "discover:view")) {
    groups.push({ id: "discover", label: "Discover", items: filterItems(DISCOVER_ITEMS, context) });
  }

  if (has(context, "operate:view")) {
    groups.push({ id: "operate", label: "Operate", items: filterItems(OPERATE_ITEMS, context) });
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
