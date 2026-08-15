import type { ReactNode } from "react";
import { CheckCircle } from "lucide-react";
import { Badge, Button, Text } from "@/components/ui";
import type { FreshnessProps } from "@/components/data";
import type { Confidence } from "./OpportunityCard";
import { ActionStatusBadge, type ActionState } from "./ActionProgress";
import { IntelligenceCard } from "./IntelligenceCard";

// design-system-v1.md §17 — the component that makes "Act must never
// ambiguously mean automatic modification" a structural guarantee, not
// a copy-review convention. `mode` is required, and each mode has its
// own fixed CTA label — a caller cannot accidentally ship a
// Recommendation with a vague "Fix" or "Optimize now" button, because
// there's no prop that lets it.

export type RecommendationMode = "advise" | "prepare" | "apply" | "automate";

const MODE_CONFIG: Record<RecommendationMode, { ctaLabel: string; helperText: string }> = {
  advise: { ctaLabel: "See how to fix this", helperText: "Consider…" },
  prepare: { ctaLabel: "Preview this change", helperText: "Generate…" },
  apply: { ctaLabel: "Review & apply", helperText: "Apply after approval." },
  automate: { ctaLabel: "Enable automatic execution", helperText: "Enable automatic execution." },
};

export interface RecommendationCardProps {
  title: string;
  reasoning: string;
  expectedImpact?: ReactNode;
  confidence?: Confidence;
  affectedObject?: string;
  mode: RecommendationMode;
  /** Only meaningful once the user has actually triggered the action — omit for a freshly-surfaced recommendation. */
  actionState?: ActionState;
  onAction?: () => void;
  freshness?: FreshnessProps;
  className?: string;
}

export function RecommendationCard({
  title,
  reasoning,
  expectedImpact,
  confidence,
  affectedObject,
  mode,
  actionState,
  onAction,
  freshness,
  className,
}: RecommendationCardProps) {
  const config = MODE_CONFIG[mode];
  // "automate" is [FUTURE]/[DECISION REQUIRED] per design-system-v1.md
  // §17 — not authorized by any locked decision — so its CTA renders
  // disabled with an explanatory label rather than a working toggle.
  const automateUnavailable = mode === "automate";

  return (
    <IntelligenceCard
      icon={<CheckCircle />}
      iconToneClassName="text-accent"
      title={title}
      className={className}
      severityBadge={
        <div className="flex items-center gap-1.5">
          <Badge variant="neutral">{config.helperText}</Badge>
          {confidence && (
            <Badge variant="info">{confidence === "high" ? "High confidence" : confidence === "medium" ? "Estimated" : "Low confidence"}</Badge>
          )}
        </div>
      }
      supportingData={
        (affectedObject || expectedImpact) && (
          <div className="flex items-center gap-3">
            {affectedObject && (
              <Text as="span" size="body-sm" color="tertiary">
                {affectedObject}
              </Text>
            )}
            {expectedImpact}
          </div>
        )
      }
      freshness={freshness}
      cta={
        actionState ? (
          <ActionStatusBadge state={actionState} />
        ) : (
          <Button
            variant={mode === "apply" ? "success" : "secondary"}
            size="compact"
            onClick={onAction}
            disabled={automateUnavailable}
            title={automateUnavailable ? "Automation is not available yet." : undefined}
          >
            {config.ctaLabel}
          </Button>
        )
      }
    >
      {reasoning}
    </IntelligenceCard>
  );
}
