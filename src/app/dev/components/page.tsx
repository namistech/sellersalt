"use client";

import { useMemo, useState } from "react";
import { Grid2x2, LayoutList, Mail, Plus, Search as SearchIcon, Trash2 } from "lucide-react";
import {
  Alert,
  Avatar,
  AvatarGroup,
  Badge,
  Breadcrumbs,
  Button,
  Card,
  Caption,
  Checkbox,
  DataText,
  Dialog,
  Divider,
  Drawer,
  Heading,
  IconButton,
  Input,
  InteractiveCard,
  Label,
  Radio,
  Select,
  SearchInput,
  Skeleton,
  Spinner,
  StatusIndicator,
  Switch,
  Tabs,
  Text,
  Textarea,
  Tooltip,
} from "@/components/ui";
import {
  ActiveFilters,
  BarChart,
  BeforeAfter,
  BulkActionBar,
  Column,
  Comparison,
  FilterBar,
  FilterGroup,
  LineChart,
  Metric,
  MetricCard,
  RankingRow,
  ResultsCount,
  SortControl,
  SparklineMetric,
  Table,
  ViewToggle,
} from "@/components/data";
import {
  AlertCard,
  Benchmark,
  BenchmarkRange,
  InsightCard,
  IssueCard,
  OpportunityCard,
  RecommendationCard,
  Score,
  ScoreBar,
  ScoreBreakdown,
  ScoreRing,
} from "@/components/intelligence";

// Internal verification surface only — not a product page, not linked
// from any navigation. Exercises every primitive/core component's real
// interaction wiring (dialogs open/close, tabs switch, table
// sort/select, chart states) rather than just rendering static markup,
// so this also functions as a TypeScript-level integration check
// across the whole barrel export. See
// docs/design/frontend-execution-plan-v1.md.
//
// Mock data below is intentionally SellerSalt-flavored (per this
// task's brief) but lives only in this page — no component imports
// from it, and no component hardcodes an Etsy/agency/institute concept.

interface MockProspect {
  id: string;
  shop: string;
  listing: string;
  price: number;
  sales: number;
  reviewCount: number;
}

const MOCK_PROSPECTS: MockProspect[] = [
  { id: "1", shop: "Luna & Co.", listing: "Ceramic Mug — Sage Green", price: 24, sales: 812, reviewCount: 340 },
  { id: "2", shop: "Willowbrook Studio", listing: "Linen Napkin Set", price: 38, sales: 512, reviewCount: 190 },
  { id: "3", shop: "Cedarwood Goods", listing: "Walnut Cutting Board", price: 56, sales: 1204, reviewCount: 610 },
  { id: "4", shop: "Marrow & Ash", listing: "Hand-poured Soy Candle", price: 18, sales: 2890, reviewCount: 1420 },
];

const REVENUE_TREND = [
  { day: "Mon", revenue: 420 },
  { day: "Tue", revenue: 480 },
  { day: "Wed", revenue: 390 },
  { day: "Thu", revenue: 610 },
  { day: "Fri", revenue: 705 },
  { day: "Sat", revenue: 640 },
  { day: "Sun", revenue: 590 },
];

const CATEGORY_COMPARISON = [
  { category: "Home", you: 62, market: 48 },
  { category: "Kitchen", you: 41, market: 55 },
  { category: "Decor", you: 78, market: 60 },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <Heading as="h2" size="h3">
        {title}
      </Heading>
      <div className="flex flex-wrap items-start gap-4">{children}</div>
    </section>
  );
}

export default function ComponentsDevPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tab, setTab] = useState("overview");
  const [checked, setChecked] = useState(true);
  const [radioValue, setRadioValue] = useState("a");
  const [switchOn, setSwitchOn] = useState(false);
  const [search, setSearch] = useState("");
  const [showError, setShowError] = useState(false);
  const [alertVisible, setAlertVisible] = useState(true);

  // --- Table demo state ---
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<string>("sales");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [view, setView] = useState("table");
  const [priceFilterActive, setPriceFilterActive] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [chartState, setChartState] = useState<"ready" | "loading" | "empty" | "error" | "stale">("ready");

  const sortedProspects = useMemo(() => {
    const sorted = [...MOCK_PROSPECTS].sort((a, b) => {
      const aVal = a[sortKey as keyof MockProspect];
      const bVal = b[sortKey as keyof MockProspect];
      if (typeof aVal === "number" && typeof bVal === "number") return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      return sortDirection === "asc" ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });
    return priceFilterActive ? sorted.filter((p) => p.price < 40) : sorted;
  }, [sortKey, sortDirection, priceFilterActive]);

  const prospectColumns: Column<MockProspect>[] = [
    { key: "shop", header: "Shop", render: (r) => r.shop, sortable: true },
    { key: "listing", header: "Listing", render: (r) => r.listing },
    { key: "price", header: "Price", render: (r) => `$${r.price}`, sortable: true, align: "right" },
    { key: "sales", header: "Lifetime sales", render: (r) => r.sales.toLocaleString(), sortable: true, align: "right" },
    { key: "reviewCount", header: "Reviews", render: (r) => r.reviewCount.toLocaleString(), sortable: true, align: "right" },
  ];

  function toggleSort(key: string) {
    if (key === sortKey) setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDirection("desc");
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-10 p-8">
      <div>
        <Heading as="h1" size="display-sm">
          SellerSalt UI primitives
        </Heading>
        <Text color="secondary" className="mt-1">
          Internal verification surface — not a product page.
        </Text>
      </div>

      <Section title="Typography">
        <div className="flex flex-col gap-2">
          <Heading as="h1" size="h1">
            Heading h1
          </Heading>
          <Heading as="h2" size="h2">
            Heading h2
          </Heading>
          <Text>Body text, default.</Text>
          <Text size="body-sm" color="secondary">
            Body small, secondary.
          </Text>
          <Label>Form label</Label>
          <Label required>Required label</Label>
          <Caption>Caption / metadata text</Caption>
          <DataText size="data-lg" tone="positive">
            +12.4%
          </DataText>
        </div>
      </Section>

      <Section title="Buttons">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="tertiary">Tertiary</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="success">Success</Button>
        <Button variant="link">Link button</Button>
        <Button variant="primary" leadingIcon={<Plus />}>
          With icon
        </Button>
        <Button variant="primary" loading>
          Loading
        </Button>
        <Button variant="primary" disabled>
          Disabled
        </Button>
        <Button variant="primary" size="compact">
          Compact
        </Button>
        <Button variant="primary" size="large">
          Large
        </Button>
        <IconButton icon={<Trash2 />} variant="destructive" aria-label="Delete" />
        <IconButton icon={<SearchIcon />} aria-label="Search" loading />
      </Section>

      <Section title="Form controls">
        <div className="flex w-full max-w-sm flex-col gap-4">
          <Input label="Email" placeholder="you@example.com" leadingIcon={<Mail />} required />
          <Input
            label="Shop name"
            error={showError ? "This field is required." : undefined}
            helpText={showError ? undefined : "Shown to buyers on your storefront."}
          />
          <Button variant="secondary" size="compact" onClick={() => setShowError((v) => !v)}>
            Toggle error state
          </Button>
          <Textarea label="Notes" helpText="Optional." />
          <Select
            label="Marketplace"
            placeholder="Select a marketplace"
            options={[
              { value: "etsy", label: "Etsy" },
              { value: "shopify", label: "Shopify" },
              { value: "woocommerce", label: "WooCommerce" },
            ]}
          />
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch("")} aria-label="Search prospects" />
        </div>
        <div className="flex flex-col gap-3">
          <Checkbox label="Email me when a search completes" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          <Radio label="Option A" name="demo-radio" checked={radioValue === "a"} onChange={() => setRadioValue("a")} />
          <Radio label="Option B" name="demo-radio" checked={radioValue === "b"} onChange={() => setRadioValue("b")} />
          <Switch label="Live mode" description="Use real payment credentials." checked={switchOn} onChange={(e) => setSwitchOn(e.target.checked)} />
        </div>
      </Section>

      <Section title="Badges & status">
        <Badge variant="neutral">Neutral</Badge>
        <Badge variant="success">Success</Badge>
        <Badge variant="warning">Warning</Badge>
        <Badge variant="danger">Danger</Badge>
        <Badge variant="info">Info</Badge>
        <Badge variant="gold">Gold</Badge>
        <StatusIndicator status="connected" />
        <StatusIndicator status="syncing" />
        <StatusIndicator status="pending" />
        <StatusIndicator status="disconnected" />
        <StatusIndicator status="failed" />
      </Section>

      <Section title="Avatars">
        <Avatar name="Jordan Miller" size="lg" status="active" />
        <Avatar name="Luna" size="md" />
        <Avatar size="sm" />
        <AvatarGroup avatars={[{ name: "A B" }, { name: "C D" }, { name: "E F" }, { name: "G H" }, { name: "I J" }]} max={3} />
      </Section>

      <Section title="Cards">
        <Card className="w-64">
          <Text weight="semibold">Default card</Text>
          <Text size="body-sm" color="secondary">
            Border, no shadow.
          </Text>
        </Card>
        <Card variant="elevated" className="w-64">
          <Text weight="semibold">Elevated card</Text>
          <Text size="body-sm" color="secondary">
            Shadow, no border.
          </Text>
        </Card>
        <InteractiveCard className="w-64" onClick={() => alert("Interactive card clicked")}>
          <Text weight="semibold">Interactive card</Text>
          <Text size="body-sm" color="secondary">
            Renders as a real &lt;button&gt;.
          </Text>
        </InteractiveCard>
      </Section>

      <Section title="Feedback">
        <Spinner />
        <Skeleton variant="text" className="w-32" />
        <Skeleton variant="circle" className="h-10 w-10" />
        {alertVisible && (
          <Alert variant="warning" title="Sync delayed" onDismiss={() => setAlertVisible(false)}>
            This shop hasn't synced in 6 hours.
          </Alert>
        )}
        <Tooltip content="Tooltip content" side="top">
          <Button variant="secondary">Hover or focus me</Button>
        </Tooltip>
      </Section>

      <Section title="Overlays">
        <Button onClick={() => setDialogOpen(true)}>Open dialog</Button>
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title="Confirm action"
          description="This is a description of the dialog's purpose."
          actions={
            <>
              <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setDialogOpen(false)}>
                Confirm
              </Button>
            </>
          }
        >
          <Text>Dialog body content goes here.</Text>
        </Dialog>

        <Button onClick={() => setDrawerOpen(true)}>Open drawer</Button>
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Filters" description="Refine your search.">
          <Text>Drawer body content goes here.</Text>
        </Drawer>
      </Section>

      <Section title="Tabs">
        <Tabs value={tab} onChange={setTab} className="w-full">
          <Tabs.List aria-label="Demo tabs">
            <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
            <Tabs.Trigger value="products">Products</Tabs.Trigger>
            <Tabs.Trigger value="disabled" disabled>
              Disabled
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Panel value="overview">
            <Text>Overview panel content.</Text>
          </Tabs.Panel>
          <Tabs.Panel value="products">
            <Text>Products panel content.</Text>
          </Tabs.Panel>
        </Tabs>
      </Section>

      <Section title="Breadcrumbs">
        <div className="flex w-full flex-col gap-3">
          <Breadcrumbs items={[{ label: "Agency", href: "#" }, { label: "Clients", href: "#" }, { label: "Luna & Co." }]} />
          <Divider />
          <Breadcrumbs
            items={[
              { label: "Agency", href: "#" },
              { label: "Clients", href: "#" },
              { label: "Luna & Co.", href: "#" },
              { label: "Shops", href: "#" },
              { label: "lunaandco-etsy" },
            ]}
          />
        </div>
      </Section>

      <Divider />
      <div>
        <Heading as="h1" size="display-sm">
          Data + Intelligence components
        </Heading>
        <Text color="secondary" className="mt-1">
          Built on the primitives above — src/components/data and src/components/intelligence.
        </Text>
      </div>

      <Section title="Metrics">
        <MetricCard label="Revenue" value="4,820" unit="$" unitPosition="prefix" delta={12.4} comparisonLabel="vs last 30 days" />
        <MetricCard label="Orders" value="128" delta={-3.1} comparisonLabel="vs last 30 days" />
        <MetricCard label="Conversion rate" value="3.2" unit="%" estimated />
        <MetricCard label="Shop views" unavailable />
        <SparklineMetric label="Revenue (7d)" value="4,820" unit="$" unitPosition="prefix" delta={12.4} comparisonLabel="vs prior week" data={REVENUE_TREND.map((d) => d.revenue)} />
        <MetricCard label="Last sync" value="—" unavailable freshness={{ state: "stale", timestamp: new Date(Date.now() - 3 * 86_400_000) }} />
      </Section>

      <Section title="Score system">
        <ScoreRing value={78} />
        <ScoreRing value={42} label="SEO Score" />
        <ScoreRing tier="unavailable" label="Not scanned yet" />
        <div className="flex flex-col gap-2">
          <ScoreBar value={91} label="Listing quality" />
          <ScoreBar value={58} label="Fulfillment speed" />
          <ScoreBar value={22} label="Response rate" />
        </div>
        <ScoreBreakdown
          value={64}
          label="Shop Health"
          benchmarkValue={78}
          benchmarkLabel="Category average"
          issues={[
            { title: "3 listings missing tags", description: "Adding tags improves discoverability in search.", severity: "medium" },
            { title: "Slow response time", description: "Average reply time is 36 hours, above the recommended 24.", severity: "high" },
          ]}
        />
      </Section>

      <Section title="Benchmarks">
        <Benchmark label="Your shop" value={62} benchmarkLabel="Top performers" benchmarkValue={78} unit=" pts" />
        <BenchmarkRange label="Average order value" value={34} min={10} max={80} benchmarkValue={45} benchmarkLabel="Category median" unit="$" unitPosition="prefix" />
      </Section>

      <Section title="Insights, issues & opportunities">
        <InsightCard
          title="Your review velocity is accelerating"
          explanation="You've gained 42 reviews in the last 30 days, up from 18 the prior month."
          source="AI"
          confidence="high"
          freshness={{ state: "recent", timestamp: new Date(Date.now() - 4 * 60_000) }}
          onViewDetails={() => {}}
        />
        <IssueCard
          title="Missing alt text on 12 listing images"
          description="Listings without image descriptions rank lower in accessibility-aware search."
          severity="medium"
          affectedObject="lunaandco-etsy"
          onViewRecommendation={() => {}}
          freshness={{ state: "recent", timestamp: new Date(Date.now() - 20 * 60_000) }}
        />
        <OpportunityCard
          title="Ceramic mugs are trending in your category"
          description="Search volume for 'ceramic mug' is up 34% this month with below-average competition."
          impact="high"
          confidence="medium"
          affectedObject="Home & Kitchen"
          onViewRecommendation={() => {}}
        />
      </Section>

      <Section title="Recommendations — Advise / Prepare / Apply / Automate">
        <RecommendationCard
          title="Add seasonal keywords to your title"
          reasoning="Competitor listings ranking above yours include seasonal terms your title is missing."
          mode="advise"
          confidence="medium"
        />
        <RecommendationCard
          title="Rewrite listing description for SEO"
          reasoning="A generated description incorporating your top 5 missing keywords is ready to preview."
          mode="prepare"
          onAction={() => {}}
        />
        <RecommendationCard
          title="Update tags on 'Ceramic Mug — Sage Green'"
          reasoning="Adding 3 high-volume tags is estimated to improve search visibility."
          mode="apply"
          expectedImpact={<Text size="body-sm" color="secondary">Est. +8% visibility</Text>}
          onAction={() => {}}
        />
        <RecommendationCard
          title="Auto-tag new listings on import"
          reasoning="Automatically apply SEO-optimized tags whenever a new listing is synced."
          mode="automate"
        />
      </Section>

      <Section title="Intelligence alerts (distinct from Notifications/Insights)">
        <div className="flex w-full max-w-md flex-col gap-3">
          <AlertCard
            title="Shop hasn't synced in 18 hours"
            description="Data shown may be out of date until the next sync completes."
            severity="warning"
            freshness={{ state: "stale", timestamp: new Date(Date.now() - 18 * 3_600_000) }}
            onView={() => {}}
            onDismiss={() => {}}
            onMute={() => {}}
          />
          <AlertCard
            title="Payment method failed"
            description="Your subscription will be paused if this isn't resolved within 3 days."
            severity="danger"
            freshness={{ state: "recent", timestamp: new Date(Date.now() - 30 * 60_000) }}
            onView={() => {}}
          />
        </div>
      </Section>

      <Section title="Comparisons">
        <BeforeAfter beforeValue={<DataText size="data-lg">42</DataText>} afterValue={<DataText size="data-lg">78</DataText>} />
        <Comparison
          leftLabel="You"
          leftValue={<DataText size="data-lg">62</DataText>}
          rightLabel="Top competitor"
          rightValue={
            <DataText size="data-lg" tone="secondary">
              85
            </DataText>
          }
        />
      </Section>

      <Section title="Rankings">
        <div className="flex w-full max-w-md flex-col">
          <RankingRow rank={1} previousRank={2} label="Cedarwood Goods" context="Home & Kitchen" />
          <RankingRow rank={2} previousRank={1} label="Marrow & Ash" context="Candles" />
          <RankingRow rank={3} label="Luna & Co." context="Home & Kitchen" />
          <RankingRow rank={5} previousRank={5} label="Willowbrook Studio" context="Textiles" />
        </div>
      </Section>

      <Section title="Table foundation">
        <div className="flex w-full flex-col gap-3">
          <FilterBar>
            <SearchInput aria-label="Search prospects" placeholder="Search shops or listings…" />
            <FilterGroup label="Price" activeSummary={priceFilterActive ? "Price: under $40" : undefined}>
              <Checkbox label="Under $40" checked={priceFilterActive} onChange={(e) => setPriceFilterActive(e.target.checked)} />
            </FilterGroup>
            <SortControl
              options={[
                { value: "sales", label: "Lifetime sales" },
                { value: "price", label: "Price" },
                { value: "reviewCount", label: "Reviews" },
              ]}
              value={sortKey}
              onChange={(v) => toggleSort(v)}
            />
            <ViewToggle
              options={[
                { value: "table", label: "Table view", icon: <LayoutList /> },
                { value: "grid", label: "Grid view", icon: <Grid2x2 /> },
              ]}
              value={view}
              onChange={setView}
            />
            <ResultsCount count={sortedProspects.length} label="prospects" className="ml-auto" />
          </FilterBar>
          <ActiveFilters
            filters={priceFilterActive ? [{ key: "price", label: "Price: under $40" }] : []}
            onRemove={() => setPriceFilterActive(false)}
          />
          <BulkActionBar
            selectedCount={selectedIds.size}
            onClear={() => setSelectedIds(new Set())}
            actions={
              <>
                <Button variant="secondary" size="compact">
                  Add to collection
                </Button>
                <Button variant="destructive" size="compact">
                  Remove
                </Button>
              </>
            }
          />
          <Table
            aria-label="Prospects"
            columns={prospectColumns}
            rows={sortedProspects}
            getRowId={(r) => r.id}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={toggleSort}
            selectedIds={selectedIds}
            onSelectRow={toggleSelect}
            onSelectAll={() => setSelectedIds(new Set(selectedIds.size === sortedProspects.length ? [] : sortedProspects.map((p) => p.id)))}
            loading={tableLoading}
            density="compact"
          />
          <Button variant="secondary" size="compact" onClick={() => setTableLoading((v) => !v)} className="self-start">
            Toggle loading state
          </Button>
        </div>
      </Section>

      <Section title="Charts">
        <div className="flex w-full flex-col gap-3">
          <FilterBar>
            {(["ready", "loading", "empty", "error", "stale"] as const).map((s) => (
              <Button key={s} variant={chartState === s ? "primary" : "secondary"} size="compact" onClick={() => setChartState(s)}>
                {s}
              </Button>
            ))}
          </FilterBar>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Card padding="md">
              <Text weight="semibold" className="mb-2">
                Revenue, last 7 days
              </Text>
              <LineChart
                data={REVENUE_TREND}
                xKey="day"
                series={[{ key: "revenue", label: "Revenue" }]}
                state={chartState}
                valueFormatter={(v) => `$${v}`}
                accessibleSummary="Line chart of daily revenue over the last 7 days, ranging from $390 to $705."
                staleFreshness={{ state: "stale", timestamp: new Date(Date.now() - 2 * 86_400_000) }}
              />
            </Card>
            <Card padding="md">
              <Text weight="semibold" className="mb-2">
                You vs. category average
              </Text>
              <BarChart
                data={CATEGORY_COMPARISON}
                xKey="category"
                series={[
                  { key: "you", label: "You" },
                  { key: "market", label: "Category avg" },
                ]}
                state={chartState}
                accessibleSummary="Bar chart comparing your shop's score to the category average across three categories."
              />
            </Card>
          </div>
        </div>
      </Section>
    </div>
  );
}
