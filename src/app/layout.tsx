import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "SellerSalt",
  description: "Product hunting for Etsy and eBay sellers — find winning shops and products in one dashboard.",
};

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
