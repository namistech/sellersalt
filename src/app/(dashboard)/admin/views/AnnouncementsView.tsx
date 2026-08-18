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
  Loader2,
  HelpCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export interface AnnouncementModel {
  id: string;
  title: string;
  message: string;
  ctaText?: string | null;
  ctaUrl?: string | null;
  priority: "URGENT" | "NORMAL" | "INFO";
  placement: "TOP_BANNER" | "DASHBOARD_BANNER" | "CHECKOUT_BANNER" | "PRICING_BANNER" | "NOTIFICATIONS_PANEL" | "MODAL";
  audience: "ALL" | "LOGGED_IN" | "LOGGED_OUT" | "PAID_ONLY" | "FREE_ONLY";
  isActive: boolean;
  isPermanent?: boolean;
  isClosable?: boolean;
  displayFrequency?: string;
  maxImpressions?: number | null;
  startDate?: string;
  endDate?: string | null;
  createdAt: string;
  readsCount?: number;
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

  // Custom Announcements List from API
  const [announcements, setAnnouncements] = useState<AnnouncementModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Announcement Form
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [priority, setPriority] = useState<"URGENT" | "NORMAL" | "INFO">("NORMAL");
  const [placement, setPlacement] = useState<"TOP_BANNER" | "DASHBOARD_BANNER" | "CHECKOUT_BANNER" | "PRICING_BANNER" | "NOTIFICATIONS_PANEL" | "MODAL">("TOP_BANNER");
  const [audience, setAudience] = useState<"ALL" | "LOGGED_IN" | "LOGGED_OUT" | "PAID_ONLY" | "FREE_ONLY">("ALL");
  const [isPermanent, setIsPermanent] = useState(false);
  const [isClosable, setIsClosable] = useState(true);
  const [displayFrequency, setDisplayFrequency] = useState("ONCE");
  const [maxImpressions, setMaxImpressions] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAnnouncements = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/announcements");
      if (res.ok) {
        const data = await res.json();
        if (data.announcements) setAnnouncements(data.announcements);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleSaveUrgent = async () => {
    setUrgentSaving(true);
    try {
      await onSaveSetting("announcement_banner_active", urgentActive ? "true" : "false");
      await onSaveSetting("announcement_banner_text", urgentText);
      await onSaveSetting("announcement_banner_link", urgentLink);
      setUrgentSaved(true);
      setTimeout(() => setUrgentSaved(false), 3000);
    } finally {
      setUrgentSaving(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          message,
          ctaText: ctaText.trim() || undefined,
          ctaUrl: ctaUrl.trim() || undefined,
          priority,
          placement,
          audience,
          isPermanent,
          isClosable,
          displayFrequency,
          maxImpressions: isPermanent ? null : Number(maxImpressions) || 3,
        }),
      });

      if (res.ok) {
        setTitle("");
        setMessage("");
        setCtaText("");
        setCtaUrl("");
        setIsCreating(false);
        await fetchAnnouncements();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      await fetch(`/api/admin/announcements?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      await fetchAnnouncements();
    } catch {}
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    try {
      await fetch(`/api/admin/announcements?id=${id}`, { method: "DELETE" });
      await fetchAnnouncements();
    } catch {}
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "URGENT":
        return <Badge variant="danger">Urgent</Badge>;
      case "INFO":
        return <Badge variant="info">Info</Badge>;
      case "NORMAL":
      default:
        return <Badge variant="neutral">Normal</Badge>;
    }
  };

  const getPlacementBadge = (plc: string) => {
    switch (plc) {
      case "TOP_BANNER":
        return <Badge variant="warning">Top Banner</Badge>;
      case "DASHBOARD_BANNER":
        return <Badge variant="neutral">Dashboard</Badge>;
      case "CHECKOUT_BANNER":
        return <Badge variant="gold">Checkout</Badge>;
      case "PRICING_BANNER":
        return <Badge variant="info">Pricing</Badge>;
      case "NOTIFICATIONS_PANEL":
        return <Badge variant="neutral">Notifications</Badge>;
      case "MODAL":
        return <Badge variant="danger">Modal</Badge>;
      default:
        return <Badge variant="neutral">{plc}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-ink">Announcements & Notification Center</h2>
            <Badge variant="success">Broadcast Engine</Badge>
          </div>
          <p className="text-sm text-ink-secondary mt-1">
            Broadcast platform updates, scheduled maintenance, and promotional offers across specific app placements.
          </p>
        </div>

        <Button
          onClick={() => setIsCreating(!isCreating)}
          variant={isCreating ? "secondary" : "primary"}
          size="compact"
          className="text-xs h-9 px-4 font-semibold"
        >
          {isCreating ? (
            "Cancel Creation"
          ) : (
            <>
              <Plus className="w-4 h-4 mr-1.5" />
              New Targeted Broadcast
            </>
          )}
        </Button>
      </div>

      {/* 1. Global Urgent Top Banner */}
      <div className="p-6 rounded-2xl border border-line bg-white shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-amber-600" />
              <span>Global Emergency Top Bar</span>
            </h3>
            <p className="text-xs text-ink-secondary mt-0.5">
              Pinned bar rendered on every page for immediate maintenance or critical notices.
            </p>
          </div>
          <Badge variant={urgentActive ? "warning" : "neutral"}>
            {urgentActive ? "Active Live" : "Disabled"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink">Banner Headline Text</label>
            <input
              type="text"
              placeholder="e.g. Scheduled Etsy API sync maintenance this Sunday at 2 AM EST..."
              value={urgentText}
              onChange={(e) => setUrgentText(e.target.value)}
              className="w-full text-xs bg-[#FAFAF8] border border-line px-3 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink">Destination Link (Optional)</label>
            <input
              type="url"
              placeholder="https://status.sellersalt.com"
              value={urgentLink}
              onChange={(e) => setUrgentLink(e.target.value)}
              className="w-full text-xs font-mono bg-[#FAFAF8] border border-line px-3 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-line">
          <label className="flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={urgentActive}
              onChange={(e) => setUrgentActive(e.target.checked)}
              className="rounded border-line text-amber-600 accent-amber-600"
            />
            <span>Enable Urgent Top-Bar Broadcast</span>
          </label>

          <Button
            size="compact"
            variant="primary"
            onClick={handleSaveUrgent}
            disabled={urgentSaving}
            className="text-xs h-8 px-4 font-semibold"
          >
            {urgentSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                Saving...
              </>
            ) : urgentSaved ? (
              "✓ Saved!"
            ) : (
              "Save Urgent Banner"
            )}
          </Button>
        </div>
      </div>

      {/* Compose Announcement Modal / Form */}
      {isCreating && (
        <form
          onSubmit={handleCreateSubmit}
          className="p-6 rounded-2xl border border-line bg-white shadow-md space-y-5"
        >
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h3 className="font-bold text-base text-ink flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0E8F5D]" />
              <span>Compose Targeted Announcement</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Title</label>
              <input
                type="text"
                required
                placeholder="Etsy Tag Optimization Engine Upgraded"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs bg-[#FAFAF8] border border-line px-3 py-2 rounded-xl text-ink font-semibold focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-semibold text-ink block mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full text-xs bg-[#FAFAF8] border border-line px-2.5 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="INFO">Information</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink block mb-1">Placement</label>
                <select
                  value={placement}
                  onChange={(e) => setPlacement(e.target.value as any)}
                  className="w-full text-xs bg-[#FAFAF8] border border-line px-2.5 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
                >
                  <option value="TOP_BANNER">Top Global Banner</option>
                  <option value="DASHBOARD_BANNER">Dashboard Header</option>
                  <option value="CHECKOUT_BANNER">Checkout Page</option>
                  <option value="PRICING_BANNER">Pricing Page</option>
                  <option value="NOTIFICATIONS_PANEL">Notifications Bell</option>
                  <option value="MODAL">Modal Popup</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink block mb-1">Audience</label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value as any)}
                  className="w-full text-xs bg-[#FAFAF8] border border-line px-2.5 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
                >
                  <option value="ALL">All Visitors</option>
                  <option value="LOGGED_IN">Logged-In Sellers</option>
                  <option value="LOGGED_OUT">Logged-Out Only</option>
                  <option value="FREE_ONLY">Free Tier Only</option>
                  <option value="PAID_ONLY">Paid Subscribers Only</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink">Announcement Body Message</label>
            <textarea
              rows={3}
              required
              placeholder="Detailed notification copy explaining the feature update or platform notification..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full text-xs bg-[#FAFAF8] border border-line px-3 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Call-to-Action Button Text (Optional)</label>
              <input
                type="text"
                placeholder="View Documentation"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                className="w-full text-xs bg-[#FAFAF8] border border-line px-3 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Call-to-Action Destination URL</label>
              <input
                type="url"
                placeholder="https://sellersalt.com/changelog"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                className="w-full text-xs font-mono bg-[#FAFAF8] border border-line px-3 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-line flex-wrap gap-3">
            <div className="flex items-center gap-4 text-xs text-ink">
              <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={isPermanent}
                  onChange={(e) => setIsPermanent(e.target.checked)}
                  className="rounded border-line text-[#0E8F5D] accent-[#0E8F5D]"
                />
                <span>Persistent / Evergreen</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={isClosable}
                  onChange={(e) => setIsClosable(e.target.checked)}
                  className="rounded border-line text-[#0E8F5D] accent-[#0E8F5D]"
                />
                <span>Allow User Dismissal</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
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
                disabled={isSubmitting}
                className="text-xs font-semibold"
              >
                {isSubmitting ? "Publishing Broadcast..." : "Publish Broadcast"}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* 2. Active & Scheduled Broadcasts List */}
      <div className="p-6 rounded-2xl border border-line bg-white shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-ink">Active & Scheduled Broadcasts</h3>
          <span className="text-xs text-ink-tertiary font-mono">{announcements.length} recorded</span>
        </div>

        {isLoading ? (
          <div className="py-8 flex items-center justify-center gap-2 text-xs text-ink-tertiary">
            <Loader2 className="w-4 h-4 animate-spin text-[#0E8F5D]" />
            <span>Loading broadcasts...</span>
          </div>
        ) : announcements.length === 0 ? (
          <div className="py-8 text-center text-xs text-ink-tertiary">
            No targeted announcements created yet. Click "New Targeted Broadcast" above to create one.
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className="p-4 rounded-xl border border-line bg-[#FAFAF8] flex items-start justify-between gap-4 flex-wrap"
              >
                <div className="space-y-1.5 flex-1 min-w-[280px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-ink">{ann.title}</span>
                    {getPriorityBadge(ann.priority)}
                    {getPlacementBadge(ann.placement)}
                    <Badge variant="neutral" className="text-[10px]">
                      Audience: {ann.audience}
                    </Badge>
                    <Badge variant={ann.isActive ? "success" : "neutral"} className="text-[10px]">
                      {ann.isActive ? "Live" : "Paused"}
                    </Badge>
                  </div>

                  <p className="text-xs text-ink-secondary leading-relaxed">{ann.message}</p>

                  <div className="flex items-center gap-4 text-[11px] text-ink-tertiary pt-1">
                    <span>Created: {new Date(ann.createdAt).toLocaleDateString()}</span>
                    <span>Dismissals: {ann.readsCount || 0}</span>
                    {ann.ctaText && ann.ctaUrl && (
                      <a
                        href={ann.ctaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#0E8F5D] hover:underline inline-flex items-center gap-1 font-semibold"
                      >
                        <span>CTA: {ann.ctaText}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="compact"
                    variant="secondary"
                    onClick={() => handleToggleActive(ann.id, ann.isActive)}
                    className="text-xs h-7 px-2.5 font-semibold"
                  >
                    {ann.isActive ? "Pause" : "Activate"}
                  </Button>

                  <button
                    type="button"
                    onClick={() => handleDelete(ann.id)}
                    className="p-1.5 text-ink-tertiary hover:text-red-600 rounded-lg hover:bg-white transition-colors"
                    title="Delete Announcement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
