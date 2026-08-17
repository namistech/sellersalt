/**
 * SellerSalt Canonical Commercial Coupon Engine
 * 
 * Supports multi-behavior promotional models:
 * Type A: Free Trial ($0 today, standard recurring afterward)
 * Type B: Paid Trial -> First Month Free ($1 today, 3-day trial, Month 1 free, then standard)
 * Type C: Completely Free Access / Direct Checkout Bypass ($0 today, $0 recurring, no payment method)
 * Type D: Percentage Discount (e.g. 10%, 25%, 50% with duration options)
 * Type E: Fixed Amount Discount (e.g. $10, $20, $40 off)
 */

export type CouponBehaviorType =
  | "FREE_TRIAL"
  | "PAID_TRIAL_FIRST_MONTH_FREE"
  | "COMPLETELY_FREE"
  | "PERCENTAGE_DISCOUNT"
  | "FIXED_DISCOUNT";

export type CouponDuration = "ONCE" | "REPEATING" | "FOREVER";

export interface ResolvedCouponEvaluation {
  valid: boolean;
  code: string;
  behavior: CouponBehaviorType;
  headline: string;
  description: string;
  trialPriceUsd: number;
  firstPeriodPriceUsd: number;
  recurringPriceUsd: number;
  requiresCheckout: boolean;
  requiresPaymentMethod: boolean;
  duration: CouponDuration;
  durationMonths?: number;
  error?: string;
}

export interface CouponInput {
  code: string;
  type?: "PERCENT" | "FIXED" | "FREE_TRIAL" | "FIRST_MONTH_FREE" | "COMPLETELY_FREE" | string;
  value?: number;
  behavior?: CouponBehaviorType;
  duration?: CouponDuration;
  durationMonths?: number;
  applicablePlanKey?: string | null;
  isActive?: boolean;
  expiresAt?: Date | null;
  maxRedemptions?: number | null;
  redemptionCount?: number;
}

export function resolveCouponBehavior(
  coupon: CouponInput,
  packageDetails: {
    key: string;
    priceUsd: number;
    trialPriceUsd?: number | null;
    trialDays?: number | null;
  }
): ResolvedCouponEvaluation {
  const code = coupon.code.trim().toUpperCase();

  // 1. Validation checks
  if (coupon.isActive === false) {
    return {
      valid: false,
      code,
      behavior: "FIXED_DISCOUNT",
      headline: "Inactive Coupon",
      description: "This coupon code is no longer active.",
      trialPriceUsd: packageDetails.trialPriceUsd ?? 1.0,
      firstPeriodPriceUsd: packageDetails.priceUsd,
      recurringPriceUsd: packageDetails.priceUsd,
      requiresCheckout: true,
      requiresPaymentMethod: true,
      duration: "ONCE",
      error: "This coupon code is no longer active.",
    };
  }

  if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
    return {
      valid: false,
      code,
      behavior: "FIXED_DISCOUNT",
      headline: "Expired Coupon",
      description: "This coupon code has expired.",
      trialPriceUsd: packageDetails.trialPriceUsd ?? 1.0,
      firstPeriodPriceUsd: packageDetails.priceUsd,
      recurringPriceUsd: packageDetails.priceUsd,
      requiresCheckout: true,
      requiresPaymentMethod: true,
      duration: "ONCE",
      error: "This coupon code has expired.",
    };
  }

  if (coupon.maxRedemptions && (coupon.redemptionCount || 0) >= coupon.maxRedemptions) {
    return {
      valid: false,
      code,
      behavior: "FIXED_DISCOUNT",
      headline: "Redemption Limit Reached",
      description: "This coupon has reached its maximum redemptions.",
      trialPriceUsd: packageDetails.trialPriceUsd ?? 1.0,
      firstPeriodPriceUsd: packageDetails.priceUsd,
      recurringPriceUsd: packageDetails.priceUsd,
      requiresCheckout: true,
      requiresPaymentMethod: true,
      duration: "ONCE",
      error: "This coupon has reached its maximum redemptions.",
    };
  }

  if (coupon.applicablePlanKey && coupon.applicablePlanKey.toUpperCase() !== packageDetails.key.toUpperCase()) {
    return {
      valid: false,
      code,
      behavior: "FIXED_DISCOUNT",
      headline: "Plan Specific Coupon",
      description: `This coupon is only valid for the ${coupon.applicablePlanKey} plan.`,
      trialPriceUsd: packageDetails.trialPriceUsd ?? 1.0,
      firstPeriodPriceUsd: packageDetails.priceUsd,
      recurringPriceUsd: packageDetails.priceUsd,
      requiresCheckout: true,
      requiresPaymentMethod: true,
      duration: "ONCE",
      error: `This coupon is only valid for the ${coupon.applicablePlanKey} plan.`,
    };
  }

  // 2. Behavioral determination
  const baseTrialPrice = packageDetails.trialPriceUsd ?? 1.0;
  const regularPrice = packageDetails.priceUsd;

  // Pattern matching for special code formats if explicit behavior not set in DB
  const isFreeTrialCode =
    coupon.behavior === "FREE_TRIAL" ||
    coupon.type === "FREE_TRIAL" ||
    code.includes("FREETRIAL") ||
    code === "FREE3DAY";

  const isFirstMonthFreeCode =
    coupon.behavior === "PAID_TRIAL_FIRST_MONTH_FREE" ||
    coupon.type === "FIRST_MONTH_FREE" ||
    code.includes("FIRSTMONTHFREE") ||
    code === "1MONTHFREE";

  const isCompletelyFreeCode =
    coupon.behavior === "COMPLETELY_FREE" ||
    coupon.type === "COMPLETELY_FREE" ||
    code === "FREEPRO" ||
    code === "VIP100" ||
    (coupon.type === "PERCENT" && coupon.value === 100);

  // TYPE C: Completely Free / Bypass Checkout
  if (isCompletelyFreeCode) {
    return {
      valid: true,
      code,
      behavior: "COMPLETELY_FREE",
      headline: "100% Free Access Granted",
      description: "Direct account provisioning without checkout or payment required.",
      trialPriceUsd: 0,
      firstPeriodPriceUsd: 0,
      recurringPriceUsd: 0,
      requiresCheckout: false,
      requiresPaymentMethod: false,
      duration: "FOREVER",
    };
  }

  // TYPE A: Free Trial ($0 today, standard recurring)
  if (isFreeTrialCode) {
    return {
      valid: true,
      code,
      behavior: "FREE_TRIAL",
      headline: "Free 3-Day Pro Trial ($0 Today)",
      description: `Bypasses the $1 trial charge. Renews at $${regularPrice}/month after trial.`,
      trialPriceUsd: 0,
      firstPeriodPriceUsd: regularPrice,
      recurringPriceUsd: regularPrice,
      requiresCheckout: true,
      requiresPaymentMethod: true,
      duration: "ONCE",
    };
  }

  // TYPE B: Paid Trial -> First Month Free ($1 today, first month $0, then regular)
  if (isFirstMonthFreeCode) {
    return {
      valid: true,
      code,
      behavior: "PAID_TRIAL_FIRST_MONTH_FREE",
      headline: "$1 Trial + First Month Free",
      description: `$1.00 today for 3-day trial. First monthly billing cycle is $0.00, then $${regularPrice}/month.`,
      trialPriceUsd: 1.0,
      firstPeriodPriceUsd: 0,
      recurringPriceUsd: regularPrice,
      requiresCheckout: true,
      requiresPaymentMethod: true,
      duration: "ONCE",
    };
  }

  // TYPE D: Percentage Discount
  if (coupon.type === "PERCENT" || (coupon.value && coupon.value <= 100 && !coupon.type)) {
    const pct = coupon.value || 0;
    const discounted = Math.max(0, Math.round(regularPrice * (1 - pct / 100) * 100) / 100);
    const duration = coupon.duration || "ONCE";

    return {
      valid: true,
      code,
      behavior: "PERCENTAGE_DISCOUNT",
      headline: `${pct}% Off Subscription`,
      description: `${pct}% discount applied to recurring subscription charges (${duration.toLowerCase()}).`,
      trialPriceUsd: baseTrialPrice,
      firstPeriodPriceUsd: discounted,
      recurringPriceUsd: duration === "ONCE" ? regularPrice : discounted,
      requiresCheckout: true,
      requiresPaymentMethod: true,
      duration,
      durationMonths: coupon.durationMonths,
    };
  }

  // TYPE E: Fixed Amount Discount
  const discountVal = coupon.value || 0;
  const discountedFixed = Math.max(0, Math.round((regularPrice - discountVal) * 100) / 100);
  const duration = coupon.duration || "ONCE";

  return {
    valid: true,
    code,
    behavior: "FIXED_DISCOUNT",
    headline: `$${discountVal} Off Subscription`,
    description: `$${discountVal} discount applied to subscription (${duration.toLowerCase()}).`,
    trialPriceUsd: baseTrialPrice,
    firstPeriodPriceUsd: discountedFixed,
    recurringPriceUsd: duration === "ONCE" ? regularPrice : discountedFixed,
    requiresCheckout: true,
    requiresPaymentMethod: true,
    duration,
    durationMonths: coupon.durationMonths,
  };
}
