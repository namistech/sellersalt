"use client";

import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  LayoutDashboard,
  Settings,
  Palette,
  Image as ImageIcon,
  Bell,
  Users,
  Building,
  UserPlus,
  CreditCard,
  Tag,
  Shield,
  Layers,
  Sparkles,
  Bot,
  Cpu,
  Webhook,
  Lock,
  FileText,
  Mail,
  HardDrive,
  Activity,
  Globe,
  Sliders,
  CheckCircle2,
  ChevronsLeft,
  ChevronsRight,
  Menu,
  X,
  PanelLeft,
  PanelLeftClose,
} from "lucide-react";
import { Badge, IconButton, cn, FOCUS_RING } from "@/components/ui";

export type AdminTabId =
  // General
  | "overview"
  | "app-settings"
  | "branding"
  | "storage"
  | "notifications"
  // Users & Organizations
  | "users"
  | "orgs"
  | "user-provisioning"
  // Billing & Plans
  | "packages"
  | "free-plan"
  | "coupons"
  | "payments"
  // Integrations
  | "integrations"
  // AI & Automation
  | "ai"
  | "ai-assistant"
  | "mcp"
  | "webhooks"
  // Security
  | "security"
  | "audit-logs"
  // System
  | "email"
  | "storage-config"
  | "diagnostics";

export interface AdminNavGroup {
  id: string;
  label: string;
  items: Array<{
    id: AdminTabId;
    label: string;
    icon: React.ElementType;
    badge?: string | number;
    badgeVariant?: "neutral" | "success" | "warning" | "danger";
  }>;
}

interface AdminSidebarProps {
  activeTab: AdminTabId;
  onSelectTab: (tab: AdminTabId) => void;
  userCount?: number;
  orgCount?: number;
  unverifiedCount?: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

function AdminCollapsedTooltip({
  label,
  badge,
  badgeVariant,
  open,
  anchorRect,
}: {
  label: string;
  badge?: string | number;
  badgeVariant?: string;
  open: boolean;
  anchorRect: DOMRect | null;
}) {
  if (!open || !anchorRect || typeof document === "undefined") return null;
  return createPortal(
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#141B16] px-2.5 py-1.5 text-xs font-semibold text-white shadow-lg border border-[#2A362D] flex items-center gap-2"
      style={{ top: anchorRect.top + anchorRect.height / 2, left: anchorRect.right + 10 }}
    >
      <span>{label}</span>
      {badge !== undefined && (
        <span
          className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
            badgeVariant === "warning"
              ? "bg-amber-500/20 text-amber-300"
              : badgeVariant === "success"
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-white/20 text-white"
          }`}
        >
          {badge}
        </span>
      )}
    </div>,
    document.body
  );
}

function AdminSidebarButton({
  item,
  isActive,
  collapsed,
  onClick,
}: {
  item: AdminNavGroup["items"][number];
  isActive: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  function showTooltip() {
    setAnchorRect(buttonRef.current?.getBoundingClientRect() ?? null);
    setTooltipOpen(true);
  }
  function hideTooltip() {
    setTooltipOpen(false);
  }

  const btn = (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      onMouseEnter={collapsed ? showTooltip : undefined}
      onMouseLeave={collapsed ? hideTooltip : undefined}
      onFocus={collapsed ? showTooltip : undefined}
      onBlur={collapsed ? hideTooltip : undefined}
      className={cn(
        "w-full flex items-center gap-2.5 rounded-xl text-xs font-semibold transition-all text-left relative",
        collapsed
          ? "justify-center p-2.5"
          : "justify-between px-3 py-2",
        isActive
          ? "bg-[#141B16] text-white shadow-xs"
          : "text-ink-secondary hover:text-ink hover:bg-[#F4F3EF]"
      )}
      aria-label={item.label}
    >
      <div className={cn("flex items-center gap-2.5 min-w-0", collapsed && "justify-center")}>
        <Icon
          className={`h-4 w-4 shrink-0 ${
            isActive ? "text-[#0E8F5D]" : "text-ink-tertiary"
          }`}
        />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </div>

      {!collapsed && item.badge !== undefined && (
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
            isActive
              ? "bg-white/20 text-white"
              : item.badgeVariant === "warning"
              ? "bg-amber-100 text-amber-800"
              : item.badgeVariant === "success"
              ? "bg-[#E7FAF1] text-[#0E8F5D]"
              : "bg-[#FAFAF8] text-ink-tertiary border border-line"
          }`}
        >
          {item.badge}
        </span>
      )}

      {collapsed && item.badge !== undefined && (
        <span
          className={`absolute top-1.5 right-1.5 h-2 w-2 rounded-full ${
            item.badgeVariant === "warning"
              ? "bg-amber-500 animate-pulse"
              : item.badgeVariant === "success"
              ? "bg-[#0E8F5D]"
              : "bg-ink-tertiary"
          }`}
        />
      )}
    </button>
  );

  if (!collapsed) return btn;
  return (
    <>
      {btn}
      <AdminCollapsedTooltip
        label={item.label}
        badge={item.badge}
        badgeVariant={item.badgeVariant}
        open={tooltipOpen}
        anchorRect={anchorRect}
      />
    </>
  );
}

export function AdminSidebar({
  activeTab,
  onSelectTab,
  userCount = 0,
  orgCount = 0,
  unverifiedCount = 0,
  collapsed: externalCollapsed,
  onToggleCollapse: externalToggle,
  className,
}: AdminSidebarProps) {
  // Default to open/expanded
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;
  const toggleCollapse = externalToggle || (() => setInternalCollapsed((prev) => !prev));

  const navGroups: AdminNavGroup[] = [
    {
      id: "overview_group",
      label: "Overview",
      items: [
        { id: "overview", label: "Operations Overview", icon: LayoutDashboard },
        { id: "diagnostics", label: "Diagnostics & Health", icon: Activity },
      ],
    },
    {
      id: "config_group",
      label: "Configuration",
      items: [
        { id: "app-settings", label: "App Settings", icon: Settings },
        { id: "branding", label: "Branding & SEO", icon: Palette },
      ],
    },
    {
      id: "integrations_group",
      label: "Integrations",
      items: [
        { id: "integrations", label: "Integration Hub", icon: Globe, badge: "18+ Hubs", badgeVariant: "success" },
        { id: "ai", label: "API Providers Directory", icon: Sparkles },
      ],
    },
    {
      id: "commerce_group",
      label: "Commerce",
      items: [
        { id: "packages", label: "Plans & Quotas", icon: Layers },
        { id: "coupons", label: "Coupons & Promos", icon: Tag },
        { id: "payments", label: "Payment Gateways", icon: CreditCard },
      ],
    },
    {
      id: "users_group",
      label: "Users & Organizations",
      items: [
        {
          id: "users",
          label: "User Directory",
          icon: Users,
          badge: unverifiedCount > 0 ? `${unverifiedCount} unverified` : userCount,
          badgeVariant: unverifiedCount > 0 ? "warning" : "neutral",
        },
        { id: "orgs", label: "Workspaces", icon: Building, badge: orgCount },
        { id: "user-provisioning", label: "User Provisioning", icon: UserPlus },
      ],
    },
    {
      id: "communication_group",
      label: "Communication",
      items: [
        { id: "notifications", label: "Announcements & Alerts", icon: Bell },
        { id: "email", label: "Email / SMTP", icon: Mail },
      ],
    },
    {
      id: "infra_group",
      label: "Infrastructure",
      items: [
        { id: "storage", label: "Media & Asset Storage", icon: ImageIcon },
        { id: "security", label: "Abuse & Risk Telemetry", icon: Shield, badge: "Active", badgeVariant: "success" },
        { id: "audit-logs", label: "Audit Logs", icon: FileText },
      ],
    },
  ];

  const handleSelect = (id: AdminTabId) => {
    onSelectTab(id);
    setMobileDrawerOpen(false);
  };

  return (
    <>
      {/* Mobile Toggle Bar */}
      <div className="lg:hidden w-full bg-white rounded-xl border border-line p-3 mb-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-ink">Admin Console</span>
          <Badge variant="neutral" className="text-label-sm">
            {activeTab}
          </Badge>
        </div>
        <button
          type="button"
          onClick={() => setMobileDrawerOpen((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg bg-[#FAFAF8] border border-line text-ink"
        >
          {mobileDrawerOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          <span>{mobileDrawerOpen ? "Close Menu" : "Console Navigation"}</span>
        </button>
      </div>

      {/* Mobile Nav Drawer */}
      {mobileDrawerOpen && (
        <div className="lg:hidden w-full bg-white rounded-2xl border border-line p-4 shadow-md space-y-5 mb-6">
          {navGroups.map((group) => (
            <div key={group.id} className="space-y-1.5">
              <div className="px-3 text-label-sm font-extrabold uppercase tracking-wider text-ink-tertiary">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <AdminSidebarButton
                    key={item.id}
                    item={item}
                    isActive={activeTab === item.id}
                    collapsed={false}
                    onClick={() => handleSelect(item.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Desktop Sticky & Collapsible Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col shrink-0 transition-[width] duration-200 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)] z-20",
          isCollapsed ? "w-[68px]" : "w-64",
          className
        )}
      >
        <div className="bg-white rounded-2xl border border-line p-3 shadow-xs space-y-4 flex-1 flex flex-col justify-between overflow-y-auto max-h-[calc(100vh-3.5rem)]">
          <div className="space-y-4">
            {/* Header with Toggle */}
            <div
              className={cn(
                "flex items-center pb-2 border-b border-line",
                isCollapsed ? "justify-center" : "justify-between px-1"
              )}
            >
              {!isCollapsed && (
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="h-2 w-2 rounded-full bg-[#0E8F5D] animate-pulse shrink-0" />
                  <span className="text-sm font-bold text-ink truncate">Admin Console</span>
                </div>
              )}

              <IconButton
                icon={isCollapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
                variant="tertiary"
                size="compact"
                aria-label={isCollapsed ? "Expand admin sidebar" : "Collapse admin sidebar"}
                onClick={toggleCollapse}
                className="hover:bg-[#F4F3EF] text-ink-secondary"
              />
            </div>

            {/* Navigation Groups */}
            <div className="space-y-4">
              {navGroups.map((group) => (
                <div key={group.id} className="space-y-1">
                  {!isCollapsed ? (
                    <div className="px-3 text-label-sm font-extrabold uppercase tracking-wider text-ink-tertiary">
                      {group.label}
                    </div>
                  ) : (
                    <div className="h-px bg-line/60 mx-2 my-1.5" />
                  )}
                  <div className="space-y-0.5">
                    {group.items.map((item) => (
                      <AdminSidebarButton
                        key={item.id}
                        item={item}
                        isActive={activeTab === item.id}
                        collapsed={isCollapsed}
                        onClick={() => handleSelect(item.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Footer Expand / Collapse Toggle Bar */}
          <div
            className={cn(
              "pt-2 border-t border-line mt-2",
              isCollapsed ? "flex justify-center" : "flex items-center justify-between px-2 text-meta text-ink-tertiary"
            )}
          >
            {!isCollapsed && (
              <span className="font-mono text-label-sm">v1.0 • Ops Ready</span>
            )}
            <button
              type="button"
              onClick={toggleCollapse}
              className="p-1.5 rounded-lg text-ink-secondary hover:text-ink hover:bg-[#F4F3EF] transition-colors"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <PanelLeft className="w-3.5 h-3.5 text-[#0E8F5D]" />
              ) : (
                <PanelLeftClose className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
