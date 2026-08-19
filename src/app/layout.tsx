import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { getSettings } from "@/lib/app-settings";

const BASE_URL = process.env.NEXTAUTH_URL || process.env.APP_URL || "https://sellersalt.com";
const DEFAULT_TITLE = "SellerSalt — Etsy Listing Studio, SEO Auditing & Market Research";
const DEFAULT_DESCRIPTION =
  "Etsy seller listing optimization and productivity platform. Create approved listing drafts, audit 13-tag SEO taxonomy compliance, synchronize order receipts, and discover marketplace product opportunities.";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings(["seo_default_title", "seo_default_description", "seo_og_image_url", "app_favicon_url"]);

  const title = settings.seo_default_title || DEFAULT_TITLE;
  const description = settings.seo_default_description || DEFAULT_DESCRIPTION;
  const ogImage = settings.seo_og_image_url || `${BASE_URL}/og-image.png`;

  return {
    metadataBase: new URL(BASE_URL),
    title: {
      default: title,
      template: "%s | SellerSalt",
    },
    description,
    keywords: [
      "Etsy SEO tool",
      "Etsy keyword research",
      "Etsy listing studio",
      "Etsy taxonomy audit",
      "Etsy market research",
      "Etsy listing generator",
      "Etsy order sync",
    ],
    authors: [{ name: "SellerSalt" }],
    creator: "SellerSalt",
    publisher: "SellerSalt",
    robots: {
      index: true,
      follow: true,
    },
    icons: {
      icon: settings.app_favicon_url || "/icon.png",
      apple: "/apple-icon.png",
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: BASE_URL,
      siteName: "SellerSalt",
      title,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: "SellerSalt E-Commerce Intelligence",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://sellersalt.com/#organization",
      "name": "SellerSalt",
      "url": "https://sellersalt.com",
      "logo": "https://sellersalt.com/icon.png",
      "description": "Etsy seller listing optimization, SEO taxonomy auditing, and marketplace research platform.",
      "sameAs": ["https://twitter.com/sellersalt"],
    },
    {
      "@type": "WebSite",
      "@id": "https://sellersalt.com/#website",
      "url": "https://sellersalt.com",
      "name": "SellerSalt",
      "publisher": { "@id": "https://sellersalt.com/#organization" },
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://sellersalt.com/#application",
      "name": "SellerSalt Intelligence Platform",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "offers": [
        {
          "@type": "Offer",
          "name": "Free Explorer",
          "price": "0",
          "priceCurrency": "USD",
        },
        {
          "@type": "Offer",
          "name": "Starter",
          "price": "19",
          "priceCurrency": "USD",
        },
        {
          "@type": "Offer",
          "name": "Pro",
          "price": "49",
          "priceCurrency": "USD",
        },
        {
          "@type": "Offer",
          "name": "Agency",
          "price": "199",
          "priceCurrency": "USD",
        },
      ],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
