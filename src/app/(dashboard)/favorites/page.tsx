"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, Store, Sparkles, Bookmark, ExternalLink, Compass, Download, ArrowRight, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shell";
import { Card, Alert, Button, Badge, Tabs, Eyebrow, Text } from "@/components/ui";
import { Table, EmptyState } from "@/components/data";
import { fetchProspects, updateProspect, type ProspectRow, type ProspectStatus } from "@/services/prospects";
import { fetchTrackedResearchShops, type TrackedResearchShop } from "@/services/researchShops";
import { ServiceError } from "@/services/http";
import { buildProspectColumns } from "../prospect-columns";

const CSV_COLUMNS: Array<{ key: keyof ProspectRow; label: string }> = [
  { key: "shopName", label: "Shop" },
  { key: "shopUrl", label: "Shop URL" },
  { key: "shopAgeMonths", label: "Shop Age (mo)" },
  { key: "reviewCount", label: "Reviews" },
  { key: "activeListings", label: "Active Listings" },
  { key: "totalSales", label: "Total Sales" },
  { key: "avgSellingRatio", label: "Sales/Listing" },
  { key: "estDailySales", label: "Est Daily Sales" },
  { key: "listingTitle", label: "Listing" },
  { key: "listingUrl", label: "Listing URL" },
  { key: "price", label: "Price" },
  { key: "status", label: "Status" },
];

function toCsv(rows: ProspectRow[]): string {
  const header = CSV_COLUMNS.map((c) => c.label).join(",");
  const body = rows
    .map((r) => CSV_COLUMNS.map((c) => `"${String(r[c.key] ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  return `${header}\n${body}`;
}

function downloadCsv(filename: string, rows: ProspectRow[]) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface PlannedKeywordRow {
  id: string;
  keyword: string;
  sourceShopExternalId: string | null;
  sourceListingUrl: string | null;
  createdAt: string;
}

export default function FavoritesPage() {
  const [activeTab, setActiveTab] = useState<"products" | "shops" | "keywords">("products");
  const [productRows, setProductRows] = useState<ProspectRow[]>([]);
  const [trackedShops, setTrackedShops] = useState<TrackedResearchShop[]>([]);
  const [keywords, setKeywords] = useState<PlannedKeywordRow[]>([]);
  const [keywordSearch, setKeywordSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Checkbox selection for Favorite Listings
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  async function loadAll() {
    setError(null);
    try {
      const [favs, shops, plannedRes] = await Promise.all([
        fetchProspects({ favoriteOnly: true }),
        fetchTrackedResearchShops().catch(() => []),
        fetch("/api/planned-keywords").then((r) => r.json()).catch(() => ({ keywords: [] })),
      ]);

      setProductRows(favs);
      setTrackedShops(shops);
      setKeywords(plannedRes.keywords ?? []);
    } catch (e) {
      setError(e instanceof ServiceError ? e.message : "Couldn't load Planning data.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveKeyword(id: string) {
    setKeywords((prev) => prev.filter((k) => k.id !== id));
    try {
      await fetch("/api/planned-keywords", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      loadAll();
    }
  }

  function handleExportKeywords() {
    const header = "Keyword,Word Count,Source Shop,Source Listing,Added";
    const body = filteredKeywords
      .map((k) =>
        [
          `"${k.keyword.replace(/"/g, '""')}"`,
          k.keyword.split(/\s+/).length,
          `"${k.sourceShopExternalId ?? ""}"`,
          `"${k.sourceListingUrl ?? ""}"`,
          new Date(k.createdAt).toISOString(),
        ].join(",")
      )
      .join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sellersalt-planned-keywords-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filteredKeywords = keywords.filter((k) =>
    k.keyword.toLowerCase().includes(keywordSearch.trim().toLowerCase())
  );

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

  function toggleSelectRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size >= productRows.length && productRows.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(productRows.map((p) => p.id)));
    }
  }

  function handleExportSelected() {
    const rowsToExport =
      selectedIds.size > 0
        ? productRows.filter((p) => selectedIds.has(p.id))
        : productRows;
    downloadCsv(`sellersalt-favorite-listings-${Date.now()}.csv`, rowsToExport);
  }

  function handleExportShops() {
    const header = "Shop Name,Shop External ID,Tracking Since";
    const body = trackedShops
      .map((s) => `"${s.shopName.replace(/"/g, '""')}","${s.shopExternalId}","${s.trackingSince}"`)
      .join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sellersalt-favorite-shops-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns = buildProspectColumns({
    onToggleFavorite: handleToggleFavorite,
    onStatusChange: handleStatusChange,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planning & Shortlists Hub"
        description="Unified planning lists for your favorite Etsy listings, monitored competitor shops, and high-opportunity keywords."
        primaryAction={
          activeTab === "products" && productRows.length > 0 ? (
            <Button
              variant="secondary"
              leadingIcon={<Download className="h-4 w-4" />}
              onClick={handleExportSelected}
            >
              {selectedIds.size > 0
                ? `Export Selected (${selectedIds.size}) CSV`
                : "Export All Listings CSV"}
            </Button>
          ) : activeTab === "shops" && trackedShops.length > 0 ? (
            <Button
              variant="secondary"
              leadingIcon={<Download className="h-4 w-4" />}
              onClick={handleExportShops}
            >
              Export Shops CSV
            </Button>
          ) : activeTab === "keywords" && keywords.length > 0 ? (
            <Button
              variant="secondary"
              leadingIcon={<Download className="h-4 w-4" />}
              onClick={handleExportKeywords}
            >
              Export Keywords CSV
            </Button>
          ) : undefined
        }
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
          Favorite Listings ({productRows.length})
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
          Favorite Shops ({trackedShops.length})
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

      {/* 1. FAVORITE LISTINGS TAB */}
      {activeTab === "products" && (
        <Card padding="sm" className="border-line bg-white shadow-xs">
          <Table<ProspectRow>
            aria-label="Favorite prospects"
            columns={columns}
            rows={productRows}
            getRowId={(p) => p.id}
            loading={loading}
            selectedIds={selectedIds}
            onSelectRow={toggleSelectRow}
            onSelectAll={toggleSelectAll}
            emptyState={
              <div className="py-16 px-6 text-center max-w-md mx-auto space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-2xs">
                  <Star className="h-6 w-6 fill-amber-400 text-amber-500" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-ink">No favorite product listings yet</h4>
                  <p className="text-xs text-ink-secondary leading-relaxed">
                    Star high-potential products from Opportunity Radar or Shop Profiles to save them here for quick comparison and planning.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <Link href="/radar">
                    <Button variant="primary" size="compact" className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-xs font-semibold text-white">
                      Hunt on Opportunity Radar
                    </Button>
                  </Link>
                  <Link href="/categories">
                    <Button variant="secondary" size="compact" className="text-xs">
                      Explore Categories
                    </Button>
                  </Link>
                </div>
              </div>
            }
          />
        </Card>
      )}

      {/* 2. FAVORITE SHOPS TAB */}
      {activeTab === "shops" && (
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Eyebrow>Favorite & Monitored Competitor Shops ({trackedShops.length})</Eyebrow>
              <Text size="body-sm" color="secondary" className="mt-0.5">
                Competitors whose daily sales, velocity, and catalog yield you are tracking.
              </Text>
            </div>
            <Link href="/shop-intelligence">
              <Button variant="primary" size="compact" className="bg-[#0E8F5D] text-xs font-semibold text-white">
                + Track New Shop
              </Button>
            </Link>
          </div>

          {trackedShops.length === 0 ? (
            <div className="py-16 px-6 text-center max-w-md mx-auto space-y-4 border border-dashed border-line rounded-xl">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-2xs">
                <Store className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-ink">No favorite shops saved yet</h4>
                <p className="text-xs text-ink-secondary leading-relaxed">
                  Search any Etsy shop with Shop Intelligence and star them to keep track of their catalog additions and revenue growth.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <Link href="/shop-intelligence">
                  <Button variant="primary" size="compact" className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-xs font-semibold text-white">
                    Research Competitor Shops
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {trackedShops.map((s) => (
                <div
                  key={s.shopExternalId}
                  className="p-4 rounded-xl border border-line bg-[#FAFAF8] space-y-3 flex flex-col justify-between shadow-2xs"
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <Eyebrow>Your Keyword Planning List ({keywords.length})</Eyebrow>
              <Text size="body-sm" color="secondary" className="mt-0.5">
                Keywords you've explicitly added to planning from Shop Intelligence or Keyword Research.
              </Text>
            </div>
            <input
              type="text"
              value={keywordSearch}
              onChange={(e) => setKeywordSearch(e.target.value)}
              placeholder="Search planned keywords…"
              className="px-3 py-1.5 rounded-lg border border-line text-xs w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-[#0E8F5D]/30"
            />
          </div>

          {keywords.length === 0 ? (
            <div className="py-16 px-6 text-center max-w-md mx-auto space-y-4 border border-dashed border-line rounded-xl">
              <div className="h-12 w-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto shadow-2xs">
                <Bookmark className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-ink">No planned keywords yet</h4>
                <p className="text-xs text-ink-secondary leading-relaxed">
                  Collect high-converting buyer search terms from Keyword Research or competitor tag analyses to use in your listing titles and tags.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <Link href="/keyword-research">
                  <Button variant="primary" size="compact" className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-xs font-semibold text-white">
                    Find Profitable Keywords
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto border border-line rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAF8] border-b border-line text-ink-secondary font-semibold">
                  <tr>
                    <th className="p-3">Keyword / Niche</th>
                    <th className="p-3">Word Count</th>
                    <th className="p-3">Source</th>
                    <th className="p-3">Added</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle">
                  {filteredKeywords.map((k) => (
                    <tr key={k.id} className="hover:bg-[#FAFAF8]">
                      <td className="p-3 font-bold text-ink">{k.keyword}</td>
                      <td className="p-3 font-mono">{k.keyword.split(/\s+/).length} words</td>
                      <td className="p-3">
                        {k.sourceListingUrl ? (
                          <a
                            href={k.sourceListingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-ink-tertiary hover:text-ink flex items-center gap-1"
                          >
                            Evidence listing <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-ink-tertiary">—</span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-ink-tertiary">{new Date(k.createdAt).toLocaleDateString()}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/prospects?search=${encodeURIComponent(k.keyword)}`}>
                            <Button variant="secondary" size="compact" className="text-xs">
                              Research →
                            </Button>
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleRemoveKeyword(k.id)}
                            className="p-1.5 rounded text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Remove from planning"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
