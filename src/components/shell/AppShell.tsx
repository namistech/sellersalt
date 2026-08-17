"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { X, AlertCircle, ExternalLink } from "lucide-react";
import { cn } from "@/components/ui";
import { buildNavigation } from "@/services/navigation";
import type { NotificationItem, SearchResultItem, WorkspaceContext } from "@/services/types";
import type { AnnouncementItem } from "@/services/announcements";
import { GlobalSearch } from "./GlobalSearch";
import { MobileNav } from "./MobileNav";
import { NotificationCenter } from "./NotificationCenter";
import { SaltBot } from "@/components/assistant/SaltBot";
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

export function AppShell({ context, notifications: initialNotifications, searchResults, onSignOut, children }: AppShellProps) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activeConnectedShopId, setActiveConnectedShopId] = useState(context.activeConnectedShopId);
  const [activeScopeId, setActiveScopeId] = useState(context.scope?.current.id);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(context.organization.id);
  const [urgentBanner, setUrgentBanner] = useState<AnnouncementItem | null>(null);
  const [allNotifications, setAllNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/public")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings?.app_logo_url) setLogoUrl(d.settings.app_logo_url);
      })
      .catch(() => {});
  }, []);

  // Load announcements & notifications
  useEffect(() => {
    async function fetchAnnouncements() {
      try {
        const res = await fetch("/api/announcements");
        if (!res.ok) return;
        const data = await res.json();
        if (data.banner) {
          setUrgentBanner(data.banner);
        }
        if (Array.isArray(data.notifications) && data.notifications.length > 0) {
          const mapped: NotificationItem[] = data.notifications.map((n: any) => ({
            id: n.id,
            title: n.title,
            description: n.message,
            category: "system" as const,
            timestamp: n.createdAt,
            read: Boolean(n.isDismissed),
            important: n.priority === "URGENT",
          }));
          setAllNotifications((prev) => {
            const existingIds = new Set(prev.map((i) => i.id));
            const fresh = mapped.filter((m) => !existingIds.has(m.id));
            return [...fresh, ...prev];
          });
        }
      } catch {
        // Non-blocking
      }
    }
    fetchAnnouncements();
  }, []);

  async function handleDismissBanner(bannerId: string) {
    setUrgentBanner(null);
    try {
      await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss", announcementId: bannerId }),
      });
    } catch {
      // Non-blocking
    }
  }

  async function handleMarkNotificationRead(id: string) {
    setAllNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read", announcementId: id }),
      });
    } catch {
      // Non-blocking — local state already reflects the intent
    }
  }

  async function handleMarkAllNotificationsRead() {
    setAllNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markAllRead" }),
      });
    } catch {
      // Non-blocking
    }
  }

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
  const unreadCount = allNotifications.filter((n) => !n.read).length;
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
        logoUrl={logoUrl}
        workspaceSwitcher={workspaceSwitcher}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />
      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} groups={groups} organizationName={context.organization.name} />

      <div className={cn("flex flex-1 flex-col overflow-hidden")}>
        {urgentBanner && (
          <div className="bg-[#141B16] text-white border-b border-[#2A362D] px-4 py-2 flex items-center justify-between gap-3 text-xs shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2 w-2 rounded-full bg-danger animate-pulse shrink-0" />
              <strong className="font-bold text-[#FFB020] shrink-0">{urgentBanner.title}:</strong>
              <span className="truncate text-ink-inverted-secondary">{urgentBanner.message}</span>
              {urgentBanner.linkUrl && (
                <a
                  href={urgentBanner.linkUrl}
                  className="font-bold text-[#16C784] hover:underline inline-flex items-center gap-1 shrink-0 ml-1"
                >
                  {urgentBanner.linkText || "Learn more"} <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleDismissBanner(urgentBanner.id)}
              className="text-ink-tertiary hover:text-white p-1 rounded transition"
              aria-label="Dismiss banner"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

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
      <NotificationCenter
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={allNotifications}
        onMarkRead={handleMarkNotificationRead}
        onMarkAllRead={handleMarkAllNotificationsRead}
      />
      <SaltBot open={assistantOpen} onOpenChange={setAssistantOpen} />
    </div>
  );
}
