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

/** "Test connection" is genuinely the same call as model discovery for
 * every one of these providers — there's no separate lightweight ping
 * endpoint any of them expose, so a real model-list request IS the test. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const row = await prisma.aiProvider.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: "Provider not found." }, { status: 404 });

  const apiKey = decryptProviderKey(row.encryptedApiKey);
  if (!apiKey) {
    return NextResponse.json({ ok: false, message: "No API key saved yet." }, { status: 400 });
  }

  try {
    const models = await discoverModelsForProvider(row.provider, apiKey);
    await prisma.aiProvider.update({
      where: { id },
      data: { lastTestedAt: new Date(), lastTestOk: true, lastTestMessage: `Connected — ${models.length} model(s) available.` },
    });
    return NextResponse.json({ ok: true, message: `Connected — ${models.length} model(s) available.` });
  } catch (err) {
    const message = err instanceof ModelDiscoveryError ? err.message : "Connection test failed.";
    await prisma.aiProvider.update({
      where: { id },
      data: { lastTestedAt: new Date(), lastTestOk: false, lastTestMessage: message },
    });
    return NextResponse.json({ ok: false, message });
  }
}
