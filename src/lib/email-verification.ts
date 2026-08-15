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

// Shared by every send path (signup, self-serve resend, the 6h/18h
// automatic reminders, and the admin "send verification email" action) so
// the 3-email/24h cap can't be bypassed by mixing them — they all read and
// write the same three counters on User.
export function checkVerificationSendGate(user: VerifiableUser): VerificationSendGate {
  if (user.emailVerified) return { allowed: false, reason: "already_verified" };

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
// existing template registry/provider abstraction, and advances the rate
// limit counters — all in one place so no caller can create a token without
// also being subject to the cap.
export async function sendVerificationEmail(
  user: VerifiableUser,
  opts: { trigger: VerificationSendTrigger; actor?: { id?: string | null; email?: string | null } }
): Promise<{ sent: boolean; reason?: string }> {
  const gate = checkVerificationSendGate(user);
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
        ? "ADMIN_EMAIL_VERIFICATION_SENT"
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
