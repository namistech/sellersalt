import { TrendingUp } from "lucide-react";
import { Button } from "@/components/ui";
import type { FreshnessProps } from "@/components/data";
import { IntelligenceCard } from "./IntelligenceCard";
import { ScoreChange } from "./Score";

// design-system-v1.md §12 — Outcome: the before/after measurement that
// closes the loop for an applied recommendation. Mandatory before/after
// comparison, per spec.

export interface OutcomeCardProps {
  title: string;
  beforeScore: number;
  afterScore: number;
  onViewReport?: () => void;
  freshness?: FreshnessProps;
  className?: string;
}

export function OutcomeCard({ title, beforeScore, afterScore, onViewReport, freshness, className }: OutcomeCardProps) {
  const improved = afterScore > beforeScore;
  return (
    <IntelligenceCard
      icon={<TrendingUp />}
      iconToneClassName={improved ? "text-success" : "text-ink-tertiary"}
      title={title}
      className={className}
      supportingData={<ScoreChange before={beforeScore} after={afterScore} />}
      freshness={freshness}
      cta={
        onViewReport && (
          <Button variant="secondary" size="compact" onClick={onViewReport}>
            View full report
          </Button>
        )
      }
    />
  );
}
