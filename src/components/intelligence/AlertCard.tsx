import type { ReactNode } from "react";
import { AlertTriangle, X, XCircle } from "lucide-react";
import { Badge, Button, IconButton } from "@/components/ui";
import type { FreshnessProps } from "@/components/data";
import { IntelligenceCard } from "./IntelligenceCard";

// design-system-v1.md §20 — the intelligence-domain Alert ("something
// important requires attention"), distinct from ui/Alert.tsx (a
// page-level banner) and from Notification/Insight/Recommendation.
// Lives primarily in the Notification Center; timestamp is always
// shown (alerts are inherently time-sensitive), unlike other card
// types where freshness is optional.

export type AlertCardSeverity = "warning" | "danger";

const SEVERITY_CONFIG: Record<AlertCardSeverity, { badgeVariant: "warning" | "danger"; icon: ReactNode; iconTone: string }> = {
  warning: { badgeVariant: "warning", icon: <AlertTriangle />, iconTone: "text-warn" },
  danger: { badgeVariant: "danger", icon: <XCircle />, iconTone: "text-danger" },
};

export interface AlertCardProps {
  title: string;
  description?: string;
  severity: AlertCardSeverity;
  freshness: FreshnessProps;
  onView?: () => void;
  onDismiss?: () => void;
  onMute?: () => void;
  className?: string;
}

export function AlertCard({ title, description, severity, freshness, onView, onDismiss, onMute, className }: AlertCardProps) {
  const config = SEVERITY_CONFIG[severity];
  return (
    <IntelligenceCard
      icon={config.icon}
      iconToneClassName={config.iconTone}
      title={title}
      className={className}
      role="alert"
      severityBadge={
        <div className="flex items-center gap-1">
          <Badge variant={config.badgeVariant}>{severity === "danger" ? "Critical" : "Warning"}</Badge>
          {onDismiss && <IconButton icon={<X />} variant="tertiary" size="compact" aria-label="Dismiss alert" onClick={onDismiss} />}
        </div>
      }
      freshness={freshness}
      cta={
        <div className="flex items-center gap-2">
          {onMute && (
            <Button variant="link" size="compact" onClick={onMute}>
              Mute this type
            </Button>
          )}
          {onView && (
            <Button variant="secondary" size="compact" onClick={onView}>
              View
            </Button>
          )}
        </div>
      }
    >
      {description}
    </IntelligenceCard>
  );
}
