import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { upsertSubscription, isDuplicateWebhookEvent, recordWebhookEvent } from "@/lib/subscription";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-sfpy-signature") || req.headers.get("x-safepay-signature");

    const row = await prisma.paymentProvider.findUnique({ where: { provider: "SAFEPAY" } });
    if (!row || !row.isActive) {
      return NextResponse.json({ error: "Safepay provider is not active." }, { status: 400 });
    }

    const encrypted = row.mode === "LIVE" ? row.encryptedLiveCredentials : row.encryptedSandboxCredentials;
    if (!encrypted) {
      return NextResponse.json({ error: "Safepay credentials not configured." }, { status: 400 });
    }

    const credentials = JSON.parse(decrypt(encrypted));
    const webhookSecret = credentials.webhookSecret || credentials.secretKey;

    // Verify HMAC-SHA256 signature if webhook secret is configured
    if (webhookSecret && signature) {
      const computedSig = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
      if (computedSig !== signature) {
        return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
      }
    }

    const body = JSON.parse(rawBody);
    const eventId = body?.notification?.id || body?.tracker || body?.token || `sfpy_${Date.now()}`;
    const eventType = body?.event || body?.type || "payment.completed";

    if (await isDuplicateWebhookEvent("SAFEPAY", eventId)) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const metadata = body?.data?.metadata || body?.metadata || {};
    const organizationId = metadata.organizationId || body?.order_id?.split("_")[0];
    const packageId = metadata.packageId;

    if (organizationId) {
      let targetPackageId = packageId;
      if (!targetPackageId) {
        const org = await prisma.organization.findUnique({ where: { id: organizationId } });
        targetPackageId = org?.packageId ?? undefined;
      }

      if (targetPackageId) {
        const isSuccess =
          eventType === "payment.completed" ||
          eventType === "order.completed" ||
          body?.data?.state === "TRACKER_ENDED" ||
          body?.state === "PAID";

        await upsertSubscription({
          organizationId,
          packageId: targetPackageId,
          provider: "SAFEPAY",
          providerCustomerId: body?.data?.customer?.id || body?.customer_id,
          providerSubscriptionId: body?.data?.token || body?.tracker,
          status: isSuccess ? "ACTIVE" : "CANCELED",
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        });
      }
    }

    await recordWebhookEvent("SAFEPAY", eventId, eventType);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Safepay webhook processing error:", error);
    return NextResponse.json({ error: "Webhook processing error." }, { status: 500 });
  }
}
