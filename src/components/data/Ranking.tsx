import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, Minus, Sparkles } from "lucide-react";
import { cn, DataText, Text } from "@/components/ui";

// design-system-v1.md — SellerSalt is research-heavy; ranking rows
// appear in Trends, competitor lists, and product-opportunity lists.
// No ecommerce-specific naming here — a "rank" is just a position.

// ---------- RankingChange — atomic movement indicator ----------
// A LOWER rank number is better (rank 1 beats rank 5) — the inverse of
// most metrics, which is why this doesn't just call MetricDelta.

export interface RankingChangeProps {
  rank: number;
  previousRank?: number;
  className?: string;
}

export function RankingChange({ rank, previousRank, className }: RankingChangeProps) {
  if (previousRank === undefined) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-info", className)}>
        <Sparkles aria-hidden className="h-3 w-3" />
        <Text as="span" size="body-sm">
          New
        </Text>
      </span>
    );
  }

  const movement = previousRank - rank; // positive = moved up (better)
  if (movement === 0) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-data-neutral", className)}>
        <Minus aria-hidden className="h-3 w-3" />
        <Text as="span" size="body-sm">
          No change
        </Text>
      </span>
    );
  }

  const improved = movement > 0;
  const Icon = improved ? ArrowUp : ArrowDown;
  return (
    <span className={cn("inline-flex items-center gap-1", improved ? "text-data-positive" : "text-data-negative", className)}>
      <Icon aria-hidden className="h-3 w-3" />
      <Text as="span" size="body-sm">
        {Math.abs(movement)}
      </Text>
    </span>
  );
}

// ---------- PositionIndicator — compact "#N" badge ----------

export interface PositionIndicatorProps {
  rank: number;
  /** Highlights the top N positions with the gold accent — a tasteful, on-brand touch, not a new status concept. */
  highlightTop?: number;
  className?: string;
}

export function PositionIndicator({ rank, highlightTop = 3, className }: PositionIndicatorProps) {
  const isTop = rank <= highlightTop;
  return (
    <span
      className={cn(
        "inline-flex h-6 min-w-6 items-center justify-center rounded-sm px-1.5",
        isTop ? "bg-gold/15 text-gold-strong" : "bg-surface-muted text-ink-secondary",
        className
      )}
    >
      {/* !text-gold-strong: Tailwind's important-modifier, not tailwind-merge
          (not installed) — needed because a plain className would race
          DataText's own tone-derived text color class for specificity,
          with no guaranteed win order between them. Uses -strong, not the
          bare gold token, for the same contrast reason as the badge above. */}
      <DataText size="data-sm" tone="secondary" className={isTop ? "!text-gold-strong" : undefined}>
        #{rank}
      </DataText>
    </span>
  );
}

// ---------- RankingRow — a full row: position + label + context + metric + movement ----------

export interface RankingRowProps {
  rank: number;
  previousRank?: number;
  label: string;
  context?: string;
  metric?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function RankingRow({ rank, previousRank, label, context, metric, onClick, className }: RankingRowProps) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-sm px-2 py-2 text-left transition",
        onClick && "hover:bg-surface-muted cursor-pointer",
        className
      )}
    >
      <PositionIndicator rank={rank} />
      <div className="min-w-0 flex-1">
        <Text as="p" size="body-sm" weight="medium" className="truncate">
          {label}
        </Text>
        {context && (
          <Text as="p" size="meta" color="tertiary" className="truncate">
            {context}
          </Text>
        )}
      </div>
      {metric}
      <RankingChange rank={rank} previousRank={previousRank} />
    </Wrapper>
  );
}
