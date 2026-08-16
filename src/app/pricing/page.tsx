import type { Metadata } from "next";
import Link from "next/link";
import { Check, ShieldCheck, Zap, Sparkles, ArrowRight, HelpCircle } from "lucide-react";
import { prisma } from "@/lib/db";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { Button, Card, Badge, Heading, Text } from "@/components/ui";

const SITE_URL = process.env.NEXTAUTH_URL ?? "https://sellersalt.com";

export const metadata: Metadata = {
  title: "Pricing Plans & $1 Trial — Etsy Intelligence Platform | SellerSalt",
  description:
    "Explore transparent pricing plans for SellerSalt's Etsy research engine, Opportunity Radar, and competitor tracking. Start with a 3-day trial for $1.00.",
  alternates: { canonical: `${SITE_URL}/pricing` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/pricing`,
    title: "Pricing Plans & $1 Trial — Etsy Intelligence Platform | SellerSalt",
    description: "Start tracking top-selling Etsy shops and product opportunities for $1.",
  },
};

const PLAN_HIGHLIGHTS: Record<string, string[]> = {
  STARTED: [
    "3 Active Keyword Search Streams",
    "Up to 200 Monthly Product Discoveries",
    "Track 5 Competitor Shops",
    "Full Opportunity Radar Access",
    "Category & Keyword Research",
    "Workspace Planner Access",
    "CSV Data Export",
  ],
  PRO: [
    "10 Active Keyword Search Streams",
    "Up to 1,000 Monthly Product Discoveries",
    "Track 25 Competitor Shops",
    "Daily Automated Opportunity Scans",
    "Strategic Competition Verdicts",
    "Keyword & Tag Cluster Mining",
    "Revenue & Profit Intelligence",
    "Priority Search Queue & Support",
  ],
  AGENCY: [
    "50 Active Keyword Search Streams",
    "Up to 5,000 Monthly Product Discoveries",
    "Track 100 Competitor Shops",
    "Multi-Seat Team Workspace Access",
    "Hourly Opportunity Tracking Cadence",
    "Dedicated Scraper Capacity",
    "Full Revenue & Fee Audit Engine",
    "1-on-1 Onboarding Strategy Call",
  ],
};

const FAQ_ITEMS = [
  {
    q: "How does the 3-day trial work?",
    a: "You can test all Pro features for 3 days for just $1.00 USD. If you decide to keep your subscription, it will automatically transition to the standard monthly rate.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes! You can cancel your subscription with one click directly in your workspace Billing settings at any time without penalty.",
  },
  {
    q: "Do I need to connect my own Etsy shop to use SellerSalt?",
    a: "No. SellerSalt provides platform-wide Etsy market intelligence and product research without requiring you to link your shop. Connecting your shop is optional to unlock internal store analytics.",
  },
  {
    q: "Which payment methods are supported?",
    a: "We accept all major credit and debit cards through Stripe, as well as PayPal.",
  },
];

export default async function PublicPricingPage() {
  const packages = await prisma.package.findMany({
    where: { isCustom: false, isActive: true },
    orderBy: { priceUsd: "asc" },
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "SellerSalt Etsy Intelligence Platform",
    description: "Etsy market research, Opportunity Radar, and competitor sales velocity tracker.",
    offers: packages.map((p) => ({
      "@type": "Offer",
      name: p.name,
      price: p.priceUsd,
      priceCurrency: "USD",
      url: `${SITE_URL}/checkout?plan=${p.key}`,
    })),
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8] text-[#141B16]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <PublicHeader currentPath="/pricing" />

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-16">
        {/* Page Hero */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <Badge variant="success" className="mx-auto">
            <Sparkles className="h-3.5 w-3.5 mr-1.5 inline text-[#FFB020]" /> Transparent Plans · Risk-Free Trial
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#141B16]">
            Find winning Etsy products with verified sales intelligence.
          </h1>
          <p className="text-base sm:text-lg text-[#525B55]">
            Start with our 3-day full access trial for $1.00 USD. Scale or cancel anytime.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-20">
          {packages.map((pkg) => {
            const isPopular = pkg.key === "PRO";
            const highlights = PLAN_HIGHLIGHTS[pkg.key] ?? [
              `${pkg.maxSearchConfigs} Search Streams`,
              `Track ${pkg.maxTrackedShops} Competitor Shops`,
              `${pkg.maxProspectsPerMonth} Monthly Prospects`,
            ];

            return (
              <div
                key={pkg.id}
                className={`relative flex flex-col justify-between rounded-xl bg-white p-8 border transition ${
                  isPopular
                    ? "border-[#0E8F5D] ring-2 ring-[#0E8F5D]/20 shadow-lg scale-105 z-10"
                    : "border-[#E3E6E0] shadow-xs hover:border-[#C7CCC4]"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#0E8F5D] px-3.5 py-0.5 text-xs font-bold text-white shadow-xs">
                    Most Popular
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-[#141B16]">{pkg.name}</h3>
                    <p className="mt-1 text-xs text-[#7C847E]">
                      {pkg.key === "FREE"
                        ? "For new Etsy sellers starting out"
                        : pkg.key === "PRO"
                        ? "For growing brands and top product researchers"
                        : "For agencies and high-volume sellers"}
                    </p>
                  </div>

                  <div className="border-b border-[#EDEFEA] pb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-[#141B16]">${pkg.priceUsd}</span>
                      <span className="text-sm font-semibold text-[#7C847E]">/month</span>
                    </div>
                    {pkg.trialDays && pkg.trialPriceUsd !== null && (
                      <div className="mt-2 text-xs font-semibold text-[#0E8F5D] flex items-center gap-1">
                        <Zap className="h-3.5 w-3.5 text-[#FFB020]" />
                        {pkg.trialDays}-day trial for ${pkg.trialPriceUsd.toFixed(2)}
                      </div>
                    )}
                  </div>

                  <ul className="space-y-3 text-xs text-[#525B55]">
                    {highlights.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-4 w-4 shrink-0 text-[#0E8F5D]" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-6 border-t border-[#EDEFEA]">
                  <Link href={`/checkout?plan=${pkg.key}`} className="block">
                    <Button
                      variant="primary"
                      fullWidth
                      className={`!py-3 text-sm font-bold ${
                        isPopular
                          ? "bg-[#0E8F5D] hover:bg-[#0C7A52] text-white"
                          : "bg-[#141B16] hover:bg-[#141B16]/90 text-white"
                      }`}
                    >
                      {pkg.trialDays ? `Start $1.00 Trial` : `Get Started`}
                      <ArrowRight className="h-4 w-4 ml-1.5 inline" />
                    </Button>
                  </Link>
                  <p className="mt-2 text-center text-[11px] text-[#7C847E]">
                    Instant access · Secure SSL checkout
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto border-t border-[#E3E6E0] pt-16">
          <div className="text-center mb-10 space-y-2">
            <h2 className="text-2xl font-bold text-[#141B16]">Frequently Asked Questions</h2>
            <p className="text-sm text-[#525B55]">Everything you need to know about SellerSalt subscriptions.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            {FAQ_ITEMS.map((faq, idx) => (
              <div key={idx} className="rounded-lg border border-[#E3E6E0] bg-white p-5 space-y-2">
                <h4 className="font-bold text-[#141B16] flex items-start gap-2">
                  <HelpCircle className="h-4 w-4 text-[#0E8F5D] shrink-0 mt-0.5" />
                  {faq.q}
                </h4>
                <p className="text-xs leading-relaxed text-[#525B55] pl-6">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
