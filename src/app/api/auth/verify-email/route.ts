import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { sendLifecycleEmail } from "@/services/email/template-registry";
import { sendVerificationEmail, markEmailVerified } from "@/lib/email-verification";
import { logAuditEvent } from "@/lib/audit-log";

function appUrl(): string {
  const url = process.env.NEXTAUTH_URL || process.env.APP_URL || "https://sellersalt.com";
  return url.replace(/\/+$/, "");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/verify-email?status=invalid", appUrl()));
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!record) {
    return NextResponse.redirect(new URL("/verify-email?status=invalid", appUrl()));
  }

  if (record.usedAt) {
    // Already redeemed — most commonly a double-clicked link or a stale
    // tab reopened later. If the account is already verified this is
    // harmless, so say so plainly instead of showing a scary "invalid
    // link" error for something that already succeeded.
    const status = record.user.emailVerified ? "already-verified" : "expired";
    return NextResponse.redirect(new URL(`/verify-email?status=${status}`, appUrl()));
  }

  if (record.expiresAt < new Date()) {
    return NextResponse.redirect(new URL("/verify-email?status=expired", appUrl()));
  }

  // Marks the token used, the account verified, and invalidates any other
  // outstanding tokens for this user in one transaction.
  await markEmailVerified(record.userId, record.id);

  logAuditEvent({
    event: "EMAIL_VERIFIED",
    actor: { id: record.userId, email: record.user.email },
    target: { id: record.userId, email: record.user.email },
  }).catch(() => {});

  sendLifecycleEmail("WELCOME", record.user.email, {
    name: record.user.name || "there",
    dashboardUrl: `${appUrl()}/dashboard`,
  }).catch(() => {});

  return NextResponse.redirect(new URL("/login?verified=1", appUrl()));
}

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
  if (!user) {
    // Always return success — an unauthenticated caller must never be able
    // to tell whether an email address has an account.
    return NextResponse.json({ ok: true });
  }

  // sendVerificationEmail silently no-ops on cooldown/cap/already-verified —
  // the response shape must stay identical either way for the same reason.
  await sendVerificationEmail(user, { trigger: "resend" }).catch((err) => {
    console.error("Failed to send verification resend email:", err);
  });

  return NextResponse.json({ ok: true });
}
