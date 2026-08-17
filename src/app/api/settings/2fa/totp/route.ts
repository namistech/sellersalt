import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateBase32Secret, verifyTOTPCode, generateRecoveryCodes, buildOtpAuthUri } from "@/lib/totp";
import { get2FA, save2FA, disable2FA, verifyPasswordOrCode } from "@/lib/two-factor";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  const email = session?.user?.email;

  if (!session || !userId || !email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const record = await get2FA(userId);
  if (record?.enabled) {
    return NextResponse.json({ enabled: true, recoveryCodesRemaining: record.recoveryCodes.length });
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

  await save2FA(userId, {
    enabled: true,
    secret,
    recoveryCodes,
    enabledAt: new Date().toISOString(),
  });

  return NextResponse.json({ success: true, recoveryCodes });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  if (!session || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { password, code } = (await req.json().catch(() => ({}))) as { password?: string; code?: string };
  if (!password && !code) {
    return NextResponse.json(
      { error: "Enter your password or a current 2FA code to disable two-factor authentication." },
      { status: 400 }
    );
  }

  const record = await get2FA(userId);
  if (!record?.enabled) {
    return NextResponse.json({ success: true, enabled: false });
  }

  const verified = await verifyPasswordOrCode(userId, record, password, code);
  if (!verified) {
    return NextResponse.json({ error: "That password or code isn't correct." }, { status: 403 });
  }

  await disable2FA(userId);
  return NextResponse.json({ success: true, enabled: false });
}

// Regenerate backup codes — same re-verification bar as disabling,
// since a stale/leaked recovery-codes list is a real account-takeover
// vector otherwise.
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  if (!session || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { password, code } = (await req.json().catch(() => ({}))) as { password?: string; code?: string };
  if (!password && !code) {
    return NextResponse.json(
      { error: "Enter your password or a current 2FA code to regenerate backup codes." },
      { status: 400 }
    );
  }

  const record = await get2FA(userId);
  if (!record?.enabled) {
    return NextResponse.json({ error: "Two-factor authentication isn't enabled." }, { status: 400 });
  }

  const verified = await verifyPasswordOrCode(userId, record, password, code);
  if (!verified) {
    return NextResponse.json({ error: "That password or code isn't correct." }, { status: 403 });
  }

  const recoveryCodes = generateRecoveryCodes(8);
  await save2FA(userId, { ...record, recoveryCodes });

  return NextResponse.json({ success: true, recoveryCodes });
}
