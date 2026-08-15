import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/is-admin";
import { prisma } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email-verification";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) return null;
  return session!.user!.email as string;
}

// Admin-triggered send — same rate-limit counters as every other send path
// (see src/lib/email-verification.ts), so this can't be used to bypass the
// 3-email/24h cap either.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminEmail = await requireAdmin();
  if (!adminEmail) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  if (target.emailVerified) {
    return NextResponse.json({ error: "This user's email is already verified." }, { status: 400 });
  }

  const result = await sendVerificationEmail(target, { trigger: "admin", actor: { email: adminEmail } });
  if (!result.sent) {
    const reasonMessage: Record<string, string> =
      {
        cooldown: "A verification email was sent very recently — please wait a minute and try again.",
        cap_reached: "This user has already received the maximum of 3 verification emails in the last 24 hours.",
        already_verified: "This user's email is already verified.",
      };
    return NextResponse.json({ error: reasonMessage[result.reason ?? ""] ?? "Could not send verification email." }, { status: 429 });
  }

  return NextResponse.json({ ok: true });
}
