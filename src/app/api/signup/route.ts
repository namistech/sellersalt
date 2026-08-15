import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email-verification";
import { scheduleVerificationReminders } from "@/lib/queue";

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

  // First of the capped 3-email sequence (immediate + ~6h + ~18h). The
  // other two are scheduled as delayed jobs; each re-checks verification
  // status and the shared cap before actually sending.
  sendVerificationEmail(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: null,
      verificationEmailCount: 0,
      verificationFirstSentAt: null,
      lastVerificationEmailAt: null,
    },
    { trigger: "signup" }
  ).catch((err) => console.error("Failed to send initial verification email:", err));

  scheduleVerificationReminders(user.id).catch((err) =>
    console.error("Failed to schedule verification reminders:", err)
  );

  return NextResponse.json({ ok: true });
}
