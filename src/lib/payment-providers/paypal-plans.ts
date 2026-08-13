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

  const planRes = await c.post("/v1/billing/plans", {
    product_id: productId,
    name: `SellerSalt ${pkg.name}`,
    billing_cycles: [
      {
        frequency: { interval_unit: "MONTH", interval_count: 1 },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: { fixed_price: { value: pkg.priceUsd.toFixed(2), currency_code: "USD" } },
      },
    ],
    payment_preferences: { auto_bill_outstanding: true, payment_failure_threshold: 3 },
  });

  const planId = planRes.data.id;

  await prisma.package.update({
    where: { id: pkg.id },
    data: { paypalProductId: productId, paypalPlanId: planId },
  });

  return planId;
}
