import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { isAdminEmail } from "@/lib/is-admin";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return isAdminEmail(session?.user?.email);
}

const VALID_PROVIDERS = ["STRIPE", "PAYPAL", "SAFEPAY", "PAYFAST"];

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const providers = await prisma.paymentProvider.findMany({ orderBy: { provider: "asc" } });
  // Never send credential blobs to the client, even encrypted — only whether one exists per mode.
  return NextResponse.json({
    providers: providers.map((p: (typeof providers)[number]) => ({
      id: p.id,
      provider: p.provider,
      label: p.label,
      isActive: p.isActive,
      mode: p.mode,
      hasLiveCredentials: Boolean(p.encryptedLiveCredentials),
      hasSandboxCredentials: Boolean(p.encryptedSandboxCredentials),
      updatedAt: p.updatedAt,
    })),
  });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { provider, label, credentials, credentialMode, isActive, mode } = body as {
    provider: string;
    label?: string;
    credentials?: Record<string, string>;
    credentialMode?: "LIVE" | "SANDBOX"; // which slot these credentials go into
    isActive?: boolean;
    mode?: "LIVE" | "SANDBOX"; // which slot is currently active/used
  };

  if (!provider || !VALID_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: `provider must be one of: ${VALID_PROVIDERS.join(", ")}` }, { status: 400 });
  }

  const existing = await prisma.paymentProvider.findUnique({ where: { provider: provider as any } });

  const data: any = {};
  if (label !== undefined) data.label = label;
  if (isActive !== undefined) data.isActive = isActive;
  if (mode !== undefined) data.mode = mode;
  if (credentials && credentialMode) {
    const encrypted = encrypt(JSON.stringify(credentials));
    if (credentialMode === "LIVE") data.encryptedLiveCredentials = encrypted;
    else data.encryptedSandboxCredentials = encrypted;
  }

  const saved = existing
    ? await prisma.paymentProvider.update({ where: { provider: provider as any }, data })
    : await prisma.paymentProvider.create({
        data: { provider: provider as any, label: label || provider, mode: mode ?? "SANDBOX", isActive: Boolean(isActive), ...data },
      });

  return NextResponse.json({
    provider: { id: saved.id, provider: saved.provider, label: saved.label, isActive: saved.isActive, mode: saved.mode },
  });
}
