"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/components/ui";
import { buildNavigation } from "@/services/navigation";
import type { NotificationItem, SearchResultItem, WorkspaceContext } from "@/services/types";
import { GlobalSearch } from "./GlobalSearch";
import { MobileNav } from "./MobileNav";
import { NotificationCenter } from "./NotificationCenter";
import { AssistantDrawer } from "@/components/assistant/AssistantDrawer";
import { FloatingAssistant } from "@/components/assistant/FloatingAssistant";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

const COLLAPSE_STORAGE_KEY = "sellersalt.sidebar.collapsed";

// frontend-execution-plan-v1.md §3 — the single composition point. Real
// (dashboard)/layout.tsx and every /dev/shell/* demo route both render
// this same component with a different WorkspaceContext (real vs mock)
// — there is exactly one shell, never three.

export interface AppShellProps {
  context: WorkspaceContext;
  notifications: NotificationItem[];
  searchResults: SearchResultItem[];
  onSignOut: () => void;
  children: ReactNode;
}

export function AppShell({ context, notifications, searchResults, onSignOut, children }: AppShellProps) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activeConnectedShopId, setActiveConnectedShopId] = useState(context.activeConnectedShopId);
  const [activeScopeId, setActiveScopeId] = useState(context.scope?.current.id);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(context.organization.id);

  // SSR-safe: default to expanded on first render (matches server markup),
  // then read the persisted preference once mounted.
  useEffect(() => {
    const stored = window.localStorage.getItem(COLLAPSE_STORAGE_KEY);
    if (stored === "true") setCollapsed(true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(COLLAPSE_STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  const groups = buildNavigation(context);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const resolvedScope = context.scope
    ? { ...context.scope, current: context.scope.options.find((o) => o.id === activeScopeId) ?? context.scope.current }
    : undefined;
  const shellContext: WorkspaceContext = { ...context, activeConnectedShopId, scope: resolvedScope };
  // Mock-only cosmetic switch, same fidelity as scope/connected-shop
  // above — no real multi-org data reload exists yet (see
  // src/services/session.ts, every real session is "individual" today).
  const activeWorkspace = context.availableWorkspaces?.find((w) => w.id === activeWorkspaceId) ?? context.availableWorkspaces?.[0];
  const workspaceSwitcher =
    context.availableWorkspaces && context.availableWorkspaces.length > 1 && activeWorkspace ? (
      <WorkspaceSwitcher current={activeWorkspace} options={context.availableWorkspaces} onSelect={setActiveWorkspaceId} className="mt-1 -ml-2" />
    ) : undefined;

  function handleNavigate(href: string) {
    router.push(href);
  }

  return (
    <div className="flex h-screen bg-paper">
      <Sidebar
        groups={groups}
        organizationName={context.organization.name}
        workspaceSwitcher={workspaceSwitcher}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />
      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} groups={groups} organizationName={context.organization.name} />

      <div className={cn("flex flex-1 flex-col overflow-hidden")}>
        <Topbar
          context={shellContext}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenAssistant={() => setAssistantOpen(true)}
          onOpenNotifications={() => setNotificationsOpen(true)}
          unreadCount={unreadCount}
          onSwitchScope={setActiveScopeId}
          onSwitchConnectedShop={setActiveConnectedShopId}
          onNavigate={handleNavigate}
          onSignOut={onSignOut}
        />
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} results={searchResults} />
      <AssistantDrawer open={assistantOpen} onClose={() => setAssistantOpen(false)} />
      <NotificationCenter open={notificationsOpen} onClose={() => setNotificationsOpen(false)} notifications={notifications} />
      <FloatingAssistant />
    </div>
  );
}
