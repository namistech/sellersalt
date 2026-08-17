import { prisma } from "@/lib/db";
import type { Coupon, Package } from "@prisma/client";
import { resolveCouponBehavior, type ResolvedCouponEvaluation } from "@/services/billing/coupon-engine";

export async function validateCoupon(rawCode: string): Promise<{ coupon: Coupon } | { error: string }> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { error: "Enter a coupon code." };

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon) return { error: "Invalid coupon code." };
  if (!coupon.isActive) return { error: "This coupon is no longer active." };
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return { error: "This coupon has expired." };
  if (coupon.maxRedemptions !== null && coupon.redemptionCount >= coupon.maxRedemptions) {
    return { error: "This coupon has reached its redemption limit." };
  }

  return { coupon };
}

/**
 * Evaluates commercial behavior (Type A Free Trial, Type B First Month Free, Type C Completely Free, Type D/E Discounts)
 */
export function applyCouponDiscount(
  pkg: Pick<Package, "key" | "priceUsd" | "trialPriceUsd">,
  coupon: Pick<Coupon, "code" | "type" | "value" | "isActive" | "expiresAt" | "maxRedemptions" | "redemptionCount">
): ResolvedCouponEvaluation & { priceUsd: number } {
  const resolved = resolveCouponBehavior(coupon, {
    key: (pkg as any).key || "STARTED",
    priceUsd: pkg.priceUsd,
    trialPriceUsd: pkg.trialPriceUsd,
  });

  return {
    ...resolved,
    priceUsd: resolved.firstPeriodPriceUsd,
  };
}

/** Called only once a checkout session/subscription is actually created */
export async function redeemCoupon(couponId: string) {
  await prisma.coupon.update({ where: { id: couponId }, data: { redemptionCount: { increment: 1 } } });
}
