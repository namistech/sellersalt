import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "node:crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/send-email";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  const inviterId = (session?.user as any)?.id as string | undefined;
  if (!organizationId || !inviterId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, role } = await req.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }
  const normalizedEmail = email.toLowerCase().trim();
  const validRole = role === "ADMIN" ? "ADMIN" : "MEMBER";

  const existingMember = await prisma.membership.findFirst({
    where: { organizationId, user: { email: normalizedEmail } },
  });
  if (existingMember) {
    return NextResponse.json({ error: "This person is already on your team." }, { status: 400 });
  }

  const existingInvite = await prisma.invite.findFirst({
    where: { organizationId, email: normalizedEmail, status: "PENDING" },
  });
  if (existingInvite) {
    return NextResponse.json({ error: "An invite is already pending for this email." }, { status: 400 });
  }

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.invite.create({
    data: {
      organizationId,
      email: normalizedEmail,
      role: validRole,
      tokenHash,
      invitedByUserId: inviterId,
      expiresAt,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || "https://sellersalt.com";
  const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
  const acceptUrl = `${cleanBaseUrl}/accept-invite?token=${rawToken}`;

  const result = await sendEmail({
    to: normalizedEmail,
    subject: `You've been invited to join ${org.name} on SellerSalt`,
    html: `
      <p>You've been invited to join <strong>${org.name}</strong> on SellerSalt.</p>
      <p><a href="${acceptUrl}">Click here to accept the invite</a> — this link expires in 7 days.</p>
    `,
    text: `You've been invited to join ${org.name} on SellerSalt: ${acceptUrl}`,
  });

  if (!result.sent) {
    console.error("Invite email failed to send:", result.reason);
  }

  return NextResponse.json({ ok: true, emailSent: result.sent });
}
