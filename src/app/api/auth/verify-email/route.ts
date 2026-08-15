import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { sendLifecycleEmail } from "@/services/email/template-registry";

function appUrl(): string {
  const url = process.env.NEXTAUTH_URL || process.env.APP_URL || "https://sellersalt.com";
  return url.replace(/\/+$/, "");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login?error=invalid_verification_token", appUrl()));
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!record || record.expiresAt < new Date() || record.usedAt) {
    return NextResponse.redirect(new URL("/login?error=verification_token_expired", appUrl()));
  }

  // Mark token used and verified
  await prisma.passwordResetToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  // Send Welcome email now that email is verified
  sendLifecycleEmail("WELCOME", record.user.email, {
    name: record.user.name || "there",
    dashboardUrl: `${appUrl()}/dashboard`,
  }).catch(() => {});

  return NextResponse.redirect(new URL("/login?verified=1", appUrl()));
}

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    // Return success to avoid email enumeration
    return NextResponse.json({ ok: true });
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  const verificationUrl = `${appUrl()}/api/auth/verify-email?token=${rawToken}`;
  await sendLifecycleEmail("EMAIL_VERIFICATION", user.email, {
    name: user.name || "there",
    verificationUrl,
    expiresInHours: "24",
  });

  return NextResponse.json({ ok: true });
}
