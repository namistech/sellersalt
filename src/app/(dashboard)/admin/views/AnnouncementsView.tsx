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
      await onSaveSetting("announcement_urgent_active", String(urgentActive));
      await onSaveSetting("announcement_urgent_text", urgentText);
      await onSaveSetting("announcement_urgent_link", urgentLink);
      setUrgentSaved(true);
      setTimeout(() => setUrgentSaved(false), 2500);
    } finally {
      setUrgentSaving(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          message,
          ctaText,
          ctaUrl,
          priority,
          placement,
          audience,
          isPermanent,
          isClosable,
          displayFrequency,
          maxImpressions,
        }),
      });

      if (res.ok) {
        setIsCreating(false);
        setTitle("");
        setMessage("");
        setCtaText("");
        setCtaUrl("");
        await fetchAnnouncements();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await fetch("/api/admin/announcements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !currentActive }),
      });
      await fetchAnnouncements();
    } catch {
      //
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    try {
      await fetch(`/api/admin/announcements?id=${id}`, { method: "DELETE" });
      await fetchAnnouncements();
    } catch {
      //
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-[var(--color-line)]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[var(--color-ink)]">Announcements & Notification Center</h2>
            <Badge variant="success">
              Persistent Multi-Placement Broadcasts
            </Badge>
          </div>
          <p className="text-sm text-[var(--color-ink-muted)] mt-1">
            Publish site-wide alert banners, target dashboard announcements to specific seller cohorts, and track dismissal metrics.
          </p>
        </div>

        <Button
          size="compact"
          variant="primary"
          onClick={() => setIsCreating((s) => !s)}
          className="text-xs h-9 font-semibold flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>{isCreating ? "Close Composer" : "Compose Announcement"}</span>
        </Button>
      </div>

      {/* Urgent Top Banner Override Card */}
      <div className="p-6 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-3">
          <div>
            <h3 className="text-base font-bold text-[var(--color-ink)] flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-amber-500" />
              <span>Urgent Global Top-Bar Override</span>
            </h3>
            <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
              High-priority broadcast banner rendered above all navigation on every page.
            </p>
          </div>
          <Badge variant={urgentActive ? "warning" : "neutral"}>
            {urgentActive ? "ACTIVE ON LIVE SITE" : "INACTIVE"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-medium text-[var(--color-ink)]">Banner Headline Text</label>
            <input
              type="text"
              value={urgentText}
              onChange={(e) => setUrgentText(e.target.value)}
              placeholder="e.g. Scheduled maintenance on Etsy synchronization engine tonight at 02:00 UTC."
              className="w-full text-xs bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--color-ink)]">Destination Link (Optional)</label>
            <input
              type="url"
              value={urgentLink}
              onChange={(e) => setUrgentLink(e.target.value)}
              placeholder="https://status.sellersalt.com"
              className="w-full text-xs font-mono bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)]"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-[var(--color-line)]">
          <label className="flex items-center gap-2 text-xs font-medium text-[var(--color-ink)] cursor-pointer">
            <input
              type="checkbox"
              checked={urgentActive}
              onChange={(e) => setUrgentActive(e.target.checked)}
              className="rounded border-[var(--color-line)] text-amber-500"
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
          className="p-6 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-md space-y-5"
        >
          <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-3">
            <h3 className="font-bold text-base text-[var(--color-ink)] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--color-brand-primary)]" />
              <span>Compose Target Announcement</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-ink)]">Title</label>
              <input
                type="text"
                required
                placeholder="Etsy Tag Optimization Engine Upgraded"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)] font-semibold"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-medium text-[var(--color-ink)] block mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full text-xs bg-[var(--color-paper)] border border-[var(--color-line)] px-2.5 py-2 rounded-xl text-[var(--color-ink)]"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="INFO">Information</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-ink)] block mb-1">Placement</label>
                <select
                  value={placement}
                  onChange={(e) => setPlacement(e.target.value as any)}
                  className="w-full text-xs bg-[var(--color-paper)] border border-[var(--color-line)] px-2.5 py-2 rounded-xl text-[var(--color-ink)]"
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
                <label className="text-xs font-medium text-[var(--color-ink)] block mb-1">Audience</label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value as any)}
                  className="w-full text-xs bg-[var(--color-paper)] border border-[var(--color-line)] px-2.5 py-2 rounded-xl text-[var(--color-ink)]"
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
            <label className="text-xs font-medium text-[var(--color-ink)]">Announcement Body Message</label>
            <textarea
              required
              rows={3}
              placeholder="Full copy explaining new tools, Etsy API ceiling upgrades, or feature announcements..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full text-xs bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-ink)]">Call-to-Action Button Text (Optional)</label>
              <input
                type="text"
                placeholder="View Audit Studio"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                className="w-full text-xs bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-ink)]">Call-to-Action Destination URL</label>
              <input
                type="url"
                placeholder="/seo-engine"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                className="w-full text-xs font-mono bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[var(--color-line)] flex-wrap gap-3">
            <div className="flex items-center gap-4 text-xs text-[var(--color-ink)]">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isClosable}
                  onChange={(e) => setIsClosable(e.target.checked)}
                  className="rounded border-[var(--color-line)] text-[var(--color-brand-primary)]"
                />
                <span>Dismissible by users</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPermanent}
                  onChange={(e) => setIsPermanent(e.target.checked)}
                  className="rounded border-[var(--color-line)] text-[var(--color-brand-primary)]"
                />
                <span>Permanent (Stick until deleted)</span>
              </label>
            </div>

            <div className="flex gap-2">
              <Button size="compact" variant="secondary" type="button" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button size="compact" variant="primary" type="submit" disabled={isSubmitting} className="font-semibold">
                {isSubmitting ? "Publishing..." : "Publish Announcement"}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Announcements List */}
      <div className="p-6 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-[var(--color-ink)]">Active & Scheduled Broadcasts</h3>
          <span className="text-xs text-[var(--color-ink-muted)] font-mono">{announcements.length} recorded</span>
        </div>

        {isLoading ? (
          <div className="py-8 flex items-center justify-center gap-2 text-xs text-[var(--color-ink-muted)]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading announcements...</span>
          </div>
        ) : announcements.length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--color-ink-muted)]">
            No announcements created yet. Click &quot;Compose Announcement&quot; to publish your first broadcast.
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className="p-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] flex items-start justify-between gap-4 flex-wrap"
              >
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-[var(--color-ink)]">{ann.title}</span>
                    <Badge variant={ann.priority === "URGENT" ? "danger" : ann.priority === "INFO" ? "info" : "success"}>
                      {ann.priority}
                    </Badge>
                    <Badge variant="neutral">
                      {ann.placement}
                    </Badge>
                    <Badge variant="neutral">
                      {ann.audience}
                    </Badge>
                  </div>

                  <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">{ann.message}</p>

                  <div className="flex items-center gap-4 text-[11px] text-[var(--color-ink-muted)] pt-1">
                    {ann.ctaText && ann.ctaUrl && (
                      <a
                        href={ann.ctaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--color-brand-primary)] hover:underline inline-flex items-center gap-1 font-medium"
                      >
                        <span>CTA: {ann.ctaText}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <span>Dismissals: {ann.readsCount || 0}</span>
                    <span>Created: {new Date(ann.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="compact"
                    variant="secondary"
                    onClick={() => handleToggleActive(ann.id, ann.isActive)}
                    className="text-xs h-7 px-2.5"
                  >
                    {ann.isActive ? "Pause" : "Activate"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => handleDelete(ann.id)}
                    className="p-1.5 text-[var(--color-ink-muted)] hover:text-rose-600 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
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
