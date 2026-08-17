import { NextResponse } from "next/server";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { checkPasswordStrength } from "@/lib/password-policy";
import { checkRateLimit, extractClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const clientIp = extractClientIp(req);
  const rateCheck = checkRateLimit(clientIp, "PASSWORD_RESET");
  if (!rateCheck.success) {
    return NextResponse.json(
      { error: `Too many password reset attempts. Please try again in ${rateCheck.resetSeconds} seconds.` },
      { status: 429, headers: rateCheck.headers }
    );
  }

  try {
    const { token, newPassword } = await req.json().catch(() => ({}));
    if (!token || !newPassword) {
      return NextResponse.json({ error: "Token and new password are required." }, { status: 400 });
    }
    const strength = checkPasswordStrength(newPassword);
    if (!strength.valid) {
      return NextResponse.json(
        { error: `Password must include: ${strength.errors.join(", ")}.` },
        { status: 400 }
      );
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      return NextResponse.json({ error: "This reset link is invalid or has expired. Request a new one." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Reset password error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred while resetting password. Please try again." },
      { status: 500 }
    );
  }
}
