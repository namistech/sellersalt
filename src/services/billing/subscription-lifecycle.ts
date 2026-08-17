/**
 * SellerSalt Canonical Subscription Lifecycle & State Machine
 * 
 * Defines the single source of truth for subscription states, plan mapping,
 * feature entitlement evaluation, upgrade/downgrade safety, and trial controls.
 */

import {
  PLAN_DEFINITIONS,
  PlanTierKey,
  PlanDefinition,
  getFeatureAccess,
  isTierSufficient,
} from "@/services/plans/plan-capabilities";

export type CanonicalSubscriptionState =
  | "FREE"
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "EXPIRED"
  | "PAYMENT_FAILED"
  | "INCOMPLETE";

export interface PlanTransitionVerdict {
  fromTier: PlanTierKey;
  toTier: PlanTierKey;
  isUpgrade: boolean;
  isDowngrade: boolean;
  dataPreserved: boolean;
  preservationSummary: string;
  restrictionsSummary?: string;
  canProceed: boolean;
}

export interface TrialDetails {
  isEligibleForTrial: boolean;
  isCurrentlyTrialing: boolean;
  trialPriceUsd: number;
  trialDurationDays: number;
  regularPriceUsd: number;
  trialEndsAt: Date | null;
  daysRemaining: number | null;
}

/**
 * Normalizes any external provider subscription status into SellerSalt's canonical state machine.
 */
export function resolveSubscriptionState(
  rawState?: string | null,
  options?: { isTrial?: boolean; currentPeriodEnd?: Date | null }
): CanonicalSubscriptionState {
  if (!rawState) return "FREE";

  const normalized = rawState.trim().toUpperCase();

  // Check expiration timestamp if provided
  if (options?.currentPeriodEnd && new Date() > new Date(options.currentPeriodEnd)) {
    if (normalized === "ACTIVE" || normalized === "TRIALING") {
      return "EXPIRED";
    }
  }

  switch (normalized) {
    case "ACTIVE":
      return options?.isTrial ? "TRIALING" : "ACTIVE";
    case "TRIALING":
    case "TRIAL":
      return "TRIALING";
    case "PAST_DUE":
    case "UNPAID":
      return "PAST_DUE";
    case "CANCELED":
    case "CANCELLED":
      return "CANCELED";
    case "EXPIRED":
      return "EXPIRED";
    case "PAYMENT_FAILED":
    case "FAILED":
      return "PAYMENT_FAILED";
    case "INCOMPLETE":
    case "INCOMPLETE_EXPIRED":
      return "INCOMPLETE";
    case "FREE":
      return "FREE";
    default:
      return "FREE";
  }
}

/**
 * Resolves the effective plan tier taking into account subscription state.
 * Past due, expired, or canceled subscriptions fall back to FREE access.
 */
export function resolveEffectiveTier(
  assignedTier: PlanTierKey = "FREE",
  subscriptionState: CanonicalSubscriptionState = "FREE"
): PlanTierKey {
  if (subscriptionState === "ACTIVE" || subscriptionState === "TRIALING") {
    return assignedTier;
  }
  return "FREE";
}

/**
 * Resolves the full canonical plan definition.
 */
export function resolveOrganizationPlan(tierKey: string = "FREE"): PlanDefinition {
  const normalizedKey = (tierKey.trim().toUpperCase() as PlanTierKey) || "FREE";
  return PLAN_DEFINITIONS[normalizedKey] || PLAN_DEFINITIONS.FREE;
}

/**
 * Returns full boolean feature permissions based on plan tier and subscription state.
 */
export function resolveFeatureEntitlement(
  assignedTier: PlanTierKey = "FREE",
  subscriptionState: CanonicalSubscriptionState = "FREE"
) {
  const effectiveTier = resolveEffectiveTier(assignedTier, subscriptionState);
  return getFeatureAccess(effectiveTier);
}

/**
 * Checks whether a specific feature can be used.
 */
export function canUseFeature(
  assignedTier: PlanTierKey,
  feature: keyof ReturnType<typeof getFeatureAccess>,
  subscriptionState: CanonicalSubscriptionState = "ACTIVE"
): boolean {
  const effectiveTier = resolveEffectiveTier(assignedTier, subscriptionState);
  const features = getFeatureAccess(effectiveTier);
  return Boolean(features[feature]);
}

/**
 * Evaluates upgrade / downgrade safety without destroying user data.
 */
export function evaluatePlanTransition(
  currentTier: PlanTierKey,
  newTier: PlanTierKey,
  currentUsage?: {
    trackedShops?: number;
    connectedStores?: number;
    plannerItems?: number;
  }
): PlanTransitionVerdict {
  const isUpgrade = isTierSufficient(newTier, currentTier) && newTier !== currentTier;
  const isDowngrade = isTierSufficient(currentTier, newTier) && newTier !== currentTier;
  const targetLimits = PLAN_DEFINITIONS[newTier].limits;

  let restrictionsSummary: string | undefined;

  if (isDowngrade && currentUsage) {
    const overShops = (currentUsage.trackedShops || 0) > targetLimits.trackedCompetitorShops;
    const overStores = (currentUsage.connectedStores || 0) > targetLimits.connectedEtsyStores;
    const overPlanner = (currentUsage.plannerItems || 0) > targetLimits.activePlannerItems;

    if (overShops || overStores || overPlanner) {
      const items: string[] = [];
      if (overShops) {
        items.push(`${currentUsage.trackedShops} tracked shops (limit ${targetLimits.trackedCompetitorShops})`);
      }
      if (overStores) {
        items.push(`${currentUsage.connectedStores} connected stores (limit ${targetLimits.connectedEtsyStores})`);
      }
      if (overPlanner) {
        items.push(`${currentUsage.plannerItems} planner items (limit ${targetLimits.activePlannerItems})`);
      }
      restrictionsSummary = `You currently have ${items.join(", ")}. Existing records are preserved, but creating new items will be restricted until you reduce usage or upgrade.`;
    }
  }

  return {
    fromTier: currentTier,
    toTier: newTier,
    isUpgrade,
    isDowngrade,
    dataPreserved: true, // Non-destructive downgrade invariant
    preservationSummary: "All existing research history, drafts, opportunities, and tracked shops remain 100% preserved.",
    restrictionsSummary,
    canProceed: true,
  };
}

/**
 * Calculates trial duration and pricing transparency.
 */
export function resolveTrialDetails(
  planKey: PlanTierKey,
  trialStartedAt?: Date | null,
  trialDays: number = 3
): TrialDetails {
  const isPro = planKey === "PRO";
  const plan = PLAN_DEFINITIONS[planKey] || PLAN_DEFINITIONS.PRO;

  if (!isPro) {
    return {
      isEligibleForTrial: false,
      isCurrentlyTrialing: false,
      trialPriceUsd: 0,
      trialDurationDays: 0,
      regularPriceUsd: plan.priceMonthlyUsd,
      trialEndsAt: null,
      daysRemaining: null,
    };
  }

  if (trialStartedAt) {
    const endsAt = new Date(trialStartedAt.getTime() + trialDays * 24 * 60 * 60 * 1000);
    const now = new Date();
    const isCurrentlyTrialing = now < endsAt;
    const msRemaining = endsAt.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

    return {
      isEligibleForTrial: false,
      isCurrentlyTrialing,
      trialPriceUsd: 1.0,
      trialDurationDays: trialDays,
      regularPriceUsd: plan.priceMonthlyUsd,
      trialEndsAt: endsAt,
      daysRemaining: isCurrentlyTrialing ? daysRemaining : 0,
    };
  }

  return {
    isEligibleForTrial: true,
    isCurrentlyTrialing: false,
    trialPriceUsd: 1.0,
    trialDurationDays: trialDays,
    regularPriceUsd: plan.priceMonthlyUsd,
    trialEndsAt: null,
    daysRemaining: trialDays,
  };
}
