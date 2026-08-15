"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, Store, Sparkles, Bookmark, ExternalLink, Compass, Download, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/shell";
import { Card, Alert, Button, Badge, Tabs, Heading, Text } from "@/components/ui";
import { Table, EmptyState } from "@/components/data";
import { fetchProspects, updateProspect, type ProspectRow, type ProspectStatus } from "@/services/prospects";
import { fetchTrackedResearchShops, type TrackedResearchShop } from "@/services/researchShops";
import { ServiceError } from "@/services/http";
import { buildProspectColumns } from "../prospect-columns";

export default function FavoritesPage() {
  const [activeTab, setActiveTab] = useState<"products" | "shops" | "keywords">("products");
  const [productRows, setProductRows] = useState<ProspectRow[]>([]);
  const [trackedShops, setTrackedShops] = useState<TrackedResearchShop[]>([]);
  const [keywords, setKeywords] = useState<Array<{ keyword: string; count: number; estDaily: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    setError(null);
    try {
      const [favs, allProspects, shops] = await Promise.all([
        fetchProspects({ favoriteOnly: true }),
        fetchProspects(),
        fetchTrackedResearchShops().catch(() => []),
      ]);

      setProductRows(favs);
      setTrackedShops(shops);

      // Aggregate planned keywords from research dataset
      const kwMap = new Map<string, { count: number; totalDaily: number }>();
      for (const p of allProspects) {
        if (p.keyword) {
          const entry = kwMap.get(p.keyword) || { count: 0, totalDaily: 0 };
          entry.count += 1;
          entry.totalDaily += p.estDailySales ?? 0;
          kwMap.set(p.keyword, entry);
        }
      }

      const kwList = Array.from(kwMap.entries())
        .map(([kw, data]) => ({
          keyword: kw,
          count: data.count,
          estDaily: Math.round((data.totalDaily / Math.max(1, data.count)) * 10) / 10,
        }))
        .sort((a, b) => b.count - a.count);

      setKeywords(kwList);
    } catch (e) {
      setError(e instanceof ServiceError ? e.message : "Couldn't load Planning data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleToggleFavorite(id: string, next: boolean) {
    setProductRows((prev) => (next ? prev : prev.filter((p) => p.id !== id)));
    try {
      await updateProspect(id, { isFavorite: next });
    } catch {
      loadAll();
    }
  }

  async function handleStatusChange(id: string, status: ProspectStatus) {
    setProductRows((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    try {
      await updateProspect(id, { status });
    } catch {
      loadAll();
    }
  }

  const columns = buildProspectColumns({
    onToggleFavorite: handleToggleFavorite,
    onStatusChange: handleStatusChange,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planning & Shortlists Hub"
        description="Unified planning lists for your shortlisted Etsy products, monitored competitor shops, and high-opportunity keywords."
      />

      {error && (
        <Alert variant="danger" title="Couldn't load Planning Data" className="mb-4">
          {error}
        </Alert>
      )}

      <div className="flex gap-2 border-b border-line pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("products")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === "products"
              ? "bg-[#141B16] text-white"
              : "bg-white hover:bg-[#F4F3EF] text-ink border border-line"
          }`}
        >
          Shortlisted Products ({productRows.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("shops")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === "shops"
              ? "bg-[#141B16] text-white"
              : "bg-white hover:bg-[#F4F3EF] text-ink border border-line"
          }`}
        >
          Tracked Shops ({trackedShops.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("keywords")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === "keywords"
              ? "bg-[#141B16] text-white"
              : "bg-white hover:bg-[#F4F3EF] text-ink border border-line"
          }`}
        >
          Planned Keywords ({keywords.length})
        </button>
      </div>

      {/* 1. SHORTLISTED PRODUCTS TAB */}
      {activeTab === "products" && (
        <Card padding="sm" className="border-line bg-white shadow-xs">
          <Table<ProspectRow>
            aria-label="Favorite prospects"
            columns={columns}
            rows={productRows}
            getRowId={(p) => p.id}
            loading={loading}
            emptyState={
              <EmptyState
                icon={<Star />}
                title="No shortlisted products yet"
                description="Star products in Opportunity Radar or Prospects to save them here for your product planning."
              />
            }
          />
        </Card>
      )}

      {/* 2. TRACKED SHOPS TAB */}
      {activeTab === "shops" && (
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Heading as="h2" size="h4">
                Monitored Competitor Shops ({trackedShops.length})
              </Heading>
              <Text size="body-sm" color="secondary" className="mt-0.5">
                Competitors whose daily sales, velocity, and listing changes you are tracking.
              </Text>
            </div>
            <Link href="/spy">
              <Button variant="primary" size="compact" className="bg-[#0E8F5D] text-xs font-semibold">
                + Track New Shop
              </Button>
            </Link>
          </div>

          {trackedShops.length === 0 ? (
            <div className="py-12 text-center text-xs text-ink-tertiary">
              No shops currently tracked. Visit any Shop Profile and click <strong>+ Monitor Shop</strong>.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {trackedShops.map((s) => (
                <div
                  key={s.shopExternalId}
                  className="p-4 rounded-xl border border-line bg-[#FAFAF8] space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-ink truncate">{s.shopName}</span>
                      <Badge variant="success">Active</Badge>
                    </div>
                    <div className="text-[11px] text-ink-tertiary mt-1">
                      Tracked since {new Date(s.trackingSince).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-line-subtle flex items-center justify-between">
                    <a
                      href={`https://www.etsy.com/shop/${encodeURIComponent(s.shopName)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-ink-tertiary hover:text-ink flex items-center gap-1"
                    >
                      Etsy Store <ExternalLink className="h-3 w-3" />
                    </a>

                    <Link href={`/shops/${s.shopExternalId}`}>
                      <Button variant="secondary" size="compact" className="text-xs">
                        View Intelligence →
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 3. PLANNED KEYWORDS TAB */}
      {activeTab === "keywords" && (
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
          <div>
            <Heading as="h2" size="h4">
              Discovered Keyword Planning Lists ({keywords.length})
            </Heading>
            <Text size="body-sm" color="secondary" className="mt-0.5">
              High-intent Etsy keyword clusters discovered across your search runs.
            </Text>
          </div>

          <div className="overflow-x-auto border border-line rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAF8] border-b border-line text-ink-secondary font-semibold">
                <tr>
                  <th className="p-3">Keyword / Niche</th>
                  <th className="p-3">Word Count</th>
                  <th className="p-3">Discovered Listings</th>
                  <th className="p-3">Est. Daily Velocity</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {keywords.map((k) => (
                  <tr key={k.keyword} className="hover:bg-[#FAFAF8]">
                    <td className="p-3 font-bold text-ink">{k.keyword}</td>
                    <td className="p-3 font-mono">{k.keyword.split(/\s+/).length} words</td>
                    <td className="p-3 font-mono">{k.count} products</td>
                    <td className="p-3 font-mono text-[#0E8F5D] font-bold">{k.estDaily} / day</td>
                    <td className="p-3 text-right">
                      <Link href={`/prospects?search=${encodeURIComponent(k.keyword)}`}>
                        <Button variant="secondary" size="compact" className="text-xs">
                          Research Stream →
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
