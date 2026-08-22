import type { Metadata } from "next";
import Link from "next/link";
import {
  Compass,
  Search,
  Sparkles,
  Layers,
  CheckCircle2,
  ShieldCheck,
  Flame,
  ArrowRight,
  Calculator,
  Lock,
  BarChart3,
  HelpCircle,
} from "lucide-react";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { MarketplaceDisclaimerBox } from "@/components/governance/MarketplaceDisclaimerBox";

import { buildBreadcrumbListSchema } from "@/lib/seo-structured-data";

const SITE_URL = process.env.NEXTAUTH_URL ?? "https://sellersalt.com";

export const metadata: Metadata = {
  title: "How It Works — Ecommerce Intelligence Methodology | SellerSalt",
  description:
    "Discover the evidence-based 5-step methodology behind SellerSalt: Discover, Research, Validate, Plan, and Launch. Zero-fabrication guaranteed.",
  alternates: { canonical: `${SITE_URL}/how-it-works` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/how-it-works`,
    siteName: "SellerSalt",
    title: "How It Works — Ecommerce Intelligence Methodology | SellerSalt",
    description:
      "Learn how SellerSalt transforms observable marketplace signals into deterministic commercial feasibility verdicts.",
    images: [
      {
        url: `${SITE_URL}/brand/og-image.png`,
        width: 1200,
        height: 630,
        alt: "SellerSalt 5-Step Methodology",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "How It Works — Ecommerce Intelligence Methodology | SellerSalt",
    description:
      "Learn how SellerSalt transforms observable marketplace signals into deterministic commercial feasibility verdicts.",
    images: [`${SITE_URL}/brand/og-image.png`],
  },
};

export default function HowItWorksPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      buildBreadcrumbListSchema(
        [
          { name: "Home", url: "/" },
          { name: "How It Works", url: "/how-it-works" },
        ],
        SITE_URL
      ),
    ],
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8] text-[#141B16] font-sans antialiased">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <PublicHeader currentPath="/how-it-works" />

      <main className="flex-1">
        {/* Header Hero */}
        <section className="pt-16 pb-14 border-b border-[#E3E6E0] bg-white">
          <div className="max-w-4xl mx-auto px-6 text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-800 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Scientific & Evidence-Grounded</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-[#141B16]">
              How SellerSalt Works
            </h1>

            <p className="text-base sm:text-lg text-[#525B55] max-w-2xl mx-auto leading-relaxed">
              Our 5-step commercial decision methodology transforms observable marketplace signals into actionable product launch plans.
            </p>
          </div>
        </section>

        {/* The 5-Step Deep Dive */}
        <section className="py-16 md:py-24 max-w-4xl mx-auto px-6 space-y-16">
          {/* Step 1: Discover */}
          <div className="space-y-4 border-l-4 border-emerald-600 pl-6">
            <div className="flex items-center gap-2">
              <Badge variant="neutral" className="text-xs font-bold">Step 1</Badge>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Opportunity Discovery</span>
            </div>
            <h2 className="text-2xl font-bold text-[#141B16]">Discover High-Potential Niches & Gaps</h2>
            <p className="text-sm text-[#525B55] leading-relaxed">
              Using Opportunity Radar 2.0 and public catalog observations, SellerSalt analyzes product clusters to identify niches with rising search momentum, high price stability, and accessible review barriers before they become oversaturated.
            </p>
            <div className="p-4 rounded-xl bg-white border border-[#E3E6E0] text-xs text-[#525B55] space-y-1 font-mono">
              <span className="font-bold text-[#141B16] font-sans block">Observable Signals Evaluated:</span>
              <span>• Review barrier distribution (median reviews of top ranking listings)</span><br />
              <span>• Product attribute saturation vs underrepresented gaps</span><br />
              <span>• Price clustering and distribution stability</span>
            </div>
          </div>

          {/* Step 2: Research */}
          <div className="space-y-4 border-l-4 border-sky-600 pl-6">
            <div className="flex items-center gap-2">
              <Badge variant="neutral" className="text-xs font-bold">Step 2</Badge>
              <span className="text-xs font-bold uppercase tracking-wider text-sky-600">Market Structure</span>
            </div>
            <h2 className="text-2xl font-bold text-[#141B16]">Research Observable Market Signals</h2>
            <p className="text-sm text-[#525B55] leading-relaxed">
              We extract empirical quantiles ($P_{10}, P_{25}, P_{50}, P_{75}, P_{90}$) to understand true price positioning, calculate seller concentration indices (Herfindahl-Hirschman index proxy), and audit keyword cluster prevalence across live listings.
            </p>
            <div className="p-4 rounded-xl bg-white border border-[#E3E6E0] text-xs text-[#525B55] space-y-1 font-mono">
              <span className="font-bold text-[#141B16] font-sans block">Empirical Metrics Captured:</span>
              <span>• $P_{50}$ Median Listing Price & Price Spread</span><br />
              <span>• Dominant Seller Market Share % (Top 3 concentration)</span><br />
              <span>• Keyword frequency & tag synergy patterns</span>
            </div>
          </div>

          {/* Step 3: Validate */}
          <div className="space-y-4 border-l-4 border-amber-600 pl-6">
            <div className="flex items-center gap-2">
              <Badge variant="neutral" className="text-xs font-bold">Step 3</Badge>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Commercial Feasibility</span>
            </div>
            <h2 className="text-2xl font-bold text-[#141B16]">Validate with Deterministic Decision Models</h2>
            <p className="text-sm text-[#525B55] leading-relaxed">
              Instead of giving you arbitrary predictions, the Commercial Decision Engine evaluates 10 readiness dimensions and outputs structured, evidence-backed verdicts: PURSUE, INVESTIGATE, TEST, WAIT, or REJECT.
            </p>
            <div className="p-4 rounded-xl bg-white border border-[#E3E6E0] text-xs text-[#525B55] space-y-1 font-mono">
              <span className="font-bold text-[#141B16] font-sans block">Decision Framework:</span>
              <span>• PURSUE: Strong demand proxy + low barrier + healthy margin</span><br />
              <span>• INVESTIGATE: Promising signals with specific information gaps</span><br />
              <span>• TEST: Mixed signals requiring small-batch validation</span><br />
              <span>• REJECT: Extreme seller saturation or unviable fee structures</span>
            </div>
          </div>

          {/* Step 4: Plan */}
          <div className="space-y-4 border-l-4 border-purple-600 pl-6">
            <div className="flex items-center gap-2">
              <Badge variant="neutral" className="text-xs font-bold">Step 4</Badge>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600">Sourcing & Economics</span>
            </div>
            <h2 className="text-2xl font-bold text-[#141B16]">Plan Sourcing Specs & 3-Tier Economics</h2>
            <p className="text-sm text-[#525B55] leading-relaxed">
              In the Product Opportunity Workspace, you enter your landed manufacturing quotes and target CAC. The Unit Economics Engine calculates financial sensitivity across Conservative, Base, and Optimistic scenarios, while generating a formal supplier RFQ specification.
            </p>
          </div>

          {/* Step 5: Launch */}
          <div className="space-y-4 border-l-4 border-teal-600 pl-6">
            <div className="flex items-center gap-2">
              <Badge variant="neutral" className="text-xs font-bold">Step 5</Badge>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-600">Compliant Execution</span>
            </div>
            <h2 className="text-2xl font-bold text-[#141B16]">Launch with Policy-Sanitized Listing Assets</h2>
            <p className="text-sm text-[#525B55] leading-relaxed">
              Create SEO-optimized listing drafts verified against our Originality Engine (&lt;15% N-gram overlap gate). All drafts require human review before publishing, ensuring full policy compliance across every connected channel.
            </p>
          </div>

          {/* CTA Box */}
          <div className="p-8 rounded-3xl bg-[#0B2B22] text-white text-center space-y-6">
            <h3 className="text-2xl font-bold">Ready to validate your next product idea?</h3>
            <p className="text-sm text-emerald-200/80 max-w-xl mx-auto">
              Start researching live market structures and running commercial validations with a free account.
            </p>
            <Button
              href="/signup"
              variant="primary"
              className="bg-emerald-500 hover:bg-emerald-400 text-[#0B2B22] font-bold text-xs px-8 py-3 rounded-xl"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>

          <MarketplaceDisclaimerBox marketplace="etsy" />
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
