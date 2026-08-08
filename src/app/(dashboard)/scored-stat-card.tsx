import type { LucideIcon } from "lucide-react";
import { levelMeta, type ScoreLevel } from "@/lib/competition-scoring";

export function ScoredStatCard({
  icon: Icon,
  label,
  value,
  sub,
  level,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  level?: ScoreLevel;
}) {
  const meta = level ? levelMeta(level) : null;

  return (
    <div className={`card ${meta ? `${meta.bg} ${meta.ring}` : ""}`}>
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-md ${
          meta ? meta.text : "text-accent"
        } bg-white/70 dark:bg-black/20`}
      >
        <Icon className="h-4 w-4" strokeWidth={2} />
      </div>
      <div className="mt-3 text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</div>
      {meta && <div className={`mt-2 text-xs font-semibold ${meta.text}`}>{meta.label}</div>}
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}
