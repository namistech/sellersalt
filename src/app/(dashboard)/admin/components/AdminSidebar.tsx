"use client";

import React from "react";
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
} from "lucide-react";
import { Badge } from "@/components/ui";

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
}

export function AdminSidebar({
  activeTab,
  onSelectTab,
  userCount = 0,
  orgCount = 0,
  unverifiedCount = 0,
}: AdminSidebarProps) {
  const navGroups: AdminNavGroup[] = [
    {
      id: "general",
      label: "General",
      items: [
        { id: "overview", label: "Operations Overview", icon: LayoutDashboard },
        { id: "app-settings", label: "App Settings", icon: Settings },
        { id: "branding", label: "Branding & SEO", icon: Palette },
        { id: "storage", label: "Media Library", icon: ImageIcon },
        { id: "notifications", label: "Announcements", icon: Bell },
      ],
    },
    {
      id: "users_orgs",
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
      id: "billing",
      label: "Billing & Plans",
      items: [
        { id: "packages", label: "Plans & Quotas", icon: Layers },
        { id: "coupons", label: "Coupons", icon: Tag },
        { id: "payments", label: "Payment Gateways", icon: CreditCard },
      ],
    },
    {
      id: "integrations",
      label: "Marketplace & OAuth",
      items: [
        { id: "integrations", label: "Integration Hub", icon: Globe, badge: "8 Channels" },
      ],
    },
    {
      id: "ai_automation",
      label: "AI & Automation",
      items: [
        { id: "ai", label: "AI Providers", icon: Sparkles },
        { id: "ai-assistant", label: "SaltBot Persona", icon: Bot },
        { id: "mcp", label: "MCP Protocol", icon: Cpu, badge: "v1.0" },
        { id: "webhooks", label: "Webhooks Log", icon: Webhook },
      ],
    },
    {
      id: "security",
      label: "Security & Trust",
      items: [
        { id: "security", label: "Abuse & Risk Telemetry", icon: Shield, badge: "Active" },
        { id: "audit-logs", label: "Audit Logs", icon: FileText },
      ],
    },
    {
      id: "system",
      label: "System & Infrastructure",
      items: [
        { id: "email", label: "Email / SMTP", icon: Mail },
        { id: "storage-config", label: "S3 / R2 Storage", icon: HardDrive },
        { id: "diagnostics", label: "Diagnostics & Health", icon: Activity },
      ],
    },
  ];

  return (
    <aside className="w-full lg:w-64 shrink-0 space-y-6">
      <div className="bg-white rounded-2xl border border-line p-3 sm:p-4 shadow-xs space-y-5">
        {navGroups.map((group) => (
          <div key={group.id} className="space-y-1.5">
            <div className="px-3 text-[11px] font-extrabold uppercase tracking-wider text-ink-tertiary">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
                      isActive
                        ? "bg-[#141B16] text-white shadow-xs"
                        : "text-ink-secondary hover:text-ink hover:bg-[#F4F3EF]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          isActive ? "text-[#0E8F5D]" : "text-ink-tertiary"
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge !== undefined && (
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
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
