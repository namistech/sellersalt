import { prisma } from "@/lib/db";

export interface PaymentProviderOption {
  key: "STRIPE" | "PAYPAL" | "SAFEPAY" | "PAYFAST";
  label: string;
  badge?: string;
  isRecommended: boolean;
  priority: number;
}

const DEFAULT_LABELS: Record<string, { label: string; badge?: string }> = {
  STRIPE: { label: "Credit / Debit Card (Stripe)", badge: "Instant Activation" },
  PAYPAL: { label: "PayPal Account", badge: "Buyer Protection" },
  SAFEPAY: { label: "Safepay", badge: "Pakistan" },
  PAYFAST: { label: "PayFast (GoPayFast)", badge: "Pakistan" },
};

export async function resolveEligibleProviders(_options: {
  country?: string;
  currency?: string;
} = {}): Promise<PaymentProviderOption[]> {
  const providers = await prisma.paymentProvider.findMany({
    where: { isActive: true },
    orderBy: { priority: "asc" },
  });

  // If no providers activated in DB yet, fallback to default Stripe + PayPal
  if (providers.length === 0) {
    return [
      { key: "STRIPE", label: "Credit / Debit Card (Stripe)", badge: "Instant Activation", isRecommended: true, priority: 1 },
      { key: "PAYPAL", label: "PayPal Account", badge: "Buyer Protection", isRecommended: false, priority: 2 },
    ];
  }

  return providers
    .filter((p) => ["STRIPE", "PAYPAL", "SAFEPAY", "PAYFAST"].includes(p.provider))
    .map((p, index) => {
      const meta = DEFAULT_LABELS[p.provider] || { label: p.label };
      return {
        key: p.provider as any,
        label: p.label || meta.label,
        badge: meta.badge,
        isRecommended: index === 0,
        priority: p.priority,
      };
    });
}
