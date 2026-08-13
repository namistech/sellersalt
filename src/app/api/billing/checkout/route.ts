import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStripeClient } from "@/lib/payment-providers/stripe-client";
import { getPaypalContext, paypalClient } from "@/lib/payment-providers/paypal-client";
import { getOrCreatePaypalPlan } from "@/lib/payment-providers/paypal-plans";

function appUrl(): string {
  const url = process.env.NEXTAUTH_URL;
  if (!url) throw new Error("NEXTAUTH_URL is required.");
  return url;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { packageKey, provider } = (await req.json()) as { packageKey: string; provider: "STRIPE" | "PAYPAL" };
  const pkg = await prisma.package.findUnique({ where: { key: packageKey } });
  if (!pkg) return NextResponse.json({ error: "Package not found." }, { status: 404 });
  if (pkg.priceUsd <= 0) return NextResponse.json({ error: "This package doesn't require checkout." }, { status: 400 });

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
  const existingSub = await prisma.subscription.findUnique({ where: { organizationId } });

  if (provider === "STRIPE") {
    const stripeCtx = await getStripeClient();
    if (!stripeCtx) return NextResponse.json({ error: "Stripe isn't configured yet." }, { status: 400 });
    const { stripe } = stripeCtx;

    let customerId = existingSub?.provider === "STRIPE" ? existingSub.providerCustomerId ?? undefined : undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        metadata: { organizationId },
      });
      customerId = customer.id;
    }

    const hasTrial = Boolean(pkg.trialDays && pkg.trialPriceUsd !== null && pkg.trialPriceUsd !== undefined);

    // Stripe's native trial_period_days charges $0 during the trial — that's
    // not what we want. Instead: a one-time line item charges the real
    // trial fee immediately, and the recurring subscription price is
    // deferred via trial_period_days so its first real charge lands when
    // the trial ends. Together these produce "$1 now, full price later."
    const lineItems: any[] = [];
    if (hasTrial) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: `SellerSalt — ${pkg.name} (${pkg.trialDays}-day trial)` },
          unit_amount: Math.round((pkg.trialPriceUsd as number) * 100),
        },
        quantity: 1,
      });
    }
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: { name: `SellerSalt — ${pkg.name}` },
        unit_amount: Math.round(pkg.priceUsd * 100),
        recurring: { interval: "month" },
      },
      quantity: 1,
    });

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: lineItems,
      success_url: `${appUrl()}/settings/billing?checkout=success`,
      cancel_url: `${appUrl()}/settings/billing?checkout=cancelled`,
      metadata: { organizationId, packageId: pkg.id },
      subscription_data: {
        metadata: { organizationId, packageId: pkg.id },
        trial_period_days: hasTrial ? pkg.trialDays! : undefined,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  }

  if (provider === "PAYPAL") {
    const ctx = await getPaypalContext();
    if (!ctx) return NextResponse.json({ error: "PayPal isn't configured yet." }, { status: 400 });

    const planId = await getOrCreatePaypalPlan(pkg.id);
    if (!planId) return NextResponse.json({ error: "Couldn't set up PayPal plan." }, { status: 500 });

    const c = paypalClient(ctx);
    const subRes = await c.post("/v1/billing/subscriptions", {
      plan_id: planId,
      custom_id: organizationId, // echoed back on webhook events — how we map back to this org
      application_context: {
        brand_name: "SellerSalt",
        return_url: `${appUrl()}/settings/billing?checkout=success&provider=paypal`,
        cancel_url: `${appUrl()}/settings/billing?checkout=cancelled`,
        user_action: "SUBSCRIBE_NOW",
      },
    });

    const approveLink = subRes.data.links?.find((l: any) => l.rel === "approve")?.href;
    if (!approveLink) return NextResponse.json({ error: "PayPal didn't return an approval link." }, { status: 500 });

    return NextResponse.json({ url: approveLink });
  }

  return NextResponse.json({ error: "Unsupported provider." }, { status: 400 });
}
