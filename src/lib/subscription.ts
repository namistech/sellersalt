import { prisma } from "@/lib/db";

type PaymentProviderType = "STRIPE" | "PAYPAL" | "SAFEPAY" | "PAYFAST";
type SubscriptionStatus = "INCOMPLETE" | "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED";

export async function upsertSubscription(params: {
  organizationId: string;
  packageId: string;
  provider: PaymentProviderType;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  status: SubscriptionStatus;
  currentPeriodEnd?: Date;
}) {
  const sub = await prisma.subscription.upsert({
    where: { organizationId: params.organizationId },
    create: {
      organizationId: params.organizationId,
      packageId: params.packageId,
      provider: params.provider,
      providerCustomerId: params.providerCustomerId,
      providerSubscriptionId: params.providerSubscriptionId,
      status: params.status,
      currentPeriodEnd: params.currentPeriodEnd,
    },
    update: {
      packageId: params.packageId,
      provider: params.provider,
      providerCustomerId: params.providerCustomerId,
      providerSubscriptionId: params.providerSubscriptionId,
      status: params.status,
      currentPeriodEnd: params.currentPeriodEnd,
    },
  });

  // The org's real access level follows subscription status directly —
  // active/trialing get the purchased package, anything else falls back to
  // Free rather than leaving them on a paid package with no valid payment.
  const grantsAccess = params.status === "ACTIVE" || params.status === "TRIALING";
  if (grantsAccess) {
    await prisma.organization.update({ where: { id: params.organizationId }, data: { packageId: params.packageId } });
  } else {
    const started = await prisma.package.findUnique({ where: { key: "STARTED" } });
    if (started) {
      await prisma.organization.update({ where: { id: params.organizationId }, data: { packageId: started.id } });
    }
  }

  return sub;
}

/** True if this exact provider event has already been processed — call
 * before doing any subscription mutation, so a retried webhook delivery
 * (all providers retry) can't double-process the same event. */
export async function isDuplicateWebhookEvent(provider: PaymentProviderType, externalEventId: string): Promise<boolean> {
  const existing = await prisma.paymentWebhookEvent.findUnique({
    where: { provider_externalEventId: { provider, externalEventId } },
  });
  return Boolean(existing);
}

export async function recordWebhookEvent(provider: PaymentProviderType, externalEventId: string, type: string) {
  await prisma.paymentWebhookEvent.create({ data: { provider, externalEventId, type } });
}
