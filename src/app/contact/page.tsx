import type { Metadata } from "next";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { ContactClient } from "./contact-client";
import { getSetting } from "@/lib/app-settings";

import { buildBreadcrumbListSchema } from "@/lib/seo-structured-data";

const SITE_URL = process.env.NEXTAUTH_URL ?? "https://sellersalt.com";

export const metadata: Metadata = {
  title: "Contact & Support | SellerSalt",
  description:
    "Get in touch with the SellerSalt team for questions about ecommerce intelligence, Opportunity Radar, or subscription plans.",
  alternates: { canonical: `${SITE_URL}/contact` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/contact`,
    siteName: "SellerSalt",
    title: "Contact & Support | SellerSalt",
    description:
      "Get in touch with the SellerSalt team for questions about ecommerce intelligence, Opportunity Radar, or subscription plans.",
    images: [
      {
        url: `${SITE_URL}/brand/og-image.png`,
        width: 1200,
        height: 630,
        alt: "SellerSalt Support",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact & Support | SellerSalt",
    description: "Get in touch with the SellerSalt team.",
    images: [`${SITE_URL}/brand/og-image.png`],
  },
};

export default async function ContactPage() {
  const supportEmail = (await getSetting("support_email")) || "support@sellersalt.com";
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      buildBreadcrumbListSchema(
        [
          { name: "Home", url: "/" },
          { name: "Contact & Support", url: "/contact" },
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
      <PublicHeader currentPath="/contact" />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12">
        <ContactClient supportEmail={supportEmail} />
      </main>

      <PublicFooter />
    </div>
  );
}
