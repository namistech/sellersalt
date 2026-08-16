import { Suspense } from "react";
import { StudioClient } from "./studio-client";

export const metadata = {
  title: "AI Listing Studio | SellerSalt",
  description: "Convert market research into high-converting Etsy listing drafts with real-time SEO scoring and originality protection.",
};

export default function StudioPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-ink-tertiary">Loading AI Listing Studio...</div>}>
      <StudioClient />
    </Suspense>
  );
}
