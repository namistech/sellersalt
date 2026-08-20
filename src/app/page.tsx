import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureDefaultPackages } from "@/lib/plan-limits";
import { MarketingHomepage } from "./marketing-homepage";

const SITE_URL = process.env.NEXTAUTH_URL ?? "https://sellersalt.com";

export const metadata: Metadata = {
  title: "SellerSalt — Know What to Sell Before You Spend Money",
  description:
    "SellerSalt helps ecommerce merchants discover opportunities, research observable markets, validate product ideas, and build evidence-grounded launch plans.",
  keywords:
    "ecommerce intelligence, product research, market opportunity radar, product validation, unit economics modeling, ecommerce product sourcing, commercial decision software",
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: "SellerSalt — Know What to Sell Before You Spend Money",
    description:
      "Turn observable marketplace signals into evidence-based product decisions with SellerSalt.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SellerSalt — Know What to Sell Before You Spend Money",
    description:
      "Evidence-based ecommerce product research, commercial validation, and sourcing intelligence.",
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
      offers: { "@type": "AggregateOffer", priceCurrency: "USD", lowPrice: "0", highPrice: "199", offerCount: "4" },
      description: "Evidence-based ecommerce intelligence and product validation platform for independent merchants, brands, and agencies.",
    },
    {
      "@type": "Organization",
      name: "SellerSalt",
      url: SITE_URL,
      logo: `${SITE_URL}/brand/icon-mark.png`,
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is SellerSalt?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "SellerSalt is an evidence-based ecommerce intelligence and decision-support platform that helps merchants discover opportunities, research markets, validate commercial feasibility, and build launch plans before investing capital.",
          },
        },
        {
          "@type": "Question",
          name: "How does SellerSalt handle marketplace data?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "SellerSalt separates observable listing signals (prices, review counts, star ratings) from derived calculations and user-supplied costs. It adheres to a strict Zero-Fabrication Contract, never inventing synthetic search volumes or competitor revenues.",
          },
        },
        {
          "@type": "Question",
          name: "What is the 5-step workflow in SellerSalt?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The SellerSalt workflow consists of Discover (spotting opportunities), Research (observing market structures), Validate (running feasibility models), Plan (sourcing and unit economics), and Launch (optimized listing drafts and execution roadmaps).",
          },
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
