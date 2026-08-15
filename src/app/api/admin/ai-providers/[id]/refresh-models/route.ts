import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/is-admin";
import { prisma } from "@/lib/db";
import { decryptProviderKey } from "@/lib/ai-providers";
import { discoverModelsForProvider, ModelDiscoveryError } from "@/lib/ai-model-discovery";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return isAdminEmail(session?.user?.email);
}

/** Wholesale-replaces this provider's model catalog with what the
 * provider's own API reports right now — never merges/guesses. If the
 * previously-selected default model no longer appears in the refreshed
 * catalog (or none was ever selected), auto-picks a reasonable one: the
 * cheapest free model if any exist, otherwise the first model reported.
 * This is the concrete fix for "API keys are configured but nothing
 * knows which model to use" — a coherent default always exists after a
 * successful refresh. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const row = await prisma.aiProvider.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: "Provider not found." }, { status: 404 });

  const apiKey = decryptProviderKey(row.encryptedApiKey);
  if (!apiKey) {
    return NextResponse.json({ error: "No API key saved for this provider yet." }, { status: 400 });
  }

  let discovered;
  try {
    discovered = await discoverModelsForProvider(row.provider, apiKey);
  } catch (err) {
    const message = err instanceof ModelDiscoveryError ? err.message : "Model discovery failed.";
    await prisma.aiProvider.update({
      where: { id },
      data: { lastTestedAt: new Date(), lastTestOk: false, lastTestMessage: message },
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (discovered.length === 0) {
    return NextResponse.json({ error: "This provider reported zero available models for this API key." }, { status: 502 });
  }

  const stillHasCurrentDefault = row.defaultModelId
    ? discovered.some((m) => m.modelId === row.defaultModelId)
    : false;

  const nextDefaultModelId = stillHasCurrentDefault
    ? row.defaultModelId
    : (discovered.find((m) => m.isFree)?.modelId ?? discovered[0]!.modelId);

  await prisma.$transaction([
    prisma.aiModel.deleteMany({ where: { providerId: id } }),
    prisma.aiModel.createMany({
      data: discovered.map((m) => ({
        providerId: id,
        modelId: m.modelId,
        displayName: m.displayName,
        contextLength: m.contextLength,
        inputPricePerMillion: m.inputPricePerMillion,
        outputPricePerMillion: m.outputPricePerMillion,
        isFree: m.isFree,
        supportsVision: m.supportsVision,
        supportsTools: m.supportsTools,
        supportsStructuredOutput: m.supportsStructuredOutput,
        raw: m.raw as any,
      })),
    }),
    prisma.aiProvider.update({
      where: { id },
      data: {
        modelsLastFetchedAt: new Date(),
        defaultModelId: nextDefaultModelId,
        lastTestedAt: new Date(),
        lastTestOk: true,
        lastTestMessage: `Connected — ${discovered.length} model(s) available.`,
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    modelCount: discovered.length,
    defaultModelId: nextDefaultModelId,
    defaultChanged: !stillHasCurrentDefault,
  });
}
