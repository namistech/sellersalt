import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { getSettings } from "@/lib/app-settings";

const DEFAULT_TITLE = "SellerSalt";
const DEFAULT_DESCRIPTION =
  "Product hunting for Etsy and eBay sellers — find winning shops and products in one dashboard.";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings(["seo_default_title", "seo_default_description", "seo_og_image_url", "app_favicon_url"]);

  return {
    title: settings.seo_default_title || DEFAULT_TITLE,
    description: settings.seo_default_description || DEFAULT_DESCRIPTION,
    ...(settings.app_favicon_url ? { icons: { icon: settings.app_favicon_url } } : {}),
    openGraph: {
      title: settings.seo_default_title || DEFAULT_TITLE,
      description: settings.seo_default_description || DEFAULT_DESCRIPTION,
      ...(settings.seo_og_image_url ? { images: [settings.seo_og_image_url] } : {}),
    },
  };
}

// Dark mode is not part of the current target product
// (docs/MASTER_BLUEPRINT.md, Decision 2) unless explicitly reintroduced
// later. The theme-detection script that used to add the .dark class
// here has been removed — see src/app/(dashboard)/theme-toggle.tsx for
// the corresponding UI-side deprecation.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
