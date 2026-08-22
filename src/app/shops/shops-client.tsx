"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  ExternalLink,
  Flame,
  Star,
  Layers,
  ArrowRight,
  Sparkles,
  TrendingUp,
  SlidersHorizontal,
} from "lucide-react";
import { Card, Input, Select, Badge, Button } from "@/components/ui";

export interface PublicShopItem {
  shopExternalId: string;
  shopName: string;
  shopUrl: string;
  shopIconUrl: string | null;
  totalSales: number;
  activeListings: number;
  // Batch 40: null when genuinely unobserved — never a fabricated default.
  shopAgeMonths: number | null;
  estDailySales: number;
  avgSellingRatio: number;
  // Batch 40: null when genuinely unobserved — never a fabricated 0.
  reviewCount: number | null;
  reviewAverage: number | null;
  keywords: string[];
  topListing: {
    title: string;
    price: number | null;
    imageUrl: string | null;
  } | null;
  discoveredAt: string;
}

interface ShopsDirectoryClientProps {
  initialShops: PublicShopItem[];
  isAuthenticated: boolean;
}

export function ShopsDirectoryClient({
  initialShops,
  isAuthenticated,
}: ShopsDirectoryClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNiche, setSelectedNiche] = useState<string>("ALL");
  const [velocityFilter, setVelocityFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("velocity");

  // Extract all unique niches
  const allNiches = useMemo(() => {
    const set = new Set<string>();
    for (const shop of initialShops) {
      for (const k of shop.keywords) {
        if (k.trim()) set.add(k.trim());
      }
    }
    return Array.from(set).sort();
  }, [initialShops]);

  // Filter & sort
  const filteredShops = useMemo(() => {
    return initialShops
      .filter((shop) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const match =
            shop.shopName.toLowerCase().includes(q) ||
            shop.keywords.some((k) => k.toLowerCase().includes(q)) ||
            (shop.topListing && shop.topListing.title.toLowerCase().includes(q));
          if (!match) return false;
        }

        if (selectedNiche !== "ALL") {
          if (!shop.keywords.includes(selectedNiche)) return false;
        }

        if (velocityFilter === "HIGH") {
          if (shop.estDailySales < 5) return false;
        } else if (velocityFilter === "EMERGING") {
          // A genuinely unobserved shop age can't be judged "emerging" —
          // exclude it from this filter rather than assuming young or old.
          if (shop.shopAgeMonths === null || shop.shopAgeMonths > 18 || shop.estDailySales < 2) return false;
        } else if (velocityFilter === "HIGH_YIELD") {
          if (shop.avgSellingRatio < 10) return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "velocity":
            return b.estDailySales - a.estDailySales;
          case "sales":
            return b.totalSales - a.totalSales;
          case "yield":
            return b.avgSellingRatio - a.avgSellingRatio;
          case "reviews":
            return (b.reviewCount ?? -Infinity) - (a.reviewCount ?? -Infinity);
          case "youngest":
            return (a.shopAgeMonths ?? Infinity) - (b.shopAgeMonths ?? Infinity);
          default:
            return b.estDailySales - a.estDailySales;
        }
      });
  }, [initialShops, searchQuery, selectedNiche, velocityFilter, sortBy]);

  return (
    <div className="space-y-10">
      {/* ---------------------------------------------------------------- */}
      {/* DIRECTORY HERO                                                   */}
      {/* ---------------------------------------------------------------- */}
      <div className="text-center max-w-3xl mx-auto space-y-4 pt-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E7FAF1] text-[#0E8F5D] text-xs font-semibold border border-[#0E8F5D]/30">
          <Sparkles className="h-3.5 w-3.5 text-[#FFB020]" />
          Public Etsy Research Directory
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#141B16] leading-tight">
          Discover Etsy Shops Worth Researching
        </h1>

        <p className="text-base text-[#525B55] leading-relaxed">
          Explore real Etsy shops, sales velocity metrics, catalog yield, and verified product opportunities uncovered by SellerSalt.
        </p>

        {/* Signup highlight banner */}
        {!isAuthenticated && (
          <div className="pt-2">
            <div className="inline-flex flex-wrap items-center justify-center gap-3 bg-white p-2.5 px-5 rounded-xl border border-[#E3E6E0] shadow-xs text-xs">
              <span className="font-semibold text-[#141B16]">
                Looking to track competitor daily sales & uncover winning products?
              </span>
              <Link href="/checkout?plan=PRO">
                <Button variant="primary" size="compact" className="text-xs font-semibold bg-[#0E8F5D] hover:bg-[#0C7A52] text-white shadow-xs">
                  Try SellerSalt →
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* SEARCH & FILTERS BAR                                             */}
      {/* ---------------------------------------------------------------- */}
      <div className="space-y-4">
        {/* Niche Category Pills */}
        {allNiches.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-[#7C847E] mr-1 flex items-center gap-1">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Niches:
            </span>
            <button
              type="button"
              onClick={() => setSelectedNiche("ALL")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                selectedNiche === "ALL"
                  ? "bg-[#141B16] text-white shadow-xs"
                  : "bg-white text-[#525B55] hover:bg-[#F4F3EF] border border-[#E3E6E0]"
              }`}
            >
              All Categories ({initialShops.length})
            </button>
            {allNiches.map((niche) => (
              <button
                key={niche}
                type="button"
                onClick={() => setSelectedNiche(niche)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                  selectedNiche === niche
                    ? "bg-[#0E8F5D] text-white font-semibold shadow-xs"
                    : "bg-white text-[#525B55] hover:bg-[#F4F3EF] border border-[#E3E6E0]"
                }`}
              >
                {niche}
              </button>
            ))}
          </div>
        )}

        {/* Toolbar Controls Card */}
        <Card padding="md" className="border-[#E3E6E0] bg-white shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search input */}
            <div className="relative sm:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7C847E]" />
              <Input
                placeholder="Search shop name, product or niche..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            {/* Velocity Tier Filter */}
            <Select
              value={velocityFilter}
              onChange={(e) => setVelocityFilter(e.target.value)}
              options={[
                { value: "ALL", label: "All Velocity Tiers" },
                { value: "HIGH", label: "🔥 High Velocity (>5 sales/day)" },
                { value: "EMERGING", label: "⚡ Emerging Shops (<18 mos)" },
                { value: "HIGH_YIELD", label: "💎 High Yield (>10 sales/listing)" },
              ]}
            />

            {/* Sort Order */}
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              options={[
                { value: "velocity", label: "Sort by Daily Velocity (Highest)" },
                { value: "sales", label: "Sort by Total Lifetime Sales" },
                { value: "yield", label: "Sort by Catalog Efficiency (Sales/Listing)" },
                { value: "reviews", label: "Sort by Review Count" },
                { value: "youngest", label: "Sort by Shop Age (Youngest)" },
              ]}
            />
          </div>
        </Card>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* SHOPS GRID                                                       */}
      {/* ---------------------------------------------------------------- */}
      {filteredShops.length === 0 ? (
        <Card padding="lg" className="border-[#E3E6E0] text-center py-16">
          <div className="w-12 h-12 rounded-full bg-[#F4F3EF] flex items-center justify-center mx-auto mb-3 text-[#7C847E]">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-[#141B16] mb-1">
            No Etsy shops matched your filters
          </h3>
          <p className="text-xs text-[#7C847E] mb-4 max-w-sm mx-auto">
            Try adjusting your search keywords or resetting category filters to browse more shops.
          </p>
          <Button
            variant="secondary"
            size="compact"
            onClick={() => {
              setSearchQuery("");
              setSelectedNiche("ALL");
              setVelocityFilter("ALL");
            }}
          >
            Clear Filters
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredShops.map((shop) => {
            const deepLink = isAuthenticated
              ? `/shops/${shop.shopExternalId}`
              : `/checkout?plan=PRO&ref=shop_dir`;

            return (
              <Card
                key={shop.shopExternalId}
                padding="md"
                className="flex flex-col justify-between border-[#E3E6E0] bg-white shadow-xs hover:border-[#141B16]/40 hover:shadow-md transition-all group"
              >
                <div>
                  {/* Top Bar: Icon, Name, Age, External Link */}
                  <div className="flex items-start justify-between gap-3 mb-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      {shop.shopIconUrl ? (
                        <img
                          src={shop.shopIconUrl}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-lg border border-[#E3E6E0] object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F4F3EF] border border-[#E3E6E0] text-xs font-bold text-[#141B16]">
                          {shop.shopName.substring(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0">
                        <Link
                          href={deepLink}
                          className="font-bold text-sm text-[#141B16] group-hover:text-[#0E8F5D] transition-colors truncate block"
                        >
                          {shop.shopName}
                        </Link>
                        <div className="text-xs text-[#7C847E] flex items-center gap-1.5 mt-0.5">
                          <span>{shop.shopAgeMonths !== null ? `${Math.round(shop.shopAgeMonths)} mos old` : "Shop age unavailable"}</span>
                          <span>·</span>
                          <span className="flex items-center text-amber-600">
                            {shop.reviewAverage !== null ? `★ ${shop.reviewAverage.toFixed(1)}` : "Rating unavailable"} ({shop.reviewCount ?? "—"})
                          </span>
                        </div>
                      </div>
                    </div>

                    <a
                      href={shop.shopUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#7C847E] hover:text-[#141B16] p-1"
                      title="View on Etsy (external)"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  {/* Niche Pills */}
                  {shop.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3.5">
                      {shop.keywords.map((k) => (
                        <span
                          key={k}
                          className="rounded bg-[#F4F3EF] px-2 py-0.5 text-label-sm font-medium text-[#525B55]"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Key Metrics Chips */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-[#FAFAF8] border border-[#E3E6E0] mb-4 text-center">
                    <div>
                      <div className="text-label-sm uppercase font-semibold text-[#7C847E]">
                        Daily Sales
                      </div>
                      <div className="font-mono text-xs font-bold text-[#0E8F5D]">
                        {shop.estDailySales.toFixed(1)}/day
                      </div>
                    </div>
                    <div>
                      <div className="text-label-sm uppercase font-semibold text-[#7C847E]">
                        Total Sales
                      </div>
                      <div className="font-mono text-xs font-bold text-[#141B16]">
                        {shop.totalSales.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-label-sm uppercase font-semibold text-[#7C847E]">
                        Yield / Listing
                      </div>
                      <div className="font-mono text-xs font-bold text-[#141B16]">
                        {shop.avgSellingRatio.toFixed(1)}x
                      </div>
                    </div>
                  </div>

                  {/* Discovered Listing Snippet */}
                  {shop.topListing && (
                    <div className="flex items-center gap-2.5 p-2 rounded-md bg-white border border-[#E3E6E0]/80 mb-2">
                      {shop.topListing.imageUrl && (
                        <img
                          src={shop.topListing.imageUrl}
                          alt=""
                          className="h-9 w-9 shrink-0 rounded object-cover border border-[#E3E6E0]"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-meta text-[#141B16] font-medium truncate">
                          {shop.topListing.title}
                        </div>
                        <div className="text-meta text-[#7C847E]">
                          Listing price: {shop.topListing.price !== null ? `$${shop.topListing.price.toFixed(2)}` : "Unavailable"}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Bottom CTA */}
                <div className="pt-3 border-t border-[#E3E6E0]/80">
                  <Link href={deepLink} className="block w-full">
                    <Button
                      variant="primary"
                      size="compact"
                      fullWidth
                      className="text-xs font-semibold bg-[#141B16] hover:bg-[#0E8F5D] text-white shadow-xs transition-colors"
                    >
                      {isAuthenticated ? "Inspect Full Intelligence →" : "Analyze in SellerSalt →"}
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
