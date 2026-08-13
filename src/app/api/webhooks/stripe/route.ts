import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { getStripeClient } from "@/lib/payment-providers/stripe-client";
import { upsertSubscription, isDuplicateWebhookEvent, recordWebhookEvent } from "@/lib/subscription";

function mapStripeStatus(status: Stripe.Subscription.Status): "INCOMPLETE" | "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
    case "unpaid":
      return "PAST_DUE";
    case "canceled":
    case "incomplete_expired":
      return "CANCELED";
    default:
      return "INCOMPLETE";
  }
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  const row = await prisma.paymentProvider.findUnique({ where: { provider: "STRIPE" } });
  const encryptedSecret = row?.mode === "LIVE" ? row.encryptedLiveCredentials : row?.encryptedSandboxCredentials;
  if (!row || !encryptedSecret || !signature) {
    return NextResponse.json({ error: "Not configured." }, { status: 400 });
  }
  const credentials = JSON.parse(decrypt(encryptedSecret));
  const webhookSecret = credentials.webhookSecret;
  if (!webhookSecret) return NextResponse.json({ error: "Webhook secret not set." }, { status: 400 });

  const stripeCtx = await getStripeClient();
  if (!stripeCtx) return NextResponse.json({ error: "Stripe not configured." }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripeCtx.stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (await isDuplicateWebhookEvent("STRIPE", event.id)) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const organizationId = sub.metadata?.organizationId;
    const packageId = sub.metadata?.packageId;

    if (organizationId && packageId) {
      const periodEnd = (sub as any).current_period_end;
      await upsertSubscription({
        organizationId,
        packageId,
        provider: "STRIPE",
        providerCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
        providerSubscriptionId: sub.id,
        status: mapStripeStatus(sub.status),
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
      });
    }
  }

  await recordWebhookEvent("STRIPE", event.id, event.type);
  return NextResponse.json({ ok: true });
}
