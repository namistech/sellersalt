import type { LucideIcon } from "lucide-react";
import { Card, DataText, Text, cn } from "@/components/ui";
import { levelMeta, type MetaFn, type ScoreLevel } from "@/lib/competition-scoring";

// Visual shell REFACTORED onto the design system (Card/Text/DataText,
// no raw `.card`/dark: classes — Decision 2 removed dark mode). Wired
// to competition-scoring.ts's levelMeta/demandMeta exactly as before —
// this is the existing, intentionally-separate Difficulty/Demand
// heuristic (3-tier, inverted color meaning on demand), NOT the new
// 5-tier Health/Score system in components/intelligence/Score.tsx. The
// two are never merged (design-system-v1.md §13).

export function ScoredStatCard({
  icon: Icon,
  label,
  value,
  sub,
  level,
  metaFn = levelMeta,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  level?: ScoreLevel;
  metaFn?: MetaFn;
}) {
  const meta = level ? metaFn(level) : null;

  return (
    <Card padding="md" className={cn(meta && [meta.bg, meta.ring])}>
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-md bg-white/70", meta ? meta.text : "text-accent")}>
        <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
      </div>
      <Text as="div" size="label-sm" color="secondary" className="mt-3 uppercase tracking-wide">
        {label}
      </Text>
      <DataText size="data-lg" className="mt-1">
        {value}
      </DataText>
      {meta && (
        <Text as="div" size="body-sm" weight="semibold" className={cn("mt-2", meta.text)}>
          {meta.label}
        </Text>
      )}
      {sub && (
        <Text as="div" size="meta" color="tertiary" className="mt-0.5">
          {sub}
        </Text>
      )}
    </Card>
  );
}
