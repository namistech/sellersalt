import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureDefaultPackages } from "@/lib/plan-limits";
import { MarketingHomepage } from "./marketing-homepage";

import {
  buildWebSiteSchema,
  buildFaqPageSchema,
  buildSoftwareApplicationSchema,
} from "@/lib/seo-structured-data";

const SITE_URL = process.env.NEXTAUTH_URL ?? "https://sellersalt.com";

export const metadata: Metadata = {
  title: "SellerSalt — Know What to Sell — and Prove It",
  description:
    "SellerSalt helps ecommerce merchants discover opportunities, research observable markets, validate product ideas, and build evidence-grounded launch plans. Know What to Sell Before You Spend Money.",
  keywords:
    "ecommerce intelligence, product research, market opportunity radar, product validation, unit economics modeling, ecommerce product sourcing, commercial decision software, Know What to Sell Before You Spend Money",
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "SellerSalt",
    title: "SellerSalt — Know What to Sell — and Prove It",
    description:
      "SellerSalt helps ecommerce merchants discover opportunities, research observable markets, validate product ideas, and build evidence-grounded launch plans. Know What to Sell Before You Spend Money.",
    images: [
      {
        url: `${SITE_URL}/brand/og-image.png`,
        width: 1200,
        height: 630,
        alt: "SellerSalt — Know What to Sell — and Prove It",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SellerSalt — Know What to Sell — and Prove It",
    description:
      "SellerSalt helps ecommerce merchants discover opportunities, research observable markets, validate product ideas, and build evidence-grounded launch plans. Know What to Sell Before You Spend Money.",
    images: [`${SITE_URL}/brand/og-image.png`],
  },
};

const HOMEPAGE_FAQS = [
  {
    q: "What is SellerSalt?",
    a: "SellerSalt is the evidence-based ecommerce intelligence platform for sellers, agencies, and teams building real ecommerce businesses. It helps you research markets, discover product opportunities, audit listings, and synchronize your own connected marketplace data.",
  },
  {
    q: "How does SellerSalt acquire marketplace data?",
    a: "SellerSalt uses permitted, licensed, and transparent data sources along with official marketplace APIs for your own connected shops. We strictly follow marketplace policies and never use unauthorized extraction or server-side workarounds.",
  },
  {
    q: "Does SellerSalt invent or guess missing data?",
    a: "No. Under our Zero-Fabrication Contract, every metric is tagged Observed, Derived, Estimated, User-derived, or Unavailable. Unobservable metrics remain strictly null and are transparently labeled as Unavailable.",
  },
  {
    q: "How does the AI Assistant and MCP integration work?",
    a: "You can connect Claude, Gemini, or another AI agent via MCP to operate SellerSalt on your behalf, alongside integrations like Zapier, Slack, and QuickBooks. The AI assistant operates strictly within your authorized permissions, while the core research and scoring engine remains deterministic and evidence-based.",
  },
  {
    q: "Do I need to connect my own store to perform market research?",
    a: "No. All market research, keyword exploration, and product discovery features work immediately without connecting a store. Connecting your store is only required when managing your own listings or viewing your own store analytics.",
  },
  {
    q: "Is SellerSalt affiliated with any marketplace?",
    a: "No. SellerSalt is an independent software platform operated by Netdrix Cloud Services. All marketplace names and trademarks are the property of their respective holders and are used solely for source identification and descriptive purposes.",
  },
];

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

  const homepageStructuredData = {
    "@context": "https://schema.org",
    "@graph": [
      buildWebSiteSchema(SITE_URL),
      buildSoftwareApplicationSchema(
        SITE_URL,
        packages.map((p) => ({
          name: p.name,
          price: p.priceUsd,
          priceCurrency: "USD",
        }))
      ),
      buildFaqPageSchema(HOMEPAGE_FAQS),
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageStructuredData) }}
      />
      <MarketingHomepage packages={packages} />
    </>
  );
}
