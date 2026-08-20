import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { MarketIntelligenceGraphView } from "@/components/intelligence/MarketIntelligenceGraphView";
import { WhatChangedView } from "@/components/intelligence/WhatChangedView";

export const metadata: Metadata = {
  title: "Proprietary Market Intelligence Graph — SellerSalt",
  description: "Market Intelligence Graph, continuous market memory, and longitudinal change detection.",
};

export default async function IntelligencePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl space-y-6">
      <MarketIntelligenceGraphView />
      <WhatChangedView initialKey="minimalist desk lamp" />
    </div>
  );
}
