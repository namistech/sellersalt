import { AlertCircle, Check, CheckCircle, Circle, Clock, RotateCcw } from "lucide-react";
import { cn, Text, Caption, Spinner } from "@/components/ui";
import { Freshness, type FreshnessProps } from "@/components/data";

// design-system-v1.md §17 — visual/state layer ONLY, per this task's
// explicit instruction: "Do NOT implement actual business actions."
// No component here calls an API or mutates anything; every state
// transition is driven entirely by the `state` prop a caller passes in.

export type ActionState =
  | "recommended"
  | "ready"
  | "awaiting-approval"
  | "applying"
  | "applied"
  | "verification"
  | "verified"
  | "measured"
  | "failed"
  | "rolled-back";

const STEP_ORDER: ActionState[] = ["recommended", "ready", "awaiting-approval", "applying", "applied", "verification", "verified", "measured"];

const STATE_LABEL: Record<ActionState, string> = {
  recommended: "Recommended",
  ready: "Ready",
  "awaiting-approval": "Awaiting approval",
  applying: "Applying",
  applied: "Applied",
  verification: "Verifying",
  verified: "Verified",
  measured: "Measured",
  failed: "Failed",
  "rolled-back": "Rolled back",
};

const STATE_TONE_CLASS: Record<ActionState, string> = {
  recommended: "text-ink-tertiary",
  ready: "text-info",
  "awaiting-approval": "text-warn",
  applying: "text-info",
  applied: "text-success",
  verification: "text-info",
  verified: "text-success",
  measured: "text-success-strong",
  failed: "text-danger",
  "rolled-back": "text-ink-tertiary",
};

function stepIcon(state: ActionState, isCurrent: boolean, isComplete: boolean) {
  if (state === "failed") return <AlertCircle className="h-full w-full" />;
  if (state === "rolled-back") return <RotateCcw className="h-full w-full" />;
  if (isCurrent && (state === "applying" || state === "verification")) return <Spinner size="xs" aria-hidden />;
  if (isComplete) return <CheckCircle className="h-full w-full" />;
  return <Circle className="h-full w-full" />;
}

export interface ActionProgressProps {
  state: ActionState;
  /** Compact renders a single status badge; the default is the full stepper. */
  compact?: boolean;
  className?: string;
}

/** Compact status only — used inline in a RecommendationCard or table cell. */
export function ActionStatusBadge({ state, className }: { state: ActionState; className?: string }) {
  const isBusy = state === "applying" || state === "verification";
  return (
    <span className={cn("inline-flex items-center gap-1.5", STATE_TONE_CLASS[state], className)}>
      {isBusy ? <Spinner size="xs" aria-hidden /> : state === "failed" ? <AlertCircle className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
      <Text as="span" size="body-sm">
        {STATE_LABEL[state]}
      </Text>
    </span>
  );
}

/** Full horizontal stepper across the 8 normal-path states. failed/rolled-back render as a terminal banner instead of a step position. */
export function ActionProgress({ state, compact, className }: ActionProgressProps) {
  if (compact) return <ActionStatusBadge state={state} className={className} />;

  if (state === "failed" || state === "rolled-back") {
    return (
      <div className={cn("flex items-center gap-2 rounded-md border border-line-subtle bg-surface-muted px-3 py-2", className)}>
        <ActionStatusBadge state={state} />
      </div>
    );
  }

  const currentIndex = STEP_ORDER.indexOf(state);

  return (
    <div className={cn("flex items-center", className)} role="list" aria-label="Action progress">
      {STEP_ORDER.map((step, i) => {
        const isCurrent = i === currentIndex;
        const isComplete = i < currentIndex;
        return (
          <div key={step} role="listitem" className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full",
                  isComplete || isCurrent ? STATE_TONE_CLASS[step] : "text-line-strong"
                )}
              >
                {stepIcon(step, isCurrent, isComplete)}
              </span>
              <Caption className={cn("whitespace-nowrap", isCurrent && "font-medium text-ink")}>{STATE_LABEL[step]}</Caption>
            </div>
            {i < STEP_ORDER.length - 1 && <div className={cn("mx-1 h-px flex-1", isComplete ? "bg-success" : "bg-line-subtle")} />}
          </div>
        );
      })}
    </div>
  );
}

// ---------- ActionLogItem — historical record of a completed action ----------

export interface ActionLogItemProps {
  description: string;
  actor?: string;
  state: ActionState;
  freshness: FreshnessProps;
  className?: string;
}

export function ActionLogItem({ description, actor, state, freshness, className }: ActionLogItemProps) {
  return (
    <div className={cn("flex items-start gap-2 border-b border-line-subtle py-2 last:border-b-0", className)}>
      <span className={cn("mt-0.5 shrink-0", STATE_TONE_CLASS[state])}>
        {state === "applying" || state === "verification" ? <Spinner size="xs" aria-hidden /> : <Clock aria-hidden className="h-4 w-4" />}
      </span>
      <div className="flex-1">
        <Text as="p" size="body-sm">
          {description}
          {actor && (
            <Text as="span" size="body-sm" color="tertiary">
              {" "}
              — {actor}
            </Text>
          )}
        </Text>
        <div className="mt-0.5 flex items-center gap-2">
          <ActionStatusBadge state={state} />
          <Caption>·</Caption>
          <Freshness {...freshness} />
        </div>
      </div>
    </div>
  );
}
