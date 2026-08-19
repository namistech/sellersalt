"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Store,
  Flame,
  Search,
  Layers,
  ShoppingBag,
  FileText,
  Activity,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Button, Card, Badge, Heading, Text } from "@/components/ui";

const CATEGORIES = [
  "Home & Living",
  "Jewelry & Accessories",
  "Clothing & Shoes",
  "Craft Supplies & Tools",
  "Paper & Party Supplies",
  "Art & Collectibles",
  "Pet Supplies",
  "Weddings",
];

const GOALS = [
  {
    id: "radar",
    title: "Find Winning Breakout Products",
    description: "Scan niches for low-saturation, high-velocity listing opportunities.",
    icon: Flame,
    route: "/radar",
  },
  {
    id: "keywords",
    title: "Mine High-Intent Buyer Keywords",
    description: "Extract long-tail keyword clusters and 13-tag optimizer replacements.",
    icon: Search,
    route: "/keyword-research",
  },
  {
    id: "seo",
    title: "Audit & Optimize Listing SEO",
    description: "Score listing titles, 13 tags, front-loading, and find missing keywords.",
    icon: FileText,
    route: "/seo",
  },
  {
    id: "competitors",
    title: "Market Research",
    description: "Track shop sales spikes, review velocity, and winning catalogs.",
    icon: Store,
    route: "/spy",
  },
  {
    id: "own_shop",
    title: "Optimize My Existing Etsy Shop",
    description: "Audit active catalog health, fix zero-sales listings, and track revenue.",
    icon: Activity,
    route: "/store",
  },
  {
    id: "studio",
    title: "Create Listing Strategy & Copy",
    description: "Generate original, human-approved listing titles, tags, and descriptions.",
    icon: Sparkles,
    route: "/studio",
  },
];

export function OnboardingClient({ userName }: { userName: string }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form states
  const [selectedCategory, setSelectedCategory] = useState("Home & Living");
  const [customNiche, setCustomNiche] = useState("Minimalist Desk Accessories");
  const [selectedGoal, setSelectedGoal] = useState("radar");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  function handleCategorySelect(cat: string) {
    setSelectedCategory(cat);
  }

  function handleGoalSelect(goalId: string) {
    setSelectedGoal(goalId);
  }

  function handleConnectEtsy() {
    setIsConnecting(true);
    const win = window.open(
      "/api/seller-channels/etsy/connect",
      "etsy-connect",
      "width=620,height=760,noopener,noreferrer"
    );
    if (!win) {
      window.location.href = "/api/seller-channels/etsy/connect";
    }
  }

  async function handleFinish() {
    // Real business fact — persisted server-side via the User row, not
    // localStorage (a client-side value can't be trusted as a server-side
    // fact; see dashboard-onboarding-guide.tsx, which reads this same data
    // from real props, never localStorage).
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
      const targetGoal = GOALS.find((g) => g.id === selectedGoal);
      router.push(targetGoal ? targetGoal.route : "/workspace");
    } catch (err: any) {
      setIsFinishing(false);
      setFinishError(err.message || "Something went wrong saving your preferences. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] py-10 px-4 flex flex-col justify-between">
      <div className="max-w-2xl mx-auto w-full space-y-8">
        {/* Progress Bar & Header */}
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E7FAF1] border border-[#0E8F5D]/20 text-[#0E8F5D] text-xs font-bold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" /> First-Value Fast Start
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold text-[#141B16]">
              Welcome to SellerSalt, {userName}
            </h1>
            <p className="text-xs text-[#525B55]">
              Let&apos;s customize your intelligence command center in under 60 seconds.
            </p>
          </div>

          {/* Stepper Dots */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all ${
                  step === s
                    ? "w-8 bg-[#0E8F5D]"
                    : step > s
                    ? "w-2 bg-[#0E8F5D]"
                    : "w-2 bg-[#E3E6E0]"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step 1: What do you sell? */}
        {step === 1 && (
          <Card padding="lg" className="border-[#E3E6E0] bg-white shadow-xs space-y-6">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-[#141B16]">
                Step 1: What category or niche are you focusing on?
              </h2>
              <p className="text-xs text-[#525B55]">
                SellerSalt will tune its Opportunity Radar and keyword mining algorithms to your focus.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-[#141B16] block">
                Primary Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategorySelect(cat)}
                    className={`p-2.5 rounded-lg text-xs font-semibold border text-left transition-all ${
                      selectedCategory === cat
                        ? "border-[#0E8F5D] bg-[#E7FAF1] text-[#0E8F5D]"
                        : "border-[#E3E6E0] bg-[#FAFAF8] text-[#525B55] hover:border-[#C7CCC4]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#141B16] block">
                Target Niche / Product Concept
              </label>
              <input
                type="text"
                value={customNiche}
                onChange={(e) => setCustomNiche(e.target.value)}
                placeholder="e.g. Minimalist Ceramic Pour Over, Personalized Leather Wallets"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#C7CCC4] text-xs text-[#141B16] outline-none focus:border-[#0E8F5D]"
              />
            </div>

            {/* Marketplace Status Strip */}
            <div className="p-3 rounded-lg border border-[#E3E6E0] bg-[#FAFAF8] flex items-center justify-between text-xs">
              <span className="font-semibold text-[#141B16]">Active Channel:</span>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-[#E7FAF1] text-[#0E8F5D] font-bold text-[11px]">
                  🟢 Etsy (Active)
                </span>
                <span className="text-[11px] text-[#7C847E]">
                  Amazon, eBay &amp; TikTok (Coming Soon)
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="primary"
                onClick={() => setStep(2)}
                className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-xs font-bold px-5"
              >
                <span>Continue to Goals</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: What is your primary goal? */}
        {step === 2 && (
          <Card padding="lg" className="border-[#E3E6E0] bg-white shadow-xs space-y-6">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-[#141B16]">
                Step 2: What is your main objective right now?
              </h2>
              <p className="text-xs text-[#525B55]">
                We will guide you into the most direct intelligence tool for your first action.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {GOALS.map((g) => {
                const Icon = g.icon;
                const isSelected = selectedGoal === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handleGoalSelect(g.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all space-y-1.5 ${
                      isSelected
                        ? "border-[#0E8F5D] bg-[#E7FAF1]/60 shadow-xs"
                        : "border-[#E3E6E0] bg-white hover:border-[#C7CCC4]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`p-1.5 rounded-lg ${isSelected ? "bg-[#0E8F5D] text-white" : "bg-[#FAFAF8] text-[#525B55]"}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-[#0E8F5D]" />}
                    </div>
                    <div className="font-bold text-xs text-[#141B16]">{g.title}</div>
                    <div className="text-[11px] text-[#525B55] leading-relaxed">{g.description}</div>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 flex justify-between items-center">
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
                className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-xs font-bold px-5"
              >
                <span>Continue to Shop Setup</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Connect Etsy */}
        {step === 3 && (
          <Card padding="lg" className="border-[#E3E6E0] bg-white shadow-xs space-y-6">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-[#141B16]">
                Step 3: Connect Your Etsy Shop (Optional)
              </h2>
              <p className="text-xs text-[#525B55]">
                Link your store to synchronize live listing health, tag audits, and sales velocity proxies.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#E3E6E0] bg-[#FAFAF8] space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#E7FAF1] text-[#0E8F5D] flex items-center justify-center">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#141B16]">Etsy Seller Open API v3</h3>
                  <p className="text-[11px] text-[#525B55]">
                    Read-only synchronization for shop analytics, tags, and listing SEO diagnostics.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-2 text-[11px] text-[#525B55]">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#0E8F5D]" /> Official OAuth 2.0 PKCE
                </span>
                <span>•</span>
                <span>Zero password storage</span>
                <span>•</span>
                <span>Rule 9 human publishing gate</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-2">
              <Button
                variant="secondary"
                onClick={handleConnectEtsy}
                loading={isConnecting}
                className="w-full sm:w-auto text-xs font-semibold"
              >
                <Store className="h-3.5 w-3.5 mr-1.5" />
                <span>Authorize with Etsy</span>
              </Button>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="text-xs font-semibold text-[#525B55] hover:underline"
                >
                  Skip for Now
                </button>
                <Button
                  variant="primary"
                  onClick={() => setStep(4)}
                  className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-xs font-bold px-5"
                >
                  <span>Next Step</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Step 4: Launch into First Action */}
        {step === 4 && (
          <Card padding="lg" className="border-[#E3E6E0] bg-white shadow-xs space-y-6">
            <div className="space-y-1 text-center">
              <div className="inline-flex h-12 w-12 rounded-full bg-[#E7FAF1] text-[#0E8F5D] items-center justify-center mx-auto mb-2">
                <Zap className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold text-[#141B16]">
                You&apos;re Ready to Discover Your Next High-Margin Product
              </h2>
              <p className="text-xs text-[#525B55] max-w-md mx-auto">
                Your workspace is configured for <strong>{selectedCategory}</strong> ({customNiche}).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#FAFAF8] border border-[#E3E6E0] space-y-2 text-xs">
              <div className="font-bold text-[#141B16]">Selected First Value Workflow:</div>
              <div className="flex items-center justify-between text-[#525B55]">
                <span>Goal:</span>
                <span className="font-semibold text-[#141B16]">
                  {GOALS.find((g) => g.id === selectedGoal)?.title}
                </span>
              </div>
              <div className="flex items-center justify-between text-[#525B55]">
                <span>Focus Niche:</span>
                <span className="font-semibold text-[#141B16]">{customNiche}</span>
              </div>
              <div className="flex items-center justify-between text-[#525B55]">
                <span>Plan Tier:</span>
                <Badge variant="neutral" className="text-[10px]">Free Explorer</Badge>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              {finishError && (
                <p className="text-[11px] text-red-600 text-center">{finishError}</p>
              )}
              <Button
                variant="primary"
                onClick={handleFinish}
                loading={isFinishing}
                disabled={isFinishing}
                className="w-full bg-[#0E8F5D] hover:bg-[#0C7A52] text-xs font-bold py-3 shadow-sm flex items-center justify-center gap-2"
              >
                <span>Launch First Intelligence Tool</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="max-w-2xl mx-auto w-full text-center pt-8">
        <Link href="/workspace" className="text-xs text-[#7C847E] hover:text-[#141B16] underline">
          Skip onboarding and go directly to Workspace Command Center
        </Link>
      </div>
    </div>
  );
}
