import { prisma } from "@/lib/db";
import type { Package } from "@prisma/client";
import { getPaypalContext, paypalClient } from "./paypal-client";

// PayPal supports multiple sequential billing cycles on one Plan — a
// TRIAL tenure cycle first (real charge, not $0, per the founder's
// decision to charge a genuine trial fee rather than a $0 hold), then an
// infinite REGULAR cycle at the full price once the trial cycle completes.
function buildBillingCycles(trialDays: number | null, prices: { trialPriceUsd: number | null; priceUsd: number }) {
  const hasTrial = Boolean(trialDays && prices.trialPriceUsd !== null && prices.trialPriceUsd !== undefined);

  const billingCycles: any[] = [];
  let sequence = 1;
  if (hasTrial) {
    billingCycles.push({
      frequency: { interval_unit: "DAY", interval_count: trialDays },
      tenure_type: "TRIAL",
      sequence: sequence++,
      total_cycles: 1,
      pricing_scheme: { fixed_price: { value: (prices.trialPriceUsd as number).toFixed(2), currency_code: "USD" } },
    });
  }
  billingCycles.push({
    frequency: { interval_unit: "MONTH", interval_count: 1 },
    tenure_type: "REGULAR",
    sequence,
    total_cycles: 0,
    pricing_scheme: { fixed_price: { value: prices.priceUsd.toFixed(2), currency_code: "USD" } },
  });
  return billingCycles;
}

async function getOrCreatePaypalProductId(pkg: Package, c: ReturnType<typeof paypalClient>): Promise<string> {
  if (pkg.paypalProductId) return pkg.paypalProductId;
  const productRes = await c.post("/v1/catalogs/products", {
    name: `SellerSalt — ${pkg.name}`,
    type: "SERVICE",
    category: "SOFTWARE",
  });
  return productRes.data.id;
}

/** Returns a PayPal plan ID for this package, creating the Product+Plan on
 * PayPal's side the first time this specific package is ever purchased via
 * PayPal. Cached afterward so repeat purchases don't recreate it. */
export async function getOrCreatePaypalPlan(packageId: string): Promise<string | null> {
  const pkg = await prisma.package.findUniqueOrThrow({ where: { id: packageId } });
  if (pkg.paypalPlanId) return pkg.paypalPlanId;

  const ctx = await getPaypalContext();
  if (!ctx) return null;
  const c = paypalClient(ctx);

  const productId = await getOrCreatePaypalProductId(pkg, c);
  const billingCycles = buildBillingCycles(pkg.trialDays, { trialPriceUsd: pkg.trialPriceUsd, priceUsd: pkg.priceUsd });

  const planRes = await c.post("/v1/billing/plans", {
    product_id: productId,
    name: `SellerSalt ${pkg.name}`,
    billing_cycles: billingCycles,
    payment_preferences: { auto_bill_outstanding: true, payment_failure_threshold: 3 },
  });

  const planId = planRes.data.id;

  await prisma.package.update({
    where: { id: pkg.id },
    data: { paypalProductId: productId, paypalPlanId: planId },
  });

  return planId;
}

/** Same shape as getOrCreatePaypalPlan but for coupon-discounted pricing —
 * always creates a fresh, uncached Plan (discounted pricing is per-coupon,
 * not per-package) and never writes the result back onto Package.paypalPlanId,
 * since that cache is reserved for the package's undiscounted plan. */
export async function createDiscountedPaypalPlan(
  packageId: string,
  discountedPrices: { trialPriceUsd: number | null; priceUsd: number }
): Promise<string | null> {
  const pkg = await prisma.package.findUniqueOrThrow({ where: { id: packageId } });

  const ctx = await getPaypalContext();
  if (!ctx) return null;
  const c = paypalClient(ctx);

  const productId = await getOrCreatePaypalProductId(pkg, c);
  const billingCycles = buildBillingCycles(pkg.trialDays, discountedPrices);

  const planRes = await c.post("/v1/billing/plans", {
    product_id: productId,
    name: `SellerSalt ${pkg.name} (discounted)`,
    billing_cycles: billingCycles,
    payment_preferences: { auto_bill_outstanding: true, payment_failure_threshold: 3 },
  });

  // Persist productId if this was the first PayPal plan ever created for
  // this package, so future plans (discounted or not) don't recreate it —
  // but never touch paypalPlanId, which is reserved for the full-price plan.
  if (!pkg.paypalProductId) {
    await prisma.package.update({ where: { id: pkg.id }, data: { paypalProductId: productId } });
  }

  return planRes.data.id;
}
