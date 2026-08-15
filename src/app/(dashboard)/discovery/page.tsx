import { getServerSession } from "next-auth";
import Link from "next/link";
import {
  Compass,
  Flame,
  Search,
  Eye,
  Store,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Target,
  Layers,
  Star,
  ExternalLink,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, Heading, Text, Badge, Button } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DiscoveryPage() {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;

  const [
    topProducts,
    topShops,
    recentKeywords,
    totalProspects,
    totalTrackedShops,
    activeStreams,
  ] = await Promise.all([
    // Top Winning Products with highest sales velocity
    organizationId
      ? prisma.prospect.findMany({
          where: { organizationId },
          orderBy: [{ estDailySales: "desc" }, { createdAt: "desc" }],
          take: 6,
        })
      : [],
    // Winning Shops discovered with high total sales and listings
    organizationId
      ? prisma.prospect.findMany({
          where: { organizationId, totalSales: { gt: 0 } },
          distinct: ["shopExternalId"],
          orderBy: { totalSales: "desc" },
          take: 5,
        })
      : [],
    // Winning Keywords / Discovered Niches
    organizationId
      ? prisma.searchConfig.findMany({
          where: { organizationId, isActive: true },
          take: 8,
          orderBy: { createdAt: "desc" },
        })
      : [],
    // Metrics
    organizationId ? prisma.prospect.count({ where: { organizationId } }) : 0,
    organizationId ? prisma.shopWatch.count({ where: { organizationId, isActive: true } }) : 0,
    organizationId ? prisma.searchConfig.count({ where: { organizationId, isActive: true } }) : 0,
  ]);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0E8F5D]/10 text-[#0E8F5D]">
              <Compass className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0E8F5D]">
              Intelligence Central
            </span>
          </div>
          <Heading as="h1" size="h2">
            Discovery Hub
          </Heading>
          <Text size="body-md" color="secondary" className="mt-0.5">
            Identify winning products, study top-performing Etsy shops, and uncover high-opportunity keywords.
          </Text>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/radar">
            <Button variant="secondary" size="compact" className="text-xs">
              <Flame className="h-3.5 w-3.5 mr-1 text-[#FFB020]" /> View Radar
            </Button>
          </Link>
          <Link href="/prospects">
            <Button variant="primary" size="compact" className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-xs font-semibold">
              Explore All Prospects →
            </Button>
          </Link>
        </div>
      </div>

      {/* 4-Module Quick Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/radar" className="group">
          <Card padding="md" className="h-full border-line shadow-xs bg-white hover:border-[#0E8F5D] transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform">
                <Flame className="h-5 w-5" />
              </span>
              <span className="text-xs font-bold text-ink-tertiary group-hover:text-[#0E8F5D] flex items-center gap-0.5">
                Open <ArrowRight className="h-3 w-3" />
              </span>
            </div>
            <div className="font-bold text-sm text-ink mb-1">Winning Products (Radar)</div>
            <Text size="body-sm" color="secondary">
              High-velocity listings with &lt;100 reviews in low-competition market segments.
            </Text>
          </Card>
        </Link>

        <Link href="/spy" className="group">
          <Card padding="md" className="h-full border-line shadow-xs bg-white hover:border-[#0E8F5D] transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform">
                <Eye className="h-5 w-5" />
              </span>
              <span className="text-xs font-bold text-ink-tertiary group-hover:text-[#0E8F5D] flex items-center gap-0.5">
                Open <ArrowRight className="h-3 w-3" />
              </span>
            </div>
            <div className="font-bold text-sm text-ink mb-1">Competitor Spy</div>
            <Text size="body-sm" color="secondary">
              Daily sales velocity tracking, catalog yield auditing, and breakout shop alerts.
            </Text>
          </Card>
        </Link>

        <Link href="/trends" className="group">
          <Card padding="md" className="h-full border-line shadow-xs bg-white hover:border-[#0E8F5D] transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#0E8F5D] group-hover:scale-105 transition-transform">
                <TrendingUp className="h-5 w-5" />
              </span>
              <span className="text-xs font-bold text-ink-tertiary group-hover:text-[#0E8F5D] flex items-center gap-0.5">
                Open <ArrowRight className="h-3 w-3" />
              </span>
            </div>
            <div className="font-bold text-sm text-ink mb-1">Keyword Trends</div>
            <Text size="body-sm" color="secondary">
              Search term velocity, season surges, and high-demand keyword opportunities.
            </Text>
          </Card>
        </Link>

        <Link href="/connectors" className="group">
          <Card padding="md" className="h-full border-line shadow-xs bg-white hover:border-[#0E8F5D] transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:scale-105 transition-transform">
                <Zap className="h-5 w-5" />
              </span>
              <span className="text-xs font-bold text-ink-tertiary group-hover:text-[#0E8F5D] flex items-center gap-0.5">
                Open <ArrowRight className="h-3 w-3" />
              </span>
            </div>
            <div className="font-bold text-sm text-ink mb-1">Search Streams</div>
            <Text size="body-sm" color="secondary">
              Configure automated Etsy scraper streams, target keywords, and sync frequency.
            </Text>
          </Card>
        </Link>
      </div>

      {/* 3 Major Research Intelligence Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section 1: Winning Products */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-[#FFB020]" />
              <Heading as="h2" size="h4">
                Emerging Winning Products
              </Heading>
            </div>
            <Link href="/prospects" className="text-xs font-medium text-[#0E8F5D] hover:underline">
              View all ({totalProspects}) →
            </Link>
          </div>

          {topProducts.length === 0 ? (
            <Card padding="lg" className="border-line text-center py-10 bg-white">
              <Search className="h-8 w-8 text-ink-tertiary mx-auto mb-2" />
              <div className="text-sm font-semibold text-ink">No research prospects yet</div>
              <p className="text-xs text-ink-secondary mt-1 max-w-sm mx-auto">
                Launch an automated research stream in Search Streams to start discovering winning products.
              </p>
              <div className="mt-4">
                <Link href="/connectors">
                  <Button variant="primary" size="compact" className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-xs">
                    Start New Stream →
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {topProducts.map((item) => (
                <Card key={item.id} padding="md" className="border-line shadow-xs bg-white flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      {item.listingImageUrl ? (
                        <img
                          src={item.listingImageUrl}
                          alt=""
                          className="h-12 w-12 rounded-lg border border-line object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-surface-muted border border-line flex items-center justify-center text-xs font-bold text-ink-tertiary shrink-0">
                          ETSY
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs text-ink truncate" title={item.listingTitle}>
                          {item.listingTitle}
                        </div>
                        <div className="text-[11px] text-ink-secondary flex items-center gap-1.5 mt-0.5">
                          <span className="truncate">{item.shopName}</span>
                          <span>·</span>
                          <span className="font-mono font-semibold text-ink">${item.price.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-line-subtle text-[11px]">
                      <div className="bg-[#FAFAF8] p-1.5 rounded border border-line-subtle">
                        <div className="text-ink-tertiary text-[10px]">Est. Velocity</div>
                        <div className="font-bold font-mono text-[#0E8F5D]">
                          {(item.estDailySales || 0).toFixed(1)} <span className="text-[10px] font-normal text-ink-tertiary">sales/day</span>
                        </div>
                      </div>
                      <div className="bg-[#FAFAF8] p-1.5 rounded border border-line-subtle">
                        <div className="text-ink-tertiary text-[10px]">Review Count</div>
                        <div className="font-bold font-mono text-ink">
                          {item.reviewCount} <span className="text-[10px] font-normal text-ink-tertiary">reviews</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-2 flex items-center justify-between border-t border-line-subtle">
                    <span className="text-[11px] text-ink-tertiary truncate">
                      Niche: <strong className="text-ink">{item.keyword}</strong>
                    </span>
                    <a
                      href={item.listingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#0E8F5D] hover:underline inline-flex items-center gap-0.5 font-medium"
                    >
                      Inspect <ExternalLink className="h-3 w-3 ml-0.5" />
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Section 2 & 3: Winning Shops & Keywords */}
        <div className="space-y-6">
          {/* Winning Shops */}
          <Card padding="md" className="border-line shadow-xs bg-white space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-[#0E8F5D]" />
                <Heading as="h3" size="h4">
                  Winning Shops to Study
                </Heading>
              </div>
              <Link href="/spy/tracked" className="text-xs font-medium text-[#0E8F5D] hover:underline">
                View all ({totalTrackedShops}) →
              </Link>
            </div>

            {topShops.length === 0 ? (
              <div className="text-xs text-ink-secondary py-4 text-center">
                No competitor shops analyzed yet.
              </div>
            ) : (
              <div className="divide-y divide-line-subtle">
                {topShops.map((s) => (
                  <div key={s.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-ink truncate">{s.shopName}</div>
                      <div className="text-[11px] text-ink-secondary flex items-center gap-1 mt-0.5">
                        <span>{s.totalSales?.toLocaleString()} total sales</span>
                        <span>·</span>
                        <span>{s.activeListings} listings</span>
                      </div>
                    </div>
                    <Link href={`/shops/${s.shopExternalId}`}>
                      <Button variant="secondary" size="compact" className="text-[11px] h-7 px-2 bg-surface hover:bg-[#F4F3EF]">
                        Study Shop →
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Winning Keywords / Discovered Niches */}
          <Card padding="md" className="border-line shadow-xs bg-white space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-600" />
                <Heading as="h3" size="h4">
                  Active Keyword Streams
                </Heading>
              </div>
              <Link href="/connectors" className="text-xs font-medium text-[#0E8F5D] hover:underline">
                Manage ({activeStreams}) →
              </Link>
            </div>

            {recentKeywords.length === 0 ? (
              <div className="text-xs text-ink-secondary py-4 text-center">
                No active keyword streams configured.
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {recentKeywords.map((k) => {
                  const kw = k.keywords[0] || k.name;
                  return (
                    <Link key={k.id} href={`/prospects?keyword=${encodeURIComponent(kw)}`}>
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#F4F3EF] hover:bg-[#E7FAF1] hover:text-[#0E8F5D] px-2.5 py-1 text-xs font-medium text-ink transition-colors border border-line-subtle">
                        <span>{kw}</span>
                        <span className="text-[10px] text-ink-tertiary">(${k.minPrice}+)</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
