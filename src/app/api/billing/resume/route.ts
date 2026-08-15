import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStripeClient } from "@/lib/payment-providers/stripe-client";

export async function POST() {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await prisma.subscription.findUnique({ where: { organizationId } });
  if (!sub || !sub.providerSubscriptionId) {
    return NextResponse.json({ error: "No subscription found to resume." }, { status: 400 });
  }

  if (sub.provider === "STRIPE") {
    const stripeCtx = await getStripeClient();
    if (!stripeCtx) return NextResponse.json({ error: "Stripe isn't configured." }, { status: 400 });

    await stripeCtx.stripe.subscriptions.update(sub.providerSubscriptionId, {
      cancel_at_period_end: false,
    });
    await prisma.subscription.update({
      where: { organizationId },
      data: { cancelAtPeriodEnd: false, status: "ACTIVE" },
    });
    return NextResponse.json({ ok: true });
  }

  // Safepay / PayFast or other providers: if marked cancelAtPeriodEnd and within period
  if (sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) > new Date()) {
    await prisma.subscription.update({
      where: { organizationId },
      data: { cancelAtPeriodEnd: false, status: "ACTIVE" },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { error: "Subscription cannot be resumed automatically. Please renew through checkout." },
    { status: 400 }
  );
}
