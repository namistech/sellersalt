"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AreaChart,
  LineChart,
  BarChart,
  HorizontalBarChart,
  SegmentedGauge,
  BulletGauge,
  DonutChart,
  DistributionHistogram,
  ComparisonChart,
  Sparkline,
} from "@/components/data/charts";
import { Card, Heading, Text, Badge, Button, ViewSwitch, type ViewMode } from "@/components/ui";
import { DataProvenanceBadge } from "@/components/data/DataProvenanceBadge";
import { ArrowLeft, BarChart3, Sparkles } from "lucide-react";

export function ChartShowcaseClient() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Sample Data Primitives
  const monthlySalesData = [
    { month: "Jan", sales: 120, revenue: 3420, baseline: 100 },
    { month: "Feb", sales: 145, revenue: 4130, baseline: 110 },
    { month: "Mar", sales: 190, revenue: 5415, baseline: 130 },
    { month: "Apr", sales: 240, revenue: 6840, baseline: 160 },
    { month: "May", sales: 310, revenue: 8835, baseline: 200 },
    { month: "Jun", sales: 420, revenue: 11970, baseline: 240 },
    { month: "Jul", sales: 510, revenue: 14535, baseline: 280 },
    { month: "Aug", sales: 640, revenue: 18240, baseline: 320 },
  ];

  const tagPenetrationData = [
    { label: "acrylic desk planner", value: 88, color: "#0E8F5D" },
    { label: "dry erase calendar", value: 74, color: "#16C784" },
    { label: "habit tracker board", value: 62, color: "#3B82F6" },
    { label: "minimalist office decor", value: 55, color: "#8B5CF6" },
    { label: "custom desk organizer", value: 41, color: "#FFB020" },
    { label: "memo stand aesthetic", value: 28, color: "#7C847E" },
  ];

  const ratingDistributionData = [
    { label: "5 Stars", value: 84, color: "#0E8F5D" },
    { label: "4 Stars", value: 11, color: "#16C784" },
    { label: "3 Stars", value: 3, color: "#FFB020" },
    { label: "2 Stars", value: 1, color: "#F97316" },
    { label: "1 Star", value: 1, color: "#EF4444" },
  ];

  const catalogMixData = [
    { name: "Digital Downloads", value: 65, color: "#0E8F5D" },
    { name: "Physical Prints", value: 25, color: "#3B82F6" },
    { name: "Custom Bundles", value: 10, color: "#FFB020" },
  ];

  const priceDistributionData = [
    { range: "< $15", count: 12, isObservedBin: false },
    { range: "$15–$25", count: 48, isObservedBin: false },
    { range: "$25–$35", count: 115, isObservedBin: true },
    { range: "$35–$50", count: 62, isObservedBin: false },
    { range: "$50+", count: 18, isObservedBin: false },
  ];

  const competitorComparisonData = [
    { day: "Day 1", storeA: 14, storeB: 8, average: 6 },
    { day: "Day 2", storeA: 18, storeB: 11, average: 7 },
    { day: "Day 3", storeA: 22, storeB: 10, average: 7 },
    { day: "Day 4", storeA: 28, storeB: 15, average: 8 },
    { day: "Day 5", storeA: 34, storeB: 14, average: 9 },
    { day: "Day 6", storeA: 42, storeB: 18, average: 10 },
    { day: "Day 7", storeA: 55, storeB: 20, average: 11 },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-xs font-semibold text-ink-tertiary hover:text-ink transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Admin
            </Link>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="h-8 w-8 rounded-lg bg-[#141B16] text-white flex items-center justify-center font-bold text-sm border border-[#2A362D]">
              <BarChart3 className="h-4 w-4 text-[#16C784]" />
            </div>
            <Heading as="h1" size="h2">
              Modern Chart System Showcase
            </Heading>
            <Badge variant="success">10 Visual Primitives</Badge>
          </div>
          <Text size="body-sm" color="secondary" className="mt-1">
            Standardized chart styles, micro-visualizations, gauges, and distributions built for SellerSalt intelligence.
          </Text>
        </div>

        <div className="flex items-center gap-3">
          <ViewSwitch value={viewMode} onChange={setViewMode} modes={["grid", "list"]} />
        </div>
      </div>

      {/* Grid of Chart Styles */}
      <div className={`grid gap-6 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
        
        {/* Style 1: Modern Area Chart */}
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-label-sm font-bold uppercase tracking-wider text-ink-tertiary">
                Style A · Modern Area + Line Chart
              </span>
              <h3 className="text-sm font-bold text-ink">Monthly Sales Trajectory &amp; Growth</h3>
            </div>
            <DataProvenanceBadge type="ESTIMATED" />
          </div>
          <AreaChart
            data={monthlySalesData}
            xKey="month"
            series={[
              { key: "sales", label: "Monthly Units Sold", colorIndex: 0 },
            ]}
            height={200}
            valueFormatter={(v) => `${v} units`}
            accessibleSummary="Area chart of monthly sales growth"
          />
          <div className="text-meta text-ink-tertiary pt-1 border-t border-line-subtle">
            <strong>Used in:</strong> Product Intelligence (`/products/[id]`), Shop Research (`/shops/[id]`).
          </div>
        </Card>

        {/* Style 2: Minimal Line Chart */}
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-label-sm font-bold uppercase tracking-wider text-ink-tertiary">
                Style B · Minimal Line Chart
              </span>
              <h3 className="text-sm font-bold text-ink">Search Volume &amp; Demand Index</h3>
            </div>
            <DataProvenanceBadge type="SELLERSALT_SCORE" />
          </div>
          <LineChart
            data={monthlySalesData}
            xKey="month"
            series={[
              { key: "sales", label: "Search Index", colorIndex: 0 },
              { key: "baseline", label: "Category Median", colorIndex: 6, strokeDasharray: "3 3" },
            ]}
            height={200}
            valueFormatter={(v) => `${v} index`}
            accessibleSummary="Line chart comparing search volume to baseline"
          />
          <div className="text-meta text-ink-tertiary pt-1 border-t border-line-subtle">
            <strong>Used in:</strong> Keyword Research (`/keyword-research`), Market Research (`/spy/tracked`).
          </div>
        </Card>

        {/* Style 3: Modern Vertical Bars */}
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-label-sm font-bold uppercase tracking-wider text-ink-tertiary">
                Style D · Modern Vertical Bar Chart
              </span>
              <h3 className="text-sm font-bold text-ink">Estimated Gross Monthly Revenue</h3>
            </div>
            <DataProvenanceBadge type="ESTIMATED" />
          </div>
          <BarChart
            data={monthlySalesData}
            xKey="month"
            series={[
              { key: "revenue", label: "Revenue ($)", colorIndex: 0 },
            ]}
            height={200}
            valueFormatter={(v) => `$${Number(v).toLocaleString()}`}
            accessibleSummary="Vertical bar chart of monthly revenue"
          />
          <div className="text-meta text-ink-tertiary pt-1 border-t border-line-subtle">
            <strong>Used in:</strong> Category Hunting (`/categories`), Dashboard Streams (`/dashboard`).
          </div>
        </Card>

        {/* Style 4: Horizontal Bar Chart */}
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-label-sm font-bold uppercase tracking-wider text-ink-tertiary">
                Style E · Horizontal Bar Chart
              </span>
              <h3 className="text-sm font-bold text-ink">Tag Penetration &amp; Relevancy</h3>
            </div>
            <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
          </div>
          <HorizontalBarChart
            data={tagPenetrationData}
            height={200}
            yAxisWidth={140}
            valueFormatter={(v) => `${v}% of listings`}
            accessibleSummary="Horizontal bar chart of tag frequency"
          />
          <div className="text-meta text-ink-tertiary pt-1 border-t border-line-subtle">
            <strong>Used in:</strong> Keyword Research, Product Research Tag Audit, Category Hunting.
          </div>
        </Card>

        {/* Style 5: Segmented Benchmark Gauge */}
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-label-sm font-bold uppercase tracking-wider text-ink-tertiary">
                Style F · Segmented Benchmark Gauge
              </span>
              <h3 className="text-sm font-bold text-ink">Composite Opportunity Score</h3>
            </div>
            <DataProvenanceBadge type="SELLERSALT_SCORE" />
          </div>
          <SegmentedGauge
            score={84}
            scoreMax={100}
            label="Listing Opportunity Rating"
            sublabel="Calculated across daily velocity, catalog density & moat"
          />
          <div className="text-meta text-ink-tertiary pt-1 border-t border-line-subtle">
            <strong>Used in:</strong> Shop Strategic Verdict (`/shops/[id]`), Product Opportunity (`/products/[id]`).
          </div>
        </Card>

        {/* Style 6: Bullet / Target Gauge */}
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-label-sm font-bold uppercase tracking-wider text-ink-tertiary">
                Style G · Bullet / Target Gauge
              </span>
              <h3 className="text-sm font-bold text-ink">Daily Sales Velocity vs Benchmark</h3>
            </div>
            <DataProvenanceBadge type="ESTIMATED" />
          </div>
          <BulletGauge
            actual={5.8}
            benchmark={2.2}
            target={6.0}
            unit=" sales/day"
            label="Velocity Moat"
            sublabel="Observed sales acceleration vs category median"
          />
          <div className="text-meta text-ink-tertiary pt-1 border-t border-line-subtle">
            <strong>Used in:</strong> Opportunity Radar (`/radar`), Product Economics (`/products/[id]`).
          </div>
        </Card>

        {/* Style 7: Donut / Ring Chart */}
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-label-sm font-bold uppercase tracking-wider text-ink-tertiary">
                Style H · Donut / Ring Chart
              </span>
              <h3 className="text-sm font-bold text-ink">Catalog Product Type Breakdown</h3>
            </div>
            <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
          </div>
          <DonutChart
            data={catalogMixData}
            height={180}
            centerMetric={{ value: "148", label: "Active Listings" }}
            valueFormatter={(v) => `${v}%`}
            accessibleSummary="Donut chart showing catalog product mix"
          />
          <div className="text-meta text-ink-tertiary pt-1 border-t border-line-subtle">
            <strong>Used in:</strong> Shop Intelligence (`/shops/[id]`), Category Overview.
          </div>
        </Card>

        {/* Style 8: Distribution Histogram */}
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-label-sm font-bold uppercase tracking-wider text-ink-tertiary">
                Style I · Distribution Histogram
              </span>
              <h3 className="text-sm font-bold text-ink">Market Price Spread Percentiles</h3>
            </div>
            <DataProvenanceBadge type="ESTIMATED" />
          </div>
          <DistributionHistogram
            data={priceDistributionData}
            height={180}
            valueFormatter={(v) => `${v} competitor listings`}
            accessibleSummary="Price distribution histogram"
          />
          <div className="text-meta text-ink-tertiary pt-1 border-t border-line-subtle">
            <strong>Used in:</strong> Category Hunting (`/categories`), Product Research.
          </div>
        </Card>

        {/* Style 9: Comparison Chart */}
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-label-sm font-bold uppercase tracking-wider text-ink-tertiary">
                Style J · Multi-Series Comparison Chart
              </span>
              <h3 className="text-sm font-bold text-ink">Competitor 7-Day Velocity Delta</h3>
            </div>
            <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
          </div>
          <ComparisonChart
            data={competitorComparisonData}
            xKey="day"
            series={[
              { key: "storeA", label: "Target Shop (+55)", color: "#0E8F5D" },
              { key: "storeB", label: "Competitor B (+20)", color: "#3B82F6" },
              { key: "average", label: "Niche Avg (+11)", color: "#7C847E", strokeDasharray: "3 3" },
            ]}
            height={200}
            valueFormatter={(v) => `+${v} orders`}
            accessibleSummary="Multi-line chart comparing competitor performance"
          />
          <div className="text-meta text-ink-tertiary pt-1 border-t border-line-subtle">
            <strong>Used in:</strong> Shop Tracking (`/spy/tracked`), Shop Comparison.
          </div>
        </Card>

        {/* Style 10: Inline Sparklines in Data Table */}
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-label-sm font-bold uppercase tracking-wider text-ink-tertiary">
                Style C · Sparklines in Data Table
              </span>
              <h3 className="text-sm font-bold text-ink">Dense Table Row Velocity Trends</h3>
            </div>
            <DataProvenanceBadge type="ESTIMATED" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-ink-tertiary uppercase text-label-sm">
                  <th className="py-2 pr-4 font-semibold">Store / Product</th>
                  <th className="py-2 pr-4 font-semibold text-right">Daily Sales</th>
                  <th className="py-2 pr-4 font-semibold text-center">7-Day Trend</th>
                  <th className="py-2 font-semibold text-right">Momentum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                <tr>
                  <td className="py-2.5 pr-4 font-medium text-ink">Acrylic Desk Studio</td>
                  <td className="py-2.5 pr-4 font-mono text-right font-bold text-[#0E8F5D]">5.8/d</td>
                  <td className="py-2.5 pr-4 text-center">
                    <div className="flex justify-center">
                      <Sparkline data={[2, 3, 3.5, 4, 4.8, 5.2, 5.8]} tone="positive" width={70} height={20} />
                    </div>
                  </td>
                  <td className="py-2.5 text-right text-xs font-bold text-[#0E8F5D]">+34%</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-medium text-ink">Planner Haven Co</td>
                  <td className="py-2.5 pr-4 font-mono text-right font-bold text-ink">3.2/d</td>
                  <td className="py-2.5 pr-4 text-center">
                    <div className="flex justify-center">
                      <Sparkline data={[4, 3.8, 3.5, 3.4, 3.2, 3.3, 3.2]} tone="neutral" width={70} height={20} />
                    </div>
                  </td>
                  <td className="py-2.5 text-right text-xs font-bold text-ink-tertiary">0%</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-medium text-ink">Minimalist Caddy</td>
                  <td className="py-2.5 pr-4 font-mono text-right font-bold text-amber-700">1.8/d</td>
                  <td className="py-2.5 pr-4 text-center">
                    <div className="flex justify-center">
                      <Sparkline data={[3.5, 3.0, 2.6, 2.2, 2.0, 1.9, 1.8]} tone="negative" width={70} height={20} />
                    </div>
                  </td>
                  <td className="py-2.5 text-right text-xs font-bold text-amber-700">-22%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="text-[11px] text-ink-tertiary pt-1 border-t border-line-subtle">
            <strong>Used in:</strong> Opportunity Radar Table (`/radar`), Tracked Shops List (`/spy/tracked`).
          </div>
        </Card>

      </div>
    </div>
  );
}
