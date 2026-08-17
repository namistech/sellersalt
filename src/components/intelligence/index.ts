// Barrel export for the intelligence layer — the judgment-carrying
// components (Score, Benchmark, Insight/Issue/Opportunity/
// Recommendation/Alert/Outcome, Action progress). Built entirely on
// top of src/components/data and src/components/ui; carries no
// business/domain logic of its own — every prop is supplied by the
// caller.

export { IntelligenceCard } from "./IntelligenceCard";
export type { IntelligenceCardProps } from "./IntelligenceCard";

export { Score, ScoreRing, ScoreBar, ScoreChange, ScoreBreakdown, tierFromValue } from "./Score";
export type { ScoreProps, ScoreRingProps, ScoreChangeProps, ScoreBreakdownProps, HealthTier } from "./Score";

export { Benchmark, BenchmarkComparison, BenchmarkRange, BenchmarkPosition } from "./Benchmark";
export type { BenchmarkProps, BenchmarkComparisonProps, BenchmarkRangeProps, BenchmarkPositionProps } from "./Benchmark";

export { InsightCard } from "./InsightCard";
export type { InsightCardProps } from "./InsightCard";

export { IssueCard } from "./IssueCard";
export type { IssueCardProps, IssueSeverity } from "./IssueCard";

export { OpportunityCard } from "./OpportunityCard";
export type { OpportunityCardProps, OpportunityImpact, Confidence } from "./OpportunityCard";

export { RecommendationCard } from "./RecommendationCard";
export type { RecommendationCardProps, RecommendationMode } from "./RecommendationCard";

export { AlertCard } from "./AlertCard";
export type { AlertCardProps, AlertCardSeverity } from "./AlertCard";

export { ActionProgress, ActionStatusBadge, ActionLogItem } from "./ActionProgress";
export type { ActionProgressProps, ActionState, ActionLogItemProps } from "./ActionProgress";

export { OutcomeCard } from "./OutcomeCard";
export type { OutcomeCardProps } from "./OutcomeCard";

export { ProductResearchDrawer } from "./ProductResearchDrawer";
export type { ProductResearchDrawerProps } from "./ProductResearchDrawer";

export { ProductComparisonModal } from "./ProductComparisonModal";
export type { ProductComparisonModalProps } from "./ProductComparisonModal";

export { TaxonomyTreeBrowser } from "./TaxonomyTreeBrowser";

export { WhyThisMatters } from "./WhyThisMatters";
export type { WhyThisMattersProps } from "./WhyThisMatters";

export { OpportunityInbox } from "./OpportunityInbox";
export type { OpportunityInboxProps } from "./OpportunityInbox";
