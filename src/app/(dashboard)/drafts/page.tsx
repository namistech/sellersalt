import { Metadata } from "next";
import { DraftsClient } from "./drafts-client";

export const metadata: Metadata = {
  title: "Etsy Listing Drafts | SellerSalt",
  description: "Review, inspect, and approve listing drafts before publishing them live to your connected Etsy storefront.",
};

export default function DraftsPage() {
  return <DraftsClient />;
}
