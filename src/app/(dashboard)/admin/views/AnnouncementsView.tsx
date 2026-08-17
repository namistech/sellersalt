"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  Megaphone,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Clock,
  Eye,
  Layers,
  Sparkles,
  Zap,
  Sliders,
} from "lucide-react";
import {
  Card,
  Heading,
  Text,
  Badge,
  Button,
  Alert,
} from "@/components/ui";

export interface AnnouncementModel {
  id: string;
  title: string;
  message: string;
  linkText?: string;
  linkUrl?: string;
  priority: "URGENT" | "NORMAL" | "INFO";
  placement: "TOP_BANNER" | "DASHBOARD_BANNER" | "CHECKOUT_BANNER" | "PRICING_BANNER" | "NOTIFICATIONS_PANEL";
  audience: "ALL" | "LOGGED_IN" | "LOGGED_OUT" | "PAID_ONLY" | "FREE_ONLY";
  status: "ACTIVE" | "SCHEDULED" | "DRAFT" | "EXPIRED";
  dismissible: boolean;
  expiresAt?: string | null;
  createdAt: string;
}

interface AnnouncementsViewProps {
  urgentBannerActive: boolean;
  urgentBannerText: string;
  urgentBannerLink: string;
  onSaveSetting: (key: string, value: string) => Promise<boolean>;
}

export function AnnouncementsView({
  urgentBannerActive,
  urgentBannerText,
  urgentBannerLink,
  onSaveSetting,
}: AnnouncementsViewProps) {
  // Urgent Top Banner State
  const [urgentActive, setUrgentActive] = useState(urgentBannerActive);
  const [urgentText, setUrgentText] = useState(urgentBannerText);
  const [urgentLink, setUrgentLink] = useState(urgentBannerLink);
  const [urgentSaving, setUrgentSaving] = useState(false);
  const [urgentSaved, setUrgentSaved] = useState(false);

  // Custom Announcements List
  const [announcements, setAnnouncements] = useState<AnnouncementModel[]>([
    {
      id: "ann-1",
      title: "Etsy Open API v3 Rate Limit Ceilings Expanded",
      message: "Listing audit queues now process up to 8 req/sec with instant tag synchronization and SEO scoring.",
      linkText: "View Diagnostics",
      linkUrl: "/admin?tab=diagnostics",
      priority: "NORMAL",
      placement: "DASHBOARD_BANNER",
      audience: "ALL",
      status: "ACTIVE",
      dismissible: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "ann-2",
      title: "Special Launch Pricing — Starter & Pro Plans",
      message: "Get 3-day full access trials on all growth packages with automated Etsy SEO analysis.",
      linkText: "Upgrade Workspace",
      linkUrl: "/checkout?plan=PRO",
      priority: "INFO",
      placement: "TOP_BANNER",
      audience: "FREE_ONLY",
      status: "ACTIVE",
      dismissible: true,
      createdAt: new Date().toISOString(),
    },
  ]);

  // New Announcement Form
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [priority, setPriority] = useState<"URGENT" | "NORMAL" | "INFO">("NORMAL");
  const [placement, setPlacement] = useState<"TOP_BANNER" | "DASHBOARD_BANNER" | "CHECKOUT_BANNER" | "PRICING_BANNER" | "NOTIFICATIONS_PANEL">("TOP_BANNER");
  const [audience, setAudience] = useState<"ALL" | "LOGGED_IN" | "LOGGED_OUT" | "PAID_ONLY" | "FREE_ONLY">("ALL");
  const [dismissible, setDismissible] = useState(true);

  const handleSaveUrgentBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    setUrgentSaving(true);
    await onSaveSetting("announcement_urgent_active", String(urgentActive));
    await onSaveSetting("announcement_urgent_text", urgentText.trim());
    await onSaveSetting("announcement_urgent_link", urgentLink.trim());
    setUrgentSaving(false);
    setUrgentSaved(true);
    setTimeout(() => setUrgentSaved(false), 2500);
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    try {
      await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          title: title.trim(),
          message: message.trim(),
          linkText: linkText.trim() || undefined,
          linkUrl: linkUrl.trim() || undefined,
          priority,
          placement: placement === "TOP_BANNER" ? "BANNER" : "NOTIFICATIONS",
        }),
      });
    } catch {}

    const newAnn: AnnouncementModel = {
      id: `ann-${Date.now()}`,
      title: title.trim(),
      message: message.trim(),
      linkText: linkText.trim() || undefined,
      linkUrl: linkUrl.trim() || undefined,
      priority,
      placement,
      audience,
      status: "ACTIVE",
      dismissible,
      createdAt: new Date().toISOString(),
    };

    setAnnouncements((prev) => [newAnn, ...prev]);
    setIsCreating(false);
    setTitle("");
    setMessage("");
    setLinkText("");
    setLinkUrl("");
  };

  const handleDeleteAnnouncement = (id: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0E8F5D]/10 text-[#0E8F5D]">
              <Megaphone className="h-4 w-4" />
            </span>
            <Heading as="h2" size="h3" className="text-xl font-bold text-ink">
              Announcements & System Alerts Engine
            </Heading>
          </div>
          <Text size="body-sm" className="text-ink-secondary mt-1">
            Broadcast targeted banner notifications, feature announcements, and maintenance alerts across marketing pages and customer workspaces.
          </Text>
        </div>

        <Button
          variant="primary"
          size="compact"
          onClick={() => setIsCreating(true)}
          className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-white text-xs font-bold self-start sm:self-auto"
        >
          <Plus className="h-4 w-4 mr-1" /> Create Announcement
        </Button>
      </div>

      {/* 1. URGENT EMERGENCY BANNER */}
      <Card padding="lg" className="border-line bg-white shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-ink">Global Top Urgent Announcement Banner</h3>
            <p className="text-xs text-ink-tertiary">Prominently rendered at the top of every public and authenticated page.</p>
          </div>
          <Badge variant={urgentActive ? "success" : "neutral"}>
            {urgentActive ? "ACTIVE BANNER" : "DISABLED"}
          </Badge>
        </div>

        {urgentSaved && <Alert variant="success">Urgent Announcement Banner settings saved successfully.</Alert>}

        <form onSubmit={handleSaveUrgentBanner} className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="urgentActiveToggle"
              checked={urgentActive}
              onChange={(e) => setUrgentActive(e.target.checked)}
              className="h-4 w-4 accent-[#0E8F5D] rounded"
            />
            <label htmlFor="urgentActiveToggle" className="text-xs font-bold text-ink cursor-pointer">
              Display Urgent Announcement Banner Globally
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-ink">Banner Message</label>
              <input
                type="text"
                value={urgentText}
                onChange={(e) => setUrgentText(e.target.value)}
                placeholder="e.g. ⚡ Special Promo: 50% off all Pro plans this week only!"
                className="w-full text-xs border border-line rounded-lg px-3 py-2 bg-white text-ink"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-ink">Action Link / Destination URL</label>
              <input
                type="text"
                value={urgentLink}
                onChange={(e) => setUrgentLink(e.target.value)}
                placeholder="https://sellersalt.com/pricing or /checkout?plan=PRO"
                className="w-full text-xs border border-line rounded-lg px-3 py-2 bg-white text-ink"
              />
            </div>
          </div>

          {/* Live Preview */}
          {urgentActive && urgentText && (
            <div className="p-3 rounded-xl bg-[#141B16] text-white flex items-center justify-between text-xs font-medium border border-[#2A362D]">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-[#0E8F5D] animate-pulse" />
                <span>{urgentText}</span>
              </div>
              {urgentLink && (
                <span className="text-[#0E8F5D] underline font-bold flex items-center gap-1 text-[11px]">
                  Learn more <ExternalLink className="h-3 w-3" />
                </span>
              )}
            </div>
          )}

          <Button
            type="submit"
            variant="secondary"
            size="compact"
            loading={urgentSaving}
            className="text-xs font-bold"
          >
            Save Emergency Banner
          </Button>
        </form>
      </Card>

      {/* 2. CREATE ANNOUNCEMENT FORM */}
      {isCreating && (
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-5 border-l-4 border-l-[#0E8F5D]">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h3 className="text-sm font-extrabold text-ink">Author New Announcement</h3>
            <Button
              variant="ghost"
              size="compact"
              onClick={() => setIsCreating(false)}
              className="text-xs"
            >
              Cancel
            </Button>
          </div>

          <form onSubmit={handleCreateAnnouncement} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-ink">Announcement Headline / Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. New Feature: Instant Keyword Clustering"
                  className="w-full text-xs border border-line rounded-lg px-3 py-2 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-ink">Placement Surface</label>
                <select
                  value={placement}
                  onChange={(e) => setPlacement(e.target.value as any)}
                  className="w-full text-xs border border-line rounded-lg px-3 py-2 bg-white font-semibold"
                >
                  <option value="TOP_BANNER">Homepage & Top Bar Banner</option>
                  <option value="DASHBOARD_BANNER">Logged-In Workspace Dashboard</option>
                  <option value="CHECKOUT_BANNER">Checkout Page Banner</option>
                  <option value="PRICING_BANNER">Pricing Table Banner</option>
                  <option value="NOTIFICATIONS_PANEL">Notification Center Bell Dropdown</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-ink">Announcement Message Body</label>
              <textarea
                required
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Explain the update, value proposition, or instruction clearly in plain English..."
                className="w-full text-xs border border-line rounded-lg px-3 py-2 bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-ink">Button / CTA Text (Optional)</label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="e.g. Try Now"
                  className="w-full text-xs border border-line rounded-lg px-3 py-2 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-ink">Destination URL (Optional)</label>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="e.g. /keyword-research"
                  className="w-full text-xs border border-line rounded-lg px-3 py-2 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-ink">Target Audience</label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value as any)}
                  className="w-full text-xs border border-line rounded-lg px-3 py-2 bg-white font-semibold"
                >
                  <option value="ALL">All Users (Public & Auth)</option>
                  <option value="LOGGED_IN">Logged-In Customers Only</option>
                  <option value="LOGGED_OUT">Public Visitors Only</option>
                  <option value="FREE_ONLY">Free Tier Users Only</option>
                  <option value="PAID_ONLY">Paid Subscribers Only</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="compact"
                onClick={() => setIsCreating(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="compact"
                className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-white text-xs font-bold px-4"
              >
                Publish Announcement
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* 3. ACTIVE ANNOUNCEMENTS LIST */}
      <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h3 className="text-sm font-extrabold text-ink">Active & Published Announcements ({announcements.length})</h3>
          <Badge variant="neutral">Targeted Broadcasts</Badge>
        </div>

        <div className="space-y-3">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className="p-4 rounded-xl border border-line bg-[#FAFAF8] space-y-3 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={ann.priority === "URGENT" ? "danger" : ann.priority === "NORMAL" ? "success" : "neutral"} className="text-[10px]">
                    {ann.priority}
                  </Badge>
                  <Badge variant="neutral" className="text-[10px]">
                    {ann.placement}
                  </Badge>
                  <Badge variant="neutral" className="text-[10px]">
                    Audience: {ann.audience}
                  </Badge>
                  <h4 className="text-xs font-bold text-ink truncate">{ann.title}</h4>
                </div>
                <p className="text-xs text-ink-secondary">{ann.message}</p>
                {ann.linkText && ann.linkUrl && (
                  <a
                    href={ann.linkUrl}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0E8F5D] hover:underline"
                  >
                    {ann.linkText} <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDeleteAnnouncement(ann.id)}
                  className="p-1.5 rounded-lg text-ink-tertiary hover:text-red-600 hover:bg-red-50 transition text-xs"
                  title="Delete announcement"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {announcements.length === 0 && (
            <div className="py-8 text-center text-xs text-ink-tertiary">
              No active announcements. Click "Create Announcement" to publish one.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
