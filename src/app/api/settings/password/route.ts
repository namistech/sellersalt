import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkPasswordStrength } from "@/lib/password-policy";
import { get2FA, verifyPasswordOrCode } from "@/lib/two-factor";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { currentPassword, newPassword, code } = await req.json();
  if (!newPassword) {
    return NextResponse.json({ error: "New password is required." }, { status: 400 });
  }
  const strength = checkPasswordStrength(newPassword);
  if (!strength.valid) {
    return NextResponse.json(
      { error: `New password must include: ${strength.errors.join(", ")}.` },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  // Identity re-verification: either the current password (existing
  // behavior) OR — for users with 2FA enabled — a current TOTP/backup
  // code, via the same verifyPasswordOrCode helper the 2FA
  // disable/regenerate routes use (src/lib/two-factor.ts). Never both
  // required.
  let verified = false;
  if (currentPassword) {
    verified = await bcrypt.compare(currentPassword, user.passwordHash);
  }
  if (!verified && code) {
    const record = await get2FA(userId);
    if (record?.enabled) {
      verified = await verifyPasswordOrCode(userId, record, undefined, code);
    }
  }

  if (!verified) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });

  return NextResponse.json({ ok: true });
}
