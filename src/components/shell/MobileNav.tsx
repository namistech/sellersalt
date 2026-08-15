"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, Drawer, FOCUS_RING, Text } from "@/components/ui";
import type { NavigationGroup } from "@/services/navigation";

// design-system-v1.md §25 — mobile is a real drawer (Task 2's Drawer,
// side="left"), not a shrunk desktop sidebar. Same navigation config as
// desktop Sidebar.tsx (buildNavigation output) — one source of truth,
// two presentations.

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

export interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  groups: NavigationGroup[];
  organizationName?: string;
}

export function MobileNav({ open, onClose, groups, organizationName }: MobileNavProps) {
  const pathname = usePathname() ?? "";

  return (
    <Drawer open={open} onClose={onClose} side="left" size="sm" title="SellerSalt" description={organizationName}>
      <nav aria-label="Primary" className="-mx-5 -mt-5 flex flex-col gap-6">
        {groups.map((group) => (
          <div key={group.id} className="px-5 pt-5 first:pt-0">
            <div className="mb-2 text-label-sm font-semibold uppercase tracking-wider text-ink-tertiary">{group.label}</div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={onClose}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2.5 text-body-md font-medium transition",
                      FOCUS_RING,
                      active ? "bg-accent-soft text-accent" : "text-ink hover:bg-surface-muted"
                    )}
                  >
                    <Icon aria-hidden className="h-5 w-5 shrink-0" />
                    <Text as="span" size="body-md" className="truncate">
                      {item.label}
                    </Text>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </Drawer>
  );
}
