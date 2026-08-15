import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { sendLifecycleEmail } from "@/services/email/template-registry";

// One signup = one User + one Organization + one OWNER Membership.
export async function POST(req: Request) {
  const { email, password, name, organizationName } = await req.json();

  if (!email || !password || password.length < 8) {
    return NextResponse.json(
      { error: "Email and a password of at least 8 characters are required." },
      { status: 400 }
    );
  }

  const normalizedEmail = String(email).toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const org = await prisma.organization.create({
    data: { name: organizationName?.trim() || `${name || normalizedEmail}'s workspace` },
  });

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      name: name?.trim() || null,
      memberships: {
        create: { organizationId: org.id, role: "OWNER" },
      },
    },
  });

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  const appUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || "https://sellersalt.com";
  const verificationUrl = `${appUrl.replace(/\/+$/, "")}/api/auth/verify-email?token=${rawToken}`;

  sendLifecycleEmail("EMAIL_VERIFICATION", normalizedEmail, {
    name: name?.trim() || normalizedEmail.split("@")[0],
    verificationUrl,
    expiresInHours: "24",
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
