import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { upsertSubscription, isDuplicateWebhookEvent, recordWebhookEvent } from "@/lib/subscription";

export async function POST(req: Request) {
  try {
    let body: any;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await req.json();
    } else {
      const formData = await req.formData();
      body = Object.fromEntries(formData.entries());
    }

    const row = await prisma.paymentProvider.findUnique({ where: { provider: "PAYFAST" } });
    if (!row || !row.isActive) {
      return NextResponse.json({ error: "PayFast provider is not active." }, { status: 400 });
    }

    const transactionId = body?.transaction_id || body?.TransactionId || body?.basket_id || `pf_${Date.now()}`;
    const errCode = body?.err_code || body?.ErrorCode || "000";
    const isSuccess = errCode === "000" || body?.status === "SUCCESS" || body?.status === "completed";

    if (await isDuplicateWebhookEvent("PAYFAST", String(transactionId))) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const basketId = String(body?.basket_id || body?.order_id || "");
    const parts = basketId.split("_");
    const organizationId = parts[0];
    const packageKey = parts[1];

    if (organizationId) {
      let targetPackageId: string | undefined;

      if (packageKey) {
        const pkg = await prisma.package.findUnique({ where: { key: packageKey } });
        targetPackageId = pkg?.id;
      }

      if (!targetPackageId) {
        const org = await prisma.organization.findUnique({ where: { id: organizationId } });
        targetPackageId = org?.packageId ?? undefined;
      }

      if (targetPackageId) {
        await upsertSubscription({
          organizationId,
          packageId: targetPackageId,
          provider: "PAYFAST",
          providerCustomerId: body?.customer_email_address || body?.customer_email,
          providerSubscriptionId: String(transactionId),
          status: isSuccess ? "ACTIVE" : "CANCELED",
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });
      }
    }

    await recordWebhookEvent("PAYFAST", String(transactionId), isSuccess ? "payment.success" : "payment.failed");
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("PayFast webhook processing error:", error);
    return NextResponse.json({ error: "Webhook processing error." }, { status: 500 });
  }
}
