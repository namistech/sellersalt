import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
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
} from "lucide-react";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { Card, Badge, Button, Heading, Text } from "@/components/ui";
import { computeShopWinningSignals, computeProductWinningSignals } from "@/services/intelligence/winning-signals";

interface ShopDetailPageProps {
  params: Promise<{ shopExternalId: string }>;
}

export async function generateMetadata({ params }: ShopDetailPageProps) {
  const { shopExternalId } = await params;
  const prospect = await prisma.prospect.findFirst({
    where: { shopExternalId },
    select: { shopName: true, keyword: true, totalSales: true },
  });

  if (!prospect) return { title: "Etsy Shop Intelligence — SellerSalt" };

  return {
    title: `${prospect.shopName} Etsy Sales & Competitor Analysis — SellerSalt`,
    description: `Inspect estimated daily sales, listing yield, and competitor intelligence for Etsy store ${prospect.shopName}.`,
  };
}

export default async function PublicShopDetailPage({ params }: ShopDetailPageProps) {
  const { shopExternalId } = await params;

  const prospects = await prisma.prospect.findMany({
    where: { shopExternalId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  if (prospects.length === 0) {
    notFound();
  }

  const primary = prospects[0]!;
  const keywords = Array.from(new Set(prospects.map((p) => p.keyword).filter(Boolean)));
  const estDaily = primary.estDailySales ?? 0;
  const totalSales = primary.totalSales ?? 0;
  const activeListings = primary.activeListings ?? 1;
  const sellingRatio = primary.avgSellingRatio ?? (totalSales / activeListings);

  const shopSignals = computeShopWinningSignals({
    totalSales,
    activeListings,
    estDailySales: estDaily,
    shopAgeMonths: primary.shopAgeMonths,
    reviewCount: primary.reviewCount,
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8] text-[#141B16]">
      <PublicHeader />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#7C847E]">
          <Link href="/shops" className="hover:text-[#141B16] transition-colors">
            ← Back to Etsy Directory
          </Link>
          <span>/</span>
          <span className="text-[#141B16] font-medium">{primary.shopName}</span>
        </div>

        {/* Shop Opportunity Hero Card */}
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
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#F4F3EF] border border-line text-lg font-extrabold text-[#141B16]">
                  {primary.shopName.substring(0, 2).toUpperCase()}
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-extrabold text-[#141B16]">{primary.shopName}</h1>
                  <Badge variant="success">Etsy Verified</Badge>
                  <Badge variant="gold">
                    <Sparkles className="h-3 w-3 mr-1 inline text-[#FFB020]" />
                    Opportunity Score: {shopSignals.opportunityScore}/100
                  </Badge>
                </div>
                <div className="text-xs text-[#7C847E] flex flex-wrap items-center gap-2 mt-1.5">
                  <span>{Math.round(primary.shopAgeMonths)} months on Etsy</span>
                  <span>·</span>
                  <span className="text-amber-600 font-semibold">
                    ★ {primary.reviewAverage?.toFixed(1) ?? "5.0"} ({primary.reviewCount} reviews)
                  </span>
                  <span>·</span>
                  <span>{activeListings} active listings</span>
                  <span>·</span>
                  <Badge variant={shopSignals.recommendation === "SHORTLIST" ? "success" : "neutral"}>
                    Recommended: {shopSignals.recommendation}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={primary.shopUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line bg-white hover:bg-[#F4F3EF] text-xs font-semibold text-[#141B16] transition-colors"
              >
                <span>Visit on Etsy</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>

              <Link href="/checkout?plan=PRO&ref=shop_profile">
                <Button variant="primary" size="compact" className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-xs font-semibold">
                  Track Daily Sales ($1 Trial) →
                </Button>
              </Link>
            </div>
          </div>

          {/* Intelligence Matrix: Why Interesting & What to Study */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-line-subtle text-xs">
            <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
              <div className="font-bold text-ink flex items-center gap-1.5">
                <Target className="h-4 w-4 text-[#0E8F5D]" /> Why This Shop is Interesting:
              </div>
              <p className="text-ink-secondary leading-relaxed">{shopSignals.whyInteresting}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
              <div className="font-bold text-ink flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-purple-600" /> What to Study:
              </div>
              <p className="text-ink-secondary leading-relaxed">{shopSignals.whatToStudy}</p>
            </div>
          </div>

          {/* Keywords */}
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-4 border-t border-line-subtle">
              <span className="text-xs font-semibold text-[#7C847E] mr-1">Discovered Niches:</span>
              {keywords.map((k) => (
                <span
                  key={k}
                  className="rounded-md bg-[#F4F3EF] px-2.5 py-0.5 text-xs font-medium text-[#525B55]"
                >
                  {k}
                </span>
              ))}
            </div>
          )}
        </Card>

        {/* 3-Column Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card padding="md" className="border-line bg-white text-center shadow-xs">
            <div className="text-[11px] font-bold text-[#7C847E] uppercase tracking-wider mb-1">
              Estimated Daily Velocity
            </div>
            <div className="text-2xl font-extrabold text-[#0E8F5D] font-mono">
              {estDaily.toFixed(1)} <span className="text-xs font-sans text-[#7C847E]">sales/day</span>
            </div>
            <div className="text-[11px] text-[#7C847E] mt-1">Based on transaction velocity</div>
          </Card>

          <Card padding="md" className="border-line bg-white text-center shadow-xs">
            <div className="text-[11px] font-bold text-[#7C847E] uppercase tracking-wider mb-1">
              Total Lifetime Sales
            </div>
            <div className="text-2xl font-extrabold text-[#141B16] font-mono">
              {totalSales.toLocaleString()}
            </div>
            <div className="text-[11px] text-[#7C847E] mt-1">Verified on Etsy marketplace</div>
          </Card>

          <Card padding="md" className="border-line bg-white text-center shadow-xs">
            <div className="text-[11px] font-bold text-[#7C847E] uppercase tracking-wider mb-1">
              Catalog Yield Efficiency
            </div>
            <div className="text-2xl font-extrabold text-[#141B16] font-mono">
              {sellingRatio.toFixed(1)}x
            </div>
            <div className="text-[11px] text-[#7C847E] mt-1">
              {shopSignals.catalogEfficiency === "HIGH_YIELD" ? "High Yield (>30x)" : "Moderate Yield"}
            </div>
          </Card>
        </div>

        {/* Locked Competitor Tracking Banner */}
        <div className="p-8 rounded-2xl bg-[#141B16] text-white space-y-4 text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#0E8F5D]/20 text-[#0E8F5D] mb-1">
            <TrendingUp className="h-5 w-5" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Track {primary.shopName}&apos;s Daily Revenue & Listing Snapshots
          </h2>
          <p className="text-xs sm:text-sm text-[#AEB4AC] max-w-xl mx-auto leading-relaxed">
            SellerSalt automated bots track competitor sales daily. Unlock longitudinal sales graphs, breakout product alerts, and keyword gap analysis.
          </p>
          <div className="pt-2">
            <Link href="/checkout?plan=PRO&ref=shop_lock_cta">
              <Button variant="primary" size="compact" className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-sm font-semibold px-6 py-2.5 shadow-md">
                Try SellerSalt Full Access for $1.00 →
              </Button>
            </Link>
          </div>
        </div>

        {/* Discovered Listings Data */}
        <Card padding="lg" className="border-line shadow-xs bg-white space-y-4">
          <div>
            <Heading as="h2" size="h4">
              Discovered Products from this Shop ({prospects.length})
            </Heading>
            <Text size="body-sm" color="secondary" className="mt-0.5">
              Top-performing listings uncovered by SellerSalt research algorithms.
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

              return (
                <div key={p.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {p.listingImageUrl ? (
                      <img
                        src={p.listingImageUrl}
                        alt=""
                        className="h-12 w-12 rounded-lg border border-line object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-[#F4F3EF] border border-line flex items-center justify-center text-xs font-bold text-[#7C847E] shrink-0">
                        ETSY
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="font-bold text-xs text-[#141B16] truncate max-w-md">
                        {p.listingTitle}
                      </div>
                      <div className="text-[11px] text-[#7C847E] mt-0.5 flex flex-wrap items-center gap-2">
                        <span>Niche: <strong className="text-[#141B16]">{p.keyword}</strong></span>
                        <span>·</span>
                        <span>Price: <strong className="text-[#141B16]">${p.price.toFixed(2)}</strong></span>
                        <span>·</span>
                        <span className="text-[#0E8F5D] font-semibold">
                          Score: {pSignals.opportunityScore}/100
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={p.listingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded text-[#7C847E] hover:text-[#141B16]"
                      title="View on Etsy"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <Link href="/checkout?plan=PRO">
                      <Button variant="secondary" size="compact" className="text-xs">
                        Analyze Listing →
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </main>

      <PublicFooter />
    </div>
  );
}
