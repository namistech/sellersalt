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

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const settings = await prisma.emailSettings.findFirst();
  if (!settings) return NextResponse.json({ settings: null });

  // Never send the password back, even encrypted.
  return NextResponse.json({
    settings: {
      id: settings.id,
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      username: settings.username,
      fromEmail: settings.fromEmail,
      fromName: settings.fromName,
      isActive: settings.isActive,
      hasPassword: Boolean(settings.encryptedPassword),
      updatedAt: settings.updatedAt,
    },
  });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { host, port, secure, username, password, fromEmail, fromName, isActive } = body as {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password?: string; // optional on update — omit to keep the existing one
    fromEmail: string;
    fromName: string;
    isActive: boolean;
  };

  if (!host || !port || !username || !fromEmail) {
    return NextResponse.json({ error: "host, port, username, and fromEmail are required." }, { status: 400 });
  }

  const existing = await prisma.emailSettings.findFirst();

  if (!password && !existing) {
    return NextResponse.json({ error: "password is required for first-time setup." }, { status: 400 });
  }

  const data = {
    host,
    port: Number(port),
    secure: Boolean(secure),
    username,
    fromEmail,
    fromName: fromName || "SellerSalt",
    isActive: Boolean(isActive),
    ...(password ? { encryptedPassword: encrypt(password) } : {}),
  };

  const saved = existing
    ? await prisma.emailSettings.update({ where: { id: existing.id }, data })
    : await prisma.emailSettings.create({ data: { ...data, encryptedPassword: encrypt(password!) } });

  return NextResponse.json({ ok: true, id: saved.id });
}
