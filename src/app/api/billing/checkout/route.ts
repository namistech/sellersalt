import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStripeClient } from "@/lib/payment-providers/stripe-client";
import { getPaypalContext, paypalClient } from "@/lib/payment-providers/paypal-client";
import { getOrCreatePaypalPlan, createDiscountedPaypalPlan } from "@/lib/payment-providers/paypal-plans";
import { createSafepayCheckoutSession } from "@/lib/payment-providers/safepay-client";
import { createPayfastSession } from "@/lib/payment-providers/payfast-client";
import { validateCoupon, applyCouponDiscount, redeemCoupon } from "@/lib/coupons";

function appUrl(): string {
  const url = process.env.NEXTAUTH_URL || process.env.APP_URL || "https://sellersalt.com";
  return url.replace(/\/+$/, "");
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  const userEmail = session?.user?.email || "";
  const userName = session?.user?.name || "SellerSalt Customer";
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { packageKey, provider, couponCode } = (await req.json()) as {
    packageKey: string;
    provider: "STRIPE" | "PAYPAL" | "SAFEPAY" | "PAYFAST";
    couponCode?: string;
  };
  const pkg = await prisma.package.findUnique({ where: { key: packageKey } });
  if (!pkg) return NextResponse.json({ error: "Package not found." }, { status: 404 });
  if (pkg.priceUsd <= 0) return NextResponse.json({ error: "This package doesn't require checkout." }, { status: 400 });

  let couponId: string | null = null;
  let prices = { trialPriceUsd: pkg.trialPriceUsd, priceUsd: pkg.priceUsd };
  if (couponCode) {
    const result = await validateCoupon(couponCode);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    couponId = result.coupon.id;
    prices = applyCouponDiscount(pkg, result.coupon);
  }

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

    const hasTrial = Boolean(pkg.trialDays && prices.trialPriceUsd !== null && prices.trialPriceUsd !== undefined);

    const lineItems: any[] = [];
    if (hasTrial) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: `SellerSalt — ${pkg.name} (${pkg.trialDays}-day trial)` },
          unit_amount: Math.round((prices.trialPriceUsd as number) * 100),
        },
        quantity: 1,
      });
    }
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: { name: `SellerSalt — ${pkg.name}` },
        unit_amount: Math.round(prices.priceUsd * 100),
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

    if (couponId) await redeemCoupon(couponId);
    return NextResponse.json({ url: checkoutSession.url });
  }

  if (provider === "PAYPAL") {
    const ctx = await getPaypalContext();
    if (!ctx) return NextResponse.json({ error: "PayPal isn't configured yet." }, { status: 400 });

    const planId = couponId
      ? await createDiscountedPaypalPlan(pkg.id, prices)
      : await getOrCreatePaypalPlan(pkg.id);
    if (!planId) return NextResponse.json({ error: "Couldn't set up PayPal plan." }, { status: 500 });

    const c = paypalClient(ctx);
    const subRes = await c.post("/v1/billing/subscriptions", {
      plan_id: planId,
      custom_id: organizationId,
      application_context: {
        brand_name: "SellerSalt",
        return_url: `${appUrl()}/settings/billing?checkout=success&provider=paypal`,
        cancel_url: `${appUrl()}/settings/billing?checkout=cancelled`,
        user_action: "SUBSCRIBE_NOW",
      },
    });

    const approveLink = subRes.data.links?.find((l: any) => l.rel === "approve")?.href;
    if (!approveLink) return NextResponse.json({ error: "PayPal didn't return an approval link." }, { status: 500 });

    if (couponId) await redeemCoupon(couponId);
    return NextResponse.json({ url: approveLink });
  }

  if (provider === "SAFEPAY") {
    const chargeAmount = prices.trialPriceUsd !== null && prices.trialPriceUsd !== undefined ? prices.trialPriceUsd : prices.priceUsd;
    const sessionRes = await createSafepayCheckoutSession({
      amount: chargeAmount,
      currency: "USD",
      orderId: `${organizationId}_${pkg.key}_${Date.now()}`,
      customerEmail: userEmail,
      customerName: userName,
      successUrl: `${appUrl()}/settings/billing?checkout=success&provider=safepay`,
      cancelUrl: `${appUrl()}/settings/billing?checkout=cancelled`,
    });

    if (!sessionRes || !sessionRes.url) {
      return NextResponse.json({ error: "Couldn't initialize Safepay session. Check gateway credentials." }, { status: 500 });
    }

    if (couponId) await redeemCoupon(couponId);
    return NextResponse.json({ url: sessionRes.url });
  }

  if (provider === "PAYFAST") {
    const chargeAmount = prices.trialPriceUsd !== null && prices.trialPriceUsd !== undefined ? prices.trialPriceUsd : prices.priceUsd;
    const sessionRes = await createPayfastSession({
      orderId: `${organizationId}_${pkg.key}_${Date.now()}`,
      amount: chargeAmount,
      customerEmail: userEmail,
      customerName: userName,
      successUrl: `${appUrl()}/settings/billing?checkout=success&provider=payfast`,
      cancelUrl: `${appUrl()}/settings/billing?checkout=cancelled`,
    });

    if (!sessionRes || !sessionRes.url) {
      return NextResponse.json({ error: "Couldn't initialize PayFast session. Check gateway credentials." }, { status: 500 });
    }

    if (couponId) await redeemCoupon(couponId);
    return NextResponse.json({ url: sessionRes.url });
  }

  return NextResponse.json({ error: "Unsupported provider." }, { status: 400 });
}
