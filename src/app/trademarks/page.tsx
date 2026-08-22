import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { ShieldCheck, Info } from "lucide-react";

import { buildBreadcrumbListSchema } from "@/lib/seo-structured-data";

const SITE_URL = process.env.NEXTAUTH_URL ?? "https://sellersalt.com";

export const metadata: Metadata = {
  title: "Trademark Disclosures | SellerSalt",
  description:
    "Trademark and intellectual property disclosures for SellerSalt and referenced third-party platforms and marketplaces.",
  alternates: { canonical: `${SITE_URL}/trademarks` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/trademarks`,
    siteName: "SellerSalt",
    title: "Trademark Disclosures | SellerSalt",
    description:
      "Trademark and intellectual property disclosures for SellerSalt and referenced third-party platforms and marketplaces.",
    images: [
      {
        url: `${SITE_URL}/brand/og-image.png`,
        width: 1200,
        height: 630,
        alt: "SellerSalt Trademark Disclosures",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Trademark Disclosures | SellerSalt",
    description: "Third-party intellectual property and brand notices for SellerSalt.",
    images: [`${SITE_URL}/brand/og-image.png`],
  },
};

export default function TrademarksPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      buildBreadcrumbListSchema(
        [
          { name: "Home", url: "/" },
          { name: "Trademark Disclosures", url: "/trademarks" },
        ],
        SITE_URL
      ),
    ],
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8] text-[#141B16]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <PublicHeader currentPath="/trademarks" />

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
        <div className="space-y-8">
          {/* Header */}
          <div className="border-b border-[#E3E6E0] pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-800 text-xs font-bold mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Brand & Legal Disclosures</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#141B16]">
              Trademark Disclosures
            </h1>
            <p className="mt-2 text-sm text-[#7C847E]">
              Last updated: August 21, 2026 · Third-party intellectual property and brand notices
            </p>
          </div>

          {/* Main Disclosure Block */}
          <div className="space-y-8 text-sm leading-relaxed text-[#525B55]">
            <section className="space-y-4">
              <h2 className="text-lg font-bold text-[#141B16]">
                General Trademark Disclosure
              </h2>
              <div className="p-6 rounded-2xl bg-white border border-[#E3E6E0] space-y-4 text-sm leading-relaxed text-[#343D36] shadow-xs">
                <p>
                  Etsy&reg; is a registered trademark of Etsy, Inc. Amazon, Amazon.com, and the Amazon logo are trademarks of Amazon.com, Inc. or its affiliates. eBay&reg; is a registered trademark of eBay Inc. Walmart&reg; is a registered trademark of Walmart Inc. TikTok and TikTok Shop are trademarks of their respective owner. Newegg&reg; is a registered trademark of Newegg Inc. Shopify&reg; is a registered trademark of Shopify Inc. WooCommerce&reg; is a registered trademark of Automattic Inc. QuickBooks&reg; is a registered trademark of Intuit Inc. Slack&reg; is a registered trademark of Slack Technologies, LLC. Google&reg; is a registered trademark of Google LLC.
                </p>
                <p>
                  SellerSalt is an independent, third-party software platform operated by Netdrix Cloud Services (United Arab Emirates), part of the Netdrix Digital group. SellerSalt is not affiliated with, endorsed by, sponsored by, or officially connected with any of the marketplaces, platforms, or services named above or their respective parent or affiliate companies. All product and company names are trademarks&trade; or registered&reg; trademarks of their respective holders. Use of these names, trademarks, and brands does not imply endorsement.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-bold text-[#141B16]">
                Platform Integrations &amp; API Usage
              </h2>
              <p>
                Where SellerSalt connects to third-party marketplaces, payment processors, or productivity platforms, it does so exclusively through official, authorized developer programs and APIs:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm">
                <li>
                  <strong>Etsy:</strong> Etsy is a trademark of Etsy, Inc. SellerSalt integrates with Etsy through its official developer API for authenticated seller store operations and is not endorsed by or affiliated with Etsy, Inc.
                </li>
                <li>
                  <strong>Shopify:</strong> Shopify is a trademark of Shopify Inc. SellerSalt integrates with Shopify through its official API and is not endorsed by or affiliated with Shopify Inc.
                </li>
                <li>
                  <strong>WooCommerce:</strong> WooCommerce is a trademark of Automattic Inc. SellerSalt connects to WooCommerce stores via authorized REST API keys and is not endorsed by Automattic Inc.
                </li>
                <li>
                  <strong>QuickBooks:</strong> QuickBooks is a trademark of Intuit Inc. Accounting synchronization uses official Intuit developer endpoints.
                </li>
                <li>
                  <strong>Slack &amp; Zapier:</strong> Slack is a trademark of Slack Technologies, LLC / Salesforce, Inc. Zapier is a trademark of Zapier, Inc. Integration is facilitated through standard webhooks and official OAuth applications.
                </li>
                <li>
                  <strong>Google:</strong> Google is a trademark of Google LLC. Search-volume observations utilize official Google Keyword Planner APIs.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">
                Permitted &amp; Descriptive Nominative Use
              </h2>
              <p>
                All references to third-party marketplaces, platforms, and products on this website and within the SellerSalt application are made strictly under nominative fair use for the purpose of identifying source compatibility and data origins. SellerSalt claims no ownership of any third-party trademarks.
              </p>
            </section>

            <section className="space-y-3 border-t border-[#E3E6E0] pt-6">
              <h2 className="text-lg font-bold text-[#141B16]">Questions or Inquiries</h2>
              <p>
                If you have questions concerning trademark usage, intellectual property, or integration partnerships, please reach out to our legal and support team:
              </p>
              <div className="rounded-xl bg-white p-4 border border-[#E3E6E0] text-xs space-y-1.5">
                <div><strong>Email:</strong> <a href="mailto:support@sellersalt.com" className="text-emerald-700 hover:underline">support@sellersalt.com</a></div>
                <div><strong>Operator:</strong> Netdrix Cloud Services (UAE), operating as Netdrix Digital</div>
                <div><strong>UK Affiliate:</strong> ErgoForge Global Limited</div>
                <div><strong>Support Hours:</strong> Monday &ndash; Friday 9:00 AM &ndash; 6:00 PM</div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
