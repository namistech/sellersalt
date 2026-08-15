// Shell-level typed data model — docs/design/information-architecture-v1.md
// "Workspace Model" / "Object Model". This is a UI architecture layer,
// not a backend model: it exists so the shell can be built and tested
// against Individual/Agency/Institute shapes before any of Organization.kind,
// Client, Cohort, Role, or Permission exist in Prisma (see
// docs/architecture/organizations.md — that decision is locked at the
// domain-shape level but not yet implemented). Real wiring today only
// ever produces "individual" (see src/services/session.ts); "agency" and
// "institute" are exercised through src/services/mock/workspace.ts.

export type AccountType = "individual" | "agency" | "institute";

// A small, flat capability set — not a full RBAC framework (explicitly
// out of scope per this task's brief). Each real gate in the app today
// (isAdminEmail()) maps onto exactly one of these; future real
// Role/Permission data would populate this same Set without the shell
// needing to change.
export type Capability =
  | "discover:view"
  | "operate:view"
  | "manage:team"
  | "manage:billing"
  | "manage:clients" // agency only
  | "manage:employees" // agency only
  | "manage:cohorts" // institute only
  | "manage:staff" // institute only
  | "manage:reports"
  | "admin:preview"; // gates the same admin-only preview surfaces isAdminEmail() gates today

export interface WorkspaceUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface WorkspaceOrganization {
  id: string;
  name: string;
  accountType: AccountType;
}

/** One entry in the rare multi-org Workspace switcher (see design-system-v1.md §15). */
export interface WorkspaceOption {
  id: string;
  name: string;
  accountType: AccountType;
}

/** One entry in the Agency/Institute Scope switcher — a Client or a Cohort, never both at once. */
export interface ScopeOption {
  id: string;
  label: string;
  sublabel?: string; // e.g. a client's shop count, a cohort's student count
}

export interface ConnectedShopSummary {
  id: string;
  label: string;
  platform: "shopify" | "woocommerce" | "etsy";
  status: "connected" | "syncing" | "disconnected" | "failed";
}

export type NotificationCategory = "system" | "intelligence" | "shop" | "optimization" | "billing" | "security";

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  title: string;
  description?: string;
  timestamp: string; // ISO
  read: boolean;
  important: boolean;
  /** Only meaningful for category "intelligence" or "shop" — renders via intelligence/AlertCard instead of a plain row. */
  severity?: "warning" | "danger";
}

export interface SearchResultItem {
  id: string;
  kind: "page" | "prospect" | "connectedShop" | "researchShop";
  label: string;
  sublabel?: string;
  /** Only "page" results actually navigate — see GlobalSearch.tsx. */
  href?: string;
}

/**
 * The full shell-level context a signed-in session resolves to. One
 * shape for all three account types — Agency/Institute-only fields
 * (`scope`, `scopeOptions`) are simply absent for Individual, rather
 * than three different context types, so the shell never needs
 * per-account-type branching beyond "does this field exist."
 */
export interface WorkspaceContext {
  user: WorkspaceUser;
  organization: WorkspaceOrganization;
  /** Display label only ("Owner", "Employee", "Admin") — not enforced, capabilities are. */
  roleLabel: string;
  capabilities: Set<Capability>;
  availableWorkspaces?: WorkspaceOption[];
  /** Present only for agency/institute. "client" for agency, "cohort" for institute. */
  scope?: {
    kind: "client" | "cohort";
    current: ScopeOption;
    options: ScopeOption[];
  };
  connectedShops?: ConnectedShopSummary[];
  activeConnectedShopId?: string;
}
