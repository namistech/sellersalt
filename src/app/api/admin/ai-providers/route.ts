import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/is-admin";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { ensureAiProviderRows } from "@/lib/ai-providers";
import type { AiProviderType } from "@prisma/client";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return isAdminEmail(session?.user?.email);
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await ensureAiProviderRows();

  const providers = await prisma.aiProvider.findMany({
    orderBy: { priority: "asc" },
    include: {
      models: {
        orderBy: [{ isFree: "desc" }, { displayName: "asc" }],
      },
    },
  });

  // Never send the raw or encrypted key to the client — only whether one exists.
  return NextResponse.json({
    providers: providers.map((p: (typeof providers)[number]) => ({
      id: p.id,
      provider: p.provider,
      label: p.label,
      isActive: p.isActive,
      hasApiKey: Boolean(p.encryptedApiKey),
      defaultModelId: p.defaultModelId,
      priority: p.priority,
      modelsLastFetchedAt: p.modelsLastFetchedAt,
      lastTestedAt: p.lastTestedAt,
      lastTestOk: p.lastTestOk,
      lastTestMessage: p.lastTestMessage,
      models: p.models.map((m: (typeof p.models)[number]) => ({
        id: m.id,
        modelId: m.modelId,
        displayName: m.displayName,
        contextLength: m.contextLength,
        inputPricePerMillion: m.inputPricePerMillion,
        outputPricePerMillion: m.outputPricePerMillion,
        isFree: m.isFree,
        supportsVision: m.supportsVision,
        supportsTools: m.supportsTools,
        supportsStructuredOutput: m.supportsStructuredOutput,
      })),
    })),
  });
}

export async function PATCH(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { provider, apiKey, isActive, priority, defaultModelId } = body as {
    provider: AiProviderType;
    apiKey?: string;
    isActive?: boolean;
    priority?: number;
    defaultModelId?: string | null;
  };

  if (!provider) return NextResponse.json({ error: "provider is required." }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (apiKey) data.encryptedApiKey = encrypt(apiKey);
  if (isActive !== undefined) data.isActive = Boolean(isActive);
  if (priority !== undefined) data.priority = Number(priority);
  if (defaultModelId !== undefined) data.defaultModelId = defaultModelId;

  const updated = await prisma.aiProvider.update({ where: { provider }, data });
  return NextResponse.json({ ok: true, provider: { id: updated.id, provider: updated.provider } });
}
