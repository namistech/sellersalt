import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

export async function getActivePaymentCredentials(
  provider: "STRIPE" | "PAYPAL" | "SAFEPAY" | "PAYFAST"
): Promise<{ credentials: Record<string, string>; mode: "LIVE" | "SANDBOX" } | null> {
  const row = await prisma.paymentProvider.findUnique({ where: { provider } });
  if (!row || !row.isActive) return null;

  const encrypted = row.mode === "LIVE" ? row.encryptedLiveCredentials : row.encryptedSandboxCredentials;
  if (!encrypted) return null;

  return { credentials: JSON.parse(decrypt(encrypted)), mode: row.mode };
}
