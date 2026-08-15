"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Store,
  ExternalLink,
  Flame,
  Star,
  Layers,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Lock,
  Target,
  Zap,
  BookOpen,
  Bookmark,
  Plus,
  Compass,
} from "lucide-react";
import { Card, Badge, Button, Heading, Text } from "@/components/ui";
import { computeProductWinningSignals, type WinningShopSignal } from "@/services/intelligence/winning-signals";
import type { Prospect } from "@prisma/client";

interface ShopDetailClientProps {
  shopExternalId: string;
  primary: Prospect;
  prospects: Prospect[];
  keywords: string[];
  shopSignals: WinningShopSignal;
  isAuthenticated: boolean;
}

export function ShopDetailClient({
  shopExternalId,
  primary,
  prospects,
  keywords,
  shopSignals,
  isAuthenticated,
}: ShopDetailClientProps) {
  const [shortlisted, setShortlisted] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [tracked, setTracked] = useState(false);
  const [shortlistedListings, setShortlistedListings] = useState<Record<string, boolean>>({});
  const [plannedKeywords, setPlannedKeywords] = useState<Record<string, boolean>>({});

  const estDaily = primary.estDailySales ?? 0;
  const totalSales = primary.totalSales ?? 0;
  const activeListings = primary.activeListings ?? 1;
  const sellingRatio = primary.avgSellingRatio ?? (totalSales / activeListings);

  async function handleToggleTrack() {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    setTracking(true);
    try {
      const res = await fetch(`/api/shops/${shopExternalId}/track`, {
        method: tracked ? "DELETE" : "POST",
      });
      if (res.ok) setTracked(!tracked);
    } finally {
      setTracking(false);
    }
  }

  async function handleToggleListingFavorite(id: string) {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    const next = !shortlistedListings[id];
    setShortlistedListings((prev) => ({ ...prev, [id]: next }));
    try {
      await fetch(`/api/prospects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: next }),
      });
    } catch {
      setShortlistedListings((prev) => ({ ...prev, [id]: !next }));
    }
  }

  function handleToggleKeywordPlanning(k: string) {
    setPlannedKeywords((prev) => ({ ...prev, [k]: !prev[k] }));
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-ink-tertiary">
        <Link href={isAuthenticated ? "/spy" : "/shops"} className="hover:text-ink transition-colors">
          ← Back to {isAuthenticated ? "Competitor Spy" : "Etsy Directory"}
        </Link>
        <span>/</span>
        <span className="text-ink font-medium">{primary.shopName}</span>
      </div>

      {/* Prominent Hero / Verdict Card */}
      <Card padding="lg" className="border-line shadow-xs bg-white space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {primary.shopIconUrl ? (
              <img
                src={primary.shopIconUrl}
                alt={primary.shopName}
                className="h-16 w-16 rounded-xl border border-line object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#F4F3EF] border border-line text-lg font-extrabold text-ink">
                {primary.shopName.substring(0, 2).toUpperCase()}
              </div>
            )}

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold text-ink">{primary.shopName}</h1>
                <Badge variant="success">Etsy Verified</Badge>
                <Badge variant="gold">
                  <Sparkles className="h-3 w-3 mr-1 inline text-[#FFB020]" />
                  Opportunity Score: {shopSignals.opportunityScore}/100
                </Badge>
              </div>
              <div className="text-xs text-ink-secondary flex flex-wrap items-center gap-2 mt-1.5">
                <span>{Math.round(primary.shopAgeMonths)} months on Etsy</span>
                <span>·</span>
                <span className="text-amber-600 font-semibold">
                  ★ {primary.reviewAverage?.toFixed(1) ?? "5.0"} ({primary.reviewCount} reviews)
                </span>
                <span>·</span>
                <span>{activeListings} active listings</span>
                <span>·</span>
                <Badge variant={shopSignals.recommendation === "SHORTLIST" ? "success" : "neutral"}>
                  Verdict: {shopSignals.recommendation}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={primary.shopUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line bg-white hover:bg-[#F4F3EF] text-xs font-semibold text-ink transition-colors"
            >
              <span>View on Etsy</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <Button
              variant={shortlisted ? "primary" : "secondary"}
              size="compact"
              onClick={() => setShortlisted(!shortlisted)}
              className="text-xs"
            >
              <Bookmark className={`h-3.5 w-3.5 mr-1 ${shortlisted ? "fill-current" : ""}`} />
              {shortlisted ? "Shortlisted" : "Shortlist Shop"}
            </Button>

            <Button
              variant="primary"
              size="compact"
              loading={tracking}
              onClick={handleToggleTrack}
              className={`text-xs font-semibold ${tracked ? "bg-[#141B16]" : "bg-[#0E8F5D] hover:bg-[#0C7A52]"}`}
            >
              {tracked ? "✓ Tracking Daily" : "+ Monitor Shop"}
            </Button>
          </div>
        </div>

        {/* Intelligence Breakdown: Why Interesting & What to Study */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-line-subtle text-xs">
          <div className="p-4 rounded-xl bg-[#FAFAF8] border border-line space-y-1.5">
            <div className="font-bold text-ink flex items-center gap-1.5">
              <Target className="h-4 w-4 text-[#0E8F5D]" /> Why This Shop is Interesting:
            </div>
            <p className="text-ink-secondary leading-relaxed">{shopSignals.whyInteresting}</p>
          </div>

          <div className="p-4 rounded-xl bg-[#FAFAF8] border border-line space-y-1.5">
            <div className="font-bold text-ink flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-purple-600" /> What to Study:
            </div>
            <p className="text-ink-secondary leading-relaxed">{shopSignals.whatToStudy}</p>
          </div>
        </div>
      </Card>

      {/* Real Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="md" className="border-line bg-white shadow-xs">
          <div className="text-[11px] font-bold text-ink-tertiary uppercase tracking-wider mb-1">
            Est. Daily Sales
          </div>
          <div className="text-2xl font-extrabold text-[#0E8F5D] font-mono">
            {estDaily.toFixed(1)} <span className="text-xs font-sans text-ink-tertiary">/day</span>
          </div>
          <div className="text-[11px] text-ink-tertiary mt-1">Calculated transaction velocity</div>
        </Card>

        <Card padding="md" className="border-line bg-white shadow-xs">
          <div className="text-[11px] font-bold text-ink-tertiary uppercase tracking-wider mb-1">
            Total Sales
          </div>
          <div className="text-2xl font-extrabold text-ink font-mono">
            {totalSales.toLocaleString()}
          </div>
          <div className="text-[11px] text-ink-tertiary mt-1">Real verified Etsy sales count</div>
        </Card>

        <Card padding="md" className="border-line bg-white shadow-xs">
          <div className="text-[11px] font-bold text-ink-tertiary uppercase tracking-wider mb-1">
            Catalog Yield Efficiency
          </div>
          <div className="text-2xl font-extrabold text-ink font-mono">
            {sellingRatio.toFixed(1)}x
          </div>
          <div className="text-[11px] text-ink-tertiary mt-1">
            {sellingRatio > 30 ? "High Yield (>30 sales/listing)" : "Standard Yield"}
          </div>
        </Card>

        <Card padding="md" className="border-line bg-white shadow-xs">
          <div className="text-[11px] font-bold text-ink-tertiary uppercase tracking-wider mb-1">
            Active Catalog Size
          </div>
          <div className="text-2xl font-extrabold text-ink font-mono">
            {activeListings} <span className="text-xs font-sans text-ink-tertiary">listings</span>
          </div>
          <div className="text-[11px] text-ink-tertiary mt-1">Active inventory breadth</div>
        </Card>
      </div>

      {/* Keywords / SEO Intelligence */}
      {keywords.length > 0 && (
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Heading as="h2" size="h4">
                Shop Keyword Landscape ({keywords.length})
              </Heading>
              <Text size="body-sm" color="secondary" className="mt-0.5">
                Strongest long-tail niches this store is ranking and competing in.
              </Text>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {keywords.map((k) => {
              const words = k.split(/\s+/).length;
              const isPlanned = plannedKeywords[k];

              return (
                <div
                  key={k}
                  className="p-3 rounded-xl border border-line bg-[#FAFAF8] flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-ink truncate">{k}</div>
                    <div className="text-[10px] text-ink-tertiary mt-0.5">
                      {words} words · Long-tail niche
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link
                      href={`/prospects?search=${encodeURIComponent(k)}`}
                      className="p-1 rounded text-ink-tertiary hover:text-ink"
                      title="Research keyword"
                    >
                      <Compass className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleToggleKeywordPlanning(k)}
                      className={`p-1 rounded text-xs transition-colors ${
                        isPlanned ? "text-[#0E8F5D]" : "text-ink-tertiary hover:text-ink"
                      }`}
                      title={isPlanned ? "Planned" : "Add to Planning"}
                    >
                      <Bookmark className={`h-3.5 w-3.5 ${isPlanned ? "fill-current" : ""}`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Top Performing Listings */}
      <Card padding="lg" className="border-line shadow-xs bg-white space-y-4">
        <div>
          <Heading as="h2" size="h4">
            Top Performing Products ({prospects.length})
          </Heading>
          <Text size="body-sm" color="secondary" className="mt-0.5">
            Key listings identified by SellerSalt with velocity and opportunity ratings.
          </Text>
        </div>

        <div className="divide-y divide-line-subtle border-t border-line-subtle">
          {prospects.map((p) => {
            const pSignals = computeProductWinningSignals({
              estDailySales: p.estDailySales,
              totalSales: p.totalSales,
              activeListings: p.activeListings,
              reviewCount: p.reviewCount,
              reviewAverage: p.reviewAverage,
              price: p.price,
              shopAgeMonths: p.shopAgeMonths,
            });
            const isFav = shortlistedListings[p.id] ?? p.isFavorite;

            return (
              <div key={p.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {p.listingImageUrl ? (
                    <img
                      src={p.listingImageUrl}
                      alt=""
                      className="h-14 w-14 rounded-lg border border-line object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-[#F4F3EF] border border-line flex items-center justify-center text-xs font-bold text-ink-tertiary shrink-0">
                      ETSY
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="font-bold text-xs text-ink truncate max-w-md">
                      {p.listingTitle}
                    </div>
                    <div className="text-[11px] text-ink-tertiary mt-0.5 flex flex-wrap items-center gap-2">
                      <span>Price: <strong className="text-ink">${p.price.toFixed(2)}</strong></span>
                      <span>·</span>
                      <span>Niche: <strong className="text-ink">{p.keyword}</strong></span>
                      <span>·</span>
                      <span className="text-[#0E8F5D] font-semibold">
                        Score: {pSignals.opportunityScore}/100 ({pSignals.demandSignal})
                      </span>
                    </div>
                    <div className="text-[10px] text-ink-secondary mt-1">
                      {pSignals.whyItWins}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={p.listingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded text-ink-tertiary hover:text-ink"
                    title="View on Etsy"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>

                  <Button
                    variant={isFav ? "primary" : "secondary"}
                    size="compact"
                    onClick={() => handleToggleListingFavorite(p.id)}
                    className="text-xs"
                  >
                    <Bookmark className={`h-3.5 w-3.5 mr-1 ${isFav ? "fill-current" : ""}`} />
                    {isFav ? "Saved" : "Shortlist"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
