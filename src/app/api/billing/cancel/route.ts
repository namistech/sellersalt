import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStripeClient } from "@/lib/payment-providers/stripe-client";
import { getPaypalContext, paypalClient } from "@/lib/payment-providers/paypal-client";

export async function POST() {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await prisma.subscription.findUnique({ where: { organizationId } });
  if (!sub || !sub.providerSubscriptionId) {
    return NextResponse.json({ error: "No active subscription to cancel." }, { status: 400 });
  }

  if (sub.provider === "STRIPE") {
    const stripeCtx = await getStripeClient();
    if (!stripeCtx) return NextResponse.json({ error: "Stripe isn't configured." }, { status: 400 });

    // cancel_at_period_end rather than immediate cancellation — during a
    // trial, "period end" IS the trial's end, so this means the trial
    // simply expires without ever converting to a real charge. Access
    // continues normally until then either way.
    await stripeCtx.stripe.subscriptions.update(sub.providerSubscriptionId, { cancel_at_period_end: true });
    await prisma.subscription.update({ where: { organizationId }, data: { cancelAtPeriodEnd: true } });
    return NextResponse.json({ ok: true, effectiveAt: sub.currentPeriodEnd });
  }

  if (sub.provider === "PAYPAL") {
    const ctx = await getPaypalContext();
    if (!ctx) return NextResponse.json({ error: "PayPal isn't configured." }, { status: 400 });
    const c = paypalClient(ctx);

    // PayPal subscriptions don't support a "cancel at period end" — this
    // cancels immediately. During a trial cycle this still achieves "no
    // further charge," it just also ends access immediately rather than
    // at the trial boundary like Stripe does.
    await c.post(`/v1/billing/subscriptions/${sub.providerSubscriptionId}/cancel`, {
      reason: "Customer requested cancellation",
    });
    await prisma.subscription.update({ where: { organizationId }, data: { status: "CANCELED" } });

    const started = await prisma.package.findFirst({ where: { key: "STARTED" } });
    if (started) await prisma.organization.update({ where: { id: organizationId }, data: { packageId: started.id } });

    return NextResponse.json({ ok: true, effectiveAt: null });
  }

  return NextResponse.json({ error: "Unsupported provider." }, { status: 400 });
}
