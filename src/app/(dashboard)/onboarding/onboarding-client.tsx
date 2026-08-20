"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Compass,
  ArrowRight,
  CheckCircle2,
  Store,
  Flame,
  Search,
  Layers,
  Sparkles,
  ShieldCheck,
  Zap,
  HelpCircle,
  TrendingUp,
  BarChart3,
  Check,
} from "lucide-react";
import { Button, Card, Badge } from "@/components/ui";

const CATEGORIES = [
  "Home & Living",
  "Jewelry & Accessories",
  "Apparel & Footwear",
  "Craft Supplies & Tools",
  "Office & Workspace",
  "Kitchen & Dining",
  "Pet Accessories",
  "Beauty & Personal Care",
];

const MARKETPLACE_OPTIONS = [
  { id: "etsy", label: "Etsy", badge: "Live Catalog & Research" },
  { id: "amazon", label: "Amazon", badge: "Public Catalog & Pricing" },
  { id: "ebay", label: "eBay", badge: "Completed & Active Listings" },
  { id: "walmart", label: "Walmart", badge: "Catalog & BuyBox Structure" },
];

const COMMERCIAL_GOALS = [
  {
    id: "discover",
    title: "1. Discover Emerging Opportunities",
    description: "Surface low-saturation, high-potential product ideas and attribute gaps.",
    icon: Flame,
    route: "/discovery",
  },
  {
    id: "research",
    title: "2. Research Market Structure",
    description: "Analyze observable price distributions, review barriers, and seller concentration.",
    icon: Search,
    route: "/research-center",
  },
  {
    id: "validate",
    title: "3. Validate Commercial Feasibility",
    description: "Run deterministic decision models (PURSUE, TEST, WAIT, REJECT) on a specific product.",
    icon: Sparkles,
    route: "/validate",
  },
  {
    id: "workspace",
    title: "4. Plan Product Sourcing & Unit Economics",
    description: "Model 3-scenario financial sensitivity, RFQ specs, and launch readiness.",
    icon: Layers,
    route: "/product-workspaces",
  },
];

export function OnboardingClient({ userName }: { userName: string }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form states
  const [selectedCategory, setSelectedCategory] = useState("Home & Living");
  const [customNiche, setCustomNiche] = useState("Minimalist Ceramic Coffee Dripper");
  const [selectedGoal, setSelectedGoal] = useState("research");
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>(["etsy", "amazon"]);
  const [isFinishing, setIsFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  const toggleMarketplace = (id: string) => {
    if (selectedMarketplaces.includes(id)) {
      if (selectedMarketplaces.length > 1) {
        setSelectedMarketplaces(selectedMarketplaces.filter((m) => m !== id));
      }
    } else {
      setSelectedMarketplaces([...selectedMarketplaces, id]);
    }
  };

  async function handleFinish() {
    setIsFinishing(true);
    setFinishError(null);
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: selectedCategory, niche: customNiche, goal: selectedGoal }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save onboarding preferences.");
      }
      const targetGoal = COMMERCIAL_GOALS.find((g) => g.id === selectedGoal);
      router.push(targetGoal ? targetGoal.route : "/dashboard");
    } catch (err: any) {
      setIsFinishing(false);
      setFinishError(err.message || "Something went wrong saving your preferences. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] py-10 px-4 flex flex-col justify-between text-[#141B16]">
      <div className="max-w-2xl mx-auto w-full space-y-8">
        {/* Progress Bar & Header */}
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Fast-Start Merchant Setup</span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141B16] tracking-tight">
              Welcome to SellerSalt, {userName}
            </h1>
            <p className="text-xs sm:text-sm text-[#525B55]">
              Know what to sell before you spend money. Let&apos;s personalize your workspace in 60 seconds.
            </p>
          </div>

          {/* Stepper Dots */}
          <div className="flex items-center justify-center gap-2 pt-1">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all ${
                  step === s
                    ? "w-8 bg-emerald-600"
                    : step > s
                    ? "w-2 bg-emerald-600"
                    : "w-2 bg-[#E3E6E0]"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Category & Initial Idea */}
        {step === 1 && (
          <Card padding="lg" className="border-[#E3E6E0] bg-white shadow-xs space-y-6">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-[#141B16]">
                Step 1: What category and product idea are you considering?
              </h2>
              <p className="text-xs text-[#525B55]">
                SellerSalt will configure your research and opportunity feeds around this focus.
              </p>
            </div>

            {/* Category selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#525B55]">Primary Product Category</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`p-2.5 rounded-xl text-xs font-medium text-left border transition-all ${
                      selectedCategory === cat
                        ? "bg-emerald-500/10 border-emerald-600 text-emerald-800 font-bold"
                        : "bg-[#FAFAF8] border-[#E3E6E0] text-[#525B55] hover:bg-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Focus Product / Niche Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#525B55]">Initial Product Idea or Niche</label>
              <input
                type="text"
                value={customNiche}
                onChange={(e) => setCustomNiche(e.target.value)}
                placeholder="e.g. Minimalist Desk Organizer, Ceramic Pour-Over Dripper..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E6E0] text-xs font-medium focus:outline-hidden focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 bg-[#FAFAF8]"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="primary"
                onClick={() => setStep(2)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl"
              >
                <span>Continue</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Target Marketplaces & Goal */}
        {step === 2 && (
          <Card padding="lg" className="border-[#E3E6E0] bg-white shadow-xs space-y-6">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-[#141B16]">
                Step 2: Which marketplaces are relevant, and what is your primary goal?
              </h2>
              <p className="text-xs text-[#525B55]">
                SellerSalt conducts cross-marketplace research across permitted public catalogs.
              </p>
            </div>

            {/* Marketplace multi-select */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#525B55]">Target Marketplaces</label>
              <div className="grid grid-cols-2 gap-2.5">
                {MARKETPLACE_OPTIONS.map((mp) => {
                  const isSelected = selectedMarketplaces.includes(mp.id);
                  return (
                    <button
                      key={mp.id}
                      type="button"
                      onClick={() => toggleMarketplace(mp.id)}
                      className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-emerald-500/10 border-emerald-600 text-emerald-900 font-bold"
                          : "bg-[#FAFAF8] border-[#E3E6E0] text-[#525B55] hover:bg-white"
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold">{mp.label}</div>
                        <div className="text-[10px] text-[#7C847E]">{mp.badge}</div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-emerald-600" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Goal selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#525B55]">Primary First Workflow Goal</label>
              <div className="space-y-2">
                {COMMERCIAL_GOALS.map((g) => {
                  const isSelected = selectedGoal === g.id;
                  const Icon = g.icon;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setSelectedGoal(g.id)}
                      className={`w-full p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                        isSelected
                          ? "bg-emerald-500/10 border-emerald-600 text-emerald-900 shadow-xs"
                          : "bg-[#FAFAF8] border-[#E3E6E0] text-[#525B55] hover:bg-white"
                      }`}
                    >
                      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? "text-emerald-600" : "text-[#7C847E]"}`} />
                      <div>
                        <div className="text-xs font-bold text-[#141B16]">{g.title}</div>
                        <div className="text-[11px] text-[#7C847E] mt-0.5">{g.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-semibold text-[#525B55] hover:underline"
              >
                Back
              </button>
              <Button
                variant="primary"
                onClick={() => setStep(3)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl"
              >
                <span>Continue</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Our Data Trust Contract */}
        {step === 3 && (
          <Card padding="lg" className="border-[#E3E6E0] bg-white shadow-xs space-y-6">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-[#141B16]">
                Step 3: How SellerSalt Handles Marketplace Data
              </h2>
              <p className="text-xs text-[#525B55]">
                We separate observable listing facts from derived math and your grounded costs.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-1">
                <span className="font-bold text-emerald-900 block">OBSERVED Signals</span>
                <p className="text-[#525B55] text-[11px]">
                  Real listing prices, review counts, star ratings, and seller tags captured directly from permitted public catalogs.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-sky-200 bg-sky-50/40 space-y-1">
                <span className="font-bold text-sky-900 block">DERIVED & ESTIMATED Decision Models</span>
                <p className="text-[#525B55] text-[11px]">
                  Deterministic price positioning quantiles ($P_{10} - P_{90}$), seller concentration indices, and commercial feasibility scores.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                <span className="font-bold text-slate-900 block">Zero-Fabrication Contract</span>
                <p className="text-[#525B55] text-[11px]">
                  Unobservable metrics (like competitor store revenues or private search volumes) remain strictly <strong>UNAVAILABLE</strong> (never fake zeros).
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs font-semibold text-[#525B55] hover:underline"
              >
                Back
              </button>
              <Button
                variant="primary"
                onClick={() => setStep(4)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl"
              >
                <span>I Understand — Launch Workspace</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 4: Ready to Launch */}
        {step === 4 && (
          <Card padding="lg" className="border-[#E3E6E0] bg-white shadow-xs space-y-6 text-center">
            <div className="inline-flex h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 items-center justify-center mx-auto mb-1">
              <Zap className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-[#141B16]">
                You&apos;re Ready to Execute Evidence-Based Research
              </h2>
              <p className="text-xs text-[#525B55] max-w-md mx-auto">
                Your workspace is configured for <strong>{selectedCategory}</strong> ({customNiche}).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#FAFAF8] border border-[#E3E6E0] space-y-2 text-xs text-left">
              <div className="font-bold text-[#141B16] border-b border-[#E3E6E0] pb-2">Workspace Configuration Summary:</div>
              <div className="flex items-center justify-between text-[#525B55] pt-1">
                <span>Selected Focus:</span>
                <span className="font-semibold text-[#141B16]">{customNiche}</span>
              </div>
              <div className="flex items-center justify-between text-[#525B55]">
                <span>Category:</span>
                <span className="font-semibold text-[#141B16]">{selectedCategory}</span>
              </div>
              <div className="flex items-center justify-between text-[#525B55]">
                <span>Marketplaces:</span>
                <span className="font-semibold text-[#141B16] uppercase">{selectedMarketplaces.join(", ")}</span>
              </div>
              <div className="flex items-center justify-between text-[#525B55]">
                <span>First Action:</span>
                <span className="font-semibold text-[#141B16]">{COMMERCIAL_GOALS.find((g) => g.id === selectedGoal)?.title}</span>
              </div>
            </div>

            {finishError && (
              <p className="text-xs text-red-600 text-center">{finishError}</p>
            )}

            <div className="pt-2">
              <Button
                variant="primary"
                onClick={handleFinish}
                loading={isFinishing}
                disabled={isFinishing}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-3 rounded-xl shadow-sm flex items-center justify-center gap-2"
              >
                <span>Launch First Research Session</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="max-w-2xl mx-auto w-full text-center pt-8">
        <Link href="/dashboard" className="text-xs text-[#7C847E] hover:text-[#141B16] underline">
          Skip onboarding and go directly to Command Dashboard
        </Link>
      </div>
    </div>
  );
}
