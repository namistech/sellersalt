import type { Metadata } from "next";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PricingClient } from "./pricing-client";
import { HelpCircle } from "lucide-react";

const SITE_URL = process.env.NEXTAUTH_URL ?? "https://sellersalt.com";

export const metadata: Metadata = {
  title: "Pricing Plans — Etsy Intelligence Platform | SellerSalt",
  description:
    "Explore transparent pricing plans for SellerSalt's Etsy research engine, Opportunity Radar, and competitor tracking.",
  alternates: { canonical: `${SITE_URL}/pricing` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/pricing`,
    title: "Pricing Plans — Etsy Intelligence Platform | SellerSalt",
    description: "Track top-selling Etsy shops and product opportunities with SellerSalt.",
  },
};

const FAQ_ITEMS = [
  {
    q: "How does billing work?",
    a: "Plans are billed monthly (or annually at a discount) at the price shown on this page. Your subscription renews automatically until you cancel.",
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
  {
    q: "What is the Free Explorer plan?",
    a: "The Free Explorer tier lets you perform up to 15 monthly keyword searches, 10 product researches, track 1 competitor shop, and run 3 SEO audits forever at $0.",
  },
  {
    q: "Can I change my plan later?",
    a: "Yes. You can upgrade, downgrade, or switch between monthly and annual billing at any time from your account settings.",
  },
];

export default function PublicPricingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "SellerSalt Etsy Intelligence Platform",
    description: "Etsy market research, Opportunity Radar, and competitor sales velocity tracker.",
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

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12">
        <PricingClient initialTier="PRO" />

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto border-t border-[#E3E6E0] pt-16">
          <div className="text-center mb-10 space-y-2">
            <h2 className="text-2xl font-bold text-[#141B16]">Frequently Asked Questions</h2>
            <p className="text-sm text-[#525B55]">Everything you need to know about SellerSalt subscriptions.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            {FAQ_ITEMS.map((faq, idx) => (
              <div key={idx} className="rounded-xl border border-[#E3E6E0] bg-white p-5 space-y-2 shadow-2xs">
                <h4 className="font-bold text-[#141B16] flex items-start gap-2 text-xs">
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
