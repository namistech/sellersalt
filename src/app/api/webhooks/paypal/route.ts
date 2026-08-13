import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { getPaypalContext, paypalClient } from "@/lib/payment-providers/paypal-client";
import { upsertSubscription, isDuplicateWebhookEvent, recordWebhookEvent } from "@/lib/subscription";

function mapPaypalStatus(status: string): "INCOMPLETE" | "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" {
  switch (status) {
    case "ACTIVE":
      return "ACTIVE";
    case "APPROVAL_PENDING":
    case "APPROVED":
      return "INCOMPLETE";
    case "SUSPENDED":
      return "PAST_DUE";
    case "CANCELLED":
    case "EXPIRED":
      return "CANCELED";
    default:
      return "INCOMPLETE";
  }
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const body = JSON.parse(rawBody);

  const ctx = await getPaypalContext();
  if (!ctx) return NextResponse.json({ error: "PayPal not configured." }, { status: 400 });

  const row = await prisma.paymentProvider.findUnique({ where: { provider: "PAYPAL" } });
  const encryptedCreds = row?.mode === "LIVE" ? row.encryptedLiveCredentials : row?.encryptedSandboxCredentials;
  if (!row || !encryptedCreds) return NextResponse.json({ error: "Not configured." }, { status: 400 });

  const credentials = JSON.parse(decrypt(encryptedCreds));
  const webhookId = credentials.webhookId;
  if (!webhookId) return NextResponse.json({ error: "Webhook ID not set." }, { status: 400 });

  // PayPal verifies via a live API call, not local HMAC — pass along the
  // signature headers it sent plus the raw event body.
  const c = paypalClient(ctx);
  const verifyRes = await c.post("/v1/notifications/verify-webhook-signature", {
    transmission_id: req.headers.get("paypal-transmission-id"),
    transmission_time: req.headers.get("paypal-transmission-time"),
    cert_url: req.headers.get("paypal-cert-url"),
    auth_algo: req.headers.get("paypal-auth-algo"),
    transmission_sig: req.headers.get("paypal-transmission-sig"),
    webhook_id: webhookId,
    webhook_event: body,
  });

  if (verifyRes.data.verification_status !== "SUCCESS") {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const eventId = body.id as string;
  if (await isDuplicateWebhookEvent("PAYPAL", eventId)) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const resource = body.resource;
  const organizationId: string | undefined = resource?.custom_id;
  const planId: string | undefined = resource?.plan_id;
  const status: string | undefined = resource?.status;

  if (organizationId && planId && status) {
    const pkg = await prisma.package.findFirst({ where: { paypalPlanId: planId } });
    if (pkg) {
      await upsertSubscription({
        organizationId,
        packageId: pkg.id,
        provider: "PAYPAL",
        providerCustomerId: resource.subscriber?.payer_id,
        providerSubscriptionId: resource.id,
        status: mapPaypalStatus(status),
        currentPeriodEnd: resource.billing_info?.next_billing_time ? new Date(resource.billing_info.next_billing_time) : undefined,
      });
    }
  }

  await recordWebhookEvent("PAYPAL", eventId, body.event_type ?? "unknown");
  return NextResponse.json({ ok: true });
}
