// Barrel export for the data layer — generic, ecommerce-agnostic
// building blocks for metrics, freshness, rankings, comparisons,
// tables, and toolbars. See src/components/intelligence for the
// judgment-carrying layer built on top of these.

export { formatRelativeTime, formatShortDate, deltaTone, formatDelta } from "./format";
export type { DeltaTone } from "./format";

export { Freshness } from "./Freshness";
export type { FreshnessProps, FreshnessState } from "./Freshness";

export { EmptyState } from "./EmptyState";
export type { EmptyStateProps, EmptyStateTone } from "./EmptyState";

export { Metric, MetricCard, MetricComparison, MetricTrend, MetricDelta, SparklineMetric } from "./Metric";
export type { MetricProps, MetricCardProps, MetricComparisonProps, MetricTrendProps, MetricDeltaProps, SparklineMetricProps } from "./Metric";

export { RankingRow, RankingChange, PositionIndicator } from "./Ranking";
export type { RankingRowProps, RankingChangeProps, PositionIndicatorProps } from "./Ranking";

export { Comparison, ComparisonRow, ComparisonMetric, BeforeAfter } from "./Comparison";
export type { ComparisonProps, ComparisonMetricProps, BeforeAfterProps } from "./Comparison";

export { Table } from "./Table";
export type { TableProps, Column, TableDensity } from "./Table";

export { FilterBar, FilterGroup, ActiveFilters, SortControl, ViewToggle, ResultsCount, BulkActionBar } from "./Toolbar";
export type {
  FilterBarProps,
  FilterGroupProps,
  ActiveFilter,
  ActiveFiltersProps,
  SortOption,
  SortControlProps,
  ViewOption,
  ViewToggleProps,
  ResultsCountProps,
  BulkActionBarProps,
} from "./Toolbar";

export * from "./charts";
