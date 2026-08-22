"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Compass,
  Radar,
  Search,
  Sparkles,
  Layers,
  Store,
  Flame,
  ArrowRight,
  X,
  CheckCircle2,
  Circle,
  FileText,
  Zap,
} from "lucide-react";
import { Button, Badge } from "@/components/ui";

interface DashboardOnboardingGuideProps {
  hasActiveSearches: boolean;
  hasTrackedShops: boolean;
  hasProspects: boolean;
  /** Real, server-derived — from User.onboardingCategory/onboardingGoal
   * (set only by POST /api/onboarding/complete). Never localStorage: a
   * client-side value can't be trusted as a server-side business fact. */
  onboardingCategory: string | null;
  onboardingGoal: string | null;
  /** Real, server-derived — whether this org has ever created a listing
   * draft (any status), i.e. actually used Studio at least once. */
  hasListingDraft: boolean;
}

export function DashboardOnboardingGuide({
  hasActiveSearches,
  hasTrackedShops,
  hasProspects,
  onboardingCategory,
  onboardingGoal,
  hasListingDraft,
}: DashboardOnboardingGuideProps) {
  const [dismissed, setDismissed] = useState<boolean>(true);
  const [mounted, setMounted] = useState(false);

  // "Dismissed" is genuinely client-only UI state (which device/browser
  // hid the banner) — no server-side meaning, so localStorage is the
  // correct, honest place for it. Unlike category/goal, it's never read as
  // a completion fact.
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("sellersalt_onboarding_dismissed");

    if (!saved && (!hasActiveSearches || !hasTrackedShops || !hasProspects)) {
      setDismissed(false);
    }
  }, [hasActiveSearches, hasTrackedShops, hasProspects]);

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem("sellersalt_onboarding_dismissed", "true");
  }

  function handleReopen() {
    setDismissed(false);
    localStorage.removeItem("sellersalt_onboarding_dismissed");
  }

  if (!mounted) return null;

  if (dismissed) {
    return (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleReopen}
          className="text-xs font-semibold text-[#0E8F5D] hover:underline flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#E7FAF1] border border-[#0E8F5D]/20 transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5" /> Fast-Start Research Guide
        </button>
      </div>
    );
  }

  // 6-step Activation Checklist
  const activationSteps = [
    { title: "Account created", completed: true },
    { title: "Niche & market selected", completed: Boolean(onboardingCategory) },
    { title: "Goal defined", completed: Boolean(onboardingGoal) },
    { title: "Run first research", completed: hasActiveSearches || hasProspects, href: "/radar" },
    { title: "Save first opportunity", completed: hasProspects, href: "/prospects" },
    { title: "Build listing strategy", completed: hasListingDraft, href: "/studio" },
  ];

  const completedCount = activationSteps.filter((s) => s.completed).length;
  const progressPct = Math.round((completedCount / activationSteps.length) * 100);

  const steps = [
    {
      id: "radar",
      title: "Hunt Winning Products",
      subtitle: "Opportunity Radar",
      description: "Scan active Etsy listings to uncover products with high sales velocity and low review saturation.",
      href: "/radar",
      cta: "Find Products",
      icon: Flame,
      color: "text-[#0E8F5D] bg-[#E7FAF1] border-[#0E8F5D]/20",
      completed: hasProspects,
    },
    {
      id: "shop",
      title: "Research Competitors",
      subtitle: "Shop Intelligence",
      description: "Analyze any Etsy shop's estimated revenue, daily sales rate, and get a strategic competition verdict.",
      href: "/shop-intelligence",
      cta: "Research Shop",
      icon: Store,
      color: "text-blue-600 bg-blue-50 border-blue-200",
      completed: hasTrackedShops,
    },
    {
      id: "categories",
      title: "Explore Market Niches",
      subtitle: "Category Hunting",
      description: "Explore Etsy taxonomy roots and subcategories to discover growing markets with high buyer demand.",
      href: "/categories",
      cta: "Explore Categories",
      icon: Layers,
      color: "text-purple-600 bg-purple-50 border-purple-200",
      completed: false,
    },
    {
      id: "keywords",
      title: "Find Profitable Keywords",
      subtitle: "Keyword Intelligence",
      description: "Uncover high-intent buyer search phrases, tag suggestions, and competition difficulty ratings.",
      href: "/keyword-research",
      cta: "Search Keywords",
      icon: Search,
      color: "text-amber-600 bg-amber-50 border-amber-200",
      completed: false,
    },
  ];

  return (
    <div className="rounded-2xl border border-[#2A362D] bg-[#141B16] text-white p-6 shadow-md relative overflow-hidden space-y-6">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#0E8F5D]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#2A362D] relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-[#0E8F5D] animate-pulse" />
            <span className="text-label-sm font-bold uppercase tracking-wider text-[#0E8F5D]">
              Seller Activation Guide {onboardingCategory ? `· Focus: ${onboardingCategory}` : ""}
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Let&apos;s find your first high-potential eCommerce opportunity
          </h2>
          <p className="text-sm text-[#9EAA9F]">
            Complete the activation steps below to move from market discovery to your first listing strategy:
          </p>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="text-sm font-semibold text-[#9EAA9F] hover:text-white flex items-center gap-1 self-start md:self-center px-2.5 py-1.5 rounded-lg bg-[#1C261F] border border-[#2A362D] transition-colors"
          title="Dismiss onboarding guide"
        >
          <X className="h-3.5 w-3.5" /> Dismiss Guide
        </button>
      </div>

      {/* Activation Checklist Strip */}
      <div className="p-4 rounded-xl bg-[#1C261F] border border-[#2A362D] space-y-3 relative z-10">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-[#0E8F5D]" /> Your Seller Setup &amp; Activation
          </span>
          <span className="text-sm font-mono text-[#0E8F5D] font-bold">
            {completedCount} / {activationSteps.length} Completed ({progressPct}%)
          </span>
        </div>

        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-[#0E8F5D] transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 text-xs sm:text-sm">
          {activationSteps.map((step, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-1.5 p-2 rounded-lg border ${
                step.completed
                  ? "bg-[#0E8F5D]/10 border-[#0E8F5D]/30 text-[#0E8F5D]"
                  : "bg-white/5 border-white/10 text-[#9EAA9F]"
              }`}
            >
              {step.completed ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#0E8F5D]" />
              ) : (
                <Circle className="h-3.5 w-3.5 shrink-0 text-[#9EAA9F]" />
              )}
              <span className="truncate">{step.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4 Launchpad Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className="flex flex-col justify-between p-4 rounded-xl bg-[#1C261F] border border-[#2A362D] hover:border-[#0E8F5D]/50 transition-all group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center border ${step.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {step.completed ? (
                    <span className="flex items-center gap-1 text-label-sm font-bold text-[#0E8F5D] bg-[#0E8F5D]/20 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="h-3 w-3" /> Done
                    </span>
                  ) : (
                    <span className="text-label-sm font-medium text-[#9EAA9F] uppercase tracking-wider">
                      {step.subtitle}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-[#0E8F5D] transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-sm text-[#9EAA9F] mt-1 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>

              <Link
                href={step.href}
                className="mt-4 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#0E8F5D] hover:bg-[#0C7A52] text-white text-sm font-bold transition-colors shadow-2xs w-full"
              >
                <span>{step.cta}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
