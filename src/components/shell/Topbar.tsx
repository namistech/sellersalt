"use client";

import { Bell, HelpCircle, Menu, Search, Sparkles } from "lucide-react";
import { cn, FOCUS_RING, IconButton, Tooltip } from "@/components/ui";
import type { WorkspaceContext } from "@/services/types";
import { AccountMenu } from "./AccountMenu";
import { ConnectedShopSelector } from "./ConnectedShopSelector";
import { ScopeSwitcher } from "./ScopeSwitcher";

// design-system-v1.md §15 — three regions: LEFT (mobile menu trigger —
// desktop sidebar already has its own collapse toggle, so nothing else
// belongs here at md+), CENTER (the Agency/Institute Scope switcher and,
// inside Operate, the Connected Shop selector — both optional, absent
// for Individual/outside Operate), RIGHT (search, AI entry, notifications,
// help, account). AI is deliberately an icon trigger here, never a nav
// item — docs/design/information-architecture-v1.md "AI is cross-cutting."

export interface TopbarProps {
  context: WorkspaceContext;
  onOpenMobileNav: () => void;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  unreadCount: number;
  onSwitchScope: (id: string) => void;
  onSwitchConnectedShop: (id: string) => void;
  onNavigate: (href: string) => void;
  onSignOut: () => void;
  className?: string;
}

export function Topbar({
  context,
  onOpenMobileNav,
  onOpenSearch,
  onOpenNotifications,
  unreadCount,
  onSwitchScope,
  onSwitchConnectedShop,
  onNavigate,
  onSignOut,
  className,
}: TopbarProps) {
  return (
    <header className={cn("flex h-16 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 md:px-6", className)}>
      <IconButton
        icon={<Menu />}
        variant="tertiary"
        aria-label="Open navigation"
        onClick={onOpenMobileNav}
        className="md:hidden"
      />

      <div className="flex min-w-0 flex-1 items-center gap-3">
        {context.scope && <ScopeSwitcher kind={context.scope.kind} current={context.scope.current} options={context.scope.options} onSelect={onSwitchScope} />}
        {context.connectedShops && context.connectedShops.length > 0 && (
          <ConnectedShopSelector shops={context.connectedShops} activeId={context.activeConnectedShopId} onSelect={onSwitchConnectedShop} className="hidden sm:inline-flex" />
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Tooltip content="Search">
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Search"
            className={cn(
              "hidden items-center gap-2 rounded-md border border-line px-3 py-1.5 text-body-sm text-ink-tertiary transition hover:bg-surface-muted sm:flex",
              FOCUS_RING
            )}
          >
            <Search aria-hidden className="h-4 w-4" />
            <span>Search…</span>
            <kbd className="rounded-sm border border-line-subtle bg-surface-muted px-1.5 py-0.5 text-[11px] text-ink-tertiary">⌘K</kbd>
          </button>
        </Tooltip>
        <IconButton icon={<Search />} variant="tertiary" aria-label="Search" onClick={onOpenSearch} className="sm:hidden" />

        <IconButton icon={<Sparkles />} variant="tertiary" aria-label="Ask AI" onClick={() => onNavigate("/dev/shell/placeholder/ai-assistant")} />

        <div className="relative">
          <IconButton icon={<Bell />} variant="tertiary" aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"} onClick={onOpenNotifications} />
          {unreadCount > 0 && (
            <span aria-hidden className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" />
          )}
        </div>

        <IconButton
          icon={<HelpCircle />}
          variant="tertiary"
          aria-label="Help & support"
          onClick={() => onNavigate("/dev/shell/placeholder/help")}
          className="hidden sm:inline-flex"
        />

        <div className="ml-1 h-6 w-px bg-line-subtle" aria-hidden />

        <AccountMenu
          name={context.user.name}
          email={context.user.email}
          roleLabel={context.roleLabel}
          isAdmin={context.capabilities.has("admin:preview")}
          onNavigate={onNavigate}
          onSignOut={onSignOut}
        />
      </div>
    </header>
  );
}
