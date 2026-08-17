import crypto from "node:crypto";
import { prisma } from "./db";
import { sendLifecycleEmail } from "@/services/email/template-registry";
import { logAuditEvent } from "./audit-log";

const CAP_WINDOW_MS = 24 * 60 * 60 * 1000;
const CAP_MAX_SENDS = 3;
const COOLDOWN_MS = 60 * 1000;

function appUrl(): string {
  const url = process.env.NEXTAUTH_URL || process.env.APP_URL || "https://sellersalt.com";
  return url.replace(/\/+$/, "");
}

export interface VerifiableUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: Date | null;
  verificationEmailCount: number;
  verificationFirstSentAt: Date | null;
  lastVerificationEmailAt: Date | null;
}

export interface VerificationSendGate {
  allowed: boolean;
  reason?: "cooldown" | "cap_reached" | "already_verified";
  retryAfterSeconds?: number;
}

export interface VerificationSendGateOptions {
  bypassRateLimit?: boolean;
}

// Evaluates whether a verification email can be dispatched.
// Normal users (signup/resend/reminders) are gated by a 60s cooldown and 3 sends / 24h cap.
// Admin-initiated sends (opts.bypassRateLimit) bypass the cooldown and 24h cap entirely,
// but still strictly reject already-verified accounts.
export function checkVerificationSendGate(
  user: VerifiableUser,
  options?: VerificationSendGateOptions
): VerificationSendGate {
  if (user.emailVerified) return { allowed: false, reason: "already_verified" };

  // Explicit admin bypass for manual re-sends from admin dashboard
  if (options?.bypassRateLimit) {
    return { allowed: true };
  }

  const now = Date.now();

  if (user.lastVerificationEmailAt) {
    const sinceLast = now - user.lastVerificationEmailAt.getTime();
    if (sinceLast < COOLDOWN_MS) {
      return { allowed: false, reason: "cooldown", retryAfterSeconds: Math.ceil((COOLDOWN_MS - sinceLast) / 1000) };
    }
  }

  if (user.verificationFirstSentAt) {
    const windowAge = now - user.verificationFirstSentAt.getTime();
    if (windowAge < CAP_WINDOW_MS && user.verificationEmailCount >= CAP_MAX_SENDS) {
      return { allowed: false, reason: "cap_reached", retryAfterSeconds: Math.ceil((CAP_WINDOW_MS - windowAge) / 1000) };
    }
  }

  return { allowed: true };
}

export type VerificationSendTrigger = "signup" | "resend" | "reminder" | "admin";

// Creates a fresh single-use hashed token, sends EMAIL_VERIFICATION via the
// existing template registry/provider abstraction, and advances the audit counters.
// Admin sends bypass user-facing cooldowns while recording full audit trail.
export async function sendVerificationEmail(
  user: VerifiableUser,
  opts: {
    trigger: VerificationSendTrigger;
    actor?: { id?: string | null; email?: string | null };
    bypassRateLimit?: boolean;
  }
): Promise<{ sent: boolean; reason?: string }> {
  const isAdminTrigger = opts.trigger === "admin" || opts.bypassRateLimit === true;
  const gate = checkVerificationSendGate(user, { bypassRateLimit: isAdminTrigger });
  if (!gate.allowed) return { sent: false, reason: gate.reason };

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const now = new Date();

  const windowExpired = user.verificationFirstSentAt
    ? now.getTime() - user.verificationFirstSentAt.getTime() >= CAP_WINDOW_MS
    : false;
  const startingNewWindow = !user.verificationFirstSentAt || windowExpired;

  await prisma.$transaction([
    // Invalidate older unused tokens for this user so only the freshest link is active
    prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: now },
    }),
    prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        verificationEmailCount: startingNewWindow ? 1 : { increment: 1 },
        verificationFirstSentAt: startingNewWindow ? now : undefined,
        lastVerificationEmailAt: now,
      },
    }),
  ]);

  const verificationUrl = `${appUrl()}/api/auth/verify-email?token=${rawToken}`;
  await sendLifecycleEmail("EMAIL_VERIFICATION", user.email, {
    name: user.name || user.email.split("@")[0],
    verificationUrl,
    expiresInHours: "24",
  });

  await logAuditEvent({
    event:
      opts.trigger === "admin"
        ? "ADMIN_VERIFICATION_EMAIL_SENT"
        : opts.trigger === "resend"
          ? "EMAIL_VERIFICATION_RESENT"
          : "EMAIL_VERIFICATION_SENT",
    actor: opts.actor ?? { id: user.id, email: user.email },
    target: { id: user.id, email: user.email },
    metadata: { triggeredBy: opts.trigger },
  });

  return { sent: true };
}

// Marks a token used and the account verified in one transaction, and
// invalidates any other still-outstanding verification tokens for the same
// user — a stale link clicked after a newer one was already used (or vice
// versa) should never silently re-verify or error confusingly.
export async function markEmailVerified(userId: string, usedTokenId: string) {
  await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: usedTokenId }, data: { usedAt: new Date() } }),
    prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null, id: { not: usedTokenId } },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({ where: { id: userId }, data: { emailVerified: new Date() } }),
  ]);
}
