import type { ReactNode } from "react";
import { Target, TrendingUp } from "lucide-react";
import { Badge, Button, Text } from "@/components/ui";
import type { FreshnessProps } from "@/components/data";
import { IntelligenceCard } from "./IntelligenceCard";

// design-system-v1.md §12 — Opportunity: always positive-toned, even at
// "high" impact — an opportunity is good news by definition, so it must
// never read visually like an Issue (danger-toned).

export type OpportunityImpact = "high" | "medium" | "low";
export type Confidence = "high" | "medium" | "low";

const IMPACT_CONFIG: Record<OpportunityImpact, { badgeVariant: "success"; label: string }> = {
  high: { badgeVariant: "success", label: "High impact" },
  medium: { badgeVariant: "success", label: "Medium impact" },
  low: { badgeVariant: "success", label: "Low impact" },
};

const IMPACT_ICON_TONE: Record<OpportunityImpact, string> = {
  high: "text-success-strong",
  medium: "text-success",
  low: "text-info",
};

export interface OpportunityCardProps {
  title: string;
  description: string;
  impact: OpportunityImpact;
  confidence?: Confidence;
  evidence?: ReactNode;
  affectedObject?: string;
  onViewRecommendation?: () => void;
  freshness?: FreshnessProps;
  className?: string;
}

export function OpportunityCard({ title, description, impact, confidence, evidence, affectedObject, onViewRecommendation, freshness, className }: OpportunityCardProps) {
  return (
    <IntelligenceCard
      icon={impact === "high" ? <TrendingUp /> : <Target />}
      iconToneClassName={IMPACT_ICON_TONE[impact]}
      title={title}
      className={className}
      severityBadge={<Badge variant={IMPACT_CONFIG[impact].badgeVariant}>{IMPACT_CONFIG[impact].label}</Badge>}
      supportingData={
        (evidence || affectedObject || confidence) && (
          <div className="flex flex-col gap-1">
            {affectedObject && (
              <Text as="span" size="body-sm" color="tertiary">
                {affectedObject}
              </Text>
            )}
            {evidence}
            {confidence && (
              <Text as="span" size="meta" color="tertiary">
                {confidence === "high" ? "High confidence" : confidence === "medium" ? "Estimated" : "Low confidence"}
              </Text>
            )}
          </div>
        )
      }
      freshness={freshness}
      cta={
        onViewRecommendation && (
          <Button variant="secondary" size="compact" onClick={onViewRecommendation}>
            Explore
          </Button>
        )
      }
    >
      {description}
    </IntelligenceCard>
  );
}
