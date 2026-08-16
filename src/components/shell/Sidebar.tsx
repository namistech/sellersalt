"use client";

import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn, FOCUS_RING, IconButton, Text } from "@/components/ui";
import { AccountBrand } from "./AccountBrand";
import type { NavigationGroup, NavigationItem } from "@/services/navigation";

// design-system-v1.md §15 — restrained active-state (soft fill, not a
// heavy border/shadow), grouped sections with uppercase-tracked group
// headers — a direct continuation of the existing real sidebar's
// pattern, re-tokened rather than redesigned from scratch.

const EXPANDED_WIDTH = "w-64";
const COLLAPSED_WIDTH = "w-[68px]";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

// The shared ui/Tooltip is deliberately CSS-only (see its own file —
// "no positioning library installed", a documented v1 limitation), so
// it renders inside whatever container the trigger sits in. That's
// fine everywhere it's used today, but the collapsed sidebar's nav
// list has `overflow-y-auto` for long nav (needed so many items can
// scroll) — found via real browser testing that this silently clips a
// same-container "side=right" tooltip's horizontal overflow too, even
// though its computed opacity/visibility both report visible. A
// portal escapes the scrollable ancestor entirely; kept local to
// Sidebar.tsx rather than changing the shared primitive's behavior for
// every other call site.
function CollapsedTooltip({ label, open, anchorRect }: { label: string; open: boolean; anchorRect: DOMRect | null }) {
  if (!open || !anchorRect || typeof document === "undefined") return null;
  return createPortal(
    <span
      role="tooltip"
      className="pointer-events-none fixed z-50 -translate-y-1/2 whitespace-nowrap rounded-sm bg-paper-inverse px-2 py-1 text-body-sm text-ink-inverse shadow-sm"
      style={{ top: anchorRect.top + anchorRect.height / 2, left: anchorRect.right + 8 }}
    >
      {label}
    </span>,
    document.body
  );
}

function SidebarLink({ item, active, collapsed }: { item: NavigationItem; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  function showTooltip() {
    setAnchorRect(linkRef.current?.getBoundingClientRect() ?? null);
    setTooltipOpen(true);
  }
  function hideTooltip() {
    setTooltipOpen(false);
  }

  const link = (
    <Link
      ref={linkRef}
      href={item.href}
      aria-current={active ? "page" : undefined}
      onMouseEnter={collapsed ? showTooltip : undefined}
      onMouseLeave={collapsed ? hideTooltip : undefined}
      onFocus={collapsed ? showTooltip : undefined}
      onBlur={collapsed ? hideTooltip : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-body-sm font-medium transition",
        collapsed && "justify-center px-0",
        FOCUS_RING,
        active ? "bg-accent-soft text-accent" : "text-ink hover:bg-surface-muted"
      )}
    >
      <Icon aria-hidden className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );

  if (!collapsed) return link;
  return (
    <>
      {link}
      <CollapsedTooltip label={item.label} open={tooltipOpen} anchorRect={anchorRect} />
    </>
  );
}

export interface SidebarProps {
  groups: NavigationGroup[];
  organizationName?: string;
  /**
   * Rendered in place of the plain org-name line, only when the user
   * genuinely has multiple workspace memberships (see WorkspaceSwitcher's
   * own docs). Never rendered while collapsed — it needs its label.
   */
  workspaceSwitcher?: ReactNode;
  collapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
}

export function Sidebar({ groups, organizationName, workspaceSwitcher, collapsed, onToggleCollapse, className }: SidebarProps) {
  const pathname = usePathname() ?? "";

  return (
    <aside
      className={cn(
        "hidden md:flex md:flex-col border-r border-line bg-surface transition-[width] duration-150",
        collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
        className
      )}
    >
      <div className={cn("flex items-center gap-2 px-3 py-4 border-b border-line-subtle mb-2", collapsed && "justify-center px-0")}>
        <AccountBrand
          organizationName={organizationName}
          collapsed={collapsed}
          className="w-full"
        />
      </div>

      <nav aria-label="Primary" className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        {groups.map((group) => (
          <div key={group.id}>
            {!collapsed && (
              <div className="mb-2 px-3 text-label-sm font-semibold uppercase tracking-wider text-ink-tertiary">{group.label}</div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <SidebarLink key={item.id} item={item} active={isActive(pathname, item.href)} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn("border-t border-line-subtle p-2", collapsed && "flex justify-center")}>
        <IconButton
          icon={collapsed ? <ChevronsRight /> : <ChevronsLeft />}
          variant="tertiary"
          size="compact"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggleCollapse}
        />
      </div>
    </aside>
  );
}
