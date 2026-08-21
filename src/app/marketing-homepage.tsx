"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Compass,
  Search,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  Flame,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  BarChart3,
  Lock,
  ChevronDown,
  ChevronUp,
  DollarSign,
  AlertCircle,
  FileText,
  Boxes,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { MarketplaceDisclaimerBox } from "@/components/governance/MarketplaceDisclaimerBox";
import { PLAN_DEFINITIONS } from "@/services/plans/plan-capabilities";

interface PackageData {
  key: string;
  name: string;
  priceUsd: number;
  maxConnectors: number;
  maxSearchConfigs: number;
  maxTrackedShops: number;
  maxProspectsPerMonth: number;
  trialDays: number | null;
  trialPriceUsd: number | null;
}

const CANONICAL_FAQS = [
  {
    q: "What is SellerSalt?",
    a: "SellerSalt is an evidence-based ecommerce intelligence and product decision-support platform. It helps independent merchants, brand builders, and agencies discover opportunities, research markets, validate commercial feasibility, model unit economics, and prepare launch plans before investing capital.",
  },
  {
    q: "How does SellerSalt acquire marketplace data?",
    a: "SellerSalt uses a multi-tier acquisition architecture: public catalog analysis for observable research signals where permitted by policy, official marketplace APIs where integrated, OAuth-authorized connections for your own shop data, and historical market memory from SellerSalt's longitudinal observations.",
  },
  {
    q: "Does SellerSalt fabricate search volumes or competitor revenues?",
    a: "No. Under our Zero-Fabrication Contract, unobservable metrics (such as exact monthly search volumes or private competitor store sales) remain strictly null and are transparently marked as UNAVAILABLE. We never convert missing data to misleading zeros or speculative guesses.",
  },
  {
    q: "What is the 5-step workflow?",
    a: "The SellerSalt workflow guides you from an initial idea to a validated launch: (1) Discover opportunities and niche gaps, (2) Research observable pricing, reviews, and competition, (3) Validate commercial feasibility with deterministic verdicts (PURSUE, TEST, WAIT, REJECT), (4) Plan sourcing specifications and 3-scenario unit economics, and (5) Launch with policy-compliant listing studio assets.",
  },
  {
    q: "Do I need to connect my own store to use SellerSalt?",
    a: "No. All market research, opportunity discovery, and product validation features work immediately without connecting a store. Connecting your own store is optional if you wish to analyze your private order analytics or prepare drafts.",
  },
  {
    q: "Is SellerSalt affiliated with Etsy, Amazon, or other marketplaces?",
    a: "No. SellerSalt is an independent software application. Marketplace names (such as Etsy, Amazon, eBay, Walmart, Shopify) are used solely for source attribution and descriptive purposes. SellerSalt is not endorsed or certified by any marketplace.",
  },
];

export function MarketingHomepage({ packages }: { packages: PackageData[] }) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState<number>(1);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [heroInput, setHeroInput] = useState<string>("");

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = heroInput.trim();
    if (query) {
      router.push(`/signup?q=${encodeURIComponent(query)}`);
    } else {
      router.push("/signup");
    }
  };

  const WORKFLOW_STEPS = [
    {
      step: 1,
      name: "Discover",
      badge: "Market Opportunity",
      title: "1. Discover High-Potential Opportunities",
      description:
        "Spot emerging product clusters, saturated vs underrepresented attributes, and price gaps across public commerce catalogs without speculative guesses.",
      icon: Flame,
      preview: {
        headline: "Opportunity Radar 2.0",
        query: "Ceramic Pour-Over Dripper",
        verdict: "HIGH OPPORTUNITY",
        verdictVariant: "success",
        stats: [
          { label: "Observed Listings", value: "38" },
          { label: "Median Price (P50)", value: "$36.00" },
          { label: "Review Barrier", value: "Low (32 med.)" },
          { label: "Attribute Gap", value: "Matte Glaze / Ribbed" },
        ],
      },
    },
    {
      step: 2,
      name: "Research",
      badge: "Observable Signals",
      title: "2. Research Empirical Market Structure",
      description:
        "Inspect real price distributions (P10, P25, P50, P75, P90), seller concentration indices, review velocity, and keyword cluster prevalence — one marketplace at a time, starting with Amazon.",
      icon: Search,
      preview: {
        headline: "Market Structure & Price Positioning",
        query: "Handcrafted Oak Shelf",
        verdict: "MODERATE CONCENTRATION",
        verdictVariant: "info",
        stats: [
          { label: "Price Range", value: "$28.00 – $85.00" },
          { label: "Dominant Share", value: "24% (Top 3)" },
          { label: "Keyword Synergy", value: "13 High-Intent Tags" },
          { label: "Data Trust", value: "84 / 100" },
        ],
      },
    },
    {
      step: 3,
      name: "Validate",
      badge: "Commercial Decision",
      title: "3. Validate Commercial Feasibility",
      description:
        "Run multi-factor deterministic decision models evaluating Demand, Competition Density, Unit Economics, and Trajectory to get actionable verdicts: PURSUE, TEST, WAIT, or REJECT.",
      icon: Sparkles,
      preview: {
        headline: "Deterministic Decision Engine",
        query: "Personalized Leather Travel Case",
        verdict: "PURSUE CANDIDATE",
        verdictVariant: "success",
        stats: [
          { label: "Decision Verdict", value: "PURSUE" },
          { label: "Score Breakdown", value: "82 / 100" },
          { label: "Evidence Depth", value: "High (18 Signals)" },
          { label: "Information Gaps", value: "Supplier MOQs" },
        ],
      },
    },
    {
      step: 4,
      name: "Plan",
      badge: "Sourcing & Economics",
      title: "4. Plan Specifications & Unit Economics",
      description:
        "Configure product features, generate supplier RFQ specifications, and model financial sensitivity across 3 scenarios: Base, Conservative, and Optimistic.",
      icon: Layers,
      preview: {
        headline: "Sourcing & 3-Scenario Economics",
        query: "Minimalist Linen Apron",
        verdict: "62% CONTRIBUTION MARGIN",
        verdictVariant: "success",
        stats: [
          { label: "Target Selling Price", value: "$42.00" },
          { label: "Landed Unit Cost", value: "$11.50" },
          { label: "Base Profit / Unit", value: "$18.20" },
          { label: "Breakeven Units", value: "48 / mo" },
        ],
      },
    },
    {
      step: 5,
      name: "Launch",
      badge: "Policy-Compliant Launch",
      title: "5. Launch with Compliant Execution",
      description:
        "Generate policy-sanitized listing drafts with human review gates, audit SEO synergies, and follow a prioritized 5-step action plan to enter the market efficiently.",
      icon: CheckCircle2,
      preview: {
        headline: "Listing Studio & Action Roadmap",
        query: "Minimalist Linen Apron Launch",
        verdict: "LAUNCH READY",
        verdictVariant: "success",
        stats: [
          { label: "Readiness Index", value: "88 / 100" },
          { label: "SEO Audit Score", value: "96 / 100" },
          { label: "Originality Gate", value: "<15% Overlap Pass" },
          { label: "Next Action", value: "Verify Supplier Sample" },
        ],
      },
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8] text-[#141B16] font-sans antialiased selection:bg-emerald-500/20">
      <PublicHeader currentPath="/" />

      <main className="flex-1">
        {/* ================================================================= */}
        {/* 1. HERO SECTION                                                  */}
        {/* ================================================================= */}
        <section className="relative pt-16 pb-20 md:pt-24 md:pb-32 overflow-hidden border-b border-[#E3E6E0]">
          <div className="max-w-6xl mx-auto px-6 relative z-10 text-center space-y-8">
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Evidence-Based Ecommerce Intelligence</span>
            </div>

            {/* Main Headline */}
            <div className="max-w-4xl mx-auto space-y-4">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-[#141B16] leading-[1.08]">
                Know what to sell <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-700">
                  before you spend money.
                </span>
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-[#525B55] max-w-2xl mx-auto font-normal leading-relaxed">
                SellerSalt turns observable marketplace signals into evidence-based product decisions across Discover, Research, Validate, Plan, and Launch.
              </p>
            </div>

            {/* Interactive Hero Search Form */}
            <div className="max-w-2xl mx-auto pt-2">
              <form
                onSubmit={handleHeroSearch}
                className="relative flex items-center shadow-xl rounded-2xl border-2 border-emerald-600/30 bg-white focus-within:border-emerald-600 focus-within:ring-4 focus-within:ring-emerald-600/10 transition-all p-1.5"
              >
                <div className="pl-3.5 pr-2 text-muted-foreground flex items-center">
                  <Search className="w-5 h-5 text-emerald-600" />
                </div>
                <input
                  type="text"
                  value={heroInput}
                  onChange={(e) => setHeroInput(e.target.value)}
                  placeholder="Enter a product idea (e.g. wooden desk organizer)..."
                  className="flex-1 bg-transparent border-0 text-sm sm:text-base font-medium placeholder:text-[#8C948E] focus:outline-hidden py-3 px-2 text-[#141B16]"
                />
                <Button
                  type="submit"
                  variant="primary"
                  className="shrink-0 font-bold text-xs sm:text-sm px-5 sm:px-7 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white h-11"
                >
                  <span>Start Research</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </form>

              {/* Sample Suggestions */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-3 text-xs text-[#7C847E]">
                <span>Try exploring:</span>
                {["ceramic pour-over", "leather passport wallet", "linen apron", "desk lamp"].map(
                  (sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => setHeroInput(sample)}
                      className="px-2.5 py-1 rounded-lg border border-[#E3E6E0] bg-white hover:border-emerald-600/40 text-[#525B55] transition-colors"
                    >
                      {sample}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Source Attribution Indicator — honest about what's genuinely
                live today, not an implied guarantee across every listed
                marketplace. See docs/MARKETPLACE-RESEARCH-MODEL.md. */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-[#7C847E] font-medium border-t border-[#E3E6E0]/60 max-w-xl mx-auto">
              <span>Live research today:</span>
              <div className="flex items-center gap-4 font-bold text-[#343D36]">
                <span>Amazon</span>
                <span>•</span>
                <span>Walmart</span>
              </div>
              <span className="text-[#A3AA9F]">Etsy, eBay & more expanding</span>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 2. THE PROBLEM SECTION ("The Cost of Guessing")                  */}
        {/* ================================================================= */}
        <section className="py-20 bg-white border-b border-[#E3E6E0]">
          <div className="max-w-6xl mx-auto px-6 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                The Core Problem
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-[#141B16] tracking-tight">
                Most ecommerce sellers commit capital before validating the market.
              </h2>
              <p className="text-sm sm:text-base text-[#525B55]">
                Buying inventory based on speculative hunches or fake "sales estimation" multipliers leads to saturated niches, low margins, and dead stock.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Box 1: The Old Speculative Way */}
              <div className="p-8 rounded-2xl border border-rose-200 bg-rose-50/30 space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>The Speculative Approach</span>
                </div>
                <ul className="space-y-3 text-sm text-[#525B55]">
                  <li className="flex items-start gap-2.5">
                    <span className="text-rose-600 font-bold">✕</span>
                    <span>Relying on fake &quot;estimated monthly sales&quot; algorithms and speculative guesses.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-rose-600 font-bold">✕</span>
                    <span>Entering saturated niches with insurmountable incumbent review barriers.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-rose-600 font-bold">✕</span>
                    <span>Ordering production batches without modeling landed fees and target CAC.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-rose-600 font-bold">✕</span>
                    <span>Hoping for organic traction without clear differentiation or SEO synergy.</span>
                  </li>
                </ul>
              </div>

              {/* Box 2: The SellerSalt Evidence-Based Way */}
              <div className="p-8 rounded-2xl border border-emerald-200 bg-emerald-50/30 space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>The SellerSalt Evidence-Based Approach</span>
                </div>
                <ul className="space-y-3 text-sm text-[#525B55]">
                  <li className="flex items-start gap-2.5">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Observable listing prices, verified review barriers, and seller concentration.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Deterministic feasibility verdicts (PURSUE, TEST, WAIT, REJECT) with zero fake data.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>3-scenario unit economics modeling (Base, Conservative, Optimistic) using real costs.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Concrete attribute gap clustering and policy-compliant AI listing generation.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 3. THE 5-STEP CANONICAL WORKFLOW SHOWCASE                        */}
        {/* ================================================================= */}
        <section id="workflow" className="py-20 md:py-28 border-b border-[#E3E6E0]">
          <div className="max-w-6xl mx-auto px-6 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                The Product Journey
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-[#141B16] tracking-tight">
                One continuous path from initial idea to validated launch.
              </h2>
              <p className="text-sm sm:text-base text-[#525B55]">
                Never wonder what to do next. SellerSalt guides you through five evidence-grounded phases.
              </p>
            </div>

            {/* Step Navigation Tabs */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {WORKFLOW_STEPS.map((s) => (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => setActiveStep(s.step)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                    activeStep === s.step
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-white text-[#525B55] border-[#E3E6E0] hover:bg-[#FAFAF8]"
                  }`}
                >
                  <span>{s.step}. {s.name}</span>
                </button>
              ))}
            </div>

            {/* Active Step Showcase Card */}
            {(() => {
              const current = WORKFLOW_STEPS.find((s) => s.step === activeStep) || WORKFLOW_STEPS[0];
              const StepIcon = current.icon;
              return (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white p-8 md:p-12 rounded-3xl border border-[#E3E6E0] shadow-sm">
                  <div className="lg:col-span-6 space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-800 text-xs font-bold">
                      <StepIcon className="w-4 h-4 text-emerald-600" />
                      <span>{current.badge}</span>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-2xl sm:text-3xl font-black text-[#141B16] tracking-tight">
                        {current.title}
                      </h3>
                      <p className="text-sm text-[#525B55] leading-relaxed">
                        {current.description}
                      </p>
                    </div>

                    <div className="pt-2">
                      <Button
                        href="/signup"
                        variant="primary"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl"
                      >
                        <span>Try {current.name} in SellerSalt</span>
                        <ArrowRight className="w-4 h-4 ml-1.5" />
                      </Button>
                    </div>
                  </div>

                  {/* UI Preview Box */}
                  <div className="lg:col-span-6">
                    <div className="p-6 rounded-2xl bg-[#FAFAF8] border border-[#E3E6E0] space-y-4 shadow-2xs font-mono text-xs">
                      <div className="flex items-center justify-between border-b border-[#E3E6E0] pb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="font-bold text-[#141B16] font-sans text-xs">
                            {current.preview.headline}
                          </span>
                        </div>
                        <Badge
                          variant={current.preview.verdictVariant === "success" ? "success" : "info"}
                          className="text-[10px] font-bold"
                        >
                          {current.preview.verdict}
                        </Badge>
                      </div>

                      <div className="text-[#7C847E] font-sans text-[11px]">
                        Target Search: <span className="font-bold text-[#141B16]">{current.preview.query}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        {current.preview.stats.map((stat, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-white border border-[#E3E6E0]">
                            <div className="text-[10px] text-[#7C847E] font-sans">{stat.label}</div>
                            <div className="text-xs font-bold text-[#141B16] mt-0.5">{stat.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </section>

        {/* ================================================================= */}
        {/* 3.5 MARKETPLACE-NATIVE RESEARCH & HISTORICAL INTELLIGENCE        */}
        {/* ================================================================= */}
        <section className="py-20 bg-[#FAFAF8] border-b border-[#E3E6E0]">
          <div className="max-w-6xl mx-auto px-6 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                How Research Actually Works
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-[#141B16] tracking-tight">
                One marketplace at a time — accumulating into your own market memory.
              </h2>
              <p className="text-sm sm:text-base text-[#525B55] max-w-2xl mx-auto">
                SellerSalt isn&apos;t a simultaneous every-marketplace search engine. Research
                is marketplace-native: you pick a marketplace, SellerSalt acquires real
                observations from it, and every observation is saved into your organization&apos;s
                own historical database — so the same product searched again later shows you
                what actually changed, not just a fresh snapshot.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-white border border-[#E3E6E0] space-y-3">
                <Boxes className="w-5 h-5 text-emerald-600" />
                <h4 className="text-sm font-bold text-[#141B16]">Marketplace-specific research</h4>
                <p className="text-xs text-[#525B55] leading-relaxed">
                  Each marketplace has its own acquisition path, its own observable-field set, and
                  its own honest gaps — Amazon and Walmart don&apos;t pretend to work like each
                  other, and a search never silently depends on a marketplace that isn&apos;t
                  reachable right now.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-white border border-[#E3E6E0] space-y-3">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                <h4 className="text-sm font-bold text-[#141B16]">Historical market intelligence</h4>
                <p className="text-xs text-[#525B55] leading-relaxed">
                  Every real observation is saved with a timestamp. Search the same product again
                  next week and SellerSalt can show you what actually moved — price, rating,
                  review count, availability, even seller — instead of forcing you to remember.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-white border border-[#E3E6E0] space-y-3">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <h4 className="text-sm font-bold text-[#141B16]">Cross-marketplace, later</h4>
                <p className="text-xs text-[#525B55] leading-relaxed">
                  A future cross-marketplace comparison will primarily draw on SellerSalt&apos;s own
                  accumulated observations, not require every marketplace to answer a live request
                  at the exact moment you ask. That&apos;s the direction, stated plainly rather than
                  implied as already finished.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 4. TRUST-FIRST DATA PHILOSOPHY & SIGNAL CLASSIFICATION          */}
        {/* ================================================================= */}
        <section className="py-20 bg-white border-b border-[#E3E6E0]">
          <div className="max-w-6xl mx-auto px-6 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Data Methodology & Epistemology
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-[#141B16] tracking-tight">
                SellerSalt separates what is observed from what is derived.
              </h2>
              <p className="text-sm sm:text-base text-[#525B55]">
                We strictly adhere to a Zero-Fabrication Contract. Every number you see in SellerSalt carries transparent provenance.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                {
                  class: "OBSERVED",
                  badge: "Live Listing Data",
                  desc: "Direct empirical data from live listings or official APIs.",
                  example: "Median Listing Price: $34.99",
                  color: "border-emerald-200 bg-emerald-50/40 text-emerald-900",
                },
                {
                  class: "DERIVED",
                  badge: "Deterministic Math",
                  desc: "Calculated deterministically from observable data.",
                  example: "Price Positioning: Upper-Mid Market",
                  color: "border-sky-200 bg-sky-50/40 text-sky-900",
                },
                {
                  class: "ESTIMATED",
                  badge: "Statistical Models",
                  desc: "Multi-factor statistical score with explicit confidence.",
                  example: "Opportunity Score: 84 / 100",
                  color: "border-amber-200 bg-amber-50/40 text-amber-900",
                },
                {
                  class: "USER_DERIVED",
                  badge: "Your Grounded Costs",
                  desc: "Computed from your landed unit costs and packaging fees.",
                  example: "Base Contribution Margin: 62%",
                  color: "border-purple-200 bg-purple-50/40 text-purple-900",
                },
                {
                  class: "UNAVAILABLE",
                  badge: "Zero Fabrication",
                  desc: "Signals we cannot reliably observe remain strictly null.",
                  example: "Monthly Search Volume: Unavailable",
                  color: "border-slate-200 bg-slate-50/50 text-slate-800",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`p-5 rounded-2xl border ${item.color} space-y-3 flex flex-col justify-between`}
                >
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider block opacity-75">
                      {item.class}
                    </span>
                    <h4 className="text-xs font-bold">{item.badge}</h4>
                    <p className="text-[11px] opacity-80 leading-relaxed">{item.desc}</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/80 border border-current/10 text-[11px] font-mono font-medium">
                    {item.example}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center pt-4">
              <Link
                href="/trust"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline"
              >
                <span>Read our full Data Methodology & Trust Center</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 4.5 RESPONSIBLE, PERMITTED ACQUISITION                           */}
        {/* ================================================================= */}
        <section className="py-16 bg-[#FAFAF8] border-b border-[#E3E6E0]">
          <div className="max-w-4xl mx-auto px-6 text-center space-y-5">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              How We Acquire Data
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#141B16] tracking-tight">
              Permitted public sources, authorized integrations — nothing circumvented.
            </h2>
            <p className="text-sm text-[#525B55] max-w-2xl mx-auto leading-relaxed">
              SellerSalt uses permitted public, structured, and authorized data sources where
              available, and respects each marketplace&apos;s own access policies — we do not
              circumvent CAPTCHAs, authentication, rate limits, or anti-bot systems. Our
              acquisition requests honestly identify themselves; when a marketplace restricts what
              it will share with that identity, we disclose the resulting gap rather than work
              around it. Public-web research, authorized store connections, and SellerSalt&apos;s
              own historical intelligence are three distinct things — we never blur them into one
              undifferentiated data claim.
            </p>
            <Link
              href="/trust"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline"
            >
              <span>Read the full data acquisition & trust documentation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 5. PRICING PLANS SECTION                                         */}
        {/* ================================================================= */}
        <section id="pricing" className="py-20 md:py-28 border-b border-[#E3E6E0]">
          <div className="max-w-6xl mx-auto px-6 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Transparent Pricing
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-[#141B16] tracking-tight">
                Simple plans that scale with your research needs.
              </h2>
              <p className="text-sm sm:text-base text-[#525B55]">
                Start with our Free Explorer tier, upgrade when you need deep unit economics and cross-marketplace workspaces.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.values(PLAN_DEFINITIONS).map((plan) => (
                <div
                  key={plan.key}
                  className={`p-6 rounded-2xl border bg-white flex flex-col justify-between space-y-6 shadow-xs ${
                    plan.key === "PRO"
                      ? "border-emerald-600 ring-2 ring-emerald-600/20"
                      : "border-[#E3E6E0]"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black text-[#141B16]">{plan.name}</h3>
                      {plan.key === "PRO" && (
                        <Badge variant="success" className="text-[9px] font-bold uppercase">
                          Most Popular
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-[#525B55] min-h-[36px]">{plan.description}</p>

                    <div className="pt-2">
                      <span className="text-3xl font-black text-[#141B16]">
                        ${plan.priceMonthlyUsd}
                      </span>
                      <span className="text-xs text-[#7C847E] font-medium"> / month</span>
                    </div>

                    <div className="border-t border-[#E3E6E0] pt-4 space-y-2.5 text-xs text-[#525B55]">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{plan.limits.monthlyProductResearches} Product Researches / mo</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{plan.limits.monthlyKeywordSearches} Keyword Searches / mo</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{plan.limits.monthlySeoAudits} SEO Audits / mo</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{plan.limits.monthlyAiListingGenerations} AI Listing Studio Drafts</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    href="/signup"
                    variant={plan.key === "PRO" ? "primary" : "secondary"}
                    className={`w-full text-xs font-bold rounded-xl ${
                      plan.key === "PRO"
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "border-[#E3E6E0]"
                    }`}
                  >
                    <span>{plan.key === "FREE" ? "Start Free" : `Choose ${plan.name}`}</span>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 6. FAQ SECTION                                                   */}
        {/* ================================================================= */}
        <section id="faq" className="py-20 bg-white border-b border-[#E3E6E0]">
          <div className="max-w-4xl mx-auto px-6 space-y-10">
            <div className="text-center space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Frequently Asked Questions
              </span>
              <h2 className="text-3xl font-black text-[#141B16] tracking-tight">
                Clear, honest answers about how SellerSalt works.
              </h2>
            </div>

            <div className="space-y-4">
              {CANONICAL_FAQS.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className="border border-[#E3E6E0] rounded-2xl bg-[#FAFAF8] overflow-hidden transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full p-5 text-left flex items-center justify-between font-bold text-sm text-[#141B16]"
                    >
                      <span>{faq.q}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-[#7C847E] shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#7C847E] shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 text-xs text-[#525B55] leading-relaxed border-t border-[#E3E6E0] pt-4">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 7. FINAL CTA                                                     */}
        {/* ================================================================= */}
        <section className="py-20 md:py-28 bg-[#0B2B22] text-white text-center">
          <div className="max-w-4xl mx-auto px-6 space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
                Make your next ecommerce decision with confidence.
              </h2>
              <p className="text-base sm:text-lg text-emerald-200/80 max-w-2xl mx-auto font-normal">
                Discover high-potential product opportunities, validate commercial feasibility, and build a launch plan before committing capital.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                href="/signup"
                size="default"
                variant="primary"
                className="bg-emerald-500 hover:bg-emerald-400 text-[#0B2B22] font-black text-sm px-8 py-3 rounded-xl shadow-lg"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>

              <Button
                href="/how-it-works"
                size="default"
                variant="secondary"
                className="border-white/20 bg-white/10 hover:bg-white/20 text-white font-bold text-sm px-6 py-3 rounded-xl"
              >
                <span>Read Methodology</span>
              </Button>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 8. MARKETPLACE TRADEMARK DISCLAIMERS                             */}
        {/* ================================================================= */}
        <div className="max-w-6xl mx-auto px-6 py-8">
          <MarketplaceDisclaimerBox marketplace="etsy" />
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
