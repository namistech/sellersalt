import type { ReactNode } from "react";
import { AlertOctagon, AlertTriangle, Info } from "lucide-react";
import { Badge, Button, Text } from "@/components/ui";
import type { FreshnessProps } from "@/components/data";
import { IntelligenceCard } from "./IntelligenceCard";

// design-system-v1.md §12 — Issue: "Something is wrong or below
// target." Severity uses the 5-tier vocabulary this task specifies
// (critical/high/medium/low/informational) — distinct from, and not
// merged with, the 5-tier Score health system in Score.tsx, which
// describes an aggregate score, not a single problem's urgency.

export type IssueSeverity = "critical" | "high" | "medium" | "low" | "informational";

const SEVERITY_CONFIG: Record<IssueSeverity, { badgeVariant: "danger" | "warning" | "info" | "neutral"; icon: ReactNode; iconTone: string; label: string }> = {
  critical: { badgeVariant: "danger", icon: <AlertOctagon />, iconTone: "text-danger", label: "Critical" },
  high: { badgeVariant: "danger", icon: <AlertTriangle />, iconTone: "text-danger", label: "High" },
  medium: { badgeVariant: "warning", icon: <AlertTriangle />, iconTone: "text-warn", label: "Medium" },
  low: { badgeVariant: "info", icon: <Info />, iconTone: "text-info", label: "Low" },
  informational: { badgeVariant: "neutral", icon: <Info />, iconTone: "text-ink-tertiary", label: "Info" },
};

export interface IssueCardProps {
  title: string;
  description: string;
  severity: IssueSeverity;
  affectedObject?: string;
  metric?: ReactNode;
  status?: "open" | "resolved" | "dismissed";
  onViewRecommendation?: () => void;
  freshness?: FreshnessProps;
  className?: string;
}

export function IssueCard({ title, description, severity, affectedObject, metric, status = "open", onViewRecommendation, freshness, className }: IssueCardProps) {
  const config = SEVERITY_CONFIG[severity];
  return (
    <IntelligenceCard
      icon={config.icon}
      iconToneClassName={config.iconTone}
      title={title}
      className={className}
      severityBadge={
        <div className="flex items-center gap-1.5">
          <Badge variant={config.badgeVariant}>{config.label}</Badge>
          {status !== "open" && <Badge variant="neutral">{status === "resolved" ? "Resolved" : "Dismissed"}</Badge>}
        </div>
      }
      supportingData={
        (affectedObject || metric) && (
          <div className="flex items-center gap-3">
            {affectedObject && (
              <Text as="span" size="body-sm" color="tertiary">
                {affectedObject}
              </Text>
            )}
            {metric}
          </div>
        )
      }
      freshness={freshness}
      cta={
        onViewRecommendation &&
        status === "open" && (
          <Button variant="secondary" size="compact" onClick={onViewRecommendation}>
            View recommendation
          </Button>
        )
      }
    >
      {description}
    </IntelligenceCard>
  );
}
