import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/is-admin";
import { prisma } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email-verification";
import { logAuditEvent } from "@/lib/audit-log";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) return null;
  return session!.user!.email as string;
}

// Admin-mediated email correction — the only way an account's login email
// changes in this app (no self-service change exists). On conflict this
// stops and surfaces the conflict; it never silently merges two accounts.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminEmail = await requireAdmin();
  if (!adminEmail) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const newEmail = String(body?.newEmail ?? "").toLowerCase().trim();
  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return NextResponse.json({ error: "A valid new email address is required." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  if (newEmail === target.email.toLowerCase()) {
    return NextResponse.json({ error: "That's already this user's email address." }, { status: 400 });
  }

  const conflict = await prisma.user.findUnique({ where: { email: newEmail } });
  if (conflict) {
    return NextResponse.json(
      {
        error: `That email address already belongs to another account (${conflict.email}). Account merging isn't supported — choose a different email, or resolve the conflicting account first.`,
        conflict: true,
      },
      { status: 409 }
    );
  }

  const oldEmail = target.email;

  // Changing the email invalidates the old identity entirely: any
  // outstanding verification token is voided, the account goes back to
  // unverified, and the rate-limit counters reset for the new address's
  // own fresh verification cycle.
  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: {
        email: newEmail,
        emailVerified: null,
        verificationEmailCount: 0,
        verificationFirstSentAt: null,
        lastVerificationEmailAt: null,
      },
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId: id, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  await logAuditEvent({
    event: "ADMIN_EMAIL_CHANGED",
    actor: { email: adminEmail },
    target: { id, email: newEmail },
    metadata: { oldEmail, newEmail },
  });

  const refreshed = await prisma.user.findUnique({ where: { id } });
  if (refreshed) {
    await sendVerificationEmail(refreshed, { trigger: "admin", actor: { email: adminEmail } }).catch((err) =>
      console.error("Failed to send verification email after admin email change:", err)
    );
  }

  return NextResponse.json({ ok: true, oldEmail, newEmail });
}
