import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { Badge, Button, Text } from "@/components/ui";
import type { FreshnessProps } from "@/components/data";
import type { Confidence } from "./OpportunityCard";
import { IntelligenceCard } from "./IntelligenceCard";

// design-system-v1.md §12 — Insight: WHAT happened, WHY it matters,
// EVIDENCE, optional next step. No severity — insights are descriptive,
// not urgent. Shows a source/confidence tag when AI-generated, per the
// "editorial judgment labeled as such" UX principle.

export interface InsightCardProps {
  title: string;
  explanation: string;
  metric?: ReactNode;
  confidence?: Confidence;
  /** e.g. "AI" or "Based on 42 tracked competitors" — the evidence/source trail. */
  source?: string;
  onViewDetails?: () => void;
  freshness?: FreshnessProps;
  className?: string;
}

export function InsightCard({ title, explanation, metric, confidence, source, onViewDetails, freshness, className }: InsightCardProps) {
  return (
    <IntelligenceCard
      icon={<Sparkles />}
      iconToneClassName="text-accent"
      title={title}
      className={className}
      severityBadge={source && <Badge variant="info">{source}</Badge>}
      supportingData={
        (metric || confidence) && (
          <div className="flex items-center gap-3">
            {metric}
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
        onViewDetails && (
          <Button variant="link" size="compact" onClick={onViewDetails}>
            View details
          </Button>
        )
      }
    >
      {explanation}
    </IntelligenceCard>
  );
}
