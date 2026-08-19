import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureDefaultPackages } from "@/lib/plan-limits";
import { MarketingHomepage } from "./marketing-homepage";

const SITE_URL = process.env.NEXTAUTH_URL ?? "https://sellersalt.com";

export const metadata: Metadata = {
  title: "SellerSalt — The Essential of eCommerce Intelligence",
  description:
    "SellerSalt helps Etsy sellers, brands, and agencies discover winning products, analyze competitor sales velocity, and spot high-demand niches using verified marketplace sales data.",
  keywords:
    "Etsy product research, Etsy market research tool, Opportunity Radar, Etsy sales tracker, Etsy market analysis, ecommerce research, product sourcing, shop intelligence",
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: "SellerSalt — The Essential of eCommerce Intelligence",
    description:
      "Turn verified Etsy sales data and competitor velocity into profitable product decisions with the Opportunity Radar.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SellerSalt — The Essential of eCommerce Intelligence",
    description: "Verified sales data, Opportunity Radar, and competitor intelligence for Etsy sellers.",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "SellerSalt",
      operatingSystem: "Web-based",
      applicationCategory: "BusinessApplication",
      offers: { "@type": "AggregateOffer", priceCurrency: "USD", lowPrice: "19", highPrice: "199", offerCount: "3" },
      description: "Ecommerce research and competitor intelligence platform for Etsy sellers, dropshippers, and sourcing agencies.",
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Do I need my own Etsy API key to use SellerSalt?",
          acceptedAnswer: { "@type": "Answer", text: "No. SellerSalt works out of the box with our platform research engine. You do not need to apply for or configure an Etsy developer key." },
        },
        {
          "@type": "Question",
          name: "Is the sales data on SellerSalt real or estimated?",
          acceptedAnswer: { "@type": "Answer", text: "SellerSalt extracts verified lifetime transaction numbers directly from marketplace shop data and tracks point-in-time snapshots daily, providing accurate velocity metrics." },
        },
        {
          "@type": "Question",
          name: "What is the Opportunity Radar?",
          acceptedAnswer: { "@type": "Answer", text: "Opportunity Radar is SellerSalt's decision layer that evaluates sales velocity, catalog density, competition barriers, and freshness to surface high-potential products before they become crowded." },
        },
      ],
    },
  ],
};

export default async function RootPage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  }

  await ensureDefaultPackages();
  const packages = await prisma.package.findMany({
    where: { key: { in: ["STARTED", "PRO", "AGENCY"] }, isActive: true },
    select: {
      key: true,
      name: true,
      priceUsd: true,
      maxConnectors: true,
      maxSearchConfigs: true,
      maxTrackedShops: true,
      maxProspectsPerMonth: true,
      trialDays: true,
      trialPriceUsd: true,
    },
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <MarketingHomepage packages={packages} />
    </>
  );
}
