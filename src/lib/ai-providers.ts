import { prisma } from "./db";
import { encrypt, decrypt } from "./encryption";
import type { AiProviderType } from "@prisma/client";

export const AI_PROVIDER_LABELS: Record<AiProviderType, string> = {
  OPENROUTER: "OpenRouter",
  NVIDIA: "NVIDIA",
  GEMINI: "Google Gemini",
  OPENAI: "OpenAI",
};

/** Every provider row always exists (seeded by the registry migration) —
 * this just guards against a future manual DB edit removing one. */
export async function ensureAiProviderRows(): Promise<void> {
  const existing = await prisma.aiProvider.findMany({ select: { provider: true } });
  const have = new Set(existing.map((p: (typeof existing)[number]) => p.provider));
  const defaults: Array<{ provider: AiProviderType; priority: number }> = [
    { provider: "OPENROUTER", priority: 1 },
    { provider: "NVIDIA", priority: 2 },
    { provider: "GEMINI", priority: 3 },
    { provider: "OPENAI", priority: 4 },
  ];
  for (const d of defaults) {
    if (!have.has(d.provider)) {
      await prisma.aiProvider.create({
        data: { provider: d.provider, label: AI_PROVIDER_LABELS[d.provider], priority: d.priority },
      });
    }
  }
}

export function decryptProviderKey(encryptedApiKey: string | null): string | null {
  if (!encryptedApiKey) return null;
  try {
    return decrypt(encryptedApiKey);
  } catch {
    return null;
  }
}

export async function getDecryptedApiKey(provider: AiProviderType): Promise<string | null> {
  const row = await prisma.aiProvider.findUnique({ where: { provider } });
  return decryptProviderKey(row?.encryptedApiKey ?? null);
}

export async function saveProviderApiKey(provider: AiProviderType, rawKey: string): Promise<void> {
  await prisma.aiProvider.update({
    where: { provider },
    data: { encryptedApiKey: encrypt(rawKey), isActive: true },
  });
}
