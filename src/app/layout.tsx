import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anadash",
  description: "Multi-marketplace sourcing intelligence, in one dashboard.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
