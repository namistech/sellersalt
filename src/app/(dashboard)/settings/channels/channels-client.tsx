"use client";

import { MarketplaceTiles } from "@/components/marketplace/MarketplaceTiles";

export function ChannelsClient() {
  return (
    <div className="max-w-5xl space-y-6 pb-12">
      <MarketplaceTiles
        title="Connected Channels & Marketplaces"
        subtitle="Link your authenticated Etsy seller account and explore upcoming multi-channel ecommerce integrations."
      />
    </div>
  );
}
