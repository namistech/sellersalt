import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "node:crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  if (!session || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch registered passkeys for this user
  const settingKey = `user_passkeys_${userId}`;
  const setting = await prisma.appSetting.findUnique({ where: { key: settingKey } });

  let passkeys: Array<{ id: string; name: string; createdAt: string; lastUsedAt?: string }> = [];
  if (setting?.value) {
    try {
      passkeys = JSON.parse(setting.value);
    } catch {
      passkeys = [];
    }
  }

  // Generate a random registration challenge
  const challenge = crypto.randomBytes(32).toString("base64url");

  return NextResponse.json({
    passkeys,
    challenge,
    rp: {
      name: "SellerSalt",
      id: typeof window === "undefined" ? undefined : window.location.hostname,
    },
    user: {
      id: Buffer.from(userId).toString("base64url"),
      name: session.user?.email || "user",
      displayName: session.user?.name || session.user?.email || "SellerSalt User",
    },
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  if (!session || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { credentialId, name } = body as { credentialId?: string; name?: string };

  if (!credentialId) {
    return NextResponse.json({ error: "Credential ID is required." }, { status: 400 });
  }

  const settingKey = `user_passkeys_${userId}`;
  const setting = await prisma.appSetting.findUnique({ where: { key: settingKey } });

  let passkeys: Array<{ id: string; name: string; createdAt: string; lastUsedAt?: string }> = [];
  if (setting?.value) {
    try {
      passkeys = JSON.parse(setting.value);
    } catch {
      passkeys = [];
    }
  }

  // Add new passkey
  const newPasskey = {
    id: credentialId,
    name: name || `Passkey (${new Date().toLocaleDateString()})`,
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
  };

  passkeys.push(newPasskey);

  await prisma.appSetting.upsert({
    where: { key: settingKey },
    create: {
      key: settingKey,
      value: JSON.stringify(passkeys),
      isSecret: false,
    },
    update: {
      value: JSON.stringify(passkeys),
    },
  });

  return NextResponse.json({ success: true, passkeys }, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  if (!session || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { credentialId } = await req.json();
  if (!credentialId) {
    return NextResponse.json({ error: "Credential ID required" }, { status: 400 });
  }

  const settingKey = `user_passkeys_${userId}`;
  const setting = await prisma.appSetting.findUnique({ where: { key: settingKey } });

  if (setting?.value) {
    try {
      let passkeys = JSON.parse(setting.value) as Array<{ id: string; name: string; createdAt: string }>;
      passkeys = passkeys.filter((p) => p.id !== credentialId);
      await prisma.appSetting.update({
        where: { key: settingKey },
        data: { value: JSON.stringify(passkeys) },
      });
      return NextResponse.json({ success: true, passkeys });
    } catch {
      return NextResponse.json({ error: "Failed to delete passkey" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, passkeys: [] });
}
