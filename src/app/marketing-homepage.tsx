"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "./marketing.css";

interface PackageData {
  key: string;
  name: string;
  priceUsd: number;
  maxConnectors: number;
  maxSearchConfigs: number;
  maxTrackedShops: number;
  maxProspectsPerMonth: number;
}

const FAQS = [
  {
    q: "Do I need my own Etsy API key?",
    a: "No. SellerSalt works completely out-of-the-box. You don't need an Etsy developer key or technical setup.",
  },
  {
    q: "Is the sales data real or estimated?",
    a: "SellerSalt uses verified lifetime sales numbers directly extracted from shop data and updated through automated daily tracking.",
  },
  {
    q: "Can e-commerce agencies use SellerSalt for clients?",
    a: "Yes. The Agency plan supports multi-seat teams and up to 100 concurrently tracked shops for sourcing clients.",
  },
];

export function MarketingHomepage({ packages }: { packages: PackageData[] }) {
  const router = useRouter();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [searchValue, setSearchValue] = useState("");

  const [reviewCount, setReviewCount] = useState(450);
  const [shopAge, setShopAge] = useState(14);
  const [demandLevel, setDemandLevel] = useState<"high" | "medium" | "low">("high");

  useEffect(() => {
    const stored = localStorage.getItem("anadash-theme");
    if (stored === "dark") setTheme("dark");
    else if (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("dark");
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("anadash-theme", next);
  }

  function handleHeroSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchValue.trim()) params.set("url", searchValue.trim());
    router.push(`/signup${params.toString() ? `?${params.toString()}` : ""}`);
  }

  // Same illustrative logic as the original design — a self-contained lead-gen
  // widget, not connected to real shop data (that only exists once a shop is
  // actually looked up inside the app).
  let score = 100;
  score -= Math.min(reviewCount / 10, 40);
  score -= Math.min(shopAge * 1.5, 30);
  if (demandLevel === "high") score += 20;
  if (demandLevel === "low") score -= 20;
  score = Math.max(10, Math.min(99, Math.round(score)));
  const scoreBadge = score >= 70 ? "green" : score >= 45 ? "yellow" : "red";
  const scoreLabel = score >= 70 ? "Easy Opportunity" : score >= 45 ? "Medium Difficulty" : "Highly Competitive";

  const pkg = (key: string) => packages.find((p) => p.key === key);
  const free = pkg("FREE");
  const pro = pkg("PRO");
  const agency = pkg("AGENCY");

  return (
    <div className="sellersalt-marketing" data-theme={theme}>
      <div className="bg-graphic bg-graphic-1" />
      <div className="bg-graphic bg-graphic-2" />
      <div className="bg-graphic bg-graphic-3" />

      <div className="top-offer-bar">
        <span>
          🔥 <strong>LIMITED OFFER:</strong> Get 20% OFF Pro Annual Plans — mention code{" "}
          <code>EXPAND2026</code> when you upgrade
        </span>
        <a href="#pricing" className="top-offer-link">
          See plans →
        </a>
      </div>

      <header>
        <div className="container nav-container">
          <a href="/" className="logo">
            <div className="logo-icon" />
            SellerSalt
          </a>
          <nav aria-label="Main Navigation">
            <ul className="nav-links">
              <li><a href="#features">Features</a></li>
              <li><a href="#comparison">Why SellerSalt</a></li>
              <li><a href="#calculator">Difficulty Tool</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
          </nav>
          <div className="nav-actions">
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle Dark/Light Mode">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            </button>
            <a href="/login" className="btn btn-secondary">Log in</a>
            <a href="/signup" className="btn btn-primary">Start free</a>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="container">
          <div className="hero-tag">
            <span style={{ background: "var(--accent)", color: "#FFF", padding: "2px 8px", borderRadius: 12, fontSize: "0.7rem", fontWeight: 700 }}>
              NEW
            </span>
            eBay Sourcing Intelligence Integration Launching Soon
          </div>

          <h1>Find Winning Etsy Products &amp; Competitors in Seconds</h1>
          <p>No setup. No API key needed. Get verified lifetime sales data, spy on top shop listings, and spot untapped sourcing opportunities.</p>

          <form className="hero-search-box" onSubmit={handleHeroSearch}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Paste Etsy Shop URL or Keyword (e.g., etsy.com/shop/LeatherCrafts)..."
              aria-label="Etsy Shop Search Input"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">Analyze Shop</button>
          </form>

          <div className="hero-mockup">
            <div className="mockup-header">
              <div className="dot" /><div className="dot" /><div className="dot" />
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginLeft: 12, fontWeight: 500 }}>
                sellersalt.com/app/shop-intelligence
              </span>
            </div>
            <div className="mockup-body">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 18 }}>
                <div>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
                    GlobalCraftsStudio <span className="badge badge-green">Low Competition</span>
                  </h3>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                    Primary Region: US/EU Export • 1,840 Active Listings • Daily Auto-Tracked
                  </p>
                </div>
                <button className="btn btn-secondary" style={{ fontSize: "0.8rem", padding: "8px 16px" }}>
                  + Add to Tracker
                </button>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="label">Verified Lifetime Sales</div>
                  <div className="value">94,120</div>
                </div>
                <div className="stat-card">
                  <div className="label">Monthly Rev (Est.)</div>
                  <div className="value" style={{ color: "var(--accent)" }}>$32,850</div>
                </div>
                <div className="stat-card">
                  <div className="label">Avg Item Price</div>
                  <div className="value">$48.50</div>
                </div>
                <div className="stat-card">
                  <div className="label">Category Demand</div>
                  <div className="value"><span className="badge badge-green">94 / 100</span></div>
                </div>
              </div>

              <div className="graph-container">
                <div style={{ position: "absolute", top: 16, left: 16, fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)" }}>
                  Real Daily Sales Graph (Last 30 Days)
                </div>
                <svg viewBox="0 0 500 100" preserveAspectRatio="none" style={{ width: "100%", height: 85 }}>
                  <path d="M0,70 Q60,20 120,50 T240,20 T360,40 T500,10" fill="none" stroke="var(--accent)" strokeWidth="3" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="social-proof">
        <div className="container">
          <div className="proof-grid">
            <div className="proof-item">✓ Verified Lifetime Sales Data</div>
            <div className="proof-item">✓ Zero API Setup Needed</div>
            <div className="proof-item">✓ Daily Tracked Shop Trends</div>
            <div className="proof-item">✓ Trusted by Global Exporters &amp; Agencies</div>
          </div>
        </div>
      </div>

      <section id="features">
        <div className="container">
          <div className="section-header">
            <h2>Designed Specifically for Sourcing Decisions</h2>
            <p>While SEO tools help you rewrite product tags, SellerSalt helps you decide whether to enter a market and how to beat top sellers.</p>
          </div>

          <div className="features-grid">
            <article className="feature-card">
              <div className="feature-icon">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
              </div>
              <h3>Product &amp; Shop Hunting</h3>
              <p>Filter Etsy shops by age, review velocity, price point, and sales volume to discover high-margin niches.</p>
            </article>

            <article className="feature-card">
              <div className="feature-icon">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
              </div>
              <h3>Spy on Competitors</h3>
              <p>Paste any URL for a comprehensive breakdown: top-selling items, extracted listing keywords, and exact sales numbers.</p>
            </article>

            <article className="feature-card">
              <div className="feature-icon">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
              </div>
              <h3>Sales &amp; Listing Tracking</h3>
              <p>Monitor shop performance over time with daily automated checks on revenue growth and catalog additions.</p>
            </article>

            <article className="feature-card">
              <div className="feature-icon">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
              </div>
              <h3>Difficulty Scoring</h3>
              <p>Instant color-coded competition metrics (Green/Yellow/Red) showing buyer demand vs market saturation.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="comparison" className="comparison-section">
        <div className="container">
          <div className="section-header">
            <h2>How SellerSalt Compares</h2>
            <p>Built for e-commerce sourcing and market entry—not basic keyword optimization.</p>
          </div>

          <table className="comp-table">
            <thead>
              <tr>
                <th>Feature / Capability</th>
                <th style={{ color: "var(--accent)" }}>SellerSalt</th>
                <th>Traditional Keyword SEO Tools</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Primary Goal</td>
                <td><strong>Sourcing &amp; Competitor Intelligence</strong></td>
                <td>On-Page Tag &amp; Title Rewriting</td>
              </tr>
              <tr>
                <td>Data Source</td>
                <td><strong>Verified Lifetime Sales &amp; Daily Tracking</strong></td>
                <td>Estimated Search Volume Metrics</td>
              </tr>
              <tr>
                <td>Setup Required</td>
                <td><strong>Zero Setup (No Etsy API Key Needed)</strong></td>
                <td>Requires API Authentication &amp; Key Setup</td>
              </tr>
              <tr>
                <td>Competitor Spying</td>
                <td><strong>Instant Shop Profile &amp; Trend Graph</strong></td>
                <td>Limited Listing Keyword Overlaps</td>
              </tr>
              <tr>
                <td>Cross-Border / Export Focus</td>
                <td><strong>Optimized for Global Sourcing Hubs</strong></td>
                <td>US Domestic Focus Only</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="calculator">
        <div className="container">
          <div className="section-header">
            <h2>Live Competition Difficulty Simulator</h2>
            <p>Test how SellerSalt evaluates market feasibility before investing in new product inventory.</p>
          </div>

          <div className="calc-box">
            <div className="calc-row">
              <div className="calc-field">
                <label htmlFor="reviewCount">Avg Competitor Reviews</label>
                <input
                  type="number"
                  id="reviewCount"
                  value={reviewCount}
                  onChange={(e) => setReviewCount(Number(e.target.value) || 0)}
                />
              </div>
              <div className="calc-field">
                <label htmlFor="shopAge">Avg Shop Age (Months)</label>
                <input
                  type="number"
                  id="shopAge"
                  value={shopAge}
                  onChange={(e) => setShopAge(Number(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="calc-row">
              <div className="calc-field">
                <label htmlFor="demandLevel">Category Buyer Demand</label>
                <select id="demandLevel" value={demandLevel} onChange={(e) => setDemandLevel(e.target.value as any)}>
                  <option value="high">High Buyer Demand</option>
                  <option value="medium">Medium Buyer Demand</option>
                  <option value="low">Low Buyer Demand</option>
                </select>
              </div>
            </div>

            <div style={{ background: "var(--bg-card)", padding: "20px 24px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 600 }}>Calculated Opportunity Score:</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent)" }}>{score} / 100</div>
              </div>
              <div><span className={`badge badge-${scoreBadge}`}>{scoreLabel}</span></div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing">
        <div className="container">
          <div className="section-header">
            <h2>Simple, Predictable Pricing</h2>
            <p>No hidden fees. Choose a plan that fits your sourcing volume.</p>
          </div>

          <div className="pricing-grid">
            <div className="pricing-card">
              <h3>Free Plan</h3>
              <div className="pricing-price">${free?.priceUsd ?? 0} <span>/ mo</span></div>
              <ul className="pricing-features">
                <li>✓ {free?.maxConnectors ?? 1} Active Connector (Etsy)</li>
                <li>✓ {free?.maxSearchConfigs ?? 3} Saved searches</li>
                <li>✓ {free?.maxTrackedShops ?? 5} Tracked shop{(free?.maxTrackedShops ?? 5) === 1 ? "" : "s"}</li>
                <li>✓ {(free?.maxProspectsPerMonth ?? 200).toLocaleString()} Monthly prospect lookups</li>
              </ul>
              <a href="/signup?plan=free" className="btn btn-secondary">Start Free</a>
            </div>

            <div className="pricing-card featured">
              <div className="pricing-badge">Most Popular</div>
              <h3>Pro Plan</h3>
              <div className="pricing-price">${pro?.priceUsd ?? 49} <span>/ mo</span></div>
              <ul className="pricing-features">
                <li>✓ All Connectors (Etsy + eBay Access)</li>
                <li>✓ <strong>{pro?.maxSearchConfigs ?? 20} Saved searches</strong></li>
                <li>✓ <strong>{pro?.maxTrackedShops ?? 50} Tracked shops</strong></li>
                <li>✓ {(pro?.maxProspectsPerMonth ?? 5000).toLocaleString()} Monthly prospect lookups</li>
                <li>✓ Full Competition Difficulty Scoring</li>
              </ul>
              <a href="/signup?plan=pro" className="btn btn-primary">Start Pro Trial</a>
            </div>

            <div className="pricing-card">
              <h3>Agency Plan</h3>
              <div className="pricing-price">${agency?.priceUsd ?? 199} <span>/ mo</span></div>
              <ul className="pricing-features">
                <li>✓ All Connectors + API Access</li>
                <li>✓ <strong>{(agency?.maxSearchConfigs ?? 0) >= 100 ? "Unlimited" : agency?.maxSearchConfigs} Saved searches</strong></li>
                <li>✓ <strong>{agency?.maxTrackedShops ?? 250} Tracked shops</strong></li>
                <li>✓ {(agency?.maxProspectsPerMonth ?? 50000).toLocaleString()}+ Monthly prospect lookups</li>
                <li>✓ Multi-seat team support</li>
              </ul>
              <a
                href="mailto:hello@netdrix.com?subject=SellerSalt%20Agency%20Plan%20Inquiry"
                className="btn btn-secondary"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" style={{ backgroundColor: "transparent" }}>
        <div className="container">
          <div className="section-header">
            <h2>Frequently Asked Questions</h2>
            <p>Answers to common questions about SellerSalt, data accuracy, and sourcing.</p>
          </div>

          <div className="faq-container">
            {FAQS.map((item, i) => (
              <div key={item.q} className={`faq-item ${openFaq === i ? "active" : ""}`}>
                <button className="faq-button" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  {item.q}
                  <span className="faq-icon">▼</span>
                </button>
                <div className="faq-answer">{item.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer>
        <div className="container">
          <div className="footer-grid">
            <div>
              <div className="logo" style={{ marginBottom: 16 }}>
                <div className="logo-icon" /> SellerSalt
              </div>
              <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", maxWidth: 280, lineHeight: 1.5 }}>
                Real-time competitor intelligence and product sourcing platform for Etsy sellers, dropshippers, and global export hubs.
              </p>
            </div>

            <div className="footer-col">
              <h4>Product</h4>
              <ul>
                <li><a href="#features">Shop Intelligence</a></li>
                <li><a href="#calculator">Difficulty Tool</a></li>
                <li><a href="#comparison">Why SellerSalt</a></li>
                <li><a href="#pricing">Pricing</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Affiliates</h4>
              <ul>
                <li><a href="mailto:hello@netdrix.com?subject=Affiliate%20Program">Become a Partner</a></li>
                <li><a href="mailto:hello@netdrix.com?subject=Affiliate%20Program">Commission Rates</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Resources</h4>
              <ul>
                <li><a href="mailto:hello@netdrix.com?subject=Support">Support</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Legal</h4>
              <ul>
                <li><a href="mailto:hello@netdrix.com?subject=Privacy%20Policy%20Request">Privacy Policy</a></li>
                <li><a href="mailto:hello@netdrix.com?subject=Terms%20of%20Service%20Request">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 24, textAlign: "center", fontSize: "0.82rem", color: "var(--text-muted)" }}>
            &copy; {new Date().getFullYear()} SellerSalt. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
