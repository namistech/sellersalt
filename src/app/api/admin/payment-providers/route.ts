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
  // Never send credential blobs to the client, even encrypted — only whether one exists.
  return NextResponse.json({
    providers: providers.map((p: (typeof providers)[number]) => ({
      id: p.id,
      provider: p.provider,
      label: p.label,
      isActive: p.isActive,
      hasCredentials: Boolean(p.encryptedCredentials),
      updatedAt: p.updatedAt,
    })),
  });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { provider, label, credentials, isActive } = body as {
    provider: string;
    label: string;
    credentials: Record<string, string>;
    isActive?: boolean;
  };

  if (!provider || !VALID_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: `provider must be one of: ${VALID_PROVIDERS.join(", ")}` }, { status: 400 });
  }
  if (!credentials || Object.keys(credentials).length === 0) {
    return NextResponse.json({ error: "credentials are required." }, { status: 400 });
  }

  const saved = await prisma.paymentProvider.upsert({
    where: { provider: provider as any },
    create: {
      provider: provider as any,
      label: label || provider,
      encryptedCredentials: encrypt(JSON.stringify(credentials)),
      isActive: Boolean(isActive),
    },
    update: {
      label: label || provider,
      encryptedCredentials: encrypt(JSON.stringify(credentials)),
      isActive: Boolean(isActive),
    },
  });

  return NextResponse.json({
    provider: { id: saved.id, provider: saved.provider, label: saved.label, isActive: saved.isActive },
  });
}
