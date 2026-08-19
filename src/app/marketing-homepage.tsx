"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Compass,
  Eye,
  Flame,
  Search,
  Sparkles,
  TrendingUp,
  Zap,
  Store,
  Layers,
  BarChart3,
  DollarSign,
  ShieldCheck,
  ArrowRight,
  Bookmark,
  Users,
  Target,
  FileSpreadsheet,
} from "lucide-react";
import "./marketing.css";

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

const FAQS = [
  {
    q: "What is SellerSalt?",
    a: "SellerSalt is an e-commerce intelligence and execution platform for Etsy sellers. It combines algorithmic Opportunity Radar scoring, competitor sales velocity tracking, 13-tag SEO audits, and a unified product planner to help sellers discover, evaluate, and launch winning product concepts.",
  },
  {
    q: "Who is SellerSalt for?",
    a: "SellerSalt is built for active Etsy handmade crafters, vintage curators, digital product creators, and POD entrepreneurs who want verified market signals rather than speculative keyword guesses.",
  },
  {
    q: "What can SellerSalt analyze?",
    a: "SellerSalt analyzes live Etsy shops, active listing catalogs, tag utilization, title optimization, daily sales velocity, price distributions, and keyword synergies across hundreds of product categories.",
  },
  {
    q: "How does Etsy integration work?",
    a: "SellerSalt works out-of-the-box using official marketplace research connectors. You can optionally connect your own Etsy store via OAuth 2.0 with PKCE for secure, read-only analytics, tag health diagnostics, and draft preparation.",
  },
  {
    q: "What does SellerSalt estimate versus directly observe?",
    a: "SellerSalt directly observes actual marketplace shop sales, listing titles, 13 tags, review counts, and daily velocity deltas. Estimated metrics (such as monthly revenue projections and opportunity scores) are clearly labeled with provenance badges.",
  },
  {
    q: "How much does SellerSalt cost?",
    a: "SellerSalt offers a permanent Free Explorer plan for market discovery, Starter at $19/mo, Pro at $49/mo, and Agency at $199/mo with full unit economics and multi-store support. All paid plans include a risk-free trial.",
  },
  {
    q: "Is SellerSalt affiliated with or certified by Etsy?",
    a: "No. The term 'Etsy' is a trademark of Etsy, Inc. SellerSalt is an independent software application that uses the official Etsy API but is not endorsed or certified by Etsy, Inc.",
  },
];

export function MarketingHomepage({ packages }: { packages: PackageData[] }) {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [showcaseTab, setShowcaseTab] = useState<"radar" | "shop" | "category" | "keyword" | "profit">("radar");

  // Interactive Opportunity Feasibility Simulator State
  const [reviewCount, setReviewCount] = useState(450);
  const [shopAge, setShopAge] = useState(14);
  const [demandLevel, setDemandLevel] = useState<"high" | "medium" | "low">("high");
  // Interactive Free Tools Playground State (Public Acquisition Engine)
  const [freeToolTab, setFreeToolTab] = useState<"KEYWORD_GENERATOR" | "PRODUCT_PREVIEW" | "SHOP_PREVIEW" | "SEO_PREVIEW">("KEYWORD_GENERATOR");
  const [freeToolInput, setFreeToolInput] = useState("leather wallet");
  const [freeToolLoading, setFreeToolLoading] = useState(false);
  const [freeToolResult, setFreeToolResult] = useState<any>(null);
  const [freeToolError, setFreeToolError] = useState<string | null>(null);

  async function runFreeToolPreview(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setFreeToolLoading(true);
    setFreeToolError(null);
    try {
      const res = await fetch("/api/public/free-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: freeToolTab,
          query: freeToolInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFreeToolError(data.error || "Failed to analyze.");
        setFreeToolResult(null);
      } else {
        setFreeToolResult(data.data);
      }
    } catch {
      setFreeToolError("Network error. Please try again.");
      setFreeToolResult(null);
    } finally {
      setFreeToolLoading(false);
    }
  }

  function handleHeroSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchValue.trim()) params.set("url", searchValue.trim());
    router.push(`/checkout?plan=PRO${params.toString() ? `&${params.toString()}` : ""}`);
  }

  // Interactive Opportunity Feasibility Calculation
  let score = 100;
  score -= Math.min(reviewCount / 10, 40);
  score -= Math.min(shopAge * 1.5, 30);
  if (demandLevel === "high") score += 20;
  if (demandLevel === "low") score -= 20;
  score = Math.max(10, Math.min(99, Math.round(score)));
  const scoreBadgeBg = score >= 70 ? "#E7FAF1" : score >= 45 ? "#FDF1DF" : "#FCEAE9";
  const scoreBadgeText = score >= 70 ? "#0E8F5D" : score >= 45 ? "#D97706" : "#DC2626";
  const scoreLabel = score >= 70 ? "🔥 High Opportunity Potential" : score >= 45 ? "📈 Moderate Competition" : "⚠️ Saturated Niche";

  const pkg = (key: string) => packages.find((p) => p.key === key);
  const started = pkg("STARTED");
  const pro = pkg("PRO");
  const agency = pkg("AGENCY");

  return (
    <div className="sellersalt-marketing">
      <div className="bg-graphic bg-graphic-1" />
      <div className="bg-graphic bg-graphic-2" />

      {/* Top Banner */}
      <div className="top-bar">
        <span>
          ✨ Start researching Etsy opportunities today with real, verified sales data.
        </span>
        <a href="#pricing">See Plans & Pricing →</a>
      </div>

      {/* Navigation Header */}
      <header>
        <div className="container nav-container">
          <Link href="/" className="logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/icon-square.png" alt="" className="logo-icon" style={{ objectFit: "contain", background: "none" }} />
            SellerSalt
          </Link>

          <nav aria-label="Main Navigation">
            <ul className="nav-links">
              <li><a href="#showcase">Product Showcase</a></li>
              <li><a href="#workflow">How it Works</a></li>
              <li><a href="#calculator">Feasibility Tool</a></li>
              <li><Link href="/shops">Shop Directory</Link></li>
              <li><Link href="/pricing">Pricing</Link></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
          </nav>

          <div className="nav-actions">
            <Link href="/login" className="btn btn-secondary">
              Sign In
            </Link>
            <Link href="/checkout?plan=PRO" className="btn btn-accent">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-badge">
            <Sparkles className="h-4 w-4" />
            The Essential of eCommerce Intelligence
          </div>

          <h1>
            Discover High-Demand Products &amp; <br />
            Understand Competition Before You Build
          </h1>

          <p>
            SellerSalt combines verified marketplace sales data, opportunity scoring, and market research into one cohesive productivity platform for Etsy creators, entrepreneurs, and eCommerce brands.
          </p>

          <div className="hero-actions">
            <Link href="/checkout?plan=PRO" className="btn btn-accent">
              Get Started
            </Link>
            <a href="#showcase" className="btn btn-secondary">
              Explore Live Showcase ↓
            </a>
          </div>

          {/* Direct Shop Lookup / Search Input */}
          <form onSubmit={handleHeroSearch} className="hero-search-box">
            <input
              type="text"
              placeholder="Search keyword or Etsy shop URL (e.g. 'acrylic planner' or etsy.com/shop/Name)..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">
              Analyze Niche →
            </button>
          </form>
        </div>
      </section>

      {/* Target Audience Persona Cards */}
      <section className="container">
        <div className="audience-grid">
          <div className="audience-card">
            <span className="audience-pill" style={{ backgroundColor: "#E7FAF1", color: "#0E8F5D" }}>
              <Sparkles className="h-3 w-3" /> Etsy Sellers &amp; Creators
            </span>
            <h3 style={{ fontSize: "15px", fontWeight: 700 }}>Find Underserved Niches</h3>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Spot high-velocity listing concepts with low review counts, optimize tags for real buyer demand, and protect your margins.
            </p>
          </div>

          <div className="audience-card">
            <span className="audience-pill" style={{ backgroundColor: "#EFF6FF", color: "#2563EB" }}>
              <Target className="h-3 w-3" /> eCommerce Entrepreneurs
            </span>
            <h3 style={{ fontSize: "15px", fontWeight: 700 }}>Validate Before Manufacturing</h3>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Evaluate market entry barriers, price sweet spots, and competitor sales rates before ordering inventory or stocking supplies.
            </p>
          </div>

          <div className="audience-card">
            <span className="audience-pill" style={{ backgroundColor: "#FAF5FF", color: "#9333EA" }}>
              <Layers className="h-3 w-3" /> Product Researchers &amp; Exporters
            </span>
            <h3 style={{ fontSize: "15px", fontWeight: 700 }}>Marketplace Category Mining</h3>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Analyze catalog saturation, selling velocity ratios, and price elasticity across thousands of Etsy taxonomy branches.
            </p>
          </div>

          <div className="audience-card">
            <span className="audience-pill" style={{ backgroundColor: "#FFFBEB", color: "#D97706" }}>
              <Users className="h-3 w-3" /> Agencies &amp; Multi-Brand Teams
            </span>
            <h3 style={{ fontSize: "15px", fontWeight: 700 }}>Market Opportunity Radar</h3>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Evaluate shop momentum with automated research snapshots and build synchronized keyword roadmaps in Planner.
            </p>
          </div>
        </div>
      </section>

      {/* Public Free Tools Playground & Acquisition Engine */}
      <section id="free-tools" className="container" style={{ margin: "40px auto" }}>
        <div className="section-header">
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#0E8F5D", textTransform: "uppercase", letterSpacing: "0.05em", backgroundColor: "#E7FAF1", padding: "4px 10px", borderRadius: "999px" }}>
            Free Seller Intelligence Tools
          </span>
          <h2 style={{ marginTop: "12px" }}>Instant Marketplace Insights — No Sign-in Required</h2>
          <p>
            Experience SellerSalt&apos;s real decision intelligence live. Test product opportunities, mine high-intent keywords, or audit any Etsy listing.
          </p>
        </div>

        <div style={{ background: "#FFFFFF", borderRadius: "16px", border: "1px solid #E3E6E0", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          {/* Tool Switcher Tabs */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", borderBottom: "1px solid #E3E6E0", paddingBottom: "16px", marginBottom: "20px" }}>
            {[
              { id: "KEYWORD_GENERATOR", label: "Free Keyword Opportunity Generator", placeholder: "leather wallet" },
              { id: "PRODUCT_PREVIEW", label: "Product Opportunity Radar Preview", placeholder: "Pour Over Coffee Dripper" },
              { id: "SHOP_PREVIEW", label: "Shop Intelligence Preview", placeholder: "ArtisanStudio" },
              { id: "SEO_PREVIEW", label: "Listing SEO Audit Preview", placeholder: "148920194" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setFreeToolTab(tab.id as any);
                  setFreeToolInput(tab.placeholder);
                  setFreeToolResult(null);
                  setFreeToolError(null);
                }}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 700,
                  border: freeToolTab === tab.id ? "1px solid #0E8F5D" : "1px solid #E3E6E0",
                  backgroundColor: freeToolTab === tab.id ? "#E7FAF1" : "#FAFAF8",
                  color: freeToolTab === tab.id ? "#0E8F5D" : "#525B55",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input Bar */}
          <form onSubmit={runFreeToolPreview} style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
            <input
              type="text"
              value={freeToolInput}
              onChange={(e) => setFreeToolInput(e.target.value)}
              placeholder="Enter search phrase, Etsy listing URL, or shop name..."
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #C7CCC4",
                fontSize: "13px",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={freeToolLoading}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                backgroundColor: "#0E8F5D",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: "13px",
                border: "none",
                cursor: freeToolLoading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {freeToolLoading ? "Analyzing..." : "Analyze Free"}
            </button>
          </form>

          {freeToolError && (
            <div style={{ padding: "12px", borderRadius: "8px", backgroundColor: "#FCEAE9", color: "#DC2626", fontSize: "12px", marginBottom: "16px" }}>
              {freeToolError}
            </div>
          )}

          {/* Results Render Area */}
          {freeToolResult ? (
            <div style={{ marginTop: "16px" }}>
              {/* Product Preview Result */}
              {freeToolTab === "PRODUCT_PREVIEW" && (
                <div style={{ background: "#FAFAF8", borderRadius: "12px", padding: "16px", border: "1px solid #E3E6E0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <div>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "#0E8F5D", backgroundColor: "#E7FAF1", padding: "2px 6px", borderRadius: "4px" }}>
                        [SELLERSALT SCORE]
                      </span>
                      <h4 style={{ fontSize: "15px", fontWeight: 800, margin: "4px 0 0 0" }}>{freeToolResult.title}</h4>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "24px", fontWeight: 900, color: "#0E8F5D", fontFamily: "monospace" }}>
                        {freeToolResult.opportunityScore}/100
                      </span>
                      <span style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#0E8F5D" }}>
                        {freeToolResult.typeEmoji} {freeToolResult.typeLabel}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px", marginBottom: "16px" }}>
                    <div style={{ background: "#FFFFFF", padding: "10px", borderRadius: "8px", border: "1px solid #E3E6E0" }}>
                      <span style={{ fontSize: "10px", color: "#7C847E", display: "block" }}>Daily Velocity:</span>
                      <span style={{ fontSize: "14px", fontWeight: 800, color: "#141B16" }}>{freeToolResult.dailyVelocity} sales/day</span>
                    </div>
                    <div style={{ background: "#FFFFFF", padding: "10px", borderRadius: "8px", border: "1px solid #E3E6E0" }}>
                      <span style={{ fontSize: "10px", color: "#7C847E", display: "block" }}>Category Benchmark:</span>
                      <span style={{ fontSize: "14px", fontWeight: 800, color: "#141B16" }}>{freeToolResult.categoryBenchmark} sales/day</span>
                    </div>
                    <div style={{ background: "#FFFFFF", padding: "10px", borderRadius: "8px", border: "1px solid #E3E6E0" }}>
                      <span style={{ fontSize: "10px", color: "#7C847E", display: "block" }}>Est. Unit Margin:</span>
                      <span style={{ fontSize: "14px", fontWeight: 800, color: "#0E8F5D" }}>{freeToolResult.unitMarginEstimate}</span>
                    </div>
                  </div>

                  {/* Progressive Upgrade Gate */}
                  <div style={{ background: "#FFFFFF", padding: "16px", borderRadius: "10px", border: "1px dashed #C7CCC4" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "#141B16" }}>
                          🔒 Unlock Complete Opportunity Dossier &amp; Competitor Harvest
                        </div>
                        <p style={{ fontSize: "11px", color: "#525B55", margin: "2px 0 0 0" }}>
                          Starter &amp; Pro tiers unlock all 38 harvested keywords, fee simulations, and 1-click Opportunity Planner.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => router.push("/pricing")}
                        style={{
                          padding: "8px 16px",
                          borderRadius: "6px",
                          backgroundColor: "#141B16",
                          color: "#FFFFFF",
                          fontSize: "12px",
                          fontWeight: 700,
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Explore Plans ($19/mo)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Keyword Generator Result */}
              {freeToolTab === "KEYWORD_GENERATOR" && (
                <div style={{ background: "#FAFAF8", borderRadius: "12px", padding: "16px", border: "1px solid #E3E6E0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#141B16" }}>
                      Top 10 High-Intent Keyword Opportunities for &quot;{freeToolResult.seedKeyword}&quot;
                    </div>
                    <span style={{ fontSize: "11px", color: "#7C847E" }}>
                      Showing {freeToolResult.visibleCount} of {freeToolResult.totalDiscoveredCount} opportunities
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px", marginBottom: "16px" }}>
                    {freeToolResult.keywords?.map((kw: any, idx: number) => (
                      <div key={idx} style={{ background: "#FFFFFF", padding: "10px", borderRadius: "8px", border: "1px solid #E3E6E0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <span style={{ fontSize: "12px", fontWeight: 700, color: "#141B16", display: "block" }}>{kw.keyword}</span>
                          <span style={{ fontSize: "10px", color: kw.isTagCompliant ? "#0E8F5D" : "#D97706" }}>
                            {kw.tagLength} chars {kw.isTagCompliant ? "(Etsy Tag OK)" : "(Exceeds 20 chars)"}
                          </span>
                        </div>
                        <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", backgroundColor: kw.opportunityTier === "HIGH" ? "#E7FAF1" : "#FAFAF8", color: kw.opportunityTier === "HIGH" ? "#0E8F5D" : "#525B55" }}>
                          {kw.opportunityTier}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Progressive Upgrade Gate */}
                  <div style={{ background: "#FFFFFF", padding: "16px", borderRadius: "10px", border: "1px dashed #C7CCC4" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "#141B16" }}>
                          🔒 38 Additional Long-Tail Keywords &amp; Exact Opportunity Scores Locked
                        </div>
                        <p style={{ fontSize: "11px", color: "#525B55", margin: "2px 0 0 0" }}>
                          Unlock full long-tail clusters, competition barriers, and 13-tag optimizer in Starter &amp; Pro plans.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => router.push("/pricing")}
                        style={{
                          padding: "8px 16px",
                          borderRadius: "6px",
                          backgroundColor: "#141B16",
                          color: "#FFFFFF",
                          fontSize: "12px",
                          fontWeight: 700,
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Unlock All Keywords
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Shop Preview Result */}
              {freeToolTab === "SHOP_PREVIEW" && (
                <div style={{ background: "#FAFAF8", borderRadius: "12px", padding: "16px", border: "1px solid #E3E6E0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <div>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "#0E8F5D", backgroundColor: "#E7FAF1", padding: "2px 6px", borderRadius: "4px" }}>
                        [ESTIMATED]
                      </span>
                      <h4 style={{ fontSize: "15px", fontWeight: 800, margin: "4px 0 0 0" }}>{freeToolResult.shopName}</h4>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "20px", fontWeight: 900, color: "#0E8F5D", fontFamily: "monospace" }}>
                        Score: {freeToolResult.shopScore}/100
                      </span>
                      <span style={{ display: "block", fontSize: "11px", color: "#525B55" }}>
                        Est. Velocity: {freeToolResult.estimatedDailySales} sales/day
                      </span>
                    </div>
                  </div>

                  <div style={{ background: "#FFFFFF", padding: "12px", borderRadius: "8px", border: "1px solid #E3E6E0", marginBottom: "16px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#7C847E", marginBottom: "8px" }}>
                      SAMPLE WINNING LISTINGS:
                    </div>
                    {freeToolResult.topListingPreview?.map((l: any, idx: number) => (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "4px 0", borderBottom: idx === 0 ? "1px solid #F3F4F6" : "none" }}>
                        <span style={{ fontWeight: 600, color: "#141B16" }}>{l.title}</span>
                        <span style={{ color: "#0E8F5D", fontWeight: 700 }}>${l.price} · {l.estVelocity}</span>
                      </div>
                    ))}
                  </div>

                  {/* Progressive Upgrade Gate */}
                  <div style={{ background: "#FFFFFF", padding: "16px", borderRadius: "10px", border: "1px dashed #C7CCC4" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "#141B16" }}>
                          🔒 Full {freeToolResult.catalogSize}-Listing Deep Catalog Research Locked
                        </div>
                        <p style={{ fontSize: "11px", color: "#525B55", margin: "2px 0 0 0" }}>
                          Analyze 24h &amp; 7d sales trends, marketplace tag clusters, and demand signals.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => router.push("/pricing")}
                        style={{
                          padding: "8px 16px",
                          borderRadius: "6px",
                          backgroundColor: "#141B16",
                          color: "#FFFFFF",
                          fontSize: "12px",
                          fontWeight: 700,
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Track Shop
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SEO Audit Preview Result */}
              {freeToolTab === "SEO_PREVIEW" && (
                <div style={{ background: "#FAFAF8", borderRadius: "12px", padding: "16px", border: "1px solid #E3E6E0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <div>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "#0E8F5D", backgroundColor: "#E7FAF1", padding: "2px 6px", borderRadius: "4px" }}>
                        [SELLERSALT SCORE]
                      </span>
                      <h4 style={{ fontSize: "15px", fontWeight: 800, margin: "4px 0 0 0" }}>Listing SEO Diagnostic Audit</h4>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "22px", fontWeight: 900, color: "#0E8F5D", fontFamily: "monospace" }}>
                        {freeToolResult.overallScore}/100 ({freeToolResult.grade})
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px", marginBottom: "16px" }}>
                    <div style={{ background: "#FFFFFF", padding: "10px", borderRadius: "8px", border: "1px solid #E3E6E0" }}>
                      <span style={{ fontSize: "10px", color: "#7C847E", display: "block" }}>Title Optimization:</span>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#141B16" }}>{freeToolResult.titleLength}</span>
                    </div>
                    <div style={{ background: "#FFFFFF", padding: "10px", borderRadius: "8px", border: "1px solid #E3E6E0" }}>
                      <span style={{ fontSize: "10px", color: "#7C847E", display: "block" }}>13-Tag Utilization:</span>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#DC2626" }}>{freeToolResult.tagCompliance}</span>
                    </div>
                  </div>

                  {/* Progressive Upgrade Gate */}
                  <div style={{ background: "#FFFFFF", padding: "16px", borderRadius: "10px", border: "1px dashed #C7CCC4" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "#141B16" }}>
                          🔒 13 High-Intent Tag Optimizer &amp; Front-Loaded Title Rewriter Locked
                        </div>
                        <p style={{ fontSize: "11px", color: "#525B55", margin: "2px 0 0 0" }}>
                          Fill all 13 tag slots and generate human-approved listing copy in Listing Content Studio.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => router.push("/pricing")}
                        style={{
                          padding: "8px 16px",
                          borderRadius: "6px",
                          backgroundColor: "#141B16",
                          color: "#FFFFFF",
                          fontSize: "12px",
                          fontWeight: 700,
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Optimize Listing
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "24px 0", color: "#7C847E", fontSize: "13px" }}>
              Click <strong>&quot;Analyze Free&quot;</strong> above to generate an instant, anonymous marketplace intelligence preview.
            </div>
          )}
        </div>
      </section>

      {/* TASK 2: SHOW THE PRODUCT (LIVE SHOWCASE SECTION) */}
      <section id="showcase" className="container">
        <div className="section-header">
          <h2>Engineered for Decisions, Not Just Tables</h2>
          <p>
            Explore how SellerSalt transforms raw marketplace data into clear, actionable product intelligence.
          </p>
        </div>

        <div className="showcase-container">
          {/* Showcase Tabs */}
          <div className="showcase-tabs">
            {[
              { id: "radar", label: "Product Discovery (Opportunity Radar)", icon: Flame },
              { id: "shop", label: "Shop Intelligence & Verdict", icon: Store },
              { id: "category", label: "Category Hunting", icon: Layers },
              { id: "keyword", label: "Keyword Intelligence", icon: Search },
              { id: "profit", label: "Revenue & Profit Intelligence", icon: DollarSign },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setShowcaseTab(t.id as any)}
                  className={`showcase-tab-btn ${showcaseTab === t.id ? "active" : ""}`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab 1: Opportunity Radar */}
          {showcaseTab === "radar" && (
            <div className="showcase-panel">
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "20px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#0E8F5D", backgroundColor: "#E7FAF1", padding: "2px 8px", borderRadius: "6px" }}>
                      [SellerSalt Score]
                    </span>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#7C847E" }}>
                      Verified Breakout Opportunity
                    </span>
                  </div>
                  <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#141B16" }}>
                    Minimalist Acrylic Weekly Desk Calendar &amp; Habit Tracker
                  </h3>
                  <p style={{ fontSize: "12px", color: "#525B55", marginTop: "2px" }}>
                    Etsy Listing #148920194 · Shop: StudioDesignDesk (Age: 9 mo)
                  </p>
                </div>

                <div style={{ textAlign: "right", background: "#FFFFFF", padding: "12px 18px", borderRadius: "12px", border: "1px solid #E3E6E0" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#7C847E", textTransform: "uppercase" }}>
                    Opportunity Score
                  </div>
                  <div style={{ fontSize: "32px", fontWeight: 900, color: "#0E8F5D", fontFamily: "monospace", lineHeight: 1.1 }}>
                    88<span style={{ fontSize: "16px", color: "#7C847E" }}>/100</span>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#0E8F5D" }}>🔥 High Potential Niche</span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", background: "#FFFFFF", padding: "16px", borderRadius: "12px", border: "1px solid #E3E6E0" }}>
                <div>
                  <span style={{ fontSize: "11px", color: "#7C847E", display: "block" }}>Est. Daily Sales:</span>
                  <span style={{ fontSize: "16px", fontWeight: 800, color: "#141B16" }}>6.4 units / day</span>
                  <span style={{ fontSize: "10px", color: "#0E8F5D", display: "block" }}>~$185.00 daily gross</span>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "#7C847E", display: "block" }}>Retail Price:</span>
                  <span style={{ fontSize: "16px", fontWeight: 800, color: "#141B16" }}>$28.90</span>
                  <span style={{ fontSize: "10px", color: "#525B55", display: "block" }}>Sweet spot for desk goods</span>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "#7C847E", display: "block" }}>Competitor Reviews:</span>
                  <span style={{ fontSize: "16px", fontWeight: 800, color: "#141B16" }}>48 reviews</span>
                  <span style={{ fontSize: "10px", color: "#0E8F5D", display: "block" }}>Low barrier to entry</span>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "#7C847E", display: "block" }}>Catalog Selling Ratio:</span>
                  <span style={{ fontSize: "16px", fontWeight: 800, color: "#141B16" }}>18.2 sales / listing</span>
                  <span style={{ fontSize: "10px", color: "#0E8F5D", display: "block" }}>Lean, high-yield catalog</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Shop Intelligence */}
          {showcaseTab === "shop" && (
            <div className="showcase-panel">
              <div style={{ background: "#141B16", color: "#FFFFFF", padding: "20px", borderRadius: "14px", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 800, textTransform: "uppercase", color: "#0E8F5D", backgroundColor: "#1C261F", padding: "3px 8px", borderRadius: "6px", border: "1px solid #2A362D" }}>
                    Strategic Competition Verdict
                  </span>
                  <span style={{ fontSize: "11px", color: "#9EAA9F" }}>Decision Engine</span>
                </div>
                <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#FFFFFF", marginBottom: "6px" }}>
                  Should you compete with &quot;ArtisanWoodcraftCo&quot;?
                </h3>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "#FFF8E6", color: "#B87D00", padding: "4px 12px", borderRadius: "8px", fontWeight: 800, fontSize: "13px" }}>
                  ⚖️ Moderate to Compete — Feasible with High-Quality Visuals
                </div>
                <p style={{ fontSize: "12px", color: "#9EAA9F", marginTop: "10px", lineHeight: 1.5 }}>
                  This competitor maintains strong lifetime sales (14,280 verified orders) but relies on a modest 4.8 review velocity and older listing photography. A new entrant with premium lifestyle imagery and video can capture meaningful market share.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", background: "#FFFFFF", padding: "16px", borderRadius: "12px", border: "1px solid #E3E6E0" }}>
                <div>
                  <span style={{ fontSize: "11px", color: "#7C847E", display: "block" }}>Lifetime Sales:</span>
                  <span style={{ fontSize: "16px", fontWeight: 800, color: "#141B16" }}>14,280</span>
                  <span style={{ fontSize: "10px", color: "#0E8F5D" }}>[From Etsy Data]</span>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "#7C847E", display: "block" }}>Est. Monthly Revenue:</span>
                  <span style={{ fontSize: "16px", fontWeight: 800, color: "#141B16" }}>$8,420 / mo</span>
                  <span style={{ fontSize: "10px", color: "#7C847E" }}>[SellerSalt Estimate]</span>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "#7C847E", display: "block" }}>Shop Age:</span>
                  <span style={{ fontSize: "16px", fontWeight: 800, color: "#141B16" }}>18 Months</span>
                  <span style={{ fontSize: "10px", color: "#7C847E" }}>Moderate maturity</span>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "#7C847E", display: "block" }}>Active Listings:</span>
                  <span style={{ fontSize: "16px", fontWeight: 800, color: "#141B16" }}>42 Listings</span>
                  <span style={{ fontSize: "10px", color: "#0E8F5D" }}>Highly focused catalog</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Category Hunting */}
          {showcaseTab === "category" && (
            <div className="showcase-panel">
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#7C847E", textTransform: "uppercase" }}>
                  Taxonomy Hierarchy Exploration
                </div>
                <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#141B16" }}>
                  Home &amp; Living → Office &amp; Desk Storage → Desktop Organizers
                </h3>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "16px" }}>
                <div style={{ background: "#FFFFFF", padding: "16px", borderRadius: "12px", border: "1px solid #E3E6E0" }}>
                  <span style={{ fontSize: "11px", color: "#7C847E", display: "block" }}>Subcategory Momentum:</span>
                  <span style={{ fontSize: "18px", fontWeight: 800, color: "#0E8F5D" }}>+28% MoM Growth</span>
                  <span style={{ fontSize: "11px", color: "#525B55", display: "block" }}>High seasonal buyer interest</span>
                </div>
                <div style={{ background: "#FFFFFF", padding: "16px", borderRadius: "12px", border: "1px solid #E3E6E0" }}>
                  <span style={{ fontSize: "11px", color: "#7C847E", display: "block" }}>Average Price Point:</span>
                  <span style={{ fontSize: "18px", fontWeight: 800, color: "#141B16" }}>$34.50</span>
                  <span style={{ fontSize: "11px", color: "#525B55", display: "block" }}>Strong margin support</span>
                </div>
                <div style={{ background: "#FFFFFF", padding: "16px", borderRadius: "12px", border: "1px solid #E3E6E0" }}>
                  <span style={{ fontSize: "11px", color: "#7C847E", display: "block" }}>Market Feasibility:</span>
                  <span style={{ fontSize: "18px", fontWeight: 800, color: "#0E8F5D" }}>Low Barrier</span>
                  <span style={{ fontSize: "11px", color: "#525B55", display: "block" }}>Top 10 sellers hold &lt;30% share</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Keyword Intelligence */}
          {showcaseTab === "keyword" && (
            <div className="showcase-panel">
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#7C847E", textTransform: "uppercase" }}>
                  High-Intent Buyer Search Terms
                </div>
                <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#141B16" }}>
                  Target Search Phrases for &quot;Desk Organizer&quot;
                </h3>
              </div>

              <div style={{ background: "#FFFFFF", borderRadius: "12px", border: "1px solid #E3E6E0", overflow: "hidden" }}>
                <table style={{ width: "100%", fontSize: "12px", textAlign: "left", borderCollapse: "collapse" }}>
                  <thead style={{ backgroundColor: "#FAFAF8", borderBottom: "1px solid #E3E6E0", color: "#7C847E" }}>
                    <tr>
                      <th style={{ padding: "10px 14px" }}>Buyer Search Keyword</th>
                      <th style={{ padding: "10px 14px" }}>Opportunity Score</th>
                      <th style={{ padding: "10px 14px" }}>Competition Level</th>
                      <th style={{ padding: "10px 14px" }}>Tag Opportunity</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: "1px solid #EDEFEA" }}>
                      <td style={{ padding: "12px 14px", fontWeight: 700 }}>custom acrylic dry erase planner</td>
                      <td style={{ padding: "12px 14px", fontWeight: 800, color: "#0E8F5D" }}>89 / 100</td>
                      <td style={{ padding: "12px 14px" }}><span style={{ backgroundColor: "#E7FAF1", color: "#0E8F5D", padding: "2px 6px", borderRadius: "4px", fontWeight: 700, fontSize: "11px" }}>Low Saturation</span></td>
                      <td style={{ padding: "12px 14px", color: "#525B55" }}>13 high-intent tag matches</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid #EDEFEA" }}>
                      <td style={{ padding: "12px 14px", fontWeight: 700 }}>minimalist wooden desk caddy</td>
                      <td style={{ padding: "12px 14px", fontWeight: 800, color: "#0E8F5D" }}>82 / 100</td>
                      <td style={{ padding: "12px 14px" }}><span style={{ backgroundColor: "#E7FAF1", color: "#0E8F5D", padding: "2px 6px", borderRadius: "4px", fontWeight: 700, fontSize: "11px" }}>Low Saturation</span></td>
                      <td style={{ padding: "12px 14px", color: "#525B55" }}>11 high-intent tag matches</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "12px 14px", fontWeight: 700 }}>aesthetic office desk organizer</td>
                      <td style={{ padding: "12px 14px", fontWeight: 800, color: "#B87D00" }}>71 / 100</td>
                      <td style={{ padding: "12px 14px" }}><span style={{ backgroundColor: "#FFF8E6", color: "#B87D00", padding: "2px 6px", borderRadius: "4px", fontWeight: 700, fontSize: "11px" }}>Moderate</span></td>
                      <td style={{ padding: "12px 14px", color: "#525B55" }}>8 high-intent tag matches</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 5: Revenue & Profit */}
          {showcaseTab === "profit" && (
            <div className="showcase-panel">
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#7C847E", textTransform: "uppercase" }}>
                  Unit Economics &amp; Margin Intelligence
                </div>
                <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#141B16" }}>
                  Net Profit &amp; Fee Breakdown Simulator
                </h3>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", background: "#FFFFFF", padding: "18px", borderRadius: "12px", border: "1px solid #E3E6E0" }}>
                <div>
                  <span style={{ fontSize: "11px", color: "#7C847E", display: "block" }}>Retail Sale Price:</span>
                  <span style={{ fontSize: "18px", fontWeight: 800, color: "#141B16" }}>$32.00</span>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "#7C847E", display: "block" }}>Production / COGS:</span>
                  <span style={{ fontSize: "18px", fontWeight: 800, color: "#DC2626" }}>-$8.50</span>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "#7C847E", display: "block" }}>Etsy Fees (6.5% + 3% + $0.20):</span>
                  <span style={{ fontSize: "18px", fontWeight: 800, color: "#D97706" }}>-$3.68</span>
                </div>
                <div style={{ background: "#E7FAF1", padding: "10px 14px", borderRadius: "8px", border: "1px solid #16C784/30" }}>
                  <span style={{ fontSize: "11px", color: "#0A6342", display: "block", fontWeight: 700 }}>Net Profit per Unit:</span>
                  <span style={{ fontSize: "20px", fontWeight: 900, color: "#0E8F5D", fontFamily: "monospace" }}>$19.82</span>
                  <span style={{ fontSize: "11px", color: "#0E8F5D", fontWeight: 700, display: "block" }}>61.9% Net Margin</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* TASK 3: CORE DIFFERENTIATOR (5-STAGE DECISION WORKFLOW) */}
      <section id="workflow" className="container">
        <div className="section-header">
          <h2>The 5-Stage Decision Workflow</h2>
          <p>
            Traditional tools give you disconnected data tables. SellerSalt unites the entire eCommerce research loop into one actionable decision path.
          </p>
        </div>

        <div className="workflow-grid">
          <div className="workflow-card">
            <span className="workflow-step-num">Step 1</span>
            <h3 style={{ fontSize: "15px", fontWeight: 700 }}>1. Discover</h3>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Scan categories and sub-niches on the Opportunity Radar to find breakout listings with high sales velocity.
            </p>
          </div>

          <div className="workflow-card">
            <span className="workflow-step-num">Step 2</span>
            <h3 style={{ fontSize: "15px", fontWeight: 700 }}>2. Research</h3>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Mine high-intent buyer keywords, evaluate search opportunity scores, and extract winning competitor tag clusters.
            </p>
          </div>

          <div className="workflow-card">
            <span className="workflow-step-num">Step 3</span>
            <h3 style={{ fontSize: "15px", fontWeight: 700 }}>3. Investigate</h3>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Track competitor shops, monitor daily sales spikes, and analyze catalog size to understand true revenue velocity.
            </p>
          </div>

          <div className="workflow-card">
            <span className="workflow-step-num">Step 4</span>
            <h3 style={{ fontSize: "15px", fontWeight: 700 }}>4. Score &amp; Decide</h3>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Receive an explainable competition verdict: Should I enter this market? Is the opportunity feasible?
            </p>
          </div>

          <div className="workflow-card">
            <span className="workflow-step-num">Step 5</span>
            <h3 style={{ fontSize: "15px", fontWeight: 700 }}>5. Plan &amp; Execute</h3>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Save winning product concepts directly into Workspace Planner with target prices, keyword roadmaps, and SEO drafts.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Feasibility Calculator */}
      <section id="calculator" className="container">
        <div className="calc-section">
          <div className="calc-grid">
            <div>
              <h2 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "12px" }}>
                Interactive Feasibility Simulator
              </h2>
              <p style={{ color: "var(--text-secondary)", marginBottom: "32px", fontSize: "15px" }}>
                Test how SellerSalt evaluates niche competition based on competitor review barriers, shop maturity, and buyer demand.
              </p>

              <div className="calc-control">
                <label>
                  <span>Competitor Review Volume</span>
                  <span>{reviewCount.toLocaleString()} reviews</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="5000"
                  step="50"
                  value={reviewCount}
                  onChange={(e) => setReviewCount(Number(e.target.value))}
                />
              </div>

              <div className="calc-control">
                <label>
                  <span>Competitor Shop Maturity</span>
                  <span>{shopAge} months</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="60"
                  value={shopAge}
                  onChange={(e) => setShopAge(Number(e.target.value))}
                />
              </div>

              <div className="calc-control">
                <label>
                  <span>Market Buyer Velocity</span>
                  <span style={{ textTransform: "capitalize" }}>{demandLevel} Velocity</span>
                </label>
                <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                  {(["high", "medium", "low"] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setDemandLevel(lvl)}
                      className="btn btn-secondary"
                      style={{
                        flex: 1,
                        fontSize: "12px",
                        padding: "6px 12px",
                        backgroundColor: demandLevel === lvl ? "var(--text-main)" : "var(--bg-surface)",
                        color: demandLevel === lvl ? "#FFFFFF" : "var(--text-main)",
                      }}
                    >
                      {lvl.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="calc-score-box">
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "12px" }}>
                [SELLERSALT SCORE ESTIMATE]
              </div>
              <div className="calc-score-number">{score}</div>
              <div
                className="calc-score-badge"
                style={{ backgroundColor: scoreBadgeBg, color: scoreBadgeText }}
              >
                {scoreLabel}
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {score >= 70
                  ? "High opportunity: low review barriers and younger competitors make entering this niche highly feasible."
                  : score >= 45
                  ? "Moderate barrier: requires high-converting listing visuals and targeted SEO to break into top results."
                  : "Crowded niche: mature competitors with high review counts dominate top organic placements."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The 4-Pillar Seller Operating System Architecture */}
      <section className="container" style={{ margin: "48px auto" }}>
        <div className="section-header">
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#0E8F5D", textTransform: "uppercase", letterSpacing: "0.05em", backgroundColor: "#E7FAF1", padding: "4px 10px", borderRadius: "999px" }}>
            The Full Operating System Loop
          </span>
          <h2 style={{ marginTop: "12px" }}>Complete Seller Workflow Architecture</h2>
          <p>
            SellerSalt connects every stage of your business — from initial niche discovery to live Etsy listing drafts and post-publish optimization.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginTop: "24px" }}>
          {/* Pillar 1: DISCOVER */}
          <div style={{ background: "#FFFFFF", padding: "20px", borderRadius: "14px", border: "1px solid #E3E6E0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#0E8F5D", backgroundColor: "#E7FAF1", padding: "3px 8px", borderRadius: "6px" }}>
                PILLAR 1
              </span>
              <h3 style={{ fontSize: "16px", fontWeight: 800, margin: 0 }}>DISCOVER</h3>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "12px", color: "#525B55" }}>
              <li style={{ padding: "4px 0" }}>• Product Research &amp; Breakouts</li>
              <li style={{ padding: "4px 0" }}>• High-Intent Keyword Mining</li>
              <li style={{ padding: "4px 0" }}>• Category Taxonomy Hunting</li>
              <li style={{ padding: "4px 0" }}>• Competitor Shop Intelligence</li>
              <li style={{ padding: "4px 0" }}>• 24h &amp; 7d Velocity Tracking</li>
            </ul>
          </div>

          {/* Pillar 2: DECIDE */}
          <div style={{ background: "#FFFFFF", padding: "20px", borderRadius: "14px", border: "1px solid #E3E6E0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#2563EB", backgroundColor: "#EFF6FF", padding: "3px 8px", borderRadius: "6px" }}>
                PILLAR 2
              </span>
              <h3 style={{ fontSize: "16px", fontWeight: 800, margin: 0 }}>DECIDE</h3>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "12px", color: "#525B55" }}>
              <li style={{ padding: "4px 0" }}>• Opportunity Radar (0–100 Score)</li>
              <li style={{ padding: "4px 0" }}>• Canonical Opportunity Inbox</li>
              <li style={{ padding: "4px 0" }}>• Unit Margin &amp; Profit Modeling</li>
              <li style={{ padding: "4px 0" }}>• Next Best Action Reasoning</li>
              <li style={{ padding: "4px 0" }}>• Long-Tail Keyword Clusters</li>
            </ul>
          </div>

          {/* Pillar 3: EXECUTE */}
          <div style={{ background: "#FFFFFF", padding: "20px", borderRadius: "14px", border: "1px solid #E3E6E0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#9333EA", backgroundColor: "#FAF5FF", padding: "3px 8px", borderRadius: "6px" }}>
                PILLAR 3
              </span>
              <h3 style={{ fontSize: "16px", fontWeight: 800, margin: 0 }}>EXECUTE</h3>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "12px", color: "#525B55" }}>
              <li style={{ padding: "4px 0" }}>• Workspace Opportunity Planner</li>
              <li style={{ padding: "4px 0" }}>• 6-Pillar Listing Strategy Plan</li>
              <li style={{ padding: "4px 0" }}>• Listing Content Studio (Versioning)</li>
              <li style={{ padding: "4px 0" }}>• Pre-Flight 13-Tag Validator</li>
              <li style={{ padding: "4px 0" }}>• Human Review Gate (Rule 9)</li>
            </ul>
          </div>

          {/* Pillar 4: OPERATE */}
          <div style={{ background: "#FFFFFF", padding: "20px", borderRadius: "14px", border: "1px solid #E3E6E0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#D97706", backgroundColor: "#FFFBEB", padding: "3px 8px", borderRadius: "6px" }}>
                PILLAR 4
              </span>
              <h3 style={{ fontSize: "16px", fontWeight: 800, margin: 0 }}>OPERATE</h3>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "12px", color: "#525B55" }}>
              <li style={{ padding: "4px 0" }}>• Own Shop Operations Center</li>
              <li style={{ padding: "4px 0" }}>• Store Health Index &amp; Tag Audit</li>
              <li style={{ padding: "4px 0" }}>• Post-Publish Trajectory Watch</li>
              <li style={{ padding: "4px 0" }}>• Closed-Loop Optimization Tasks</li>
              <li style={{ padding: "4px 0" }}>• Browser Assistant Extension</li>
            </ul>
          </div>
        </div>

        {/* Marketplace Ecosystem Strip */}
        <div style={{ marginTop: "24px", background: "#FAFAF8", padding: "16px 20px", borderRadius: "12px", border: "1px solid #E3E6E0", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#141B16" }}>
            Marketplace Channels:
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "6px", backgroundColor: "#E7FAF1", color: "#0E8F5D", border: "1px solid #0E8F5D/30" }}>
              🟢 Etsy (Active)
            </span>
            <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 8px", borderRadius: "6px", backgroundColor: "#F3F4F6", color: "#6B7280" }}>
              ⏳ Amazon (Coming Soon)
            </span>
            <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 8px", borderRadius: "6px", backgroundColor: "#F3F4F6", color: "#6B7280" }}>
              ⏳ eBay (Coming Soon)
            </span>
            <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 8px", borderRadius: "6px", backgroundColor: "#F3F4F6", color: "#6B7280" }}>
              ⏳ TikTok Shop (Coming Soon)
            </span>
            <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 8px", borderRadius: "6px", backgroundColor: "#F3F4F6", color: "#6B7280" }}>
              ⏳ Walmart (Coming Soon)
            </span>
          </div>
        </div>
      </section>

      {/* Pricing Section (Tasks 4 & 5) */}
      <section id="pricing" className="container">
        <div className="section-header">
          <h2>Transparent, Research-First Plans</h2>
          <p>Every plan includes real Etsy research access, Opportunity Radar, and daily competitor tracking.</p>
        </div>

        <div className="pricing-grid">
          {/* FREE EXPLORER */}
          <div className="pricing-card">
            <div>
              <div className="pricing-badge-free" style={{ display: "inline-block", padding: "3px 8px", borderRadius: "6px", background: "var(--bg-surface-muted, #F4F3EF)", color: "var(--text-secondary, #525B55)", fontSize: "11px", fontWeight: 700, marginBottom: "12px", textTransform: "uppercase" }}>
                Free Forever
              </div>
              <h3>Free Explorer</h3>
              <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                Essential market discovery tools for new Etsy sellers.
              </p>
              <div className="pricing-price">
                $0
                <span> / month</span>
              </div>
              <div className="pricing-trial-note">No credit card required</div>

              <ul className="pricing-features">
                <li><Check className="h-4 w-4" /> 15 Monthly Keyword Searches</li>
                <li><Check className="h-4 w-4" /> 10 Product Discoveries / mo</li>
                <li><Check className="h-4 w-4" /> 1 Tracked Competitor Shop</li>
                <li><Check className="h-4 w-4" /> Sample Opportunity Radar</li>
                <li><Check className="h-4 w-4" /> 3 Workspace Planner Items</li>
                <li><Check className="h-4 w-4" /> 3 Listing SEO Audits / mo</li>
              </ul>
            </div>

            <Link href="/signup" className="btn btn-secondary" style={{ width: "100%" }}>
              Start for Free
            </Link>
          </div>

          {/* STARTED */}
          <div className="pricing-card">
            <div>
              <h3>{started?.name ?? "Starter"}</h3>
              <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                Ideal for individual sellers and solo researchers.
              </p>
              <div className="pricing-price">
                ${started?.priceUsd ?? 19}
                <span> / month</span>
              </div>
              <div className="pricing-trial-note">Cancel anytime</div>

              <ul className="pricing-features">
                <li><Check className="h-4 w-4" /> {started?.maxSearchConfigs ?? 3} Active Saved Searches</li>
                <li><Check className="h-4 w-4" /> {started?.maxTrackedShops ?? 5} Tracked Competitor Shops</li>
                <li><Check className="h-4 w-4" /> {started?.maxProspectsPerMonth ?? 200} Product Discoveries / mo</li>
                <li><Check className="h-4 w-4" /> Full Opportunity Radar Access</li>
                <li><Check className="h-4 w-4" /> Category &amp; Keyword Research</li>
                <li><Check className="h-4 w-4" /> Workspace Planner Access</li>
              </ul>
            </div>

            <Link href="/checkout?plan=STARTED" className="btn btn-secondary" style={{ width: "100%" }}>
              Choose Starter
            </Link>
          </div>

          {/* PRO (FEATURED) */}
          <div className="pricing-card featured">
            <div className="pricing-badge">Most Popular</div>
            <div>
              <h3>{pro?.name ?? "Pro"}</h3>
              <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                For professional sellers scaling multiple product lines.
              </p>
              <div className="pricing-price">
                ${pro?.priceUsd ?? 49}
                <span> / month</span>
              </div>
              <div className="pricing-trial-note">Cancel anytime</div>

              <ul className="pricing-features">
                <li><Check className="h-4 w-4" /> {pro?.maxSearchConfigs ?? 10} Active Saved Searches</li>
                <li><Check className="h-4 w-4" /> {pro?.maxTrackedShops ?? 25} Tracked Competitor Shops</li>
                <li><Check className="h-4 w-4" /> {pro?.maxProspectsPerMonth ?? 1000} Product Discoveries / mo</li>
                <li><Check className="h-4 w-4" /> Strategic Competition Verdicts</li>
                <li><Check className="h-4 w-4" /> Keyword &amp; Tag Cluster Mining</li>
                <li><Check className="h-4 w-4" /> Revenue &amp; Profit Intelligence</li>
                <li><Check className="h-4 w-4" /> Priority Search Queue &amp; Hourly Updates</li>
              </ul>
            </div>

            <Link href="/checkout?plan=PRO" className="btn btn-accent" style={{ width: "100%" }}>
              Choose Pro
            </Link>
          </div>

          {/* AGENCY */}
          <div className="pricing-card">
            <div>
              <h3>{agency?.name ?? "Agency"}</h3>
              <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                For sourcing agencies and high-volume multi-brand teams.
              </p>
              <div className="pricing-price">
                ${agency?.priceUsd ?? 199}
                <span> / month</span>
              </div>
              <div className="pricing-trial-note">Cancel anytime</div>

              <ul className="pricing-features">
                <li><Check className="h-4 w-4" /> {agency?.maxSearchConfigs ?? 50} Active Saved Searches</li>
                <li><Check className="h-4 w-4" /> {agency?.maxTrackedShops ?? 100} Tracked Competitor Shops</li>
                <li><Check className="h-4 w-4" /> {agency?.maxProspectsPerMonth ?? 5000} Product Discoveries / mo</li>
                <li><Check className="h-4 w-4" /> Multi-Seat Team Workspace Access</li>
                <li><Check className="h-4 w-4" /> Dedicated Research Query Capacity</li>
                <li><Check className="h-4 w-4" /> Full Revenue &amp; Fee Audit Engine</li>
              </ul>
            </div>

            <Link href="/checkout?plan=AGENCY" className="btn btn-secondary" style={{ width: "100%" }}>
              Choose Agency
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="container">
        <div className="section-header">
          <h2>Frequently Asked Questions</h2>
          <p>Everything you need to know about SellerSalt, data accuracy, and billing.</p>
        </div>

        <div className="faq-list">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="faq-item"
                onClick={() => setOpenFaq(isOpen ? null : idx)}
              >
                <div className="faq-q">
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
                </div>
                {isOpen && <div className="faq-a">{faq.a}</div>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="container footer-container">
          <div className="logo" style={{ fontSize: "16px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/icon-square.png"
              alt=""
              className="logo-icon"
              style={{ width: "24px", height: "24px", objectFit: "contain", background: "none" }}
            />
            SellerSalt
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", fontSize: "13px" }}>
            <a href="#showcase">Product Showcase</a>
            <a href="#workflow">Decision Workflow</a>
            <Link href="/shops">Shop Directory</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/contact">Support</Link>
            <Link href="/login">Sign In</Link>
          </div>

          <div style={{ fontSize: "11px", color: "var(--muted)", maxWidth: "800px", lineHeight: "1.5", margin: "16px auto 0", textAlign: "center" }}>
            <strong>Etsy Trademark Disclosure:</strong> The term &lsquo;Etsy&rsquo; is a trademark of Etsy, Inc. This application uses the Etsy API but is not endorsed or certified by Etsy, Inc.
          </div>

          <div style={{ fontSize: "13px", marginTop: "12px" }}>
            &copy; {new Date().getFullYear()} SellerSalt. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
