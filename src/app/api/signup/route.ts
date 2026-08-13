import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/send-email";

// One signup = one User + one Organization + one OWNER Membership.
// This is the "single org per user today, schema ready for more" pattern:
// nothing here prevents adding a second membership later for team invites.
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

  await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      name: name?.trim() || null,
      memberships: {
        create: { organizationId: org.id, role: "OWNER" },
      },
    },
  });

  // Non-blocking — degrades gracefully like every other transactional email
  // in this app if SMTP isn't configured, never fails the signup itself.
  sendEmail({
    to: normalizedEmail,
    subject: "Welcome to SellerSalt",
    html: `<p>Hi${name ? ` ${name}` : ""},</p><p>Your SellerSalt account is ready. One step left — pick a plan to activate your workspace.</p>`,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
