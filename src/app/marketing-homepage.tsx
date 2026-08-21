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
  TrendingUp,
  BarChart3,
  Lock,
  ChevronDown,
  ChevronUp,
  Boxes,
  Zap,
  Bot,
  Users,
  Building2,
  GraduationCap,
  Store,
  LineChart,
  Calendar,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
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

const TRUST_PILLARS = [
  {
    icon: Lock,
    title: "Your shops, your data.",
    description:
      "Every connected store (Etsy, Shopify, WooCommerce, and more) is accessed only through official, authorized channels. SellerSalt never touches another seller's shop data through your connection.",
  },
  {
    icon: ShieldCheck,
    title: "Labeled, not guessed.",
    description:
      "We separate what's actually observed from what's modeled. If we don't know something, we say so.",
  },
  {
    icon: Boxes,
    title: "Built with the platforms, not around them.",
    description:
      "Our research tools are built on licensed data and transparent, consented sources — not scraping, not workarounds.",
  },
  {
    icon: Users,
    title: "For teams, not just individuals.",
    description:
      "Role-based access for agencies managing client stores, institutes running cohorts, and companies with real teams.",
  },
];

const PRODUCT_FEATURES = [
  {
    area: "Research & Discovery",
    title: "Research & Discovery",
    icon: Search,
    badge: "Evidence-Based",
    description:
      "Discover opportunities across product niches, search keywords, and categories with verified price distributions and observable demand signals.",
    highlights: [
      "Empirical price distribution quantiles (P10, P25, P50, P75, P90)",
      "Keyword observation streams with search-volume data",
      "Opportunity Radar 2.0 with transparent metric provenance",
    ],
  },
  {
    area: "Planner",
    title: "Execution Planner",
    icon: Calendar,
    badge: "Workflow",
    description:
      "Structure product catalogs, manage draft listings, and map categories with synchronized workflows for your connected shops.",
    highlights: [
      "Milestone-based product launch roadmaps",
      "Category and listing draft orchestration",
      "Direct push-to-draft for authorized marketplace channels",
    ],
  },
  {
    area: "SEO",
    title: "Listing SEO Studio",
    icon: Sparkles,
    badge: "Optimization",
    description:
      "Audit listing titles, tags, and category synergy against marketplace-specific optimization rules to maximize organic discovery.",
    highlights: [
      "Platform-specific character and tag limit audits",
      "Tag-title synergy and keyword placement scoring",
      "Originality checks and policy compliance safeguards",
    ],
  },
  {
    area: "Analytics",
    title: "Connected Shop Analytics",
    icon: LineChart,
    badge: "First-Party Data",
    description:
      "Gain unified revenue, order velocity, and performance intelligence across your own connected marketplace channels.",
    highlights: [
      "Aggregated multi-channel sales and order velocity",
      "Strict first-party data isolation across workspaces",
      "Historical trend reporting for your connected stores",
    ],
  },
  {
    area: "Integrations",
    title: "Integrations & Automation",
    icon: Share2,
    badge: "Ecosystem",
    description:
      "Connect your ecosystem with Zapier, Slack, QuickBooks, and official marketplace integrations through secure OAuth.",
    highlights: [
      "Automated event dispatching to Slack and Zapier",
      "Accounting synchronization via QuickBooks",
      "Official developer APIs and first-party channel connectors",
    ],
  },
];

const AUDIENCE_CARDS = [
  {
    type: "Sellers",
    icon: Store,
    title: "Sellers",
    winning:
      "Discover validated product opportunities, audit your listings, and scale revenue with evidence-grounded decisions.",
    accent: "border-emerald-200 bg-emerald-50/40 text-emerald-900",
  },
  {
    type: "Agencies",
    icon: Building2,
    title: "Agencies",
    winning:
      "Manage multi-client stores with role-based access, aggregate performance intelligence, and deliver client-ready audits.",
    accent: "border-sky-200 bg-sky-50/40 text-sky-900",
  },
  {
    type: "Institutes",
    icon: GraduationCap,
    title: "Institutes",
    winning:
      "Run ecommerce cohorts and training programs with dedicated teacher and student workspace seats.",
    accent: "border-amber-200 bg-amber-50/40 text-amber-900",
  },
  {
    type: "Companies",
    icon: Users,
    title: "Companies",
    winning:
      "Unify multi-channel catalog operations, team workflows, and connected-store analytics across enterprise commerce brands.",
    accent: "border-purple-200 bg-purple-50/40 text-purple-900",
  },
];

const CANONICAL_FAQS = [
  {
    q: "What is SellerSalt?",
    a: "SellerSalt is the evidence-based ecommerce intelligence platform for sellers, agencies, and teams building real ecommerce businesses. It helps you research markets, discover product opportunities, audit listings, and synchronize your own connected marketplace data.",
  },
  {
    q: "How does SellerSalt acquire marketplace data?",
    a: "SellerSalt uses permitted, licensed, and transparent data sources along with official marketplace APIs for your own connected shops. We strictly follow marketplace policies and never use unauthorized access or server-side scraping.",
  },
  {
    q: "Does SellerSalt invent or guess missing data?",
    a: "No. Under our Zero-Fabrication Contract, every metric is tagged Observed, Derived, Estimated, User-derived, or Unavailable. Unobservable metrics remain strictly null and are transparently labeled as Unavailable.",
  },
  {
    q: "How does the AI Assistant and MCP integration work?",
    a: "You can connect Claude, Gemini, or another AI agent via MCP to operate SellerSalt on your behalf, alongside integrations like Zapier, Slack, and QuickBooks. The AI assistant operates strictly within your authorized permissions, while the core research and scoring engine remains deterministic and evidence-based.",
  },
  {
    q: "Do I need to connect my own store to perform market research?",
    a: "No. All market research, keyword exploration, and product discovery features work immediately without connecting a store. Connecting your store is only required when managing your own listings or viewing your own store analytics.",
  },
  {
    q: "Is SellerSalt affiliated with any marketplace?",
    a: "No. SellerSalt is an independent software platform operated by Netdrix Cloud Services. All marketplace names and trademarks are the property of their respective holders and are used solely for source identification and descriptive purposes.",
  },
];

export function MarketingHomepage({ packages }: { packages: PackageData[] }) {
  const router = useRouter();
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
                  — and prove it.
                </span>
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-[#525B55] max-w-2xl mx-auto font-normal leading-relaxed">
                SellerSalt is the evidence-based intelligence platform for sellers, agencies, and teams building real ecommerce businesses. Every number is labeled — observed, estimated, or unavailable — so you always know what you&apos;re standing on before you spend a dollar.
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
                  placeholder="Enter a product idea (e.g. ceramic pour-over dripper)..."
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

            {/* Live Research Attribution */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-[#7C847E] font-medium border-t border-[#E3E6E0]/60 max-w-xl mx-auto">
              <span>Observable market research:</span>
              <div className="flex items-center gap-4 font-bold text-[#343D36]">
                <span>Etsy</span>
                <span>•</span>
                <span>Shopify</span>
                <span>•</span>
                <span>WooCommerce</span>
                <span>•</span>
                <span>Amazon</span>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 2. TRUST PILLARS SECTION                                         */}
        {/* ================================================================= */}
        <section className="py-20 bg-white border-b border-[#E3E6E0]">
          <div className="max-w-6xl mx-auto px-6 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Core Principles
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-[#141B16] tracking-tight">
                Built on trust, transparency, and data integrity.
              </h2>
              <p className="text-sm sm:text-base text-[#525B55]">
                How SellerSalt protects your business data and delivers reliable market intelligence.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {TRUST_PILLARS.map((pillar, idx) => {
                const Icon = pillar.icon;
                return (
                  <div
                    key={idx}
                    className="p-6 rounded-2xl border border-[#E3E6E0] bg-[#FAFAF8] space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="text-base font-bold text-[#141B16]">
                        {idx + 1}. {pillar.title}
                      </h3>
                      <p className="text-xs text-[#525B55] leading-relaxed">
                        {pillar.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 3. PRODUCT FEATURES SECTION                                      */}
        {/* ================================================================= */}
        <section id="features" className="py-20 md:py-28 border-b border-[#E3E6E0]">
          <div className="max-w-6xl mx-auto px-6 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Product Capabilities
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-[#141B16] tracking-tight">
                Complete intelligence from research to execution.
              </h2>
              <p className="text-sm sm:text-base text-[#525B55]">
                Organized across five core product areas designed for modern ecommerce teams.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {PRODUCT_FEATURES.map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={idx}
                    className="p-6 rounded-2xl border border-[#E3E6E0] bg-white space-y-4 shadow-2xs hover:border-emerald-600/30 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                          <Icon className="w-5 h-5" />
                        </div>
                        <Badge variant="outline" className="text-[10px] font-bold">
                          {feature.badge}
                        </Badge>
                      </div>

                      <h3 className="text-lg font-bold text-[#141B16]">
                        {feature.title}
                      </h3>

                      <p className="text-xs text-[#525B55] leading-relaxed">
                        {feature.description}
                      </p>

                      <div className="border-t border-[#E3E6E0] pt-3 space-y-2 text-xs text-[#525B55]">
                        {feature.highlights.map((h, hIdx) => (
                          <div key={hIdx} className="flex items-start gap-2 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{h}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 4. AI AGENT & MCP SECTION (near Integrations)                    */}
        {/* ================================================================= */}
        <section className="py-20 bg-emerald-900 text-white border-b border-[#E3E6E0]">
          <div className="max-w-5xl mx-auto px-6 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800 text-emerald-200 text-xs font-bold uppercase tracking-wider">
                  <Bot className="w-4 h-4 text-emerald-400" />
                  <span>AI Assistant & MCP Integration</span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                  Manage your ecommerce business with your own AI agent.
                </h2>

                <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed font-normal">
                  Connect Claude, Gemini, or another AI agent via MCP to operate SellerSalt on your behalf, alongside integrations like Zapier, Slack, and QuickBooks.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-emerald-200">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Scoped MCP tool access</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>User-authorized actions</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Full audit logging</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="p-6 rounded-2xl bg-emerald-950/70 border border-emerald-700/50 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-emerald-800 pb-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-mono font-bold text-emerald-200">mcp-server / sellersalt</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-emerald-300 border-emerald-700">
                      Active
                    </Badge>
                  </div>

                  <div className="font-mono text-[11px] text-emerald-300/90 space-y-2 leading-relaxed bg-emerald-950/90 p-3.5 rounded-xl border border-emerald-800">
                    <p className="text-emerald-400 font-semibold">&gt; claude.mcp.call(&quot;sellersalt.audit_listing&quot;)</p>
                    <p className="text-emerald-200/80">&#123; channelId: &quot;shop_482&quot;, status: &quot;complete&quot; &#125;</p>
                    <p className="text-emerald-400/90 font-medium">✓ Audit complete: 13/13 tags optimized</p>
                  </div>

                  <p className="text-[11px] text-emerald-300/70 text-center font-medium">
                    Evidence-based research engine is deterministic; AI agent operates via MCP on your behalf.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 5. AUDIENCE SECTION                                              */}
        {/* ================================================================= */}
        <section className="py-20 bg-white border-b border-[#E3E6E0]">
          <div className="max-w-6xl mx-auto px-6 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Built for Commerce Leaders
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-[#141B16] tracking-tight">
                Designed for every stage of your ecommerce business.
              </h2>
              <p className="text-sm sm:text-base text-[#525B55]">
                Tailored workflows and role-based access for independent sellers, agencies, institutes, and enterprise companies.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {AUDIENCE_CARDS.map((aud, idx) => {
                const Icon = aud.icon;
                return (
                  <div
                    key={idx}
                    className={`p-6 rounded-2xl border ${aud.accent} space-y-4 flex flex-col justify-between`}
                  >
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-white/80 border border-current/20 flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-bold">
                        {aud.title}
                      </h3>
                      <p className="text-xs leading-relaxed opacity-90">
                        {aud.winning}
                      </p>
                    </div>

                    <div className="pt-2">
                      <Link
                        href="/signup"
                        className="inline-flex items-center gap-1 text-xs font-bold hover:underline"
                      >
                        <span>Learn more</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 6. ZERO-FABRICATION DATA PHILOSOPHY                              */}
        {/* ================================================================= */}
        <section className="py-20 bg-[#FAFAF8] border-b border-[#E3E6E0]">
          <div className="max-w-6xl mx-auto px-6 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Data Provenance
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
        {/* 7. PRICING PLANS SECTION                                         */}
        {/* ================================================================= */}
        <section id="pricing" className="py-20 md:py-28 border-b border-[#E3E6E0] bg-white">
          <div className="max-w-6xl mx-auto px-6 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Transparent Pricing
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-[#141B16] tracking-tight">
                Simple plans that scale with your research needs.
              </h2>
              <p className="text-sm sm:text-base text-[#525B55]">
                Start with our Free Explorer tier, upgrade when you need deep analytics and multi-store workspace seats.
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
        {/* 8. FAQ SECTION                                                   */}
        {/* ================================================================= */}
        <section id="faq" className="py-20 bg-[#FAFAF8] border-b border-[#E3E6E0]">
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
                    className="border border-[#E3E6E0] rounded-2xl bg-white overflow-hidden transition-all"
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
        {/* 9. FINAL CTA                                                     */}
        {/* ================================================================= */}
        <section className="py-20 md:py-28 bg-[#0B2B22] text-white text-center">
          <div className="max-w-4xl mx-auto px-6 space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
                Make your next ecommerce decision with confidence.
              </h2>
              <p className="text-base sm:text-lg text-emerald-200/80 max-w-2xl mx-auto font-normal">
                Discover validated product opportunities, model unit economics, and manage your ecommerce catalog with evidence-grounded intelligence.
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
      </main>

      <PublicFooter />
    </div>
  );
}
