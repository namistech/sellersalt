/**
 * SellerSalt Privacy-Conscious Product Analytics & Conversion Event Engine
 * 
 * Tracks internal commercial activation, onboarding progress, and feature utilization.
 * Strictly scopes data to organizations without exposing private identifiers or PII.
 */

export type ProductEventType =
  | "signup_completed"
  | "onboarding_started"
  | "onboarding_completed"
  | "first_value_reached"
  | "free_tool_used"
  | "keyword_research_run"
  | "product_research_run"
  | "seo_audit_run"
  | "opportunity_saved"
  | "upgrade_gate_viewed"
  | "pricing_viewed"
  | "checkout_started"
  | "checkout_completed"
  | "trial_started"
  | "subscription_activated"
  | "subscription_canceled"
  | "subscription_downgraded"
  | "subscription_upgraded";

export interface ProductEventPayload {
  organizationId?: string;
  eventType: ProductEventType;
  metadata?: Record<string, string | number | boolean | null | undefined>;
  timestamp?: Date;
}

export interface ActivationProgress {
  accountCreated: boolean;
  nicheSelected: boolean;
  goalSelected: boolean;
  firstResearchRun: boolean;
  opportunitySaved: boolean;
  strategyBuilt: boolean;
  isActivated: boolean;
  completionPercentage: number;
}

/**
 * In-memory / structured log event emitter that remains privacy-conscious and multi-tenant safe.
 */
export function recordProductEvent(event: ProductEventPayload): {
  id: string;
  ok: boolean;
  eventType: ProductEventType;
  recordedAt: string;
} {
  const eventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const recordedAt = (event.timestamp || new Date()).toISOString();

  // In production, events are logged in structured format and forwarded to internal observability
  if (process.env.NODE_ENV !== "test") {
    console.log(`[SELLERSALT_ANALYTICS]`, JSON.stringify({
      id: eventId,
      org: event.organizationId || "ANONYMOUS",
      type: event.eventType,
      meta: event.metadata,
      at: recordedAt,
    }));
  }

  return {
    id: eventId,
    ok: true,
    eventType: event.eventType,
    recordedAt,
  };
}

/**
 * Evaluates the activation checklist for a user or organization.
 */
export function computeActivationProgress(input: {
  hasCompletedOnboarding?: boolean;
  hasNicheFocus?: boolean;
  hasRunResearch?: boolean;
  hasSavedProspect?: boolean;
  hasCreatedDraft?: boolean;
}): ActivationProgress {
  const accountCreated = true;
  const nicheSelected = Boolean(input.hasNicheFocus || input.hasCompletedOnboarding);
  const goalSelected = Boolean(input.hasCompletedOnboarding);
  const firstResearchRun = Boolean(input.hasRunResearch);
  const opportunitySaved = Boolean(input.hasSavedProspect);
  const strategyBuilt = Boolean(input.hasCreatedDraft);

  const steps = [
    accountCreated,
    nicheSelected,
    goalSelected,
    firstResearchRun,
    opportunitySaved,
    strategyBuilt,
  ];

  const completedCount = steps.filter(Boolean).length;
  const completionPercentage = Math.round((completedCount / steps.length) * 100);
  const isActivated = firstResearchRun && (opportunitySaved || strategyBuilt);

  return {
    accountCreated,
    nicheSelected,
    goalSelected,
    firstResearchRun,
    opportunitySaved,
    strategyBuilt,
    isActivated,
    completionPercentage,
  };
}
