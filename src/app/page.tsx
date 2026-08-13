import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureDefaultPackages } from "@/lib/plan-limits";
import { MarketingHomepage } from "./marketing-homepage";

// Driven by NEXTAUTH_URL rather than hardcoded, so a future domain change is
// a one-line env var update, not a code hunt across meta tags.
const SITE_URL = process.env.NEXTAUTH_URL ?? "https://sellersalt.com";

export const metadata: Metadata = {
  title: "SellerSalt — Real-Time Etsy Competitor Intelligence & Product Sourcing Tool",
  description:
    "SellerSalt helps global Etsy sellers, dropshippers, and e-commerce exporters find winning products using real lifetime sales data. Zero setup, no Etsy API key required.",
  keywords:
    "Etsy product research, Etsy competitor spy tool, Etsy market analysis, dropshipping product finder, Etsy sales tracker, e-commerce sourcing Pakistan US EU",
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: "SellerSalt — Etsy Competitor Intelligence & Sourcing",
    description:
      "Uncover verified Etsy shop sales, daily listing trends, and low-competition product niches. No API key required.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SellerSalt — Etsy Sourcing Intelligence",
    description: "Real sales data for Etsy sellers and exporters. Track shops daily and spot winning niches.",
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
      offers: { "@type": "AggregateOffer", priceCurrency: "USD", lowPrice: "0", highPrice: "199", offerCount: "3" },
      description: "Product-hunting and competitor-intelligence SaaS platform for Etsy sellers, dropshippers, and sourcing agencies.",
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Do I need my own Etsy API key to use SellerSalt?",
          acceptedAnswer: { "@type": "Answer", text: "No. SellerSalt works out of the box. You do not need to apply for or configure your own Etsy API key." },
        },
        {
          "@type": "Question",
          name: "Is the sales data on SellerSalt real or estimated?",
          acceptedAnswer: { "@type": "Answer", text: "SellerSalt provides verified lifetime sales data directly from Etsy shop sources and daily automated tracking, avoiding speculative keyword estimation algorithms." },
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
    where: { key: { in: ["FREE", "PRO", "AGENCY"] } },
    select: {
      key: true,
      name: true,
      priceUsd: true,
      maxConnectors: true,
      maxSearchConfigs: true,
      maxTrackedShops: true,
      maxProspectsPerMonth: true,
    },
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <MarketingHomepage packages={packages} />
    </>
  );
}
