import { prisma } from "@/lib/db";
import { getPaypalContext, paypalClient } from "./paypal-client";

/** Returns a PayPal plan ID for this package, creating the Product+Plan on
 * PayPal's side the first time this specific package is ever purchased via
 * PayPal. Cached afterward so repeat purchases don't recreate it. */
export async function getOrCreatePaypalPlan(packageId: string): Promise<string | null> {
  const pkg = await prisma.package.findUniqueOrThrow({ where: { id: packageId } });
  if (pkg.paypalPlanId) return pkg.paypalPlanId;

  const ctx = await getPaypalContext();
  if (!ctx) return null;
  const c = paypalClient(ctx);

  let productId = pkg.paypalProductId;
  if (!productId) {
    const productRes = await c.post("/v1/catalogs/products", {
      name: `SellerSalt — ${pkg.name}`,
      type: "SERVICE",
      category: "SOFTWARE",
    });
    productId = productRes.data.id;
  }

  const hasTrial = Boolean(pkg.trialDays && pkg.trialPriceUsd !== null && pkg.trialPriceUsd !== undefined);

  // PayPal supports multiple sequential billing cycles on one Plan — a
  // TRIAL tenure cycle first (real charge, not $0, per the founder's
  // decision to charge a genuine trial fee rather than a $0 hold), then an
  // infinite REGULAR cycle at the full price once the trial cycle completes.
  const billingCycles: any[] = [];
  let sequence = 1;
  if (hasTrial) {
    billingCycles.push({
      frequency: { interval_unit: "DAY", interval_count: pkg.trialDays },
      tenure_type: "TRIAL",
      sequence: sequence++,
      total_cycles: 1,
      pricing_scheme: { fixed_price: { value: (pkg.trialPriceUsd as number).toFixed(2), currency_code: "USD" } },
    });
  }
  billingCycles.push({
    frequency: { interval_unit: "MONTH", interval_count: 1 },
    tenure_type: "REGULAR",
    sequence: sequence,
    total_cycles: 0,
    pricing_scheme: { fixed_price: { value: pkg.priceUsd.toFixed(2), currency_code: "USD" } },
  });

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
