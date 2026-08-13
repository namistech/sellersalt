"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  Radar,
  TrendingUp,
  XCircle,
  Star,
  Plug,
  Briefcase,
  Settings,
  ShieldCheck,
  BarChart3,
  Store,
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "Product hunting",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/prospects", label: "Prospects", icon: Search },
      { href: "/spy", label: "Spy on Competitor", icon: Radar },
      { href: "/trends", label: "Trends", icon: TrendingUp },
      { href: "/inactive", label: "Dropped shops", icon: XCircle },
      { href: "/favorites", label: "Favorites", icon: Star },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/connectors", label: "Connectors", icon: Plug },
      { href: "/jobs", label: "Jobs", icon: Briefcase },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

// Shopify/WooCommerce/cross-listing work is admin-only for now — MVP is
// staying Etsy-focused for customers. Kept in the codebase, just not
// surfaced, so this is additive to re-enable later rather than a rebuild.
const ADMIN_ONLY_GROUP = {
  label: "Your stores (admin)",
  items: [
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/settings/channels", label: "Connected stores", icon: Store },
  ],
};

export function Sidebar({ organizationName, isAdmin }: { organizationName?: string | null; isAdmin?: boolean }) {
  const pathname = usePathname();

  const groups = isAdmin
    ? [...NAV_GROUPS, ADMIN_ONLY_GROUP, { label: "Admin", items: [{ href: "/admin", label: "Packages", icon: ShieldCheck }] }]
    : NAV_GROUPS;

  return (
    <aside className="flex w-64 flex-col border-r border-line bg-surface px-3 py-5">
      <div className="mb-6 px-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-ink text-sm font-bold text-white dark:bg-white dark:text-ink">
            A
          </div>
          <div className="text-lg font-semibold tracking-tight text-ink">SellerSalt</div>
        </div>
        {organizationName && (
          <div className="mt-1 truncate pl-10 text-xs text-muted">{organizationName}</div>
        )}
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname?.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-accent-soft text-accent"
                        : "text-ink hover:bg-paper"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
