import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateBase32Secret, verifyTOTPCode, generateRecoveryCodes, buildOtpAuthUri } from "@/lib/totp";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  const email = session?.user?.email;

  if (!session || !userId || !email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const record = await prisma.appSetting.findUnique({
    where: { key: `user_2fa_${userId}` },
  });

  let status = { enabled: false };
  if (record) {
    try {
      status = JSON.parse(record.value);
    } catch {}
  }

  if (status.enabled) {
    return NextResponse.json({ enabled: true });
  }

  // Generate new secret for setup
  const secret = generateBase32Secret(20);
  const otpAuthUri = buildOtpAuthUri(email, secret, "SellerSalt");

  return NextResponse.json({
    enabled: false,
    secret,
    otpAuthUri,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  if (!session || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { secret, code } = (await req.json()) as { secret?: string; code?: string };
  if (!secret || !code) {
    return NextResponse.json({ error: "Secret and verification code are required." }, { status: 400 });
  }

  const isValid = verifyTOTPCode(secret, code);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid 6-digit code. Please check your authenticator app." }, { status: 400 });
  }

  const recoveryCodes = generateRecoveryCodes(8);

  const data = {
    enabled: true,
    secret,
    recoveryCodes,
    enabledAt: new Date().toISOString(),
  };

  await prisma.appSetting.upsert({
    where: { key: `user_2fa_${userId}` },
    create: {
      key: `user_2fa_${userId}`,
      value: JSON.stringify(data),
      isSecret: false,
    },
    update: {
      value: JSON.stringify(data),
    },
  });

  return NextResponse.json({ success: true, recoveryCodes });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  if (!session || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.appSetting.deleteMany({
    where: { key: `user_2fa_${userId}` },
  });

  return NextResponse.json({ success: true, enabled: false });
}
