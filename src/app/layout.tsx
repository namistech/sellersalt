import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "SellerSalt",
  description: "Product hunting for Etsy and eBay sellers — find winning shops and products in one dashboard.",
};

const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('anadash-theme');
    var dark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
