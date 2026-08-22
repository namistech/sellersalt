import { Metadata } from "next";
import React from "react";
import {
  ShieldCheck,
  Lock,
  Database,
  Globe,
  Clock,
  EyeOff,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Server,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

import { buildBreadcrumbListSchema } from "@/lib/seo-structured-data";

const SITE_URL = process.env.NEXTAUTH_URL ?? "https://sellersalt.com";

export const metadata: Metadata = {
  title: "Trust Center & Data Governance | SellerSalt",
  description: "How SellerSalt acquires, protects, classifies, and retains ecommerce intelligence data.",
  alternates: { canonical: `${SITE_URL}/trust` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/trust`,
    siteName: "SellerSalt",
    title: "Trust Center & Data Governance | SellerSalt",
    description: "How SellerSalt acquires, protects, classifies, and retains ecommerce intelligence data.",
    images: [
      {
        url: `${SITE_URL}/brand/og-image.png`,
        width: 1200,
        height: 630,
        alt: "SellerSalt Trust Center",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Trust Center & Data Governance | SellerSalt",
    description: "How SellerSalt acquires, protects, classifies, and retains ecommerce intelligence data.",
    images: [`${SITE_URL}/brand/og-image.png`],
  },
};

export default function TrustCenterPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      buildBreadcrumbListSchema(
        [
          { name: "Home", url: "/" },
          { name: "Trust Center", url: "/trust" },
        ],
        SITE_URL
      ),
    ],
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {/* Hero */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Platform Trust & Transparency
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
          SellerSalt Trust Center
        </h1>
        <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
          SellerSalt is an independent ecommerce intelligence platform built on transparent evidence, zero-fabrication data ethics, strict multi-tenant isolation, and explicit marketplace compliance boundaries.
        </p>
      </div>

      {/* Core Principles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="p-6 border rounded-2xl bg-card space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <EyeOff className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-foreground">Zero-Fabrication Policy</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            When a metric cannot be legitimately observed (such as private competitor store revenue or unlicensed search volumes), SellerSalt marks it explicitly as <strong>UNAVAILABLE</strong>. We never substitute synthetic numbers or plausible-looking guesses.
          </p>
        </Card>

        <Card className="p-6 border rounded-2xl bg-card space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600">
              <Layers className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-foreground">Multi-Source Separation</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            We strictly separate public web research, authorized official marketplace APIs, connected merchant store OAuth data, and historical market memory. Each source operates under its own explicit data governance rules.
          </p>
        </Card>

        <Card className="p-6 border rounded-2xl bg-card space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-foreground">Strict Tenant Isolation</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Connected store credentials, synced orders, and proprietary listing drafts are hard-scoped to the authorizing organization. OAuth tokens are encrypted at rest with AES-256-GCM and deleted immediately upon disconnection.
          </p>
        </Card>
      </div>

      {/* Section 1: Signal Classification Framework */}
      <Card className="p-6 md:p-8 border rounded-2xl bg-card space-y-6 shadow-xs">
        <div className="space-y-1">
          <Badge variant="neutral" className="text-label-sm font-bold uppercase">
            Data Methodology
          </Badge>
          <h2 className="text-xl font-black text-foreground">Signal Classification Framework</h2>
          <p className="text-xs text-muted-foreground">
            Every metric presented across SellerSalt intelligence surfaces is classified under one of five explicit categories:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl border bg-muted/15 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground">1. OBSERVED</span>
              <Badge variant="success" className="text-label-sm">Empirical</Badge>
            </div>
            <p className="text-muted-foreground text-meta">
              Directly captured from live public catalog listings or official API responses (e.g. Price, Review Count, Star Rating, Title, Category).
            </p>
          </div>

          <div className="p-4 rounded-xl border bg-muted/15 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground">2. DERIVED</span>
              <Badge variant="info" className="text-label-sm">Calculated</Badge>
            </div>
            <p className="text-muted-foreground text-meta">
              Deterministically computed from verified observations without synthetic modeling (e.g. Median Price P50, Attribute Prevalence %, Price Spread).
            </p>
          </div>

          <div className="p-4 rounded-xl border bg-muted/15 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground">3. ESTIMATED</span>
              <Badge variant="warning" className="text-label-sm">Statistical</Badge>
            </div>
            <p className="text-muted-foreground text-meta">
              Statistical algorithmic models with explicit confidence ratings (e.g. Opportunity Score 3.0, Launch Readiness Index, Market Momentum).
            </p>
          </div>

          <div className="p-4 rounded-xl border bg-muted/15 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground">4. USER_DERIVED</span>
              <Badge variant="neutral" className="text-label-sm">Merchant Grounded</Badge>
            </div>
            <p className="text-muted-foreground text-meta">
              Calculated exclusively from user-entered landed manufacturing costs, packaging quotes, and target advertising CAC in the workspace.
            </p>
          </div>

          <div className="p-4 rounded-xl border bg-muted/15 space-y-2 sm:col-span-2 lg:col-span-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground">5. UNAVAILABLE</span>
              <Badge variant="danger" className="text-label-sm">Zero-Fabrication</Badge>
            </div>
            <p className="text-muted-foreground text-meta">
              Private or unlicensed signals (such as competitor store revenue or hidden search volume) are explicitly labeled unavailable with transparent rationale.
            </p>
          </div>
        </div>
      </Card>

      {/* Section 2: Marketplace Governance & API Boundaries */}
      <Card className="p-6 md:p-8 border rounded-2xl bg-card space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <Badge variant="neutral" className="text-label-sm font-bold uppercase">
              Marketplace Compliance
            </Badge>
            <h2 className="text-xl font-black text-foreground">Marketplace Data Boundaries & Anti-Circumvention</h2>
            <p className="text-xs text-muted-foreground">
              How SellerSalt interacts with official platform APIs and public web catalogs.
            </p>
          </div>

          <Link href="/marketplaces/governance">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
              Inspect Live Governance Matrix <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>

        <div className="space-y-3 text-xs leading-relaxed text-muted-foreground">
          <p>
            • <strong>No API Bypass via Fallback:</strong> If an official marketplace API is rate-limited, unauthorized, or requires commercial licensing, SellerSalt does <em>not</em> automatically attempt evasive scraping fallback unless public catalog research is independently permitted by policy.
          </p>
          <p>
            • <strong>No Private Dashboard Scraping:</strong> Accessing authenticated seller portals (e.g. Amazon Seller Central, Etsy Shop Manager) is strictly hard-gated and blocked across all crawlers.
          </p>
          <p>
            • <strong>Least-Privilege Scopes:</strong> OAuth connections request only necessary read/write scopes (e.g., Etsy <code>listings_w listings_r shops_r transactions_r</code>).
          </p>
          <p>
            • <strong>Mandatory Disclaimers:</strong> Required trademark notices are presented across all research reports and public interfaces without claiming unconfirmed partnerships.
          </p>
        </div>
      </Card>

      {/* Section 3: Data Retention & Security */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card className="p-6 border rounded-2xl bg-card space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <Clock className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-foreground">Bounded Data Retention</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Public research snapshots are automatically pruned based on customer subscription plan lookback limits (maximum 30 days on Agency tier). Historical observation memory stores anonymized statistical aggregates with SHA-256 fingerprints.
          </p>
        </Card>

        <Card className="p-6 border rounded-2xl bg-card space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600">
              <Server className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-foreground">Security & SSRF Protections</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            All outbound network requests are validated against domain allowlists and protected against Server-Side Request Forgery (SSRF). Internal IP ranges (127.0.0.1, 10.0.0.0/8, 169.254.169.254) are unconditionally blocked.
          </p>
        </Card>
      </div>
    </div>
  );
}
