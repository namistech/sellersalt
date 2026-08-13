import { prisma } from "@/lib/db";
import type { Coupon, Package } from "@prisma/client";

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

export function applyCouponDiscount(
  pkg: Pick<Package, "priceUsd" | "trialPriceUsd">,
  coupon: Pick<Coupon, "type" | "value">
): { trialPriceUsd: number | null; priceUsd: number } {
  const discount = (amount: number) => {
    const discounted = coupon.type === "PERCENT" ? amount * (1 - coupon.value / 100) : amount - coupon.value;
    return Math.max(0, Math.round(discounted * 100) / 100);
  };

  return {
    trialPriceUsd: pkg.trialPriceUsd !== null && pkg.trialPriceUsd !== undefined ? discount(pkg.trialPriceUsd) : null,
    priceUsd: discount(pkg.priceUsd),
  };
}

/** Called only once a checkout session/subscription is actually created —
 * the validate/preview endpoint must never call this. */
export async function redeemCoupon(couponId: string) {
  await prisma.coupon.update({ where: { id: couponId }, data: { redemptionCount: { increment: 1 } } });
}
