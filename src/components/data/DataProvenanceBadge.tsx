import { CheckCircle2, Calculator, Sparkles, Globe } from "lucide-react";
import { Badge, Tooltip } from "@/components/ui";
import {
  type DataProvenanceType,
  getProvenanceMeta,
} from "@/types/provenance";

export interface DataProvenanceBadgeProps {
  type: DataProvenanceType;
  /** Optional custom text override for specific context */
  customLabel?: string;
  /** Whether to render informative tooltip on hover (defaults to true) */
  showTooltip?: boolean;
  className?: string;
}

const ICON_MAP = {
  ACTUAL_ETSY_DATA: CheckCircle2,
  ESTIMATED: Calculator,
  SELLERSALT_SCORE: Sparkles,
  EXTERNAL_DATA: Globe,
};

export function DataProvenanceBadge({
  type,
  customLabel,
  showTooltip = true,
  className,
}: DataProvenanceBadgeProps) {
  const meta = getProvenanceMeta(type);
  const Icon = ICON_MAP[type] ?? Sparkles;
  const label = customLabel ?? meta.badgeText;

  const badge = (
    <Badge
      variant={meta.variant}
      icon={<Icon className="h-3 w-3" />}
      className={className}
    >
      {label}
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <Tooltip content={meta.description} side="top">
      {badge}
    </Tooltip>
  );
}
