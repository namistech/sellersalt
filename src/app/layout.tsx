import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { getSettings } from "@/lib/app-settings";
import {
  extractMetaToken,
  parseCustomMetaTags,
  buildOrganizationSchema,
  buildSoftwareApplicationSchema,
} from "@/lib/seo-structured-data";

const BASE_URL = process.env.NEXTAUTH_URL || process.env.APP_URL || "https://sellersalt.com";
const DEFAULT_TITLE = "SellerSalt — Know What to Sell — and Prove It";
const DEFAULT_DESCRIPTION =
  "Evidence-based ecommerce intelligence and product validation platform for merchants, brands, and agencies. Discover opportunities, research markets, validate commercial feasibility, and build launch plans.";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings([
    "seo_default_title",
    "seo_default_description",
    "seo_canonical_url",
    "seo_og_image_url",
    "app_favicon_url",
    "seo_google_site_verification",
    "seo_bing_site_verification",
    "seo_meta_domain_verification",
    "seo_pinterest_site_verification",
    "seo_custom_meta_tags",
  ]);

  const siteBase = settings.seo_canonical_url || BASE_URL;
  const title = settings.seo_default_title || DEFAULT_TITLE;
  const description = settings.seo_default_description || DEFAULT_DESCRIPTION;
  const ogImage = settings.seo_og_image_url || `${siteBase}/brand/og-image.png`;

  // Site verification tokens
  const googleToken = extractMetaToken(settings.seo_google_site_verification);
  const bingToken = extractMetaToken(settings.seo_bing_site_verification);
  const metaToken = extractMetaToken(settings.seo_meta_domain_verification);
  const pinterestToken = extractMetaToken(settings.seo_pinterest_site_verification);
  const customTags = parseCustomMetaTags(settings.seo_custom_meta_tags);

  const otherVerification: Record<string, string | string[]> = {
    ...customTags,
  };
  if (bingToken) otherVerification["msvalidate.01"] = bingToken;
  if (metaToken) otherVerification["facebook-domain-verification"] = metaToken;
  if (pinterestToken) otherVerification["p:domain_verify"] = pinterestToken;

  return {
    metadataBase: new URL(siteBase),
    title: {
      default: title,
      template: "%s | SellerSalt",
    },
    description,
    keywords: [
      "ecommerce intelligence",
      "product opportunity discovery",
      "market research",
      "product validation",
      "unit economics modeling",
      "SEO taxonomy audit",
      "Etsy SEO",
      "Amazon product research",
      "Shopify store analytics",
      "multi-marketplace analytics",
    ],
    authors: [{ name: "SellerSalt", url: siteBase }],
    creator: "SellerSalt",
    publisher: "SellerSalt",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    icons: {
      icon: settings.app_favicon_url || "/icon.png",
      apple: "/apple-icon.png",
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: siteBase,
      siteName: "SellerSalt",
      title,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: "SellerSalt — Ecommerce Intelligence & Product Validation",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    verification: {
      ...(googleToken ? { google: googleToken } : {}),
      ...(Object.keys(otherVerification).length > 0 ? { other: otherVerification } : {}),
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const globalStructuredData = {
    "@context": "https://schema.org",
    "@graph": [
      buildOrganizationSchema(BASE_URL),
      buildSoftwareApplicationSchema(BASE_URL),
    ],
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(globalStructuredData) }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

