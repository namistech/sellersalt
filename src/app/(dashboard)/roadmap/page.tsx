"use client";

import React, { useEffect, useState } from "react";
import {
  Sparkles,
  ThumbsUp,
  Plus,
  Compass,
  CheckCircle2,
  Clock,
  Hammer,
  AlertCircle,
  Search,
  Filter,
  MessageSquare,
  HelpCircle,
} from "lucide-react";
import {
  Card,
  Badge,
  Button,
  Heading,
  Text,
  Dialog,
  Input,
  Textarea,
  Select,
  Alert,
  HowItWorksGuide,
} from "@/components/ui";
import { PageHeader } from "@/components/shell";
import type {
  FeatureRequestItem,
  FeatureStatus,
  FeatureCategory,
} from "@/services/feature-requests";

const STATUS_COLUMNS: Array<{
  status: FeatureStatus;
  label: string;
  icon: React.ReactNode;
  badgeVariant: "neutral" | "warning" | "info" | "success";
}> = [
  {
    status: "PLANNED",
    label: "Planned for Next Sprint",
    icon: <Clock className="h-4 w-4 text-[#FBBF24]" />,
    badgeVariant: "warning",
  },
  {
    status: "IN_DEVELOPMENT",
    label: "Currently in Development",
    icon: <Hammer className="h-4 w-4 text-[#3B82F6]" />,
    badgeVariant: "info",
  },
  {
    status: "SHIPPED",
    label: "Recently Shipped",
    icon: <CheckCircle2 className="h-4 w-4 text-[#0E8F5D]" />,
    badgeVariant: "success",
  },
  {
    status: "UNDER_CONSIDERATION",
    label: "Community Ideas Under Review",
    icon: <Sparkles className="h-4 w-4 text-ink-tertiary" />,
    badgeVariant: "neutral",
  },
];

export default function RoadmapPage() {
  const [items, setItems] = useState<FeatureRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<FeatureCategory>("MARKET_RESEARCH");
  const [similarItems, setSimilarItems] = useState<FeatureRequestItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  async function loadRoadmap() {
    try {
      const res = await fetch("/api/feature-requests");
      const data = await res.json();
      if (data.success) {
        setItems(data.items);
      }
    } catch (err) {
      console.error("Failed to load roadmap:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRoadmap();
  }, []);

  // Check similarity as user types title
  useEffect(() => {
    if (title.trim().length < 4) {
      setSimilarItems([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/feature-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, checkOnly: true }),
        });
        const data = await res.json();
        if (data.similar) {
          setSimilarItems(data.similar);
        }
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [title]);

  async function handleVote(featureId: string) {
    try {
      const res = await fetch(`/api/feature-requests/${featureId}/vote`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === featureId
              ? { ...item, upvotes: data.upvotes, hasUpvoted: data.hasUpvoted }
              : item
          )
        );
      } else if (res.status === 401) {
        window.location.href = "/login";
      }
    } catch {
      alert("Failed to register vote.");
    }
  }

  async function handleSubmitFeature(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setModalError("Please complete both title and description fields.");
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    try {
      const res = await fetch("/api/feature-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, category }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit feature request.");
      }

      setSubmitSuccess("Your feature request has been submitted for product review!");
      setTitle("");
      setDescription("");
      await loadRoadmap();
      setTimeout(() => {
        setIsModalOpen(false);
        setSubmitSuccess(null);
      }, 1500);
    } catch (err: any) {
      setModalError(err.message || "Failed to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const filteredItems = items.filter((item) => {
    if (filterCategory !== "ALL" && item.category !== filterCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Contextual Guide */}
      <HowItWorksGuide
        title="How the SellerSalt Community Roadmap Works"
        description="Every feature request is reviewed by our engineering team. Vote on ideas to influence upcoming sprint priorities."
        steps={[
          {
            title: "1. Upvote Priority Features",
            description: "Click the upvote button on any idea you need for your Etsy workflow.",
            badge: "Direct Input",
          },
          {
            title: "2. Submit New Ideas",
            description: "Submit feature concepts with instant similarity checking to prevent duplicates.",
            badge: "Instant Check",
          },
          {
            title: "3. Transparent Development",
            description: "Track ideas as they move from review into development and release.",
            badge: "Public Progress",
          },
        ]}
      />

      <PageHeader
        title="Public Roadmap &amp; Feature Requests"
        description="Explore upcoming capabilities, vote on community ideas, and request new tools."
        primaryAction={
          <Button
            variant="primary"
            size="compact"
            onClick={() => setIsModalOpen(true)}
            className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-white text-xs font-bold"
          >
            <Plus className="h-4 w-4 mr-1.5 inline" /> Request a Feature
          </Button>
        }
      />

      {/* Filter & Search Bar */}
      <Card padding="md" className="border-line bg-white shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full sm:w-72">
            <Input
              placeholder="Search feature ideas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs w-full"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-ink-tertiary uppercase">Filter:</span>
            {["ALL", "MARKET_RESEARCH", "SEO_STUDIO", "PRODUCT_HUNTING", "SHOP_RESEARCH", "WORKSPACE_PLANNER"].map(
              (cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilterCategory(cat)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition font-semibold ${
                    filterCategory === cat
                      ? "bg-[#E7FAF1] text-[#0E8F5D] border-[#16C784]/40"
                      : "bg-surface text-ink-secondary border-line hover:text-ink"
                  }`}
                >
                  {cat === "ALL" ? "All Areas" : cat === "MARKET_RESEARCH" ? "Market Research" : cat.replace("_", " ")}
                </button>
              )
            )}
          </div>
        </div>
      </Card>

      {/* Roadmap Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {STATUS_COLUMNS.map((col) => {
          const colItems = filteredItems.filter((i) => i.status === col.status);

          return (
            <div key={col.status} className="space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-line">
                <div className="flex items-center gap-2">
                  {col.icon}
                  <h3 className="text-xs font-bold text-ink uppercase tracking-wide">
                    {col.label}
                  </h3>
                </div>
                <span className="text-xs font-bold text-ink-tertiary bg-[#FAFAF8] px-2 py-0.5 rounded-full border border-line-subtle tabular-nums">
                  {colItems.length}
                </span>
              </div>

              <div className="space-y-3">
                {colItems.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-line text-center text-xs text-ink-tertiary">
                    No items in this stage
                  </div>
                ) : (
                  colItems.map((item) => (
                    <Card
                      key={item.id}
                      padding="md"
                      className="border-line bg-white shadow-xs space-y-3 hover:border-line-strong transition flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-xs text-ink leading-snug">
                            {item.title}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleVote(item.id)}
                            className={`flex flex-col items-center justify-center p-1.5 rounded-lg border transition shrink-0 ${
                              item.hasUpvoted
                                ? "bg-[#E7FAF1] text-[#0E8F5D] border-[#16C784]/40 font-bold"
                                : "bg-[#FAFAF8] text-ink-secondary border-line hover:text-ink hover:border-line-strong"
                            }`}
                            title="Upvote this feature"
                          >
                            <ThumbsUp className={`h-3 w-3 ${item.hasUpvoted ? "fill-current" : ""}`} />
                            <span className="text-[10px] tabular-nums mt-0.5 font-bold">{item.upvotes}</span>
                          </button>
                        </div>

                        <p className="text-xs text-ink-secondary leading-relaxed">
                          {item.description}
                        </p>

                        {item.adminResponse && (
                          <div className="p-2 rounded-lg bg-[#FAFAF8] border border-line-subtle text-[11px] text-[#0E8F5D] font-semibold space-y-0.5">
                            <span className="text-[10px] uppercase font-bold text-ink-tertiary block">
                              Team Note
                            </span>
                            {item.adminResponse}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-line-subtle flex items-center justify-between text-[10px] text-ink-tertiary">
                        <span className="px-1.5 py-0.5 rounded bg-surface border border-line-subtle font-semibold">
                          {item.category.replace("_", " ")}
                        </span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature Request Modal */}
      <Dialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Request a Feature"
        description="Share what capability or workflow enhancement you'd like to see in SellerSalt."
      >
        <form onSubmit={handleSubmitFeature} className="space-y-4 pt-2">
          {modalError && <Alert variant="danger">{modalError}</Alert>}
          {submitSuccess && <Alert variant="success">{submitSuccess}</Alert>}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink">Feature Title</label>
            <Input
              placeholder="e.g. Export Competitor Long-Tail Keywords to CSV"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="text-xs"
            />
          </div>

          {/* Similar features alert */}
          {similarItems.length > 0 && (
            <div className="p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-xs space-y-1.5">
              <div className="font-bold text-[#92400E] flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" /> Similar features already exist:
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-[#B45309]">
                {similarItems.slice(0, 2).map((s) => (
                  <li key={s.id}>
                    <strong>{s.title}</strong> ({s.upvotes} votes)
                  </li>
                ))}
              </ul>
              <div className="text-[11px] text-[#92400E]">
                Consider upvoting existing requests to help them ship faster!
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-line bg-surface font-semibold text-ink"
            >
              <option value="MARKET_RESEARCH">Market Research</option>
              <option value="SEO_STUDIO">Listing SEO Studio</option>
              <option value="PRODUCT_HUNTING">Product Hunting</option>
              <option value="SHOP_RESEARCH">Shop Research</option>
              <option value="WORKSPACE_PLANNER">Workspace Planner</option>
              <option value="BILLING_ACCOUNT">Billing &amp; Account</option>
              <option value="INTEGRATIONS">Marketplace Integrations</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink">Description &amp; Use Case</label>
            <Textarea
              placeholder="Explain how this feature would help your Etsy business..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              required
              className="text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
            <Button
              type="button"
              variant="secondary"
              size="compact"
              onClick={() => setIsModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="compact"
              loading={isSubmitting}
              className="text-xs bg-[#0E8F5D] hover:bg-[#0C7A52] text-white font-bold"
            >
              Submit Feature Request
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
