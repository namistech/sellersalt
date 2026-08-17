"use client";

import { MarketplaceTiles } from "@/components/marketplace/MarketplaceTiles";

export default function ConnectorsPage() {
  return (
    <div className="max-w-5xl space-y-6 pb-12">
      <MarketplaceTiles
        title="Marketplaces & Channels"
        subtitle="Manage your connected marketplace storefronts and view upcoming platform integrations."
      />
    </div>
  );
}
