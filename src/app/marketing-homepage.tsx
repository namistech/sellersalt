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
    q: "Do I need my own Etsy API key or developer account?",
    a: "No. SellerSalt works completely out-of-the-box using our platform research connector. You don't need technical setup or Etsy approval.",
  },
  {
    q: "Is the sales data on SellerSalt real or estimated?",
    a: "SellerSalt extracts verified lifetime transaction numbers directly from Etsy shop data and updates them via daily point-in-time snapshots, avoiding speculative keyword estimators.",
  },
  {
    q: "What is Opportunity Radar?",
    a: "Opportunity Radar is SellerSalt's decision layer. It evaluates sales velocity, catalog density, competition barriers, and recency to highlight emerging winning products before they get crowded.",
  },
  {
    q: "Can I track competitor shops over time?",
    a: "Yes. Use Spy on Competitor to monitor any Etsy shop. SellerSalt captures daily snapshots of sales, listing changes, and review growth so you see real trajectories.",
  },
  {
    q: "How does the $1 trial work?",
    a: "You get 3 full days of access for just $1 to verify real data and test the Opportunity Radar. You can cancel anytime inside your dashboard billing settings.",
  },
];

export function MarketingHomepage({ packages }: { packages: PackageData[] }) {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [searchValue, setSearchValue] = useState("");

  const [reviewCount, setReviewCount] = useState(450);
  const [shopAge, setShopAge] = useState(14);
  const [demandLevel, setDemandLevel] = useState<"high" | "medium" | "low">("high");

  function handleHeroSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchValue.trim()) params.set("url", searchValue.trim());
    router.push(`/checkout?plan=STARTED${params.toString() ? `&${params.toString()}` : ""}`);
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
          ✨ <strong>LAUNCH SPECIAL:</strong> Start researching Etsy opportunities today with a 3-day trial for just $1.
        </span>
        <a href="#pricing">See Plans →</a>
      </div>

      {/* Navigation Header */}
      <header>
        <div className="container nav-container">
          <Link href="/" className="logo">
            <div className="logo-icon">S</div>
            SellerSalt
          </Link>

          <nav aria-label="Main Navigation">
            <ul className="nav-links">
              <li><a href="#features">Features</a></li>
              <li><a href="#radar">Opportunity Radar</a></li>
              <li><a href="#calculator">Difficulty Tool</a></li>
              <li><a href="#pricing">Pricing</a></li>
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
            First-Principles Etsy Research & Opportunity Intelligence
          </div>

          <h1>
            Spot Winning Etsy Opportunities <br />
            Before They Become Saturated
          </h1>

          <p>
            SellerSalt transforms verified marketplace sales data into clear decision intelligence.
            Identify high-velocity niches, lean catalogs, and competitor momentum in seconds.
          </p>

          <div className="hero-actions">
            <Link href="/checkout?plan=PRO" className="btn btn-accent">
              Start 3-Day Trial ($1)
            </Link>
            <a href="#calculator" className="btn btn-secondary">
              Try Difficulty Calculator
            </a>
          </div>

          {/* Direct Shop Lookup / Search Input */}
          <form onSubmit={handleHeroSearch} className="hero-search-box">
            <input
              type="text"
              placeholder="Paste any Etsy shop URL or search keyword (e.g. etsy.com/shop/YourShopName)..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">
              Analyze Niche →
            </button>
          </form>
        </div>
      </section>

      {/* Core Features Grid */}
      <section id="features" className="container">
        <div className="section-header">
          <h2>Data → Intelligence → Decision</h2>
          <p>
            Unlike generic SEO tools that estimate speculative keyword volume, SellerSalt tracks verified sales transactions and competitor velocity.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <Flame className="h-6 w-6" />
            </div>
            <h3>Opportunity Radar</h3>
            <p>
              Our proprietary 5-signal scoring engine evaluates sales velocity, catalog density, competition barriers, and freshness to surface the highest-potential products.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Eye className="h-6 w-6" />
            </div>
            <h3>Spy on Competitor</h3>
            <p>
              Monitor any Etsy shop with daily automated snapshots. Track lifetime sales growth, listing additions, and customer review velocity over time.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Zap className="h-6 w-6" />
            </div>
            <h3>Active Search Streams</h3>
            <p>
              Set continuous automated search streams that scan Etsy for your targeted price, age, and review criteria. Surface emerging winners before others spot them.
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
                Opportunity Feasibility Tool
              </h2>
              <p style={{ color: "var(--text-secondary)", marginBottom: "32px", fontSize: "15px" }}>
                Simulate how SellerSalt evaluates niche competition based on competitor review barriers, shop maturity, and buyer demand.
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
                ESTIMATED OPPORTUNITY SCORE
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

      {/* Pricing Section */}
      <section id="pricing" className="container">
        <div className="section-header">
          <h2>Transparent, High-Yield Pricing</h2>
          <p>Every plan includes real Etsy research access, Opportunity Radar, and daily competitor tracking.</p>
        </div>

        <div className="pricing-grid">
          {/* STARTED */}
          <div className="pricing-card">
            <div>
              <h3>{started?.name ?? "Started"}</h3>
              <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                Ideal for individual sellers and solo researchers.
              </p>
              <div className="pricing-price">
                ${started?.priceUsd ?? 19}
                <span> / month</span>
              </div>
              <div className="pricing-trial-note">3-day trial for $1, cancel anytime</div>

              <ul className="pricing-features">
                <li><Check className="h-4 w-4" /> {started?.maxSearchConfigs ?? 3} Active Search Streams</li>
                <li><Check className="h-4 w-4" /> {started?.maxTrackedShops ?? 5} Tracked Competitor Shops</li>
                <li><Check className="h-4 w-4" /> {started?.maxProspectsPerMonth ?? 200} Prospects per month</li>
                <li><Check className="h-4 w-4" /> Full Opportunity Radar Access</li>
                <li><Check className="h-4 w-4" /> Live Etsy Shop Spy & Sourcing</li>
              </ul>
            </div>

            <Link href="/checkout?plan=STARTED" className="btn btn-secondary" style={{ width: "100%" }}>
              Start $1 Trial
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
              <div className="pricing-trial-note">3-day trial for $1, cancel anytime</div>

              <ul className="pricing-features">
                <li><Check className="h-4 w-4" /> {pro?.maxSearchConfigs ?? 10} Active Search Streams</li>
                <li><Check className="h-4 w-4" /> {pro?.maxTrackedShops ?? 25} Tracked Competitor Shops</li>
                <li><Check className="h-4 w-4" /> {pro?.maxProspectsPerMonth ?? 1000} Prospects per month</li>
                <li><Check className="h-4 w-4" /> Priority Search Queue & Hourly Cadences</li>
                <li><Check className="h-4 w-4" /> Export Unlimited CSV Data</li>
                <li><Check className="h-4 w-4" /> Gaining & Declining Trends Intelligence</li>
              </ul>
            </div>

            <Link href="/checkout?plan=PRO" className="btn btn-accent" style={{ width: "100%" }}>
              Start $1 Trial (Pro)
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
              <div className="pricing-trial-note">3-day trial for $1, cancel anytime</div>

              <ul className="pricing-features">
                <li><Check className="h-4 w-4" /> {agency?.maxSearchConfigs ?? 50} Active Search Streams</li>
                <li><Check className="h-4 w-4" /> {agency?.maxTrackedShops ?? 100} Tracked Competitor Shops</li>
                <li><Check className="h-4 w-4" /> {agency?.maxProspectsPerMonth ?? 5000} Prospects per month</li>
                <li><Check className="h-4 w-4" /> Multi-Seat Team Workspace</li>
                <li><Check className="h-4 w-4" /> Dedicated Search Capacity</li>
              </ul>
            </div>

            <Link href="/checkout?plan=AGENCY" className="btn btn-secondary" style={{ width: "100%" }}>
              Start $1 Trial (Agency)
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="container">
        <div className="section-header">
          <h2>Frequently Asked Questions</h2>
          <p>Everything you need to know about SellerSalt, data accuracy, and trial billing.</p>
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
            <div className="logo-icon" style={{ width: "24px", height: "24px", fontSize: "13px" }}>
              S
            </div>
            SellerSalt
          </div>

          <div style={{ display: "flex", gap: "24px", fontSize: "13px" }}>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
            <Link href="/login">Sign In</Link>
          </div>

          <div style={{ fontSize: "13px" }}>
            &copy; {new Date().getFullYear()} SellerSalt. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
